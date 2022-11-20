import { DateTime } from "luxon";
import { authorize } from "./auth";
import { getFocusTime } from "./focusTime";
import { SimpleGcal } from "./gcal";

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
