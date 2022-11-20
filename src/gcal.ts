import { GaxiosResponse } from "gaxios";
import { calendar_v3, google } from "googleapis";
import { DateTime } from "luxon";
import { AnyAuthClient } from "./auth";

export class SimpleGcal {
  private readonly gcal: calendar_v3.Calendar;

  constructor(auth: AnyAuthClient) {
    this.gcal = google.calendar({ version: "v3", auth });
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
        console.info(
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
}
