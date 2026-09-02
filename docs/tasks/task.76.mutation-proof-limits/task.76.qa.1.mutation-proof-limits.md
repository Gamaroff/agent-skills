# QA Report: Task 76 — State what a mutation proof does not tell you

**Task**: [task.76.mutation-proof-limits.md](./task.76.mutation-proof-limits.md)
**Gate File**: [task.76.gate.1.mutation-proof-limits.yml](./task.76.gate.1.mutation-proof-limits.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Testing Completed**: 2026-09-02
**Gate Status**: CONCERNS

---

## Executive Summary

All ten success criteria were verified against the file itself rather than against the task's claim of
having met them, and every one holds. More unusually: all five empirical claims the document now makes
about task 67 were re-checked against the task 67 artefacts still in the repository, and all five are
accurate — including the careful "nine recorded, four independently re-run" phrasing, which is exactly
what `task.67.qa.1` says and not a rounding of it.

One MEDIUM finding, and it is a real one rather than a make-weight: the frontmatter `description` still
describes a one-question document. The change made it a three-question document and left the field that
governs discovery untouched.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, all checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented — task declares **None**, verified correct
- [x] Code on feature branch with open PR (#304, OPEN, head `0fc1d03`)

### Testing Approach

- [x] Automated testing (`npm run ci:fast` — format:check + full hermetic suite)
- [x] Regression testing (bundle freshness; source-vs-copy equality)
- [x] Code review — see below, and note why it is short
- [x] Documented-command execution (Step 4b)
- [ ] Manual testing — not applicable
- [ ] Performance testing — not applicable

### Review Methodology

**Direct tools.** The Adaptive Review Strategy's "small task" row applies despite `PIPELINE_MODE=standard`:
four phases, but a single authored file, three mechanically generated copies of it, and `risk_level: low`.
Parallel agents would have re-read one 194-line markdown file several times over.

First review — no prior gate, so no re-review scoping applies.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: What a held proof does not tell you | PASS | Verified | `## What a held proof does not tell you` at L37. States the limit, carries the number with provenance, names adversarial input generation as the different instrument, closes on the one-line form at L52. |
| Phase 2: Three causes, not one | PASS | Verified | `## When the proof does not go red` at L54. Three-row table at L58–62; "Investigate before strengthening" at L67; both worked examples at L72 and L78. |
| Phase 3: Boundaries need both directions | PASS | Verified | Fifth row in *When to do it* at L93, plus the explanatory paragraph at L98–105 citing the two measured regressions. |
| Phase 4: Bundle | PASS | Verified | All three copies byte-identical to source apart from the AUTO-GENERATED banner. A pre-commit hook independently re-ran `npm run bundle` and reported every skill in sync. |

**Overall Phase Completion**: 4/4 passed.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Held proof = evidence about a test, not the input space | stated | L52 — "A held proof is evidence about a test. It is not evidence about coverage." | PASS |
| Carries the task-67 number with provenance | stated | L42 — "Nine proofs were recorded and four re-run independently in QA; all four held — while thirteen fail-open routes sat in the shipped classifier." | PASS |
| Unheld proof has three named causes with distinct responses | 3 causes | L60–62 — vacuous test / redundant source / wrong premise, each with a different response | PASS |
| "Investigate before strengthening the test" stated explicitly | stated | L67 | PASS |
| *When to do it* has a boundary row requiring both directions | 1 row | L93 | PASS |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Procedure, five shapes, *Recording it*, *Do not claim it* unchanged | 0 changes | `git diff` removes **exactly 3 lines**, all from the old single conclusion. Every one of those four headings is intact at L11, L107, L170, L187. | PASS |
| No SKILL.md modified | 0 files | `git diff --name-only \| grep SKILL.md` → empty | PASS |
| Bundle freshness clean | clean | `npm run bundle` in sync; pre-commit hook confirmed independently | PASS |
| Prettier clean | clean | `npm run format:check` re-run against the committed state — "All matched files use Prettier code style!" | PASS |
| Links resolve in the **tracked** tree | all | The diff adds **no** markdown links to this file, so there is nothing to resolve. Verified rather than assumed: `git diff \| grep '^+' \| grep -oE '\]\([^)]+\)'` → empty. | PASS |

### Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Both task-67 unheld cases as worked examples in the five shapes' voice | 2 | L72 *Redundant source* and L78 *Wrong premise*, each followed by an indented takeaway — the same shape the five shapes use | PASS |
| Additions ≤ ~55 lines (≈195 total) | ≤55 / ≈195 | **54 added, 194 total** | PASS |

**10/10 criteria met.**

---

## Accuracy Verification (independent re-check)

Every empirical claim the document now makes was traced to its source. This matters more than usual:
the document's closing section forbids claiming a proof you did not run, so a factual error inside it
would be self-refuting.

| Claim (line) | Source | Verdict |
| --- | --- | --- |
| "Nine proofs were recorded and four re-run independently in QA; all four held" (L42) | `task.67.qa.1…md:232` — "The development record claims nine mutation proofs. QA independently re-ran four of the load-bearing ones"; the 4-row table at L236–241 shows ✅ for all four | ✅ exact |
| "thirteen fail-open routes sat in the shipped classifier" (L43) | `task.67.qa.1…md:245` — "thirteen holes survived to QA with a green suite — a mutation proof can only falsify a check that is there" | ✅ exact |
| "Disabling the `COMMAND_RUNNERS` check broke nothing … the set was dead code" (L72) | `task.67.bug.1…md:162`; `task.67.implementation.1…md:180` — "Two mutation proofs came back UNHELD and both were real" | ✅ |
| "`spawnSync` *throws* on `NaN` and on negative values … the real hole was `--timeout 0`" (L78–80) | `task.67.bug.2…md:174,177` | ✅ |
| "an arithmetic placeholder `0` was read as a command name, and splitting on `&` left the file descriptor in `2>&1` sitting in command position" (L102–104) | `task.67.bug.3…md:68` | ✅ |

Worth stating plainly: the "nine recorded, four re-run" wording is the sharpest thing in this change
set. The obvious shorthand — "nine proofs held" — would have been an overclaim written into the one
document that exists to forbid overclaiming. `/review-task` caught it and the implementation held the
line.

---

## Issues Found

### HIGH Severity (0)

None.

### MEDIUM Severity (1)

**Issue: Frontmatter `description` still describes a one-question document**

- **Severity**: MEDIUM
- **Category**: Quality / discoverability
- **Bug Report**: [task.76.bug.1.stale-frontmatter-description.md](./task.76.bug.1.stale-frontmatter-description.md)
- **Location**: `shared/resources/mutation-proving.md:3`
- **Observation**: The file grew 39% and now answers three questions. The description was not touched
  and still describes only the first — "How to establish that a test would actually fail… Reading a
  test does not tell you whether it can fail."
- **Impact**: `coding-standards.md` calls this field "the most-read line of any skill — write it for the
  matching agent." An agent arriving with *"my proof didn't go red, what now?"* — the exact moment the
  new content serves — gets no match. There is a second-order cost too: a description that still frames
  the document as *"is this test real?"* reinforces the framing §2 Motivation names as the problem.
- **Recommendation**: One-line frontmatter edit, then `npm run bundle`. Suggested wording in the bug report.
- **Priority**: P2

### LOW Severity (2)

1. **The file's own bash block cannot be executed by Step 4b.** The single fenced `bash` block (L22 —
   the mutation-landed `diff` check) classifies `mutating` because `cp` is not on the safe-command
   allow-list, so the engine executed zero blocks and raised `zero-blocks-executed`. This is
   **pre-existing and not introduced by this change**, and the fail-closed boundary is behaving exactly
   as designed. Recorded because of the irony worth noticing: the mutation-proving procedure's own
   worked example is the one snippet the runnable-prose step cannot verify. Follow-up candidate, not a
   defect in this PR.
2. **`skills/develop/SKILL.md` says "the four shapes this takes"** while pointing at a five-shape
   document. The count went stale when the fifth shape landed, *before* task 76, and §4 Out of Scope
   forbids any SKILL.md change here. Correctly left alone; the implementation report already flags it.
   Needs a one-line follow-up task.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

Not meaningfully applicable to a documentation change. The proxy that *is* applicable — reading cost,
which §10 Risk 1 names as the real hazard — was budgeted and respected: 54 added against a ~55 cap.
The budget's restatement as a **delta** rather than an absolute is the better engineering choice and
came out of the Step 2 review; an absolute cap had already silently expired once.

### Reliability — PASS

Rollback verified accurate against the actual file: nothing parses these sections programmatically, so
`git revert` + `npm run bundle` is complete and immediate. The three generated copies were confirmed
byte-identical to source, so the revert propagates the same way the change did.

### Security — PASS

No executable surface added. Step 4b's fail-closed classifier correctly refused to run the one bash
block rather than guessing — the desired behaviour on an unrecognised command.

### Maintainability — CONCERNS

Driven entirely by TASK-76-001. Everything else here is above the bar: the diagnosis table **replaces**
prose rather than accreting beside it, the removed conclusion's content survives in the new section
rather than being dropped, and the new sections are placed *before* the five shapes because the table's
first row points down at them — ordering that is load-bearing rather than incidental.

---

## Code Review

The diff touches **no executable code** — seven markdown files and nothing else — so the adversarial
diff-review pass has no reviewable surface and is recorded as not applicable rather than run against
prose it cannot assess. `code_review_blocking=true` was passed by the pipeline and had nothing to act
on; no finding was promoted to `top_issues[]` by that route. TASK-76-001 reaches the gate through the
ordinary MEDIUM-severity path instead.

**Correctness bugs (0):** none — no code in the change set.
**Cleanups (0):** none.

### Step 4b — Execute the documented commands

The rule fires: `shared/resources/mutation-proving.md` is an in-scope `shared/resources/*.md` document,
it was modified, and it contains a fenced `bash` block. Engine run over the changed file:

```
blocks: 1 · runnable: 0 · placeholder: 0 · mutating: 1
L22 — mutating — unrecognised-command: cp (fail-closed) — SKIPPED
shells: bash, zsh (zsh available)
finding: zero-blocks-executed (medium confidence)
```

**Every skipped block is named above, with its line and reason** — the silent-skip failure mode this
step exists to prevent. The `zero-blocks-executed` finding is recorded and **not** suppressed, but it
is graded LOW rather than promoted: the cause is a deliberate fail-closed refusal of a *pre-existing,
untouched* block, not an over-broad classification concealing a real skip. The diff adds and modifies
no bash lines at all (`git diff … | grep -E '^[+-].*\x60\x60\x60bash'` → empty).

### Step 3c — Mutation-proof spot check

**Not applicable, and that is the honest answer rather than an evasion.** There is no behaviour to
revert: the change set is markdown, no test asserts anything about it, and no code path changes. The
task said so in §8 before implementation and the implementation did not manufacture a proof to look
thorough — which is the behaviour this very document mandates. Recorded as `mutation-proven: n/a`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundle freshness (all skills) | PASS — `npm run bundle` in sync; pre-commit hook confirmed independently across every skill |
| Source ↔ generated copy equality | PASS — all three byte-identical apart from the banner |
| Repository formatting | PASS — `npm run format:check` clean against the committed state |
| Full hermetic suite | PASS — `npm run ci:fast` exit 0, zero failures |
| Consumers of the changed file (`develop`, `qa-task`, `qa-story`) | PASS — all reach it by reference; no SKILL.md modified, so no consumer behaviour changed |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/mutation-proving.md` (the authored change)
- `skills/{develop,qa-task,qa-story}/references/mutation-proving.md` (generated copies)
- `docs/tasks/task.76.mutation-proof-limits/task.76.mutation-proof-limits.md`
- `docs/tasks/task.67.execute-the-skill-qa-gate/{qa.1, bug.1, bug.2, bug.3, implementation.1}` (claim verification)
- `docs/architecture/concepts/coding-standards.md` (the `description` standard)

### Test Commands Executed

```bash
npm run ci:fast                     # exit 0, zero failures
npm run format:check                # clean, re-run against the committed state
git diff origin/develop...HEAD --stat
git diff origin/develop...HEAD -- shared/resources/mutation-proving.md | grep -c '^-[^-]'   # → 3
node skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/mutation-proving.md --json
```

### Coverage Report

Not applicable — documentation change, no code paths.

---

## Recommendations

### Immediate Actions (Blocking the gate, not the merge)

1. **TASK-76-001** — update the frontmatter `description` to cover all three questions; `npm run bundle`.

### Short-term Actions (Non-Blocking)

1. File a task to consider allowing `cp` inside Step 4b's temp working copy, so a documented block that
   copies a file before mutating it can actually be executed.
2. File a one-line follow-up for `skills/develop/SKILL.md`'s "four shapes" → "five shapes".

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Ten of ten success criteria met and independently verified; all five task-67 claims
accurate against source. One MEDIUM discoverability finding on the field the project designates as the
highest-leverage line in the file. Deterministic rule 2 (a MEDIUM in `top_issues`) and rule 4
(Maintainability CONCERNS) both land on CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-76-001 addressed, or consciously accepted — it is a discoverability gap, not a
correctness one. Nothing here blocks the merge on correctness grounds.

---

**QA Report**: `task.76.qa.1.mutation-proof-limits.md`
**Gate File**: `task.76.gate.1.mutation-proof-limits.yml`
**Next Steps**: one `qa-fix` cycle for TASK-76-001, then re-review.
