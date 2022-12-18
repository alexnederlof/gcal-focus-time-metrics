import React from "react";

export function EnableToolTips(props: { nonce: string }) {
  const jsLines = [
    "const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle=\"tooltip\"]');",
    "const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));",
  ];
  return (
    <script
      nonce={props.nonce}
      dangerouslySetInnerHTML={{
        __html: jsLines.join("\n"),
      }}
    />
  );
}
