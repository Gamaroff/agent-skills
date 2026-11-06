---
id: task.265.plan
title: "Implementation Plan: Skill prose follows the file-write rules"
type: plan
task-ref: task.265.skill-prose-follows-the-file-write-rules.md
---

# Implementation Plan: Skill prose follows the file-write rules

> Requirements and success criteria: [task.265.skill-prose-follows-the-file-write-rules.md](task.265.skill-prose-follows-the-file-write-rules.md)

## Overview

Prose and one test. Edit only `shared/resources/` and `skills/*/SKILL.md`; never a bundled `references/` copy. Use the Edit tool for every change, one hunk per call.

## Phase-by-Phase Implementation Guide

### Phase 1: State the rule once

**Files to modify:**
- A shared source. Look first for an existing document that already states operator-facing shell rules (`git grep -ln "Edit tool" -- shared/resources`); extend it if one exists, else add `shared/resources/file-write-rules.md`. Cite siblings by bare filename inside `shared/resources/`.
- `shared/resources/develop-pipeline-step-3-develop-loop.md` (section at `:145`): add "change repository files with the file-edit tool, one hunk per call; never an interpreter script, `sed -i`, or a heredoc carrying file content. A multi-hunk change is several edit calls." Cite the rule with a fragment reference.
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the same sentence, because the third slip (task.262, Step 5c) was a one-line `sed -i` on the implementation report there.

**Exact changes:** three sentences, each paired with its replacement (`Edit`, then `git diff --stat` to confirm).

### Phase 2: Mutation revert recipe

**Files to modify:**
- `shared/resources/mutation-proving.md` step 4: replace "a Python `assert new != old` after `str.replace`" with: Edit the one line, run the applied-check block that follows (unchanged), run the test, Edit the line back, `git diff --stat -- <file>` must print nothing. Keep the snapshot in step 1 as the restore point.
- One citation line each in `skills/qa-fix/SKILL.md`, `skills/qa-task/SKILL.md` (near `:849`) and `skills/develop-task/SKILL.md`; confirm the anchor with `grep -n "mutation" skills/develop-task/SKILL.md` first.

### Phase 3: Gate write and fresh-body post

**Files to modify:**
- `skills/qa-task/SKILL.md` Step 10 (`:1266`), after the bind block: "Write the gate with the file tool. Put the two printed values in `head:` and `updated:`; the finding text is typed once, never through the shell." The gate-head freshness test is the backstop for a mistyped value. Mirror in `skills/qa-story/SKILL.md`'s gate step (anchor: `grep -n "Create Quality Gate" skills/qa-story/SKILL.md`).
- `skills/qa-fix/SKILL.md` Step 7 (`:903`): before the post block, `grep -q '^\*\*Commit\*\*: {sha}' "$BODY_FILE" || { echo "body stale"; exit 1; }`, and the sentence "write the body in one call and post it in a later one".
- Citations at the other `--body-file` posting sites: measure the list first with `git grep -n -- '--body-file' -- 'skills/*/SKILL.md' 'shared/resources/develop-pipeline-*.md'`, name each as in scope or excluded in the QA report.

### Phase 4: Ratchet

**Files to modify:**
- New `shared/resources/tests/payload-heredoc-ratchet.test.mjs`. Population: tracked files `skills/*/SKILL.md` and `shared/resources/*.md`, minus `security-input-corpus.md`. Match: `/(cat|tee)[^|\n]*<<-?['"]?[A-Za-z_]+['"]?/`. Allowlist: `{file, lineText}` pairs for today's 32; assert actual count equals allowlist size, every allowlist entry matches exactly one line, and no un-allowlisted line matches. Read files with `git ls-files`, not a directory walk, so gitignored symlinks cannot mask a result.
- Controls: in-test fixtures per the task doc § 8. Run once against the real tree with an extra heredoc line appended in a temp copy to prove red.

### Phase 5: Bundle and sweep

`command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`. Grep `docs/` for "heredoc" restatements.

## Key Patterns and References

- Quoted heredocs end early on a payload holding the delimiter line; that deleted `~/.ssh` once. Unquoted ones execute backticks.
- `tests/mutation-call-site-coverage.test.js` is the model for a prose ratchet with an allowlist.

## Testing Approach

Node test runner; run the new file alone, then the suite under `CI=true`.
