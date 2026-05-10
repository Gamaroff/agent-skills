---
name: pipeline-resume-detector-prompt
description: Explore subagent prompt for the pipeline-resume stale-context detector (task.24). Dispatched as Phase 0a on resume, before Phase 0b artifact verification. Reads lock + step summaries + artifact mtimes; returns recommended_step, deltas_since_pause, and blocking_issues. Used by develop-story and develop-task orchestrators.
---

# Pipeline Resume — Stale-Context Detector Prompt

## Purpose

This prompt is dispatched as a **read-only Explore subagent** at resume time (Phase 0a), immediately after re-reading the skill file and before any artifact verification. It diffs the lock-file's `current_step` against available step summaries and artifact mtimes, then returns a recommended resume step plus any changes detected since the pipeline paused.

The orchestrator consumes the JSON output. It never re-reads raw artifacts itself — the subagent does the reading. The detector's `recommended_step` narrows which steps Phase 0b then verifies.

---

## Output Schema

Return **JSON only** — no prose, no markdown fences, no explanation:

```json
{
  "schema_version": 1,
  "recommended_step": 5,
  "current_step_in_lock": 4,
  "summaries_seen": ["step-1-pre-develop-map.json", "step-2-review-prepass.json"],
  "deltas_since_pause": [
    {
      "path": "docs/development/tasks/task.24.../task.24.*.md",
      "old_mtime": "2026-05-10T10:00:00Z",
      "new_mtime": "2026-05-10T10:05:00Z",
      "concern": "external edit during pause"
    }
  ],
  "blocking_issues": []
}
```

### Field definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | integer | yes | Always `1` |
| `recommended_step` | integer | yes | Step the orchestrator should resume from (1–8) |
| `current_step_in_lock` | integer | yes | `current_step` from the lock file |
| `summaries_seen` | string[] | yes | Filenames (not full paths) of `.summaries/step-*.json` found and valid |
| `deltas_since_pause` | object[] | yes | Artifacts whose mtime exceeds their summary's `completed_at`. Empty array if none. |
| `blocking_issues` | string[] | yes | Human-readable issues that must be resolved before resuming. Empty array if none. |

### `deltas_since_pause` object fields

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Repo-relative path of the changed artifact |
| `old_mtime` | string | ISO-8601 UTC — `completed_at` from the summary that references this path |
| `new_mtime` | string | ISO-8601 UTC — current mtime of the file (`stat` output) |
| `concern` | string | Human-readable concern label, e.g. `"external edit during pause"` |

---

## Detector Logic

### Step 1 — Read the lock file

```bash
cat .claude/state/develop-pipeline.lock
```

Extract:
- `current_step` → `LOCK_STEP`
- `task_or_story_directory` → `DOC_DIR`
- `branch` → verify it exists: `git branch --list "{branch}"`

If lock file absent or invalid JSON: set `blocking_issues: ["Lock file absent or unreadable — cannot determine resume step"]`, `recommended_step: 1`.

If branch does not exist locally: add `"Branch recorded in lock does not exist — manual recovery required"` to `blocking_issues`.

### Step 2 — List and validate step summaries

```bash
ls "{DOC_DIR}/.summaries/step-*.json" 2>/dev/null | sort
```

For each file found:
1. Validate: `jq -e '.schema_version == 1 and (.step | type == "number") and (.agent | type == "string")' <file>`
2. If valid: record filename in `summaries_seen` and note its `step` number
3. If invalid: skip (treat as absent — do not add to `summaries_seen`)

### Step 3 — Check for summary gaps

Compare the set of valid summary step numbers against `1 .. LOCK_STEP`:

- **All summaries present** (steps 1..LOCK_STEP all have valid `.json`): `recommended_step = LOCK_STEP + 1`
  - Rationale: lock was written at end of step N meaning step N completed; resume at N+1
- **Summary missing for `LOCK_STEP`**: `recommended_step = LOCK_STEP` (re-execute)
  - Rationale: lock was updated but step may not have fully completed (interrupted mid-step)
- **Summary missing for an earlier step** (gap before LOCK_STEP): add to `blocking_issues`:
  - `"Summary missing for step {N} — earlier step may have been skipped or corrupted"` 
  - Still set `recommended_step = LOCK_STEP` (conservative)

**Note**: Steps 1, 2, 4, and 8 do not produce summaries — they do not dispatch Explore subagents. If they are within range, treat their absence as expected — do not flag as missing.

Exemption list: `[1, 2, 4, 8]`
- Step 1 (create-branch): no subagent
- Step 2 (review-task / review-story): no subagent
- Step 4 (create-pr): no subagent
- Step 8 (commit-changes): no subagent

### Step 4 — Check artifact mtimes for deltas

For each valid summary in `summaries_seen`, read its `raw_artifact_paths` array.

For each path in `raw_artifact_paths`:
1. Check file exists: `ls "{path}" 2>/dev/null`
2. If missing: add to `blocking_issues`: `"Artifact referenced in step-{N} summary no longer exists: {path}"`
3. If exists: get mtime in ISO-8601 UTC:
   ```bash
   # macOS:
   stat -f "%Sm" -t "%Y-%m-%dT%H:%M:%SZ" "{path}"
   # Linux:
   date -u -d "@$(stat -c %Y '{path}')" +%Y-%m-%dT%H:%M:%SZ
   ```
4. Compare mtime vs summary's `completed_at`:
   - If `mtime > completed_at`: append to `deltas_since_pause` with `concern: "external edit during pause"`

### Step 5 — Return JSON

Emit the result object with all fields. Do NOT emit any other text.

---

## Recommended Step Decision Table

| Condition | `recommended_step` |
|-----------|-------------------|
| Lock absent / unreadable | 1 |
| All summaries for steps 1..LOCK_STEP present | LOCK_STEP + 1 |
| Summary for LOCK_STEP absent | LOCK_STEP (re-execute) |
| Summary gap before LOCK_STEP | LOCK_STEP (conservative) + blocking_issue |
| Branch missing | Same as above + blocking_issue |

---

## Invocation Context

The orchestrator dispatches this as an **Explore subagent**. Key constraints:

- **Read-only**: no writes, no git operations beyond `git branch --list`
- **Return JSON only**: the orchestrator parses the output with `jq`
- **No fallback prose**: if a field cannot be determined, use a safe default and record in `blocking_issues`
- **macOS/Linux portable**: use the dual-form `stat` commands above

The orchestrator validates the result with:

```bash
jq -e '.schema_version == 1 and (.recommended_step | type == "number") and (.blocking_issues | type == "array")' <output>
```

If validation fails: orchestrator falls back to full Phase 0b artifact verification using `LOCK_STEP` as the upper bound.
