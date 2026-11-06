import { describe, expect, it } from "vitest";
import { isUsBankHoliday, isUtcBusinessDay, usBankHolidays } from "./dates";

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe("usBankHolidays", () => {
  it("lists the 2026 schedule, leaving a Saturday holiday unobserved", () => {
    expect([...usBankHolidays(2026)].sort()).toEqual([
      "2026-01-01",
      "2026-01-19",
      "2026-02-16",
      "2026-05-25",
      "2026-06-19",
      // Independence Day 2026 is a Saturday: banks stay open on Friday the 3rd.
      "2026-07-04",
      "2026-09-07",
      "2026-10-12",
      "2026-11-11",
      "2026-11-26",
      "2026-12-25",
    ]);
  });

  it("observes Sunday holidays on the following Monday", () => {
    expect(usBankHolidays(2027).has("2027-07-05")).toBe(true); // July 4 is a Sunday
    expect(usBankHolidays(2022).has("2022-12-26")).toBe(true); // Christmas is a Sunday
    expect(usBankHolidays(2023).has("2023-01-02")).toBe(true); // New Year's Day is a Sunday
    expect(usBankHolidays(2027).has("2027-12-24")).toBe(false); // Christmas is a Saturday
  });

  it("handles last-Monday and fourth-Thursday rules at month edges", () => {
    expect(usBankHolidays(2027).has("2027-05-31")).toBe(true);
    expect(usBankHolidays(2028).has("2028-11-23")).toBe(true);
    expect(usBankHolidays(2029).has("2029-11-22")).toBe(true);
  });
});

describe("isUtcBusinessDay", () => {
  it("excludes weekends and observed holidays only", () => {
    expect(isUtcBusinessDay(day("2026-11-26"))).toBe(false);
    expect(isUtcBusinessDay(day("2026-11-27"))).toBe(true);
    expect(isUtcBusinessDay(day("2026-11-07"))).toBe(false);
    expect(isUtcBusinessDay(day("2026-07-03"))).toBe(true);
    expect(isUsBankHoliday(day("2026-07-03"))).toBe(false);
  });
});
