---
type: review
status: accepted
review_of: 'docs/bugs/bug.16.main-guard-silent-noop-under-symlink/bug.16.main-guard-silent-noop-under-symlink.md'
reviewer: review-bug
mode: validate-and-apply
created: '2026-09-29'
updated: '2026-09-29'
description: 'Fix-readiness review of bug.16 — STALE (already fixed): every listed guard compares real paths on develop, and a population test holds it.'
---

# Bug Review — bug.16 (general)

## Executive Summary

```
Bug: bug.16 (general)
Fix-readiness: 3/10 — 🚨 STALE (already fixed)
Critical: 2  Important: 1  Optional: 0
Duplicate: none   Reproduces: unlikely   Stale source: pre-pass
Top blockers: the defect was fixed on develop in 39e595f9 (2026-09-24), one day after filing;
              the other five listed files already compared real paths when the bug was filed.
```

**Recommendation: close the bug with a Resolution Summary. Do not fix it.** No fix is left to make,
and a regression test that "fails without the fix" cannot be written against code that is already
correct.

Invoked by `develop-bug` Step 2 (`MODE=validate`, `APPLY=true`), dispatched by `/develop-next`
(registry fallback).

## Pre-pass results

Both scans ran **in-line**, not as Explore subagents: each was a handful of greps and one
reproduction, so a dispatch would have added latency and nothing else.

### Duplicate scan — `none`

- `docs/bugs/bug-registry.md` row 4 (**bug.4**, *Snippet engine silently no-ops when invoked through
  a symlinked path*, `closed`) is the same **class** of defect on a different file,
  `qa-execute-snippets.mjs`. It is a predecessor, not a duplicate: bug.16's population is broader.
- `task.128.bug.1` (fix-and-recheck evaluator no-ops through a symlinked path) is the same class on
  `finalise-fix-and-recheck.mjs`. Also closed, also a predecessor.
- No open bug or task covers the six-file population.

### Already-fixed scan — `reproduces: unlikely`

**Reproduction, run against both trees** (the bug's own Steps to Reproduce, verbatim):

| Tree | `node /tmp/uat.mjs --root "$(mktemp -d)" --init` |
| --- | --- |
| `39e595f9^` (before the obs #126 fix) | exit **0**, **0 bytes** of output, **0** files written. The bug, as reported |
| `develop` HEAD `93a67bca` | exit **1**, 986 bytes on stderr: `main` ran, then failed to find the `assets/` directory the bare copy left behind. The guard fired |

On HEAD the copied script errors because a lone copied file has no sibling `assets/`. That is a
reproduction artefact, not the bug. What matters is that `main` ran, so the silent no-op is gone.

**The six listed files on `develop` HEAD:** each wraps the comparison in a `try` that compares
`realpathSync(process.argv[1])` with `realpathSync(fileURLToPath(import.meta.url))`. The
`resolve(process.argv[1]) === fileURLToPath(…)` line the bug quotes survives only as the `catch`
fallback, which runs when `realpathSync` throws on a deleted or unreadable path.

| File | `realpathSync` at `39e595f9^` | Fixed by |
| --- | --- | --- |
| `shared/resources/finalise-fix-and-recheck.mjs` | yes (3) | task.128 BUG-1 |
| `shared/resources/qa-execute-snippets.mjs` | yes (3) | bug.4 |
| `skills/loop-supervisor/scripts/run-loop.mjs` | yes (2) | `ffa0d232` (2026-08-28, shipped correct) |
| `skills/develop-next/scripts/select-next.mjs` | yes (2) | `f2b1bfb8` (2026-07-27) |
| `skills/develop-batch/scripts/schedule.mjs` | yes (2) | `79ac4c7e` (2026-07-26, shipped correct) |
| `skills/qa-next/scripts/uat-status.mjs` | **no (0)** | `39e595f9` (2026-09-24, obs #126) |

Counts from `git show 39e595f9^:<file> | grep -c realpathSync`; dates from
`git log --date=short -S'realpathSync(process.argv[1])' -- <files>`.

**The population test the bug asks for already exists:**
`shared/resources/tests/entrypoint-guard-realpath.test.mjs` (added in `39e595f9`). It holds:

1. a **structural** check over every ESM engine in `shared/resources/`, `skills/*/scripts/` and
   `skills/*/references/` that compares `process.argv[1]` with `import.meta.url`. Each must use
   `realpathSync`, with a floor of 9 so the scan cannot pass by matching nothing;
2. two **behavioural** checks that run `security-probe.mjs` and `uat-status.mjs` through a
   symlinked directory and require them to refuse an unknown flag.

`command node --test shared/resources/tests/entrypoint-guard-realpath.test.mjs` → 3 tests, 3 pass.

Guards outside the test's scan roots were checked by hand. `scripts/release-ci-verdict.mjs`,
`scripts/generate-skill-dependencies.mjs`, `scripts/lib/clean-checkout-base.mjs` and
`shared/resources/resolve-skill-set-cli.mjs` all use `realpathSync`.
`skills/session-handoff/scripts/handoff-verify.mjs` realpaths `argv[1]` only. That is the
recommendation's own form, and it is sound because `import.meta.url` is already fully resolved.

## Findings by dimension

### Step 2 — Template & frontmatter compliance

- **Critical — core sections missing.** No `## Evidence`, `## Scope & Impact` (the general-mode
  violation heading; the report has `## Impact` instead), `## Developer Fix Cycle` or
  `## Resolution Summary` stub. `type: bug` is present and the frontmatter is otherwise valid.
- Identity is consistent: filename, `Bug ID` and directory stem agree, and mode is `general`.

### Step 3 — Reproducibility

- Reproduction steps are concrete and self-contained, and they reproduce on the pre-fix tree exactly
  as written.
- **Critical — likely already fixed** (`PREPASS_STALE: unlikely`, `found_at` above). This is the
  finding the recommendation rests on.
- **Important — the population enumeration over-reports.** The report's own grep
  (`resolve(process.argv\[1\]) === fileURLToPath`) matches the `catch` fallback in files whose
  primary comparison is already `realpathSync`. Five of the six listed files were therefore correct
  when the bug was filed. The one genuinely raw engine the list omits, `security-probe.mjs`, was
  fixed in the same commit as `uat-status.mjs`. A population grep has to match the primary branch,
  not a fallback: a fallback line is present on correct files and incorrect ones alike.

### Step 4 — Severity / priority

`Major` / `Medium` was correct for the defect as filed: it silently fakes a pass in QA tooling, with
a workaround (invoke through the real path). No correction.

### Step 5 — Linkage

Registry row 16 exists and reads `new`, consistent with the frontmatter. Issue #522 was created by
`develop-bug` Step 1 and written back.

## Fixes applied to the bug report (Step 6.5)

**None applied.** The Critical "missing sections" finding is a stub-adding edit, and STALE outranks
it: the Resolution Summary written when the bug is closed is the section that matters, and it is
written at close, not here. The Important enumeration finding belongs in that Resolution Summary as
a lesson, not in a rewrite of a report that is being closed. The lifecycle `status` stays `new`, as
review-bug requires.

## Next steps

1. Close bug.16 as already fixed. Write a `## Resolution Summary` citing `39e595f9` and the
   population test, set `status: closed`, flip registry row 16 to `closed`, and close issue #522.
2. Discard or merge the `bugfix/bug.16.main-guard-silent-noop-under-symlink` branch. It carries only
   this review, the implementation report and the `github_issue` write-back. No code changed.
