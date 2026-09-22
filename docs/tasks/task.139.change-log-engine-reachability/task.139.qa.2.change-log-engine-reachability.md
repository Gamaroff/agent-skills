# QA Report: Task 139 - The Change Log engine is unreachable from a skill whose prose runs it

**Task**: [task.139.change-log-engine-reachability.md](./task.139.change-log-engine-reachability.md)
**Gate File**: [task.139.gate.2.change-log-engine-reachability.yml](./task.139.gate.2.change-log-engine-reachability.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: PASS

---

## Executive Summary

Re-review after qa-fix cycle 1 (`9f928818`). All four cycle-1 findings are FIXED and the CR-2 fix is mutation-proven. The cycle-2 pass was a full-diff **refute pass** by an independent reviewer; it returned four low-severity, medium-confidence observations (a layout-encoding assertion, an overstated "only declaration", a conflated provenance figure, a literal-filename nit) — none meets the promotion bar, and all are recorded as future recommendations. 4/4 new tests green; `ci:fast` 3891/3891; `bundle:check` 0 problems.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

Re-review scope: unscoped — cycle 2 is always a full refute pass over the whole branch diff (prior gate: CONCERNS 80, 2 issues; `SAFETY_REPROBE=false`, security axis `OK reasoned`).

| Prior issue | Status | Verification |
| --- | --- | --- |
| CR-1 contract paragraph "and no other does" | **FIXED** | `grep -c 'and no other does'` → 0 in source and bundled copy; paragraph now says the alternation names the skills whose *prose* runs the one-liner, others may carry it transitively |
| CR-2 `RUNS_ENGINE` literal space | **FIXED** | `/through\s+`change-log\.js`/` at line 59; new test "the phrase matcher sees the instruction across a line wrap" (fixture self-check + develop matches both sites); **mutation-proven** — literal-space regex reds it |
| CR-3 `ALTERNATION_RE` braces-only | **FIXED** | accepts `(\{[A-Za-z0-9\|-]+\}\|[A-Za-z0-9-]+)`, braces stripped; literal `develop` form parsed, parity then names `finalise` missing (correct) |
| CR-4 "five" → eight | **FIXED** | 8 "eight" mentions; no stale "five" in § 1/§ 3/§ 4/Phase 4/SC |

---

## New Findings This Cycle

Refute pass over the full `origin/develop...HEAD` diff (1,984 lines; 42 identical bundle re-renders excluded); reviewer verified against `bundle_skill.py`, `create-skill` § UNREACHED, `develop/SKILL.md:589/753`, `finalise/SKILL.md:1057`, and a live population scan.

- **[low/medium]** `tests/change-log-engine-reachability.test.js:134` — the `hits.length >= 2` assertion encodes a layout fact (two sites in develop) rather than wrap tolerance; passes if both sites are unwrapped, reds for the wrong reason if develop consolidates → drop the count or assert membership via `population()`. (C2-CR-1)
- **[low/medium]** `shared/resources/document-change-log.md:213` — "the alternation is the only declaration" overstates: `sync-jira-epic/story/task` cite `references/change-log.js` in their own SKILL.md, a second non-transitive discovery path (`REFS_REF_RE`) → "the declaration for skills whose prose runs the one-liner". (C2-CR-2)
- **[low/medium]** `CHANGELOG.md:39`, test header line 21 — "over-matched 38 files, measured 2026-09-17" follows create-skill's conflated phrasing; the bundler records 24 skills for the placeholder-as-wildcard case (task 122), 38 for the bare `references/X` form, and 2026-09-17 is the UNREACHED measurement date → state 24 or drop number + date. (C2-CR-3)
- **[cleanup]** `shared/resources/document-change-log.md:211` — literal `references/change-log.js` in a shared source; harmless (bundler does not follow bare `references/X` out of shared text; `bundle:check` clean) → bare filename. (C2-CR-4)

None promoted: all `confidence: medium`. Recorded in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The red test | PASS | Verified | 4 tests (wrap self-check, floor, identity, parity); CR-2 fix mutation-proven |
| Phase 2: Spell the alternation and bundle | PASS | Verified | `{develop|finalise}`; paragraph reworded; exactly one new engine copy; 42 re-renders; `bundle:check` 0 |
| Phase 3: Prove the documented call runs from the bundle | PASS | Verified | unchanged since cycle 1 |
| Phase 4: Docs, CHANGELOG, observation | PASS | Verified | counts corrected (CR-4); C2-CR-3 wording nit advisory |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

Unchanged from cycle 1 except SC5/SC6 re-measured: 4/4 tests; `ci:fast` 3891/3891; `bundle:check` 0; Prettier clean. All 7 criteria PASS.

---

## Breaking Changes Validation

None declared; none found. PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (4)
C2-CR-1..C2-CR-4 above — advisory.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Wrap-tolerant matcher over-match probe across every `skills/*/SKILL.md`: develop 2, finalise 1, no others.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 (`boundary: false`)
### Maintainability — PASS

---

## Code Review

Step 3b — blocking (`code_review_blocking=true`), **refute pass** (cycle 2). 3 bugs (all low/medium) + 1 cleanup, none promoted. Provenance: all in files added or rewritten on this branch.

**Mutation proofs (Step 3c)**:
- mutation-proven: `RUNS_ENGINE` → literal-space form → "the phrase matcher sees the instruction across a line wrap" red → `covered`
- mutation-proven: drop `develop` from the alternation → parity test red → `covered` (re-run of cycle 1)

**Step 4b**: fired (contract carries a bash block) → `no-executable-blocks` (1 block, `mutating`: the file-writing one-liner). Information.

**Working tree after QA**: unchanged from entry (implementation report only).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3891/3891 |
| `npm run bundle:check` | PASS — 129 skills, 0 problems |
| Over-match probe (wrap-tolerant regex, all SKILL.md) | PASS — develop 2, finalise 1 |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/document-change-log.md --json
perl -0ne 'my @m = /through\s+`change-log\.js`/g; print scalar(@m)' skills/*/SKILL.md
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. C2-CR-3 — correct the 38-file/2026-09-17 provenance in CHANGELOG and the test header (24 skills, task 122).
2. C2-CR-2 — soften "only declaration".
3. C2-CR-1 — drop the site-count assertion or assert membership only.
4. C2-CR-4 — bare filename in the shared source.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All cycle-1 findings fixed and verified; no finding meets the promotion bar; all NFRs PASS.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.139.qa.2.change-log-engine-reachability.md`
**Gate File**: co-located at `task.139.gate.2.change-log-engine-reachability.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`.
