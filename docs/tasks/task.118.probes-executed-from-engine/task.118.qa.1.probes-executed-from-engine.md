# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.1.probes-executed-from-engine.yml](./task.118.gate.1.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

The deliverable holds: `security-probe.mjs` writes a merged run record, `--emit-block` renders the block from it with `evidence` computed, every named producer site pastes rather than types, and the population test found (and the change converted) a third producer site the task had not named. The adversarial diff review found that the **review-security** command block itself — the site the task is named for — omits the `--repo-root` flag this task added, so from an installed copy every control would record `unverifiable` with zero probes (CR-1, medium, reproduced). Two low-severity contract gaps ride along: `emitBlock` trusts a `totals` field it could recompute (a hand-edited total can still render `measured`), and the `--repo-root` test passes for a reason its message does not state. All three are `bug` + `high` confidence and enter the gate under `code_review_blocking`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after CR-1..CR-3 close

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (11 sections + Change Log + Progress Tracking)
- [x] All implementation phases completed (4/4 checkboxes)
- [x] Tests passing (`npm run ci:fast` — 3382 / 3381 pass / 1 skipped / 0 fail)
- [x] Breaking changes documented (§5 — more `reasoned` where the engine did not run; CHANGELOG under Changed)
- [x] Code on feature branch with open PR (#418, `develop` ← `feature/task.118.probes-executed-from-engine`, head `a7b0c973`)

### Testing Approach

- [x] Automated Testing (unit + population + contract suites, full fast gate)
- [x] Regression Testing (whole suite; finalise-dod-prompt-contract 32/32; qa-gate-preconditions-parity; relationship-assertion-lint)
- [x] Security Review (boundary rule applied — `boundary: false`)
- [x] Code Review (adversarial diff review, Explore subagent, 4m06s)
- [x] Documented-command execution (Step 4b)
- [x] Mutation-proof spot check (2 proofs)
- [ ] Manual Testing — n/a (no UI)
- [ ] Performance Testing — n/a

### Review Methodology

Standard mode (risk `medium`, 3 phases, multiple modules). Direct tools for phases, criteria, tests and NFRs; **one read-only Explore subagent** for the Step 3b diff review (first review → whole branch diff, 7,077 lines of which ~5,900 are bundler byte-copies; the reviewer was told to review sources and skip the AUTO-GENERATED copies). Traceability mapper not dispatched — the task has a numbered Success Criteria list, not a table. Not a re-review; no prior gate.

**Step 4b:** runnable prose fires — the diff modifies 5 in-scope prose files. `security-review-prompt.md`, `finalise-dod-security-prompt.md`, `review-security/SKILL.md`: 1 fence each, all classified `mutating` (`node … --record` writes; the SKILL's lock-cooperation block) → `no-executable-blocks`, information, nothing to bind. `qa-task/SKILL.md` and `qa-story/SKILL.md`: bound runs (`TRACKER`, `GITHUB_ISSUE_QA`, `TASK_FILE`/`STORY_FILE`, `TASK_DIR`/`STORY_DIR`, `LATEST_GATE`; `--copy` the task dir) → 3 runnable each, bash + zsh exit 0, no disagreement; 1 / 2 placeholder (pre-existing template slots), 13 / 10 mutating. **This diff adds no fence to either QA skill** (0 `+/-` fence lines) — its edit is an inline command span. `zsh` available and run.

**Boundary rule:** `boundary: false`, `probes_executed: 0`, `evidence: reasoned`. The change set adds no accept/reject function: `readRecord` is a schema check on a file the engine wrote (it throws on a non-record rather than reading it as empty — the corrupt-record CLI test holds that), `resolveEntry` containment is pre-existing and unchanged, and `--repo-root` only re-anchors a root the caller already controls by where the engine file sits.

**Platform variance:** the new tests write the record under `os.tmpdir()` and pass it to `recordRun` (a writer, not a validator); the nested-copy test lives under the repo. Ran the suite once under the other value anyway — `TMPDIR=/tmp node --test 'skills/review-security/tests/*.test.js'` → 37/37, exit 0.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the artefact — engine writes the run record | PASS | Verified | `--record` merges by `{sink, entry}`, totals recomputed, atomic write; `--emit-block` renders; `evidenceOf` computes. 9 new tests. CR-2: totals trusted from the file on read. |
| Phase 2: the readers — review-security, finalise | CONCERNS | Verified with gap | Prompt §2/§4 and SKILL steps 5–6 paste from `--emit-block`; finalise probe mode runs the engine with `--record`. **CR-1: the review-security command lacks `--repo-root`.** |
| Phase 2b: qa-story / qa-task Step 3b (third site) | PASS | Verified | Converted to run the engine with `--record --repo-root`; contract literals (`**run it**`, corpus) kept; qa-gate-preconditions-parity 9/9. |
| Phase 3: the population check | PASS | Verified | 5 tests: floor (≥10 sites, ≥2 producer files), every site reads or is allowlisted with a reason, no stale entry, five named producers, negative control. Found the qa-story/qa-task site on its first run. |

**Overall Phase Completion**: 4/4 phases complete; 1 with a gap (CR-1).

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `probes_executed` and `evidence:` copied from an engine-written record | yes | `--emit-block` prints both from the record | PASS | CR-1 means an installed review-security cannot populate the record — the block is still correct (0 / reasoned), the run is not |
| 2 | `measured` cannot appear without a record; contract test fails if it does | yes | `evidenceOf` returns `measured` only on `totals.executed > 0`; deletion mutation test red/green | PASS (with CR-2) | a hand-edited `totals.executed` with `controls: []` still renders `measured` — low |
| 3 | finalise's DoD security step reads the same record | yes | probe-mode step 3 runs `security-probe.mjs --record`; step 4 copies `totals.executed` | PASS | 32/32 contract assertions hold |
| 4 | Population test finds ≥ 2 sites; every one reads an artefact or is allowlisted | ≥ 2 | 5 producer files, 44 sites, 7 allowlist entries each still matching | PASS | |
| 5 | Observation #10 closes naming this PR | — | not a QA-verifiable property | N/A | belongs to `/finalise` |

**Code Quality:** prettier clean; `bundle:check` in sync; relationship-assertion lint 31/31; no lint errors.

---

## Breaking Changes Validation

### Breaking Change: a review that previously wrote `measured` by hand now writes `reasoned` unless the engine ran
Documented: Yes (§5, CHANGELOG under Changed)
Migration Path Provided: Yes — run the engine with `--record` and paste `--emit-block`
Migration Tested: Yes — `--emit-block` on a missing record renders `reasoned` / 0 (CLI test)
Consumer Code Updated: N/A — prose consumers; gate readers accept `reasoned` already
Notes: this is the intended tightening.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: The review-security probe command omits `--repo-root`**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.118.bug.1.review-security-command-omits-repo-root.md](./task.118.bug.1.review-security-command-omits-repo-root.md)
- **Observation**: `grep -n repo-root shared/resources/security-review-prompt.md skills/review-security/SKILL.md` → absent. From a copy not two dirs below the repo root, `--entry 'skills/review-security/tests/fixtures/redis-tls/engaged.mjs#buildRedisOptions'` → `unverifiable (entry-not-probeable), executed 0`; with the flag → `engages, 12`.
- **Impact**: an installed `review-security` cannot execute any probe and therefore can never produce `measured` — the primary site of the task is inoperable from a bundle.
- **Recommendation**: add the flag to the §4 command block and SKILL step 5; guard with a test.
- **Priority**: P1

### LOW Severity Issues (4)

- **CR-2** `shared/resources/security-probe.mjs:664` — `emitBlock` / `evidenceOf` trust `record.totals`; `readRecord` validates only `version` and `controls`. A version-1 record without `totals` throws a TypeError (exit 1, not 2); `{controls: [], totals: {executed: 12}}` renders `measured`. → derive from `totalsOf(record.controls)`; reject a record without `totals`. **In `top_issues` (bug + high confidence).**
- **CR-3** `skills/review-security/tests/review-security.test.js:643` — the `--repo-root` test's message says "outside the default root" but `resolveEntry` returns `ok: true` for the contained-but-nonexistent path; the `unverifiable` is `entry-not-probeable`. Same "declined as an escape" wording in `finalise-dod-security-prompt.md:138`, CHANGELOG and the task docs. → assert the reason; reword. **In `top_issues`.**
- **CR-4** `shared/resources/security-probe.mjs:640` — `yamlStr` leaves values starting with `#` / `@` unquoted; `--name '#foo'` renders a YAML comment. → quote on a leading indicator. Advisory (confidence medium).
- QA mutation finding — `emitBlock(null)` hardcodes `reasoned` without calling `evidenceOf`, so forcing `evidenceOf` to `measured` did not red the deletion test. → route the null case through `evidenceOf`. Advisory.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS
One JSON read and one atomic write per probe run; `--emit-block` is a single read. The population test walks ~150 markdown files once (3 ms).

### Reliability — PASS
Temp+rename write; corrupt record exits 2 (never read as empty); missing record renders the honest zero block. CR-2 is the one gap and is low.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned` — boundary rule evaluated, `boundary: false` (see Review Methodology)
- **Probes executed**: 0
- No untrusted input reaches a shell; `--name` / `--call-site` reach only a YAML renderer (CR-4). The sandbox, allow-list and containment are untouched.

### Maintainability — PASS
One route for the count; population test with reasons, floor, stale check and negative control. CR-5 / CR-6 are cleanups.

---

## Code Review

From Step 3b — **blocking** under `code_review_blocking=true` (pipeline run-level override; no per-doc opt-out). Reviewer: read-only Explore subagent, 9 source files, bundled copies skipped, returned in 4m06s.

**Correctness bugs (4):**
- [medium/high] `shared/resources/security-review-prompt.md:129` — the review-security probe command omits `--repo-root`; from an installed copy every control records `unverifiable` / `executed: 0` → add the flag to §4 and SKILL step 5. **→ gate CR-1**
- [low/high] `shared/resources/security-probe.mjs:664` — `emitBlock` trusts `record.totals`; a record without `totals` throws, a forged total renders `measured` → recompute from `controls`, reject missing `totals`. **→ gate CR-2**
- [low/high] `skills/review-security/tests/review-security.test.js:643` — `--repo-root` test passes for `entry-not-probeable`, not the "escape" its message and four prose sites claim → assert the reason, reword. **→ gate CR-3**
- [low/medium] `shared/resources/security-probe.mjs:640` — `yamlStr` leaves `#` / `@`-leading values unquoted → quote on a leading YAML indicator. Advisory.

**Cleanups (2):**
- `shared/resources/security-probe.mjs:756` — the "requires a path" guards are dead for a trailing flag (`undefined` fails `!== undefined`); `--sink x --entry y --emit-block` silently probes → check operand presence at parse time.
- `shared/resources/security-probe.mjs:707` — `--mode` is validated only under `--emit-block`; `--mode sideways` in probe mode exits 0 → validate once after parsing.

**Mutation proofs (QA):**
```
mutation-proven: evidenceOf → always "measured" → `measured` is unrepresentable … evidenceOf never says it on zero → covered
                 (predicted also: MUTATION — delete the record → reasoned; did NOT red — emitBlock(null) hardcodes reasoned; recorded as a future cleanup)
mutation-proven: finalise-dod-security-prompt.md stripped of all 9 record references → every site reads the engine's artefact … + the three named producer sites read the record → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (`npm run ci:fast`) | PASS — 3382 tests, 3381 pass, 1 skipped, 0 fail; prettier clean |
| `finalise-dod-prompt-contract` (32) | PASS — execution, corpus-sourced, reproduced-only, `probes_executed` required, bundle parity |
| `qa-gate-preconditions-parity` (9) | PASS — Step 3b keeps `**run it**`, corpus, boundary pointer |
| `relationship-assertion-lint` (31) | PASS — the floor carries a reasoned suppression |
| `security-probe.test.mjs` (22) | PASS — pre-existing engine behaviour unchanged |
| `review-security.test.js` (37) | PASS — incl. under `TMPDIR=/tmp` |
| Step 4b bound runs | PASS — 6 blocks executed, bash + zsh agree |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-review-prompt.md`, `shared/resources/finalise-dod-security-prompt.md`, `skills/review-security/SKILL.md`, `skills/review-security/tests/review-security.test.js`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `evals/shared/tests/probes-executed-population.test.mjs`, `CHANGELOG.md`, the task, plan, review and implementation reports; bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/` checked for parity only.

### Test Commands Executed
```bash
npm run ci:fast                                                   # 3382 / 3381 / 1 skipped / 0
TMPDIR=/tmp node --test 'skills/review-security/tests/*.test.js'  # 37/37
node --test evals/shared/tests/probes-executed-population.test.mjs evals/shared/tests/qa-gate-preconditions-parity.test.mjs
node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs tests/relationship-assertion-lint.test.js
node references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --bind … --copy … --json   # ×5 files
node skills/review-security/references/security-probe.mjs --sink url-authority --entry '…engaged.mjs#buildRedisOptions' --json   # CR-1 repro
```

### Coverage Report
Not measured (node:test without coverage in this repo); +14 tests over the change.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — add `--repo-root "$(git rev-parse --show-toplevel)"` to the review-security §4 command and SKILL step 5; guard it (P1).
2. CR-2 — recompute totals from `controls` in `evidenceOf` / `emitBlock`; reject a record without `totals`; assert the forged case.
3. CR-3 — assert `reason === "entry-not-probeable"`; reword "declined as an escape" in the prompt, CHANGELOG, task docs.

### Short-term Actions (Non-Blocking)
1. CR-4 quoting; CR-5 operand guards; CR-6 `--mode` validation; route `emitBlock(null)` through `evidenceOf`.
2. Implementation report: the Step 3 decision line says "every prose site passes `--repo-root`" — correct it once CR-1 lands.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH finding; one MEDIUM (the review-security command cannot execute from an installed copy) plus two LOW contract gaps, all high-confidence and blocking under the pipeline's code-review-and-fix loop. The deliverable's core — engine-emitted count, computed evidence, population check — is verified and mutation-proven.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed; CR-2 and CR-3 closed.

---

**QA Report**: co-located at `task.118.qa.1.probes-executed-from-engine.md`
**Gate File**: co-located at `task.118.gate.1.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` on CR-1..CR-3 (cycle 1 of 5), then re-review.
