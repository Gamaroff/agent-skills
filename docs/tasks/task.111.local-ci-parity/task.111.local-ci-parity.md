---
id: task.111
title: "[Task 111] One local command that runs every CI lane, and two coverage gaps the sweep found"
type: task
description: "npm run ci runs format:check + npm test + eval:all — three of the five CI lanes. validate:all, bundle:check and the ShellCheck lane have no local aggregate, so a contributor can be fully green locally and red in CI on a lane they never ran. Two coverage gaps ride along: develop-task's hook wrappers are untested while develop-story's identical wrappers are, and quick_validate.py does not enforce the 1,024-char description cap (develop-story's is 1,027)."
tags: [ci, testing, tooling, create-skill]
category: infrastructure
status: planned
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 4
---

# Technical Task: One local command that runs every CI lane, and two coverage gaps the sweep found

**Status:** Planned

---

## 1. Overview

Make `npm run ci` mean what its name says: every lane CI runs, in one local command. Then close two
small coverage gaps the 2026-09-12 sweep found while measuring parity.

**Scope**: `package.json` scripts; a test for `skills/develop-task/scripts/*.sh`; a description-length
check in `quick_validate.py`; docs that name the aggregate.

## 2. Motivation

### Current Problems

1. **`npm run ci` is three of five lanes.** `ci` = `ci:fast` (`format:check && npm test`) + `eval:all`.
   CI also runs `validate.yml` (per-skill `quick_validate.py`, catalog diff, skill-deps diff,
   `bundle_skill.py --check`, `bundle --all` no-diff) and `shellcheck.yml`. A contributor who runs
   `npm run ci` and pushes can fail on two lanes they had no local command for. The release
   checklist (`docs/contributing/releases.md`) lists all five workflows; nothing local composes them.
2. **develop-task's hook wrappers are untested.** `skills/develop-task/scripts/{install-hooks,
   on-precompact,on-stop}.sh` are thin wrappers over the shared `develop-pipeline-*.sh` (which are
   tested). develop-story's identical wrappers are covered by
   `evals/develop-story/protocol/install-hooks-behavior.test.mjs`; develop-task's are covered by
   nothing, and develop-bug's are a third copy.
3. **`quick_validate.py` does not enforce the description cap.** `skills/develop-story/SKILL.md`'s
   description is 1,027 characters against a 1,024 cap; 126/126 skills "pass". A cap nothing
   enforces is a number in a doc.

### Benefits

1. Local/CI parity — the thing the release checklist assumes.
2. Three pipelines' wrappers held to one standard, not one of three.
3. The description cap becomes a check, so the next skill that drifts over it is caught at
   `validate` rather than by a consumer's loader.

## 3. Technical Background

### Current Architecture

- `package.json`: `ci`, `ci:fast`, `validate:all` (a shell loop over `skills/*/`), `bundle:check`,
  `eval:all`. No shellcheck script.
- `.github/workflows/shellcheck.yml`: `git ls-files '*.sh' | grep -v '^skills/[^/]*/references/'`
  at `--severity=warning`, pinned v0.11.0, hard-fails if the list is ≥ 200 or empty (58 files as of
  2026-09-12). `shellcheck` v0.11.0 is installed locally on the maintainer's machine; treat absence
  as a **skip with a message**, never a silent pass.
- `evals/develop-story/protocol/install-hooks-behavior.test.mjs` — the wrapper test to mirror.
- `skills/create-skill/scripts/quick_validate.py` — frontmatter checks; no length check.

### Target Architecture

- `npm run ci` → `ci:fast` + `eval:all` + `validate:all` + `bundle:check` + `lint:shell`, where
  `lint:shell` reproduces the workflow's file list and severity, and prints `shellcheck not installed
  — lane skipped` (exit 0, but loud) when the binary is absent.
- One parametrised wrapper test over `develop-story`, `develop-task`, `develop-bug` (a table of three,
  same assertions) — or the existing test generalised; either way, the population is enumerated
  from `ls skills/develop-*/scripts/on-stop.sh`, not typed.
- `quick_validate.py`: `len(description) > 1024` → fail with the count.

### Important Clarifications

- The four `evals/*/smoke/*` scenarios are **live-driver** (need `ANTHROPIC_API_KEY`) and opt-in by
  design; they are *not* a parity gap and this task does not add them to any aggregate.
- `bundle --all` no-diff is already exercised by the pre-commit hook; `bundle:check` is the cheap
  form and is what the aggregate should call.

## 4. Scope

### In Scope

✅ `package.json`: `lint:shell`, `ci` composition; keep `ci:fast` as the quick form
✅ Wrapper test covering all three `develop-*` hook wrapper sets
✅ `quick_validate.py` description cap + trim `develop-story`'s description under 1,024
✅ Docs: releases checklist and evals README name `npm run ci` as the full local equivalent

### Out of Scope

❌ Widening `docs-link-check.yml` (that is task.108's checker)
❌ Any change to what CI runs — this makes local match CI, not the reverse

## 5. Breaking Changes

None. `npm run ci` gets slower (adds three lanes); `ci:fast` is unchanged for the quick loop.

## 6. Implementation Plan

1. `lint:shell` script mirroring `shellcheck.yml`'s list and flags; absent-binary message.
2. Recompose `ci`; run it end-to-end once and record the wall time.
3. Wrapper test: enumerate `skills/develop-*/scripts/`, assert each wrapper delegates to the shared
   script and exits as the shared one does (mirror the develop-story test's assertions).
4. `quick_validate.py` cap; run `validate:all` → one failure (develop-story); trim the description;
   re-run → clean.
5. Docs + CHANGELOG.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `package.json` | `lint:shell`, `ci` |
| `evals/develop-story/protocol/install-hooks-behavior.test.mjs` (or a new shared test) | parametrised over three pipelines |
| `skills/create-skill/scripts/quick_validate.py` | description cap |
| `skills/develop-story/SKILL.md` | description ≤ 1,024 |
| `docs/contributing/releases.md`, `docs/contributing/evals/README.md`, `CHANGELOG.md` | name the aggregate |

## 8. Testing Strategy

- `npm run ci` locally: exit 0, all lanes visibly run.
- Wrapper test: mutation — break `develop-task/scripts/on-stop.sh`'s delegation → the test fails
  naming develop-task.
- Cap: mutation — set a fixture description to 1,025 chars → `quick_validate.py` exits non-zero.
- `shellcheck` absent: `PATH=/usr/bin npm run lint:shell` → the skip message, exit 0.

## 9. Success Criteria

1. `npm run ci` runs format, test, eval:all, validate:all, bundle:check and the shell lint, and exits 0 on `develop`
2. A wrapper test covers `develop-story`, `develop-task` and `develop-bug` wrappers, with the population derived from the tree
3. `quick_validate.py` fails on a description > 1,024 chars; all 126 skills pass after the trim
4. Missing `shellcheck` is reported, not silently passed
5. Releases checklist names `npm run ci` as the local equivalent of the five lanes

## 10. Risk Assessment

**Low.** Script composition and additive tests. The one judgement call is whether `ci` should
fail when `shellcheck` is absent; recommend loud-skip, since a contributor without the binary
still gets the other five lanes and CI holds the line.

## 11. Rollback Plan

Revert `package.json`; the tests and the cap are additive and can stay.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |

---

## Progress Tracking

### Phase 1: one local aggregate
- [ ] `npm run ci` = format:check + test + eval:all + validate:all + bundle:check + shellcheck lane
### Phase 2: the two coverage gaps
- [ ] develop-task hook wrappers covered like develop-story's
- [ ] `quick_validate.py` enforces the 1,024-char description cap; develop-story's trimmed
### Phase 3: docs
- [ ] `docs/contributing/releases.md` checklist and `docs/contributing/evals/README.md` name the aggregate

---

## References

- **Plan**: [`task.111.plan.local-ci-parity.md`](task.111.plan.local-ci-parity.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **CI**: `.github/workflows/{test,validate,shellcheck,docs-link-check}.yml`
- **Traps**: `docs/contributing/traps.md` — "CI check counts differ per PR", "npm test's suite list is hand-maintained"
- **Related Skill**: `.agents/skills/create-skill/` (`quick_validate.py`)

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.111.local-ci-parity/task.111.local-ci-parity.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
