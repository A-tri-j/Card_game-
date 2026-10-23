import { describe, expect, it } from "vitest";
import { calcScore } from "./scoring";

describe("calcScore", () => {
  it("exact call", () => expect(calcScore(3, 3)).toBe(3));
  it("extra tricks bonus", () => expect(calcScore(4, 6)).toBe(4.2));
  it("failed call", () => expect(calcScore(4, 3)).toBe(-4));
  it("float call", () => expect(calcScore(2.5, 3)).toBe(2.55));
  it("empty input", () => expect(calcScore("", 3)).toBeNull());
  it("out of range", () => {
    expect(calcScore(14, 3)).toBeNull();
    expect(calcScore(3, -1)).toBeNull();
  });
});
