import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { Logger } from "tslog";
import { WrappedEvent } from "./WrappedEvents";

export type Config = {
  startOfDay: number;
  endOfDay: number;
};

const DEFAULT_CONFIG: Config = {
  startOfDay: 10,
  endOfDay: 19,
};

const log = new Logger();

export type FocusResult = {
  totalHours: number;
  outOfOffice: number;
  availableHours: number;
  inMeeting: number;
  inRecurringMeeting: number;
};

export function getFocusTime(
  from: DateTime,
  to: DateTime,
  rawEvents: calendar_v3.Schema$Event[],
  config = DEFAULT_CONFIG
) {
  if (from.weekday !== 1) {
    throw `I need to start on a monday, not ${from.weekdayLong}`;
  }
  const events = rawEvents
    .filter((e) => e.status !== "cancelled") // Filter all day events
    .map((e) => new WrappedEvent(e))
    .filter((e) => acceptedWithOthersOrOoO(e));

  for (
    let today = from.set({ hour: config.startOfDay });
    today < to;
    today = today.plus({ day: 1 }).set({ hour: config.startOfDay })
  ) {
    let eod = today.set({ hour: config.endOfDay });
    log.info(`Checking ${today} to ${eod}`);
    // Ideally you drop the events you've already seen, but meh.
    // You can't go left-to-right because some events span multiple days
    // So you have to re-query every time what is relevant for this day.
    let te = events.filter((e) => isToday(today, eod, e));

    let [noFocus, noFocusRecurring] = getNonFocusTimes(te, today, eod);
    getFocusTimeslots(te, eod, config);
  }
}
function getNonFocusTimes(te: WrappedEvent[], today: DateTime, eod: DateTime) {
  log.info(
    "Today you have non-focus: ",
    te.map((e) => e.prettyPrint())
  );
  let [noFocus, noFocusRecurring] = te.reduce(
    ([total, recurring], event) => {
      let duration =
        event.getDurationTrucatedToDay(today, eod).as("minutes") / 60.0;
      if (event.isRecurring) {
        return [total + duration, recurring + duration];
      }
      return [total + duration, recurring];
    },
    [0, 0]
  );
  log.info(
    `That's ${noFocus} of meetings, of which ${noFocusRecurring} recurring `
  );
  return [noFocus, noFocusRecurring];
}

function getFocusTimeslots(te: WrappedEvent[], eod: DateTime, config: Config) {
  for (let i = 0; i < te.length; i++) {
    let current = te[i];
    if (current.allDay) {
      if (current.original.eventType === "outOfOffice") {
        // TODO how do multiple OoO days work?
        log.info("Ignoring full out of office day " + current.summary);
      } else {
        log.warn("Ignoring full day event " + current.summary);
      }
      continue;
    }
    if (current.start > eod) {
      log.info(
        `Ignoring after hours ${current.summary} that starts at ${current.start}`
      );
    }
    let next = te[i + 1];
    let duration;
    if (next) {
      let compareTo = next.start;
      if (compareTo > eod) {
        log.info(
          `Next event ${next.summary} starts after hours (${compareTo}). Taking EOD instead ${eod}`
        );
        compareTo = eod;
      }
      duration = next.start.diff(eod);
      log.info(
        `There is ${duration.as(
          "minutes"
        )}m between ${current.prettyPrint()} and ${next.prettyPrint()}`
      );
    } else {
      // Last event of the day
      if (current.finish > eod) {
        log.info(
          `${current.summary} Is the last event of the day and ends after work time, so no focus.`
        );
      } else {
      }
    }
  }
}

function isToday(today: DateTime, eod: DateTime, event: WrappedEvent): boolean {
  if (!event.start) {
    log.warn(`${event.summary} Has no start date?`, event);
    return false;
  }
  if (event.allDay) {
    log.info(`${event.summary} Is all day. Ignoring`);
    return false;
  }

  if (event.start > eod) {
    return false;
  }

  if (event.finish) {
    return event.finish > today;
  } else {
    log.info(`${event.summary} Has no end time. Ignoring`);
    return false;
  }
}

function acceptedWithOthersOrOoO(e: WrappedEvent): boolean {
  if (e.original.eventType === "outOfOffice") {
    return true;
  }
  let at = e.original.attendees || [];
  let accepted = at.some((a) => a.self && a.responseStatus !== "declined");
  if (!accepted) {
    log.info(`Ignoring declined ${e.summary}`);
  }
  if (at.length <= 1) {
    log.info(`Ignoring self-set ${e.summary}`);
  }
  return accepted && at.length > 1;
}
