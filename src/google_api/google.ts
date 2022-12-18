import { GaxiosResponse } from "gaxios";
import { google } from "googleapis";
import prom from "prom-client";
export function initGoogle() {
  const requestCounter = new prom.Counter<"status">({
    name: "gaxios_requests",
    labelNames: ["status"],
    help: "Request counter to the Google APIs",
  });
  google.options({
    http2: true,
    retry: true,
    adapter: async (options, defaultAdapter) => {
      console.error("INTERCEPT");
      const res: GaxiosResponse<any> = await defaultAdapter(options);
      requestCounter.labels(res.status.toString()).inc();
      return res;
    },
  });
}
