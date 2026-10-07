# QA Report: Task 158 - QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment

**Task**: [task.158](./task.158.cycle-file-and-containment-definitions.md)
**Gate File**: [task.158.gate.1.cycle-file-and-containment-definitions.yml](./task.158.gate.1.cycle-file-and-containment-definitions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered, and each mechanism holds under its tests, under mutation, and under
bash and zsh execution of the changed blocks. The diff review found one medium correctness bug
(CR-1). `grant-qa-cycles.sh` is the writer the resume contract calls next, and it keeps its own
cycle definition, which crashes on a zero-padded gate. That makes this branch's new "only definition"
claim false. `code_review_blocking=true` puts CR-1 in `top_issues[]`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (22/22 plan items)
- [x] Tests passing
- [x] Breaking changes documented (None — exit contract unchanged)
- [x] Code on feature branch with open PR (#521, OPEN)

### Testing Approach

- [x] Automated Testing (unit, fixture, eval rows)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (Step 3b, read-only subagent)

### Review Methodology

First review (no prior gate), so there is no re-review scope. Direct tools were used, plus the Step 3b
code reviewer as one read-only Explore subagent over the whole branch diff. That diff excluded bundled
`references/` copies and work-item docs: 884 lines, 15 files. The reviewer was dispatched at
13:14Z and returned at 13:17Z. The traceability matrix came from the pipeline's mapper and was used
for success-criteria mapping.

**Step 4b:** runnable prose is in the change set (both QA `SKILL.md`s and three step docs).
`qa-execute-snippets.mjs` ran over all five files and executed **no changed block**. Every changed
block was refused `mutating` on `unrecognised-command: bash (fail-closed)`, and the Step 13b / Step 7
blocks on `write-redirection`.

| File | Runnable | Placeholder | Mutating |
| --- | --- | --- | --- |
| qa-task | 0 | 3 | 15 |
| qa-story | 0 | 4 | 13 |
| step-5-6 | 1 | 1 | 19 |
| resume-contract | 2 | 8 | 20 |
| step-7 | 0 | 2 | 9 |

The engine's `zero-blocks-executed` (medium) findings on qa-task, qa-story and step-7 concern the
unchanged placeholder blocks, and are recorded here rather than bound, because none of those blocks
is in the diff. The changed blocks are executed instead by:

1. `evals/shared/tests/optional-file-lookups.test.mjs`. It slices each moved block's live text and
   runs it under bash and zsh, with the file absent and with `.9`/`.19` present: **90/90 pass**.
2. The Step 3 run recorded in the implementation report, which used a `gate.02` + HIGH fixture, an
   ambiguous pair and an empty directory.

---

## New Findings This Cycle

First review — every finding below is new.

- **[medium]** `shared/resources/grant-qa-cycles.sh:108` — second cycle definition; crashes on
  `gate.08` (CR-1, reproduced; [bug report](./task.158.bug.1.grant-qa-cycles-second-cycle-definition.md)).
- **[low]** `shared/resources/develop-pipeline-resume-contract.md:431` — `2>/dev/null` hides a
  missing-directory refusal, so it reads as a fresh start (CR-2, advisory).
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the prose says a directory is
  never a candidate; `qa-cycle.sh` cycle mode counts one (CR-3, cleanup).
- **[low]** `shared/resources/tests/security-probe.test.mjs` — the `..name` fake-gh test writes a directory
  at the live repo root (CR-4, cleanup).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Read-back requires this cycle's links | PASS | Verified | 6 new read-back tests (task/story stale HALT, re-linked, bare, #fragment); `resolved[]` test |
| Phase 2: One definition for the cycle's gate file | CONCERNS | Verified | Six named sites moved; guard extended. `grant-qa-cycles.sh` (same procedure) not moved — CR-1 |
| Phase 3: One containment predicate per module system | PASS | Verified | parity table; `..name` entry/fake-gh accepted; root/`../x` refused |
| Phase 4: Docs and bundle | PASS | Verified | CHANGELOG `(task 158)`; `bundle:check` clean |

**Overall Phase Completion**: 4/4 delivered; 1 with an open finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| SC1 cycle-2 stale doc → exit 1 naming both; re-linked → 0 (task+story) | yes | 4 tests + bare/#fragment | PASS |
| SC2 Step 13b THIS_GATE names gate.02, BLOCKING_COUNT 1 | yes | executed-prose run (bash+zsh); eval row `.19 beats .9` through the block | PASS |
| SC3 resume reconstructs 2 from gate.02, 0 from empty | yes | eval rows (empty → 0, `.19` → 19 via numberOnly); executed-prose | PASS |
| SC4 `--entry` accepts `..name`; refuses root, `../x`, outside absolute | yes | new resolveEntry test; probe run | PASS |
| SC5 guard + parity < 1 s, file reads only | yes | both run in-process over file reads; no timing assertion | PASS (inspection) |
| SC6 no new spawn beyond one qa-cycle.sh call per block | yes | two calls (cycle, then `--path`) in Phase 0 / 13b / step-5-6 | CONCERNS (LOW) — see note |
| SC7 guard zero hits on shipped; ≥1 per old shape | yes | `GATE_SELECTION` fixtures test | PASS |
| SC8 one ESM + one CJS isWithin, parity; copies removed | yes | parity test; `grep -c 'function isWithin' shared/resources/qa-read-back.js` → 0 | PASS |
| SC9 every new assertion mutation-proved | yes | M1–M10 (develop), Q1–Q2 (this cycle) | PASS |
| SC10 `npm run ci` clean | yes | not yet run (merge gate) | NOT RUN |
| SC11 validate qa-task / qa-story | clean | `npm run validate -- skills/qa-task/` ✓, `-- skills/qa-story/` ✓ | PASS |
| SC12 CHANGELOG cites (task 158) | yes | present | PASS |
| SC13 qa-cycle.sh header "only definition" + finalise exception | yes | present — but the claim is false while CR-1 stands | CONCERNS |

> **SC6 note.** Each moved block makes two helper calls, cycle mode then `--path`, where the
> criterion says one. The second call is what separates "no gate" from "two files claim the cycle"
> (review I-2), and it costs one `bash` fork. Recorded as LOW and not raised as an issue. The
> criterion's wording predates I-2.

---

## Breaking Changes Validation

### Breaking Change: None declared

A stale-link document goes from `qa-read-back.js` exit 0 to exit 1, which is the intended fix. The
`security-probe.mjs` CLI is unchanged. It now accepts `..name`, and also a literal name such as
`..%2f..%2fx.mjs`, which the bare `startsWith("..")` rejected by accident. The import of that
literal in-root file was verified: `pathToFileURL` does not decode `%2f`.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: grant-qa-cycles.sh keeps a second cycle definition**

- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.158.bug.1.grant-qa-cycles-second-cycle-definition.md](./task.158.bug.1.grant-qa-cycles-second-cycle-definition.md)
- **Observation**: With a `gate.08` fixture, `qa-cycle.sh` reads 8, and
  `grant-qa-cycles.sh … 2` dies at line 146 with `08: value too great for base` and records no grant.
- **Provenance**: the script is unchanged by this branch, so the crash is identical on `develop`.
  It is attributed here because this branch's header and CHANGELOG claim the helper is the only
  definition for the resume procedure, and the guard does not scan scripts.
- **Recommendation**: take the base from `qa-cycle.sh`, add a zero-padded test, and widen the
  guard's population to shell helpers.
- **Priority**: P2

### LOW Severity Issues (3)

CR-2, CR-3 and CR-4, and SC6 — see New Findings and the gate's `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4

---

## NFR Assessment

### Performance — PASS

There is one `qa-cycle.sh` fork per changed lookup, or two where the ambiguity split needs it. The
guard and parity tests read files only.

### Reliability — CONCERNS

CR-1: the loop-limit re-entry path crashes on a zero-padded gate. Everything else in the resume
procedure now reads it correctly.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 22 — two runs on the `path` sink, 11 each, taken from the run records' `totals.executed`:
  - [`task.158.qa.1.security.entryAccepted.run.json`](./task.158.qa.1.security.entryAccepted.run.json)
  - [`task.158.qa.1.security.cjsWithin.run.json`](./task.158.qa.1.security.cjsWithin.run.json)
- The adapter is `.claude/state/t158-probe-adapter.mjs`, which only routes candidates.
- The engine's verdict for both runs is `present-but-inert`. Each mismatch was examined and none is a
  defect:
  - `entryAccepted` `path.encoded-traversal` accepted: a literal in-root filename. The import of the
    literal file was verified.
  - `entryAccepted` `path.symlink-escape` accepted: the documented pre-import limit in
    `probe-boundary-rule.md`. This is pre-existing, and the base code accepts it too.
  - `cjsWithin` `absolute`, `empty` and `null-byte` accepted: the adapter joins each candidate under
    the root, so an absolute path is re-rooted, the empty path is the root itself (callers refuse
    root separately — see `=== root` at both probe sites), and `isWithin` is pure path arithmetic
    that never opens a file. The parity table tests an absolute child directly (`/x/y` → false).

### Maintainability — PASS

One CJS and one ESM predicate are held by a parity test. The guard has shipped-shape fixtures. The
bundled-helper population is derived from the tree.

---

## Code Review

Blocking resolved `true` (`code_review_blocking=true` from the pipeline; there is no frontmatter opt-out).
The reviewer read 15 files (884-line patch) and returned 4 findings.

**Correctness bugs (2):**

- [medium/high] `shared/resources/develop-pipeline-resume-contract.md:431` → `grant-qa-cycles.sh:108` —
  the re-entry writer keeps its own cycle sed; it breaks on `gate.08`. **Promoted to gate `top_issues[]` as CR-1.**
- [low/medium] `shared/resources/develop-pipeline-resume-contract.md:433` — rc 1 conflates "no gate"
  with "no directory" under `2>/dev/null` (CR-2, advisory).

**Cleanups (2):**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:209` — the prose says a directory or dotfile is never a
  candidate; cycle mode has no `-f` check (CR-3).
- `shared/resources/tests/security-probe.test.mjs:637` — the fake-gh `..name` fixture is written into
  the live repo root (CR-4).

**Boundary rule:** fires. The change set delivers two containment predicates, the `security-probe`
`--entry` / `--fake-gh` refusals and the CJS `isWithin`. Both were probed, with 22 executions (see
Security).

**Platform variance:** the new tests pass `mkdtempSync(tmpdir())` roots to `resolveEntry` and
`isWithin`, which are pure path arithmetic with no ephemeral-root refusal. They were run once under
`TMPDIR=/tmp` with the same result (see Test Commands).

**Mutation spot checks (this cycle):**

```markdown
mutation-proven: resume contract `QA_CYCLE=${QA_CYCLE:-0}` → `:-1` → optional-file-lookups resume rows (absent reads "0") red 2/4 → covered
mutation-proven: qa-task Step 13b THIS_GATE → lexical `ls | sort | tail -1` → optional-file-lookups THIS_GATE `.19 beats .9` rows red 2/4 → covered
```

Develop's M1–M10 are recorded in the implementation report (M7 reached `covered` after its assertion
was tightened).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `qa-read-back` existing HALT/clean table (task + story) | PASS (31/31) |
| `doc-links` resolver/corpus guard | PASS (24/24) |
| `security-probe` suite | PASS |
| `qa-cycle` suite incl. same-block and path-form guards | PASS (53/53) |
| optional-file-lookups (all swept sites, bash+zsh) | PASS (90/90) |
| full `npm run ci:fast` (develop Step 3, same tree) | PASS — 4508 tests, 0 fail |

---

## Test Artifacts

### Files Reviewed

`shared/resources/{qa-read-back.js,doc-links.js,security-probe.mjs,qa-cycle.sh,grant-qa-cycles.sh}`,
the three step docs, `skills/qa-{task,story}/SKILL.md`, and the four test files plus the eval.

### Test Commands Executed

```bash
node --test shared/resources/tests/qa-read-back.test.mjs shared/resources/tests/doc-links.test.mjs \
  shared/resources/tests/security-probe.test.mjs tests/qa-cycle.test.js \
  evals/shared/tests/optional-file-lookups.test.mjs            # 289/289, rc 0
npm run validate -- skills/qa-task/                             # ✓
npm run validate -- skills/qa-story/                            # ✓
node shared/resources/qa-execute-snippets.mjs --file <each of 5 changed files> --json
node shared/resources/security-probe.mjs --sink path --entry '.claude/state/t158-probe-adapter.mjs#entryAccepted' ...
node shared/resources/security-probe.mjs --sink path --entry '.claude/state/t158-probe-adapter.mjs#cjsWithin' ...
bash shared/resources/grant-qa-cycles.sh <gate.08 fixture> 2 <report>   # CR-1 reproduction
TMPDIR=/tmp node --test --test-name-pattern='task\.158|isWithin parity|resolved\[\]|cycle-2|re-linked|bare \(no|#fragment' \
  shared/resources/tests/security-probe.test.mjs shared/resources/tests/doc-links.test.mjs \
  shared/resources/tests/qa-read-back.test.mjs                  # platform variance: 10/10
```

### Coverage Report

This repository records no line coverage for its Node test runner. The traceability matrix at
`.summaries/qa-traceability-matrix.md` maps every success criterion.

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1 — `grant-qa-cycles.sh` asks `qa-cycle.sh`. Add a zero-padded test and widen the guard population to shell helpers.

### Short-term Actions (Non-Blocking)

1. CR-2: check `{doc-directory}` exists (or keep stderr) before reading rc 1 as a fresh start.
2. CR-3: align the step-5-6 prose with `qa-cycle.sh` cycle mode, or add the regular-file check there.
3. CR-4: give the fake-gh `..name` test a disposable `repoRoot`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings. One medium, high-confidence correctness finding is promoted under
`code_review_blocking`, and the reliability NFR is CONCERNS for the same reason.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed

---

**QA Report**: co-located at `task.158.qa.1.cycle-file-and-containment-definitions.md`
**Gate File**: co-located at `task.158.gate.1.cycle-file-and-containment-definitions.yml`
**Next Steps**: `/qa-fix` for CR-1 (the develop-task pipeline's 5b), then QA cycle 2.
