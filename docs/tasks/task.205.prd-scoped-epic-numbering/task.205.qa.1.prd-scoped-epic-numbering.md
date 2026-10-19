# QA Report: Task 205 - PRD-scoped epic numbering

**Task**: [task.205.prd-scoped-epic-numbering.md](./task.205.prd-scoped-epic-numbering.md)
**Gate File**: [task.205.gate.1.prd-scoped-epic-numbering.yml](./task.205.gate.1.prd-scoped-epic-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 1)
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: FAIL

---

## Executive Summary

All seven phases are implemented and the suite is green on the PR head (5663 pass, 0 fail). The diff
review found one high-confidence HIGH bug: the GitHub epic update path renames whatever milestone the
epic issue sits on, a shared one included. A MEDIUM and a LOW also gate. All three are new to this
change and small to fix.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists; status `ready-for-review`
- [x] All 30 implementation-phase checkboxes ticked
- [x] Tests passing (`npm run ci:fast`)
- [x] Breaking changes documented (six, with consumer steps in CHANGELOG)
- [x] Code on `feature/task.205.prd-scoped-epic-numbering`, PR #674 open

### Testing Approach

- [x] Automated Testing (unit, integration, executed skill blocks)
- [x] Regression Testing (full `ci:fast`)
- [x] Security Review (probe engine, fence form)
- [x] Code Review (Step 3b diff reviewer)

### Review Methodology

Hybrid: direct tools for phases, criteria and tests; one read-only Explore subagent for the Step 3b
diff review (whole branch diff, generated `references/` copies and the catalog excluded — 4542 lines,
about 45 files). Reviewer duration 145 s (completion notice `duration_ms` 145167). First review, so no
re-review scope applies. Traceability mapper skipped: the task's Success Criteria are checklists, not a
table.

Step 4b: run over every changed `SKILL.md` and `shared/resources/*.md`. The blocks this task adds call
`node`/`jq` and are refused as `mutating` by the engine, so `tests/epic-numbering-retirement.test.js`
is what executes them (five blocks, bash). Three Step 4b findings appear, and each is identical on
`origin/develop` (pre-existing, not this change): `sync-github-task` line 52 fails in the harness on a
missing `docs/tasks` seed (`--copy-as docs:docs` would seed it), and `review-task`, `sync-github-epic`
and `sync-jira-epic` report `zero-blocks-executed` (placeholder blocks, unbound).

---

## New Findings This Cycle

First review — every finding below is new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Preconditions | PASS | Verified | task.202/203 accepted; `doc-id check --corpus` → ok |
| Phase 1: doc-id helpers + generator | PASS | Verified | 3 doc-id tests; 6 new generator tests incl. ESM vendored pair |
| Phase 2: Jira epic paths | CONCERNS | Verified | CR-6: story-title strip regressed for dash and sub-story forms |
| Phase 3: Authoring skills + template | PASS | Verified | create-epic block executed by the guard test (no PRD, one, two, drift) |
| Phase 4: Review and edit skills | PASS | Verified | review-epic resolver executed by the guard test and probed (10 cases) |
| Phase 5: GitHub paths + task milestone | FAIL | Partial | CR-1 (HIGH), CR-4 (MEDIUM) |
| Phase 6: Retirement + close-out | PASS | Verified | skill removed, guard green, CHANGELOG lists six breaking changes |

**Overall Phase Completion**: 5/7 passed, 2 with findings

---

## Success Criteria Verification

**Functional**

| Criterion | Status | Evidence |
| --- | --- | --- |
| create-epic names `epic.{P}.{E}` via `next epic --prd-dir`, halts with no PRD | PASS | `tests/epic-numbering-retirement.test.js` create-epic block test |
| create-epics-from-shards dir-per-epic, consecutive E | PASS | `skills/create-epics-from-shards/SKILL.md` Step 4 block; generator tests index them |
| review-epic Critical on `doc-id check` ≠ ok, prd_source required | PASS | documentation criterion; guard test asserts the text |
| `review-epic 3` refused, `1.3` resolves one file | PASS | guard test + probe (10/10) |
| generator indexes a domain PRD, prints `P.E` | PASS | `generate-prd-epic-index.test.mjs` |
| Both Jira scripts produce `[Epic P.E]` from one helper | PASS | `doc-id.test.mjs`, `epic-summary.test.js`, sync-jira-epic test identity check |
| GitHub epic milestone renamed in place, no second | CONCERNS | `tracker-issue.test.mjs` §11 holds the rename; CR-1 shows the skill renames the wrong milestone when the issue is on another |
| `epic-registry-manager` gone, no shipped reader | PASS | guard test |

**Performance**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `generate-prd-epic-index.mjs --check` | < 1 s | 0.039 s (load 2.67, `uptime; time …`) | PASS |
| No new network call | none | rename replaces create; §11 asserts one write | PASS |

**Code Quality**

| Criterion | Status | Evidence |
| --- | --- | --- |
| `npm test` passes; `bundle:check` clean | PASS | `ci:fast` 5663/0; `bundle:check` exit 0 |
| Guards mutation-proven | PASS | ten proofs in the implementation report |
| `quick_validate.py`, `lint:shell` | PASS | 14 skills valid; ShellCheck clean |
| Local green with `.agents/skills` moved aside | PASS | every `ci:fast` run this cycle |

Standards-named validation (`coding-standards.md` § Validation before commit): `npm run validate --
skills/<skill>/` on the 9 changed epic skills — all ok.

---

## Breaking Changes Validation

All six are documented in `CHANGELOG.md` with consumer steps (migration script, `/create-prd`, delete
`.agents/skills/epic-registry-manager/`, `setup-consumer.sh --update`, regenerate the index).
**Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: sync-github-epic renames whatever milestone the epic issue is on**
- **Severity**: HIGH
- **Bug Report**: [task.205.bug.1.milestone-rename-hijacks-shared-milestone.md](./task.205.bug.1.milestone-rename-hijacks-shared-milestone.md)
- **Observation**: `skills/sync-github-epic/SKILL.md:182` passes the current milestone as `--rename-from` whenever its title differs from `MILESTONE_TITLE`.
- **Impact**: a shared or sprint milestone is retitled for every issue on it.
- **Recommendation**: rename only the epic's own old milestone (`Epic <E> — …` or `Epic <P.E> — …`).

### MEDIUM Severity Issues (1)

**Issue: task milestone lookup ignores a configured PRD root**
- **Severity**: MEDIUM
- **Bug Report**: [task.205.bug.2.task-milestone-lookup-ignores-prd-root.md](./task.205.bug.2.task-milestone-lookup-ignores-prd-root.md)
- **Observation**: `skills/ensure-task-github-issue/SKILL.md:65` defaults `PRD_ROOT` and never sources `resolve-paths.sh`.
- **Recommendation**: source `references/resolve-paths.sh` in the block.

### LOW Severity Issues (1)

- **CR-6** `shared/resources/doc-id.js` `stripIdPrefix("story", …)` does not strip `Story 1.2.1 — Tap` or `[Story 1.2.3A] Tap`; base's label regex did (reproduced: both return the title unchanged).

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
`--check` 0.039 s against a 1 s bound; the walk gains one directory level.

### Reliability — CONCERNS
CR-1 changes a remote object the pipeline cannot restore; CR-4 degrades silently.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 10
- `boundary: true` — the `review-epic` Input Resolution block accepts or refuses an epic id. Probed:
  `security-probe.mjs --entry 'fence:skills/review-epic/SKILL.md#Input Resolution' --slot '$INPUT'
  --cases-file <10 cases>` → verdict `engages` (10 executed, 10 passed, bash), record
  [task.205.qa.1.security.run.json](./task.205.qa.1.security.run.json). The corpus `filename` sink
  does not model epic-id grammar, so the cases are task-specific (bare numbers, three-segment ids,
  half ids, a near-id, an unknown id; legitimate `1.3` beside `1.30` and a review artifact, and a name).
- Other predicate-shaped functions in the diff: `tracker-issue.js` `--rename-from` usage refusal
  (`boundary: false` — it refuses every value on a non-milestone kind, a usage check, not an
  input filter); the generator's epic skip (`boundary: internal` — its input is this pipeline's own
  epic files; held by `generate-prd-epic-index.test.mjs`); `doc-id.epicSummary` / `stripIdPrefix`
  (transformers, not accept/reject).

### Maintainability — PASS
One title-prefix rule; registry and skill removed; guard test executes the skill blocks.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true`: `bug` + `confidence: high`).

**Correctness bugs (7):**
- [high/high] `skills/sync-github-epic/SKILL.md:182` — any differing current milestone becomes the rename source, so a shared milestone is renamed → rename only the epic's own old milestone. **Promoted: TASK-205-QA1-CR1.**
- [high/medium] `skills/sync-github-epic/SKILL.md:94` — the id block reads `$TITLE` with no writer in the block → bind it from frontmatter and guard with `${TITLE:?}`.
- [medium/medium] `skills/ensure-epic-github-issue/SKILL.md:44` — same as above for `$TITLE` and `$EPIC_FILE_PATH`.
- [medium/high] `skills/ensure-task-github-issue/SKILL.md:65` — `PRD_ROOT` defaulted, never resolved → source `resolve-paths.sh`. **Promoted: TASK-205-QA1-CR4.**
- [medium/medium] `skills/sync-github-epic/SKILL.md:180` — rename block reads `ISSUE_NUM` / `MILESTONE_TITLE` bound in other blocks → re-bind or guard.
- [low/high] `skills/sync-jira-epic/scripts/sync-jira-epic.js:357` — story-title strip regressed for dash and sub-story forms → widen `stripIdPrefix`. **Promoted: TASK-205-QA1-CR6** (fix target `shared/resources/doc-id.js`).
- [low/medium] `skills/create-epic/SKILL.md:413` — id-check block reads `PRD_DIR`/`P`/`E` from another block; fails closed with a misleading message → placeholders or `${NAME:?}`.

**Cleanups (0).**

All seven anchors checked (`finding-anchors.js --rev HEAD`): `ok`.

Provenance: each finding is in lines this branch adds; none exists on `origin/develop`. CR-6 was
reproduced against base: `sync-jira-epic.js` at `origin/develop:339` stripped `Story 1.2.1 — Tap`.

Mutation proofs: none this cycle (no QA-cycle fixes yet; the develop step's ten proofs are in the
implementation report).

---

## Regression Testing

Full `npm run ci:fast` on the PR head `91c077e7`: 5677 tests, 5663 pass, 0 fail, 14 skipped. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast                       # with .agents/skills moved aside — 5663 pass, 0 fail
npm run -s validate -- skills/<skill>/ # 9 changed epic skills — ok
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed doc> --json
command node .agents/skills/qa-task/references/security-probe.mjs --cases-file <cases> \
  --entry 'fence:skills/review-epic/SKILL.md#Input Resolution' --slot '$INPUT' \
  --name review-epic-input-resolution --record <qa.1.security.run.json> --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — restrict `--rename-from` to the epic's own old milestone.
2. CR-4 — source `resolve-paths.sh` in the task milestone block.
3. CR-6 — widen `stripIdPrefix` for story titles.

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3, CR-5, CR-7 — bind or guard the block inputs (cheap; worth folding into the fix cycle).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence HIGH correctness bug in the GitHub epic update path.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.205.qa.1.prd-scoped-epic-numbering.md`
**Gate File**: co-located at `task.205.gate.1.prd-scoped-epic-numbering.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review.
