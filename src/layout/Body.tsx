import React from "react";

export interface Props {
  children: JSX.Element[] | JSX.Element;
  title?: string;
}

export function Body({ children, title }: Props) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3"
          crossOrigin="anonymous"
        />
        <title>{title || "Focus time"}</title>
      </head>
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
