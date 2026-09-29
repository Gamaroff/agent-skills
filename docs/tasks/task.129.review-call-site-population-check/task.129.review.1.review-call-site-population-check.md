# Task Review Report: Task 129 - A call-site list in a task document is the author's recall, not a measurement

**Reviewed:** 2026-09-29
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 important recommendations implemented — 2026-09-29

---

## Executive Summary

The diagnosis is right and the evidence holds: the task.121 review at `c69f5115` does record two
call sites the document did not name, found only because the reviewer ran the guard's collector.
The plan, though, was written against a review-task Step 3 that has since grown to thirteen checks,
misdescribes what the collector already covers, and names a pre-pass file and a contract mechanism
that do not exist. None of it blocks the design; all of it would mislead a developer on first read.

**Critical Issues:** 0 🚨
**Important Issues:** 9 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-task` via `/develop-next`); each decision below is the reviewer's recommended option, recorded for audit
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside the develop-task pipeline, so no question was put to a user. Each point that would have
been a question is recorded with the default taken.

### Question Point 1: Structure & Scope

**D1: Should the lift widen the collector's roots to the tracked shell the task describes?**
- **Decision**: Yes — add `skills/*/scripts/*.sh` and `scripts/*.sh`. `git grep -l 'tracker-comment\.js' -- 'skills/*/scripts/*.sh' 'scripts/*.sh'` returns nothing today, so the guard's population is unchanged; the before/after count assertion proves it.
- **Impact**: Motivation and Clarifications now say which roots exist today and which the lift adds.

### Question Point 2: Technical & Implementation

**D2: Where does the create-task authoring note go?**
- **Decision**: `create-task` `### 3.5 Adversarial Quality Review` — where the authoring twins of review checks already live (obs #161, #170; `tests/review-property-checks.test.js`) — plus one sentence in the Section 7 (Files Summary) prompt pointing at it.
- **Impact**: Phase 2 and Files Summary updated.

**D3: What enforces identical check wording across review-task and review-story?**
- **Decision**: A presence test in the shape of `tests/review-property-checks.test.js` (section-scoped, asserted on the check's own list item), not the families audit — the families registry has no review family.
- **Impact**: Contract Tests and Files Summary updated.

### Question Point 3: Completeness & Safety

**D4: How is the task.121 integration evidence produced?**
- **Decision**: Automated half — `call-sites.js --root <export of c69f5115^>` returns the two unnamed sites. Hand-run half — review-task check 14 applied to `c69f5115^`'s document, recorded in the implementation report (as task 151 recorded its hand runs).
- **Impact**: CLI gains `--root`; Integration Tests and Success Criteria updated.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections, Change Log, Progress Tracking, References present; YAML frontmatter
carries `type: task` and `description`. Tracker linkage: `github_issue: 432` exists (OPEN) and the
body link matches. Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve — Summary
(2 omitted → `+N more`), Success Criteria (2 omitted → `+N more`), Breaking Changes. `doc-links.js`:
1 relative link resolves. Sign-off disabled. Change Log present and current for `planned`.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (inaccuracies, not inventions)

Pre-pass B (architecture alignment): `drift`, all low severity — `axes_checked` = What this repo
produces, SKILL.md authoring, File naming, Status lifecycle, Cross-skill resources, Plan files,
Registries, Validation before commit, Do not (`prepass-axes.js` source: `architecture`). Its
cross-resource finding (cite siblings by bare filename inside `shared/resources/`) is folded into I9.

### Important

- **I1 — "Check 9" collides with checks that already exist.** review-task Step 3 has checks 1–13
  (9 is *Configuration Key Accuracy*, 13 *Single-statement test discriminator*); review-story Step 4
  has 1–9 (9 is *Released-shape diff*). The new check is **review-task check 14** and **review-story
  check 10**, and both skills' `### Detection Rules` lists gain a rule — the precedent every recent
  check followed.
- **I2 — "Nothing collects `stakeholder-summary-cli.js` sites" is false.** `collectCallSites()` is
  already parameterised `(engineRe, engine)` and the guard runs it twice: `SITES` (tracker-comment,
  24 today) and `PR_SITES` (stakeholder-summary-cli, 12 today). The lift moves both shapes, and every
  floor stays: `SITES ≥ 20`, `PR_SITES ≥ 9`, suffixed `≥ 4` each.
- **I3 — The roots are narrower than the document says.** The collector walks
  `shared/resources/*.{md,sh}`, `skills/*/SKILL.md` and un-bannered `skills/*/references/*.md` — not
  tracked shell generally. Per D1 the lift adds `skills/*/scripts/*.sh` and `scripts/*.sh` (the roots
  `tests/mutation-call-site-coverage.test.js` already scans), with zero tracker-comment sites there today.
- **I4 — The pre-pass file does not exist under the name given.** `shared/resources/review-prepass-*.md`
  is `review-task-prepass-prompts.md` and `review-story-prepass-prompts.md`; the files carry a sibling
  rule ("apply the same fix to both"). Agent C gains the instruction and a `population_diff` field in both.
- **I5 — The contract mechanism named is unreachable.** No family in `skill-families.md` covers
  review-task/review-story, so "families audit shared rule" enforces nothing. Per D3, a presence test.
- **I6 — The integration fixture names the wrong commit.** `c69f5115` is the commit that *widened*
  task.121 after its review (142 lines changed in the task document); the document as reviewed is
  `c69f5115^`. And the population must be measured at that tree, not today's — so the CLI needs a
  `--root <dir>` argument.
- **I8 — The output schema names an undefined field.** `form` is defined nowhere. Sites are
  `{ file, line, engine, stage, kind, slots }`: `stage` for the `--stage` engines, `kind` for
  `tracker-issue.js` (which takes `--kind`, not `--stage`), `slots` as the guard reads them today.
- **I9 — The bundled CLI cannot find the repository by its own path.** Bundled into
  `.agents/skills/review-task/references/call-sites.js`, a `__dirname`-relative root points inside the
  skill. The default root is `git rev-parse --show-toplevel` (else cwd); inside `shared/resources/`
  sibling files are cited by bare filename (AGENTS.md); SKILL.md cites the script by its
  `.agents/skills/<skill>/references/call-sites.js` path so the bundler copies it.

### Invariant check (check 11)

Counts measured on `develop` @ `01c8701f` by appending a `console.log` to a throwaway copy of
`comment-slot-coverage.test.mjs`: `SITES` 24 across 16 files, `PR_SITES` 12. The whole guard file runs
in 320 ms (`node --test`), so the "≤ 2 s" performance criterion is comfortably reachable.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

- **I7 — The create-task site is the wrong section.** The plan says §7; review checks' authoring twins
  live in create-task 3.5 (D2). Phase 2 now names both.

Phase dependencies are explicit (2 depends on 1). Effort 5 h is plausible for one module, one test,
four prose sites and a presence test.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

Files Summary updated to add the second pre-pass file, the presence test, both Detection Rules lists
and create-task 3.5. Success criteria are measurable.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The rollback trigger ("the guard scanning fewer sites than before") is the right one, and D1 is made
safe by the same before/after count assertion.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 9 issues

1. I1 — renumber to review-task check 14 / review-story check 10; add Detection Rules entries.
2. I2 — lift both collector shapes; keep every floor.
3. I3 — state today's roots; add the two shell roots (D1).
4. I4 — name both pre-pass prompt files.
5. I5 — presence test instead of the families audit (D3).
6. I6 — fixture at `c69f5115^`; add `--root`.
7. I7 — create-task 3.5 twin + Section 7 pointer (D2).
8. I8 — define the site schema; drop `form`.
9. I9 — default root from git toplevel; bundling and citation rules.

### Consider (Optional) - 4 items

1. O1 — Validation: name `npm run ci:fast` as the per-phase gate (Pre-pass B).
2. O2 — CHANGELOG `[Unreleased]` entry wording: say "added" for the CLI, "changed" for the review skills.
3. O3 — Record the 24/12 baseline in §9 with its command (check 7).
4. O4 — Exit codes: `0` ok/empty, `2` usage — say whether an empty population is `empty` (exit 0) rather than an error, as the observation-log engine distinguishes.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; every important finding is a correction the document can carry,
and all nine were applied in this run.

---

## Next Steps

Task is ready for implementation. Follow Phase 1 (lift, with the count asserted before and after),
then Phase 2 (prose + presence test), then `npm run bundle`.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous develop-task pipeline)
- **Review Date:** 2026-09-29
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.129.review-call-site-population-check/task.129.review-call-site-population-check.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via Pre-pass B)
- **Pre-pass:** B `drift` (4 low), C `not-implemented`
