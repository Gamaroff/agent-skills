# QA Report: Task 41 — New moments, scaffolding, and the `develop-bug` gap

**Task**: [task.41.pipeline-moments-and-scaffolding.md](./task.41.pipeline-moments-and-scaffolding.md)
**Gate File**: [task.41.gate.1.pipeline-moments-and-scaffolding.yml](./task.41.gate.1.pipeline-moments-and-scaffolding.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**PR**: [#208](https://github.com/Gamaroff/agent-skills/pull/208)
**Gate Status**: FAIL

---

## Executive Summary

Four of the five phases are correct, well reasoned and genuinely well covered — the two new moments fire at the right sites with the right keys, `--check`'s inverted exit contract is enforced on both CLIs including their catch-all shims, and the `develop-bug` parity gap is closed and pinned by a test that would have caught it a release earlier.

**Phase 3 (scaffolding) fails.** `write_tracker_workflow()` infers "the file was written" from an exit code that this very family of CLIs guarantees is `0` on write-nothing skips. With an unauthenticated `gh` — a state the wizard never requires you to leave — the consumer ends up with **no `tracker-workflow.yaml` at all** while the wizard prints `generated from your live board`.

That is the precise failure class this task was written to eliminate, reproduced inside the fix for it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 5 implementation phases marked complete
- [x] Tests passing (1099/1099)
- [x] Breaking changes documented (none; opt-in defaults verified)
- [x] Code on feature branch with open PR (#208, OPEN, MERGEABLE)

### Review Methodology

Direct tools plus targeted adversarial probing. Task is >5 phases across multiple modules, which the Adaptive Review Strategy would normally answer with parallel agents; direct review was chosen instead because the change set is small in bytes but dense in *contract* — the defects here are semantic (what an exit code means to a caller), not distributional, so reading each call site and then executing it against a scratch consumer repo is the higher-yield approach. Four probes were run against throwaway repos rather than reasoning from the source alone.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1 — `changes-requested` | **PASS** | Verified | Fires in §5b before `/qa-fix`, both trackers. Per-cycle semantics documented beside the opposite `in-qa` rule. `rank: null` correctly makes it a side-state; the reasoning (a rank caps the signal at one cycle via the backward-move guard) is sound and now carries a test. |
| 2 — `pr-merged` | **PASS** | Verified | Correctly placed in both orchestrators. The §10 Critical risk (firing once per batch) is closed by a test asserting the literal sits inside the loop body **and** is keyed on `ITEM_TRACKER_ISSUE`. |
| 3 — Scaffolding + `--init-workflow` | **FAIL** | 2 defects | CLI side is correct — refuses to overwrite, `--force` works, JSON→YAML conversion round-trips and preserves `reason:` comments. The **wizard integration** is not (BUG-1, BUG-2), and is untested (BUG-3). |
| 4 — `--check` | **PASS** | Verified | Exit contract correct on all six paths tested. Inversion documented and shimmed on both CLIs. `--offline` proven to issue zero calls. |
| 5 — Parity, READMEs, docs | **PASS** | Verified | `develop-bug` now signals all three loop moments. READMEs corrected; the self-policing checklist row is present and the External-touchpoints rows were brought into line with it. |

**Overall Phase Completion**: 4/5 passed

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| F1 — both moments fire at their moments, both trackers | Yes | Yes | PASS |
| F2 — neither fires without `tracker-workflow.yaml` | Yes | Verified — absent from `DEFAULT_PIPELINE` and `DEFAULT_RUNG_FOR_MOMENT`; live run against this repo reported `stage-disabled` | PASS |
| F3 — `setup-consumer.sh` scaffolds when absent, never overwrites | Yes | **Never-overwrite: PASS. Scaffolds-when-absent: FAILS** when the CLI exists and returns an exit-0 skip | **FAIL** |
| F4 — `--init-workflow` converts an existing JSON record | Yes | Yes — rank order, `enabled:false`→omission, `reason:`→comment, round-trips through `--check` | PASS |
| F5 — `--check` non-zero on drift, 0 without credentials | Yes | Yes — 6 paths verified live | PASS |
| F6 — `develop-bug` signals the same moments | Yes | Yes | PASS |

### Performance

| Criterion | Target | Actual | Status |
|---|---|---|---|
| P1 — ≤5 extra API calls per run, opted in only | ≤5 | ≤5 (MAX_ITER bound), inert by default | PASS |
| P2 — `--check --offline` issues no network call | 0 | 0 — asserted on the stub's full call log | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Q1 — shared validation in `tracker-workflow.js`, not duplicated | Yes | Yes — `checkDrift` consumes the probe's own result | PASS |
| Q2 — inverted `--check` exit commented as deliberate | Yes | Yes — greppable single-line marker + shim comments, both CLIs, both asserted | PASS |
| Q3 — edits in `shared/resources/` only; bundles regenerated | Yes | Yes — hook verified in sync on all 3 commits | PASS |

---

## Breaking Changes Validation

### Breaking Change: none claimed

Documented: Yes · Migration path: N/A · Consumer code updated: N/A

**Verified independently.** Both new moments are absent from `DEFAULT_PIPELINE` and from `DEFAULT_RUNG_FOR_MOMENT`, and `defaultEnabled: false` in `DEFAULT_STAGE_MAP`. A live `--stage pr-merged` against this repo returned `stage-disabled`, exit 0. The claim holds.

### Behavioural change: `develop-bug` gains two signals

Documented: Yes · Migration path: Yes (omit under a `byIssueType` overlay) · Correctly scoped to consumers who already opted in.

**Overall**: PASS

---

## Issues Found

### HIGH Severity (1)

**Issue: `--init-workflow` no-op makes the wizard skip scaffolding entirely**
- **Severity**: HIGH · **Category**: Functional · **Priority**: P1
- **Bug Report**: [task.41.bug.1.init-workflow-silent-noop-skips-scaffolding.md](./task.41.bug.1.init-workflow-silent-noop-skips-scaffolding.md)
- **Observation**: `write_tracker_workflow()` gates on `node "$_cli" --init-workflow >/dev/null 2>&1` succeeding. Both CLIs exit 0 on `no-credentials` and `no-repo-context` without writing. Reproduced with a stubbed unauthenticated `gh`: `exit = 0`, no file, wizard reports `generated from your live board` and returns.
- **Impact**: Consumer left with no workflow file; F3 defeated; failure is silent and labelled success. `gh auth login` is not a wizard prerequisite, so this is an ordinary configuration, not an edge case.
- **Recommendation**: Test for the artifact, not the exit code.

### MEDIUM Severity (2)

**Issue: generic Jira ladder reported as board-derived**
- **Bug Report**: [task.41.bug.2.generic-ladder-mislabelled-as-board-derived.md](./task.41.bug.2.generic-ladder-mislabelled-as-board-derived.md)
- **Observation**: `jira-stage --init-workflow` with no record writes a generic ladder, exits 0, and emits a loud "this is a GENERIC ladder / fails SILENTLY" warning that `>/dev/null 2>&1` discards. Both outcomes labelled `generated from board`.
- **Impact**: The warning designed to prevent a silent resolve-nothing failure is suppressed at the one moment it matters. `initWorkflow` already returns `fromRecord` — the information exists and is thrown away.

**Issue: the scaffolder's probe branch has no test coverage**
- **Bug Report**: [task.41.bug.3.scaffolding-probe-branch-untested.md](./task.41.bug.3.scaffolding-probe-branch-untested.md)
- **Observation**: All five new setup-consumer tests run where `-f "$_cli"` is false, so every one takes the heredoc path. `grep` for `_cli`/`init-workflow` in the test file returns nothing.
- **Impact**: This is *why* BUG-1 and BUG-2 are green at 1099/1099. The coverage shape misleads: "scaffolds when absent" passes while only half its implementation ran.

### LOW Severity (1)

- **Scaffolded file has no trailing newline.** `write_file` uses `printf '%s'` and `$(cat <<EOF)` strips the final newline. Parses cleanly and validates with zero errors; git will show "\ No newline at end of file". Cosmetic.

**Total**: HIGH 1, MEDIUM 2, LOW 1

---

## NFR Assessment

### Performance — PASS
Both quantified criteria met and independently verified. The `--offline` zero-network claim is asserted against the stub's complete call log rather than write-absence, which is the stronger form.

### Reliability — CONCERNS
The engine and CLI contracts are sound: every documented skip exits 0 deliberately, the one inverted mode is shimmed on both sides so an unexpected throw cannot be swallowed, and both write paths refuse to overwrite. The defect is in the **wizard's inference** about those contracts, not the contracts themselves — but its effect is a silent no-op presented as success, which is the exact reliability failure the task set out to remove.

### Security — PASS
No new attack surface. `--check` is read-only and provably never writes. The numeric `--issue` validation that guards GraphQL interpolation is hoisted above every path including the new ones. The no-credentials path exits without echoing environment.

### Maintainability — PASS
Validation is shared rather than duplicated; `checkDrift` consumes the probe's own resolution so the two can never disagree. The inverted exit code carries a greppable marker plus tests. Three notable review-driven corrections were carried into the code as comments (side-state rationale, key-order semantics, the `--write-ladder` extension), which is where the next reader will look.

---

## Code Review

Diff reviewed across 71 files (3 commits). Advisory findings beyond the gated issues above:

**Correctness bugs (1 promoted to gate):**
- [high/high] `scripts/setup-consumer.sh` — exit-code inference (TASK-41-BUG-1, promoted to `top_issues` under `code_review_blocking=true`)

**Cleanups (3):**
- `shared/resources/jira-stage.js` — `initWorkflow({...})` is passed `workflow` and `checkWorkflow({...})` is passed `root`; neither destructures it. Harmless, but drop the unused arguments.
- `scripts/setup-consumer.sh` — the `case "${VCS:-github}"` block sets `_cli` for github then the following line unconditionally overwrites it for `TRACKER=jira`. Correct, but reads as accidental; an `if/elif` states the precedence directly.
- `shared/resources/gh-stage.js` — `renderWorkflowFile`'s `why` ternary is three-deep. A small lookup table keyed on moment would read better and put the two opt-in explanations next to each other.

None of the cleanups are blocking.

---

## Regression Testing

| Area | Result |
|---|---|
| Existing moment behaviour (`work-started`, `in-review`, `done`) | PASS — live `--stage in-review` returned `stage-disabled` exit 0, matching this repo's 3-column board and its deliberate omissions |
| `--write-ladder` (pre-existing flag extended) | PASS — still writes a statuses-only ladder with its own provenance header and no `pipeline:` block; asserted by a new test |
| Default ladder / compatibility contract | PASS — `DEFAULT_LADDER` length 6 unchanged; rung↔candidate snapshot tests pass untouched |
| Full suite | PASS — 1099/1099 |
| Eval suite | PASS — `npm run eval:all` exit 0 |

---

## Test Artifacts

### Test Commands Executed
```bash
npm test                                   # 1099 pass / 0 fail
npm run eval:all                           # exit 0
# adversarial probes, throwaway repos:
gh-stage.js --init-workflow                # no --issue → exit 0, NO FILE (BUG-1)
PATH=<stub> gh-stage.js --init-workflow    # gh unauthenticated → exit 0, NO FILE (BUG-1)
jira-stage.js --init-workflow              # no record → generic ladder, exit 0 (BUG-2)
gh-stage.js --check / --check --offline    # 6 exit paths incl. renamed column
```

### Files Reviewed
`scripts/setup-consumer.sh`, `shared/resources/{gh-stage,jira-stage,jira-sync,tracker-workflow}.js`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-{next,batch}/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, all four modified test files, `docs/reference/{tracker-workflow,configuration}.md`, both develop READMEs.

---

## Recommendations

### Immediate (Blocking)
1. **TASK-41-BUG-1** — check for the file, not the exit code (P1).
2. **TASK-41-BUG-3** — cover the probe branch with stub-CLI tests (P2). Without this, BUG-1 can return unnoticed.

### Short-term (Non-Blocking)
1. **TASK-41-BUG-2** — branch on `fromRecord` and surface the generic-ladder warning.
2. Trailing newline on the scaffolded file.
3. Decide whether the GitHub live-probe branch is reachable at all from the wizard (it needs an `--issue` the wizard has no source for) — either supply one or stop implying a probe was attempted.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH functional defect. Rule 1 of the deterministic gate rules applies. The defect is narrow and the fix is a few lines, but its effect — a consumer silently left with no workflow file while the wizard reports success — is squarely the outcome this task exists to prevent, so it should not merge on the strength of the other four phases being right.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: BUG-1 fixed and verified; BUG-3 closed so the branch is exercised.

---

**Next Steps**: `/qa-fix` cycle 1 against this gate — fix BUG-1 and BUG-2 in `write_tracker_workflow()`, add the stub-CLI tests for BUG-3, then re-review.
