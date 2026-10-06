<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GitDone

GitDone is a Next.js App Router app. It is the release hub and mission control for a hands-off GitLab Duo flow that takes one `ship` issue through Plan, Create, Verify, Package, Secure, Release, Configure, Monitor, and Govern.

## Conventions

- TypeScript, strict. Product name: `PRODUCT_NAME` in `src/config/brand.ts`. Do not hardcode the name anywhere else.
- Logo geometry lives only in `src/brand/mark.ts` and is drawn only in `src/components/logo.tsx`. `app/icon.svg` is generated from that geometry. Do not add a second mark.
- Data loading lives in `src/lib/data/`. Demo data and the GitLab client share one `AppData` shape. Do not fetch GitLab from client components.
- Journey notes follow `docs/journey-schema.md`. Newest valid `<!-- journey:v1 -->` note wins.
- Do not log tokens, emails, or secrets. GitLab calls use `Authorization: Bearer`.
- Happy-path automation does not add a human approval gate. A single clarifying question is allowed only when the issue cannot be planned.

## Checks

```bash
npm test
npm run lint
npm run typecheck
```

## Flow skills

Stage behavior is in `skills/<stage>/SKILL.md`. Follow the skill for the stage you are in. Do not invent GitLab API tools. The documented tool names are listed in each skill.
