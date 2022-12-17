import { Duration } from "luxon";
import React from "react";
import { Config, TotalFocusResult } from "../focusTime.js";
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
  let totals = getTotals(sorted);

  return (
    <Body title={`Result for group ${groupName}`} user={user}>
      <>
        <section>
          <h1>Here's the focus time for {groupName}</h1>
          <p>
            From {config.from.toLocaleString()} to {config.to.toLocaleString()}{" "}
            for {config.calenderId} this group had {hr(totals.focusTime.net)} of
            focus time.
            {/* TODO make this in hours */}
          </p>
          <table className="table">
            <thead>
              <tr>
                <td></td>
                <td>Average</td>
                <td>Median</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Focus time</th>
                <td>{hr(totals.focusTime.averagePercent)}</td>
                <td>{hr(totals.focusTime.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In meetings</th>
                <td>{hr(totals.inMeeting.averagePercent)}</td>
                <td>{hr(totals.inMeeting.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In one-on-ones</th>
                <td>{hr(totals.inOneOnOne.averagePercent)}</td>
                <td>{hr(totals.inOneOnOne.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In Recurring meetings</th>
                <td>{hr(totals.inRecurringMeeting.averagePercent)}</td>
                <td>{hr(totals.inRecurringMeeting.medianPercent || 0)}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          {sorted.map(([email, result]) => (
            <div key={email}>
              <p>{email}</p>
              {result && <ProgressBar stats={result} />}
              {/* TODO add inspect link */}
              {result == null && <>Could not be resolved</>}
            </div>
          ))}
        </section>
      </>
    </Body>
  );
}

type GroupResult = {
  averagePercent: number;
  medianPercent: number | null;
};

function getTotals(sorted: [string, TotalFocusResult | null][]): {
  focusTime: GroupResult & { net: number };
  inMeeting: GroupResult;
  inRecurringMeeting: GroupResult;
  inOneOnOne: GroupResult;
} {
  const together = sorted
    .filter(([_email, value]) => value != null && value.totalWorkTime > 10)
    .reduce<{
      focusTime: number[];
      inMeeting: number[];
      inRecurringMeeting: number[];
      inOneOnOne: number[];
      focusNet: number[];
    }>(
      (acc, [_email, userResult]) => {
        let total = userResult!.totalWorkTime;
        acc.focusTime.push(userResult!.focusTime / total);
        acc.focusNet.push(userResult!.focusTime);
        acc.inRecurringMeeting.push(userResult!.inRecurringMeeting / total);
        acc.inOneOnOne.push(userResult!.inOneOnOne / total);
        acc.inMeeting.push(userResult!.inMeeting / total);

        return acc;
      },
      {
        focusTime: [],
        inMeeting: [],
        inRecurringMeeting: [],
        inOneOnOne: [],
        focusNet: [],
      }
    );

  return {
    focusTime: {
      ...groupResult(together.focusTime),
      net: together.focusNet.reduce((one, other) => one + other, 0),
    },
    inMeeting: groupResult(together.inMeeting),
    inRecurringMeeting: groupResult(together.inRecurringMeeting),
    inOneOnOne: groupResult(together.inOneOnOne),
  };
}

function groupResult(array: number[]): GroupResult {
  return { averagePercent: average(array), medianPercent: median(array) };
}

function median(array: number[]) {
  if (array.length === 0) {
    return null;
  } else {
    return array[Math.floor(array.length / 2)];
  }
}

function average(array: number[]) {
  return array.reduce((one, other) => one + other, 0) / (array.length * 1.0);
}
