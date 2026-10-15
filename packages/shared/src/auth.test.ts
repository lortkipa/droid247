import { describe, expect, it } from "vitest";
import { Email, isValidEmail } from "./auth.ts";

describe("isValidEmail", () => {
  it.each(["a@b.co", "first.last@example.com", "x+tag@sub.domain.org"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "plain", "a@b", "a@b.c", "a b@c.com", "@example.com"])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("Email", () => {
  it("trims and lowercases", () => {
    expect(Email.parse("  Me@Example.COM ")).toBe("me@example.com");
  });
});
