# Bug Report: Task 91 - `--dry-run` previews with the previously-installed resolver

**Task**: [Link](./task.91.reconcile-tracker-resolution.md)
**Bug ID**: TASK-91-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-05

## Description

`_locate_resolver` tries `"${_tmpdir:-}"/skills/*/references/resolve-platform.sh` first, then
`.agents/skills/*/references/resolve-platform.sh`. On the **dry-run** path `_tmpdir` is unset — it is a
`local` of `install_skills` declared *below* the dry-run branch — so candidate 1 never matches and the
**previously installed** resolver wins.

## Steps to Reproduce

```bash
env SETUP_CONSUMER_NO_MAIN=1 bash -c \
  'source ./scripts/setup-consumer.sh >/dev/null 2>&1; _locate_resolver; echo'
# -> .agents/skills/create-epic/references/resolve-platform.sh
```

## Expected Behavior

A dry run previews the decision the **real** run will make, or reports that it cannot.

## Actual Behavior

It previews using whatever resolver a previous install left on disk, which may be older than the
release about to be installed.

## Impact

**This relocates the exact bug the task exists to close rather than removing it.** A repo whose
installed copy predates this task (no `.env` probe) and whose `JIRA_URL` lives only in `.env` gets
"tracker resolves to 'github'" in the preview and `jira` on the real run.

It also falsifies the comment now shipped at the dry-run call site, which asserts rc 3 is the expected
outcome there. That is only true on a repo with no prior install.

## Recommendation

Either restrict the `.agents/skills/*` candidate to the real-install path and let dry-run report rc 3
as its own comment claims, or have the dry-run branch state which copy it resolved against
("previewing with the installed resolver, which may be older than ${_version}"). Silently previewing
with different rules is the one option that should not survive.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-05

**Root Cause**: `_locate_resolver` read `$_tmpdir` by **dynamic scope** from a caller's `local`. On the
dry-run path that variable is not in scope at all, so the first candidate silently never matched.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**: `_locate_resolver` now takes the tmpdir as `$1` and returns `origin<TAB>path`, so
the caller knows *which* copy answered — `release`, `installed` or `checkout`. The dry-run branch prints
a note whenever the origin is not `release`, naming the risk instead of hiding it. The tarball's own
`shared/resources/` copy is tried first (one deterministic path the archive already ships, rather than a
glob across 38 duplicates), and the `BASH_SOURCE` candidate is skipped unless it names a real file —
under `curl | bash` it is the literal string `bash`, whose dirname is `.`.

Returning the origin **on stdout** rather than via a global is not a style choice: this function is
called in a command substitution, which is a subshell, so an assigned global is discarded. That mistake
cost a test run — `set -u` then aborted the wizard on the unbound name.

**Files Modified**: `scripts/setup-consumer.sh`

**Testing**: covered by the existing `--dry-run writes nothing and names the tracker and exclusion set`
test, which exercises the whole branch.
