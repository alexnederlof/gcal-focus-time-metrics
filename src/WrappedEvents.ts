import { calendar_v3 } from "googleapis";
import { DateTime } from "luxon";

export type InviteResponse =
  | "needsAction"
  | "declined"
  | "tentative"
  | "accepted";
export class WrappedEvent {
  public readonly original: calendar_v3.Schema$Event;
  public readonly start: DateTime;
  public readonly finish: DateTime;
  public readonly allDay: boolean;

  constructor(event: calendar_v3.Schema$Event) {
    this.original = event;
    if (!event.start?.date && !event.start?.dateTime) {
      throw Error(
        `${event.summary} has no start: ${JSON.stringify(event.start)}`
      );
    }
    if (event.start?.date) {
      this.allDay = true;
      this.start = DateTime.fromISO(event.start!.date);
    } else {
      this.allDay = false;
      this.start = DateTime.fromISO(event.start!.dateTime!);
    }

    if (!event.end?.date && !event.end?.dateTime) {
      throw Error(`${event.summary} has no end`);
    }
    if (event.end?.date) {
      this.finish = DateTime.fromISO(event.end!.date)!;
    } else {
      this.finish = DateTime.fromISO(event.end!.dateTime!);
    }

    // Some times all day events do have dates and times.
    if (
      this.start.hour === 0 &&
      this.start.minute === 0 &&
      this.finish.hour === 0 &&
      this.finish.minute === 0
    ) {
      this.allDay = true;
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
    let attendees = this.original.attendees
      ?.filter((e) => !e.self)
      .map((e) => e.displayName || e.email?.split("@")[0])
      .join(", ");
    if (attendees?.length) {
      attendees = `with ${attendees}`;
    }
    let start = this.start.toFormat("MM/dd HH:mm");
    let end = this.finish.toFormat("MM/dd HH:mm");
    if (this.finish.get("day") == this.start.get("day")) {
      end = this.finish.toFormat("HH:mm");
    }
    return `${this.summary} from ${start} to ${end} ${attendees}`;
  }

  public getDurationTruncatedToDay(sod: DateTime, eod: DateTime) {
    let start = this.start;
    let end = this.finish;
    if (start < sod) {
      console.info(
        `${this.summary} started before SOD at ${this.start}. Truncating`
      );
      start = sod;
    }
    if (end > eod) {
      console.info(`${this.summary} ended after EOD at ${end}. Truncating`);
      end = eod;
    }
    return end.diff(start); // .as("minutes") / 60.0
  }

  get isOutOfOffice() {
    return this.original.eventType === "outOfOffice";
  }

  get myResponse(): InviteResponse {
    let me = this.original.attendees?.find((a) => a.self);
    return (me?.responseStatus as InviteResponse) || undefined;
  }

  get isPersonalWithoutOthers(): boolean {
    return !!(
      (this.original.attendees || []).length <= 1 && this.original.creator?.self
    );
  }

  get isOneOnOne(): boolean {
    if (!this.original.creator || !this.original.attendees) {
      return false;
    }
    let creator = this.original.creator?.email;
    return (
      this.original.attendees.length == 2 &&
      this.original.attendees.some((a) => a.email === creator)
    );
  }
}
