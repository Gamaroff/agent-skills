# Task Review Report: Task 206 - Hierarchical story ids in the pipeline

**Reviewed:** 2026-10-16
**reviewed_blob:** e7a6dd2f1e34b6755f7ba8b82661e262c1e553c8
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-10-16

---

## Executive Summary

The task is well-scoped and its dependencies (task.202, task.203, task.205, task.204) are merged. Every
code site it names still carries the old two-number shape, so nothing is already implemented. The
defects are in the detail: the plan cites four `doc-id.js` interfaces that the merged engine does not
ship, one success criterion contradicts the "already tolerant" list, and the removed-literal sweep
misses the `develop-next` fixtures that a legacy-`Epic N` error turns red.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 asked — pipeline autonomous mode (develop-next T206); the two open author
decisions were resolved to the options the task document itself recommends.
**Implementation Readiness:** 8/10 (after the fixes below were applied)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside `/develop-task --defaults` dispatched by `/develop-next`. No question was asked; each
default below is the option the document marks as recommended.

### Question Point 1: Structure & Scope

**Q1: Fixture parents — `--assign-prd` in task.203's script, or PRD/epic stubs in each replay tree?**
- **Decision (pipeline default)**: stubs — the Notes say "Stubs are recommended, because they keep the
  fixtures realistic and the script strict".
- **Impact**: Phase 4 adds a `prd.1.*` and `epic.1.5.*` stub to each tree before running the
  migration. `migrate-doc-numbering.mjs` is not changed (its CLI is
  `[--apply | --check] [--json] [--root <dir>] [--name <path>=<slug>]... [--allow-in-flight]`).

### Question Point 2: Technical & Implementation

**Q2: `branchPattern` without `{p}` — refuse, or warn and prepend `{p}.`?**
- **Decision (pipeline default)**: refuse, as drafted.
- **Impact**: none beyond the draft; the refusal now names where it executes (I6).

### Question Point 3: Completeness & Safety

None asked.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References are present; no placeholders.
- Frontmatter: `type: task`, `description`, `tags` present (OKF conformant).
- Tracker: `github_issue: 649` exists (OPEN, `[Task 206] Hierarchical story ids in the pipeline`);
  body link `[#649]` matches; board Priority self-heal ran (`P2`).
- Card preflight: exit 0 — 3 card blocks resolve (Summary +5 more, Success Criteria +11 more,
  Breaking Changes +1 more). This checks card sections only.
- Change Log: present, current for `planned` (sign-off not configured).
- Relative links: `doc-links.js` — 3 resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 Critical (the plan hedges each invented name with "use the shipped one")

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): **aligned**, axes
checked: What this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Registries,
Validation before commit, Do not. Two low findings, folded into O2 and I6.

Pre-pass C (codebase scan): **not-implemented** — none of the listed sites imports `doc-id.js`.

### Important

- **I1. The plan cites `doc-id.js` interfaces the merged engine does not ship.** Measured against
  `module.exports` and the CLI usage of `shared/resources/doc-id.js`:
  - `doc-id.js find-epic --prd --epic --root` (plan Phase 3 block) — no such subcommand. The CLI
    ships `parse`, `next prd|epic|story`, `check`, `epic-meta`.
  - "build it from doc-id's exported kind regexes" (plan Phase 1) — no regex is exported.
  - `parse(...).stem` and `if (!id)` — `parse` returns `{ok, kind, prd, epic, story, sub, artifact,
    seq, slug, id, reason}`; the stem is `id`, and failure is `{ok:false, reason}`, never `null`.
  - `next story --epic <dir>` (task § 3 and plan) — the flag is `--epic-dir`.
  - **Fix applied:** task § 3 and the plan now name the shipped API (`parse`, `matchesEpic`, `id`,
    `ok`, `--epic-dir`), and the Step 0 block resolves the epic by `matchesEpic` over a listing.
- **I6. `branchPattern` has no code reader.** `git grep branchPattern -- '*.js' '*.mjs' '*.sh'`
  finds only the `read-config.sh:599` comment and a parser fixture in `tracker-access.test.sh:1110`.
  The pattern is applied by prose: `create-branch/SKILL.md` § branching config (lines 387–405) and
  the Step 0 table. The refusal of a `{p}`-less pattern must land there. **Fix applied:** Phase 3
  names `create-branch/SKILL.md` § Configuration (the `branching.epicIntegration` block); the
  `tracker-access.test.sh` and `platform-detection.md:294` occurrences are parser fixtures for
  brace-balancing, not readers, and stay.

### Optional

- **O1. Drifted line anchors.** `select-next.mjs`: heading match 351→435; `epicSections` 314/354/367/464
  → 398/438/548/609; `depSatisfied`/`epicActionable` 578→650/662; `ID_RE_SRC` 213→287;
  `isWorkItemHref` 299→373. `uat-status.mjs` id/surface/sort 196–207 → 185–206. **Fix applied.**

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I3. Removed-literal sweep misses the `develop-next` fixtures.** Making a legacy `## Epic N`
  heading a model error turns every fixture that uses one red. `git grep -lE '\bEpic\s+[0-9]+\b' --
  'evals/develop-next/**'` lists `unit/fixtures/{01-first-item,02-deps-and-markers,03-flow-chain,
  04-blocked-annotation,06-forward-deps,09-planning-gap,10-real-world,11-task-ids}.md` and
  `step-isolation/02-human-gated-stop/replay/docs/development/project-completion-roadmap.md`. The
  roadmap template (`skills/develop-next/assets/project-completion-roadmap.template.md:49`,
  `## <Area or Epic N — name>`) and `skills/develop-next/references/roadmap-selection.md:31`
  (`bare epic refs (Epic 8)`) teach the old form. This repository's own roadmap has no `Epic N`
  heading. **Fix applied:** all eleven added to Files Summary and Phase 2.
- **I4. Fixture population is 11 scenarios, not 10.** `git ls-files evals | grep -E
  '/(story\.[0-9]+\.[0-9]+|epic\.[0-9]+)\.'` → 45 paths: 9 `develop-story/step-isolation`
  scenarios plus **two** `create-story` scenarios (`01-happy`, `03-sign-off-enabled`). `01-happy`
  holds `docs/stories/story.178.8.example-feature.md` with no PRD or epic directory, so the migration
  script cannot rename it even with stubs in the other trees. **Fix applied:** the fixture list names
  `01-happy` and states that it is renamed by hand, with the reason recorded in the implementation
  report.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I2. A code-quality criterion contradicts the "already tolerant" list.** "No source file outside
  `doc-id.js` declares a story or epic id regex", measured with the Files Summary `git grep`, matches
  `sync-jira-story.js:198`/`:253`/`:807` and `select-next.mjs` `ID_RE_SRC`, which § 3 keeps unchanged.
  **Fix applied:** the criterion's population is § 3's code-site table, and the tolerant sites are
  named as an exclusion (task.207 owns the repository-wide guard).
- **I5. Two measured criteria have no command.** "`npm test` wall time within 10%" is a wall-clock
  bound no per-PR test can assert; "`eval:all` scenario count unchanged" names no count. **Fix
  applied:** both now state the command (`uptime; time npm test` on the PR head beside the baseline
  on the base commit; the count of scenario directories `eval:all` iterates, from its own `package.json` globs, before and after).
- **I7. Open author decisions left open.** Notes listed two decisions as open. **Fix applied:** both
  recorded as resolved (stubs; refuse), with the rationale above.

### Optional

- **O2. Validation list omits `npm run generate-catalog`** after editing several `SKILL.md` files
  (pre-pass B). **Fix applied:** added to Phase 4.

Test reach (check 18): the one new test file, `evals/shared/tests/step-0-epic-resolution.test.mjs`,
matches `evals/shared/tests/*.test.mjs` in `package.json`. Reached.

Mermaid (Step 6.5): no diagrams; none needed — the id grammar is a table, not a flow.

Scope: 4 phases, 16 h. Large, but the task argues for one PR (Risk 1, a half-moved pipeline reads P
at one step and E at the next). Kept as one task.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk 2 (fixture parents) is now resolved by Q1. Rollback is a single `git revert -m 1` plus
`npm run bundle`. No guard is widened, so no differential oracle is needed.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 7 issues

1. I1 — name the shipped `doc-id.js` API in task and plan.
2. I2 — scope the "no regex outside doc-id" criterion to § 3's table.
3. I3 — add the `develop-next` fixtures, template and selection doc.
4. I4 — name `create-story/01-happy` and its hand rename.
5. I5 — commands for the two measured criteria.
6. I6 — name `create-branch/SKILL.md` as where the `{p}` refusal executes.
7. I7 — record the two author decisions as resolved.

### Consider (Optional) - 2 items

1. O1 — correct drifted anchors.
2. O2 — `npm run generate-catalog` in Phase 4.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** Medium — the surface is wide (≈30 test files, 45
fixture paths, 11 scenarios), so QA cycles are likely.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; every important finding was a mechanical correction and is
applied to the task and plan.

---

## Next Steps

1. Follow the plan phase by phase, confirming each `doc-id.js` call against the shipped API.
2. Record the `npm test` baseline on the base commit before Phase 1.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2, autonomous)
- **Review Date:** 2026-10-16
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.206.hierarchical-story-ids-in-pipeline/task.206.hierarchical-story-ids-in-pipeline.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md (via pre-pass B)
- **Review Duration:** ~25 min
