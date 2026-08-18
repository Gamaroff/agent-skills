# Bug Report: Task 52 - Arbitrary command execution from the committed handover script

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-3
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (diff code review + execution test)
**Date Found**: 2026-08-18

## Description

Two independent paths let record content become **executable shell** in the generated
`*.handover.{n}.{name}.sh`. Both fire during the **dry run** — the mode the task documents as safe
("dry-run-by-default so nobody runs it by accident") — and the script is **committed to the repo**.

### 3a — a newline in `intent` escapes the comment

`shellStep` writes `# [${rec.id}] ${rec.intent}`. `buildRecord` only `.trim()`s `intent`, so interior
newlines survive and everything after the first one lands at file scope.

### 3b — backticks in a target label reach an unescaped double-quoted `echo`

The no-`argv` fallback emits `echo "✋ [id] No command form — do this by hand: ${desc} (${url})"`.
`desc` escapes only `"`, so backticks and `$( )` are live inside the double quotes.

## Steps to Reproduce

```bash
# 3a
node -e '
const dm=require("./shared/resources/defer-mutation.js"), hr=require("./shared/resources/handover-render.js");
const r=dm.buildRecord({kind:"github.issue.comment",intent:"Post the summary\nrm -rf ~/important",
  target:{issue:"1",url:"u"},command:{argv:["gh","issue","comment","1"]}},{env:{}});
console.log(hr.render([r],"sh",{}));'   # → a bare `rm -rf ~/important` line at file scope

# 3b — verified by actual execution
node -e '
const dm=require("./shared/resources/defer-mutation.js"), hr=require("./shared/resources/handover-render.js");
const r=dm.buildRecord({kind:"jira.sprint.set-state",intent:"y",
  target:{sprint:"`touch /tmp/QA_PWNED`",url:"u"}},{env:{}});
require("fs").writeFileSync("/tmp/h.sh", hr.render([r],"sh",{}));'
rm -f /tmp/QA_PWNED && bash /tmp/h.sh >/dev/null 2>&1 && ls /tmp/QA_PWNED
```

## Expected Behavior

No record content can become executable shell. A dry run reads the plan and changes nothing.

## Actual Behavior

**Verified**: `/tmp/QA_PWNED` is created by the dry run. For 3a the injected line is present at file
scope and executes on any invocation.

## Impact

Arbitrary command execution from a file the pipeline **commits to the repository** and invites a
reviewer to read and an operator to run. Neither input end is trusted: board column names come from
the consumer's `tracker-workflow.yaml`, and `jira-stage`'s `--issue` is an unvalidated free string.

## Recommendation

Route **every** interpolated string through `shQuote` (single-quoted) rather than hand-escaping into
a double-quoted word — including the `echo` fallback and the `run_step`/`confirm_step` description.
Reject interior newlines in `buildRecord`. Add an execution test that fails if a hostile record
produces any side effect during a dry run.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: Every string interpolated into the generated script now goes through `shQuote` (single-quoted, safe for any content) — the `run_step`/`confirm_step` description, the no-argv `echo` fallback and the UNRECORDED lines. Comments go through a new `shComment`, which strips newlines and control characters so nothing can escape a `#` line.

**Files Modified**: `shared/resources/handover-render.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-3a asserts no injected line reaches file scope; §16 BUG-3b and §16 BUG-3c each write a hostile record, run the generated script, and assert no side-effect file was created. Both paths mutation-proven.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |
