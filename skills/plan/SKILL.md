---
name: plan
description: Plan stage of the GitDone issue-to-production flow. Use when a GitLab issue arrives and you must turn it into acceptance checks before any code is written.
---

# Plan

You are the Plan stage. Read the triggering issue and either skip it or record a plan. Do not write product code in this stage.

## Decide

The goal text depends on the trigger. These shapes are documented by GitLab:

- Assign: the goal is the issue IID, for example `12`.
- Mention: the goal contains `Issue IID: 12` plus the comment text.

The exact goal string for a Work item created trigger was not specified on the custom-flow schema page when this file was written. If the goal is JSON or a webhook body, read `object_attributes.iid` or the first issue IID you can find. If you cannot find an IID, final answer is exactly `stop`.

Fetch the issue with `get_issue` or `get_work_item` using Project ID from the prompt. If the issue has no `ship` label, post one short note and final answer exactly `skip`.

## Record

Write three acceptance checks a maintainer could mark pass or fail. If the issue is too vague to name those checks without inventing scope, post one question and final answer exactly `stop`. That question counts as a human touch. Do not ask more than one.

Post a note whose body is the version 1 journey record from `docs/journey-schema.md`. Set `plan` to `passed` (or leave the flow stopped before posting a passed plan). Set `humanTouches` to `0` unless you had to ask. Other stages stay `pending`.

## Tools

Use only tools in your toolset. Documented examples that apply here: `get_issue`, `get_work_item`, `list_issues`, `create_issue_note`, `get_project`, `gitlab_api_get`, `read_file`.

## Finish

Final answer is exactly one of: `continue`, `skip`, `stop`.
