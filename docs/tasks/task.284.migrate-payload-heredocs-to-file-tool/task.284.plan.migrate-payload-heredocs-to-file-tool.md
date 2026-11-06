---
id: task.284.plan
title: "Implementation Plan: Migrate shipped payload heredocs to the file tool"
type: plan
task-ref: task.284.migrate-payload-heredocs-to-file-tool.md
---

# Implementation Plan: Migrate shipped payload heredocs to the file tool

> Requirements and success criteria: [task.284.migrate-payload-heredocs-to-file-tool.md](task.284.migrate-payload-heredocs-to-file-tool.md)

## Overview

For each allowlist entry, replace the `cat > FILE <<'EOF' … EOF` lines with a sentence telling the agent to write FILE with the file tool, keep the block that reads FILE, and delete the entry. One commit per axis.

## Phase-by-Phase Implementation Guide

### Phase 1 to 4: per site

1. Read the site and note whether the heredoc was unquoted (expansion): if so, name the values the agent must write in.
2. Edit the prose: the file is written by the file tool at the same path; the shell block begins at the read.
3. Delete the matching `[file, text, count]` row in `shared/resources/tests/payload-heredoc-ratchet.test.mjs`.
4. Run the ratchet test, then `npm run bundle`.

### Phase 5: citations and tidy

Cite `file-write-rules.md#fresh-body-post` (fragment, so it bundles the rule alone) at each remaining `--body-file` site. Then remove the allowlist and assert zero.

## Key Patterns and References

`shared/resources/file-write-rules.md`; the three sites task 265 already migrated as examples (`qa-task` Step 10, `qa-story` gate step, `qa-fix` Step 7).

## Testing Approach

Ratchet test after each deletion; `qa-execute-snippets.mjs` per changed block; `CI=true npm test` at the end.
