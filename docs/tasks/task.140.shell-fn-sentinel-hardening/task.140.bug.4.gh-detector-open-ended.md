# Bug Report: Task 140 - The static gh detector misses common spellings, so a shell: script can still run the host gh

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-4
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, code review CR-2 and CR-3)
**Date Found**: 2026-09-30

## Description

`namesGh` is a text heuristic. The refute pass verified it answers `false` for:

- an absolute path — `/usr/local/bin/gh api`
- a defaulted variable — `"${GH_BIN:-gh}" api`
- an assign-then-call pair — `GH_CLI=gh` / `"$GH_CLI" api`
- `gh<in`
- a `source` after `if`, `elif`, `else`, `{`, `!`, `(`, or written `source -- x`

Now that `needs-fake-gh` covers the `shell:` form, a script using any of these runs the host `gh` (host PATH, host keychain) and is scored — the outcome the gate exists to prevent.

## Recommendation

**Replace the guarantee's mechanism rather than widen the regexes** — two regexes over shell syntax is the same open-ended enumeration as BUG-3. When no `--fake-gh` is passed for a shell form, put a **trip-wire `gh`** first on `PATH`: a stub that records that it was invoked and exits non-zero. After the run, a tripped wire declines `needs-fake-gh` with nothing scored. Every PATH-resolved spelling — `$GH`, `${GH_BIN:-gh}`, `GH_CLI=gh`, a sourced wrapper however it was sourced — reaches the stub, and the host `gh` never runs. Keep the static detector as the cheap pre-spawn path (its message is clearer), and state the one residual — an **absolute path** to a real `gh`, which bypasses `PATH` — as a limit in rule §5 with a row that pins it.

**Provenance.** Identical at base (no gate on the `shell:` form, no source-follow). Attributed for the same reason as BUG-3.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root cause**: the only guarantee was a text heuristic over shell syntax.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Move (qa-fix Step 2.6, trigger: pipeline offer + repeat subject)**: replace the mechanism — a run-time trip-wire `gh`.

With no `--fake-gh`, the shell forms put `work/.probe-harness/bin/gh` first on PATH; it records the call and exits 127, so the host `gh` never runs. After the run a tripped wire declines `needs-fake-gh` with nothing scored. The static detector stays as the pre-spawn fast path. The absolute-path residual is stated in rule §5 and pinned. `realpathSafe` now contains a missing path by its deepest existing ancestor (advisory CR-5).

**Files Modified**: `shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md` §5, `CHANGELOG.md`, bundled copies.

**Testing**: Row "gh reached at RUN time … trips the wire" — `${GH_BIN:-gh}`, `GH_CLI=gh`, a wrapper sourcing gh-labels.sh inside `if`, a `shell:` script via `$X` — red before, green after; a library that sources but never calls gh is still scored; the absolute-path row pins the limit. Mutants G2 (no trip-wire on PATH), G3 (ignore the trip) red it; G4 reds the missing-ancestor row.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-30 | New | QA (cycle 2) | Filed from the refute pass |
| 2026-09-30 | Ready for QA | qa-fix (cycle 2) | Mechanism replaced; mutation-proved |
