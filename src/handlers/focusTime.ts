import { Handler, Request } from "express";
import { DateTime } from "luxon";
import { nextTick } from "process";
import ReactDOMServer from "react-dom/server";
import { GoogleAuth, userFromContext } from "../auth";
import { GcalError } from "../errors";
import { Config, DEFAULT_CONFIG, getFocusTime } from "../focusTime";
import { SimpleGcal } from "../gcal";
import { SimpleGroups, SimpleMember } from "../gGroups";
import { FocusTimeResults } from "../layout/FocusTimeResults";

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
        console.info(`Getting events from ${config.from} to ${config.to} for `);
        config.calenderId = personal;
        const events = await cal.listEvents(
          config.from,
          config.to,
          config.calenderId
        );
        let results = getFocusTime(events, config);
        let user = userFromContext(req);
        resp.send(
          ReactDOMServer.renderToString(
            FocusTimeResults({ results, config: config, user })
          )
        );
      } else {
        throw new GcalError(401, "cannot deal with groups yet");
      }
    } catch (e) {
      next(e);
    }
  };
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
  console.log("params", params);

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

async function getMembers(api: SimpleGroups, groupEmail: string) {
  let members = await api.getMembersFor(groupEmail);
  console.log(members);
}
