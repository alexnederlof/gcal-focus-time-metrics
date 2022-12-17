import React from "react";

export function EnableToolTips() {
  const jsLines = [
    "const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle=\"tooltip\"]');",
    "const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));",
  ];
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: jsLines.join("\n"),
      }}
    />
  );
}
