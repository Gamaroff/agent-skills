# Bug Report: Task 41 — `--init-workflow` no-op makes the wizard skip scaffolding entirely

**Task**: [task.41.pipeline-moments-and-scaffolding.md](./task.41.pipeline-moments-and-scaffolding.md)
**Bug ID**: TASK-41-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-12

## Description

`write_tracker_workflow()` in `scripts/setup-consumer.sh` treats **exit 0 from `gh-stage.js --init-workflow` as proof the file was written**. It is not. Both CLIs exit 0 on several paths that write nothing, because exiting 0 on every documented skip is the deliberate contract for every mode in this family *except* `--check`.

When that happens the wizard prints `tracker-workflow.yaml — generated from your live board`, records `generated from board` in its step summary, and **returns early** — so the heredoc fallback never runs and the consumer is left with **no `tracker-workflow.yaml` at all**.

This is the exact failure class task.41 exists to remove: a silent success over a file that does not exist.

## Steps to Reproduce

```bash
mkdir /tmp/consumer && cd /tmp/consumer && git init -q .
# Any of: gh not authenticated / no origin remote / --issue not resolvable
node .agents/skills/develop-task/references/gh-stage.js --init-workflow; echo "exit=$?"
ls tracker-workflow.yaml
```

Verified with an unauthenticated `gh` (a PATH stub returning 1):

```
ℹ️  gh is unavailable or not authenticated — no board change attempted.
exit = 0
→ NO FILE WRITTEN
```

## Expected Behavior

The wizard reports `generated from board` **only** when a file was actually written from a board read. Otherwise it falls through to the inline heredoc, so a `tracker-workflow.yaml` always exists after the step.

## Actual Behavior

Exit 0 + no file → wizard claims success, returns early, writes nothing. The consumer's first pipeline run then resolves against the built-in default ladder rather than their board, with nothing on disk to tell them why.

## Impact

- **Defeats Success Criterion F3** ("`setup-consumer.sh` scaffolds when absent and never overwrites") on the most common consumer configuration.
- **`gh auth login` is not a wizard prerequisite.** `check_prereqs` does not require it and `collect_env_vars` gathers tracker credentials separately, so an unauthenticated `gh` is an ordinary state, not an edge case.
- Fails silently and is labelled a success, so no one investigates.

Two independent triggers, both realistic:

| Trigger | gh-stage path | Exit |
|---|---|---|
| `gh` unavailable / not authenticated | `ghAvailable()` false → `no-credentials` | **0** |
| No `origin` remote yet (fresh project) | `repoContext()` empty → `no-repo-context` | **0** |
| Remote present, `--issue` not passed | `probeBoard` usage error | 2 (falls through correctly) |

Only the third case behaves correctly today — and it is the one the wizard never actually hits, because `--init-workflow` is invoked **without `--issue`** (see BUG-2's note; `gh-stage --init-workflow` *requires* `--issue` to reach a board at all).

## Recommendation

Do not infer "written" from an exit code. Check the artifact:

```bash
if [[ "$DRY_RUN" != true && -n "$_cli" && -f "$_cli" ]]; then
  node "$_cli" --init-workflow >/dev/null 2>&1 || true
  if [[ -f "tracker-workflow.yaml" ]]; then
    ok "tracker-workflow.yaml — generated from your live board"
    record_step "tracker-workflow" "ok" "generated from board"
    return
  fi
  # fall through to the template
fi
```

Testing the file is correct for both CLIs and for every current and future exit-0 skip reason, which an exit-code check can never be.

Additionally, `gh-stage --init-workflow` needs an `--issue` to read a board. The wizard has no issue number to hand, so on GitHub the live-probe branch **cannot** succeed as written. Either pass one when known, or accept the template as the wizard's normal GitHub outcome and stop implying a probe was attempted.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

**Root Cause**: `write_tracker_workflow()` gated the whole probe branch on
`node "$_cli" --init-workflow >/dev/null 2>&1` **succeeding**. Exit 0 in this CLI
family does not mean "I did the thing" — it means "nothing went wrong", and every
mode except `--check` deliberately exits 0 on a documented skip that writes
nothing (`no-credentials`, `no-repo-context`, `stage-disabled`). The wizard was
reading a contract that was never offered.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

**Fix Description**: Test the artifact, not the exit code. The probe now runs
unconditionally (`|| true`), and the branch is decided by `[[ -f
"tracker-workflow.yaml" ]]`. If no file appeared, control falls through to the
heredoc, so a `tracker-workflow.yaml` always exists after this step. This is
correct for both CLIs and for every present and future exit-0 skip reason.

Also fixed while in the block: `_cli` selection now uses `if/elif` with
`TRACKER=jira` taking precedence explicitly, rather than a `case` on VCS that the
next line silently overwrote.

**Files Modified**:
- `scripts/setup-consumer.sh` — probe branch rewritten
- `shared/resources/tests/setup-consumer-config.test.mjs` — regression test

**Testing**: Re-ran the original reproduction (real `gh-stage.js` + a PATH stub
making `gh` unauthenticated). Before: exit 0, no file, "generated from your live
board". After: file written from the heredoc, with the generic-ladder warning
surfaced. Pinned by "probe branch: a CLI that exits 0 WITHOUT writing still
leaves a file (TASK-41-BUG-1)".

**Verification Steps for QA**:
1. In a scratch repo with the CLI present and `gh` unauthenticated, run
   `write_tracker_workflow`.
2. Confirm `tracker-workflow.yaml` exists and the output does **not** say
   "generated from your live board".

---

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-08-12 | New | QA Engineer | Found during QA cycle 1 |
| 2026-08-12 | In Progress | qa-fix | Investigation started |
| 2026-08-12 | Ready for QA | qa-fix | Fix implemented and verified |
