# Bug Report: Task 173 - The 5c classifier clears a ref that git reads as pathspec magic

**Task**: [task.173.fold-5c-review-into-acceptance-commit.md](./task.173.fold-5c-review-into-acceptance-commit.md)
**Bug ID**: TASK-173-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 8, code review CR-1; safety re-probe)
**Date Found**: 2026-10-08

## Description

The 5c classify block (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1509`) clears a ref
when `isDocsPath` accepts it as a literal filename and `git ls-files --error-unmatch` and
`git diff --quiet HEAD` then pass on it. Git reads that same string as a pathspec. Under the default
patterns (`**/*.md`, `docs/**`), `:!*.md`, `:(exclude)*.md` and `:^*.md` pass `isDocsPath`, and git
resolves them to every tracked non-markdown file.

## Steps to Reproduce

1. Use a repository whose `ci.docsOnly.patterns` is the default (`**/*.md`, `docs/**`).
2. Write a PR review report whose machine-readable findings carry `ref: ":!*.md"`.
3. Run the classify block under bash or zsh.

## Expected Behavior

The ref is recorded and not fixed. A ref that does not name exactly one tracked documentation file is
never cleared.

## Actual Behavior

The block prints `doc-only` and writes `:!*.md` to the eligible list. Measured on this repository:
`git ls-files -- ':!*.md'` matches 2,256 files, under bash and zsh alike. The stage block's
`git add`, `git restore --staged` and `git checkout HEAD --` (lines 1548, 1559, 1564) would then act on
every code file.

## Impact

A malformed or hostile review ref can make 5c stage, or revert, all code in the working tree.

## Recommendation

- Make every git call in the classify and stage blocks literal (`--literal-pathspecs`).
- Require `git ls-files` to name exactly the one path given.
- Have `isDocsPath` refuse a path that begins with `:` or contains glob characters.
- Test under the default patterns, under bash and zsh.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root cause:** the classify block judged the ref as a file name (`isDocsPath`) and then handed it to git, which reads a path argument as a pathspec. Magic (`:!`, `:(exclude)`, `:^`), globs and directories all widen one ref to many files.

#### Fix Implementation (In Progress → Ready for QA)

**Move (qa-fix Step 2.6, repeat subject — the same predicate-versus-git disagreement as DoD run 3's NUL):** consolidate. The fix is an allow-list of the accepted shape, not another deny rule in `isDocsPath`.

- Every git call in the 5c classify and stage blocks is literal (`--literal-pathspecs`). So is the resume probe's header check.
- A ref clears only when `git ls-files` names exactly that one path.
- `isDocsPath` is unchanged. A file whose name holds `*` is legal in git and stays documentation for task.172's callers.

**Files:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (classify and stage blocks, and the rule at line 1417), `shared/resources/develop-pipeline-resume-contract.md`, the bundled copies, and `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`.

**Testing:** under the default patterns, `:!*.md`, `:(exclude)*.md:12`, a glob and a directory are all recorded, and a plain doc still clears. A cleared file named `a*.md` is staged literally, and a dirty sibling `ab.md` stays unstaged. 44/44 pass. Mutation: the clearance test reverted makes the first case red; a non-literal `git add` makes the second red. Both reds hold under bash and zsh. The literal `restore`, `checkout` and resume-probe header check are `no-red-untested`.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-10-08 | New | qa-task | QA cycle 8, CR-1 |
| 2026-10-08 | Ready for QA | qa-fix | Fixed in QA cycle 8 fix pass |
