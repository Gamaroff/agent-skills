# Plan: Subagent Improvements for `/develop-story` Pipeline

## Context

`/develop-story` orchestrates 8 sequential steps (create-branch → review-story → develop-loop → create-pr → qa-story → qa-fix → finalise → commit-changes) over a single main context. Today only **two** read-only Explore subagents exist:

1. Phase 0a — story file resolution
2. Step 3 — pre-develop codebase surface map

Everything else runs in main context: `/review-story` interactive Q&A, every `/develop` iteration (file reads + edits + tests), QA artifact ingestion, full DoD/security/compliance checklists in `/finalise`, full `git diff` reads in `/create-pr`, tracker state polling, test-failure triage. On a 5-iteration develop loop + 2 QA cycles, main context absorbs hundreds of file reads and large test/diff outputs — the precompact graceful-pause hook exists precisely because this happens.

**Goal:** add read-only Explore subagents at every high-volume read point in the pipeline, parallelise where safe, and keep main context as a thin orchestrator that retains only structured summaries. **Constraint:** subagents must remain read-only — main context still owns every Write/Edit. This preserves orchestrator visibility and matches the existing context-hygiene rule (SKILL.md lines 101–109).

## Recommendations

### A. New read-only Explore subagents (drop-in additions)

| # | Step | New subagent | Replaces (in main context) | Returns |
|---|------|--------------|----------------------------|---------|
| 1 | **Step 2 review-story pre-pass** | Triple parallel Explore: epic alignment / architecture alignment / codebase-already-implemented scan | Main reading epic + architecture + grepping codebase before interactive Q&A | 3 compact summaries fed into Q&A; reduces clarifying-question count |
| 2 | **Step 3 develop-loop iteration audit** | Explore reads story file + `git log` since iteration start | Main re-reading full story + git log every iteration | `{status, completed_count, total, last_commit_hash, stalled}` JSON for stall detector |
| 3 | **Step 3 develop-loop test-failure triage** | Explore reads test output file + relevant src files | Main parsing full pytest/jest output + reading sources | ≤10 bullets: real failures vs flakes vs unrelated, plus suggested next file to inspect |
| 4 | **Pre-Step 4 diff summariser** | Explore reads `git diff <base>...HEAD` | Main loading entire diff for PR body | Structured PR body sections (Summary/Changes/Test plan) |
| 5 | **Pre-Step 5 traceability mapper** | Explore maps AC → spec files → src files | `/qa-story` doing this internally in main | Traceability matrix (compact); `/qa-story` consumes via lite-mode hand-off |
| 6 | **Pre-Step 6 QA findings ingester** | Explore reads gate YAML + qa report + bug reports | Main loading 3+ QA artifacts before `/qa-fix` | Findings Summary (≤200 words, risk-sorted) |
| 7 | **Step 7 finalise DoD parallel checks** | **Four parallel** Explore agents: AC traceability / security checklist / compliance checklist / docs-and-changelog completeness | Main running 4 sequential checklists with incremental writes | 4 pass/fail bullet lists; main writes DoD running summary from them |
| 8 | **Tracker state poller** (used in Steps 4, 5, 7) | Explore wraps `gh`/Jira MCP calls | Main running multiple shell + MCP calls inline | `{pr_state, issue_state, board_column, comments_count}` JSON |
| 9 | **Resume stale-context detector** (precompact recovery) | Explore diffs lock file timestamp vs artifact mtimes | Main re-reading every artifact on resume | "What changed since pause" delta + recommended resume step |

### B. Parallelisation (single-message multi-tool-call dispatches)

- **Phase 0 fan-out:** run #1 (story resolver — already exists), tracker state poller (#8), and lite-mode/board detector concurrently. Today these are serial.
- **Step 2 pre-pass:** 3 Explore agents (epic/architecture/codebase) in parallel.
- **Step 7 DoD:** 4 Explore agents (AC/security/compliance/docs) in parallel — biggest single saving since current `finalise` does ≥40 incremental writes serially.

### C. Context-hygiene reinforcements

- After every step, the main context **must** discard subagent intermediate outputs and retain only the structured summary already required by SKILL.md §"Context Management Rule". The new subagents enforce this physically — main never sees raw file bodies, only summaries.
- Implementation Report (already authoritative) gains one new column per step: `subagent_summary_ref` (path to a `.summaries/<step>.json` artifact) so resume can replay summaries without re-running subagents.

### D. Out of scope (deliberately not recommended)

- Running `/develop`, `/qa-fix`, or `/finalise` themselves as write-enabled `general-purpose` subagents. Rejected per user constraint (conservative). Would have given larger savings but cost orchestrator visibility and break the lock-file/resume contract.
- Parallelising the develop loop iterations or QA cycles. They are inherently serial (each iteration depends on the prior commit/gate).

## Critical files to modify

- `skills/develop-story/SKILL.md` — add subagent dispatch references
- `skills/develop-story/references/develop-pipeline-step-0-resolve-and-prepare.md` — fan-out (#1, #8)
- `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md` — add #2, #3 dispatch points
- New: `skills/develop-story/references/develop-pipeline-step-2-review-story-prepass.md` (#1 in table)
- `skills/create-pr/SKILL.md` — diff summariser (#4)
- `skills/qa-story/SKILL.md` — accept caller-supplied traceability matrix (#5)
- `skills/qa-fix/SKILL.md` — accept caller-supplied Findings Summary (#6); existing Step 3 Explore stays
- `skills/finalise/SKILL.md` — replace serial DoD checklists with parallel Explore fan-out (#7); biggest change
- `shared/resources/develop-pipeline-resume-contract.md` — add `subagent_summary_ref` column + #9 resume detector

## Reusable existing patterns

- `skills/develop-story/references/develop-pipeline-step-3-develop-loop.md` lines 20–34 — canonical Explore-with-≤20-files-summary pattern. Reuse this exact shape for #1, #2, #5, #6.
- `skills/qa-fix/SKILL.md` Step 3 (line 497) — Explore with "max 2 lines per file" compact summary. Reuse for #3.
- `shared/resources/resolve-platform.sh` — already used by tracker poller candidates (#8).

## Expected impact

- **Main-context read volume:** ~60–70% reduction on a typical run. Biggest wins: `/finalise` (4× parallel + no incremental writes during checks), develop loop (no full-story re-reads, no full-test-log parsing), `/qa-fix` ingestion.
- **Wall-clock:** Step 2 and Step 7 each become ~3–4× faster (parallel fan-out).
- **Resume robustness:** `.summaries/<step>.json` replay means precompact recovery no longer re-reads artifacts.
- **No new failure modes:** all new subagents are read-only; if any fails, main can fall back to direct reads (document the fallback in each step file).

## Verification plan

1. Pick a representative real story with ≥5 ACs and an existing PR. Run `/develop-story <path>` end-to-end on a branch.
2. Compare baseline (current pipeline) vs experimental (new subagents) runs:
   - Total tokens consumed in main context (`/cost` after each step)
   - Wall-clock per step
   - Number of file reads in main context (count Read tool calls)
   - Resume correctness: trigger precompact mid-Step 3 and mid-Step 7; confirm both resume from correct step using only summaries
3. Run on a story with intentionally failing tests in iteration 2 — verify #3 (test-failure triage) returns useful classification and main does not load full test log.
4. Run on a story whose epic has drifted from architecture — verify #1 (review-story pre-pass) surfaces the conflict before interactive Q&A.
5. Run finalise on a story with all DoD passing and one with security gap — verify #7 parallel agents produce identical DoD running summary content as serial baseline (modulo ordering).
