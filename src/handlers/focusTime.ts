import { Handler, Request, Response } from "express";
import log from "loglevel";
import LRU from "lru-cache";
import { DateTime } from "luxon";
import pLimit from "p-limit";
import ReactDOMServer from "react-dom/server";
import { cacheHit, cacheMiss } from "../cacheUtil.js";
import { instrument } from "../cacheUtil.js";
import { GcalError } from "../errors.js";
import { GoogleJwt } from "../google_api/auth.js";
import { GoogleAuth, userFromContext } from "../google_api/auth.js";
import { SimpleGcal } from "../google_api/gcal.js";
import { SimpleGroups, SimpleMember } from "../google_api/gGroups.js";
import { FocusTimeResults } from "../layout/FocusTimeResults.js";
import { GroupFocusTimeResults } from "../layout/GroupFocusTimeResults.js";
import { getNonceFromResp } from "../util/security.js";

import {
  cacheKeyFor,
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

      // See it's a group email or a personal one
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
  let results = await cachedFocusTime(userFromContext(req), config, cal);
  const user = userFromContext(req);
  resp.send(
    ReactDOMServer.renderToString(
      FocusTimeResults({
        results,
        config: config,
        user,
        security: {
          nonce: getNonceFromResp(resp),
        },
      })
    )
  );
}

export interface GroupFocusResult {
  [key: string]: TotalFocusResult | null;
}

let limit = pLimit(Number(process.env["GOOGLE_CONCURRENT_REQS"] || "5"));

async function renderGroupFocus(
  config: Config,
  groupName: string,
  members: SimpleMember[],
  cal: SimpleGcal,
  req: Request,
  resp: Response
) {
  log.info(`Getting events from ${config.from} to ${config.to} for `);
  const me = userFromContext(req);
  const groupResult: GroupFocusResult = Object.fromEntries(
    await Promise.all(
      members.map((member) => {
        return limit(async () => {
          log.info(`Getting focus time for ${member.email}`);
          try {
            const calendar = await cal.getCalendar(member.email);
            let subConfig = {
              ...config,
              email: member.email,
              from: config.from.setZone(calendar.timeZone!, {
                keepLocalTime: true,
              }),
              to: config.to.setZone(calendar.timeZone!, {
                keepLocalTime: true,
              }),
            };
            let results = await cachedFocusTime(me, subConfig, cal);
            return [member.email, results];
          } catch (e) {
            console.error(`Could not get focus time for ${member.email}`, e);
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
        security: {
          nonce: getNonceFromResp(resp),
        },
      })
    )
  );
}

const focusCache = new LRU<string, Promise<TotalFocusResult>>({
  max: 1000,
  ttl: 3 * 60 * 60 * 1000,
  allowStale: false,
});
setInterval(() => focusCache.purgeStale(), 60_000);
instrument(focusCache, "focus");

async function cachedFocusTime(
  user: GoogleJwt,
  config: Config,
  cal: SimpleGcal,
  cache: boolean = true
): Promise<TotalFocusResult> {
  let key = `${user.sub}##${cacheKeyFor(config)}`;

  let getter = async () => {
    try {
      const events = await cal.listEvents(config.from, config.to, config.email);
      return getFocusTime(events, config);
    } catch (e) {
      focusCache.delete(key);
      throw e;
    }
  };
  if (!cache) {
    return getter();
  }
  if (!focusCache.has(key)) {
    cacheMiss("focus");
    focusCache.set(key, getter());
  } else {
    cacheHit("focus");
  }
  return focusCache.get(key)!;
}

function getParams(url: string) {
  return new URLSearchParams(url.substring(url.indexOf("?")));
}

const emailCache = new LRU<string, ReturnType<typeof resolveEmail>>({
  max: 100,
  ttl: 24 * 60 * 60 * 1000,
  allowStale: false,
});
setInterval(() => emailCache.purgeStale(), 60_000);
instrument(emailCache, "email");

export async function resolveEmail(
  email: string,
  api: SimpleGroups
): Promise<{ members?: SimpleMember[]; personal?: string }> {
  if (!emailCache.has(email)) {
    cacheMiss("email");
    let fetcher = async () => {
      let members = await api.getMembersFor(email);
      if (members) {
        return { members };
      } else {
        return { personal: email };
      }
    };
    emailCache.set(email, fetcher());
  } else {
    cacheHit("email");
  }
  return emailCache.get(email)!;
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
