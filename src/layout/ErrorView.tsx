import React from "react";
import { Body } from "./Body.js";
import { NavProps } from "./Nav.js";

export function ErrorView({
  error,
  user,
}: {
  error: any;
  user: NavProps["user"];
}) {
  return (
    <Body title="Error" user={user}>
      <header>
        <h1>Ai, that's an error</h1>
      </header>
      <div>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    </Body>
  );
}