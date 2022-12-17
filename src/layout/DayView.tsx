import { DateTime } from "luxon";
import React from "react";
import { PerDayFocusResult } from "../focusTime.js";

interface EventSummary {
  title: string;
  start: DateTime;
  finish: DateTime;
  focusMinutes?: number;
  original?: object;
}

export function DayView({
  day,
  hr,
}: {
  day: PerDayFocusResult[];
  hr: (minutes: number) => string;
}) {
  return (
    <table className="table table-striped">
      <thead>
        <tr>
          <th>Day</th>
          <th>Summary</th>
          <th>Calendar</th>
        </tr>
      </thead>
      <tbody>{day.map((d, i) => OneDay(i, d, hr))}</tbody>
    </table>
  );
}

function OneDay(
  id: number,
  day: PerDayFocusResult,
  hr: (minutes: number) => string
) {
  const events: EventSummary[] = day.events.map((e) => ({
    title: e.summary || "Unknown",
    start: e.start,
    finish: e.finish,
    original: e.original,
  }));
  events.push(
    ...day.focusTimeSlots.map(({ start, end, minutes }) => ({
      start,
      finish: end,
      focusMinutes: minutes,
      title: "Focus",
    }))
  );
  events.sort((a, b) => a.start.toMillis() - b.start.toMillis());
  return (
    <tr key={id}>
      <td>
        {day.date.weekdayLong}
        <br />
        {day.date.toLocaleString()} in {day.date.zoneName}
      </td>
      <td>
        <p>
          {hr(day.focusTime)} of focus time in {day.focusTimeSlots.length}{" "}
          slots:
        </p>
        <p>
          {hr(day.inMeeting)} in meetings of which {hr(day.inRecurringMeeting)}{" "}
          recurring
        </p>
        <p>{hr(day.inOneOnOne)} in one-on-ones</p>
      </td>
      <td>
        {events.map(({ title, start, finish, original, focusMinutes }, i) => (
          <span key={i}>
            {start.setZone(day.date.zoneName).toFormat("HH:mm")} -{" "}
            {finish.setZone(day.date.zoneName).toFormat("HH:mm")}:{" "}
            {focusMinutes ? (
              <span className="badge text-bg-success">
                {hr(focusMinutes)} of focus
              </span>
            ) : (
              title
            )}
            {original && (
              <pre style={{ display: "none" }}>{JSON.stringify(original)}</pre>
            )}
            <br />
          </span>
        ))}
      </td>
    </tr>
  );
}
