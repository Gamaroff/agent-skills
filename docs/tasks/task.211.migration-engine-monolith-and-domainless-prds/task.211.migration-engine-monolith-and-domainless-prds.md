---
id: task.211
title: "Migration engine: monolith and domain-less PRDs"
type: task
description: "Make migrate-doc-numbering.mjs migrate a frontmatter-less legacy PRD, re-point links to a moved docs/prd.md from outside the PRD root, and ask for a domain for a domain-less PRD — then lift the matching refusals from review-prd's migration guard."
tags: [doc-numbering, migration, prd, review-prd, follow-up]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-15
updated: 2026-10-21
assignee:
estimated_effort_hours: 8
depends_on: [task.204]
github_issue: 676
completed_date: 2026-10-21
pr_number: 712
---

# Technical Task: Migration engine: monolith and domain-less PRDs

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.211.review.1.migration-engine-monolith-and-domainless-prds.md` implemented 2026-10-21
**GitHub Issue**: [#676](https://github.com/Gamaroff/agent-skills/issues/676)

---

## 1. Overview

Task 204 wired `review-prd` to offer the task-203 numbering migration
(`shared/resources/migrate-doc-numbering.mjs`). Its QA cycle 8 ran that path end to end and found three
engine defects that `develop` already carries. Task 204 did not fix them: by the maintainer's choice
it added `skills/review-prd/scripts/migration-guard.mjs`, which refuses the three shapes so no apply is
offered that the engine cannot finish. This task fixes the engine and lifts each refusal.

**Scope**: the three engine defects, the guard codes they correspond to, and the tests for both.

**Key deliverables**:

- A legacy PRD with no frontmatter migrates (`no-frontmatter` lifted).
- Links to a moved `docs/prd.md` from outside the PRD root are re-pointed (`outside-links` lifted).
- A domain-less PRD is placed under a domain the user names (`no-domain` lifted).

**Expected outcome**: every PRD shape `review-prd` reports as Critical can be migrated by the offer it
makes, and `migration-guard.mjs` refuses nothing it can carry.

---

## 2. Motivation

- **An apply that can never pass.** A legacy PRD with no frontmatter passes `--check` with no
  blockers, but `editFrontmatter` returns the text unchanged when it has no opening fence
  (`shared/resources/migrate-doc-numbering.mjs:737`, `if (!isFence(lines[0])) return text;`), so
  `--apply` moves the files and then fails its own post-check with `prd_number: (missing)`. Reproduced
  on `develop` and on task.204's branch (task.204 gate 8, CR-2).
- **Dead links reported as `ok`.** The prefilter skips any file outside the PRD tree that does not
  contain the root's last segment or the root prefix (`:1035` `rootSeg`, `:1047`). A README's
  `[PRD](docs/prd.md)` contains neither, so it is never read; after the monolith moves, the link is
  dead and the run reports `ok` (task.204 gate 8, CR-5).
- **A migrated PRD that create-prd refuses.** A root `index.md` is placed at
  `${PRD_ROOT}/prd.{P}.{slug}/` with Folder `.` (`:477`–`:479`), as are root-level L1 and L2 PRDs
  (`:471`–`:476`, `domain = … || "."`). create-prd's keep and register blocks require
  `{domain}/prd.{P}.{feature}/`, refuse it as off-layout, and point back to `/review-prd`, whose
  check reads ok — a remedy loop (task.204 gate 8, CR-4).
- **The guard is a stopgap.** Until these land, review-prd tells the user to fix such PRDs by hand.

---

## 3. Technical Background

### Current

- `editFrontmatter(text, edits)` — `shared/resources/migrate-doc-numbering.mjs:734`; returns `text`
  unchanged when `lines[0]` is not a fence (`:737`).
- PRD placement — `:468`–`:483`: L1 and L2 keep their parent as the domain (`"."` at the root); a root
  `index.md` goes to `P.join(root, newStem)`, domain `"."`; the L3 monolith goes to
  `P.join(root, p.slug, newStem)`, domain = slug.
- Prefilter — `:1035`–`:1050`: a file outside the tree is read only when it has a frontmatter or gate
  edit, or contains `rootSeg` / `prefix`.
- `--name <path>=<slug>` — parsed at `:1532`–`:1537` into `a.names` (path → slug); used for the slug at
  `:322` and `:336`.
- `checkPrdRoot` — `:1337`.
- Line numbers are as of `develop` `27725e92`.
- The guard (task.204): `skills/review-prd/scripts/migration-guard.mjs`, codes `no-frontmatter`,
  `no-domain`, `outside-links`; called by review-prd's plan and apply blocks.
- Tests: `shared/resources/tests/migrate-doc-numbering.test.mjs` (task.203, 44 rows);
  `evals/shared/tests/prd-skill-numbering.test.mjs` (task.204; its gate-8 row asserts each guard code).

### Target

- `editFrontmatter` creates a frontmatter block (with the edited keys, plus `type: prd` for a PRD) when
  the file has none, and an unclosed opening fence becomes a plan blocker — the engine never moves a
  file it cannot edit.
- Every explicit move source outside the root (the monolith path) joins the prefilter, so the link and
  literal passes read the files that name it, by repo-relative path and by a relative link from their
  own directory.
- A PRD that would be placed with domain `"."` is a plan blocker (`needs-domain`) unless the user
  names its domain: `--name <path>=<domain>/<slug>` (one layout everywhere — maintainer decision,
  task.204 cycle 8). The domain and the slug are each validated as `create-prd` validates a domain —
  `docId.format({ kind: "prd", prd: 1, slug })` throws on a bad one; `doc-id.js` exports no slug
  predicate, and this module defines no id regex of its own.
- The L3 monolith (`docs/prd.md`) is never domain-less: today its slug doubles as its domain
  (`${PRD_ROOT}/<slug>/prd.{P}.<slug>/`), and the bare `<path>=<slug>` form keeps that. Given
  `<path>=<domain>/<slug>`, it is placed at `${PRD_ROOT}/<domain>/prd.{P}.<slug>/` like any other PRD.
- `unclosed-frontmatter`, `displaced-frontmatter`, `needs-domain` and `stale-reference` join the
  exported `BLOCKER_CODES` and the module's blocker-code comment. `displaced-frontmatter` covers a
  `---` block of YAML keys after a BOM or blank lines, which no reader sees. `stale-reference` covers
  an outside move source named by a path neither pass rewrites: a relative path outside a link, any
  path in a file type the passes skip, or a variable-rooted path. QA cycles 1–5 added both codes.
- review-prd's plan block asks for `<domain>/<slug>` on `needs-domain`, and `migration-guard.mjs`
  drops each code as its shape is carried.

---

## 4. Scope

### In Scope

- `shared/resources/migrate-doc-numbering.mjs`: frontmatter creation, prefilter, domain blocker and
  the `--name <path>=<domain>/<slug>` form.
- `skills/review-prd/scripts/migration-guard.mjs`: remove `no-frontmatter`, `outside-links` and
  `no-domain` as each is carried (delete the script if none remain, and its calls).
- `skills/review-prd/SKILL.md`: the plan block's blocker list and the `unplaced-prd` / `needs-domain`
  instructions.
- Tests in both suites; `npm run bundle`.

### Out of Scope

- ❌ The PRD-path containment predicate in `doc-id.js` (task.204's other follow-up).
- ❌ Recovery for a PRD written without its registry row (task.204 gate-2 CR-4).
- ❌ Migrating this repository's own documents.

---

## 5. Breaking Changes

- **`--name` accepts `<path>=<domain>/<slug>`.** The bare `<path>=<slug>` form keeps working wherever
  the PRD already has a domain. A domain-less PRD that migrated before (to `${PRD_ROOT}/prd.{P}.{slug}/`)
  now blocks with `needs-domain` until a domain is named. Migration path: pass
  `--name <path>=<domain>/<slug>`; review-prd's plan block asks for it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.211.plan.migration-engine-monolith-and-domainless-prds.md](task.211.plan.migration-engine-monolith-and-domainless-prds.md)

### Phase 1: Frontmatter (Low risk)

- [x] `editFrontmatter` creates a block when the file has none; an unclosed fence is a plan blocker.
- [x] Engine rows: a frontmatter-less monolith and a frontmatter-less L1 PRD migrate and pass post-check; an unclosed fence blocks.
- [x] A closed `---` block of YAML keys after a BOM or blank lines is a `displaced-frontmatter` plan blocker, and `--apply` moves and writes nothing (QA cycles 1, 3 and 4).
- [x] Remove `no-frontmatter` from `migration-guard.mjs`; update task.204's gate-8 row.

### Phase 2: Outside links (Medium risk)

- [x] Explicit move sources outside the root join the prefilter; the link pass re-points
  `[PRD](docs/prd.md)` from the repository root and `[PRD](prd.md)` from `docs/`.
- [x] Engine rows: both links re-pointed; a file that names neither is untouched; `links.rewritten` counts them.
- [x] Engine row (holds the Performance criterion): with a counting `io.readFile`, an outside `.md` that names
  `docs/prd.md` is read and an outside `.md` that names neither the root nor the source is not.
- [x] A mention of an outside move source that neither pass rewrites is a `stale-reference` plan blocker, and `--apply` moves nothing. The mention can be a relative path outside a link, a path in a file type the passes skip, or a variable-rooted path. `outsideReferences` decides, over every in-scope tracked text file (QA cycles 1–5).
- [x] Remove `outside-links` from `migration-guard.mjs`.

### Phase 3: Domain (Medium risk)

- [x] A PRD whose domain resolves to `"."` is a `needs-domain` blocker; `--name <path>=<domain>/<slug>`
  places it at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/` with Folder `<domain>`; the domain is validated as
  a lowercase kebab-case slug.
- [x] The monolith: `--name docs/prd.md=<domain>/<slug>` places it at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/`;
  the bare `<slug>` form keeps today's `${PRD_ROOT}/<slug>/prd.{P}.{slug}/`.
- [x] review-prd's plan block lists `needs-domain` with the instruction to ask for `<domain>/<slug>`.
- [x] Engine rows: root `index.md`, root L1, root L2 — blocked without a domain, placed with one; create-prd's keep block accepts the result.
- [x] Remove `no-domain` from `migration-guard.mjs`; delete the script and its calls if no code remains —
  and update every test that copies or runs it (see Files Summary item 5).

---

## 7. Files Summary

1. ✅ `shared/resources/migrate-doc-numbering.mjs` — Phases 1–3.
2. ✅ `skills/review-prd/scripts/migration-guard.mjs` — codes removed (or the file deleted).
3. ✅ `skills/review-prd/SKILL.md` — plan/apply blocks and blocker instructions.
4. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs` — engine rows.
5. ✅ `evals/shared/tests/prd-skill-numbering.test.mjs` — the gate-8 row (`:967`–`:1010`, copies the guard at
   `:1026`) and the gate-9/10 row (`:1053`–`:1150`, runs the guard and copies it at `:1148`) updated to the
   lifted codes. Found by `git grep -n -e migration-guard -e no-frontmatter -e outside-links -e no-domain -- '*.test.*' evals/ tests/`.
6. Generated: `skills/review-prd/references/migrate-doc-numbering.mjs` (`npm run bundle`).

---

## 8. Testing Strategy

- **Engine** (`shared/resources/tests/migrate-doc-numbering.test.mjs`): one fixture per shape, each run
  plan → apply → `doc-id check --corpus`; every other PRD byte-identical after apply; outside links
  re-pointed, and an unrelated file untouched (the should-not direction); a counting `io.readFile` shows
  an outside file that names no move source is never read (the Performance criterion).
- **Skill** (`evals/shared/tests/prd-skill-numbering.test.mjs`): review-prd's plan and apply blocks
  over the same shapes; create-prd's keep block over a migrated root PRD; the gate-8 and gate-9/10 rows
  re-pointed at the engine once the guard's codes are lifted.
- **Mutation-proven**: revert each fix and name the row that goes red.
- Run with `.agents/skills` moved aside.

---

## 9. Success Criteria

### Functional

- [x] A legacy PRD with no frontmatter migrates end to end and the numbering check is clean; an unclosed fence is a plan blocker, and nothing moves.
- [x] After migrating `docs/prd.md`, a README `[PRD](docs/prd.md)` and a `docs/` file's `[PRD](prd.md)` point at the new path.
- [x] A domain-less PRD blocks with `needs-domain`; with `--name <path>=<domain>/<slug>` it lands at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/`, and create-prd's keep block accepts it.
- [x] `migration-guard.mjs` refuses none of the three shapes (or no longer exists).

### Performance

- [x] The prefilter adds reads only for files that name a move source outside the root.

### Code Quality

- [x] `npm run ci:fast` and `npm run eval:all` pass with `.agents/skills` moved aside; `npm run bundle:check` clean.
- [x] `npm run validate -- skills/review-prd/` passes.
- [x] Every new row is mutation-proven.

### Migration

- [x] review-prd's plan block documents `needs-domain` and the `<domain>/<slug>` form.
- [x] CHANGELOG entry names the `--name` form and the new blocker.

---

## 10. Risk Assessment

- **Medium — the prefilter widens into unrelated files.** Mitigation: add only explicit move sources
  outside the root, and match them as paths or relative links, never as bare words (task.204 gate 7
  CR-1 is the failure shape).
- **Medium — `--name` grammar.** A slug containing `/` was invalid before, so `<domain>/<slug>` is
  unambiguous; validate both parts.
- **Low — task.203's own rows.** Run its 44 rows unchanged before adding new ones.

---

## 11. Rollback Plan

- **Immediate**: revert the task's commit(s); task.204's guard still refuses the three shapes, so
  review-prd stays safe.
- **Partial**: each phase is its own commit; revert one and restore its guard code.
- **Trigger**: a migration that rewrites a file it should not, or a post-check failure on a shape the
  guard no longer refuses.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-21
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.211.qa.6.migration-engine-monolith-and-domainless-prds.md](./task.211.qa.6.migration-engine-monolith-and-domainless-prds.md)
- **Gate File**: [task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml)

### Test Coverage Summary
- **Tests Executed**: 68
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Both gate-5 findings are fixed and mutation-proven, and `parseNameValue` still engages under the path probe (20 cases, 0 escaped). The scoped review found two low findings. The promoted one (CR-1): a root-relative path into a dot-directory is resolved only against the file's directory, which matters only for a PRD root inside a dot-directory. The advisory one (CR-2, medium confidence): `editFrontmatter` writes above a displaced block on a direct call, which the CLI never makes.

## Deferred Work

- **CR-1** (LOW) — carried to gate 6 `recommendations.future` (route 2b, cycle 6): `outsideReferences` resolves a root-relative path into a dot-directory against the file's directory only

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.211.qa.6.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: `task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100
**PR Review**: `task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md`. The verdict is ✅ APPROVE, with one low conformance finding, PC-1.

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 10/10 met. AC8 ("every new row is mutation-proven") was judged against this document's §8 definition, "revert each fix and name the row that goes red". The DoD summary records that judgement.
✅ **Tests:** the engine rows in `shared/resources/tests/migrate-doc-numbering.test.mjs` and the eval rows in `evals/shared/tests/prd-skill-numbering.test.mjs` all run per PR. CI is green on 5/5 checks.
✅ **PR Review:** PR #712. Step 5c `/review-pr` returned APPROVE. The host requires no reviews.
✅ **Documentation:** the CHANGELOG `[Unreleased]` BREAKING entry cites task 211, and `skills/review-prd/SKILL.md` documents all four blocker codes.
✅ **Security Review:** ✅ PASS. The `parseNameValue` probe ran 31 cases: 0 reproduced, 0 escaped.
✅ **Compliance Review:** not applicable. The change touches no personal, payment or health data and no UI.

**Open follow-ups (low):** PC-1 (bring §3 Target in line with the shipped `BLOCKER_CODES`), CR-1 (see Deferred Work) and CR-2 (`editFrontmatter` on a displaced block, direct call only).

**Detailed Verification Log:** See `task.211.dod.1.migration-engine-monolith-and-domainless-prds.md` for the complete verification evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-10-21
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-15 | 1.0     | Initial draft | create-task |
| 2026-10-21 | 1.1     | Review passed (8/10) — anchors re-pointed to develop; monolith `<domain>/<slug>` placement stated; Performance criterion given a read-count test; gate-9/10 test row named | review-task |
| 2026-10-21 |         | Status → ready-for-development | review-task |
| 2026-10-21 |         | Implemented — 8 files, 13 tests (engine 10 new + 1 updated, eval 2 rewritten) | develop |
| 2026-10-21 |         | QA gate CONCERNS (70/100) — 4 findings (3 medium, 1 low) | qa-task |
| 2026-10-21 |         | QA findings fixed — cycle 1, 4 of 4 (CR-1, QA-1, QA-2, CR-3), 5 test rows | qa-fix |
| 2026-10-21 |         | QA gate CONCERNS (70/100) — 5 findings (3 medium, 2 low) | qa-task |
| 2026-10-21 |         | QA findings fixed — cycle 2, 5 of 5 (CR-1 to CR-5), stale-reference matcher consolidated, 5 test rows | qa-fix |
| 2026-10-21 |         | QA gate CONCERNS (75/100) — 5 findings (2 medium, 3 low) | qa-task |
| 2026-10-21 |         | QA findings fixed — cycle 3, 5 of 5 (CR-1 to CR-5), one stale-scan predicate for both loops, 2 test rows added and 1 extended | qa-fix |
| 2026-10-21 |         | QA gate CONCERNS (80/100) — 4 findings (1 medium, 3 low) | qa-task |
| 2026-10-21 |         | QA findings fixed — cycle 4, 4 of 4 (CR-1 to CR-4), one extension helper for both scan loops, 1 test row added and 3 extended | qa-fix |
| 2026-10-21 |         | QA gate CONCERNS (85/100) — 2 findings (1 medium, 1 low) | qa-task |
| 2026-10-21 |         | QA findings fixed — cycle 5, 2 of 2 (CR-1, CR-2), 1 test row added and 1 extended | qa-fix |
| 2026-10-21 |         | QA gate PASS (95/100) — 2 findings (2 low, 1 promoted) | qa-task |
| 2026-10-21 | 1.2 | DoD verified — accepted (PR #712) | finalise |
| 2026-10-21 | 1.3 | §3 Target and Phase 1/2 checklists name the shipped displaced-frontmatter and stale-reference blockers (PR review PC-1) | manual |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1 — Frontmatter
- [x] Phase 2 — Outside links
- [x] Phase 3 — Domain

---

## References

- task.204 gate 8: `docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.gate.8.numbered-prds-in-prd-skills.yml` (CR-2, CR-4, CR-5)
- task.204 QA report 8 and PR review 1 (PC-4)
- task.203: `docs/tasks/task.203.migrate-doc-numbering/`

## Notes

QA artifacts will be co-located here: `task.211.qa.{n}.*.md`, `task.211.gate.{n}.*.yml`,
`task.211.bug.{n}.*.md`.
