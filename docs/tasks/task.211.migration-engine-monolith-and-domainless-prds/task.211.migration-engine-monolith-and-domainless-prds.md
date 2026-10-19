---
id: task.211
title: "Migration engine: monolith and domain-less PRDs"
type: task
description: "Make migrate-doc-numbering.mjs migrate a frontmatter-less legacy PRD, re-point links to a moved docs/prd.md from outside the PRD root, and ask for a domain for a domain-less PRD — then lift the matching refusals from review-prd's migration guard."
tags: [doc-numbering, migration, prd, review-prd, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-10-15
updated: 2026-10-15
assignee:
estimated_effort_hours: 8
depends_on: [task.204]
github_issue: 676
---

# Technical Task: Migration engine: monolith and domain-less PRDs

**Status:** Planned
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
  (`shared/resources/migrate-doc-numbering.mjs:724`, `if (!isFence(lines[0])) return text;`), so
  `--apply` moves the files and then fails its own post-check with `prd_number: (missing)`. Reproduced
  on `develop` and on task.204's branch (task.204 gate 8, CR-2).
- **Dead links reported as `ok`.** The prefilter skips any file outside the PRD tree that does not
  contain the root's last segment or the root prefix (`:1026` `rootSeg`, `:1038`). A README's
  `[PRD](docs/prd.md)` contains neither, so it is never read; after the monolith moves, the link is
  dead and the run reports `ok` (task.204 gate 8, CR-5).
- **A migrated PRD that create-prd refuses.** A root `index.md` is placed at
  `${PRD_ROOT}/prd.{P}.{slug}/` with Folder `.` (`:464`–`:466`), as are root-level L1 and L2 PRDs
  (`:458`–`:463`, `domain = … || "."`). create-prd's keep and register blocks require
  `{domain}/prd.{P}.{feature}/`, refuse it as off-layout, and point back to `/review-prd`, whose
  check reads ok — a remedy loop (task.204 gate 8, CR-4).
- **The guard is a stopgap.** Until these land, review-prd tells the user to fix such PRDs by hand.

---

## 3. Technical Background

### Current

- `editFrontmatter(text, edits)` — `shared/resources/migrate-doc-numbering.mjs:721`; returns `text`
  unchanged when `lines[0]` is not a fence (`:724`).
- PRD placement — `:455`–`:471`: L1 and L2 keep their parent as the domain (`"."` at the root); a root
  `index.md` goes to `P.join(root, newStem)`, domain `"."`; the L3 monolith goes to
  `P.join(root, p.slug, newStem)`, domain = slug.
- Prefilter — `:1026`–`:1041`: a file outside the tree is read only when it has a frontmatter or gate
  edit, or contains `rootSeg` / `prefix`.
- `--name <path>=<slug>` — parsed at `:1523`–`:1528` into `a.names` (path → slug); used for the slug at
  `:309` and `:323`.
- `checkPrdRoot` — `:1328`.
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
  task.204 cycle 8).
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

- [ ] `editFrontmatter` creates a block when the file has none; an unclosed fence is a plan blocker.
- [ ] Engine rows: a frontmatter-less monolith and a frontmatter-less L1 PRD migrate and pass post-check; an unclosed fence blocks.
- [ ] Remove `no-frontmatter` from `migration-guard.mjs`; update task.204's gate-8 row.

### Phase 2: Outside links (Medium risk)

- [ ] Explicit move sources outside the root join the prefilter; the link pass re-points
  `[PRD](docs/prd.md)` from the repository root and `[PRD](prd.md)` from `docs/`.
- [ ] Engine rows: both links re-pointed; a file that names neither is untouched; `links.rewritten` counts them.
- [ ] Remove `outside-links` from `migration-guard.mjs`.

### Phase 3: Domain (Medium risk)

- [ ] A PRD whose domain resolves to `"."` is a `needs-domain` blocker; `--name <path>=<domain>/<slug>`
  places it at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/` with Folder `<domain>`; the domain is validated as
  a lowercase kebab-case slug.
- [ ] review-prd's plan block lists `needs-domain` with the instruction to ask for `<domain>/<slug>`.
- [ ] Engine rows: root `index.md`, root L1, root L2 — blocked without a domain, placed with one; create-prd's keep block accepts the result.
- [ ] Remove `no-domain` from `migration-guard.mjs`; delete the script and its calls if no code remains.

---

## 7. Files Summary

1. ✅ `shared/resources/migrate-doc-numbering.mjs` — Phases 1–3.
2. ✅ `skills/review-prd/scripts/migration-guard.mjs` — codes removed (or the file deleted).
3. ✅ `skills/review-prd/SKILL.md` — plan/apply blocks and blocker instructions.
4. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs` — engine rows.
5. ✅ `evals/shared/tests/prd-skill-numbering.test.mjs` — gate-8 row updated to the lifted codes.
6. Generated: `skills/review-prd/references/migrate-doc-numbering.mjs` (`npm run bundle`).

---

## 8. Testing Strategy

- **Engine** (`shared/resources/tests/migrate-doc-numbering.test.mjs`): one fixture per shape, each run
  plan → apply → `doc-id check --corpus`; every other PRD byte-identical after apply; outside links
  re-pointed, and an unrelated file untouched (the should-not direction).
- **Skill** (`evals/shared/tests/prd-skill-numbering.test.mjs`): review-prd's plan and apply blocks
  over the same shapes; create-prd's keep block over a migrated root PRD.
- **Mutation-proven**: revert each fix and name the row that goes red.
- Run with `.agents/skills` moved aside.

---

## 9. Success Criteria

### Functional

- [ ] A legacy PRD with no frontmatter migrates end to end and the numbering check is clean; an unclosed fence is a plan blocker, and nothing moves.
- [ ] After migrating `docs/prd.md`, a README `[PRD](docs/prd.md)` and a `docs/` file's `[PRD](prd.md)` point at the new path.
- [ ] A domain-less PRD blocks with `needs-domain`; with `--name <path>=<domain>/<slug>` it lands at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/`, and create-prd's keep block accepts it.
- [ ] `migration-guard.mjs` refuses none of the three shapes (or no longer exists).

### Performance

- [ ] The prefilter adds reads only for files that name a move source outside the root.

### Code Quality

- [ ] `npm run ci:fast` and `npm run eval:all` pass with `.agents/skills` moved aside; `npm run bundle:check` clean.
- [ ] `npm run validate -- skills/review-prd/` passes.
- [ ] Every new row is mutation-proven.

### Migration

- [ ] review-prd's plan block documents `needs-domain` and the `<domain>/<slug>` form.
- [ ] CHANGELOG entry names the `--name` form and the new blocker.

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

## Change Log
<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-15 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1 — Frontmatter
- [ ] Phase 2 — Outside links
- [ ] Phase 3 — Domain

---

## References

- task.204 gate 8: `docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.gate.8.numbered-prds-in-prd-skills.yml` (CR-2, CR-4, CR-5)
- task.204 QA report 8 and PR review 1 (PC-4)
- task.203: `docs/tasks/task.203.migrate-doc-numbering/`

## Notes

QA artifacts will be co-located here: `task.211.qa.{n}.*.md`, `task.211.gate.{n}.*.yml`,
`task.211.bug.{n}.*.md`.
