# QA Report: Task 139 - The Change Log engine is unreachable from a skill whose prose runs it

**Task**: [task.139.change-log-engine-reachability.md](./task.139.change-log-engine-reachability.md)
**Gate File**: [task.139.gate.1.change-log-engine-reachability.yml](./task.139.gate.1.change-log-engine-reachability.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: CONCERNS

---

## Executive Summary

The deliverable is exactly what the task specified — one token in the contract, one bundler-generated engine copy, one prose-derived parity test — and every phase verifies: the new suite is 3/3 green with two mutation proofs `covered`, `bundle:check` is clean with no `UNREACHED`, `ci:fast` is 3890/3890, and the Phase 3 one-liner runs from the `develop` bundle. The diff code review (blocking under the pipeline override) found two high-confidence defects in what shipped: the contract's new paragraph asserts that skills outside the alternation do not carry the engine (false for 24 of them, and now re-rendered into 42 copies), and the population regex requires a single space so the line-wrapped spelling `develop/SKILL.md` already carries at 589–590 is invisible — the exact silent-gap shape the test exists to close.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1 and CR-2, re-review

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (13/13 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (None — API stable)
- [x] Code on feature branch with open PR (#465)

### Testing Approach

- [x] Automated Testing (unit: `tests/change-log-engine-reachability.test.js`; full `npm run ci:fast`)
- [x] Regression Testing (`ci:fast` 3890/3890; `bundle:check` 129 skills)
- [x] Security Review (reasoned; no boundary delivered)
- [x] Code Review (Step 3b, Explore subagent, whole-branch diff excluding the 42 identical bundle re-renders)
- [x] Mutation proofs (Step 3c)
- [x] Documented-command execution (Step 4b)
- [ ] Manual Testing — not applicable
- [ ] Performance Testing — not applicable (one generated file)

### Review Methodology

Direct tools + one Step 3b Explore code review (small task: 4 phases, low risk). First review — no prior gate; whole-branch diff. Pre-built traceability matrix consumed from `.summaries/qa-traceability-matrix.md` (7 SCs: 4 full, 1 integration, 1 partial, 1 none). `code_review_blocking=true` (pipeline override; task frontmatter sets no `code_review_blocking:`), so `category: bug` + `confidence: high` findings enter `top_issues[]`.

Step 4b: **fired** — the diff modifies `shared/resources/document-change-log.md`, which carries one fenced bash block (line 189). Engine result: `no-executable-blocks` — 1 block, refused as `mutating` (`unrecognised-command: node`, fail-closed), 0 placeholder, bash + zsh available. Information, not a finding: the block is the one-liner that writes a file, and no configuration makes it runnable here. Recorded and continued.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The red test | CONCERNS | Verified | `tests/change-log-engine-reachability.test.js` — 3 tests, floor/identity/parity; pre-fix red for `develop` per implementation report. **CR-2**: `RUNS_ENGINE` misses the line-wrapped instance at `develop/SKILL.md:589–590`. |
| Phase 2: Spell the alternation and bundle | CONCERNS | Verified | `document-change-log.md:192` reads `{develop|finalise}`; exactly one new file `skills/develop/references/change-log.js` (byte-identical after header strip); `bundle:check` 0 problems. **CR-1**: the explanatory paragraph's "and no other does" is false. |
| Phase 3: Prove the documented call runs from the bundle | PASS | Verified | Re-run by QA: one-liner with the `develop` path against a scratch doc → exit 0, row appended, `updated` bumped. |
| Phase 4: Docs, CHANGELOG, observation | PASS | Verified | CHANGELOG `[Unreleased]` › Fixed present; obs #152 `actioned` (log lives outside the tree — orchestrator's record); § Notes names eight writers (CR-4: two stale "five" mentions elsewhere in the doc). |

**Overall Phase Completion**: 4/4 phases complete; 2 with findings.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC1 `skills/develop/references/change-log.js` exists and equals shared source header-stripped | yes | yes (test 2 green; `diff` after stripping line 1 = empty) | PASS | |
| SC2 `require` line names `develop` and `finalise`; no skill outside gained a copy | yes | `{develop|finalise}`; `git diff --name-status` shows one `A` for change-log.js | PASS | over-match half verified by diff, not by the test (by design) |
| SC3 one-liner verbatim with `develop` path appends a row | exit 0 + row | exit 0 + row (QA re-ran) | PASS | |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC4 `npm run bundle` wall-clock unchanged within noise | unchanged | not measured by dev; one 37 KB file | PASS | no timing figure recorded; not a regression risk |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC5 test red pre-fix naming `develop`, green after; three mutants red their own assertion | yes | dev: M1/M2/M3/M3b; QA re-ran M1, M2 → `covered` | PASS | |
| SC6 `ci:fast`, `bundle:check` (0, no UNREACHED), Prettier green | green | 3890/3890; 0 problems; Prettier clean | PASS | |

**Migration**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| SC7 CHANGELOG; obs #152 actioned; § Notes names the hand-appending writers | yes | CHANGELOG ✓; obs #152 actioned (outside tree); § Notes eight writers | PASS | CR-4: Phase 4 checkbox and this criterion's own wording say "five" |

---

## Breaking Changes Validation

None declared (§ 5: "API stable"). Verified: `shared/resources/change-log.js` untouched in the diff; the engine copy is byte-identical; the contract's only semantic change is the skill segment of a `require` path an agent substitutes at run time.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: CR-1 — contract paragraph makes a false population claim**
- **Severity**: MEDIUM
- **Category**: Quality (documentation accuracy in a shared contract, re-rendered into 42 skills)
- **Bug Report**: recorded in the gate `top_issues[]` (code-review finding; no separate bug file — the fix is one sentence)
- **Observation**: `shared/resources/document-change-log.md:~210` — "every skill named there ships `references/change-log.js`, and no other does". 24 skills outside `{develop|finalise}` carry the engine transitively (`JS_SIBLING_RE`): `create-epic/story/task`, `qa-fix/story/task`, `review-story/task/bug/pr`, `sync-jira-*`, `sync-github-bug`, `ensure-bug-github-issue`, `develop-batch/bug/next/story/task`, `create-pr`, `scaffold-tracker-workflow`, `tracker-reconcile`.
- **Impact**: a reader in e.g. `create-story` is told their own copy does not exist.
- **Recommendation**: reword — the alternation is the set of skills whose *prose* runs the engine; other skills may carry it transitively through a bundled `.js` that requires it.
- **Priority**: P2

**Issue: CR-2 — population regex misses the line-wrapped phrase**
- **Severity**: MEDIUM
- **Category**: Functional (silent gap in the parity guard)
- **Bug Report**: recorded in the gate `top_issues[]`
- **Observation**: `RUNS_ENGINE = /through `change-log\.js`/` requires a literal space. `skills/develop/SKILL.md:589–590` reads `**Append through\n    `change-log.js`, never by text search**` — invisible to the matcher. `develop` is in the population only because a second site (line 753, task workflow) sits on one line.
- **Impact**: a future writer whose only instance is wrapped (the normal shape of this repo's prose) is silently absent from the population and, if also absent from the alternation, reproduces the original MODULE_NOT_FOUND with all three tests green.
- **Recommendation**: `/through\s+`change-log\.js`/`, plus an assertion pinning that the wrapped `develop/SKILL.md` instance matches.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-3** `tests/change-log-engine-reachability.test.js` — `ALTERNATION_RE` requires braces; the bundler also follows the literal single-skill form, so a valid single-writer contract would fail with a misleading message. Accept the bundler's group or narrow the message.
- **CR-4** `task.139.change-log-engine-reachability.md` — Phase 4 checkbox (line 156), § 4 Out of Scope (line 104) and Success Criteria § Migration (line 231) still say "five" hand-appending writers; § Notes, the Implementation Record and CHANGELOG say eight.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
One generated 37 KB file; 42 ten-line re-renders. No runtime path changes.

### Reliability — PASS
Floor ≥ 2 refuses a vacuous population; over-match excluded by `git status` evidence; rollback is a single revert of one line + re-bundle.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (`boundary: false` — no validator/parser/predicate delivered; the test is an assertion over the tree, not a boundary)
- No new dependency, auth, network, or secret handling.

### Maintainability — PASS
Population derived, not listed; one declaration in the contract; test messages name the fix. CR-1/CR-4 are the wording nits.

---

## Code Review

Step 3b — **blocking** (`code_review_blocking=true`, pipeline override). Explore subagent over the whole-branch diff (1,558 lines; 42 identical bundle re-renders excluded). Reviewed 7 files; read `bundle_skill.py` (`INVOKE_REF_RE`, `discover_needed`, `autogen_header`) to verify claims.

**Correctness bugs (2):**
- [medium/high] `shared/resources/document-change-log.md:210` — "and no other does" is false for 24 transitive carriers → reword to "whose prose runs it; others may carry it transitively". **Promoted to gate: CR-1.**
- [medium/high] `tests/change-log-engine-reachability.test.js` (`RUNS_ENGINE`) — literal-space phrase misses `develop/SKILL.md:589–590` wrapped instance → `\s+` + regression assertion. **Promoted to gate: CR-2.**

**Cleanups (2):**
- `tests/change-log-engine-reachability.test.js` (`ALTERNATION_RE`) — braces required though the bundler accepts the literal single-skill form → accept the same group or narrow the message (CR-3).
- `task.139.change-log-engine-reachability.md:104,156,231` — "five" vs eight hand-appending writers (CR-4).

**Provenance (5b)**: all four findings are in files added or rewritten on this branch — none pre-existing.

**Boundary rule**: `boundary: false`; `probes_executed: 0`.

**Mutation proofs (Step 3c)** — snapshot with `cp`, restored from snapshot, baseline green between:
- mutation-proven: drop `develop` from the alternation → "the contract's alternation and the running population are the same set" red → `covered`
- mutation-proven: append a comment line to `skills/develop/references/change-log.js` → "every skill whose prose runs the engine ships it, byte-identical" red → `covered`
- (dev also ran the phrase-reword mutants M3/M3b → floor red; not re-run by QA — `dev-only` for those two)

**Working tree after QA**: unchanged from entry (implementation report modified only) — no fix left in the tree (5c).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) | PASS — 3890/3890, Prettier clean |
| Bundle freshness (`npm run bundle:check`) | PASS — 129 skills, 0 problems, no UNREACHED |
| Bundler discovery tests (`bundle-transitive`, `bundle-check-mode`) | PASS (in suite) |
| Tracked-tree link check (`bundled-links`) | PASS (new copy is tracked) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/document-change-log.md`, `skills/develop/references/change-log.js`, `shared/resources/change-log.js`, `tests/change-log-engine-reachability.test.js`, `skills/create-skill/scripts/bundle_skill.py`, `skills/develop/SKILL.md`, `skills/finalise/SKILL.md`, `CHANGELOG.md`, task/review/implementation documents.

### Test Commands Executed
```bash
npm run ci:fast                                              # 3890/3890
command node --test tests/change-log-engine-reachability.test.js   # 3/3
npm run bundle:check                                         # 0 problems
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/document-change-log.md --json
# Phase 3 re-run: contract one-liner with ./.agents/skills/develop/references/change-log.js → exit 0
```

### Coverage Report
Not applicable — repository has no coverage instrumentation; the suite is `node --test`.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — reword the contract paragraph (one sentence; re-bundle regenerates the 42 copies).
2. CR-2 — whitespace-tolerant `RUNS_ENGINE` + an assertion that the wrapped `develop/SKILL.md:589` instance is in the population.

### Short-term Actions (Non-Blocking)
1. CR-3 — accept the literal single-skill form or narrow the failure message.
2. CR-4 — update the three "five" mentions to eight.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium, high-confidence code-review defects promoted under the blocking override; no NFR concerns; implementation otherwise complete and verified.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.139.qa.1.change-log-engine-reachability.md`
**Gate File**: co-located at `task.139.gate.1.change-log-engine-reachability.yml`
**Next Steps**: `/qa-fix` on CR-1, CR-2 (CR-3, CR-4 opportunistically), then re-review.
