import { describe, expect, it } from "vitest";
import { loginCodeEmail } from "./loginEmail.ts";

describe("loginCodeEmail", () => {
  const email = loginCodeEmail("482913", { logoSrc: "cid:logo", year: 2026 });

  it("puts the code in the subject, text and html", () => {
    expect(email.subject).toBe("Your droid247 login code is 482913");
    expect(email.text).toContain("482913");
    // Split into two groups visually, with no character between them, so copying gives the bare code.
    expect(email.html).toContain('482<span style="padding-left:0.32em">913</span>');
  });

  it("states the 10-minute expiry", () => {
    expect(email.text).toContain("expires in 10 minutes");
    expect(email.html).toContain("expires in 10 minutes");
  });

  it("uses the logo image when given, text otherwise", () => {
    expect(email.html).toContain('src="cid:logo"');
    const plain = loginCodeEmail("482913");
    expect(plain.html).not.toContain("<img");
    expect(plain.html).toContain(">droid247</span>");
  });
});
