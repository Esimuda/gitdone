import { describe, expect, it } from "vitest";
import { buildAnnouncements } from "./announcements";
import { buildDemoData } from "./demo";
import { escapeXml, formatDuration, formatTimestamp } from "../format";

describe("announcements", () => {
  it("keeps the X post inside 280 characters, including a long summary", () => {
    const post = buildAnnouncements({
      projectName: "keel",
      tag: "v0.4.2",
      summary: "word ".repeat(80),
      bullets: ["one", "two"],
      url: "https://gitlab.com/community/keel/-/releases/v0.4.2",
      humanTouches: 0,
    });
    expect(post.x.length).toBeLessThanOrEqual(280);
    expect(post.x).toContain("zero human touches");
    expect(post.discord).toContain("**keel v0.4.2**");
    expect(post.discord).toContain("• one");
    expect(post.telegram).toContain("• two");
  });

  it("describes a single human touch without claiming zero", () => {
    const post = buildAnnouncements({
      projectName: "keel",
      tag: "v0.4.1",
      summary: "Grant reviewers get a one-page guide.",
      bullets: ["One screen"],
      url: "https://gitlab.com/community/keel/-/releases/v0.4.1",
      humanTouches: 1,
    });
    expect(post.x).toContain("1 human touch");
    expect(post.x).not.toContain("zero human");
  });

  it("ships demo posts that fit", () => {
    for (const release of buildDemoData().releases) {
      expect(release.announcements.x.length).toBeLessThanOrEqual(280);
      expect(release.announcements.x).toContain(release.tag);
    }
  });
});

describe("format", () => {
  it("formats durations and UTC timestamps", () => {
    expect(formatDuration(47)).toBe("47 min");
    expect(formatDuration(77)).toBe("1 h 17 min");
    expect(formatDuration(373)).toBe("6 h 13 min");
    expect(formatTimestamp("2026-10-05T09:14:00.000Z")).toBe("5 Oct 2026, 09:14 UTC");
  });

  it("escapes XML", () => {
    expect(escapeXml(`keel & "crew" <3`)).toBe("keel &amp; &quot;crew&quot; &lt;3");
  });
});
