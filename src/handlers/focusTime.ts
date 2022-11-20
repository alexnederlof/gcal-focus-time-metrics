import { Handler } from "express";
import { DateTime } from "luxon";
import ReactDOMServer from "react-dom/server";
import { GoogleAuth } from "../auth";
import { DEFAULT_CONFIG, getFocusTime } from "../focusTime";
import { SimpleGcal } from "../gcal";
import { FocusTimeResults } from "../layout/FocusTimeResults";

export function renderFocusTime(gAuth: GoogleAuth): Handler {
  return async (req, resp) => {
    let cal = new SimpleGcal(gAuth.client);
    const tz = await cal.getTz();
    let from = DateTime.now().setZone(tz).minus({ month: 1 });
    let to = from.endOf("day").endOf("week").plus({ week: 1 });
    let params = req.query;
    let strParam = (name: string) => {
      let val = params[name];
      if (Array.isArray(val)) {
        return val[0] as string;
      }
      return val as string;
    };
    console.log("params", params);
    if (params["analyse-start"]) {
      from = DateTime.fromFormat(
        strParam("analyse-start"),
        "yyyy-MM-dd"
      ).setZone(tz);
    }
    if (params["analyse-finish"]) {
      to = DateTime.fromFormat(
        strParam("analyse-finish"),
        "yyyy-MM-dd"
      ).setZone(tz);
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
    if (from > to) {
      return resp.send(`Error: ${from} > ${to}`);
    }
    if (config.focusContextSwitchMinutes > config.focusThresholdMinutes) {
      return resp.send(`Error: too little switch tim for the focus window`);
    }
    console.info(`Getting events from ${from} to ${to}`);
    const events = await cal.listEvents(from, to);
    let fullConfig = { ...config, from, to };
    let results = getFocusTime(events, fullConfig);
    resp.send(
      ReactDOMServer.renderToString(
        FocusTimeResults({ results, config: fullConfig })
      )
    );
  };
}
