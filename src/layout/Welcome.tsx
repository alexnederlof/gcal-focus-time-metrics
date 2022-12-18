import { DateTime } from "luxon";
import React from "react";
import { Body, Props as BodyProps } from "./Body.js";
import { NavProps } from "./Nav.js";

export function Welcome(props: {
  user: NavProps["user"];
  userEmail: string;
  security: BodyProps["security"];
}) {
  return (
    <Body
      title="Welcome to calendar"
      user={props.user}
      security={props.security}
    >
      <>
        <h1>Hey there</h1>
        <p>Let's analyze that focus time</p>
        <form action="/focus-time">
          <div className="row">
            <div className="col">
              <label htmlFor="email" className="col-form-label">
                Enter the group mail, or leave blank for your own calendar
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                defaultValue={props.userEmail}
              />
            </div>
          </div>
          <div className="row">
            <div className="col">
              <label htmlFor="startDate" className="col-form-label">
                Start from
              </label>
              <input
                type="date"
                id="startDate"
                name="analyse-start"
                className="form-control"
                aria-describedby="startHelpInline"
                defaultValue={DateTime.now()
                  .minus({ month: 1 })
                  .toFormat("yyyy-MM-dd")}
                max={DateTime.now().minus({ days: 1 }).toFormat("yyyy-MM-dd")}
              />
            </div>
            <div className="col">
              <label htmlFor="endDate" className="col-form-label">
                Up until
              </label>
              <input
                type="date"
                id="endDate"
                name="analyse-finish"
                className="form-control"
                aria-describedby="endHelpInline"
                defaultValue={DateTime.now().toFormat("yyyy-MM-dd")}
                max={DateTime.now().toFormat("yyyy-MM-dd")}
              />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label htmlFor="dayStart" className="col-form-label">
                Day starts at (hour)
              </label>
              <input
                type="number"
                id="dayStart"
                name="day-start"
                className="form-control"
                aria-describedby="dayStart"
                defaultValue="10"
                max="12"
                min="6"
              />
            </div>
            <div className="col">
              <label htmlFor="dayEnds" className="col-form-label">
                Day ends at (hour)
              </label>
              <input
                type="number"
                id="dayEnds"
                name="day-end"
                className="form-control"
                aria-describedby="dayEnds"
                defaultValue="19"
                max="23"
                min="6"
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="focusThresholdMinutes" className="col-form-label">
              Minimum span of free time to count as focus focus time
            </label>
            <input
              type="number"
              id="focusThresholdMinutes"
              name="focus-threshold"
              className="form-control"
              aria-describedby="focusThresholdMinutes"
              defaultValue="120"
              min="30"
            />
          </div>
          <div className="mb-3">
            <label
              htmlFor="focusContextSwitchMinutes"
              className="col-form-label"
            >
              Withing a focus block, how much time do you assume wasted to
              switch context, do a bio break, etc.
            </label>
            <input
              type="number"
              id="focusContextSwitchMinutes"
              name="focus-switch"
              className="form-control"
              aria-describedby="focusContextSwitchMinutes"
              defaultValue="15"
              min="0"
            />
          </div>
          <div className="mb-3">
            <button type="submit" className="btn btn-primary">
              Let's go!
            </button>
          </div>
        </form>
      </>
    </Body>
  );
}
