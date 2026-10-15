import { describe, expect, it } from "vitest";
import { isCompatibleApiVersion } from "./version.ts";

describe("isCompatibleApiVersion", () => {
  it("accepts the same major", () => {
    expect(isCompatibleApiVersion("1.4", "1.0")).toBe(true);
  });

  it("rejects a different major", () => {
    expect(isCompatibleApiVersion("2.0", "1.0")).toBe(false);
  });
});
