# Bug Report: Task 209 - An unknown --link-agents id prints "Setup failed" but exits 0

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (PR review CR-1, reproduced by the probe)
**Date Found**: 2026-10-14

## Description

`link_agents` (`scripts/setup-consumer.sh:2031`) records a `fail` step for an unknown id and returns
0. The summary prints "Setup failed", but the script exits 0. `--link-agents` is the flag documented
for scripts and runs with no terminal, so a calling script reads a typo as success.

## Steps to Reproduce

```bash
cd <any repo with AGENTS.md and .agents/skills>
bash scripts/setup-consumer.sh --links-only --link-agents claud; echo "exit $?"
# → "✗ --link-agents: unknown agent 'claud'…", "Setup failed", exit 0
```

The probe (`task.209.qa.1.security.run.json`) records five hostile ids, all exit 0: `claud`,
`claude,claud`, `$(touch pwned)`, `claude;touch pwned`, `../../etc`. None executes anything and none
links anything; only the exit status is wrong.

## Expected Behavior

An unknown id exits non-zero.

## Actual Behavior

It exits 0. The unknown-id test checks the output but never the exit code.

## Impact

A setup script that runs `--link-agents` with a typo carries on as if the agents were linked.

## Recommendation

Exit non-zero when the links-only run recorded a failure (the full wizard's `_on_exit` already turns a
failed step into a failed run only when the exit code is non-zero), and assert the exit code in the
unknown-id test.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14

**Root Cause**: the unknown-id branch recorded a `fail` step and returned 0, unlike every other
failed step in the wizard, which returns or exits non-zero. The test checked the message, never the
exit code.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- `link_agents` returns 1 after recording the failure. Under `set -e` the run stops, and `_on_exit`
  prints the summary and exits 1, the same path a failed skills install takes.
- The links-only summary no longer says "Restart your agents" after a failure; it says to fix the
  error and re-run.
- getting-started §1a says an unknown name stops the run and links nothing.
- PR review CR-2: the summary header and `_status_badge` comment are back above the function.

**Files Modified**:

- `scripts/setup-consumer.sh`
- `shared/resources/tests/setup-consumer-agent-links.test.mjs`
- `docs/concepts/getting-started.md`

**Testing**:

- `an unknown agent id writes nothing and names the known ids` now asserts a non-zero exit and that
  the output does not say the run worked. Reverting either change turns it red.
- All `setup-consumer-*` suites: 167 pass. shellcheck clean.

**Verification Steps for QA**:

1. `setup-consumer.sh --links-only --link-agents claude,claud` in a scratch repo: exit 1, nothing linked.
2. Re-run the probe in `task.209.qa.1.security.cases.json`: the five hostile ids now exit non-zero.

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Found by PR review CR-1; reproduced by the shell-argv probe |
| 2026-10-14 | In Progress | qa-fix | Root cause: the unknown-id branch returned 0 |
| 2026-10-14 | Ready for QA | qa-fix | Returns 1; failed links-only run no longer says it worked |
| 2026-10-14 | Closed | qa-task | Verified by task.209.qa.2.setup-consumer-agent-links.md |
