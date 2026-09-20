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
| `deltas_since_pause` | object[] | yes | Artifacts whose mtime exceeds their summary's `completed_at`, **and every note this prompt files** (stale-snapshot verdicts and skip notes, other-document snapshots, lock `qa_phase`, grant budget, the missing-column note, halt/pause causes). **Every element is an object of the shape below — never a bare string.** The orchestrator's schema check requires `all(.deltas_since_pause[]; type == "object")`, and one string element drops a healthy resume to full verification (task.130 QA cycles 3–4, bugs 6 and 10). Empty array if none. |
| `blocking_issues` | string[] | yes | Human-readable issues that must be resolved before resuming. Empty array if none. |

### `deltas_since_pause` object fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string \| null | yes | Repo-relative path of the artifact the delta or note is about; `null` for a note about no file (the lock's `qa_phase`, the grant budget, a halt cause) |
| `concern` | string | yes | Human-readable label — a verdict (`"stale-snapshot: PR merged"` is the one the orchestrator acts on), a skip note, or a note |
| `old_mtime` | string | mtime deltas only | ISO-8601 UTC — `completed_at` from the summary that references this path; **omitted on notes** (CR-5) |
| `new_mtime` | string | mtime deltas only | ISO-8601 UTC — current mtime of the file (`stat` output); **omitted on notes** |

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

Every note any step of this prompt files in `deltas_since_pause` is a delta **object** — the shape is stated once, in § Output Schema's `deltas_since_pause` object fields, and governs every site below.

1. Read every candidate listed. Drop any whose `task_or_story_directory` is not the directory of the document being resumed — and **report each one dropped** in `deltas_since_pause` as `{ "path": "<that snapshot>", "concern": "stale snapshot for <other dir> ignored" }`; a leftover for another task is itself worth the operator's attention.
2. **Stale snapshot after merge (task.124, obs #88).** For a `last-halt.json` that *is* for this document, check whether the run it records has already **finished**: the snapshot's `pr_url` is set and `gh pr view <pr_url> --json state --jq .state` returns `MERGED`. If so, the snapshot outlived its run — a completed run deletes its own snapshot at Step 8 since task.124, so one that survives is a leftover from before that, or from a run that completed outside the pipeline. Report it in `deltas_since_pause` as an ordinary delta object — `{ "path": "<snapshot path>", "concern": "stale-snapshot: PR merged" }`, the object's existing fields (§ `deltas_since_pause` object fields) — **with that exact `concern` string: it is the only label the orchestrator acts on** (resume contract § Consume Output matches it by equality, never by prefix, because the two skip notes below share the `stale-snapshot` prefix and must never be deleted on — task.130 QA cycle 2, bug 3) — drop it from the candidates, and **do not delete it**: this prompt is read-only, and the delete is the orchestrator's, verified on disk (resume contract § Consume Output; task.130, PR #436 review CR-3). A subagent that reports a delete it may not have performed is worse than one that reports nothing — the orchestrator would trust the report over the directory. Never offer a resume of merged work.

   **This check is `gh`-only, and a failed read is never evidence of MERGED.** Branch on the URL
   host first: a `pr_url` that is not a github.com pull request (Bitbucket, via `create-pr`'s
   auto-detection) skips the check with `"stale-snapshot check skipped — pr_url is not a GitHub
   PR"`; a github.com `pr_url` whose `gh pr view` fails (offline, unauthenticated, rate-limited)
   skips it with `"stale-snapshot check skipped — gh pr view failed: <first stderr line>"`. Either
   way the snapshot stays an ordinary candidate and the note goes in `deltas_since_pause` as `{ "path": "<the snapshot>", "concern": "<the note>" }` (task.124
   QA cycle 3 CR-5; cycle 4 CR-3 — one label per cause, never one label for both). Step 8's
   same-document deletion covers the completed-run case on every platform.

   **`status: accepted` is not finished, and must not fire this rule** (task.124 QA cycle 2, CR-1). `/finalise` writes `accepted` at its Step 7 action 6a — *before* its second CI reading, whose `ci-not-green-on-acceptance-head` HALT is a documented outcome, and before Step 8 runs. A snapshot for an accepted document is therefore the most likely shape of a **live** post-acceptance halt or pause, and deleting it destroys exactly the resume record the halt wrote. An accepted document with an OPEN (or unknown, or no) PR is an ordinary candidate.
3. Of the candidates that remain, take the **newest by mtime** (the `ls -t` order above).
4. `source` is `"halt_snapshot"` when the winner is `last-halt.json`, `"orphaned_claim"` when it is a `.pausing.*` file.

Extract from the winner (or from the lock, when present):
- `current_step` (lock or orphaned claim) or `halt_step` (snapshot) → `LOCK_STEP`
- `task_or_story_directory` → `DOC_DIR`
- `branch` → verify it exists: `git branch --list "{branch}"`

Snapshot-specific fields (when the winner is `last-halt.json`):
- `halt_reason` (terminal HALT) **or** `pause_reason` (PreCompact, value `"precompact"`) → human-readable cause; file it as `{ "path": "<the snapshot>", "concern": "halt_reason: <value>" }` (or `pause_reason: …`) in `deltas_since_pause` for the user surface
- `halted_at` (terminal HALT) **or** `paused_at` (PreCompact) → ISO-8601 timestamp of the halt/pause

QA-loop fields (lock or snapshot, both optional — absent on a run that predates task.123):
- `qa_phase` (`5a|5b|5c`) → the loop's sub-position when the run stopped; report it in `deltas_since_pause` as `{ "path": null, "concern": "lock qa_phase: 5b" }` when `LOCK_STEP` is 5
- `extra_cycles_granted` / `qa_max_cycles` (integers) → a grant recorded by a previous re-entry and the absolute budget it set; report both in `deltas_since_pause` as `{ "path": null, "concern": "extra_cycles_granted: {k}; qa_max_cycles: {n}" }` so the operator sees the budget the run will resume under. When `halt_reason` matches `loop-limit|not-converging`, also report the highest `gate.{N}` on disk against the count of `### QA Cycle` entries in the implementation report — a difference is a cycle the operator ran outside the loop, and the resume contract's **Re-entry after a QA loop escalation** back-fills it

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

**A summary is expected only where the report says one was written (task.124, obs #86).** The
earlier rule keyed on a fixed exemption list — `[1, 2, 4, 8]` never dispatch a subagent, every
other step does — and so raised `Summary missing for step 3` as a **blocking** issue on every
healthy resume of a run whose Step 3 had simply run its codebase map inline, or whose Step 5 loop
never dispatched a traceability mapper. A missing file is evidence of a gap only when something
claimed the file would exist. That claim lives in one place: the implementation report's Pipeline
Progress table, column **`Subagent summary ref`**.

Read the report named by the lock's `report_path`. For each row of the Pipeline Progress table
whose step number is in `1..LOCK_STEP`:

- the cell reads `—` (or is blank) → the step ran inline; **no summary is expected**, and its
  absence is never a gap;
- the cell names a path (`.summaries/step-N-<name>.json`) → resolve it relative to `DOC_DIR` and
  require it. Missing or invalid (fails the `jq -e` check in Step 2) → this is a gap.

Build `EXPECTED` = the set of `(step, path)` pairs the table names. Then:

- **Every expected summary present and valid**: `recommended_step = LOCK_STEP + 1`
  - Rationale: lock was written at end of step N meaning step N completed; resume at N+1
- **An expected summary for `LOCK_STEP` is missing**: `recommended_step = LOCK_STEP` (re-execute)
  - Rationale: lock was updated but step may not have fully completed (interrupted mid-step)
- **An expected summary for an earlier step is missing**: add to `blocking_issues`:
  - `"Summary missing for step {N} — the report names {path} and it is absent; the step may have been skipped or corrupted"`
  - Still set `recommended_step = LOCK_STEP` (conservative)
- **The report has no `Subagent summary ref` column** (a run that predates the column): treat
  every cell as `—` — nothing is expected — and file `{ "path": "<the report>", "concern": "report
  has no Subagent summary ref column; summary-gap check skipped" }` in `deltas_since_pause`. A missing column is a report shape, not a
  gap; the pre-task.124 exemption list is **not** the fallback, because it is the rule that fired
  on every healthy resume.
- **The report cannot be read at all** (the lock's `report_path` is absent or unparseable): that is
  "could not look", not "nothing expected", and the two must not resolve to the same step (QA cycle
  1, CR-6). Add `"Implementation report at {report_path} is missing or unreadable — cannot verify
  step summaries"` to `blocking_issues` and set `recommended_step = LOCK_STEP` (conservative).

Steps 1, 2, 4 and 8 never dispatch a subagent and their cells are always `—`; Step 5c dispatches
no summary-writing subagent of its own (`/review-pr` runs its lenses internally). None of that is
special-cased any more — the column already says so.

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
   - If `mtime > completed_at`: append `{ "path": "<artifact>", "old_mtime": "<completed_at>", "new_mtime": "<mtime>", "concern": "external edit during pause" }` to `deltas_since_pause`

### Step 5 — Return JSON

Emit the result object with all fields. Do NOT emit any other text.

---

## Recommended Step Decision Table

| Condition | `recommended_step` |
|-----------|-------------------|
| Lock absent / unreadable | 1 |
| Every summary the report's `Subagent summary ref` column names is present and valid (a `—` cell expects nothing) | LOCK_STEP + 1 |
| The report names a summary for LOCK_STEP and it is absent | LOCK_STEP (re-execute) |
| The report names a summary for an earlier step and it is absent | LOCK_STEP (conservative) + blocking_issue |
| Report without the `Subagent summary ref` column | LOCK_STEP + 1 (nothing expected) + a `deltas_since_pause` note |
| Report missing or unreadable | LOCK_STEP (conservative) + blocking_issue |
| Branch missing | Same as above + blocking_issue |
| A `last-halt.json` for this document whose PR is `MERGED` | not a candidate — reported as `stale-snapshot`; the orchestrator deletes |
| A `last-halt.json` for this document whose document is `accepted` but whose PR is not MERGED | an ordinary candidate — a live post-acceptance halt/pause (Step 7 6a → Step 8) |

---

## Invocation Context

The orchestrator dispatches this as an **Explore subagent**. Key constraints:

- **Read-only** — no writes, no git operations beyond `git branch --list` and the `gh pr view … --json state` read in Step 1. A `last-halt.json` proven stale by a `MERGED` PR is *reported* (Step 1, item 2); the orchestrator deletes it and verifies the deletion (task.130)
- **Return JSON only**: the orchestrator parses the output with `jq`
- **No fallback prose**: if a field cannot be determined, use a safe default and record in `blocking_issues`
- **macOS/Linux portable**: use the dual-form `stat` commands above

The orchestrator persists the returned JSON to `{doc-directory}/.summaries/step-0a-resume-detector.json` and validates it — schema version, numeric `recommended_step`, array `blocking_issues`, and `deltas_since_pause` an **array of objects** — with the one check stated in the resume contract § Consume Output (not restated here: a second copy drifted the moment the first gained a field — task.130 QA cycle 3, CR-4). If validation fails the orchestrator falls back to full Phase 0b artifact verification using `LOCK_STEP` as the upper bound.
