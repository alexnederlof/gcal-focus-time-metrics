import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { Logger } from "tslog";
import { WrappedEvent } from "./WrappedEvents";

export type Config = {
  startOfDay: number;
  endOfDay: number;
  focusThresholdMinutes: number;
};

const DEFAULT_CONFIG: Config = {
  startOfDay: 10,
  endOfDay: 19,
  focusThresholdMinutes: 120,
};

const log = new Logger();

export type FocusResult = {
  focusTime: number;
  focusTimeSlots: number;
  inOfficeTime: number;
  inMeeting: number;
  inRecurringMeeting: number;
  inOneOnOne: number;
};

export type PerDayFocusResult = FocusResult & { date: DateTime };
export type TotalFocusResult = FocusResult & { perDay: PerDayFocusResult[] };

export function getFocusTime(
  from: DateTime,
  to: DateTime,
  rawEvents: calendar_v3.Schema$Event[],
  config = DEFAULT_CONFIG
): TotalFocusResult {
  if (from.weekday !== 1) {
    throw `I need to start on a monday, not ${from.weekdayLong}`;
  }
  const events = rawEvents
    .filter((e) => e.status !== "cancelled") // Filter all day events
    .map((e) => new WrappedEvent(e))
    .filter((e) => e.myResponse !== "declined")
    .filter((e) => e.isOutOfOffice || !e.isPersonalWithoutOthers);

  let perDay: PerDayFocusResult[] = [];
  for (
    let today = from.set({ hour: config.startOfDay });
    today < to;
    today = today.plus({ day: 1 }).set({ hour: config.startOfDay })
  ) {
    if (today.weekday > 5) {
      // skip the weekend
      continue;
    }
    let eod = today.set({ hour: config.endOfDay });
    log.info(`Checking ${today} to ${eod}`);
    // Ideally you drop the events you've already seen, but meh.
    // You can't go left-to-right because some events span multiple days
    // So you have to re-query every time what is relevant for this day.
    let te = events.filter((e) => isInTodayWorkHours(today, eod, e));
    let inMeeting = getMeetingTime(te, today, eod);
    let focusTime = getFocusTimeSlots(te, eod, config);
    perDay.push({
      date: today,
      inOfficeTime: 0,
      ...focusTime,
      ...inMeeting,
    });
  }
  return getTotal(perDay);
}

function getTotal(perDay: PerDayFocusResult[]): TotalFocusResult {
  return perDay.reduce(
    (acc, next) => {
      acc.perDay.push(next);
      acc.focusTime += next.focusTime;
      acc.focusTimeSlots += next.focusTimeSlots;
      acc.inMeeting += next.inMeeting;
      acc.inRecurringMeeting += next.inRecurringMeeting;
      acc.inOfficeTime += next.inOfficeTime;
      acc.inOneOnOne += next.inOneOnOne;
      return acc;
    },
    {
      focusTime: 0,
      focusTimeSlots: 0,
      inOfficeTime: 0,
      inMeeting: 0,
      inRecurringMeeting: 0,
      inOneOnOne: 0,
      perDay: [],
    } as TotalFocusResult
  );
}

function getMeetingTime(
  te: WrappedEvent[],
  today: DateTime,
  eod: DateTime
): Pick<PerDayFocusResult, "inMeeting" | "inRecurringMeeting" | "inOneOnOne"> {
  log.info(
    "Today you have non-focus: ",
    te.map((e) => e.prettyPrint())
  );
  let meetings = te.reduce(
    (agg, event) => {
      let duration = event.getDurationTrucatedToDay(today, eod).as("minutes");
      agg.inMeeting += duration;
      if (event.isRecurring) {
        agg.inRecurringMeeting += duration;
      }
      if (event.isOneOnOne) {
        agg.inOneOnOne += duration;
      }
      return agg;
    },
    { inMeeting: 0, inRecurringMeeting: 0, inOneOnOne: 0 }
  );
  log.info(
    `That's ${meetings.inMeeting} of meetings, of which ${meetings.inRecurringMeeting} recurring and ${meetings.inOneOnOne} 1-1`
  );
  return meetings;
}

function getFocusTimeSlots(
  te: WrappedEvent[],
  eod: DateTime,
  config: Config
): Pick<PerDayFocusResult, "focusTime" | "focusTimeSlots"> {
  let slots = 0;
  let totalTime = 0;
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
      duration = compareTo.diff(current.finish);
      const minutes = duration.as("minutes");
      log.info(
        `There are ${minutes}m between ${current.prettyPrint()} and ${next.prettyPrint()}`
      );
      if (minutes >= config.focusThresholdMinutes) {
        slots++;
        totalTime += minutes;
      }
    } else {
      // Last event of the day
      if (current.finish > eod) {
        log.info(
          `${current.summary} Is the last event of the day and ends after work time, so no focus.`
        );
      } else {
        let remaining = eod.diff(current.finish).as("minutes");
        log.info(
          `${remaining}m of focus before EOD after ${current.prettyPrint()}`
        );
        if (remaining >= config.focusThresholdMinutes) {
          slots++;
          totalTime += remaining;
        }
      }
    }
  }
  return { focusTimeSlots: slots, focusTime: totalTime };
}

function isInTodayWorkHours(
  today: DateTime,
  eod: DateTime,
  event: WrappedEvent
): boolean {
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
