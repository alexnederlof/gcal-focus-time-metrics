import { Duration } from "luxon";
import React from "react";
import { Config } from "../focusTime.js";
import { GroupFocusResult } from "../handlers/focusTime.js";
import { Body } from "./Body.js";
import { DayView } from "./DayView.js";
import { NavProps } from "./Nav.js";
import { ProgressBar } from "./ProgressBar.js";

export function GroupFocusTimeResults({
  results,
  config,
  user,
  groupName,
}: {
  results: GroupFocusResult;
  config: Config;
  user: NavProps["user"];
  groupName: string;
}) {
  // let format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  const hr = (minutes: number) =>
    Duration.fromObject({ minutes })
      .rescale()
      .toHuman({ unitDisplay: "short" });

  let sorted = Object.entries(results);
  sorted.sort((one, other) => one[0].localeCompare(other[0])); // sort by email
  let totals = sorted
    .filter(([_email, value]) => value != null)
    .reduce(
      (acc, [_email, userResult]) => {
        acc.focusTime += userResult!.focusTime;
        acc.inRecurringMeeting += userResult!.inRecurringMeeting;
        acc.inOneOnOne += userResult!.inOneOnOne;
        acc.inMeeting += userResult!.inMeeting;
        return acc;
      },
      { focusTime: 0, inMeeting: 0, inRecurringMeeting: 0, inOneOnOne: 0 }
    );

  return (
    <Body title={`Result for group ${groupName}`} user={user}>
      <>
        <section>
          <h1>Here's the focus time for {groupName}</h1>
          <p>
            From {config.from.toLocaleString()} to {config.to.toLocaleString()}{" "}
            for {config.calenderId}
          </p>
          <table className="table">
            <tbody>
              <tr>
                <th>Focus time</th>
                <td>{hr(totals.focusTime)}</td>
              </tr>
              <tr>
                <th>In meetings</th>
                <td>
                  {hr(totals.inMeeting)} (of which{" "}
                  {hr(totals.inRecurringMeeting)} recurring)
                </td>
              </tr>
              <tr>
                <th>In one-on-ones</th>
                <td>{hr(totals.inOneOnOne)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          {sorted.map(([email, result]) => (
            <div key={email}>
              <p>{email}</p>
              {result && <ProgressBar stats={result} />}
              {result == null && <>Could not be resolved</>}
            </div>
          ))}
        </section>
      </>
    </Body>
  );
}
