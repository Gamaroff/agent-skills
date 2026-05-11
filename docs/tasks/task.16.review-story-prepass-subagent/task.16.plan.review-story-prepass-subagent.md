---
id: task.16.plan
title: "Implementation Plan: review-story pre-pass subagent"
type: plan
task-ref: task.16.review-story-prepass-subagent.md
---

# Implementation Plan — Task 16

> Requirements and success criteria: [task.16.review-story-prepass-subagent.md](task.16.review-story-prepass-subagent.md)

## Overview

Add Phase 1.5 to `skills/review-story/SKILL.md` between story resolution and interactive Q&A. Dispatch 3 read-only Explore subagents in parallel; consume structured summaries before Q&A.

## Phase 1 — Author prompts

**File**: `shared/resources/review-story-prepass-prompts.md` (new)

Three prompt blocks. Each ≤200 words output, fixed sections.

**Agent A — Epic alignment** (sketch):
```
Read story file at <story_path>. Identify parent_epic from frontmatter `epic:` or directory.
Read parent epic. Compare:
- Story scope vs epic scope
- Story ACs vs epic deliverables
Return YAML:
  alignment: aligned | drift | conflict
  findings:
    - {area, severity, one-line note}
  cap: 5 findings
```

**Agent B — Architecture alignment**: same shape, reads architecture shards from `skills-config.yaml` `architectureShardedLocation`.

**Agent C — Codebase already-implemented**: greps for symbols/files implied by story ACs; reports whether feature exists.

## Phase 2 — Wire into SKILL.md

**File**: `skills/review-story/SKILL.md` — between resolution phase and Q&A.

Add section "Phase 1.5: Pre-pass":
- Dispatch all 3 Explore agents in single message (parallel)
- Schema: each returns YAML matching prompt template
- If any agent fails → continue with remaining; flag missing summary in Q&A

## Phase 3 — Q&A consumption

In Q&A guidance section, add: "Reference pre-pass summaries before asking the user. If a finding has severity ≥ medium, raise it as a clarifying question rather than asking the user to find it."

## Phase 4 — Catalog regen

```bash
npm run generate-catalog
```

## Key References

- Existing Phase 0a Explore pattern: `develop-pipeline-step-0-resolve-and-prepare.md` line 30
- Step 3 pre-develop Explore: `develop-pipeline-step-3-develop-loop.md` lines 20-34 (reuse `≤20-files` shape)

## Testing Approach

Manual run on:
1. Clean story (no drift) → all 3 agents return `aligned`
2. Story with epic-scope drift → Agent A flags it
3. Story duplicating existing feature → Agent C surfaces match with file paths

Verify Q&A length reduced vs baseline runs.
