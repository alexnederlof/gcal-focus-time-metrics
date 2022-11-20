import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { WrappedEvent } from "./WrappedEvents";

export type Config = {
  startOfDay: number;
  endOfDay: number;
  focusThresholdMinutes: number;
  focusContextSwitchMinutes: number;
  from: DateTime;
  to: DateTime;
};

export const DEFAULT_CONFIG: Omit<Config, "from" | "to"> = {
  startOfDay: 10,
  endOfDay: 19,
  focusThresholdMinutes: 120,
  focusContextSwitchMinutes: 15,
};

export type FocusResult = {
  focusTime: number;
  focusTimeSlots: Array<{ start: DateTime; end: DateTime; minutes: number }>;
  events: WrappedEvent[];
  inOfficeTime: number;
  inMeeting: number;
  inRecurringMeeting: number;
  inOneOnOne: number;
  outOfOffice: number;
};

export type PerDayFocusResult = FocusResult & { date: DateTime };
export type TotalFocusResult = FocusResult & { perDay: PerDayFocusResult[] };

export function getFocusTime(
  rawEvents: calendar_v3.Schema$Event[],
  config: Config
): TotalFocusResult {
  // if (from.weekday !== 1) {
  //   throw `I need to start on a monday, not ${from.weekdayLong}`;
  // }
  const events = getRelevantEvents(rawEvents);

  let perDay: PerDayFocusResult[] = [];
  for (
    let today = config.from.set({ hour: config.startOfDay });
    today < config.to;
    today = today.plus({ day: 1 }).set({ hour: config.startOfDay })
  ) {
    if (today.weekday > 5) {
      // skip the weekend
      continue;
    }

    let eod = today.set({ hour: config.endOfDay });
    console.info(`Checking ${today} to ${eod}`);
    // Ideally you drop the events you've already seen, but meh.
    // You can't go left-to-right because some events span multiple days
    // So you have to re-query every time what is relevant for this day.
    let te = events.filter((e) => isInTodayWorkHours(today, eod, e));
    if (te.some((e) => e.allDay && e.isOutOfOffice)) {
      // Skip OoO days all together
      continue;
    }
    let inMeeting = getMeetingStats(te, today, eod);
    let focusTime = getFocusTimeSlots(te, eod, config);
    perDay.push({
      date: today,
      inOfficeTime: 0,
      events: te,
      ...focusTime,
      ...inMeeting,
    });
  }
  return getTotal(perDay);
}

/**
 * @param rawEvents The events from Google
 * @returns all actual meetings you are going to. Not OutOfOffice events, or events without other attendees.
 */
function getRelevantEvents(rawEvents: calendar_v3.Schema$Event[]) {
  return rawEvents
    .filter((e) => e.status !== "cancelled") // Filter all day events
    .map((e) => new WrappedEvent(e))
    .filter((e) => e.myResponse !== "declined")
    .filter((e) => e.isOutOfOffice || !e.isPersonalWithoutOthers);
}

function getTotal(perDay: PerDayFocusResult[]): TotalFocusResult {
  return perDay.reduce(
    (acc, next) => {
      acc.perDay.push(next);
      acc.focusTime += next.focusTime;
      acc.focusTimeSlots.push(...next.focusTimeSlots);
      acc.inMeeting += next.inMeeting;
      acc.inRecurringMeeting += next.inRecurringMeeting;
      acc.inOfficeTime += next.inOfficeTime;
      acc.inOneOnOne += next.inOneOnOne;
      acc.outOfOffice += next.outOfOffice;
      return acc;
    },
    {
      focusTime: 0,
      focusTimeSlots: [],
      inOfficeTime: 0,
      inMeeting: 0,
      inRecurringMeeting: 0,
      inOneOnOne: 0,
      outOfOffice: 0,
      perDay: [],
      events: [],
    } as TotalFocusResult
  );
}

/**
 *
 * @param todaysEvents All relevant events on this day.
 * @param sod Start of day
 * @param eod End of day
 * @returns statistics on all the meetings that are planned for this day.
 */
function getMeetingStats(
  todaysEvents: WrappedEvent[],
  sod: DateTime,
  eod: DateTime
): Pick<
  PerDayFocusResult,
  "inMeeting" | "inRecurringMeeting" | "inOneOnOne" | "outOfOffice"
> {
  console.info(
    "Today you have non-focus: ",
    todaysEvents.map((e) => e.prettyPrint())
  );
  let meetings = todaysEvents.reduce(
    (agg, event) => {
      let duration = event.getDurationTruncatedToDay(sod, eod).as("minutes");
      if (event.isRecurring) {
        agg.inRecurringMeeting += duration;
      }
      if (event.isOneOnOne) {
        agg.inOneOnOne += duration;
      }
      if (event.isOutOfOffice) {
        agg.outOfOffice += duration;
      } else {
        agg.inMeeting += duration;
      }
      return agg;
    },
    { inMeeting: 0, inRecurringMeeting: 0, inOneOnOne: 0, outOfOffice: 0 }
  );
  console.info(
    `That's ${meetings.inMeeting} of meetings, of which ${meetings.inRecurringMeeting} recurring and ${meetings.inOneOnOne} 1-1`
  );
  return meetings;
}

/**
 *
 * @param todaysEvents
 * @param eod End of this day
 * @param config The config for your run
 * @returns Statics on the focus time for this
 */
function getFocusTimeSlots(
  todaysEvents: WrappedEvent[],
  eod: DateTime,
  config: Config
): Pick<PerDayFocusResult, "focusTime" | "focusTimeSlots"> {
  let slots: FocusResult["focusTimeSlots"] = [];
  let totalTime = 0;
  for (let i = 0; i < todaysEvents.length; i++) {
    let current = todaysEvents[i];
    if (current.allDay) {
      if (current.original.eventType === "outOfOffice") {
        // TODO how do multiple OoO days work?
        console.info("Ignoring full out of office day " + current.summary);
      } else {
        console.warn("Ignoring full day event " + current.summary);
      }
      continue;
    }
    if (current.start > eod) {
      console.info(
        `Ignoring after hours ${current.summary} that starts at ${current.start}`
      );
    }
    let next = todaysEvents[i + 1];
    let duration;
    if (next) {
      let compareTo = next.start;
      if (compareTo > eod) {
        console.info(
          `Next event ${next.summary} starts after hours (${compareTo}). Taking EOD instead ${eod}`
        );
        compareTo = eod;
      }
      /*
       * in case of overlapping events (someone accepted more than one meeting at the same time), where an events that's later in the array, but ends earlier
       * we take the latest event to start calculating the focus time.
       */
      let calculateFrom = getLatestEndDateUntilNow(todaysEvents, i);
      duration = compareTo.diff(calculateFrom);
      const minutes = duration.as("minutes");
      console.info(
        `There are ${minutes}m between ${current.prettyPrint()} and ${next.prettyPrint()} calculating from ${calculateFrom.toISO()}`
      );

      if (minutes >= config.focusThresholdMinutes) {
        const actualFocusTime = minutes - config.focusContextSwitchMinutes;
        slots.push({
          start: calculateFrom,
          end: compareTo,
          minutes: actualFocusTime,
        });
        totalTime += actualFocusTime;
      }
    } else {
      // Last event of the day
      if (current.finish > eod) {
        console.info(
          `${current.summary} Is the last event of the day and ends after work time, so no focus.`
        );
      } else {
        let remaining = eod.diff(current.finish).as("minutes");
        console.info(
          `${remaining}m of focus before EOD after ${current.prettyPrint()}`
        );
        if (remaining >= config.focusThresholdMinutes) {
          const actualFocusTime = remaining - config.focusContextSwitchMinutes;
          slots.push({
            start: current.finish,
            end: eod,
            minutes: actualFocusTime,
          });
          totalTime += actualFocusTime;
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
    console.warn(`${event.summary} Has no start date?`, event);
    return false;
  }

  if (event.start > eod) {
    return false;
  }

  if (event.finish) {
    return event.finish > today;
  } else {
    console.info(`${event.summary} Has no end time. Ignoring`);
    return false;
  }
}

/**
 *
 * @param todaysEvents All events
 * @param i the index you're currently at
 * @returns The last end time, up until i
 */
function getLatestEndDateUntilNow(
  todaysEvents: WrappedEvent[],
  i: number
): DateTime {
  let latest = todaysEvents[0]?.finish;
  for (let index = 0; index <= i; index++) {
    let other = todaysEvents[index].finish;
    if (!latest || latest < other) {
      latest = other;
    }
  }
  return latest;
}
