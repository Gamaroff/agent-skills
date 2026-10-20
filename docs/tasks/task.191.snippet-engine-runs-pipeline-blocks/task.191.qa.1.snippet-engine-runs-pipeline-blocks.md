# QA Report: Task 191 - Snippet engine runs pipeline blocks

**Task**: [Link to task document](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Gate File**: [task.191.gate.1.snippet-engine-runs-pipeline-blocks.yml](./task.191.gate.1.snippet-engine-runs-pipeline-blocks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: FAIL

---

## Executive Summary

All four phases are implemented, the suite and PR CI are green, and the four develop-time mutation proofs hold. The widened safety boundary does not: three block shapes classify `runnable` and run code the helper rule never read (`BASH_ENV`, unscanned arguments to a sourced function, conditionally-defined names), and the callers pass a two-dot `--diff-base`.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (18 checkboxes ticked)
- [x] Tests passing (`npm run ci:fast` 5846/0; engine suite 154 pass, 8 zsh-skipped)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#687, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine + hand reproduction)
- [x] Code Review

### Review Methodology

Direct tools plus one diff reviewer (Explore). Rationale: four phases, one module, Medium risk — default strategy. The first reviewer dispatch stopped before verifying anything and returned an explicitly INCOMPLETE empty list; it was re-dispatched once with neutral wording and returned a full review (dispatched 05:00Z; second run `duration_ms` 259550). Independence kept: the second reviewer did not write the code.

Step 4b ran over all three changed prose files (see Step 4b below). First review — no re-review scope line.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: `--slot` | PASS | Verified | Slot filled before classification (mutation-proven at develop) |
| Phase 2: Helper calls | FAIL | Verified, holes | QA-1, CR-1, CR-3 — fail-opens; QA-2 — boundary not probeable |
| Phase 3: `--diff-base` | CONCERNS | Verified | CR-4 (coloured diff reads empty); revision refusal probed: engages |
| Phase 4: Callers, docs | FAIL | Verified | CR-2 two-dot base; CR-5/CR-7 advisory |

**Overall Phase Completion**: 4/4 implemented; 1/4 passed clean.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| `{NAME}` runs with `--slot`, placeholder naming it without | PASS | `T191 --slot: a {NAME} block runs with the slot filled…` |
| Slot value adding a write → mutating | PASS | `T191 --slot: a slot value that adds a write is refused…` |
| bash/source of a runnable helper runs; sourced functions recognised | PASS | `T191 helpers: bash / source of a runnable helper…` |
| Writing helper, variable path, escape, depth-2, cd — refused | CONCERNS | Test holds the named controls; QA-1/CR-1/CR-3 are shapes outside them that run |
| Shipped helpers classify as stated in helper mode | PASS | `T191 helpers: in helper mode the shipped read-only helpers…` |
| `--diff-base` counts changed blocks apart; finding when none ran | PASS | `T191 --diff-base: changed blocks are counted apart…` (CR-4 is a config-dependent hole) |
| Step 4b / Phase 1.7 pass `--diff-base`, report `changed` first | CONCERNS | Parity test holds; CR-2 — the value passed is the wrong base |
| `npm test`, `bundle:check`, `prettier --check` | PASS | ci:fast 5846/0; bundle:check 0 problems |
| `quick_validate.py` qa-task / qa-story | PASS | both ✓; `npm run validate -- skills/qa-task/` and `skills/qa-story/` exit 0 |
| CHANGELOG entry | PASS | `[Unreleased]` › Changed, names all three |

---

## Breaking Changes Validation

None declared; every flag is opt-in. Classification without flags is unchanged except the slot reason lists the slots and the `zero-blocks-executed` remedy names `--slot` — the one pinned test (`bug.7: …`) was updated. **PASS**.

---

## Issues Found

### HIGH Severity Issues (3)

- **QA-1** — [task.191.bug.1](./task.191.bug.1.helper-call-runs-the-file-bash-env-names.md): `BASH_ENV=h/write.sh bash h/read.sh` classifies runnable and prints `UNVETTED-RAN`; develop refuses it. Exported `SHELLOPTS`+`PS4` also runs through the helper path.
- **CR-1** — [task.191.bug.2](./task.191.bug.2.sourced-function-arguments-never-scanned.md): `newest_numbered docs dod -delete` after sourcing `newest-numbered.sh` → runnable (`find … -delete`). Reproduced.
- **CR-2** — [task.191.bug.3](./task.191.bug.3.diff-base-tip-is-two-dot-against-the-working-tree.md): callers pass `origin/<base>`, two-dot against the working tree.

### MEDIUM Severity Issues (3)

- **CR-3** — [task.191.bug.4](./task.191.bug.4.sourced-helper-names-trusted-conditionally-and-out-of-order.md): `if false; then mv() {…}; fi` trusts `mv`, before or after the `source`. Reproduced both orders.
- **CR-4** — [task.191.bug.5](./task.191.bug.5.git-diff-honours-user-config-and-reads-empty.md): `color.diff=always` → `parseDiffRanges` returns `[]` for a 4-hunk diff. Reproduced.
- **QA-2** — [task.191.bug.6](./task.191.bug.6.classifier-verdict-not-probeable.md): `classifyBlock` cannot be scored by any probe entry form.

### LOW Severity Issues (4, advisory)

CR-5 (`$SKILL_FILE` unbound in the rewritten block), CR-6 (pure deletion after a fence marks the block changed), CR-7 (rule doc's permissiveness claim, follows CR-1/CR-3), CR-8 (untracked file under `--diff-base` reports nothing).

**Total Issues**: HIGH: 3, MEDIUM: 3, LOW: 4

---

## NFR Assessment

### Performance — PASS
Helper classification bounded at depth 2; one `git diff` per file.

### Reliability — CONCERNS
CR-4: a failed read of the change set reads as an empty one.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 35 (copied from `task.191.qa.1.security.run.json` `totals.executed`)
- `boundary: true` — `classifyBlock` / `resolveHelperCall` decide what executes. Control **`qa-execute-snippets --diff-base revision refusal`** (`cli:` form, `shell-exec` hostiles + 4 option-injection cases + 4 real revisions): **engages**, 0 reproduced; `--output=/tmp/pwn191` wrote nothing. The classifier itself is not reachable by an entry form (QA-2). QA-1, CR-1 and CR-3 are fail-opens reproduced by hand; provenance: develop refuses all three (`unrecognised-command: bash|source`), so all are new.

### Maintainability — PASS
One engine call shared by both callers, held by the parity test; rule stated once in the rule doc.

---

## Code Review

**Correctness bugs (7):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1550` — CR-1, sourced-function arguments never scanned → promoted to `top_issues` (CR-1)
- [high/high] `skills/qa-task/SKILL.md:906` — CR-2, two-dot `--diff-base` → promoted (CR-2)
- [medium/high] `shared/resources/qa-execute-snippets.mjs:1534` — CR-3, conditional/out-of-order defines trusted → promoted (CR-3)
- [medium/high] `shared/resources/qa-execute-snippets.mjs:1913` — CR-4, user git config → promoted (CR-4)
- [low/medium] `skills/qa-task/SKILL.md:907` — CR-5, `$SKILL_FILE` unbound → future
- [low/medium] `shared/resources/qa-execute-snippets.mjs:1936` — CR-6, deletion hunk marks next block → future
- [low/medium] `shared/resources/qa-runnable-prose-detection.md:207` — CR-7, permissiveness claim → follows CR-1/CR-3

**Cleanups (1):**
- `shared/resources/qa-execute-snippets.mjs:17` — CR-8, note an untracked file under `--diff-base`

All 8 anchors checked by `finding-anchors.js --rev HEAD`: `ok`.

**QA's own findings:** QA-1 (above), QA-2 (above). Pre-existing, out of scope (develop identical): `PS4='$(cmd)'; set -x; ls` runs `cmd` → `recommendations.future`.

**Boundary:** `true`, `probes_executed: 35`.

mutation-proven: drop `rev.startsWith("-")` in `changedLineRanges` (scratch worktree) → `T191 --diff-base: a bad revision is exit 2…` → covered

### Step 4b — documented commands

Run: `qa-execute-snippets.mjs --file <f> --diff-base origin/develop --copy-as skills:.agents/skills --json` (symlinked layout).

| File | changed (total/executed) | runnable / placeholder / mutating | Findings |
| ---- | ------------------------ | --------------------------------- | -------- |
| `skills/qa-task/SKILL.md` | 1 / 0 | 1 / 4 / 17 | `changed-blocks-not-executed` (medium, advisory): line 903 — `unrecognised-command: node` |
| `skills/qa-story/SKILL.md` | 1 / 0 | 1 / 5 / 15 | `changed-blocks-not-executed` (medium, advisory): line 1303 — `unrecognised-command: node` |
| `shared/resources/qa-runnable-prose-detection.md` | 0 / 0 | 1 / 0 / 1 | none |

The one changed block in each SKILL.md is the engine call itself (`gh` + `command node`), refused by design. Shells: bash; `zsh-unavailable` (host has no zsh). Every other skipped block carries its line and reason in the engine's JSON; none is in the change set.

---

## Regression Testing

- Engine suite, all pre-existing tests: PASS (one `bug.7` assertion updated, `--bind` → `--slot`, with a new test holding the `--bind` arm).
- `security-probe.mjs` imports (`isWithin`, `snapshotTree`, `sandboxEnv`): unchanged; its suite green in ci:fast.
- Full `npm run ci:fast`: 5846 pass, 0 fail. PR CI: test, validate, shellcheck, link-check SUCCESS.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, its test, `qa-runnable-prose-detection.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `evals/shared/tests/qa-execution-step-parity.test.mjs`.

### Test Commands Executed
```bash
npm run ci:fast
command node --test shared/resources/tests/qa-execute-snippets.test.mjs
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/
command node shared/resources/security-probe.mjs --sink shell-exec --entry cli:shared/resources/qa-execute-snippets.mjs \
  --argv '["--file","<fixture>/SKILL.md","--no-zsh","--diff-base","{input}"]' --cases-file <cases> \
  --record docs/tasks/task.191.snippet-engine-runs-pipeline-blocks/task.191.qa.1.security.run.json --json
```

### Coverage Report
Not measured (node:test, no coverage instrumentation configured).

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1, CR-1, CR-2 (P1) and CR-3, CR-4, QA-2 (P2).

### Short-term Actions (Non-Blocking)
1. CR-5, CR-6, CR-8; the pre-existing `PS4` hole as its own follow-up.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Three HIGH findings, two of them fail-opens in the safety boundary this task widened.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.191.qa.1.snippet-engine-runs-pipeline-blocks.md`
**Gate File**: co-located at `task.191.gate.1.snippet-engine-runs-pipeline-blocks.yml`
**Next Steps**: `/qa-fix` for the six top issues, then QA cycle 2 (refute pass).
