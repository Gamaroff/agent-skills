---
id: task.24.plan
title: "Implementation Plan: pipeline resume stale-context detector"
type: plan
task-ref: task.24.pipeline-resume-stale-context-detector.md
---

# Implementation Plan — Task 24

> Requirements and success criteria: [task.24.pipeline-resume-stale-context-detector.md](task.24.pipeline-resume-stale-context-detector.md)

## Overview

On resume, dispatch one Explore agent that reads lock + summaries (from task.26) + artifact mtimes; returns recommended-step + deltas.

## Phase 1 — Output schema

```json
{
  "recommended_step": 5,
  "current_step_in_lock": 4,
  "summaries_seen": ["step-1.json","step-2.json","step-3.json","step-4.json"],
  "deltas_since_pause": [
    {"path": "...", "old_mtime": "...", "new_mtime": "...", "concern": "external edit during pause"}
  ],
  "blocking_issues": []
}
```

## Phase 2 — Detector prompt

`shared/resources/pipeline-resume-detector-prompt.md`:

```
Read .claude/state/develop-pipeline.lock (JSON).
List all .summaries/step-*.json in <task_or_story_dir>/.
For each artifact referenced in summaries' raw_artifact_paths: stat mtime; compare with summary's completed_at.
If mtime > completed_at: append to deltas_since_pause.
Recommended step:
  - lock.current_step + 1 if all summaries up to current_step exist
  - lock.current_step (re-execute) if summary missing for current_step
Return JSON only.
```

## Phase 3 — Wire into resume

Add a new "Phase 0a — Detector dispatch" section to `shared/resources/develop-pipeline-resume-contract.md`, immediately preceding the existing Phase 0b artifact verification flow.

In BOTH `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md` resume entry paths:
- First action on resume: dispatch detector (Phase 0a)
- Detector returns `recommended_step` + `deltas_since_pause` + `blocking_issues`
- Phase 0b then verifies only the artifacts up to `recommended_step` (narrows verification scope)
- Main consumes JSON → proceeds to `recommended_step` after user confirmation
- If `blocking_issues` non-empty: surface to user, halt
- Detector output is always surfaced to user; no auto-acceptance.

## Phase 4 — Validation

- Forced precompact mid-step 3, resume → recommended step 3 (re-execute)
- Forced precompact post-step-4, resume → recommended step 5
- Tamper: external `touch` on PR file → delta surfaced

## Key References

- `develop-pipeline-resume-contract.md`
- Lock-file path: `.claude/state/develop-pipeline.lock`
- `.summaries/` convention: task.26

## Testing Approach

1. Three pause points, confirm correct resume step
2. Tamper test: external mtime change → delta in JSON
3. Missing summary file → detector recommends re-execute current_step
