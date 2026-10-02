---
id: task.178.plan
title: "Implementation Plan: review-task and review-story cite the §0a key lookup"
type: plan
description: "Code-level guide for task 178: the three citation edits, the bundle, and the guard test."
task-ref: task.178.review-skills-cite-key-lookup.md
created: 2026-10-02
updated: 2026-10-02
---

# Implementation Plan: review-task and review-story cite the §0a key lookup

> Requirements and success criteria:
> [task.178.review-skills-cite-key-lookup.md](task.178.review-skills-cite-key-lookup.md)

## Overview

Three edits, one bundle run and one guard test. The pattern to copy is `/review-pr`'s Step 1a rung 1
and Step 2 rung 4. Both link `references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup`
and state the `KEY_FIELD` / `KEY_VALUE` to bind.

## Phase 1: The three sites

**review-task/SKILL.md, Step 2 (around line 99).** Replace the `LOCAL_PATH=$(grep -rl …)` pipeline with
prose plus a short block:

- Run [§0a Key → document lookup](references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup)
  with `KEY_FIELD=jira_key KEY_VALUE=$JIRA_KEY`. It binds `LOCAL_PATH`, and it halts (exit 1) on several
  matches.
- Then keep the task-only check on its result:
  `case "$(basename "$LOCAL_PATH")" in task.[0-9]*) ;; *) echo "…not a task document…"; exit 1 ;; esac`.
- Keep the existing not-found message.

**review-task/SKILL.md:134 and review-story/SKILL.md:189.** Replace the inline `grep -rl` with a
citation of the same section (`KEY_FIELD=github_issue KEY_VALUE={N}`, or `jira_key`). Keep the
sentence's surrounding flow ("If no Document link found …").

Run `npm run bundle`. Expect `review-task` and `review-story` to each report `1 bundled · closure +1`.
Confirm the copy is the step-0 document alone, which is what the citation rule promises.

## Phase 2: Guard test

`tests/key-lookup-single-statement.test.js`. Follow the shape of `tests/unbound-default-reads.test.js`
(population over canonical sources, an allowlist with reasons):

- Population: every `skills/*/SKILL.md`, every `shared/resources/*.md`, and every hand-authored
  `skills/*/references/*.md` (drop files carrying the AUTO-GENERATED marker).
- Fail on `/grep -rl "(jira_key|github_issue): /`. Allowlist exactly one entry — the §0a history note
  ("The previous form of this lookup was a bare …") — matched by file and by that sentence, never by
  line number.
- Non-vacuity: the §0a block in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` must
  contain `^${KEY_FIELD}:[[:space:]]*['\"]?${KEY_VALUE}` — the rule must still exist for the citations
  to point at.
- Mutation: paste the old line-99 grep back into review-task and confirm the test goes red.

The key `grep -rl "jira_key: ` is unique to this rule: the population command in the task document
returns only these sites. If a later grep finds a hit belonging to another rule, switch to a compound
pattern (obs #135).

## Phase 3

CHANGELOG `[Unreleased]` › Changed, citing (task 178), with the prefix-match note.
