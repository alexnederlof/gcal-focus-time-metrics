import { Handler, Request, Response } from "express";
import log from "loglevel";
import { DateTime } from "luxon";
import pLimit from "p-limit";
import ReactDOMServer from "react-dom/server";
import { GcalError } from "../errors.js";
import { GoogleAuth, userFromContext } from "../google_api/auth.js";
import { SimpleGcal } from "../google_api/gcal.js";
import { SimpleGroups, SimpleMember } from "../google_api/gGroups.js";
import { FocusTimeResults } from "../layout/FocusTimeResults.js";
import { GroupFocusTimeResults } from "../layout/GroupFocusTimeResults.js";
import {
  Config,
  DEFAULT_CONFIG,
  getFocusTime,
  TotalFocusResult,
} from "../focusTime.js";

export function renderFocusTime(gAuth: GoogleAuth): Handler {
  return async (req, resp, next) => {
    try {
      let cal = new SimpleGcal(gAuth.client);
      const tz = await cal.getTz();
      let config = parseConfig(req.query, tz!);
      let { members, personal } = await resolveEmail(
        config.email,
        new SimpleGroups(gAuth.client)
      );

      if (personal) {
        await renderPersonalFocus(config, personal, cal, req, resp);
      } else {
        await renderGroupFocus(config, config.email, members!, cal, req, resp);
      }
    } catch (e) {
      next(e);
    }
  };
}

async function renderPersonalFocus(
  config: Config & { email: string },
  personal: string,
  cal: SimpleGcal,
  req: Request,
  resp: Response
) {
  log.info(`Getting events from ${config.from} to ${config.to} for `);
  config.email = personal;
  const calendar = await cal.getCalendar(personal);
  log.info(`Set zone to ${calendar.timeZone}`);
  config.from = config.from.setZone(calendar.timeZone!, {
    keepLocalTime: true,
  });
  config.to = config.to.setZone(calendar.timeZone!, { keepLocalTime: true });
  const events = await cal.listEvents(config.from, config.to, config.email);
  let results = getFocusTime(events, config);
  let user = userFromContext(req);
  resp.send(
    ReactDOMServer.renderToString(
      FocusTimeResults({ results, config: config, user })
    )
  );
}

export interface GroupFocusResult {
  [key: string]: TotalFocusResult | null;
}

async function renderGroupFocus(
  config: Config,
  groupName: string,
  members: SimpleMember[],
  cal: SimpleGcal,
  req: Request,
  resp: Response
) {
  log.info(`Getting events from ${config.from} to ${config.to} for `);
  let limit = pLimit(Number(process.env["GOOGLE_CONCURRENT_REQS"] || "5"));
  const groupResult: GroupFocusResult = Object.fromEntries(
    await Promise.all(
      members.map((member) => {
        return limit(async () => {
          log.info(`Getting focus time for ${member.email}`);
          const calendar = await cal.getCalendar(member.email);
          log.info(`Set zone to ${calendar.timeZone}`);
          let subConfig = {
            ...config,
            calenderId: member.email,
            from: config.from.setZone(calendar.timeZone!, {
              keepLocalTime: true,
            }),
            to: config.to.setZone(calendar.timeZone!, {
              keepLocalTime: true,
            }),
          };
          try {
            const events = await cal.listEvents(
              subConfig.from,
              subConfig.to,
              subConfig.calenderId
            );
            let results = getFocusTime(events, subConfig);
            return [member.email, results];
          } catch (e) {
            return [member.email, null];
          }
        });
      })
    )
  );
  let user = userFromContext(req);
  resp.send(
    ReactDOMServer.renderToString(
      GroupFocusTimeResults({
        results: groupResult,
        config: config,
        user,
        groupName,
        searchParams: getParams(req.originalUrl),
      })
    )
  );
}

function getParams(url: string) {
  return new URLSearchParams(url.substring(url.indexOf("?")));
}

export async function resolveEmail(
  email: string,
  api: SimpleGroups
): Promise<{ members?: SimpleMember[]; personal?: string }> {
  let members = await api.getMembersFor(email);
  if (members) return { members };
  else return { personal: email };
}

function parseConfig(
  params: Request["query"],
  timeZone: string
): Config & { email: string } {
  let from = DateTime.now().setZone(timeZone).minus({ month: 1 });
  let to = from.endOf("day").endOf("week").plus({ week: 1 });
  let strParam = (name: string) => {
    let val = params[name];
    if (Array.isArray(val)) {
      return val[0] as string;
    }
    return val as string | null | undefined;
  };
  if (params["analyse-start"]) {
    from = DateTime.fromFormat(
      strParam("analyse-start")!,
      "yyyy-MM-dd"
    ).setZone(timeZone);
  }
  if (params["analyse-finish"]) {
    to = DateTime.fromFormat(strParam("analyse-finish")!, "yyyy-MM-dd").setZone(
      timeZone
    );
  }

  let config = { ...DEFAULT_CONFIG };
  if (params["day-start"]) {
    config.startOfDay = Number(strParam("day-start"));
  }
  if (params["day-end"]) {
    config.endOfDay = Number(strParam("day-end"));
  }
  if (params["focus-threshold"]) {
    config.focusThresholdMinutes = Number(strParam("focus-threshold"));
  }
  if (params["focus-switch"]) {
    config.focusContextSwitchMinutes = Number(strParam("focus-switch"));
  }
  let email = strParam("email");
  if (!email) {
    throw new GcalError(401, "You must specify your email");
  }

  if (from > to) {
    throw new GcalError(500, `Error: ${from} > ${to}`);
  }
  if (config.focusContextSwitchMinutes > config.focusThresholdMinutes) {
    throw new GcalError(
      500,
      `Error: too little switch time for the focus window`
    );
  }
  return {
    email,
    from,
    to,
    ...config,
  };
}
