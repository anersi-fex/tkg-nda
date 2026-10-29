/** Every time the app shows or stamps is in Detroit time (Eastern). Pure, browser-safe. */
export const TEAM_TIME_ZONE = "America/Detroit";

const longFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: TEAM_TIME_ZONE,
});
const stampFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
  timeZone: TEAM_TIME_ZONE,
});
const shortStamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TEAM_TIME_ZONE,
});

/** "October 29, 2026" in Detroit time. */
export function formatLongDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? "" : longFormat.format(d);
}

/** "Oct 29, 2026, 3:14:07 PM EDT" in Detroit time: the stamp on every event. */
export function formatStamp(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? "" : stampFormat.format(d);
}

/** "Oct 29, 3:14 PM" in Detroit time. */
export function formatShortStamp(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? "" : shortStamp.format(d);
}
