# Bug Report: Task 149 - qa-read-back.js reports an unverifiable link as an ordinary HALT (exit 1), not "could not look" (exit 2)

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 6)
**Date Found**: 2026-09-26

## Description

The header of `shared/resources/qa-read-back.js` says exit 2 covers "a git that did not answer". One
such state still exits 1. When `git check-ignore` does not answer, `doc-links.js` reports the link as
`unverifiable`. That happens, for example, on a pathspec beyond a committed directory symlink (exit
128). Pass 2 then pushes it as an ordinary problem, with the remedy "write the artifact or fix the
link", and the script exits 1.

Both exit codes stop the QA comment, so nothing false is posted. But the caller is told the link is
broken and to write the artifact. The truth is that the script could not look. That is the distinction
the exit-2 contract exists to keep (review CR-1, cycle 6).

The two contracts also disagree. `qa-task` / `qa-story` Step 12b say `unverifiable` "also halt[s]",
while the script header says a git that did not answer is exit 2.

## Steps to Reproduce

```bash
R=$(mktemp -d) && cd "$R" && git init -q && git -c user.email=a@b -c user.name=a commit -q --allow-empty -m init
D=docs/tasks/task.9.x; mkdir -p $D docs/other
printf -- '---\nupdated: 2026-09-26\n---\n# W\n[s](./sub/file.md)\n\n## Change Log\n\n| Date | Version | Description | Author |\n| -- | -- | -- | -- |\n| 2026-09-26 | | x | a |\n' > $D/task.9.x.md
echo 'gate: PASS' > $D/task.9.gate.1.x.yml; echo '# r' > $D/task.9.qa.1.x.md
echo '# f' > docs/other/file.md; ln -s ../../other $D/sub
git add docs/other $D/sub && git -c user.email=a@b -c user.name=a commit -qm s
node <repo>/shared/resources/qa-read-back.js --doc $D/task.9.x.md; echo "rc=$?"
```

## Expected Behavior

An `unverifiable` link is "could not look": exit 2, with a message that says git did not answer. Or
the contract says plainly that `unverifiable` is a HALT, and the remedy names the real cause.

## Actual Behavior

`✖ ./sub/file.md (line 5) is unverifiable — write the artifact or fix the link`, then `HALT …`, `rc=1`.

## Impact

Fails closed: the QA comment is not posted either way. The remedy printed is wrong for this state,
and the script's own contract is broken.

## Recommendation

Pick one contract and make both the script and Step 12b state it. Either map `unverifiable` to exit 2
`could-not-look`, or keep it a HALT, give it its own message ("git could not verify … — not a missing
artifact") and correct the header. Add a test that builds a link through a committed directory
symlink.

## Developer Fix Cycle

### Iteration 1

**Narrowing residue:** qa-read-back.js's could-not-look taxonomy (pipeline offer). **Move: scope the
claim.** Each cycle since 3 has found one more state to add to exit 2. Instead of adding another, the
contract is now stated so that it closes. Exit 2 means the **run** could not complete: bad arguments,
a document that is not a readable regular file, no engine, no repository, an unreadable index, or an
unanticipated error. Once the check runs, every link it cannot confirm is a HALT (exit 1) with a
remedy for that state, and `unverifiable` is one of them. `qa-task` Step 12b and `qa-story` item 3e
already said so ("`outside-repo` and `unverifiable` also halt"). The script header was the outlier,
and it now says the same.

- `shared/resources/qa-read-back.js`: the header contract is rewritten, and a `REMEDY` table gives
  one message per link state. `unverifiable` now reads "git answered neither yes nor no for this
  path (a link through a symlinked directory?); it is not a missing artifact".
- Test: a link through a committed directory symlink halts (exit 1) with that remedy, and not with
  "write the artifact". Mutation: removing the `unverifiable` remedy turns it red.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 6 (review CR-1, reproduced) |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 6 (scope the claim) |
