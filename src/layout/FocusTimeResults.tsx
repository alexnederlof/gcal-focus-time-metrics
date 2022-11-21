import { gamesConfiguration } from "googleapis/build/src/apis/gamesConfiguration";
import { Duration } from "luxon";
import { config } from "process";
import React from "react";
import { Config, FocusResult, TotalFocusResult } from "../focusTime";
import { Body } from "./Body";
import { DayView } from "./DayView";
import { NavProps } from "./Nav";

export function FocusTimeResults({
  results,
  config,
  user,
}: {
  results: TotalFocusResult;
  config: Config;
  user: NavProps["user"];
}) {
  let format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  const hr = (minutes: number) =>
    Duration.fromObject({ minutes })
      .rescale()
      .toHuman({ unitDisplay: "short" });

  return (
    <Body title="Result for you" user={user}>
      <>
        <section>
          <h1>Here's your focus time</h1>
          <p>
            From {config.from.toLocaleString()} to {config.to.toLocaleString()}{" "}
            for {config.calenderId}
          </p>
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
