import React from "react";
import { Config, TotalFocusResult } from "../focusTime.js";
import { GroupFocusResult } from "../handlers/focusTime.js";
import { Body, Props as BodyProps } from "./Body.js";
import { printHours, printPercent } from "./formatters.js";
import { NavProps } from "./Nav.js";
import { ProgressBar } from "./ProgressBar.js";

export function GroupFocusTimeResults({
  results,
  config,
  user,
  groupName,
  searchParams,
  security,
}: {
  results: GroupFocusResult;
  config: Config;
  user: NavProps["user"];
  groupName: string;
  searchParams: URLSearchParams;
  security: BodyProps["security"];
}) {
  // let format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
  let groupNameShort = groupName.substring(0, groupName.indexOf("@"));
  const userUrl = (email: string) => {
    const search = new URLSearchParams(searchParams);
    search.set("email", email);
    return "/focus-time?" + search.toString();
  };

  const sortUrl = (key: "name" | "focus" | "meeting") => {
    const search = new URLSearchParams(searchParams);
    search.set("sort", key);
    return "/focus-time?" + search.toString();
  };

  const sortButtonActiveClass = (key: "name" | "focus" | "meeting") => {
    if (searchParams.get("sort") === key) {
      return "active";
    }
    if (!searchParams.get("sort") && key === "name") {
      return "active";
    }
  };

  let sorted = Object.entries(results).filter(
    (i) => i[1] && i[1].totalWorkTime > 8
  );
  sorted.sort((one, other) => {
    if (searchParams.get("sort") === "focus") {
      return sortBy("focusTime", one[1], other[1]);
    } else if (searchParams.get("sort") === "meeting") {
      return sortBy("inMeeting", one[1], other[1]);
    }
    return one[0].localeCompare(other[0]);
  }); // sort by email
  let totals = getTotals(sorted);

  return (
    <Body
      title={`Result for group ${groupNameShort}`}
      user={user}
      security={security}
    >
      <>
        <section>
          <h1>Here's the focus time for {groupNameShort}</h1>
          <p>
            From {config.from.toLocaleString()} to {config.to.toLocaleString()}{" "}
            for {config.email} this group had {printHours(totals.focusTime.net)}{" "}
            of total focus time. That's{" "}
            {printPercent(totals.focusTime.averagePercent)} of their time on
            average.
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
                <td>{printPercent(totals.focusTime.averagePercent)}</td>
                <td>{printPercent(totals.focusTime.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In meetings</th>
                <td>{printPercent(totals.inMeeting.averagePercent)}</td>
                <td>{printPercent(totals.inMeeting.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In one-on-ones</th>
                <td>{printPercent(totals.inOneOnOne.averagePercent)}</td>
                <td>{printPercent(totals.inOneOnOne.medianPercent || 0)}</td>
              </tr>
              <tr>
                <th>In Recurring meetings</th>
                <td>
                  {printPercent(totals.inRecurringMeeting.averagePercent)}
                </td>
                <td>
                  {printPercent(totals.inRecurringMeeting.medianPercent || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section>
          <header>
            <div>
              <span>Sort by: </span>
              <div
                className="btn-group btn-group-sm"
                role="group"
                aria-label="Small button group"
              >
                <a
                  href={sortUrl("name")}
                  className={
                    "btn btn-outline-dark " + sortButtonActiveClass("name")
                  }
                >
                  Name
                </a>
                <a
                  href={sortUrl("focus")}
                  className={
                    "btn btn-outline-dark " + sortButtonActiveClass("focus")
                  }
                >
                  Focus
                </a>
                <a
                  href={sortUrl("meeting")}
                  className={
                    "btn btn-outline-dark " + sortButtonActiveClass("meeting")
                  }
                >
                  Meetings
                </a>
              </div>
            </div>
          </header>
          {sorted.map(([email, result]) => (
            <div key={email} style={{ margin: ".8em 0" }}>
              <a href={userUrl(email)}>{email}</a>
              {result && <ProgressBar stats={result} />}
              {result == null && <>Could not be resolved</>}
            </div>
          ))}
        </section>
      </>
    </Body>
  );
}

function sortBy(
  key: "inMeeting" | "focusTime",
  one: TotalFocusResult | null,
  other: TotalFocusResult | null
) {
  if (!one) return -1;
  if (!other) return 1;
  let percOne = (one[key] || 0.0001) / (one.totalWorkTime || 0);
  let percTwo = (other[key] || 0.0001) / (other.totalWorkTime || 0);
  return percTwo - percOne;
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
