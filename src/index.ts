import { DateTime } from "luxon";
import { Logger } from "tslog";
import { authorize } from "./auth";
import { getFocusTime } from "./focusTime";
import { SimpleGcal } from "./gcal";

const log = new Logger();

async function main() {
  log.info("Hey there, let's go");
  let cal = new SimpleGcal(await authorize());
  const tz = await cal.getTz();
  let startOfPrevWeek = DateTime.now()
    .setZone(tz)
    .minus({ week: 1 })
    .startOf("week")
    .startOf("day");
  let to = startOfPrevWeek.endOf("day").plus({ day: 4 });
  log.info(`Getting events from ${startOfPrevWeek} to ${to}`);
  const events = await cal.listEvents(startOfPrevWeek, to);
  getFocusTime(startOfPrevWeek, to, events);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
