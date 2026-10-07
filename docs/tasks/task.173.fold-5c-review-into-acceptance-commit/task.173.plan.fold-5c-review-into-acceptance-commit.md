---
id: task.173.plan
title: "Implementation Plan: Fold the 5c review and its doc-only fixes into the acceptance commit"
type: plan
task-ref: task.173.fold-5c-review-into-acceptance-commit.md
---

# Implementation Plan: Fold the 5c review and its doc-only fixes into the acceptance commit

> Requirements and success criteria: [task.173.fold-5c-review-into-acceptance-commit.md](task.173.fold-5c-review-into-acceptance-commit.md)

## Overview

First narrow the two commits that sweep the whole index. Then state the 5c carry path that relies
on 6a sweeping it. The order matters: a 5c set staged before 8a is narrowed would be swept into
8a's fix commit and refused by `--git-base`.

## Phase-by-Phase Implementation Guide

### Phase 1: path-limited commits

**`skills/finalise/SKILL.md` 8a step 2 (`:2537`).** Replace the prose `git commit` bullet with a
block:

```bash
# Path-limited: 5c may have staged the review report and doc fixes for 6a to carry. A bare
# `git commit` here would sweep them into the fix commit, and --git-base would refuse it
# (task.173). `--` commits only the named paths and leaves the rest of the index staged.
mapfile -t TOUCHED < <(jq -r '.touched[]' .claude/state/finalise-fix-finding.json)
git commit -m "fix(${STEM}): finalise DoD {section} — {finding}" -- "${TOUCHED[@]}"
COMMIT_EXIT=$?
[ "$COMMIT_EXIT" -eq 0 ] || { echo "HALT: 8a fix commit rejected (exit $COMMIT_EXIT)"; exit 1; }
```

`mapfile` is bash-only, and the pipeline runs under zsh. Use a `while read` loop, or
`jq -r '.touched | @sh'` with `eval`. Follow whichever form `halt-snippet-glob-safe.test.mjs`
accepts. Never pass a bare glob.

**`shared/resources/develop-pipeline-on-precompact.sh:211–212`.**

```bash
git add "$REPORT" 2>/dev/null || true
git commit -m "docs(${SKILL}): pipeline paused at step ${CURRENT_STEP} — context compaction imminent" -- "$REPORT" >/dev/null 2>&1 || true
```

The hook's `|| true` is its existing contract: a hook must never fail compaction. Leave it, and do
not widen it.

Add a test case to `develop-pipeline-on-precompact.test.sh`: stage `x.pr-review.1.y.md`, trigger
the hook, then assert that `git show --name-only HEAD` lists only the report and that `git status
--porcelain` still shows `A  …pr-review…`.

### Phase 2: 5c carry subsection

Insert this in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, after the verdict table
(`:1314–1317`):

```markdown
#### Carry the review into the acceptance commit (APPROVE / CONCERNS)

Nothing is committed or pushed between this verdict and `/finalise` 6a. 6a commits the whole
index, so anything staged here rides the acceptance commit. Staged, not committed: a local commit
would move `HEAD` past the pushed head, and `/finalise` reading 1 records `CI_HEAD_1` from `HEAD`.

1. The review report is staged (`/review-pr` stages it). Assert that it is.
2. On CONCERNS only: a finding is doc-only when its `file:` matches `ci.docsOnly.patterns`
   (task.172; one definition, read through `glob-match.js`). Apply the doc-only findings, run
   `doc-links.js --file` on each changed `.md`, and stage exactly those paths. A finding with no
   `file:`, outside the patterns, or whose fix fails the link check is recorded and not fixed.
3. Write `**Carried to 6a**: {paths}` on the cycle's QA Cycle entry.
```

Edit the `APPROVE` and `CONCERNS` rows to end with "then carry the review (below)".

The doc-only test, as a snippet the subsection can reference:

```bash
command node -e '
  const { matchesAnyGlob } = require("./.agents/skills/{develop-story|develop-task}/references/glob-match.js");
  const [file, globs] = [process.argv[1], JSON.parse(process.argv[2])];
  process.exit(matchesAnyGlob(file, globs) ? 0 : 1);' "$FINDING_FILE" "$DOCS_PATTERNS_JSON"
```

Bind `$DOCS_PATTERNS_JSON` the way the diminishing-returns block binds `$TEST_ARTIFACT_GLOBS_JSON`
(`:600`). Absent means task.172's default, `["**/*.md","docs/**"]`. Do not restate the default in
prose: point at `configuration.md`.

### Phase 3: 6a

Replace the comment at `skills/finalise/SKILL.md:1257` ("The implementation report is NOT staged
here…") with one that also says the commit carries the full index, including the review report and
any doc-only fixes 5c staged. Before the commit:

```bash
# Paths staged beyond the acceptance artefacts and the registry: 5c's carried set (task.173).
EXTRA=$(git diff --cached --name-only | grep -vxF -f <(printf '%s\n' "${ADD_PATHS[@]}" docs/tasks/task-registry.md) || true)
CARRY_SUFFIX=""; [ -n "$EXTRA" ] && CARRY_SUFFIX="; 5c review carried"
```

Then use `git commit -m "${COMMIT_MSG}${REG_SUFFIX}${CARRY_SUFFIX}"`. `ADD_PATHS` holds the
substituted paths, so compare repo-relative paths on both sides.

Add one line to `shared/resources/develop-pipeline-step-7-finalise.md` next to the boundary check
(`:147`): the 5c set is committed by 6a, so it never appears as dirty here.

## Key Patterns and References

- "Never suppress a `git commit`'s output or exit status in a chain": step-5-6 `:1271`. The 8a
  block reads its exit code. The hook's suppression is its documented contract.
- zsh safety for shell snippets: `halt-snippet-glob-safe.test.mjs` and the `mktemp`/glob
  anti-patterns in `docs/reference/anti-patterns.md`.

## Testing Approach

Put the new tests in `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`. Each one runs
in an `fs.mkdtempSync` git repo, and the blocks are extracted from the shipped markdown rather than
restated, so the test runs what the skill says. Mutation-prove each one (task § 8), and record the
reverts in the implementation report.
