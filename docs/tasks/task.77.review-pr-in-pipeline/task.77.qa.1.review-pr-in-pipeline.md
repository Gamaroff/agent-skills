# QA Report: Task 77 — Run the PR conformance review before a work item is finalised

**Task**: [task.77.review-pr-in-pipeline.md](./task.77.review-pr-in-pipeline.md)
**Gate File**: [task.77.gate.1.review-pr-in-pipeline.yml](./task.77.gate.1.review-pr-in-pipeline.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-03
**PR**: [#309](https://github.com/Gamaroff/agent-skills/pull/309) (OPEN) — commit `b3945e4`
**Gate Status**: FAIL

---

## Executive Summary

The Step 5c wiring is structurally sound and every regression criterion holds — the pipeline is still
8 steps, no `{N}/8` string changed, `develop-bug`'s own files are byte-unchanged, and `/review-pr`'s
advisory contract survives with its 52 tests green. The documentation sweep is unusually thorough.

But the new path **cannot actually run**. Three high-confidence contradictions block it: Loop Setup
still tells the agent that a clean PASS exits the loop, the shared cycle counter is incremented twice
on a review-driven cycle, and the `REQUEST CHANGES` route has no mechanism to deliver its findings to
`/qa-fix`, so it dead-ends in the no-code-change HALT.

All three are in prose, all three are cheap to fix, and none of them invalidates the design.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (0 unticked boxes)
- [x] Tests passing — full `npm run ci` exit 0
- [x] Breaking changes documented (None, per §5)
- [x] Code on feature branch with open PR #309

### Testing Approach

- [x] Automated testing (324 tests across 4 suites)
- [x] Regression testing
- [x] Security review
- [x] Code review (Step 3b — one Explore subagent over the full branch diff)
- [x] **Execution of documented commands** (Step 4b)
- [x] Mutation-proof spot check (Step 3c)

### Review Methodology

Direct tools plus one code-review subagent. `PIPELINE_MODE=standard`; this is a first review
(`PRIOR_GATES=0`, so `REFUTE_PASS=false` and `SAFETY_REPROBE=false`) and the diff is the whole branch.

The task's own instruction — *execute the prose, do not only read it* — was followed literally, and it
is what produced the strongest evidence in both directions. Notably, the first link-check script
written for this review **silently produced six false "DANGLING" results under zsh**, because zsh does
not word-split unquoted parameters the way bash does. Re-run under bash, every link resolved. That is
precisely the class of defect task 66 shipped and task 67 exists to catch, encountered live inside the
review of the task that cites it.

---

## Implementation Verification

| Phase                              | Status   | Test Result | Notes                                                                                    |
| ---------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------- |
| 1. The loop gains an exit gate     | CONCERNS | Partial     | 5c section, arms and stage move all landed — but TASK77-001/002/004/005 are all in this phase |
| 2. Lock tolerates a third loop member | PASS  | Verified    | Parses under `bash -n`, `zsh -n`, `sh -n`; test 14/14 under both shells                  |
| 3. Contracts and templates         | PASS     | Verified    | All six files updated; resume contract made conditional on gate state                     |
| 4. Skill prose                     | PASS     | Verified    | `review-pr` relationship section inverted; no `{N}/8` change                              |
| 5. Tests                           | CONCERNS | Verified    | 11 new tests pass and 9 of 11 are non-vacuous; 2 carry individually vacuous assertions     |
| 6. Documentation sweep             | CONCERNS | Verified    | Thorough; TASK77-007 overstates the Bitbucket path                                        |
| 7. Bundle and regenerate           | PASS     | Verified    | 120 skills in sync; `develop-bug` gains no new files                                      |

**Overall Phase Completion**: 7/7 implemented, 3 with issues.

---

## Success Criteria Verification

### Functional

| Criterion                                   | Target | Actual                                  | Status   |
| ------------------------------------------- | ------ | --------------------------------------- | -------- |
| `/review-pr` runs once the gate reads PASS/WAIVED | Yes | Stated at 5a and 5c — **but contradicted by Loop Setup** | **FAIL** |
| REQUEST CHANGES routes into `/qa-fix`, shared budget | Yes | Routing stated; **findings cannot reach qa-fix** | **FAIL** |
| CONCERNS records and does not block; APPROVE exits | Yes | Both stated correctly           | PASS     |
| `ready-for-merge` fires only after the review clears | Yes | Moved into 5c; absent from 5a (test-pinned) | PASS |
| A `*.pr-review.{n}.*.md` lands beside the work item | Yes | Grammar pre-exists; 5c now emits it | PASS |
| Lite mode degrades to `--effort low`, never skips | Yes | Verified in the lite-mode file    | PASS     |
| `/develop-next` and `/develop-batch` unchanged | Yes | 0 files changed in either skill      | PASS     |

### Regression

| Criterion                                | Target | Actual                                                 | Status |
| ---------------------------------------- | ------ | ------------------------------------------------------ | ------ |
| Still 8 steps; lock validates `1..8`     | Yes    | Validator intact                                       | PASS   |
| No `{N}/8` string changed                | Yes    | 11 diff lines match `[0-9]/8`; **all are additions** of the existing `Steps 5–6/8` label — no step number altered | PASS |
| `/review-pr` advisory contract untouched | Yes    | 52 tests green                                         | PASS   |
| `develop-bug` behaviourally isolated     | Yes    | Own SKILL.md + verify-loop byte-unchanged; no new files | PASS  |
| `transition-protocol-parity` still passes | Yes   | Green — its `ready-for-merge` assertion is a whole-file regex, so the move is safe | PASS |

---

## Breaking Changes Validation

§5 declares None for consumers, and that holds: no lock schema change, no step renumber, no migration.
The one named behavioural change — a run whose review returns REQUEST CHANGES consumes a cycle it
would not have consumed before — is documented and intended. **N/A → PASS.**

---

## Issues Found

### HIGH Severity (3)

**TASK77-001 — Loop Setup still says a clean PASS exits the loop**
`shared/resources/develop-pipeline-step-5-6-qa-loop.md:16-29`. Three separate sentences, plus an
explicit enumeration of the loop's exits as "a clean gate (`PASS`/`WAIVED` → Step 7)". This is the
first thing an agent reads, and it is the opposite of what L233 and 5c say. An agent that acts on Loop
Setup never reaches 5c — which would make the entire feature a no-op, silently.

**TASK77-002 — the shared cycle counter is incremented twice**
5c's REQUEST CHANGES row (L676) says to increment it; 5b step 7 (L626) — which every 5b run executes
on exit — increments it again. One review-driven fix pass burns two of five cycles. The counter also
advances without a matching `### QA Cycle {N}` heading, and resume reconstructs the cycle number by
counting those headings (L484), so a resumed run desynchronises. *Found independently by direct trace
and by the code reviewer.*

**TASK77-003 — the REQUEST CHANGES path dead-ends**
5c says "run `/qa-fix` with the review's findings", but 5b's invocation contract (L391) passes only
the most recent gate file and calls it "the authoritative source of issues for qa-fix" — on this path
that gate is the clean PASS. `qa-fix`'s ingester globs cover `gate.*.yml`, `qa.*.md` and `bug.*.md`
and **not** `pr-review.*.md`. So qa-fix ingests a clean gate, finds nothing, changes nothing, and 5b
step 0 fires the no-code-change HALT reporting "qa-fix could not address the remaining issues" — which
is false and would send an operator hunting the wrong thing.

### MEDIUM Severity (2)

**TASK77-004** — two contradictory commit points for the gate and QA report (new L237-239 says before
`/review-pr`; unchanged L486-494, which L239 points at, still says before `/finalise`).
**TASK77-005** — the Convergence check's stated scope is now false, and the 5c→5b re-entry genuinely
bypasses the stall guard.

### LOW Severity (2)

**TASK77-006** — two incompatible loop-exit banner formats (L289 vs 5c's record step).
**TASK77-007** — `docs/concepts/restricted-access.md:43` overstates the Bitbucket path: only GitHub
goes through `tracker_call_with_retry`.

**Total**: HIGH 3, MEDIUM 2, LOW 2.

---

## NFR Assessment

### Performance — PASS

5c runs once per completed run at the loop exit, not per iteration, so it adds no cost to the develop
loop. Lite mode degrades rather than skips. The fast gate is untouched.

### Reliability — FAIL

The decisive axis. TASK77-003 means the new failure route cannot complete; TASK77-001 means the new
success route may never be entered; TASK77-002 halves the effective budget and desynchronises resume.

### Security — PASS

No credentials, tokens or secrets in the diff. No new attack surface — prose contracts, one shell case
arm, one test file. `/review-pr` still writes no gate, submits no formal review and edits no code.

### Maintainability — CONCERNS

Documentation is thorough and the reasoning is recorded. Two individually vacuous assertions in the new
parity test: `assert.ok(stage > s5c)` is trivially true when `indexOf` returns `-1`, and the
`existsSync`/frontmatter pair asserts nothing about task 77. Two regexes match against a slice running
to EOF rather than to the end of 5c, so they would also match text in Loop Escalation.

---

## Code Review

**Correctness bugs (8)** — TASK77-001 … TASK77-007 above, plus the `restricted-access` overstatement.
All 7 were promoted to gate `top_issues[]` (`code_review_blocking=true` from the pipeline).

**Cleanups (7, advisory):**

- `…qa-loop.md:254` — the QA Cycle `**Action**` enum has no "proceeding to 5c" option
- `…qa-loop.md:273` — the tracker comment still says "proceeding to finalise" on a PASS gate, before 5c has run
- `…qa-loop.md:690` — the relocated `ready-for-merge` block covers only `TRACKER=jira`; the sibling `changes-requested` block branches on both (inherited from 5a, but the move was the moment to fix it)
- `pipeline-resume-detector-prompt.md:112` — names `step-5-pr-review-{N}.json`, but 5c instructs nothing to write it
- `docs/operations/workflows.md:110` — the `review-pr` line sits after the fix-cycle block, reading as "runs after qa-fix"
- `pr-review-loop-parity.test.mjs:92,95` — the two weak assertions and the EOF-scoped slices

### Mutation-proof spot check (Step 3c)

| Proof | Held? |
| --- | --- |
| Revert the PASS→5c repoint | **yes** — parity suite 10/1 |
| Restore `ready-for-merge` to 5a | **yes** — ordering assertion fails by name |
| Remove `review-pr` from the lock noop arm | **no — and correctly so.** The `*)` catch-all already noops, so the arm is documentation, not behaviour. Diagnosed as *redundant source* per task 76 and disclosed in the test's own header comment rather than papered over with a literal-string assertion. |

Two of three proofs held; the third's failure is itself the honest finding.

---

## Step 4b — Execution of Documented Commands

The change set modifies `shared/resources/*.md` prose containing fenced bash blocks, so the rule fires.

```
node shared/resources/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --json
```

- Shells: `bash`, `zsh` — **zsh available**
- Blocks found: **16** — runnable 0, placeholder 0, **mutating 16** (all skipped, fail-closed)
- Finding raised: `zero-blocks-executed` (confidence medium)

**Not a regression, and not suppressed.** The same command against the `origin/develop` baseline of the
same file returns 15 blocks, 0 runnable, and the identical `zero-blocks-executed` finding. Every block
in this file is a `node …jira-stage.js` invocation, an `awk` call or a write-redirection, all
fail-closed as mutating. This change adds exactly one block (5c's `ready-for-merge` signal), classified
the same as its 15 siblings. Recorded as informational; the engine's inability to execute this
particular file is a pre-existing property worth its own task.

**Executed directly instead**, since the engine could not:

- `bash -n` / `zsh -n` / `sh -n` on `advance-pipeline-lock.sh` and its test — all clean
- The lock test under **both** bash and zsh — 14/14 each
- `--skill review-pr` against a real lock under zsh — `rc=0`, `current_step` unchanged
- `jira-stage.js --stage ready-for-merge` — exists, exits 0 gracefully with no credentials
- Every markdown link added by the diff, resolved against the **tracked** tree via
  `git worktree add --detach` — all resolve from their source files

---

## Regression Testing

| Area | Result |
| --- | --- |
| `evals/shared/tests/*` (incl. `transition-protocol-parity`) | PASS |
| `evals/develop-{task,story}/protocol/*` | PASS |
| `skills/review-pr/tests/*` | PASS (52) |
| `shared/resources/advance-pipeline-lock.test.sh` | PASS (14, bash + zsh) |
| Full `npm run ci` (`format:check` + `npm test` + `eval:all`) | PASS (exit 0) |

**324 tests passing, 0 failing.**

---

## Test Artifacts

```bash
npm run ci
node --test 'evals/shared/tests/*.test.mjs' 'evals/develop-{task,story}/protocol/*.test.mjs' 'skills/review-pr/tests/*.test.js'
bash shared/resources/advance-pipeline-lock.test.sh && zsh shared/resources/advance-pipeline-lock.test.sh
node shared/resources/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --json
git worktree add --detach /tmp/probe77 HEAD   # link check against the tracked tree
```

---

## Recommendations

### Immediate (blocking)

1. **TASK77-001** — rewrite Loop Setup so a clean gate hands to 5c, and re-enumerate the exits.
2. **TASK77-002** — delete the increment from the 5c row; 5b step 7 already does it.
3. **TASK77-003** — add `*.pr-review.*.md` to the qa-fix ingester globs, state an explicit 5c
   invocation passing the report, and add a 5b step-0 carve-out for the review-driven entry.
4. **TASK77-004 / 005** — reconcile the commit point and the Convergence check's scope.

### Short-term (non-blocking)

1. **TASK77-006 / 007** and the seven cleanups.
2. Tighten the two weak assertions and scope the 5c slice to the section rather than EOF.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Three high-confidence contradictions make the new path unrunnable — one prevents 5c from
being entered, one miscounts the budget it runs on, and one dead-ends its failure route. The design is
sound and every regression criterion holds; the defects are all in prose and all cheap to fix.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK77-001, TASK77-002 and TASK77-003 resolved and re-reviewed.

---

**Next Steps**: `/qa-fix` against this gate, then QA cycle 2.
