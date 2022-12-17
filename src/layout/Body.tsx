import React from "react";
import { EnableToolTips } from "./EnableToolTips.js";
import { Nav, NavProps } from "./Nav.js";

export interface Props {
  children: JSX.Element[] | JSX.Element;
  title?: string;
  user: NavProps["user"];
}

export function Body({ children, title, user }: Props) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65"
          crossOrigin="anonymous"
        />
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+jjXkk+Q2h455rYXK/7HAuoJl+0I4"
          crossOrigin="anonymous"
        ></script>
        <title>{title || "Focus time"}</title>
      </head>
      <body style={{ paddingTop: 56 }}>
        <Nav user={user} />
        <div className="container">{children}</div>
        <EnableToolTips />
      </body>
    </html>
  );
}
