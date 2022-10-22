import { DateTime } from "luxon";
import { Logger } from "tslog";
import { authorize } from "./auth";
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
  const events = await cal.listEvents(startOfPrevWeek, to);
  log.info(`Got ${events.length} events from ${startOfPrevWeek} to ${to}`);
  events.forEach((e) => log.info(`event ${e.description}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
