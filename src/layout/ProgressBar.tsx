import React from "react";
import { TotalFocusResult } from "../focusTime.js";
import { printHours } from "./formatters.js";

export function ProgressBar({ stats }: { stats: TotalFocusResult }) {
  const {
    focusTime,
    totalWorkTime,
    inMeeting,
    inRecurringMeeting,
    inOneOnOne,
  } = stats;
  let remaininMeeting = inMeeting - inRecurringMeeting - inOneOnOne;
  let calcWidth = (thing: number) => {
    return Math.round((100 * thing) / totalWorkTime) + "%";
  };

  let scatterTime = totalWorkTime - (inMeeting + focusTime);
  let BarPart = (props: {
    colorClass: string;
    perc: string;
    name: string;
    tooltip: string;
  }) => {
    if (props.colorClass === "scatter") {
      return (
        <div
          className={"progress-bar"}
          role="progressbar"
          aria-label={props.name}
          style={{ width: props.perc, backgroundColor: "gray" }}
          data-bs-toggle="tooltip"
          data-bs-title={props.tooltip}
        >
          {props.perc} {props.name}
        </div>
      );
    } else {
      return (
        <div
          className={"progress-bar " + props.colorClass}
          role="progressbar"
          aria-label={props.name}
          style={{ width: props.perc }}
          data-bs-toggle="tooltip"
          data-bs-title={props.tooltip}
        >
          {props.perc} {props.name}
        </div>
      );
    }
  };
  return (
    <div className="progress">
      <BarPart
        name="Focus"
        colorClass="bg-success"
        perc={calcWidth(focusTime)}
        tooltip={printHours(focusTime)}
      />
      <BarPart
        name="1/1"
        colorClass=""
        perc={calcWidth(inOneOnOne)}
        tooltip={printHours(inOneOnOne)}
      />
      <BarPart
        name="Meeting"
        colorClass="bg-warning"
        perc={calcWidth(remaininMeeting)}
        tooltip={printHours(remaininMeeting)}
      />
      <BarPart
        name="Recurring"
        colorClass="bg-danger"
        perc={calcWidth(inRecurringMeeting)}
        tooltip={printHours(inRecurringMeeting)}
      />
      <BarPart
        name="Scattered"
        colorClass="scatter"
        perc={calcWidth(scatterTime)}
        tooltip={printHours(scatterTime)}
      />
      <div style={{ display: "none" }}>
        <pre>
          {JSON.stringify(
            {
              focusTime,
              inMeeting,
              inRecurringMeeting,
              inOneOnOne,
              remaininMeeting,
              totalWorkTime,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
