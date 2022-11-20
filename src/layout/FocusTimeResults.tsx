import React from "react";
import { FocusResult, TotalFocusResult } from "../focusTime";
import { Body } from "./Body";
import { DayView } from "./DayView";

export function FocusTimeResults({ results }: { results: TotalFocusResult }) {
  let format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  const hr = (minutes: number) => format.format(minutes / 60.0) + "h";
  return (
    <Body title="Result for you">
      <>
        <section>
          <h1>Here's your focus time</h1>
          <table className="table">
            <tbody>
              <tr>
                <th>Focus time</th>
                <td>{hr(results.focusTime)}</td>
              </tr>
              <tr>
                <th>In meetings</th>
                <td>
                  {hr(results.inMeeting)} (of which{" "}
                  {hr(results.inRecurringMeeting)} recurring)
                </td>
              </tr>
              <tr>
                <th>In one-on-ones</th>
                <td>{hr(results.inOneOnOne)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          <h1>Here's how it breaks down</h1>
          {DayView({ day: results.perDay, hr })}
        </section>
      </>
    </Body>
  );
}
