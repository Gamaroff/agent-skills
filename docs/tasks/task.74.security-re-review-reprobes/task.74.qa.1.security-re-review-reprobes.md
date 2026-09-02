# QA Report: Task 74 — A security re-review must re-probe, not re-read

**Task**: [Link to task document](./task.74.security-re-review-reprobes.md)
**Gate File**: [task.74.gate.1.security-re-review-reprobes.yml](./task.74.gate.1.security-re-review-reprobes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Testing Completed**: 2026-09-02
**Gate Status**: CONCERNS

---

## Executive Summary

All four implementation phases are complete and the design is sound — the carve-out composes with the
existing `PRIOR_GATES` branch rather than duplicating it, the rule is stated once, and the parity suite
holds it with 31 tests including four that **execute** the trigger probe against real gate fixtures.

One real defect was found by executing the shipped prose rather than reading it: **the clause-1 probe
hangs when `LATEST_GATE` is empty**, which is its value on a first review. Two lower-severity issues in
the test file accompany it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1 before merge

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 phase checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (task declares none; verified)
- [x] Code on feature branch with open PR (#299, OPEN)

### Testing Approach

- [x] Automated Testing (unit + contract)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review
- [x] **Execution of documented commands** (Step 4b)
- [ ] Manual Testing — N/A, deliverable is prose + a test
- [ ] Performance Testing — N/A, no runtime code path

### Review Methodology

**Direct tools only** — Bash, grep and file reads throughout, including the Step 3b code review.
`Adaptive strategy override: direct tools — operator instruction prohibits the Agent/Explore tool in
this session.` The Adaptive Review Strategy would otherwise have chosen "direct tools first" anyway
(4 phases, single module, medium risk), so the override changes only *who* read the diff, not how much
of it was read. The whole `origin/develop...HEAD` diff was read directly (1620 insertions across 11
files) rather than summarised by a subagent.

**Not a re-review** — no prior gate exists for this task, so Phase 0's scope decision does not apply and
no `Re-review scope:` line is recorded. `SAFETY_REPROBE` was not evaluated for *this* review; it was
evaluated *as the subject under test* (see Step 4b).

---

## Implementation Verification

| Phase                                   | Status | Test Result | Notes                                                                                                        |
| --------------------------------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Phase 1: Define the trigger             | PASS   | Verified    | `shared/resources/qa-re-review-scope.md` created; trigger, non-triggers and clause-1 probe all present         |
| Phase 2: The unscoped path              | PASS   | Verified    | `SAFETY_REPROBE` wired as a disjunct in both skills; `REFUTE_PASS` interaction explicitly defined              |
| Phase 3: Ask both questions             | PASS   | Verified    | `## New Findings This Cycle` in both report templates, required when empty; scope decision in Review Methodology |
| Phase 4: Hold it with a contract test   | PASS   | Verified    | 31 tests; runs under `npm run ci` via the existing `evals/shared/tests/*.test.mjs` glob (confirmed by running it) |

**Overall Phase Completion**: 4/4 phases passed

Phase 2's composition requirement was checked directly, not taken on trust:

```
$ grep -c 'if \[ "$PRIOR_GATES"' skills/qa-task/SKILL.md skills/qa-story/SKILL.md
1
1
```

One conditional per skill — the disjunct extends the existing guard rather than adding a competing one.

---

## Step 4b: Execute the Documented Commands

The rule fires: the diff modifies two `SKILL.md` files and adds a `shared/resources/*.md` prompt, all
containing fenced ` ```bash ` blocks. `zsh` is available; both shells were used.

### Engine results

| File | Blocks | runnable / placeholder / mutating | Engine finding |
| --- | --- | --- | --- |
| `shared/resources/qa-re-review-scope.md` | 2 | 0 / 0 / 2 | `zero-blocks-executed` |
| `skills/qa-task/SKILL.md` | 17 | 0 / 4 / 13 | `zero-blocks-executed` |
| `skills/qa-story/SKILL.md` | 15 | 0 / 5 / 10 | `zero-blocks-executed` |

**Every skipped block, with line and reason**, is enumerated in the raw engine output; the two in the
new shared rule are:

- `:52` — `mutating`, `unrecognised-command: awk (fail-closed)` — the clause-1 probe
- `:87` — `mutating`, `write-redirection` — the composed-guard illustration

### `zero-blocks-executed` — not suppressed, but classified

This is **[bug.7 (PR #298, not yet merged)](https://github.com/Gamaroff/agent-skills/pull/298)
case B**: every block is *correctly* refused, and no `--bind` or `--copy` can move them to `runnable`.
`awk` is not on the allow-list and write-redirection is denied by design.

It is also **pre-existing, not introduced**. Replaying the engine against the `develop` versions of both
skills:

| File | On `develop` | On this branch |
| --- | --- | --- |
| `skills/qa-task/SKILL.md` | 15 blocks, 0/4/11 → fires | 17 blocks, 0/4/13 → fires |
| `skills/qa-story/SKILL.md` | 14 blocks, 0/5/9 → fires | 15 blocks, 0/5/10 → fires |

Not raised as a finding against this task. Recorded here so the signal is visible rather than silently
dropped, which is the failure mode the anti-vacuity guard exists to prevent.

### What was executed instead — the substantive check

The engine's refusal does not excuse leaving the probe unexecuted. It was extracted **verbatim from the
shipped `shared/resources/qa-re-review-scope.md`** (not retyped) and run under both shells against real
fixtures:

| Fixture | Expected | bash | zsh |
| --- | --- | --- | --- |
| `task.67.gate.1` (`security: FAIL`) | `true` | ✅ `true` | ✅ `true` |
| `task.67.gate.2` (`security: PASS`) | `false` | ✅ `false` | ✅ `false` |
| Synthetic CONCERNS-on-maintainability | `false` | ✅ `false` | ✅ `false` |
| Synthetic gate with no `security:` axis | `false` | ✅ `false` | ✅ `false` |

**No shell disagreement** — stdout identical across bash and zsh on all four. The remaining blocks in
the shared rule and both edited scoping blocks were syntax-checked with `bash -n` and `zsh -n`: all parse.

This is also what surfaced CR-1 below. Reading the probe would not have.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Re-review after security FAIL runs unscoped | Yes | Yes — disjunct verified in both skills | PASS |
| Cycle-3+ after security FAIL runs unscoped | Yes | Yes — `PRIOR_GATES ≥ 2` no longer sufficient to narrow | PASS |
| `REFUTE_PASS` defined when trigger fires | Yes | Yes — stated in the rule and both skills; the two compose | PASS |
| Non-safety CONCERNS keeps today's scoping | Yes | Verified by executed replay | PASS |
| Scope decision in Review Methodology | Both cases | Both strings present in both skills | PASS |
| New Findings section, present when empty | Yes | Present; requirement stated *inside* the section | PASS |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `task.67.gate.1` triggers the carve-out | Fires | Fires (executed) | PASS |
| Skip-re-review path unaffected | Unchanged | Phase 0 steps 1–4 untouched by the diff | PASS |
| Artifact numbering / gate schema unchanged | Unchanged | No diff hunks touch either | PASS |

### Safety

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Trigger needs a safety axis, not merely issues | Yes | Non-triggers enumerated; CONCERNS/no-axis replays return `false` | PASS |
| Unscoped zero-finding cycle states what was searched | Required | Required *within* the section (tightened after mutation M4) | PASS |

**Full test suite**: `npm run ci:fast` → **EXIT=0**, 2199 pass / 0 fail. `prettier --check .` clean.
New suite: **31/31**.

---

## Breaking Changes Validation

The task documents **none**. Verified: the diff adds a disjunct that can only be `true` when a prior
gate failed on a safety axis, so every pre-existing path evaluates identically. Gate schema,
quality-score formula and artifact numbering are untouched. **Assessment: PASS (N/A — none to migrate).**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**CR-1: The clause-1 probe hangs when `LATEST_GATE` is empty**

- **Severity**: MEDIUM · **Confidence**: high · **Category**: Reliability
- **Location**: `shared/resources/qa-re-review-scope.md:52`, and the copies at
  `skills/qa-task/SKILL.md:229` and `skills/qa-story/SKILL.md:~236`
- **Observation**: `awk 'program' "$LATEST_GATE"` with `LATEST_GATE` empty passes **no filename**, so
  awk falls back to reading **stdin** and blocks indefinitely. Demonstrated by execution under both
  shells — the process had to be killed at 4s:

  ```
  bash: HUNG — awk blocked reading stdin
  zsh:  HUNG — awk blocked reading stdin
  ```

- **Reachability**: `LATEST_GATE=$(ls -t "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | head -1)` is
  **empty by construction on a first review**. The only thing keeping the probe from running then is the
  prose heading *"For re-reviews: resolve the scope"*. That is a prose guard in front of a block whose
  failure mode is an indefinite hang.
- **Impact**: A hang, not an error. It burns the full tool timeout and produces no diagnostic — the same
  failure shape `develop-next` explicitly warns about for `gh pr checks --watch`. It fails *open* into a
  stall rather than closed into a message.
- **Recommendation**: Guard the probe on the file, and close stdin so the fallback can never engage:

  ```bash
  SAFETY_REPROBE=false
  if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
    awk '/^[[:space:]]*security:[[:space:]]*$/{f=1; next}
         f && /^[[:space:]]*status:/ {print; exit}' "$LATEST_GATE" </dev/null \
      | grep -qE '[[:space:]]FAIL[[:space:]]*$' && SAFETY_REPROBE=true
  fi
  ```

  Fix in `shared/resources/` and re-run `npm run bundle` — editing the bundled `references/` copies
  alone is silently reverted. Add a regression test asserting the probe returns `false` (not a hang) for
  an empty and a nonexistent `LATEST_GATE`.
- **Priority**: P1

### LOW Severity Issues (2)

**CR-2: A missing shared rule crashes the suite at import instead of failing its own assertion**
`evals/shared/tests/qa-re-review-scope-parity.test.mjs:59` — `readFileSync(RULE_PATH)` runs at module
top level, *before* `test("the shared rule exists")` executes. Removing the rule produces a raw
`ENOENT` stack trace and `tests 1 / fail 1`; the purpose-written assertion message never appears.
Verified by deleting the file and re-running. **Not a false green** — the suite still fails — but the
diagnostic that was written for exactly this case is lost. Read lazily, or wrap in a guard.

**CR-3: `extractProbe` takes the first matching block, unanchored**
Same file — the regex matches the first ` ```bash ` block containing `SAFETY_REPROBE=false`. A later
edit that adds an earlier such block would silently make the replay tests execute a different snippet
while still reporting green. Assert exactly one match, or anchor to the "Clause 1" heading.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Security — PASS

The change tightens a QA safety path and adds no new attack surface. Execution during this review was
confined to reading gate YAML fixtures and running a `printf`-terminated probe in a temp context; the
snippet engine's fail-closed refusals (`awk` unrecognised, write-redirection denied) behaved correctly
and were not overridden. The one boundary in the diff — the trigger predicate — was probed with four
inputs including two negative controls, and classified correctly on all of them under both shells.

### Performance — PASS

No runtime code path. The carve-out makes some re-reviews unscoped, which is a deliberate, documented
cost bounded by its own trigger: once security passes, scoping returns to default. The task's own risk
register anticipates this and the mitigation is sound.

### Reliability — CONCERNS

CR-1. A documented command that hangs rather than errors is a reliability defect regardless of how
narrowly it is reachable, because the failure carries no diagnostic. Everything else in the change is
robust: the unset-`SAFETY_REPROBE` case was tested and degrades correctly to default scoping
(`NARROW`) under both shells, and the guard's three-term condition was verified to short-circuit safely.

### Maintainability — PASS

The rule is stated once and both consumers reference it; the parity suite forbids restatement and holds
the wiring, the report requirements and the probe text. The identity guard added after the file-swap
incident closes a structural blind spot in the suite itself. Fifteen mutation proofs, three of which
were independently re-run during this review (baseline 31/0 → M6 28/3 → M11 29/2 → restored 31/0).

---

## Code Review

From Step 3b — whole-branch diff, read directly. `code_review_blocking=true` (run-level override from
the pipeline; the task carries no frontmatter flag), so `category: bug` + `confidence: high` findings
are promoted to gate `top_issues[]`.

**Correctness bugs (1):**

- [medium/high] `shared/resources/qa-re-review-scope.md:52` — `awk` with an empty `$LATEST_GATE` reads
  stdin and hangs → guard on `[ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]` and add `</dev/null`.
  Promoted to gate as **CR-1**.

**Cleanups (2):**

- `evals/shared/tests/qa-re-review-scope-parity.test.mjs:59` — top-level `readFileSync` pre-empts the
  existence test's own assertion → read lazily. (CR-2)
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs:~240` — `extractProbe` is unanchored → assert
  a single match. (CR-3)

**mutation-proven**: CR-1 — n/a (a defect found, not a fix made this cycle). The 15 proofs backing the
*implementation* were spot-checked independently: M6 (`\s` escape) and M11 (file swap) both confirmed
red, baseline restored green.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) | PASS — 2199 pass / 0 fail |
| Formatting (`prettier --check .`) | PASS |
| Bundled `references/` copies in sync with sources | PASS — verified for both skills |
| `develop`-version engine replay (pre-existing-finding control) | PASS — confirms `zero-blocks-executed` is not introduced |
| Skill identity (`name:` matches directory) | PASS — both, now enforced by test |

---

## Test Artifacts

### Files Reviewed

All 11 files in `origin/develop...HEAD`, in full.

### Test Commands Executed

```bash
npm run ci:fast                                             # EXIT=0, 2199 pass / 0 fail
npx prettier --check .                                      # clean
node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs   # 31/31
node shared/resources/qa-execute-snippets.mjs --file <each of 3 files> --json
bash /tmp/probe.sh ; zsh /tmp/probe.sh                      # 4 fixtures × 2 shells
bash -n / zsh -n on all three edited bash blocks
```

### Coverage Report

Not applicable — the deliverable is prose plus a contract test; this repo reports no coverage metric.

---

## Recommendations

### Immediate Actions (Blocking)

1. **CR-1** — guard the clause-1 probe on a readable `$LATEST_GATE` and add `</dev/null`; fix in
   `shared/resources/`, re-run `npm run bundle`, and add a regression test for the empty and
   nonexistent cases. P1.

### Short-term Actions (Non-Blocking)

1. **CR-2** — make the rule read lazily so the existence assertion can report.
2. **CR-3** — anchor `extractProbe` to a single match.
3. `bug.7` remains open and now has a third confirming data point.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM correctness bug (CR-1) promoted to `top_issues` under `code_review_blocking`,
and NFR Reliability assessed CONCERNS for the same defect. No HIGH findings; all four phases complete;
every success criterion met. The defect was found by *executing* the shipped prose — which is the change
this task itself is about.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and re-verified.

---

**QA Report**: co-located at `task.74.qa.1.security-re-review-reprobes.md`
**Gate File**: co-located at `task.74.gate.1.security-re-review-reprobes.yml`
**Next Steps**: `/qa-fix` addresses CR-1 (and CR-2/CR-3 if cheap), then re-review.
