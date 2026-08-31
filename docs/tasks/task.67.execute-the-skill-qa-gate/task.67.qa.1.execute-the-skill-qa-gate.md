# QA Report: Task 67 — Make QA execute a prose skill, not only read it

**Task**: [task.67.execute-the-skill-qa-gate.md](./task.67.execute-the-skill-qa-gate.md)
**Gate File**: [task.67.gate.1.execute-the-skill-qa-gate.yml](./task.67.gate.1.execute-the-skill-qa-gate.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-31
**PR**: [#289](https://github.com/Gamaroff/agent-skills/pull/289) — commit `2e7aa94`
**Gate Status**: **FAIL**

---

## Executive Summary

The feature is well-conceived, well-documented and genuinely works on the case it was built for: the
task-66 regression fixture is caught, the post-fix version is clean, and with bindings supplied the
engine executes five real blocks from `qa-task/SKILL.md` under both shells with no findings. The
development record is unusually honest — five defects were found by dogfooding and fixed with proofs.

But the deliverable **is** a safety boundary, and the boundary does not hold. Thirteen distinct
inputs classify as `runnable` and execute, each verified against the shipped code. Containment to the
temp working copy — an explicit Success Criterion — was **disproven** with a canary file written
outside it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

> **The suite is green throughout — 2040 tests, 0 failures — with every one of these holes present.**
> That is the same "a passing test is not evidence" failure this task was written to eliminate,
> reproduced inside the fix itself. It is the strongest possible argument *for* the feature, and the
> reason it cannot ship in this state.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 5 implementation phases completed (54 checkboxes ticked, 0 unticked)
- [x] Tests passing (2040 tests, 0 failures)
- [x] Breaking changes documented — none, correctly
- [x] Code on feature branch with open PR #289

### Testing Approach

- [x] Automated testing (full suite)
- [x] Code review (adversarial diff review, Step 3b)
- [x] **Documented-command execution (Step 4b — this feature, run against itself)**
- [x] Independent mutation-proof verification (Step 3c)
- [x] Regression testing
- [x] Security review

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review. Standard mode; the
traceability mapper was skipped (task 67 has no Success Criteria table — checkbox lists only).

Every high-severity finding returned by the code-review subagent was **independently re-verified**
against the shipped module before being accepted. All thirteen reproduced. None was taken on trust.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1 — Detection rule | PASS | Verified | `qa-runnable-prose-detection.md` states the rule once; both QA skills reference it; step-5-6 doc cross-references without restating |
| 2 — Extraction and classification | **FAIL** | Verified | Extraction desynchronises on an attributed fence; classification fails open thirteen ways |
| 3 — Dual-shell execution | **CONCERNS** | Verified | Comparison logic is correct and mutation-proved; environment leakage and temp-dir leak are defects |
| 4 — Wire into QA skills | PASS | Verified | `qa-task` Step 4b between Steps 4 and 5; `qa-story` Phase 1.7 after Phase 1.6 — correct per-file placement; `npm run bundle` run and bundled copies committed |
| 5 — Prove it | PASS | Verified | task-66 fixture caught; post-fix clean; both required mutation proofs present and held |

**Overall Phase Completion**: 3/5 pass, 1 concerns, 1 fail

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| A work item adding a SKILL.md with bash blocks triggers Step 4b | Yes | Yes — fired on this very change set | PASS |
| A work item with no runnable prose skips it, and the skip is recorded | Yes | Yes | PASS |
| Read-only blocks execute under both shells; results compared | Yes | Yes — 5 blocks executed with bindings, bash+zsh agreed | PASS |
| Mutating and placeholder blocks skipped with a recorded reason | Yes | Partially — 13 mutating inputs are **not** skipped | **FAIL** |
| An execution failure produces a `category: bug` finding | Yes | Yes | PASS |

### Regression

| Criterion | Target | Actual | Status |
|---|---|---|---|
| The pre-fix task-66 Step 3 block is caught | Yes | Yes — shell disagreement, bash 6 lines / zsh 0 | PASS |
| The post-fix version is not flagged | Yes | Yes — identical stdout, exit 0 both shells | PASS |

### Safety

| Criterion | Target | Actual | Status |
|---|---|---|---|
| No block on the mutation deny-list ever executes | 0 | `sed --in-place` bypasses the deny-list | **FAIL** |
| Classification fails **closed** on anything unrecognised | Always | Fails **open** on the unparseable command position | **FAIL** |
| Execution happens in a temp working copy, never the live tree | Always | **Disproven** — canary written outside the temp copy | **FAIL** |
| A host without zsh runs bash only and does not trip zero-executed | Yes | Yes — guard correct | PASS |

### Repository integration

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `npm run bundle` run, regenerated references committed | Yes | Yes — bundle freshness check passes, bundler idempotent | PASS |
| New suite collected by the existing `npm test` glob | Yes | Yes — 41 tests run, `package.json` correctly unchanged | PASS |

---

## Step 4b — Execute the Documented Commands (this feature, run against itself)

The rule fired: the diff modifies two `SKILL.md` files and adds a `shared/resources/*.md` prompt, all
containing fenced `bash` blocks.

| File | Blocks | runnable / placeholder / mutating | Shells | Findings |
|---|---|---|---|---|
| `skills/qa-task/SKILL.md` | 14 | 0 / 7 / 7 | bash, zsh | `zero-blocks-executed` [medium] |
| `skills/qa-story/SKILL.md` | 13 | 0 / 7 / 6 | bash, zsh | `zero-blocks-executed` [medium] |
| `shared/resources/qa-runnable-prose-detection.md` | 2 | 1 / 0 / 1 | bash, zsh | none |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | 12 | 0 / 2 / 10 | bash, zsh | `zero-blocks-executed` [medium] |

All skips carried a line number and a reason, as §5 of the rule requires. Full skip lists are in the
run output; a representative sample:

```
SKIP  line 115  mutating — unrecognised-command: git branch, gh (fail-closed)
SKIP  line 152  placeholder — unbound-variable: TASK_FILE
SKIP  line 842  mutating — deny-list: gh pr comment
```

**The `--bind` advice is real, not decorative.** Re-running `qa-task/SKILL.md` with
`--bind TASK_FILE=… --bind TASK_DIR=… --bind LATEST_GATE=… --copy …` moved 5 blocks from
`placeholder` to `runnable`; all five executed under both shells, agreed on stdout, exited 0, and
produced **no findings**. The gate is not vacuous.

`zero-blocks-executed` at `confidence: medium` is correct and does not enter `top_issues[]` — see the
decision recorded in the task's Notes, which QA agrees with: at `high` this step would block any PR
whose documented snippets take arguments.

One reason-accuracy defect found here and filed as M4 in BUG-2: a `|` inside a template slot is split
as a pipe, so `{develop-story|develop-task|develop-bug}` reports `unrecognised-command: develop-task`.

---

## Issues Found

### HIGH Severity (8)

All eight are instances of one class — **the classifier fails open** — with distinct root causes and
distinct fixes. Filed together as
[task.67.bug.1.classifier-fails-open.md](./task.67.bug.1.classifier-fails-open.md).

| ID | Input verified `runnable` | Root cause |
|---|---|---|
| CR-1 | `echo pwned > /tmp/x` | Redirections skipped as tokens, never inspected |
| CR-2 | `echo "note # here"; rm -rf /tmp/x` | Comment stripper fires inside quotes |
| CR-3 | `grep -q x <<<"DATA"` ⏎ `rm -rf /tmp/x` | Heredoc regex matches a here-string |
| CR-4 | `\mv a b` · `CMD=rm` ⏎ `$CMD -rf /tmp/x` | Unparseable leading token `break`s the segment |
| CR-5 | `env touch /tmp/x` · `command mv` · `time mv` | Command runners; only the prefix is scanned |
| CR-6 | `awk 'BEGIN{system("touch /tmp/x")}'` | awk program is a blanked quoted argument |
| CR-7 | `find . -name x -delete` · `find . -exec …` | No argument inspection |
| CR-8 | `cat <(touch /tmp/x)` | Process substitution is not a segment break |

**Containment proof.** A document containing `echo pwned > /tmp/qa67-canary-PROOF` was passed to
`executeFile`. The block classified `runnable`, executed, and the canary appeared **outside** the
temp working copy. The temp cwd is no defence against an absolute or `~`-relative target.

### MEDIUM Severity (4)

Filed as [task.67.bug.2.extraction-and-coverage-gaps.md](./task.67.bug.2.extraction-and-coverage-gaps.md).

- **CR-9** `sed --in-place` bypasses the `sed -i` deny-list entry.
- **CR-10** An attributed fence (` ```bash showLineNumbers `) is unrecognised; its body is dropped and
  its closing fence read as an opening one, desynchronising the file. Verified: **zero blocks
  extracted**, so the gate reports a clean run on a document it never read.
- **CR-11** `mkdtempSync`/`cpSync` sit outside the `try`/`finally`; a bad `--copy` leaks the temp dir
  silently on every run.
- **CR-12** Snippets inherit the full parent environment including `GITHUB_TOKEN` and tracker
  credentials, contradicting the file's own "carries no credentials" claim.

### LOW Severity (6)

Documented in BUG-2 (L1–L8): quoted-span variable scanning, SIGTERM mislabelled as timeout,
unvalidated `--timeout`, git subcommand window, **eight zsh-gated tests that vanish silently on a CI
image without zsh**, two weak tests, unmemoised `zshAvailable()`, and no CLI-surface coverage.

**Total**: HIGH 8, MEDIUM 4, LOW 6

---

## NFR Assessment

### Security — **FAIL**

The deliverable is a security boundary and it does not hold. Thirteen verified fail-open inputs;
containment disproven; parent environment (including credentials) handed to executed snippets. This
is the single reason the gate is FAIL rather than CONCERNS.

### Performance — PASS

The per-block timeout works (a 30s sleep is cut off). No measurable effect on suite runtime.
`zshAvailable()` spawning a subprocess per call is a LOW inefficiency.

### Reliability — CONCERNS

Temp directory leaks on a bad `--copy`. An attributed fence silently empties the gate's coverage.
Unvalidated `--timeout` can disable hang protection on a typo.

### Maintainability — PASS

Genuinely good. Exported pure functions, comments that explain *why* rather than *what*, and a rule
document that records the measurements behind its decisions rather than asserting them. The task
document's Notes honestly record five self-found defects, one confidence decision and one open
question — that transparency is what made this review efficient.

---

## Code Review

**Correctness bugs (16)** — 8 high / 4 medium / 4 low. Under `code_review_blocking=true`, the eight
`confidence: high` bugs were promoted to gate `top_issues[]` as CR-1 … CR-8, plus CR-9 … CR-12 at
medium. Deterministic rule 1 (any high severity) applies → **Gate = FAIL**.

**Cleanups (2)** — memoise `zshAvailable()`; add CLI-surface tests for `main()`/`render()`.

### Mutation-proof spot check (Step 3c)

The development record claims nine mutation proofs. QA independently re-ran four of the load-bearing
ones against the shipped code:

| Reverted behaviour | Failing tests | Held? |
|---|---|---|
| stdout comparison → status comparison | 7 | ✅ |
| fail-closed allow-list check | 15 | ✅ |
| per-occurrence `git` resolution | 7 | ✅ |
| skip-reason recording | 3 | ✅ |

`mutation-proven: yes` for all four verified. The claim is credible.

**But note what the proofs did not cover.** All nine target behaviours that *exist*; none targets the
paths where classification is absent. That is precisely why thirteen holes survived to QA with a
green suite — a mutation proof can only falsify a check that is there.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite (2040 tests) | PASS — 0 failures, 1 skipped |
| Bundle freshness (CI `validate.yml` check) | PASS — bundler idempotent across two runs |
| `npm test` glob collects the new suite | PASS — 41 tests, `package.json` unchanged as claimed |
| Existing QA skills still validate | PASS — `quick_validate.py` clean for qa-task and qa-story |
| Adjacent skills (develop-task/story references) | PASS — transitive bundling correct, no unintended files |

No regressions introduced.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test
node --test shared/resources/tests/qa-execute-snippets.test.mjs
node shared/resources/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md
python3 skills/create-skill/scripts/quick_validate.py skills/qa-task
```

### Coverage

The repo publishes no coverage numbers for `shared/resources/`; the new suite is 41 focused tests
over the module's exported surface, with the CLI entry point uncovered (L8).

---

## Recommendations

### Immediate (Blocking)

1. Close CR-1 … CR-8. Each needs a regression test **and** a mutation proof.
2. Add defence in depth: after each block, verify nothing outside the temp copy was written, so a
   future classification miss is still caught. The classifier should not be the only line.
3. Fix CR-10 — an attributed fence makes the gate report a clean run on a document it never read.
4. Fix CR-11 (temp-dir leak) and CR-12 (credential leakage into snippets).

### Short-term (Non-blocking)

1. Make zsh a declared CI prerequisite; eight tests including the whole task-66 fixture vanish
   without it.
2. Strengthen the two weak tests; add CLI-surface coverage.
3. Correct the template-alternation skip reason (M4).

---

## Final Assessment

**Gate Status**: **FAIL**
**Quality Score**: 0/100 *(100 − 20×5 FAILs, floored at 0)*
**Deployment Recommendation**: BLOCKED

**Rationale**: Eight high-severity, high-confidence correctness bugs, every one independently
reproduced, in code whose entire purpose is to be a safety boundary. Three Safety success criteria are
unmet and one — containment to a temp working copy — is demonstrably false.

The score understates the work. The design is sound, the documentation is better than most, and the
regression fixture at the centre of it is exactly right. What failed is the breadth of the allow-list
model against real shell syntax, and it failed invisibly because the tests only ever asked about
inputs the author had thought of.

**Next Steps**: `/qa-fix` — close CR-1 … CR-8, then CR-9 … CR-12, each with a regression test and a
mutation proof, and re-run this gate.
