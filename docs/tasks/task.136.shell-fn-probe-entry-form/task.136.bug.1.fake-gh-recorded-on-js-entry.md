# Bug Report: Task 136 - `--fake-gh` is recorded on a JS-form entry the runner never puts it on PATH for

**Task**: [Link](./task.136.shell-fn-probe-entry-form.md)
**Bug ID**: TASK-136-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (Step 3b diff code review, CR-1)
**Date Found**: 2026-09-21

## Description

`runProbeSpec({ fakeGh })` validates the directory and records it (`base.fakeGh`, and `fake_gh` on the record entry) for **every** entry kind, but only `runShellCase` prepends it to `PATH` and sets `FAKE_GH=1`. The JS runner (`security-probe.mjs:714`) still spawns with `sandboxEnv({ cwd: workDir })`. A JS entry probed with `--fake-gh` therefore returns a verdict whose record says `fake_gh: <dir>` while any `gh` the entry shelled out to was answered by the real binary — the exact misreport the field's own comment says it exists to prevent ("the record must say what answered").

## Steps to Reproduce

```js
import { runProbeSpec } from "./shared/resources/security-probe.mjs";
const r = runProbeSpec({
  sink: "url-authority",
  entry: "shared/resources/tests/fixtures/security-probe/engaging-control.mjs#validateHost",
  fakeGh: "tests/fixtures/fake-gh",
});
console.log(r.verdict, r.fakeGh); // engages /…/tests/fixtures/fake-gh — but the child env never had it
```

## Expected Behavior

One of two contracts, chosen and asserted by a test row: (a) `--fake-gh` on a `kind: "js"` entry is declined with `bad-fake-gh` ("only the shell forms consult PATH"), or (b) the JS runner's child env receives the same `PATH` prepend and `FAKE_GH=1`.

## Actual Behavior

The JS runner ignores `fakeGh`; the result and record still carry it.

## Impact

A finalise or QA record can claim a fixture answered when the network did. Reserved-exit and shell-form behaviour are unaffected; the `shell:` and `shell-fn:` arms are correct.

## Recommendation

Decline (a): a JS export that shells out to `gh` is outside what the JS runner's stdin/JSON contract is for, and declining keeps `fake_gh` on the record truthful by construction. Add a row `--fake-gh on a JS entry is bad-fake-gh`.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-21
**Developer**: Claude (qa-fix, cycle 1)

**Root Cause Analysis**: `runProbeSpec` validated `fakeGh` before dispatching on `resolved.kind`, so the value was accepted, stored on `base.fakeGh`, and carried into `toRecordEntry` as `fake_gh` for every entry kind — while only `runShellCase` reads it (`PATH` prepend + `FAKE_GH=1`). The JS runner's child env is `sandboxEnv({ cwd: workDir })` and never sees it. The record therefore claimed a fixture answered a JS entry the fixture could not reach.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-21

**Fix Description**: option (a) from the recommendation — `--fake-gh` on a `kind: "js"` entry is declined with `bad-fake-gh` ("applies to the shell entry forms only (shell:, shell-fn:) — a JS export never consults PATH"), before anything spawns; `fakeGh` on the result and `fake_gh` on the record stay `null` on that path.

**Files Modified**:
- `shared/resources/security-probe.mjs` — the `!isShellForm` decline inside the `--fake-gh` validation block
- `shared/resources/tests/security-probe.test.mjs` — row "--fake-gh on a JS-form entry is bad-fake-gh, never recorded as having answered (TASK-136-BUG-1)"; asserts `reason`, `executed 0`, `fakeGh null`, `fake_gh null`, and that the same directory on the `shell:` form is accepted

**Testing**: suite 62/62; mutation-proven — reverting the decline reds the row.

**Verification Steps for QA**:
1. `runProbeSpec({ sink: "url-authority", entry: "<js>#validateHost", fakeGh: "tests/fixtures/fake-gh" })` → `unverifiable` / `bad-fake-gh`, `fakeGh: null`
2. `toRecordEntry(...)` → `fake_gh: null`

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-21 | New | QA Engineer | Found in QA cycle 1 (CR-1) |
| 2026-09-21 | In Progress | Claude (qa-fix) | Investigation started |
| 2026-09-21 | Ready for QA | Claude (qa-fix) | Fix implemented (decline on JS entry + row) |
