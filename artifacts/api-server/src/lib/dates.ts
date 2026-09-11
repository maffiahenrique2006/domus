/**
 * The API layer (Zod, generated from openapi.yaml) represents dates as `Date`
 * objects, but the DB columns for plain dates (no time-of-day) are declared
 * with Drizzle's `{ mode: "string" }` and store/return "YYYY-MM-DD" strings.
 * These helpers convert at that boundary.
 */
export function dateToDateString(value: Date): string;
export function dateToDateString(value: Date | undefined): string | undefined;
export function dateToDateString(value: Date | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.toISOString().slice(0, 10);
}
