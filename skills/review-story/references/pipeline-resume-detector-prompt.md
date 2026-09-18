---
name: pipeline-resume-detector-prompt
description: Explore subagent prompt for the pipeline-resume stale-context detector (task.24). Dispatched as Phase 0a on resume, before Phase 0b artifact verification. Reads lock + step summaries + artifact mtimes; returns recommended_step, deltas_since_pause, and blocking_issues. Used by develop-story and develop-task orchestrators.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/pipeline-resume-detector-prompt.md. Regenerate via `npm run bundle`. -->

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
  "source": "lock",
  "recommended_step": 5,
  "current_step_in_lock": 4,
  "halt_reason": null,
  "summaries_seen": ["step-1-pre-develop-map.json", "step-2-review-prepass.json"],
  "deltas_since_pause": [
    {
      "path": "docs/tasks/task.24.../task.24.*.md",
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
| `source` | string | yes | `"lock"` (active pipeline), `"halt_snapshot"` (prior terminal HALT or compaction pause), `"orphaned_claim"` (a PreCompact hook killed between its lock claim and its snapshot), or `"none"` (fresh start) |
| `recommended_step` | integer | yes | Step the orchestrator should resume from (1–8) |
| `current_step_in_lock` | integer | yes | `current_step` from active lock, or `halt_step` from snapshot, or `0` if none |
| `halt_reason` | string\|null | yes | Populated only when `source == "halt_snapshot"`; otherwise `null` |
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

### Step 1 — Read the lock file (or halt snapshot)

Active lock first:
```bash
cat .claude/state/develop-pipeline.lock
```

If the lock is absent, the state — if any — is in one of two places, and **neither may be assumed to be about this document or fresher than the other**:

- the **halt snapshot** `.claude/state/develop-pipeline.last-halt.json`, written by a terminal HALT **or by the PreCompact hook** (an interrupted compaction) — and **never consumed on a successful resume**, so a snapshot from an earlier run, even of another task, persists indefinitely;
- an **orphaned claim** `.claude/state/develop-pipeline.lock.pausing.<pid>` — the PreCompact hook claims the lock by renaming it *before* it writes the snapshot (task.120), so a hook killed inside that window leaves the pipeline's state **only** under the claimed name: the lock byte for byte, renamed. It is swept only by the *next* successful pause, which by then has claimed a newer lock, so reading it here is never raced.

**Choose between them by document, then by age — not by a fixed order** (task.120 bug.5: a fixed snapshot-first order let a stale `last-halt.json` from a previous task shadow a fresher claim for this one, and would have recommended resuming the wrong task):

```bash
ls -t .claude/state/develop-pipeline.last-halt.json .claude/state/develop-pipeline.lock.pausing.* 2>/dev/null || true
```

1. Read every candidate listed. Drop any whose `task_or_story_directory` is not the directory of the document being resumed — and **report each one dropped** in `deltas_since_pause` ("stale snapshot for `<other dir>` ignored"); a leftover for another task is itself worth the operator's attention.
2. Of the candidates that remain, take the **newest by mtime** (the `ls -t` order above).
3. `source` is `"halt_snapshot"` when the winner is `last-halt.json`, `"orphaned_claim"` when it is a `.pausing.*` file.

Extract from the winner (or from the lock, when present):
- `current_step` (lock or orphaned claim) or `halt_step` (snapshot) → `LOCK_STEP`
- `task_or_story_directory` → `DOC_DIR`
- `branch` → verify it exists: `git branch --list "{branch}"`

Snapshot-specific fields (when the winner is `last-halt.json`):
- `halt_reason` (terminal HALT) **or** `pause_reason` (PreCompact, value `"precompact"`) → human-readable cause (include in `deltas_since_pause` for the user surface)
- `halted_at` (terminal HALT) **or** `paused_at` (PreCompact) → ISO-8601 timestamp of the halt/pause

QA-loop fields (lock or snapshot, both optional — absent on a run that predates task.123):
- `qa_phase` (`5a|5b|5c`) → the loop's sub-position when the run stopped; report it in `deltas_since_pause` as "lock qa_phase: 5b" when `LOCK_STEP` is 5
- `extra_cycles_granted` (integer) → a grant recorded by a previous re-entry; report it in `deltas_since_pause` as "extra_cycles_granted: {k} (QA_MAX_CYCLES = 5 + k)" so the operator sees the budget the run will resume under. When `halt_reason` matches `loop-limit|not-converging`, also report the highest `gate.{N}` on disk against the count of `### QA Cycle` entries in the implementation report — a difference is a cycle the operator ran outside the loop, and the resume contract's **Re-entry after a QA loop escalation** back-fills it

> A snapshot tagged `pause_reason: "precompact"` was left by the PreCompact hook before it removed the lock — surface it to the user as "resume from the compaction pause at step X?" rather than a hard terminal halt.

An orphaned claim carries no `halt_step`, `pause_reason` or `paused_at` — treat it like a `cp`-degraded snapshot, and surface it as "a compaction pause was interrupted before it could save its snapshot; resume from step X?".

Set an output field `source: "lock" | "halt_snapshot" | "orphaned_claim" | "none"` so the orchestrator can prompt the user appropriately ("resume the active pipeline?" vs. "resume from the prior halt at step X?" vs. "resume from the interrupted pause at step X?").

If no lock is present and no candidate survives step 1 (none exist, or every one belongs to another document): set `blocking_issues: ["No active lock, no halt snapshot and no orphaned claim for this document — cannot determine resume step"]`, `recommended_step: 1`, `source: "none"`. The orchestrator should treat this as a fresh start — and still surface any dropped candidates.

If the file is present but invalid JSON: add `"Lock/snapshot file unreadable — cannot determine resume step"` to `blocking_issues`.

If branch does not exist locally: add `"Branch recorded in lock/snapshot does not exist — manual recovery required"` to `blocking_issues`.

### Step 2 — List and validate step summaries

```bash
ls "{DOC_DIR}/.summaries/step-*.json" 2>/dev/null | sort
```

For each file found:
1. Validate: `jq -e '.schema_version == 1 and (.step | type == "number") and (.agent | type == "string")' <file>`
2. If valid: record filename in `summaries_seen` and note its `step` number
3. If invalid: skip (treat as absent — do not add to `summaries_seen`)

### Step 3 — Check for summary gaps

**Summary-exempt steps** (never dispatch Explore subagents — absence is expected, never a gap):

Exemption list: `[1, 2, 4, 8]` — **unchanged by Step 5c.** The list is keyed by whole integer step,
so no sub-step can alter it, and Step 5 is already non-exempt. 5c dispatches no summary-writing
subagent of its own — `/review-pr` runs its lenses internally — so it contributes no
`.summaries/step-*.json` entry and its absence is never a gap.
- Step 1 (create-branch): no subagent
- Step 2 (review-task / review-story): no subagent
- Step 4 (create-pr): no subagent
- Step 8 (commit-changes): no subagent

Build `REQUIRED_STEPS` = steps in `1..LOCK_STEP` that are NOT in the exemption list.

Compare the set of valid summary step numbers against `REQUIRED_STEPS`:

- **All required summaries present** (every step in REQUIRED_STEPS has a valid `.json`): `recommended_step = LOCK_STEP + 1`
  - Rationale: lock was written at end of step N meaning step N completed; resume at N+1
- **Summary missing for `LOCK_STEP`** (and LOCK_STEP is in REQUIRED_STEPS): `recommended_step = LOCK_STEP` (re-execute)
  - Rationale: lock was updated but step may not have fully completed (interrupted mid-step)
- **Summary missing for an earlier required step** (gap in REQUIRED_STEPS before LOCK_STEP): add to `blocking_issues`:
  - `"Summary missing for step {N} — earlier step may have been skipped or corrupted"` 
  - Still set `recommended_step = LOCK_STEP` (conservative)

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
| All required summaries present (REQUIRED_STEPS all have valid `.json`) | LOCK_STEP + 1 |
| Summary for LOCK_STEP absent (and LOCK_STEP ∈ REQUIRED_STEPS) | LOCK_STEP (re-execute) |
| Summary gap for earlier required step | LOCK_STEP (conservative) + blocking_issue |
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
