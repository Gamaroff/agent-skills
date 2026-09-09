# QA Report: Task 82 - Feed the measured security verdict into the QA gate

**Task**: [task.82.security-gate-evidence-field.md](./task.82.security-gate-evidence-field.md)
**Gate File**: [task.82.gate.1.security-gate-evidence-field.yml](./task.82.gate.1.security-gate-evidence-field.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered, mutation-proven, and `npm run ci` is green. QA found **two real
defects in the change set itself**, one HIGH and one MEDIUM, both in the rewritten clause-1 probe
and both of the silent-failure shape this task exists to prevent. Both were fixed in-cycle and are
now pinned by three regression tests.

The gate is **CONCERNS rather than PASS** because the defects were real and their fixes postdate the
code under review — the honest reading of a cycle that found HIGH-severity problems, even ones now
closed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing — 55/55
- [x] Breaking changes documented (§5, plus a §9 correction made during Step 3)
- [x] Code on feature branch with open PR — [#362](https://github.com/Gamaroff/agent-skills/pull/362)

### Testing Approach

- [x] Automated testing (unit, contract, replay)
- [x] Regression testing
- [x] Security review — **by execution**, see NFR
- [x] Code review
- [ ] Performance testing — not applicable beyond suite runtime
- [ ] Manual testing — not applicable; deliverable is prose + a test suite

### Review Methodology

Direct tools. Standard mode (`risk_level: medium`, 4 phases), but the parallel-agent path and the
Step 3b Explore subagent were **run inline rather than dispatched** — this session's operating
instructions bar spawning agents unless the user asks. The diff was reviewed directly instead; scope
and depth are unchanged, only the mechanism.

First review — no prior gate, so no Re-Review Context table and no scope narrowing.

Adaptive strategy override: **inline review, no subagents (session constraint)**.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Prove the trigger survives | PASS | Verified | 5 fixtures added and run against the **unmodified** probe first: 34 pass → 39 pass, both recorded. This ordering is what makes them evidence about placement rather than a restatement of new behaviour |
| Phase 2: Add the field | PASS | Verified | `evidence:` + `probes_executed:` below `status:` in both skills; values defined once in `shared/resources/qa-gate-security-evidence.md`; `measured ⇒ probes_executed > 0` asserted over the documented schema **and** the on-disk corpus |
| Phase 3: Teach the trigger | **CONCERNS** | Verified after fixes | Clause 1 widened and fail-open correct — but the rewritten probe carried two transit defects (TASK82-001, -002). Both fixed and pinned |
| Phase 4: Wire the skill's block | PASS | Verified | Key names already aligned (task.81 shipped them); the value-domain nesting is now stated on both sides; advisory relationship documented in both QA skills and the producer prompt |

**Overall Phase Completion**: 4/4 delivered; 1 phase carried defects found and closed in this cycle.

---

## New Findings This Cycle

_First review — this section is normally re-review-only. Recorded here because both findings are in
the change set rather than in prior work._

- **[HIGH]** `shared/resources/qa-re-review-scope.md` (and both mirrors) — the rewritten awk program
  referenced the **whole-record variable** 8 times. → replaced with implicit forms; pinned.
- **[MEDIUM]** same file — the comment written to fix the above contained an **apostrophe**. → removed;
  pinned.

---

## Issues Found

### HIGH Severity Issues (1)

**TASK82-001: the awk program named the whole-record variable, which a skill harness substitutes**

- **Severity**: HIGH · **Category**: Functional · **Priority**: P1 · **Status**: Closed 2026-09-09
- **Observation**: The rewritten clause-1 probe used the whole-record variable 8 times. That snippet
  is **prose an agent copies and runs**, and a harness loading a `SKILL.md` with arguments
  substitutes the token with the invocation argument. Observed live, in this very QA cycle: invoking
  `/qa-task <task-file>` rendered `qa-task/SKILL.md` with
  `match(docs/tasks/task.82.../task.82....md, /^[[:space:]]*/)` in place of the intended reference.
- **Impact**: The block-bounding arithmetic reads garbage. `ind` becomes meaningless, the block
  boundary is wrong, and the probe returns a verdict computed from the wrong lines — **silently**.
  This is the same failure mode as the `\s`-vs-POSIX bug the file already records, and the same one
  the task was written to prevent one layer up.
- **Why it was introduced**: the probe this replaced used the token **zero** times. The rewrite
  needed indent arithmetic and reached for the obvious form.
- **Fix**: implicit forms only — a bare `/regex/` tests the whole record, argument-less `length` is
  its length, two-argument `sub()` edits it in place. Behaviour verified identical across all 10
  adversarial fixtures before and after.
- **Regression guard**: `the awk program never names the whole-record variable`, plus a per-skill
  variant, because the verbatim-mirroring test strips comments before comparing and would not have
  caught a comment-only corruption.

### MEDIUM Severity Issues (1)

**TASK82-002: an apostrophe in a comment terminates the single-quoted program**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P2 · **Status**: Closed 2026-09-09
- **Observation**: The warning comment added to fix TASK82-001 was worded `AWK'S WHOLE-RECORD
  VARIABLE`. The awk program is single-quoted by its caller; one apostrophe — inside a comment or
  not — closes the quote early.
- **Impact**: 18 of 52 tests went red simultaneously. **This one fails loudly**, which is why it is
  MEDIUM and not HIGH.
- **Note worth keeping**: the adjacent pre-existing comment says *"No apostrophes here: the program
  is single-quoted by its caller."* A prose warning did not prevent the defect in the same edit that
  read it. That is the argument for the test.
- **Fix**: reworded to avoid the character. The warning about the whole-record variable is now also
  spelled out rather than written literally — a warning that is itself corrupted by the mechanism it
  warns about is worse than none.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0 — both closed in-cycle.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `nfr_validation.security` carries `evidence:` and `probes_executed:` | Yes | Yes, below `status:` | PASS |
| `SAFETY_REPROBE` fires on `status: FAIL` **or** unverified evidence | Yes | Yes | PASS |
| A gate with no `evidence:` key reads `unverified` and triggers | Yes | Yes | PASS |
| `review-security`'s block liftable without renaming | Yes | Yes; nesting stated both sides | PASS |

### Regression

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Existing parity assertions | all pass | 3 changed **deliberately** | PASS (see below) |
| Identical verdicts on the two `task.74` gates | identical | status half identical; both now also fire on absence | PASS (see below) |
| Gate decision rules and quality-score formula | unchanged | unchanged | PASS |
| `npm run ci` | green | green (exit 0) | PASS |

> The first two rows contradicted the task's own Functional criteria. Step 3 resolved this in favour
> of fail-open and rewrote §9 to stop asserting both; the three changed assertions are named there
> and at each test site. **QA confirms the resolution**: fail-open is stated four times in the task,
> and the alternative is named in Phase 3 as "the `\s` bug in a new place". Recording it here so the
> deviation is visible in the QA trail and not only in the document it corrects.

### Safety

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `evidence:` never between `security:` and `status:` | pinned by control | pinned, with evidence supplied so the fail-open half cannot mask it | PASS |
| `measured` cannot be claimed with zero probes | enforced | enforced over documented schema + on-disk corpus, incl. **uncommitted** gates | PASS |
| Addition is additive | no consumer changes | confirmed — the one mechanical reader is clause 1 | PASS |

---

## Breaking Changes Validation

### Breaking Change: three pre-existing test assertions change verdict

Documented: **Yes** (task §5, §9 correction, CHANGELOG, PR body)
Migration Path Provided: **Yes** — each changed assertion carries its reason at its own site
Migration Tested: **Yes** — 55/55 green; the `status` half re-pinned by a companion test
Consumer Code Updated: **N/A** — no external consumer reads this field yet

**Overall Breaking Changes Assessment**: PASS

---

## NFR Assessment

### Security — PASS (`evidence: measured`, `probes_executed: 15`)

This change set **is** a security-adjacent boundary: clause 1 decides whether a security surface is
re-examined unscoped. So the verdict was reached by **executing** hostile inputs, not by reading.

Fifteen probes: ten adversarial gate fixtures run against the real extracted probe — hijacked first
`status:` slot, a later NFR axis leaking its `evidence:` key into the security block, quoted values,
comment-suffixed values, missing key, absent security block, legacy PASS and FAIL gates — and five
mutations, each reverting one specific behaviour and each confirmed to redden.

**Two real defects were found this way**, both above. The end-to-end proof: the gate file for this
very review, run through the shipped probe, resolves to `OK measured` and correctly does not fire.

**What this verdict does not cover**: the probe was executed under **bash only** on this host. The
suite spawns bash; zsh was not exercised. Recorded as a future recommendation rather than hidden in
a PASS.

### Performance — PASS

The probe reads the gate once rather than piping `awk` into `grep` — one process fewer per
evaluation. Suite runtime 0.28s → 0.42s for 21 additional tests.

### Reliability — PASS

The `[ -n ] && [ -r ]` guard and `</dev/null` are preserved and still asserted by their own tests —
the hang path task.74 closed stays closed. The fail-open/fail-closed asymmetry is deliberate and
documented in three places. A missing security **block** remains a non-trigger, asserted.

### Maintainability — CONCERNS

The probe grew from 5 lines to ~25 and now carries **three** separate transit constraints — no
whole-record variable, no apostrophes, no GNU-only escapes — each held by its own test. The
structure is right, but this is near the limit of what should live as copied prose in two skill
files. If a fourth constraint appears, extract it to a script both skills invoke.

---

## Code Review

**Correctness bugs (2):** both promoted to gate `top_issues[]` — see Issues Found.

- [high/high] `shared/resources/qa-re-review-scope.md` — awk program names the whole-record variable
  → use implicit forms; pin with a test over the extracted program
- [medium/high] `shared/resources/qa-re-review-scope.md` — apostrophe in a comment closes the
  single-quoted program → reword; pin with a test

**Cleanups (2):**

- `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — two assertions used substring tests to
  back messages claiming a relationship. Caught by `tests/relationship-assertion-lint.test.js` rule
  A; both now parse markdown link targets and check membership
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — the on-disk corpus scan is **vacuous
  today** (no gate carries `evidence:` yet). The reader is therefore exercised directly against a
  violating and a conforming input, so the first real violation is not the test's first input

### Mutation-Proof Spot Check

Five mutations, all red — `mutation-proven: yes` for every defect and every new invariant:

| # | Mutation | Result |
| --- | --- | --- |
| M1 | missing `evidence:` key reads as `reasoned` | **3 tests red** |
| M2 | a gate claiming `measured` with `probes_executed: 0` | **corpus check red** |
| M3 | clause 1 narrowed back to `status` only | **4 tests red** |
| M4 | reintroduce a whole-record reference | **2 tests red** |
| M5 | reintroduce an apostrophe in a comment | **20 tests red** |

M2 initially left the suite **green** — the corpus scan used `git ls-files`, which lists only
**tracked** files, and a QA gate is written and checked *before* it is committed. The one moment the
check exists for was the moment it saw nothing. Fixed with `--cached --others --exclude-standard`;
the mutation then reddened. **This is mutation-proving finding a defect in the check itself**, which
is what it is for.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full parity suite | PASS — 55/55 (was 34 before this task) |
| `relationship-assertion-lint` | PASS — 31/31 |
| `npm run ci` (format + full suite + `eval:all`) | PASS — exit 0 |
| Bundled mirrors in 8 skills | PASS — `npm run bundle` in sync, mirrors match sources |
| Pre-existing bundler warning `shared/resources/<name> not found` | Not a regression — reproduces on a clean `develop` worktree |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/qa-re-review-scope.md`, `shared/resources/qa-gate-security-evidence.md`,
  `shared/resources/security-review-prompt.md`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-security/SKILL.md`
- `evals/shared/tests/qa-re-review-scope-parity.test.mjs`
- `CHANGELOG.md`, the task document, and 8 bundled `references/` mirrors

### Test Commands Executed

```bash
node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs   # 55/55
node --test tests/relationship-assertion-lint.test.js               # 31/31
npm run bundle                                                      # in sync
npm run ci                                                          # exit 0
```

Plus 15 direct executions of the extracted probe against adversarial gate fixtures, and 5 mutation
runs.

### Coverage Report

Not applicable — the deliverable is documentation-as-contract plus a contract test suite; the repo
runs no coverage instrumentation over `.md` sources.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. Exercise clause 1 under **zsh** as well as bash. The suite spawns bash only, and the repo already
   ships a zsh-availability helper used elsewhere. The security verdict above is explicit that this
   is uncovered.
2. If clause 1 gains a **fourth** transit constraint, extract the probe to a script both skills
   invoke rather than copy.
3. Every gate in the corpus now reads `unverified`, so every re-review fires. Correct and intended,
   but the trigger stays uninformative until adoption spreads — worth revisiting once gates carry
   the field.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Four phases delivered, five mutations proved, CI green — but QA found one HIGH and
one MEDIUM defect **in the change set itself**, and the fixes postdate the code under review. Both
are closed and pinned. CONCERNS is the honest record of a cycle that found real problems; PASS would
report the end state and erase how it was reached, which is precisely the distinction this task
exists to make.
**Quality Score**: 90/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**QA Report**: `task.82.qa.1.security-gate-evidence-field.md`
**Gate File**: `task.82.gate.1.security-gate-evidence-field.yml`
**Next Steps**: No fix cycle required — both findings are closed. Proceed to Step 5c (`/review-pr`).
