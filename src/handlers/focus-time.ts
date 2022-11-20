import { Handler } from "express";
import { DateTime } from "luxon";
import ReactDOMServer from "react-dom/server";
import { GoogleAuth } from "../auth";
import { getFocusTime } from "../focusTime";
import { SimpleGcal } from "../gcal";
import { FocusTimeResults } from "../layout/FocusTimeResults";

export function renderFocusTime(gAuth: GoogleAuth): Handler {
  return async (req, resp) => {
    let cal = new SimpleGcal(gAuth.client);
    const tz = await cal.getTz();
    let startOfPrevWeek = DateTime.now()
      .setZone(tz)
      .minus({ week: 1 })
      .startOf("week")
      .startOf("day");
    let to = startOfPrevWeek.endOf("day").endOf("week").plus({ week: 1 });
    console.info(`Getting events from ${startOfPrevWeek} to ${to}`);
    const events = await cal.listEvents(startOfPrevWeek, to);
    let results = getFocusTime(startOfPrevWeek, to, events);

    resp.send(ReactDOMServer.renderToString(FocusTimeResults({ results })));
  };
}
