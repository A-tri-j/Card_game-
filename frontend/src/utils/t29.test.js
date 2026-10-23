import { describe, expect, it } from "vitest";
import { modeLabel, multiplier, previewSet, rateText, signed } from "./t29";

describe("29 helpers", () => {
  it("multipliers", () => {
    expect(multiplier(false, false)).toBe(1);
    expect(multiplier(true, false)).toBe(2);
    expect(multiplier(true, true)).toBe(4);
  });
  it("redouble without double is invalid", () => {
    expect(multiplier(false, true)).toBeNull();
  });
  it("labels", () => {
    expect(modeLabel({ doubled: false, redoubled: false })).toBe("Normal");
    expect(modeLabel({ doubled: true, redoubled: false })).toBe("Double");
    expect(modeLabel({ doubled: true, redoubled: true })).toBe("Redouble");
  });
  it("preview matches the 29 rule", () => {
    expect(previewSet(17, 10, false, false)).toEqual({ success: false, opponentPoints: 19, caller: -1, opponent: 1 });
    expect(previewSet(17, 15, false, false).opponent).toBe(0);
    expect(previewSet(17, 17, false, false)).toEqual({ success: true, opponentPoints: 12, caller: 1, opponent: 0 });
    expect(previewSet(17, 30, false, false)).toBeNull();
  });
  it("opponent gets a flat +1 on Double and Redouble", () => {
    expect(previewSet(18, 10, true, false)).toEqual({ success: false, opponentPoints: 19, caller: -2, opponent: 1 });
    expect(previewSet(18, 10, true, true)).toEqual({ success: false, opponentPoints: 19, caller: -4, opponent: 1 });
    expect(previewSet(18, 15, true, true).opponent).toBe(0);
    expect(previewSet(18, 20, true, true)).toEqual({ success: true, opponentPoints: 9, caller: 4, opponent: 0 });
  });
  it("single hand preview", () => {
    expect(previewSet(18, 29, false, false, true)).toEqual({ success: true, opponentPoints: 0, caller: 3, opponent: 0 });
    expect(previewSet(18, 28, false, false, true)).toEqual({ success: false, opponentPoints: 1, caller: -3, opponent: 0 });
    expect(previewSet(18, 0, false, false, true)).toEqual({ success: false, opponentPoints: 29, caller: -3, opponent: 1 });
    expect(multiplier(true, false, true)).toBeNull();
    expect(modeLabel({ single_hand: true, doubled: false, redoubled: false })).toBe("Single Hand");
  });
  it("rate text shows N/A", () => {
    expect(rateText(null)).toBe("N/A");
    expect(rateText(66.67)).toBe("66.67%");
  });
  it("signed points", () => {
    expect(signed(2)).toBe("+2");
    expect(signed(-4)).toBe("-4");
    expect(signed(null)).toBe("—");
  });
});
