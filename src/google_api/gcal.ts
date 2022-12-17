import { GaxiosResponse } from "gaxios";
import { calendar_v3, google } from "googleapis";
import { Auth } from "googleapis";
import log from "loglevel";
import { DateTime } from "luxon";

export interface SimpleCalendar {
  name: string;
  hidden: boolean;
  primary: boolean;
  id: string;
}

export class SimpleGcal {
  private readonly gcal: calendar_v3.Calendar;

  constructor(auth: Auth.OAuth2Client) {
    this.gcal = google.calendar({ version: "v3", auth: auth });
    google._options.retryConfig;
  }

  /**
   * Lists the next 10 events on the user's primary calendar.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  public readonly listEvents = async (
    from: DateTime,
    to: DateTime,
    calendarId = "primary"
  ) => {
    const collected: calendar_v3.Schema$Event[] = [];
    let pageToken = undefined;
    while (true) {
      const resp: GaxiosResponse<calendar_v3.Schema$Events> =
        await this.gcal.events.list({
          calendarId,
          timeMin: from.toISO(),
          timeMax: to.toISO(),
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
          pageToken,
        });
      let events = resp.data;
      if (events.items) {
        log.debug(
          `Found ${events.items.length} more events. Collected ${events.items.length}`
        );
        collected.push(...events.items);
      }
      if (events.nextPageToken) {
        pageToken = events.nextPageToken;
      } else {
        return collected;
      }
    }
  };

  public async getTz() {
    const { data: setting } = await this.gcal.settings.get({
      setting: "timezone",
    });
    return setting.value || undefined;
  }

  public async getCalendar(email: string) {
    log.info("Getting cal id " + email);
    const { data } = await this.gcal.calendars.get({ calendarId: email });
    return data;
  }

  public async getCalendars(): Promise<SimpleCalendar[]> {
    let results: SimpleCalendar[] = [];
    let pageToken = undefined;
    do {
      const resp: GaxiosResponse<calendar_v3.Schema$CalendarList> =
        await this.gcal.calendarList.list({
          maxResults: 100,
          pageToken,
        });
      pageToken = resp.data.nextPageToken;
      (resp.data.items || []).forEach((item) =>
        results.push({
          id: item.id || "",
          name: item.summary || "",
          hidden: item.hidden || false,
          primary: item.primary || false,
        })
      );
    } while (pageToken);
    return results;
  }
}
