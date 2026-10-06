import type { Announcements } from "./types";

export type AnnouncementInput = {
  projectName: string;
  tag: string;
  summary: string;
  bullets: string[];
  url: string;
  humanTouches: number | null;
};

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateWords(value: string, max: number): string {
  if (value.length <= max) return value;
  const sliced = value.slice(0, Math.max(0, max - 1));
  const boundary = sliced.lastIndexOf(" ");
  const cut = boundary > 20 ? sliced.slice(0, boundary) : sliced;
  return `${cut.trimEnd()}…`;
}

export function touchPhrase(humanTouches: number | null): string {
  if (humanTouches === null) return "Shipped from a GitLab issue.";
  if (humanTouches === 0) return "One GitLab issue, zero human touches.";
  const noun = humanTouches === 1 ? "touch" : "touches";
  return `One GitLab issue, ${humanTouches} human ${noun}.`;
}

export function buildAnnouncements(input: AnnouncementInput): Announcements {
  const touch = touchPhrase(input.humanTouches);
  const prefix = `${input.projectName} ${input.tag} is live.`;
  let x = collapse(`${prefix} ${input.summary} ${touch} ${input.url}`);
  if (x.length > 280) {
    const fixed = collapse(`${prefix} ${touch} ${input.url}`);
    const room = 280 - fixed.length - 1;
    const summary = room > 24 ? truncateWords(input.summary, room) : "";
    x = collapse(`${prefix} ${summary} ${touch} ${input.url}`);
  }
  if (x.length > 280) x = `${x.slice(0, 279).trimEnd()}…`;

  const bullets = input.bullets.map((bullet) => `• ${bullet}`).join("\n");
  const discord = [
    `**${input.projectName} ${input.tag}** is live.`,
    "",
    input.summary,
    "",
    bullets,
    "",
    touch,
    input.url,
  ].join("\n");

  const telegram = [
    `${input.projectName} ${input.tag} is live.`,
    "",
    input.summary,
    "",
    bullets,
    "",
    touch,
    input.url,
  ].join("\n");

  return { x, discord, telegram };
}
