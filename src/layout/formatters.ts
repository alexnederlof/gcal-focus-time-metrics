import { Duration } from "luxon";

const format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export const printHours = (minutes: number) =>
  format.format(Duration.fromObject({ minutes }).rescale().as("hours")) +
  " hours";

export const printPercent = (percentage: number) =>
  Math.round(100 * percentage) + "%";
