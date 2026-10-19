# QA Report: Task 207 - Doc numbering enforcement and sweep

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.1.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.1.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

First QA review of PR #682 at head `9b36097f`. Both guards exist, import from `doc-id.js`, hold their
floors and go red on their mutations, and full `npm run ci` is green. Four MEDIUM defects hold: the
review-epic auto-skip fix does not survive running its blocks as separate shells, the chokepoint
comment stripper silently drops lines, a review-epic numbering glob escaped the sweep, and the title
shape misses literal-space parsers.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-207-BUG-1..4

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (23/23 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none for consumers)
- [x] Code on feature branch with open PR (#682, OPEN)

### Testing Approach

- [x] Automated Testing (unit, eval, protocol — full `npm run ci`)
- [x] Performance Testing (wall-clock bound)
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review (Step 3b, independent reviewer)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (Step 3b). The task spans 5 phases and several
modules, but its risk is concentrated in two test files and one Markdown block, so direct
verification covered the rest. Reviewer dispatched 17:07:07Z; returned in `duration_ms` 273649. The
diff reviewed is `origin/develop...HEAD` minus the generated `skills/*/references/**` copies, which
mirror `shared/resources/` sources that are in it (96 files, 5318 patch lines).

Step 4b ran over every changed `SKILL.md` / `shared/resources/*.md` with a fenced bash block (38
files). Seven execution failures in six files, all `cat: .agents/skills/…: No such file` from the
harness's temp copy, with identical counts on `origin/develop` — pre-existing and environmental, none
in a line this diff changed. Eleven files report `zero-blocks-executed` (placeholder-bound blocks, no
`--bind`). The review-epic block this diff rewrote is executed by the chokepoint test's §4 instead.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Dependency gate | PASS | Verified | task.204–206 `accepted`; `checkCorpus` exported |
| Phase 1: Corpus test | PASS | 5/5 | floor `documents >= 22`; three mutation cases red |
| Phase 2: Chokepoint test | CONCERNS | 9/9 | BUG-2, BUG-4 (guard blind spots); BUG-1 (review-epic fix) |
| Phase 3: Prose sweep | CONCERNS | Verified | BUG-3 and residues outside the §7 grep |
| Phase 4: Regenerate | PASS | Verified | `bundle:check` clean; catalog current; CHANGELOG entry |

**Overall Phase Completion**: 3/5 phases clean, 2 with concerns

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Corpus test passes; fails on three mutations | `doc-numbering-corpus.test.mjs` §mutation tests (committed) | PASS |
| Chokepoint test passes; fails on each MUST_HIT | `doc-id-chokepoint.test.js` §3 (committed) | PASS |
| Task-id `awk` stays green | §3 control test, `review-pipeline-step-0a-branch-setup.md:97` | PASS |
| Allowlist reasons + stale-entry check | §2 | PASS |
| < 2 s added | `real 0m0.360s`, load 1.02 (measured, working tree of `a6479024`) | PASS |
| ≥ 400 code files scanned | §0 floor; 470 | PASS |
| No grammar restated | both import `doc-id.js` | PASS |
| `bundle:check` clean, `validate` per touched skill | `npm run ci` exit 0; 31 skills quick-validated | PASS |
| `format:check` | `npm run ci` | PASS |
| §7 population: zero unexplained hits | holds for the §7 command; BUG-3 shows spellings it does not match | CONCERNS |
| AGENTS.md has no global Epic Registry section | `## PRD Registry` replaces it | PASS |
| CHANGELOG names scheme, script, guards | `[Unreleased]` entry | PASS |

---

## Breaking Changes Validation

None for consumers. Internal: an id regex or flat document under `docs/prd/` now fails `npm test`;
the migration path is stated in §5 and in the CHANGELOG. **PASS.**

---

## New Findings This Cycle

First review — every finding below is new.

---

## Issues Found

### MEDIUM Severity Issues (4)

**TASK-207-BUG-1: review-epic 0a.3 auto-skip reads variables bound in another block**
- **Bug Report**: [task.207.bug.1.review-epic-auto-skip-unbound.md](./task.207.bug.1.review-epic-auto-skip-unbound.md)
- `shared/resources/review-pipeline-step-0a-branch-setup.md:173` — `PRD_NUM`, `EPIC_NUM`, `CURRENT_BRANCH` unbound in this block; the pattern collapses to `feature/epic..*`. The §4 test joins the blocks and injects `CURRENT_BRANCH`, so it cannot see it. In scope: this task's fix to the auto-skip does not hold as written.

**TASK-207-BUG-2: phantom block comment in the chokepoint stripper**
- **Bug Report**: [task.207.bug.2.chokepoint-phantom-block-comment.md](./task.207.bug.2.chokepoint-phantom-block-comment.md)
- `tests/doc-id-chokepoint.test.js:91` — `/*` found before `//` is handled; four files lose lines from the scan today.

**TASK-207-BUG-3: review-epic numbering glob still flat**
- **Bug Report**: [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)
- `skills/review-epic/SKILL.md:571` — `epic.{epic-number}.review.*.md`; reviewer confidence medium, verified by QA reading the glob against the `epic.P.E.review.N` file shape.

**TASK-207-BUG-4: title shape misses a literal space**
- **Bug Report**: [task.207.bug.4.chokepoint-title-shape-literal-space.md](./task.207.bug.4.chokepoint-title-shape-literal-space.md)
- `tests/doc-id-chokepoint.test.js:66` — `.agents/scripts/backfill-story-issues.sh:52`, `:56` escape it; reviewer confidence medium, verified by QA.

### LOW Severity Issues (3)

- **CR-5** `.agents/scripts/backfill-story-issues.sh:56` — the story-title strip removes only `Story E.S`; a `Story 1.2.3:` title keeps `.3:`, and the bracket form is never stripped.
- **CR-6** `docs/concepts/quickstart-story.md:184` — option B still says to mark registry rows `CANCELLED`.
- **QA-1** `relatedDocInfo` (`skills/sync-jira-story/scripts/sync-jira-story.js:200`) accepts names `doc-id.parse` accepts: a `../` prefix, a newline, NUL, `$(id)`. Provenance: the old regex already accepted `$(id)` and NUL and refused the other two; `doc-id.js` is unchanged in this PR, and `readdirSync` never yields `/` or NUL. Routed to `recommendations.future` (harden `doc-id.parse`).

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 3

---

## NFR Assessment

### Performance — PASS
`uptime; time command node --test tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs` → load 1.02, `real 0m0.360s`.

### Reliability — CONCERNS
TASK-207-BUG-1: the review-epic auto-skip fix does not hold when its blocks run as written.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 26 (run record `task.207.qa.1.security.run.json`, `totals.executed`; two runs — the generic `filename` corpus, 14, and this predicate's own cases, 12, `task.207.qa.1.security.cases.json`)
- `relatedDocInfo` is a boundary (a classifier whose `false` prevents linking). Probed with `security-probe.mjs --cases-file` (its own grammar: the generic `filename` corpus's legitimate names are gate `.yml` files it must reject, so that run read `rejects-every-input`). 3 legitimate accepted; 5 hostile rejected; 4 hostile accepted (QA-1, LOW, inherited). The review-epic block's refusal is `doc-id.parse`'s, executed by the chokepoint test's §4 (`epic.42.payments` → HALT).

### Maintainability — CONCERNS
BUG-2 and BUG-4 leave the guard blind to two shapes; BUG-3 is a sweep residue the §7 grep could not see.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true` from the pipeline).

**Correctness bugs (5):**
- [medium/high] `shared/resources/review-pipeline-step-0a-branch-setup.md:173` — 0a.3 reads unbound PRD_NUM/EPIC_NUM/CURRENT_BRANCH → re-derive in the block. **Promoted: TASK-207-BUG-1.**
- [medium/high] `tests/doc-id-chokepoint.test.js:91` — phantom block comment → handle `//` first. **Promoted: TASK-207-BUG-2.**
- [medium/medium] `skills/review-epic/SKILL.md:571` — flat numbering glob → `epic.{P}.{E}`. Promoted by QA verification: TASK-207-BUG-3.
- [medium/medium] `tests/doc-id-chokepoint.test.js:66` ⚠️ unverified anchor (unchecked-text) — title shape misses a literal space. Promoted by QA verification: TASK-207-BUG-4.
- [low/medium] `.agents/scripts/backfill-story-issues.sh:56` ⚠️ unverified anchor (unchecked-text) — story-title strip.

**Cleanups (1):**
- `docs/concepts/quickstart-story.md:184` ⚠️ unverified anchor (unchecked-text) — stale registry sentence.

**Boundary:** `boundary: true` — `relatedDocInfo` (probed, `probes_executed: 26`) and the review-epic 0a.2 block (decision delegated to `doc-id.parse`; executed by §4). Other predicate-shaped additions: `stripCodeComment`, `matchCodeLine`, `matchShellLine` in the chokepoint test — test machinery, not a boundary on user input.

**Mutation proofs** (run during develop, each against a committed test, recorded in the task's Implementation Summary):
- mutation-proven: id regex appended to `skills/qa-next/scripts/uat-status.mjs` → §1 → covered
- mutation-proven: `awk -F.` on `$STORY_BASENAME` in a `SKILL.md` fence → §1 → covered
- mutation-proven: old review-epic `awk` restored → §1, §3, §4 → covered
- mutation-proven: id regex in a title-only allowlisted file → §1 → covered
- mutation-proven: old `relatedDocInfo` regex → `sync-jira-story.test.js` sub-story case → covered
- mutation-proven: corpus root narrowed to one epic → floor test → covered

---

## Regression Testing

Full `npm run ci` (format, test, eval:all, validate:all, check:generated, bundle:check, lint:shell)
with `.agents/skills` moved aside: exit 0. The first run caught nine tests pinning removed literals;
they were updated before this review. **PASS.**

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs
npm run ci   # .agents/skills moved aside
command node .agents/skills/qa-task/references/security-probe.mjs --cases-file rdi-cases.json --name relatedDocInfo --entry 'skills/sync-jira-story/scripts/sync-jira-story.js#relatedDocInfo' --repo-root "$(git rev-parse --show-toplevel)" --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed SKILL.md / shared md> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-207-BUG-1..4 (MEDIUM).

### Short-term Actions (Non-Blocking)
1. CR-5, CR-6 (LOW).
2. Harden `doc-id.parse`'s slug grammar (QA-1).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Four open MEDIUM findings; no HIGH.
**Quality Score**: 60/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-207-BUG-1..4 fixed

---

**QA Report**: co-located at `task.207.qa.1.doc-numbering-enforcement-and-sweep.md`
**Gate File**: co-located at `task.207.gate.1.doc-numbering-enforcement-and-sweep.yml`
**Next Steps**: `/qa-fix` (Step 5b)
