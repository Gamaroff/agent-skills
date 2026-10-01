---
id: task.174.plan
title: "Implementation Plan: Publish the docs-only CI classifier as an optional consumer template"
type: plan
task-ref: task.174.ci-docs-only-classifier-template.md
---

# Implementation Plan: Publish the docs-only CI classifier as an optional consumer template

> Requirements and success criteria: [task.174.ci-docs-only-classifier-template.md](task.174.ci-docs-only-classifier-template.md)

## Overview

This is a lift, not a design. Everything below Phase 0 is provisional until the tinker-city code
has merged. Phase 0 re-reads what actually shipped and corrects this plan before any file is
written.

## Phase-by-Phase Implementation Guide

### Phase 0: precondition

```bash
TC=~/Development/Projects/tinker-city
# 1. The task document says accepted.
grep -m1 '^status:' "$TC"/docs/tasks/task.127.ci-docs-only-increment-skip/task.127.ci-docs-only-increment-skip.md
# 2. Its PR merged.
(cd "$TC" && gh pr list --state merged --search "task.127 in:title" --json number,mergedAt,title)
# 3. A real skipped run: a PR push whose `changes` job emitted code=false.
(cd "$TC" && gh run list --workflow ci.yml --limit 50 --json databaseId,headSha,event,conclusion,createdAt)
```

**HALT** if 1 is not `accepted`, or 2 is empty, with `blocked: tinker-city task.127 not merged`.
Do not lift unmerged code. If 3 finds no skipped run yet, HALT the same way: "merged" is not "proven
on real CI", and the hand-off asks for the latter.

Then decide the config option (task § 3). Check whether the tinker-city runner host has gained a
`node` on `PATH` since task.127 (`docs/development/testing-runbook.md` *Host tools* row in that
repository). If it has not, option (a), `env` plus a parity test, is the default.

### Phase 1: lift

- Copy `scripts/ci/classify-changes.sh` and `scripts/ci/classify-changes.spec.js` from the merged
  tinker-city tree. Replace each literal `ci-ok` with `${AGGREGATE_CHECK:?}`, so an unset name makes
  the script fail, and the workflow's fail-safe turns that into `code=true`. Confirm that path in
  the spec. Replace the `case` pattern list with `DOCS_PATTERNS` (space-separated shell patterns).
- The `node:test` spec must not import anything from tinker-city. Fixtures are temporary git repos
  plus a stub for the check-runs `curl`, as in the original.
- `changes-job.yml`: a commented snippet only, not a runnable workflow in this repository's
  `.github/`. A real workflow file here would run in this repository's CI.
- `package.json`: add `'docs/examples/ci/**/*.spec.js'` to the `test` script's `node --test` list,
  or the spec runs nowhere (project memory: hand-listed test globs orphan new suites).

### Phase 2: guide and parity

The guide's sections:

1. What this does
2. When to adopt it
3. Wiring (the snippet)
4. The contract (every uncertain path runs the full suite)
5. The merge-result trade-off
6. `cancel-in-progress`
7. How it relates to `/finalise` and `/develop-next`'s pipeline rule (task.172)
8. Bitbucket

The parity test runs task.172's `matchesAnyGlob(path, DEFAULT_PATTERNS)` and the template's shell
classifier on the same fixed path list, and asserts that each path gets the same answer. Spell out
any deliberate divergence, path by path.

### Phase 3: Bitbucket

Use `curl` with the credential order `bitbucket-auth.sh` defines, against
`/repositories/{ws}/{repo}/pipelines/?target.commit.hash={BEFORE}`. A status other than 200, a
`403` in particular, means `code=true`. Copy the warning text from `/finalise`'s Bitbucket block
into the guide by citation, not by restatement.

## Key Patterns and References

- tinker-city task.127's document and plan: the source of every behaviour above
- `/finalise` Bitbucket `403` handling (`skills/finalise/SKILL.md`, "A 403 here is the trap")
- task.172 § 8's fixed path list, which is reused by the parity test

## Testing Approach

Use the lifted spec unchanged, plus the parameterisation, parity and Bitbucket cases in task § 8.
Each new case is mutation-proved, and the reverts are recorded in the implementation report.
