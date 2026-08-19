# QA Report: Task 54 — Intercept GitHub board mutations, and give `gh-stage.js` a credential-free plan

**Task**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)
**Gate File**: [task.54.gate.1.github-board-interception.yml](./task.54.gate.1.github-board-interception.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-19
**PR**: [#255](https://github.com/Gamaroff/agent-skills/pull/255) (OPEN → `develop`)
**Gate Status**: FAIL

---

## Executive Summary

The interception this task set out to build is correct, well tested and honestly documented. All six
plan items landed, 25 new tests were added, and each of six invariants was watched failing. The
implementation also self-corrected the stalest part of its own plan — item 2 was re-scoped when the
review found task.53 had already landed that half.

It fails the gate on something none of that touches: **the three shell files that now depend on
`defer-mutation.js` do not name it in a form the bundler can follow**, so 17 of 35 installed skills
do not have it. In 11 of those, the board helpers stop writing under `full` mode — a regression in
capability that predates this task and has nothing to do with access control.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — one HIGH issue, fix is small and well-understood

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (14 sections, card preflight green)
- [x] All 11 implementation-plan checkboxes marked complete
- [x] Tests passing
- [x] Breaking changes — none declared, and none found
- [x] Code on feature branch with open PR #255

### Testing Approach

- [x] Automated testing (unit, integration, contract)
- [x] Regression testing (bundled-copy behaviour vs in-tree)
- [x] Security review
- [x] Code review (diff, Step 3b)
- [ ] Performance testing — not applicable; no hot path touched
- [ ] Manual testing — not applicable; CLI/library change

### Review Methodology

**Direct tools.** The Adaptive Review Strategy nominates parallel agents for this shape of task
(6 items, multiple modules), and Step 3b nominates a read-only Explore subagent for the diff review.
Session policy prohibits unrequested subagent dispatch, so both were performed directly instead.

This is a real methodological deviation and worth naming: a subagent reviewing the diff would have
come to it cold, whereas the direct review was performed with knowledge of how the code was written.
That is a weaker adversarial position. It was mitigated by reviewing against *observable behaviour*
rather than intent — every finding below was reproduced by running the code, not inferred by reading
it, and both were found by probing flag combinations and installed-artifact state rather than by
re-reading the implementation.

---

## Implementation Verification

| Phase | Status | Verification | Notes |
| ----- | ------ | ------------ | ----- |
| 1. `gh-stage.js --print-plan` | **CONCERNS** | Present at `:844-894`, above `ghAvailable` (`:1054`); runs under `env -i` with no `gh` and `HOME=/nonexistent` | Works as specified. Validation bypass — BUG-2 |
| 2a. Board add in the deferred record | PASS | `desired.onBoard`, `intent`, `manual.ui`, `command.argv` all reflect `--add-to-board`; asserted both ways | |
| 2b. Credential-free `verify.cmd` | PASS | Uses `--print-plan`; the recorded command was executed with no credentials and exited 0 | |
| 3. Two `.sh` guards | **FAIL** | Gates present and correct in-tree; proven to issue no `gh` write verb under `manual` | Broken once bundled — BUG-1 |
| 4. `tracker_write` + alias + banner | **FAIL** | Correct in-tree in both bash and zsh; alias behaves identically; retry ladder intact | Cannot record once bundled — BUG-1 |
| 5. `finalise` `deferred` row | PASS | Row added; reuses the `not-on-board` escalation; requires the record id | |
| 6. Tests, docs, bundle | PASS | 25 new tests; 6 invariants mutation-proved; 5 docs updated; bundle committed | |

**Overall Phase Completion**: 4/6 pass, 1 concerns, 1 fail — but note both failures share the single
root cause in BUG-1.

### Verification that the phases are real work, not restatement

Each item was checked against the tree at the merge base, to confirm it was genuinely absent before:

| Item | Pre-change state | Verdict |
| ---- | ---------------- | ------- |
| `--print-plan` | `grep -c printPlan gh-stage.js` → **0** | genuinely new |
| `.sh` guards | neither file referenced `ACCESS_TRACKER` or `defer` | genuinely new |
| `tracker_write` | only `tracker_call_with_retry` existed | genuinely new |
| `finalise` `deferred` | reason table had no such row | genuinely new |

---

## Test Results

| Suite | Result |
| ----- | ------ |
| `npm test` — JS (`node --test`) | **1441 passed, 0 failed** |
| `npm test` — `tracker-access.test.sh` | **401 passed, 0 failed** |
| `npm test` — `resolve-platform.test.sh` | 6 passed, 0 failed |
| `npm test` — remaining shell suites | 6 / 3 passed, 0 failed |
| `npm run validate:all` | **115 passed, 0 failed** |

### Mutation-proving (developer-run, QA-verified by re-reading the recorded outcomes)

Six invariants, each watched failing:

| Mutation | Expected red | Observed |
| -------- | ------------ | -------- |
| `--print-plan` moved below the auth gate | source-order test | ✅ 4 failed |
| `verify.cmd` reverted to `--dry-run` | credential-free tests | ✅ 2 failed |
| `--add-to-board` dropped from replay argv | board-add test | ✅ 1 failed |
| `tracker_call_with_retry` alias removed | alias test | ✅ 1 failed |
| Priority helper's gate short-circuited | no-write-verb test | ✅ 1 failed |
| Coverage banner reverted | banner assertions | ✅ 5 failed |

This is the strongest evidence in the change set, and it is why the gate is FAIL rather than
something worse: the tests that exist are load-bearing. The defect is in a dimension **none of them
covers** — the state of the bundled artifact, as opposed to the source.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| `--print-plan` works with no credentials/network, agrees with `--dry-run` | Yes | Verified under `env -i`; `would` ∈ `targets` asserted | PASS |
| No `gh` write verb under a deferring mode | 0 verbs | Proven with a stub that exits 99 on any write verb | PASS |
| All 4 board kinds record legibly, naming the real column | 4/4 | Status, add-to-board, Priority, Estimate | PASS (in-tree) |
| Record with `--add-to-board` names the board add | Yes | `desired.onBoard: true` + argv preserved | PASS |
| Every `verify.cmd` runs with no `gh` auth | Yes | Executed the recorded command with no credentials | PASS |
| Coverage banner names what is gated and what is not | Yes | Both directions asserted, plus a stale-claim guard | PASS |
| `tracker_call_with_retry` still works under its old name | Yes | Alias test, both shells | PASS |
| `finalise` treats `deferred` as recorded, escalates existing path | Yes | Row + escalation, record id mandatory | PASS |
| **`full` mode byte-identical; existing suite green unchanged** | Yes | **Violated — see BUG-1**; and one banner assertion was rewritten | **FAIL** |
| `--print-plan` documented alongside the Jira one | Yes | `tracker-workflow.md` GitHub section rewritten | PASS |
| `tracker_write` documented in the resolver spec, with the alias's reason | Yes | New section in `platform-detection.md` | PASS |
| Every invariant watched failing; suites green; bundle committed | Yes | 6/6; green; committed | PASS |

On the one rewritten assertion: `tracker-access.test.sh`'s `"names GitHub as a gap"` asserted the
banner's claim that *all* GitHub issue and PR writes proceed normally — a fact this task deliberately
falsified. Rewriting it was correct, and it was replaced with four assertions plus a guard against
the stale claim returning. Recorded here so the "unchanged" criterion is not read as unqualified.

---

## Breaking Changes Validation

None declared. Confirmed by inspection: `--print-plan` and `--resolve-access` are additive flags;
`tracker_write` is a rename with the old name aliased and tested; the `deferred` reason is a new row
in a table whose catch-all already handles unknown values.

The one **undeclared** breaking change is BUG-1 — board writes stopping under `full` in 11 skills.
It is unintended, which is why it is filed as a defect rather than a documentation gap.

**Assessment**: FAIL (via BUG-1)

---

## Issues Found

### HIGH Severity (1)

**`defer-mutation.js` is not bundled beside the three shell files that now require it**

- **Severity**: HIGH · **Priority**: P0 · **Category**: Functional / Packaging
- **Bug Report**: [task.54.bug.1.defer-writer-not-bundled.md](./task.54.bug.1.defer-writer-not-bundled.md)
- **Observation**: 17 of 35 bundled skills have the new `resolve-platform.sh` with no
  `defer-mutation.js` beside it; 11 bundled copies of the board helpers likewise.
- **Impact**: The helpers exit before their graphql call when the writer is absent, and that branch
  does not check the access mode — so board Priority/Estimate writes silently stop under **`full`**.
  Separately, `tracker_write` cannot record a deferral in any of the 17, leaving the audit gap this
  sequence exists to close.
- **Root cause**: The bundler's shell transitive-dep rule follows only `source`/`exec` of a sibling
  `.sh`. Discovery of a sibling `.js` falls to the literal string `shared/resources/<file>`.
  `jira-sprint-lib.sh:32` names it and is bundled correctly; these three do not and are not.
- **Recommendation**: Name the path literally in each file, re-bundle, and add a co-location
  assertion to `jira-interception.test.mjs` §12 so a later cleanup cannot silently delete the comment.

### MEDIUM Severity (1)

**`--print-plan` skips moment validation when combined with `--probe-board` / `--check`**

- **Severity**: MEDIUM · **Priority**: P2 · **Category**: Functional
- **Bug Report**: [task.54.bug.2.print-plan-skips-moment-validation.md](./task.54.bug.2.print-plan-skips-moment-validation.md)
- **Observation**: `--probe-board --stage nonsense --print-plan` returns
  `{"enabled": false, "targets": null}` exit 0 instead of the "unknown moment" error; `--stage DONE`
  echoes `"DONE"` rather than the canonical `"done"`.
- **Impact**: That payload is identical to a legitimately disabled moment, so a typo reads as
  "switched off" and the board move is silently dropped from a checklist — the failure mode this task
  exists to remove, reintroduced through a flag combination. `--check` is the documented CI mode, so
  the combination is plausible in a script.

### LOW Severity (0)

None.

**Total**: HIGH 1 · MEDIUM 1 · LOW 0

---

## NFR Assessment

### Security — PASS

Fail-closed throughout, and consistently: an unreadable config resolves to `manual`; an unrecognised
mode exits 2 rather than defaulting to `full`; a journal that cannot be written never falls through
to performing the mutation. `--resolve-access` correctly refuses a typo with exit 2 and prints
nothing on stdout, so a shell caller's `|| MODE=manual` fail-closes rather than consuming a guess.
No new credential handling; redaction paths untouched.

### Performance — PASS

`--print-plan` replaces a network round-trip with a single config read. `tracker_write` adds one
string comparison per call on the full-mode path — the mode resolution happens once at source time,
not per call — and spawns `node` only when actually deferring.

### Reliability — FAIL

BUG-1. Beyond the packaging gap itself, the missing-writer branch in the board helpers is
disproportionate: it refuses the write *before* establishing that any restriction is in force, so an
absent dependency degrades unrestricted behaviour. A correct fail-closed design here would resolve
the mode first and demand the writer only when the mode is not `full`.

### Maintainability — PASS

Comments explain constraints that are genuinely non-obvious — why the gate sits where it does, why
zsh word-splitting matters, why the alias must survive a cleanup — rather than restating the code.
The two portability bugs found during development were each converted into a permanent test running
under both shells, which is the right response. `EXPECTED_KIND_COUNT` friction worked exactly as its
comment says it should.

---

## Code Review

Diff reviewed at `origin/develop...HEAD` (146 files; 21 hand-written, 125 bundler output).

**Correctness bugs (2):**

- [high/high] `shared/resources/{resolve-platform.sh,set-github-project-priority.sh,set-github-project-estimate.sh}` — sibling `defer-mutation.js` dependency is invisible to the bundler → 17 skills lack it; board writes stop under `full` in 11 → name the path literally, per `jira-sprint-lib.sh:32`. **Promoted to gate `top_issues` as TASK-54-BUG-1** (`code_review_blocking=true`).
- [medium/high] `shared/resources/gh-stage.js:797-844` — `--print-plan` sits below the `if (!args.probeBoard)` validation block, so `--probe-board`/`--check` bypass both the `MOMENTS` check and the lowercase canonicalisation → validate on the `--print-plan` path itself. **Promoted to gate `top_issues` as TASK-54-BUG-2.**

**Cleanups (2):**

- `shared/resources/resolve-platform.sh:558-578` — the argv kind-inference `case` includes `github.issue.create` and `github.pr.create`, which the task explicitly documents as *not* wrapped (their stdout is consumed). Harmless and arguably defensive, but a reader comparing the code to the docs will stumble → add a one-line comment saying the entries are deliberate belt-and-braces for a caller that wraps one anyway.
- `shared/resources/resolve-platform.sh:591-596` — the three deferral messages differ only in their tail. Minor, and the current form is easier to read than a parameterised version would be → no action recommended; noted only for completeness.

Both bugs were reproduced by execution, not inferred from reading.

---

## Regression Testing

| Area | Method | Result |
| ---- | ------ | ------ |
| `full`-mode behaviour, in-tree | `tracker_write` runs the command; retry ladder 3× with the wrapped exit code | PASS |
| `full`-mode behaviour, **bundled** | Ran a bundled board helper with a stubbed `gh`, no restriction set | **FAIL** — exits before the write (BUG-1) |
| Alias compatibility | `tracker_call_with_retry` in both bash and zsh | PASS |
| Existing gate behaviour (task.53) | `stage-access-gate.test.mjs` 30/30 | PASS |
| Roster totality | `handover-render.test.mjs` 47/47 after adding the 22nd kind + renderer + fixture | PASS |
| Config parity (task.61) | `access-config-parity.test.mjs` green | PASS |
| Cross-skill: everything sourcing `resolve-platform.sh` | `validate:all` 115/0 | PASS |

The bundled-vs-in-tree comparison is the check that found BUG-1, and it is the one the existing
suite does not perform.

---

## Test Artifacts

### Files reviewed

`shared/resources/{gh-stage.js, defer-mutation.js, handover-render.js, resolve-platform.sh,
set-github-project-priority.sh, set-github-project-estimate.sh, tracker-access-record.md,
platform-detection.md}`, `skills/finalise/SKILL.md`, `docs/reference/{tracker-workflow,
troubleshooting, configuration}.md`, `CHANGELOG.md`, and the four test files.

### Commands executed

```bash
npm test                       # 1441/0 JS; 401/6/6/3 shell
npm run validate:all           # 115/0
npx prettier --check .
node shared/resources/gh-stage.js --stage done --print-plan          # under env -i, no gh, no HOME
node shared/resources/gh-stage.js --probe-board --stage nonsense --print-plan   # → BUG-2
PATH=$STUB:$PATH bash skills/sync-github-task/references/set-github-project-priority.sh 232 high  # → BUG-1
for f in skills/*/references/resolve-platform.sh; do [ -f "$(dirname $f)/defer-mutation.js" ] || echo MISSING; done
```

---

## Recommendations

### Immediate (blocking)

1. **TASK-54-BUG-1** — name `shared/resources/defer-mutation.js` literally in the three shell files,
   re-run `npm run bundle`, and add a co-location assertion to `jira-interception.test.mjs` §12.
2. **TASK-54-BUG-2** — validate the moment on the `--print-plan` path; assert exit 2 for an unknown
   moment with `--probe-board` present.

### Short-term (non-blocking)

1. Consider making the board helpers' missing-writer branch proportionate — resolve the mode first,
   demand the writer only when a restriction is in force.
2. Consider a bundler rule for `node "$(dirname …)/x.js"` in shell files, so the next shell→JS
   runtime dependency does not rely on someone remembering the comment convention.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Rationale**: The work is good and the testing discipline behind it is better than most — six
invariants each watched failing is not a box-ticking exercise. The gate fails on a packaging defect
that the source-level suite is structurally incapable of catching: every test runs against
`shared/resources/`, and the defect exists only in `skills/*/references/`. That the same class of
hazard is documented twice in this very codebase — in `defer-mutation.js`'s header and in
`jira-sprint-lib.sh:32` — is what makes it a HIGH rather than a footnote: the precedent was written
down, and not followed.

Both fixes are small and well understood. A re-review should be quick.

---

**Next Steps**: `/qa-fix` against
[task.54.gate.1.github-board-interception.yml](./task.54.gate.1.github-board-interception.yml), then
re-run `/qa-task`.
