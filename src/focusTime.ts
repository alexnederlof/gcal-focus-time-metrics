import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { Logger } from "tslog";

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
  events: calendar_v3.Schema$Event[],
  config = DEFAULT_CONFIG
) {
  if (from.weekday !== 1) {
    throw `I need to start on a monday, not ${from.weekdayLong}`;
  }
  events = events
    .filter((e) => e.status !== "cancelled") // Filter all day events
    .filter((e) => acceptedWithOthers(e));

  for (
    let today = from.set({ hour: config.startOfDay });
    today < to;
    today = today.plus({ day: 1 }).set({ hour: config.startOfDay })
  ) {
    let eod = today.set({ hour: config.endOfDay });
    log.info(`Checking ${today} to ${eod}`);
    // Ideally you drop the events you've already seen, but meh.
    let te = events.filter((e) => isToday(today, eod, e));
    log.info("Today you have: ", te.map(prettyEvent));
  }
}

function isToday(
  today: DateTime,
  eod: DateTime,
  event: calendar_v3.Schema$Event
): boolean {
  if (!event.start) {
    log.warn(`${event.summary} Has no start date?`, event);
    return false;
  }
  if (event.start.date) {
    log.info(`${event.summary} Is all day. Ignoring`);
    return false;
  }
  let start = DateTime.fromISO(event.start.dateTime!);
  if (start > eod) {
    return false;
  }
  let end = undefined;
  if (event.end && event.end.dateTime) {
    end = DateTime.fromISO(event.end.dateTime);
    return end > today;
  } else {
    log.info(`${event.summary} Has no end time. Ignoring`);
    return false;
  }
}

function acceptedWithOthers(e: calendar_v3.Schema$Event): boolean {
  let at = e.attendees || [];
  let accepted = at.some((a) => a.self && a.responseStatus !== "declined");
  if (!accepted) {
    log.info(`Ignoring declined ${e.summary}`);
  }
  if (at.length <= 1) {
    log.info(`Ignoring self-set ${e.summary}`);
  }
  return accepted && at.length > 1;
}

function prettyEvent(e: calendar_v3.Schema$Event) {
  const from = e.start?.dateTime || e.start?.date;
  const to = e.end?.dateTime || e.end?.date;
  const attendees = e.attendees
    ?.filter((e) => !e.self)
    .map((e) => e.displayName || e.email?.split("@")[0])
    .join(", ");
  return `${e.summary} from ${from} to ${to} with ${attendees}`;
}
