import React from "react";
import { TotalFocusResult } from "../focusTime";

export function ProgressBar({ stats }: { stats: TotalFocusResult }) {
  const {
    focusTime,
    totalWorkTime,
    inMeeting,
    inRecurringMeeting,
    inOneOnOne,
    outOfOffice,
  } = stats;
  let remaininMeeting = inMeeting - inRecurringMeeting - inOneOnOne;
  let calcWidth = (thing: number) => {
    return Math.round((100 * thing) / totalWorkTime) + "%";
  };

  let BarPart = (props: { colorClass: string; perc: string; name: string }) => (
    <div
      className={"progress-bar " + props.colorClass}
      role="progressbar"
      aria-label={props.name}
      style={{ width: props.perc }}
    >
      {props.perc} {props.name}
    </div>
  );
  return (
    <div className="progress">
      <BarPart
        name="Focus"
        colorClass="bg-success"
        perc={calcWidth(focusTime)}
      />
      <BarPart name="1/1" colorClass="" perc={calcWidth(inOneOnOne)} />
      <BarPart
        name="Meeting"
        colorClass="bg-warning"
        perc={calcWidth(remaininMeeting)}
      />
      <BarPart
        name="Recurring"
        colorClass="bg-danger"
        perc={calcWidth(inRecurringMeeting)}
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
