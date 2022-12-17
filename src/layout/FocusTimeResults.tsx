import { Duration } from "luxon";
import React from "react";
import { Config, TotalFocusResult } from "../focusTime.js";
import { Body } from "./Body.js";
import { DayView } from "./DayView.js";
import { printHours } from "./formatters.js";
import { NavProps } from "./Nav.js";
import { ProgressBar } from "./ProgressBar.js";

export function FocusTimeResults({
  results,
  config,
  user,
}: {
  results: TotalFocusResult;
  config: Config;
  user: NavProps["user"];
}) {
  return (
    <Body title="Result for you" user={user}>
      <>
        <section>
          <h1>Here's your focus time</h1>
          <p>
            From {config.from.toLocaleString()} to {config.to.toLocaleString()}{" "}
            for {config.email}
          </p>
          <table className="table">
            <tbody>
              <tr>
                <th>Focus time</th>
                <td>{printHours(results.focusTime)}</td>
              </tr>
              <tr>
                <th>In meetings</th>
                <td>
                  {printHours(results.inMeeting)} (of which{" "}
                  {printHours(results.inRecurringMeeting)} recurring)
                </td>
              </tr>
              <tr>
                <th>In one-on-ones</th>
                <td>{printHours(results.inOneOnOne)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          <ProgressBar stats={results} />
        </section>
        <section>
          <h1>Here's how it breaks down</h1>
          <DayView day={results.perDay} hr={printHours} />
        </section>
      </>
    </Body>
  );
}
