import { GaxiosOptions, GaxiosResponse } from "gaxios";
import { google } from "googleapis";
import prom from "prom-client";

const requestCounter = new prom.Counter<"status">({
  name: "gaxios_requests",
  labelNames: ["status"],
  help: "Request counter to the Google APIs",
});

export function initGoogle() {
  let http2 = true;
  if (http2) {
    google.options({
      http2: true,
      retry: true,
      validateStatus: (status: number) => {
        requestCounter.labels(status.toString()).inc();
        return status >= 200 && status < 300;
      },
    });
  } else {
    google.options({
      http2: false,
      retry: true,
      adapter: GAXIOS_PROMETHEUS_ADAPTER,
    });
  }
}

export const GAXIOS_PROMETHEUS_ADAPTER: GaxiosOptions["adapter"] = async (
  options,
  defaultAdapter
) => {
  console.error("INTERCEPT");
  const res: GaxiosResponse<any> = await defaultAdapter(options);
  requestCounter.labels(res.status.toString()).inc();
  return res;
};
