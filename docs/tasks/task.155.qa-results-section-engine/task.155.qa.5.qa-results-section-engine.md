# QA Report: Task 155 - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.5.qa-results-section-engine.yml](./task.155.gate.5.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Executive Summary

Cycle 5 re-reviews commit `07e0d854`, the PR review 2 fix for CR-1 (an unclosed fence in a QA section let a replace delete everything to EOF). Both of the reviewer's repros are now refused and write nothing. The fix covers only a fence that runs to the end of the document, though. When a **later fenced block closes** the stray fence, the Change Log block and every section in between are still deleted, and the write reports `replaced` (REL-012, high). The post-write read-back counts sections and never compares the text around them, so it cannot catch this.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Source | Status | Evidence |
|---|---|---|---|
| CR-1 (high): an unclosed fence in the section deletes to EOF on replace | PR review 2 | **PARTIAL** | Repro (a), the nested-fence slip, is `bad-section`. Repro (b), the marker-less document with an unclosed fence, is `unbounded`. Nothing is written in either. The closed-later variant still deletes (REL-012). |
| REL-011 (low): `created` inside an unclosed EOF fence stacks copies | gate 4 | FIXED | Returns `unplaceable` (I3). In the corpus, the 2 former REL-011 documents now return `unplaceable` ×3. |
| PC-1…PC-5: Deferred Work and CHANGELOG honesty | PR review 2 | FIXED | REL-008 now says it can delete Change Log rows, REL-010 and REL-011 name the stacking, and the intro cites gates 3 and 4. |
| REL-007, REL-008, REL-009, REL-010, PC-1, CRLF seams | gates 3–4 | DEFERRED (unchanged) | This commit did not change their behaviour. REL-008 deletes rows only under a section that is already misplaced, and the corpus has 0 of those. |

## New Findings This Cycle

- **[high]** `shared/resources/qa-results.js:163` (`unclosedFence`) — REL-012. A stray fence closed by a later fenced block deletes the Change Log and the sections between, reported as `replaced`. Fix: widen the unbounded test and make the read-back compare the text outside the section.
- **[medium]** `shared/resources/qa-results.js:275` (`canonicalOffset`) — REL-013. A `## Change Log` heading directly above the marker block leaves the section between that heading and the block, and leaves an empty orphan Change Log heading behind. Layout only.
- **[low]** `shared/resources/qa-results.js:72` (`RE_H1_H2`) — REL-014. A setext or 1–3-space-indented H1/H2 after the section is not a boundary, so a replace deletes it. 0 corpus sections have one.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#537, OPEN)

### Review Methodology

Re-review, direct tools, plus one read-only Explore code-review subagent over the scoped diff. Pipeline override `code_review_blocking=true`, so high-confidence bugs gate the build.

```
Re-review scope: files changed since gate 4 (head 182367eee7dc; 12 files) — default
```

`SAFETY_REPROBE=false`: gate 4's security axis is `PASS` / `reasoned`, and clauses 2–3 do not hold. Priority 2 of the brief asked for a hunt for any path that deletes content, so that hunt went beyond the diff: 15 targeted probes plus a corpus dry run and a stray-fence injection over the corpus.

Step 4b: runnable prose in `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`. qa-task has 1 runnable, 3 placeholder and 16 mutating blocks. qa-story has 1 runnable, 4 placeholder and 14 mutating. Both ran under bash and zsh with 0 findings. The changed Step 12 blocks also run in `tests/qa-results-step12-wiring.test.js`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: the engine | CONCERNS | Verified | REL-012 deletes content. REL-013 and REL-014 are placement and boundary gaps. |
| Phase 2: wire the QA skills | PASS | Verified | Both Step 12 blocks halt on any reason other than replaced, relocated or created. The wiring tests cover `unbounded`. |
| Phase 3: corpus guard and repair | PASS | Verified | The corpus guard is green. |
| Phase 4: docs and validation | PASS | Verified | CHANGELOG and Deferred Work are accurate for REL-007…011. |

**Overall Phase Completion**: 3/4 clean

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| upsert reasons, writes nothing on refusal | yes | yes, now including `unbounded` and `unplaceable` | PASS |
| Fenced / inline-code heading never found | yes | yes | PASS |
| Step 12 writes through the engine, one section | yes | yes | PASS |
| Corpus guard | passes and fails correctly | passes | PASS |
| The engine refuses rather than corrupting (Overview) | refuses | **deletes on REL-012** | FAIL |
| Tests under 2 s, no network | yes | about 1 s | PASS |
| ci:fast / bundle:check / validate | clean | clean | PASS |

---

## Breaking Changes Validation

None. Step 12 now halts on two more refusal reasons, `unbounded` and `unplaceable`. That tightens the contract and is documented in both skills.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: REL-012 — a stray fence closed by a later block still deletes the Change Log**
- **Severity**: HIGH
- **Category**: Functional / data loss
- **Observation**: `unclosedFence` checks only for a fence that opens inside the section and runs to EOF. If any later fenced block exists, its closing ``` line closes the stray fence instead. Everything in between is then protected: the change-log markers, `## Change Log`, and the later headings. `rawEnd` lands on the first heading after that block, and the replace deletes it all. `checked()` sees one bounded section and passes. Reproduced (scratch probes, nothing written to the repo):
  - marker document: `change-log-start`/`end`, the dated row and `## Dev Notes` lost; reported `replaced`
  - marker-less document: the `## Change Log` table lost; `replaced`
  - section inside the log block: the markers and the original row lost; `replaced`
  - corpus: a stray fence injected under each of the 155 tracked sections gives 153 `unbounded` and 2 `replaced`. Both `replaced` documents lose content: task.90 loses 8,092 bytes, and task.96 loses 16,657 bytes including its Change Log.
- **Plausibility**: the trigger is a hand-written stray fence in the section. 0 of 155 tracked sections have one, and the engine now refuses to write one. That is the same trigger class as CR-1(b), which PR review 2 rated HIGH. The commit's claim that "an unclosed fence can never widen a write" is false for this shape.
- **Recommendation**: flag as `unbounded` any fence that opens inside the section and covers a line the span would otherwise end at. Make `checked()` compare the change-log marker lines and dated rows outside the old and new spans, refusing on any difference. Add a two-block regression test.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: REL-013 — the section is placed between a Change Log heading and its marker block** (code-review CR-1, medium/high)
- 6 tracked tasks (58, 127, 134, 137, 138, 168) put `## Change Log` above `<!-- change-log-start -->`. `canonicalOffset` returns the marker offset. After the following `upsertChangeLog` writes its own heading inside the block, the document has two Change Log headings, and the first one is empty. On task.168 over 3 cycles the row count went from 1 to 4 with none lost. Nothing is deleted.

### LOW Severity Issues (1)

**REL-014 — setext and indented headings are not boundaries.** A `Setext\n------` line or a `  ## Indented` heading after the section is deleted with its body on replace. 0 of 155 tracked section spans have either shape.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
The 46 engine and wiring tests take about 1 s. The corpus dry run takes seconds.

### Reliability — CONCERNS
The refusals and the post-write read-back are real improvements, and each is mutation-proven. REL-012 still deletes content silently, and the read-back is built to count sections, not to preserve the text around them.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- A pure string transform with no network access and no shell. `boundary: internal` (unchanged from gates 3–4): the inputs are a pipeline-written work item and a pipeline-rendered section, and no corpus sink models this section.

### Maintainability — PASS
The generated copies are identical to the source apart from the header, and `bundle:check` passes. Cleanup: `normaliseSection` repeats the break regex instead of using `RE_BREAK`.

---

## Code Review

Advisory, except where `code_review_blocking=true` promotes a finding.

**Correctness bugs (1 from the reviewer, plus 2 found by QA probes):**
- [medium/high] `shared/resources/qa-results.js:275` — Section placed between `## Change Log` and a marker block below it → promoted to the gate as **REL-013**.
- QA probe [high] `shared/resources/qa-results.js:163` — A stray fence closed by a later block still deletes content → **REL-012**.
- QA probe [low] `shared/resources/qa-results.js:72` — Setext and indented headings are not boundaries → **REL-014**.

**Cleanups (1):**
- `shared/resources/qa-results.js:302` — `normaliseSection` repeats the break regex instead of using `RE_BREAK` (same as gate 4's CR-3).

Provenance: `qa-results.js` does not exist on `origin/develop`, so every finding is new to this branch.

mutation-proven: `unclosedFence` check removed from normaliseSection → I1 → covered
mutation-proven: `unbounded` refusal removed → I2 + qa-task/qa-story Step 12 wiring "halts on an unbounded section" → covered
mutation-proven: `checked()` forced to pass → I3 → covered

All three new guards were mutation-proven with a `cp` snapshot, then restored. The baseline was green before and after (46/46), and `git status` was unchanged.

---

## Regression Testing

| Area | Result |
|---|---|
| Full `ci:fast` @ `07e0d854` | 4762 tests: 4761 pass, 0 fail, 1 skipped |
| Corpus dry run (1,842 docs × 3 writes, temp copy) | 0 structural losses, write 3 ≡ write 2, 0 multiple; 2 `unplaceable` (former REL-011) |
| CRLF documents | no loss; a CRLF stray fence is refused `unbounded` |
| HTML comments, inline code, indented marker, bare marker quoted in section | no loss |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-results.js`, both generated copies, `shared/resources/change-log.js` (fence and inline-code primitives), `shared/resources/tests/qa-results.test.mjs`, `tests/qa-results-step12-wiring.test.js`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, and the PR review 2 report.

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run validate -- skills/qa-task/
npm run validate -- skills/qa-story/
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-step12-wiring.test.js
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json
# plus scratch probe scripts (reviewer repros, 15 deletion probes, corpus dry run, stray-fence injection)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. REL-012: refuse a stray fence that a later block closes, and make the read-back compare the markers and dated rows outside the section. Add a red-first regression test (P1).

### Short-term Actions (Non-Blocking)
1. REL-013: place the section above a Change Log heading that sits directly over the marker block.
2. REL-014: bound the span on setext and indented headings.
3. Carried: REL-007…010, PC-1, CRLF seams, `RE_BREAK` reuse.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high-confidence finding deletes content (REL-012), and `code_review_blocking` applies to it. It is the unfixed half of CR-1.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: REL-012 fixed and mutation-proven.

---

**QA Report**: co-located at `task.155.qa.5.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.5.qa-results-section-engine.yml`
**Next Steps**: `/qa-fix` for REL-012. This was the last budgeted QA cycle, so the pipeline decides whether to escalate.
