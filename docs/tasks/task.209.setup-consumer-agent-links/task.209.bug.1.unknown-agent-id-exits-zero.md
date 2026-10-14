# Bug Report: Task 209 - An unknown --link-agents id prints "Setup failed" but exits 0

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
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

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | QA Engineer | Found by PR review CR-1; reproduced by the shell-argv probe |
