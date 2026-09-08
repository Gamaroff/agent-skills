# Bug Report: Task 94 - Bundled contract ships six links that resolve nowhere

**Task**: [Link](./task.94.observe-work-skill.md)
**Bug ID**: TASK-94-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-08

## Description

`shared/resources/observation-log-contract.md` cross-references three sibling shared resources with **relative** links — `./tracker-comment.js`, `./change-log.js`, `./resolve-platform.sh` — at six sites (lines 29, 30, 320, 343, 400, 401).

Those resolve inside `shared/resources/`. Task 94 is the **first** skill to bundle this file, and `npm run bundle` copies it to `skills/observe-work/references/` **without** those siblings, because `collect_shared_refs` matches only the literal `shared/resources/<name>` form and never sees a `./`-prefixed link. All six dangle in the shipped copy.

## Steps to Reproduce

```bash
git worktree add --detach /tmp/probe HEAD
for l in tracker-comment.js change-log.js resolve-platform.sh; do
  test -e /tmp/probe/skills/observe-work/references/$l || echo "missing: $l"
done
```

## Expected Behavior

Every link in a shipped skill resolves from where the file actually sits.

## Actual Behavior

Six broken links in the copy consumers install.

## Impact

Cosmetic-to-navigational, and **invisible to CI**: `.github/workflows/docs-link-check.yml` is path-filtered to `docs/**`, `README.md`, `AGENTS.md` and `CONTRIBUTING.md`, so nothing under `skills/**` is link-checked. The build stays green and the defect ships. A repo-wide scan confirms no other bundled reference currently has this problem, so this PR introduces the first instance — worth closing before it becomes the precedent.

## Recommendation

Fix the **source**, never the bundled copy (`npm run bundle` reverts a copy-side edit silently).

Preferred: demote the six links to plain backticked names, noting once that the siblings live beside this file in the repo's shared-resources directory. The file sits next to them in situ, so the loss is one click; the alternative — rewriting them to `shared/resources/<name>` so the bundler pulls them in — drags three unrelated engines into every consumer of `observe-work` to satisfy six cross-references.


---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-08

**Fix**: the six relative links were demoted to plain backticked names in the **source**, and a short section now records where the siblings live and why they are named rather than linked.

The rejected alternative is worth recording: rewriting them to `shared/resources/<name>` would make the bundler resolve them, but it would drag `tracker-comment.js`, `change-log.js` and `resolve-platform.sh` — three unrelated engines — into every consumer of any skill that bundles this contract, to satisfy six cross-references.

**Files Modified**: `shared/resources/observation-log-contract.md` (source, never the bundled copy — `npm run bundle` reverts a copy-side edit silently)

**Testing**: `npm run bundle` re-run; a scan over `skills/observe-work/references/` for `./`-relative targets now reports none broken.

**Status**: ✅ Ready for QA

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-09-08 | Ready for QA | qa-fix | Links demoted in source; re-bundled and re-scanned |
