# QA Report: Task 41 — cycle 2 (re-review after qa-fix)

**Task**: [task.41.pipeline-moments-and-scaffolding.md](./task.41.pipeline-moments-and-scaffolding.md)
**Gate File**: [task.41.gate.2.pipeline-moments-and-scaffolding.yml](./task.41.gate.2.pipeline-moments-and-scaffolding.yml)
**Previous Gate**: [task.41.gate.1](./task.41.gate.1.pipeline-moments-and-scaffolding.yml) — FAIL (60/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**PR**: [#208](https://github.com/Gamaroff/agent-skills/pull/208)
**Gate Status**: PASS

---

## Executive Summary

All three cycle-1 issues are fixed, and the fixes were verified against the original reproductions rather than against their own tests. The HIGH issue additionally passes the stronger check: reintroducing the defect in a scratch copy of the wizard makes the new regression test's precondition fail, so the test is genuine rather than vacuously green.

Phase 3 now passes. The other four phases were untouched by this cycle and were re-verified green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Cycle-1 Issue | Severity | Status | How verified |
|---|---|---|---|
| TASK-41-BUG-1 — exit-code inference skips scaffolding | HIGH | **FIXED** | Original reproduction re-run; **plus** defect reintroduced in a scratch wizard copy to prove the regression test fails |
| TASK-41-BUG-2 — generic ladder mislabelled board-derived | MEDIUM | **FIXED** | Real `jira-stage.js`, no record → now labelled template, warnings surfaced |
| TASK-41-BUG-3 — probe branch untested | MEDIUM | **FIXED** | 5 tests added; branch entered via stub CLI at the resolved path |
| LOW — no trailing newline | LOW | **FIXED** | Asserted |
| 3 advisory cleanups | — | **APPLIED** | Read + suite green |

**Scope**: files changed since gate 1 — `scripts/setup-consumer.sh`, `shared/resources/{gh-stage,jira-stage}.js`, `shared/resources/tests/setup-consumer-config.test.mjs`, plus task/bug/QA docs.

---

## Verification Detail

### TASK-41-BUG-1 (HIGH) — fixed

The fix replaces `&& node "$_cli" --init-workflow >/dev/null 2>&1` with an unconditional probe followed by `[[ -f "tracker-workflow.yaml" ]]`. That is the right shape: it tests the thing the wizard actually cares about, and it stays correct if a future CLI gains another exit-0 skip reason.

**Original reproduction re-run** — real `gh-stage.js`, `gh` stubbed unauthenticated:

```
BEFORE:  exit = 0 → wizard sees SUCCESS → NO FILE WRITTEN
AFTER:   ✓ tracker-workflow.yaml
         ⚠ Wrote a GENERIC ladder — your board's real columns are almost certainly different.
         ⚠ A ladder that does not match the board resolves nothing, and fails SILENTLY.
```

**Regression test proven genuine.** A passing test proves nothing about a fix unless it would fail without it. The exit-code inference was restored in a throwaway copy of the wizard and the stub scenario re-run: no file was written, which is the precondition the new test asserts against. The test fails on reintroduction.

This matters more than usual here, because the test's assertion ("a file exists") is one that could easily pass for the wrong reason — e.g. if the stub were mis-installed and the branch never entered at all. It was worth disproving.

### TASK-41-BUG-2 (MEDIUM) — fixed

Branching on `.fromRecord` is the right call: the CLI already computed the answer, so the wizard now reports what the CLI claims rather than guessing from an exit status. Verified against the real `jira-stage.js` with no record — output is `template (edit before first run)` with all three warning lines and a `record_warning` for the closing summary.

The `jq -r '.fromRecord // empty'` degrades safely: malformed or absent JSON yields empty, which takes the template branch — the conservative direction.

### TASK-41-BUG-3 (MEDIUM) — fixed

`runWithStubCli()` installs an executable stub at the exact path `write_tracker_workflow` resolves, so the branch is genuinely entered. Four outcomes covered (writes nothing / record-derived / generic / non-zero exit) plus the newline assertion. This is the right tool — no credentials, no board, and it fails loudly on reintroduction.

### Cleanups

- `_cli` selection is now `if/elif` with `TRACKER=jira` taking precedence explicitly. The old `case`-then-overwrite worked but read as accidental.
- `UNRESOLVED_MOMENT_NOTE` replaces the three-deep ternary and puts both opt-in explanations adjacent, which is where a reader compares them.
- Unused destructured args dropped from `initWorkflow` / `checkWorkflow`.

None altered behaviour; suite confirms.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — 1104/1104 (was 1099; +5 from this cycle) |
| Eval suite | PASS — `npm run eval:all` exit 0 |
| `gh-stage --check --offline` | PASS — exit 0 on this repo's real file |
| `jira-stage --check --offline` | PASS — exit 0 |
| `--stage pr-merged` (new moment, live) | PASS — `stage-disabled`, exit 0, inert as designed |
| End-to-end live board probe | PASS — `--init-workflow --issue 189` produced a board-derived file that then passed `--check` against the live board |
| `bash -n scripts/setup-consumer.sh` | PASS |
| Bundles | PASS — regenerated, hook reports all skills in sync |

No regression in the four phases that passed cycle 1: the fix is confined to the wizard's probe block and two cosmetic CLI edits.

---

## Success Criteria — final

| # | Criterion | Status |
|---|---|---|
| F1 | both moments fire at their moments, both trackers | PASS |
| F2 | neither fires without `tracker-workflow.yaml` | PASS — verified live (`stage-disabled`) |
| F3 | `setup-consumer.sh` scaffolds when absent, never overwrites | **PASS** (was FAIL) |
| F4 | `--init-workflow` converts an existing JSON record | PASS |
| F5 | `--check` non-zero on drift, 0 without credentials | PASS |
| F6 | `develop-bug` signals the same moments | PASS |
| P1 | ≤5 extra API calls per run, opted in only | PASS |
| P2 | `--check --offline` issues no network call | PASS |
| Q1 | shared validation not duplicated | PASS |
| Q2 | inverted `--check` exit commented as deliberate | PASS |
| Q3 | edits in `shared/resources/` only; bundles regenerated | PASS |
| M1–M3 | CHANGELOG, READMEs, `project.yml` section | PASS |

**15/15 met.**

---

## NFR Assessment

- **Security — PASS.** The fix adds no reach; `jq ... // empty` degrades to the safe branch.
- **Performance — PASS.** Unchanged.
- **Reliability — PASS** (was CONCERNS). Every CLI outcome now has a defined wizard behaviour and a test. The class of defect — silent no-op reported as success — is closed at its source rather than patched at one call site.
- **Maintainability — PASS.** Cleanups landed; the probe branch is no longer a blind spot.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All three issues closed with verification that goes beyond "the new test passes". No outstanding issues; 15/15 success criteria met; no regressions.
**Quality Score**: 96/100

Four points withheld, not blocking, for the two items in `future`: the GitHub live-probe branch remains unreachable from the wizard by construction (correctly handled and commented, but it means board-derived scaffolding on GitHub does not actually happen), and the Jira `--check` board half compares against a local record rather than a live probe.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: proceed to `/finalise`.
