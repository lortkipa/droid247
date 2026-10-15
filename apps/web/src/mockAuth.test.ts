import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidEmail, MOCK_CODE, verifyCode } from "./mockAuth.ts";

describe("isValidEmail", () => {
  it.each(["a@b.co", "first.last@example.com", "x+tag@sub.domain.org"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "plain", "a@b", "a@b.c", "a b@c.com", "@example.com"])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("verifyCode", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts only the mock code", async () => {
    vi.useFakeTimers();
    const good = verifyCode("a@b.co", MOCK_CODE);
    const bad = verifyCode("a@b.co", "000000");
    await vi.runAllTimersAsync();
    await expect(good).resolves.toBe(true);
    await expect(bad).resolves.toBe(false);
  });
});
