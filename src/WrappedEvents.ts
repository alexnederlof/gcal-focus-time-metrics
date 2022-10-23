import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { Logger } from "tslog";
const log = new Logger();

export class WrappedEvent {
  public readonly original: calendar_v3.Schema$Event;
  public readonly start: DateTime;
  public readonly finish: DateTime;
  public readonly allDay: boolean;

  constructor(event: calendar_v3.Schema$Event) {
    this.original = event;
    if (!event.start?.date || !event.start?.dateTime) {
      throw Error(`${event.summary} has no start`);
    }
    if (event.start?.date) {
      this.allDay = true;
      this.start = DateTime.fromISO(event.start!.date);
    } else {
      this.allDay = false;
      this.start = DateTime.fromISO(event.start!.dateTime);
    }
    if (!event.end?.date || !event.end?.dateTime) {
      throw Error(`${event.summary} has no end`);
    }
    if (event.end?.date) {
      this.finish = DateTime.fromISO(event.start!.date);
    } else {
      this.finish = DateTime.fromISO(event.start!.dateTime);
    }
  }

  get summary() {
    return this.original.summary;
  }

  get isRecurring() {
    return !!(
      this.original.recurrence?.length || this.original.recurringEventId
    );
  }

  public prettyPrint() {
    const attendees = this.original.attendees
      ?.filter((e) => !e.self)
      .map((e) => e.displayName || e.email?.split("@")[0])
      .join(", ");
    return `${this.summary} from ${this.start} to ${this.finish} with ${attendees}`;
  }

  public getDurationTrucatedToDay(sod: DateTime, eod: DateTime) {
    let start = this.start;
    let end = this.finish;
    if (start < sod) {
      log.info(
        `${this.summary} started before SOD at ${this.start}. Truncating`
      );
      start = sod;
    }
    if (end > eod) {
      log.info(`${this.summary} ended after EOD at ${end}. Truncating`);
      end = eod;
    }
    return end.diff(start); // .as("minutes") / 60.0
  }
}
