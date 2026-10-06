---
name: create
description: Create stage of the GitDone issue-to-production flow. Use when implementing a planned issue as a branch, commits, and a merge request.
---

# Create

Implement the acceptance checks from the latest journey note on the issue. Stay inside that plan.

## Repository

GitDone is a Next.js App Router app in TypeScript. The product name is the `PRODUCT_NAME` constant in `src/config/brand.ts`. The logo geometry is only in `src/brand/mark.ts` and is drawn only in `src/components/logo.tsx` (favicon: `app/icon.svg`). Run `npm test`, `npm run lint`, and `npm run typecheck` before you open the merge request.

## Git

Branch from the primary branch named in the prompt. Branch name: `<iid>-short-slug`.

Documented tools: `create_branch`, `create_commit`, `create_merge_request`, `create_file_with_contents`, `edit_file`, `read_file`, `list_dir`, `grep`, `find_files`, `run_command`.

The merge request description must contain `Closes #<iid>` and a short note of what changed. Do not merge in this stage.

## Record

Update the journey note. Set `create` to `passed` with the MR url. Set `verify` to `running`. Keep earlier stages as they were. `humanTouches` stays unchanged unless a person replied.

## Finish

Final answer is exactly `continue`, or `stop` if you cannot open the merge request.
