import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDuration, formatTime } from "./ist";

describe("IST formatting", () => {
  it("formats a UTC time as IST", () => {
    expect(formatDate("2026-10-22T10:00:00Z")).toBe("22 Oct 2026");
    expect(formatTime("2026-10-22T10:00:00Z")).toBe("3:30 PM IST");
  });

  it("rolls over to the next day in IST", () => {
    expect(formatDate("2026-10-22T20:00:00Z")).toBe("23 Oct 2026");
    expect(formatTime("2026-10-22T20:00:00Z")).toBe("1:30 AM IST");
  });

  it("handles missing values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("combines date and time", () => {
    expect(formatDateTime("2026-10-22T10:00:00Z")).toBe("22 Oct 2026, 3:30 PM IST");
  });

  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(750)).toBe("12m 30s");
    expect(formatDuration(3900)).toBe("1h 05m");
    expect(formatDuration(null)).toBe("—");
  });
});
