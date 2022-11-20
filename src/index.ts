import express from "express";
import { DateTime } from "luxon";
import ReactDOMServer from "react-dom/server";
import { authorize } from "./auth";
import { getFocusTime } from "./focusTime";
import { SimpleGcal } from "./gcal";
import { Welcome } from "./layout/Welcome";

async function main() {
  console.info("Hey there, let's go");
  let cal = new SimpleGcal(await authorize());
  const tz = await cal.getTz();
  let startOfPrevWeek = DateTime.now()
    .setZone(tz)
    .minus({ week: 1 })
    .startOf("week")
    .startOf("day");
  let to = startOfPrevWeek.endOf("day").endOf("week").plus({ week: 1 });
  console.info(`Getting events from ${startOfPrevWeek} to ${to}`);
  const events = await cal.listEvents(startOfPrevWeek, to);
  let result = getFocusTime(startOfPrevWeek, to, events);
  console.info("Result:");
  let format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  const hr = (minutes: number) => format.format(minutes / 60.0) + "h";
  console.info(
    `Meetings: ${hr(result.inMeeting)} of which ${hr(
      result.inRecurringMeeting
    )} recurring and ${hr(result.inOneOnOne)} 1-1`
  );
  console.info(
    `Focus: ${hr(result.focusTime)} in ${result.focusTimeSlots} slots`
  );
  result.perDay.forEach((e) => {
    console.info(
      `${e.date.toFormat("MM/dd")} ${hr(e.inMeeting)} in meeting (${hr(
        e.inRecurringMeeting
      )} recurring, ${hr(e.inOneOnOne)} 1-1). ${hr(e.focusTime)} focus in ${
        e.focusTimeSlots.length
      } slots`
    );
  });
}

async function server() {
  const app = express();
  app.get("/", async (req, resp) => {
    resp.send(ReactDOMServer.renderToString(Welcome({})));
  });

  let port = Number(process.env["NODE_PORT"] || 3000);
  let server = app.listen(port, () =>
    console.log(`Started @ http://localhost:${port}`)
  );

  process.on("SIGINT", server.close);
  process.on("SIGTERM", server.close);
  process.on("SIGHUP", server.close);
}

server().catch((e) => {
  console.error(e);
  process.exit(1);
});
