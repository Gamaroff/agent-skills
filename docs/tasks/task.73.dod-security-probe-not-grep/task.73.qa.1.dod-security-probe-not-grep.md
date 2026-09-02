# QA Report: Task 73 — Make the DoD security check execute candidate inputs, not grep for them

**Task**: [task.73.dod-security-probe-not-grep.md](./task.73.dod-security-probe-not-grep.md)
**Gate File**: [task.73.gate.1.dod-security-probe-not-grep.yml](./task.73.gate.1.dod-security-probe-not-grep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Gate Status**: FAIL

---

## Executive Summary

Probe mode is implemented across all four phases, its contract test is genuinely discriminating (seven
mutations proved), and on its first real run the deliverable found twelve real fail-open routes in
shipped code that three prior gates had passed. That is the feature working exactly as intended.

The gate is FAIL for two reasons, both fixable inside this change set. One of the two deliverable test
files is untracked and absent from the PR. And the `probes[]` contract conflates three states that the
task exists to keep apart — so a boundary that was probed and *held* is rendered as "probe mode did not
fire", and the zero-executed-candidates guard cannot be checked against the artifact it is supposed to
guard.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed (4/4, all checkboxes ticked)
- [x] Tests passing — `npm run ci:fast`: 2161 tests, 0 fail, 1 skipped
- [x] Breaking changes documented (none — the change is additive and gated)
- [x] Code on feature branch with open PR (#297)

### Testing Approach

- [x] Automated testing (node:test — contract + replay suites)
- [x] Regression testing (full hermetic suite)
- [x] Security review
- [x] Code review (Step 3b — full adversarial pass)
- [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools plus one full adversarial code-review subagent (Step 3b). First review — no prior gate, so
the whole branch diff was reviewed, and `REFUTE_PASS=false`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Detection rule | PASS | Verified | Step 1b present with four signals and an explicit negative case; both halves held by contract tests. |
| Phase 2: Probe-mode instructions | PASS | Verified | Five candidate axes, the execute-don't-reason instruction, reproduced-only reporting and the accept-direction all present and asserted. |
| Phase 3: Return shape and rendering | **CONCERNS** | Partial | `probes[]` and the render exist, but the shape cannot distinguish three states it must — TASK73-002/003/004. |
| Phase 4: Contract test | PASS | Verified | 16 tests, mutation-proved on 7 mutations. Three assertions are wrap-brittle and two over-broad (TASK73-006/007/010). |

**Overall Phase Completion**: 3/4 pass, 1 concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| SC1 Boundary triggers probe mode | Yes | Rule present + fired on both replay runs | PASS |
| SC2 Non-boundary does not; skip recorded | Yes | Rule present; **the recorded skip is indistinguishable from a clean probe** | **CONCERNS** |
| SC3 Probe results in summary with counts | Yes | Rendered, but the "candidates executed" count is really the reproduced count | **CONCERNS** |
| SC4 Only reproduced findings reported | Yes | Rule present and asserted | PASS |
| SC5 Replay `a74c59a` reproduces routes | Yes | 14/14 deterministically; agent run 52 candidates / 12 reproduced | PASS |
| SC6 Replay `0c4c05f` re-reports none of the fixed 14 | Yes | 0/14 deterministically | PASS (see note) |
| SC7 Grep checklist unchanged in shape | Yes | 6 top-level YAML keys asserted | PASS |
| SC8 No mutation / network / out-of-temp write | Yes | Three clauses present and asserted | PASS |
| SC9 Zero candidates on a boundary is a finding | Yes | Rule present, but **unverifiable from the artifact** | **CONCERNS** |

> **Note on SC6.** The criterion was reworded during implementation after execution falsified its
> premise. QA has checked the substitution rather than accepting it: `0c4c05f` genuinely still carries
> twelve routes, confirmed by direct `classifyBlock` calls on that commit *and* on current HEAD, and
> they are filed as `bug.6` rather than quietly dropped. The rewording is justified and honestly
> recorded in both the task document and the PR body. **Not** counted as a defect in this task.

---

## Breaking Changes Validation

None declared, and none found. Probe mode is gated; the YAML gains an optional key; `skills/finalise/SKILL.md`
is the only consumer and it is updated in the same change set. **PASS**

---

## Issues Found

### HIGH Severity (4)

**TASK73-001 — A deliverable test file is not in the PR**
- `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` is untracked and appears in no
  commit. It was written after the four commits were made. It will neither ship nor run in CI.
- **Impact**: SC5/SC6's only deterministic coverage is absent from the change set.
- **Recommendation**: stage and commit it.

**TASK73-002 / 003 / 004 — the `probes: []` tri-state collision**

Three distinct outcomes currently share one representation:

| Outcome | Emitted | Should render as |
|---|---|---|
| Not a boundary (Step 1b did not fire) | `probes: []` | "probe mode did not fire" |
| Boundary probed, nothing reproduced — **the good case** | `probes: []` | "probed, N candidates, none reproduced" |
| Boundary, nothing executed — **the bad case** | `probes: []` | **FAIL** |

- The render branches on emptiness, so the good case prints *"Probe mode did not fire — the deliverable
  is not a boundary"*, which is false.
- The Probe rule says an empty `probes` on a boundary is never a pass, which contradicts Step 4.4's
  "a candidate that ran and returned its expected verdict is not a finding".
- `Candidates executed: {count of probes}` counts reproduced failures, not candidates run, so the
  zero-executed guard cannot be evaluated from the artifact.
- **Impact**: the DoD summary cannot distinguish a boundary that held from one that was never probed —
  the exact distinction this task exists to make legible. This is the task's own defect class, one
  level up again.
- **Recommendation**: add `boundary: true|false` and `probes_executed: <int>` to the return shape;
  branch the render and the guard on those.

### MEDIUM Severity (3)

- **TASK73-005** — `classifierAt()` leaks its temp directory when the write or dynamic import throws.
- **TASK73-006** — the `existsSync(sourcePath)` test is vacuous: the module-scope `readFileSync` throws first.
- **TASK73-007** — three assertions embed the prompt's current line wrapping, so a rewrap fails with a
  message claiming the rule was deleted.

### LOW Severity (3)

- **TASK73-008** — closed-direction assertions use `?.klass === "runnable"`, so a null verdict passes vacuously.
- **TASK73-009** — CI checks out at depth 1, so the discriminating pre-fix half of the replay corpus skips in CI.
- **TASK73-010** — the four probe-field assertions match anywhere in the document, not within the `probes:` block.

**Total**: HIGH 4, MEDIUM 3, LOW 3

---

## NFR Assessment

### Security — PASS
The read-only contract is *tightened*, not loosened. Execution is confined to a pure predicate in a temp
directory, with no network and no repository write, and all three prohibitions are held by contract
tests rather than by convention. The change also surfaced twelve real fail-open routes in shipped code
(`bug.6`) — the deliverable doing its job on its first run.

### Performance — PASS
Prompt grows 88 → 171 lines. Probe mode is gated, so a non-boundary work item pays nothing. The two new
suites add ~1.2s. Full run: 2161 tests, 0 fail.

### Reliability — CONCERNS
The tri-state collision means the DoD artifact under-determines what actually happened. A reader cannot
tell a held boundary from an unprobed one.

### Maintainability — CONCERNS
Two vacuous/over-broad assertions and three wrap-brittle ones. Offset by an unusually good property: the
contract test was mutation-proved on seven mutations, and the replay corpus carries its own
anti-vacuity guard (added after a mutation showed an emptied corpus passed).

---

## Code Review

Step 3b, full adversarial pass over the whole branch diff. 12 findings — 9 bugs, 3 cleanups.

**Correctness bugs (9):** TASK73-001 through TASK73-008 above, plus TASK73-010.

**Cleanups (3, advisory — not promoted):**
- `shared/resources/finalise-dod-security-prompt.md` — `reproduced` is effectively constant-`true`,
  since the Probe rule admits only `true` entries. **Accepted with rationale**: the field is the shape
  the task document specifies, and the render's `where probe.reproduced` filter is defensive rather than
  dead — it correctly hides an entry an agent emits against the rule.
- `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` — the `0c4c05f` test asserts a
  property of frozen history. **Accepted with rationale**: it pins the claim that `0c4c05f` is the
  fixing commit, which the task document and `bug.6` both rely on, for ~500ms.
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:183` — over-broad field matching. **Promoted**
  as TASK73-010 rather than left advisory, because it is the same vacuity class the task is about.

**Gate mapping**: `code_review_blocking=true` (pipeline run-level override; task frontmatter does not opt
out). `category: bug` + `confidence: high` findings promoted to `top_issues[]`. Rule 1 (any high) → **FAIL**.

### Mutation-Proof Spot Check (Step 3c)

Seven mutations run against the contract test, each reverted after; every one turned the suite red:
removing the execute-don't-reason instruction, the zero-probes guard, the read-only redefinition, the
accept-direction, or the negative case; renaming the SKILL.md heading (2 tests); and editing the source
without re-bundling.

Three further mutations against the replay corpus: regressing the shipped classifier → red; an unknown
SHA → **skips, does not fail** (correct — a red build from clone depth teaches people to ignore the
test); an emptied corpus → **passed, which was a real hole**, closed by an explicit length guard and
re-proved red. `mutation-proven: yes` for every invariant asserted in both files.

---

## Step 4b — Execute the Documented Commands

Fired: `skills/finalise/SKILL.md` is in the change set and carries fenced bash blocks.

- 18 blocks found — **0 runnable, 1 placeholder, 17 mutating. Zero executed.**
- Engine finding: `zero-blocks-executed` (confidence: medium).
- Shells: bash + zsh, zsh available.
- Every skip, with reason: L162 placeholder (`unbound-variable: DOC_FILE`); L339, L1112, L1176
  write-redirection; L511 `rm -rf`; L574, L683, L944, L957, L1050, L1136, L1217, L1670
  unrecognised-command (fail-closed); L617 `-o output flag`; L979 `gh pr comment`; L1003 `curl write
  method`; L1158, L1202 `gh issue`.
- **Attribution — not a defect in this change set.** The diff adds **zero** bash blocks to
  `SKILL.md`; all 18 pre-date it, and all 17 mutating classifications are correct refusals of genuinely
  side-effecting orchestration commands. Recorded, not suppressed, per the step's own rule; advisory at
  `confidence: medium`.

> Worth noting: L979 and L1003 are refused as `gh pr comment` and `curl write method` — the two
> commands bug.3 reached via `g\h` and `cu'r'l`. The classifier now denies them by their plain spelling.

---

## Regression Testing

Full hermetic suite: **2161 tests, 0 fail, 1 skipped**. Bundle freshness verified — the bundler is
idempotent against the committed copy, which differs from source only by the autogen banner. No
consumer of `security_review` other than `skills/finalise/SKILL.md` exists (grep-confirmed), so the
optional key breaks nothing.

---

## Test Artifacts

### Test Commands Executed

```
npm run ci:fast
node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs
node --test evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs
node shared/resources/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
python3 skills/create-skill/scripts/bundle_skill.py --all
```

---

## Recommendations

### Immediate (Blocking)

1. Commit the untracked replay test (TASK73-001).
2. Add `boundary:` and `probes_executed:` to the return shape; branch the render and the zero-executed
   guard on them (TASK73-002/003/004).
3. Close the vacuous and wrap-brittle assertions (TASK73-005/006/007/008/010).
4. Set `fetch-depth: 0` so the discriminating half of the replay corpus runs in CI (TASK73-009).

### Short-term (Non-Blocking)

1. Fix the twelve classifier routes in `bug.6`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Four HIGH findings. One deliverable file is absent from the PR; the other three are a
single design flaw in the return shape that makes the DoD summary misreport the good case and leaves
the task's own safety guard unverifiable. All are fixable within this change set — none requires
rethinking the approach, which is sound and demonstrably effective.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK73-001 through TASK73-004 resolved.

---

**Next Steps**: `/qa-fix` — then re-review as QA cycle 2.
