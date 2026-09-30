# QA Report: Task 155 - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.6.qa-results-section-engine.yml](./task.155.gate.6.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6 re-reviews commit `3056978c`, which replaced the symptom checks with one fence-blind structural guard (`removesStructure`). REL-012, REL-013 and REL-014 are closed on every shape gate 5 reproduced. A stray fence injected into all 155 tracked sections in 7 ways, plus a closing fenced block at 16,804 later positions, deleted nothing. A 4-write corpus run with a Change Log row after each write lost no line outside the section.

One residual deletion path remains. The guard's Change Log heading pattern is narrower than `change-log.js`'s own `RE_HEADING`, so a dotted-numbered `### 1.5 Change Log` is not treated as structural (REL-015, medium). No document QA writes to has that shape, and the first QA cycle's Change Log write wraps the log in markers, which the guard does catch. Two low findings cover a false refusal on fenced `# comment` lines and stale `unbounded` prose.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Source | Status | Evidence |
|---|---|---|---|
| REL-012 (high): a stray fence closed by a later fenced block widens a replace over the Change Log | gate 5 | **FIXED** | The gate 5 fault injection was re-run: a stray fence after each of the 155 section headings gives 155 `unbounded` and 0 deletions (gate 5: 153 / 2, with task.90 and task.96 losing content). Six more variants (fence at the section end, `~~~`, 4-backtick, indented `   ```js`, HTML comment, inline tick) gave 0 deletions. A stray fence plus a closing `` ```bash `` block at each of 16,804 later positions gave 4,988 `replaced` (balanced within the section) and 11,816 `unbounded`, with 0 deletions. The gate 5 repros (marker doc, marker-less `##` log, marker-less `###` log, section inside the log, legacy jira pair) are all `unbounded` with nothing lost. |
| REL-013 (medium): a `## Change Log` above the marker block is stranded by `created` | gate 5 | **FIXED** (for `## Change Log`, `### Change Log`, `## 12. Change Log`) | New sections land above the heading. Run through the real Step 12 sequence (section, then `upsertChangeLog`) for 3 cycles, the document keeps exactly 1 Change Log heading, and the 6 tracked tasks with this shape do not grow a heading over 4 cycles. The numbered forms `### 1.5` and `## 12)` are still placed below the heading (REL-015). |
| REL-014 (low): an indented ATX H1/H2 after the section is swallowed | gate 5 | **FIXED** (by refusal) | `  ## Indented` and `   # Indented1` are refused `unbounded` and nothing is written. Setext H1/H2 is deliberately left out; see the task's Deferred Work. A tab-indented `## ` and an HTML `<h2>` are also not boundaries, but CommonMark does not read either as a heading. |
| REL-007…REL-010, PC-1, CRLF seams | gates 3–4, PR review 1 | DEFERRED (unchanged) | This commit did not change their behaviour. |

## New Findings This Cycle

- **[medium] REL-015** `shared/resources/qa-results.js:87` — `RE_LOG_HEADING` allows only `\d+\.?` numbering. `change-log.js` `RE_HEADING` also accepts `\d+(?:\.\d+)*[.)]?` (`### 1.5 Change Log`, `### 2) Change Log`). Two effects:
  1. **Deletion (code-review CR-1).** A section holds a hand-written stray fence, a later `` ```bash `` block closes it, and the marker-less log is headed `### 1.5 Change Log` with no H2 between. `replaced` then deletes the heading and its history rows. Reproduced; the plain `### Change Log` and `### 12. Change Log` are `unbounded`.
  2. **Placement (code-review CR-2).** With `### 1.5 Change Log` or `## 12) Change Log` directly above the markers, `created` still lands between the heading and the marker, which is the REL-013 stranding.

  **How plausible:** 0 tracked task, story or epic documents have a dotted- or paren-numbered log heading. Only `docs/prd/onboarding/prd.onboarding.md:69` and its example copy do, and QA never writes a PRD. The first Step 12 cycle's `upsertChangeLog` wraps a marker-less log in markers, which the guard does catch (measured: cycle 2 with a hand-injected stray fence is `unbounded`, row kept).

  The code reviewer rated CR-1 high/high. QA rates the merged finding **medium**: it breaks the commit's claim that the guard covers "a Change Log heading at any level", but it needs four conditions at once, and none occurs in the corpus.

  → Build the heading check from `change-log.js`'s exported `RE_HEADING` grammar (every level, dotted and paren numbering) and use that one predicate in both `removesStructure` and `canonicalOffset`. Add J-tests with `### 1.5 Change Log` for the deletion and placement cases.
- **[low] REL-016** `shared/resources/qa-results.js:99` — **False refusal (code-review CR-3).** The guard ignores fences on purpose, so a fenced `# run the suite` (bash) or `# gate excerpt` (yaml) line in a new section is `bad-section`, and an existing section with one makes every later write `unbounded`. Step 12 halts and nothing is deleted. 0 of 155 tracked sections contain a fence, and neither Step 12 template renders one. `npm test  # inline` and `#!/bin/bash` are accepted. The Deferred Work and the CHANGELOG describe the trade as "a fenced `## Example`", which understates it: any fenced comment line counts. → Name fenced `#` comment lines in the Deferred Work trade and the Step 12 template ("no fenced blocks in the section"), or exempt a fence that the section itself opens and closes, for `#` lines only.
- **[low] REL-017** `skills/qa-task/SKILL.md:1365` (and `skills/qa-story/SKILL.md:1887`) — **Stale prose (code-review CR-4).** The Step 12 prose still says `unbounded` means "an unclosed fence". Since this commit it also means that the text a write would remove carries a marker, an H1/H2 or a log heading. The halt message carries no detail, so an operator gets the wrong repair. → Update both descriptions, and return the offending line (or a sub-reason) with `unbounded` and `bad-section` so the halt message can name it.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing (ci:fast; 2 load-timing failures pass alone)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR #537

### Testing Approach

- [x] Automated Testing (unit, wiring, full `ci:fast`)
- [x] Regression Testing (full-corpus dry runs)
- [x] Fault injection (stray fences, 7 variants plus 16,804 closing-block positions)
- [x] Code Review (Explore subagent, scoped)
- [x] Mutation proofs (6)
- [ ] Performance Testing (not required; pure string transform)

### Review Methodology

Direct tools plus one read-only Explore code-review subagent. Re-review, cycle 6.

```
Re-review scope: files changed since gate 5 (head 07e0d85412e9; 9 files) — default
```

`SAFETY_REPROBE=false`: gate 5's security axis reads `PASS` / `reasoned`, and clauses 2–3 do not apply (a pure string transform with no network access and no shell). Step 4b: not applicable, because no `SKILL.md` or `shared/resources/*.md` changed this cycle. All experiments ran on copies in a scratch directory, and the mutation proofs ran on an isolated copy of the engine and its test file. `git status --porcelain` was the same at the start and end.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: the engine | CONCERNS | Verified | Guard closes REL-012/013/014. REL-015's heading pattern diverges from change-log.js |
| Phase 2: wire the QA skills | CONCERNS | Verified | Step 12 blocks unchanged. The prose for `unbounded` is stale (REL-017) |
| Phase 3: corpus guard and repair | PASS | Verified | Corpus test green. 0 losses in the 4-write run |
| Phase 4: docs and validation | PASS | Verified | bundle:check 0 problems; validate qa-task and qa-story pass |

**Overall Phase Completion**: 4/4 delivered; 2 carry low/medium residue.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| At most one section per document after any write | 1 | 1 in all 1,984 written documents × 4 writes | PASS |
| Never inside the change-log block | 0 inside | 0 after each Change Log write | PASS |
| `multiple` refuses, never guesses | refuse | A4/A5 green | PASS |
| No content lost outside the section | 0 | 0 in the corpus; 1 synthetic shape (REL-015) | CONCERNS |
| Every section the engine writes can be replaced next cycle | yes | J5 green; in-corpus 100% | PASS |
| Tests pass | 100% | 4,768 / 4,771, plus 2 load-timing failures that pass alone, 1 skipped | PASS |

---

## Breaking Changes Validation

None documented. The section-level trade (a fenced H1/H2 in the section is now `bad-section`) is recorded in the Deferred Work, and REL-016 asks that fenced comment lines be named there too. **Overall:** PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: REL-015: the Change Log heading pattern diverges from change-log.js**
- **Severity**: MEDIUM
- **Category**: Reliability (data loss in a shape absent from the corpus)
- **Observation**: See New Findings. Repro: `### 1.5 Change Log` + stray fence + later `` ```bash `` block + `## Next` → `replaced`, row and heading lost.
- **Recommendation**: Reuse `RE_HEADING`'s numbering grammar at every heading level, in both `removesStructure` and `canonicalOffset`.
- **Priority**: P2

No bug file: the finding lives in the gate and this report, as in cycles 1–5.

### LOW Severity Issues (2)

- REL-016: a fenced `# comment` line in a section is a false refusal (halts, never deletes).
- REL-017: the Step 12 prose in both skills says `unbounded` only means an unclosed fence.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
46 engine and wiring tests run in about 0.2 s. The 1,986-document, 4-write corpus run completes in seconds of CPU.

### Reliability — CONCERNS
Fault injection deletes nothing across the corpus. Every write that would remove structure is now refused rather than committed. One synthetic deletion path remains (REL-015), and the read-back `checked()` still counts only sections.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- A pure string transform with no network access and no shell. `boundary: internal` (unchanged from gate 5): the inputs are a pipeline-written work item and a pipeline-rendered section, and no corpus sink models this section.

### Maintainability — PASS
The guard is a single predicate with a clear comment, and the generated copies are fresh. There is one duplicated definition (REL-015's heading pattern), plus the cleanups below.

---

## Code Review

Scoped: `origin/develop...HEAD` limited to the 9 files changed since gate 5 (2,712 diff lines). One Explore subagent returned in about 4 minutes.

**Correctness bugs (5):**
- [high/high] `shared/resources/qa-results.js:87` — CR-1: `RE_LOG_HEADING` misses `### 1.5 Change Log`, so a stray fence plus a later block deletes the log. → **Promoted to REL-015** and re-rated medium, with the measurements above.
- [medium/high] `shared/resources/qa-results.js:316` — CR-2: REL-013 placement uses `RE_LOG_HEADING`, while `upsertChangeLog` uses `RE_HEADING`, so numbered headings are still stranded. → **Merged into REL-015** (same root cause).
- [medium/medium] `shared/resources/qa-results.js:99` — CR-3: fenced `# comment` lines and `#### Change log …` are refused. → Recorded as REL-016 (low). Confidence is not high, so it is advisory for gating. Reproduced independently.
- [low/medium] `shared/resources/qa-results.js:394` — CR-4: `unbounded` now covers two states, and the SKILL.md prose names one. → Recorded as REL-017 (low). Verified at qa-task:1365 and qa-story:1887.
- [low/medium] `shared/resources/qa-results.js:313` — CR-5: a document already in the REL-013 shape (heading, section, markers) is replaced in place and never healed. Advisory. 0 tracked documents are in that shape, and only the unshipped pre-fix engine on this branch could have produced it.

**Cleanups (2):**
- `shared/resources/qa-results.js:354` — CR-6: after `removesStructure(body)`, the `sections.length !== 1` and `firstUnprotected(RE_H1_H2)` checks in `normaliseSection` can no longer fire. Delete them or mark them as assertions.
- `shared/resources/qa-results.js:98` — CR-7: the marker pattern hard-codes marker names instead of building from the imported `CL_START` / `CL_END` / `LEGACY_MARKER_PAIRS`.

**Mutation proofs** (isolated copy of the engine and its test file; baseline 45/45 before and after; the live file was confirmed byte-identical):
- mutation-proven: guard removed from the replace/relocate check → J1, J3, J5, J6, J7 red → covered
- mutation-proven: guard removed from `normaliseSection` → F1, J5 red → covered
- mutation-proven: indented H1/H2 dropped from `RE_STRUCTURAL` → J3 red → covered
- mutation-proven: marker pattern disabled → J6 red → covered
- mutation-proven: `RE_LOG_HEADING` dropped from `RE_STRUCTURAL` → J7 red → covered
- mutation-proven: REL-013 heading-above-marker placement removed → J4 red → covered

---

## Regression Testing

| Area | Result |
|---|---|
| Full corpus, 4 writes per document with an `upsertChangeLog` row after each (1,986 tracked `docs/**/*.md`) | 1,829 created→replaced×3; 155 replaced×4; 2 `unplaceable` (the former REL-011 plan and bug documents, neither QA-written). 0 lines lost outside the section, 0 rows dropped (`rowsDropped`), always 1 section, never inside the log. PASS |
| Re-render each of the 155 existing sections as the new section | 155 accepted, 0 `bad-section`. PASS |
| Change Log heading count across 4 cycles | Grew only in 4 plan/bug documents that had no real log. `upsertChangeLog` created one, which is not this engine. PASS |
| `ci:fast` | format check passed. 4,771 tests: 4,768 pass, 1 skipped, 2 load-timing (`bundle-missing-source` 10.9 s, `test-clean-checkout` 11.5 s over a 10 s budget), both pass alone (7/7, 13/13). PASS |
| bundle:check / validate | 129 skills, 0 problems; qa-task and qa-story pass. PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`
- `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js` (generated)
- `shared/resources/change-log.js` (`RE_HEADING`, `upsertChangeLog`, `findChangeLog`)
- `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` Step 12; `CHANGELOG.md`; the task's Deferred Work

### Test Commands Executed
```bash
npm run ci:fast
command node --test tests/bundle-missing-source.test.js
command node --test tests/test-clean-checkout.test.js
npm run bundle:check
npm run validate -- skills/qa-task/
npm run validate -- skills/qa-story/
command node --test --test-reporter=tap <scratch>/m/tests/qa-results.test.mjs   # mutation proofs, isolated copy
command node <scratch>/inject.cjs    # 7 stray-fence variants x 155 sections
command node <scratch>/inject2.cjs   # stray fence + closing block at 16,804 positions
command node <scratch>/corpus3.cjs   # 1,986 docs x 4 writes + Change Log row each
```

### Coverage Report
No coverage instrumentation in this repository. Mutation proofs above: 6 of 6 cycle-5 guards covered.

---

## Recommendations

### Immediate Actions (Blocking)
None. CONCERNS does not block.

### Short-term Actions (Non-Blocking)
1. REL-015: one heading predicate shared with `change-log.js`, plus J-tests for `### 1.5 Change Log`.
2. REL-017: update the `unbounded` / `bad-section` prose in both skills and name the offending line in the halt.
3. REL-016: document fenced comment lines as part of the trade, or exempt balanced fences for `#` lines only.
4. Cleanups CR-6 and CR-7; CR-5 as a follow-up if a misplaced document is ever found.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The fence-blind guard closes every deletion gate 5 found, and fault injection and a 4-write corpus run lose nothing. One medium residue (REL-015) remains. It is a second definition of "Change Log heading" that is narrower than the engine that writes the log, and it deletes content in a synthetic shape no QA-written document carries.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: REL-015 fixed (or explicitly deferred with its measurements) before finalise.

---

**QA Report**: co-located at `task.155.qa.6.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.6.qa-results-section-engine.yml`
**Next Steps**: `/qa-fix` for REL-015 and REL-017, or record them as deferred and proceed to review-pr (5c).
