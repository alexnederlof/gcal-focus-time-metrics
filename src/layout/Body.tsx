import React from "react";
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
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi"
          crossOrigin="anonymous"
        />
        <title>{title || "Focus time"}</title>
      </head>
      <body style={{ paddingTop: 56 }}>
        <Nav user={user} />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
