---
id: task.242.plan
title: "Implementation Plan: Scope finalise re-runs"
type: plan
task-ref: task.242.scope-finalise-re-runs.md
---

# Implementation Plan: Scope finalise re-runs

> Requirements and success criteria: [task.242.scope-finalise-re-runs.md](task.242.scope-finalise-re-runs.md)

## Overview

A pure engine with two commands (`scope`, `merge`) and a per-run JSON record. `/finalise` calls `scope` before the AC agent and `merge` after it, so the scope holds even when the agent ignores it.

## Phase-by-Phase Implementation Guide

### Phase 1: The engine

**File:** `shared/resources/finalise-rerun-scope.js`. Follow the CLI shape of `tracker-comment.js` and `observation-log.js`: export the pure functions, and run the CLI only when `argv[1]` is the file itself. `--json` prints `{ reason, exitCode, … }`. Exit 2 means usage.

**Record schema (`schema: 1`):**

```json
{
  "schema": 1,
  "dod_n": 4,
  "head": "<40-hex the agents read>",
  "document": "docs/tasks/…/task.N.name.md",
  "criteria": [
    {
      "ac_id": "SC-11",
      "text_hash": "sha256 of the normalised criterion line",
      "status": "PASS | FAIL",
      "code_citation": "path:line | null",
      "test_citation": "path:line | NOT_APPLICABLE: … | null",
      "members": [{ "member": "…", "evidence": "path:line | null", "status": "PASS | FAIL" }]
    }
  ],
  "advisories": [{ "ac_id": "…", "note": "…" }]
}
```

**Normalising a criterion line:** take the `- [ ]`/`- [x]` line under `## 9. Success Criteria` (tasks) or `## Acceptance Criteria` (stories). Strip the checkbox, collapse whitespace, then hash it. A change to the checkbox alone is not a reword.

**Criterion id (task § 3, *Criterion identity*):** the leading id (`SC-7`, `AC3`) when the line has one, else `#N` by position. Match a prior criterion by id when the document has ids, else by `text_hash`. Store `id` in each record entry, and hand the ids to the agent in `<RERUN_SCOPE>` on every run.

**Resolving a citation (task § 3, *Citation paths*):** strip `:line`. Keep the path if `git ls-files` lists it. Otherwise, if exactly one tracked file has that basename, use it. Anything else (`:N-M`, a SHA, an ambiguous basename) is unresolved. A PASS with no resolved path is `evidence-unresolved` and is re-judged.

**Reading criteria from the document:** do not hand-write a second section reader. `shared/resources/jira-sync.js:1228` (`function extractSection(body, name)`) already extracts a named section, numbered or not, and the card sync relies on it. Reuse it for the section, and add only the line-level step (checkbox line → id + normalised text) in this engine. Test it on a story fixture and a task fixture.

**Paths from a citation:** resolve as above. A `NOT_APPLICABLE: …` or null citation contributes no path. Treat a member's evidence the same way.

**`scope(prior, doc, head)`:**

1. If there is no prior record, return `full`/`no-prior-record`.
2. If the record does not parse or `schema !== 1`, return `full`/`prior-unreadable`.
3. If the reopen rule holds — `^## Definition of Done.*(PASSED|✅)` count > 0 and frontmatter status is not `accepted`, the same test as `skills/finalise/SKILL.md` § Step 2 — return `full`/`reopened`.
4. If `git merge-base --is-ancestor prior.head HEAD` fails, return `full`/`head-not-ancestor`.
5. Get `changed = git diff --name-only prior.head HEAD`, then walk § 3's table for each criterion. For a `reported-gap`, return the members with `status: PASS` and unchanged, resolved evidence as `carried_members`, and the prior member names as `known_members`.

**`merge(scope, agentYaml)`:** parse `agentYaml` with `parseYamlSubset` from `yaml-subset.js` (checked 2026-10-29: it reads a nested `acs[].members[]` sample and `advisories: []`). If the parse fails, return a parse reason. Step 3c's existing `NEEDS_MANUAL_REVIEW` rule then applies, and no record is written. Join on the engine's ids. In `full` mode the agent's result passes through, with `overall` recomputed. In `scoped` mode:

- For each `carry` entry: set the criterion to the prior status and citations. If the agent returned that criterion with a different status, push `{ ac_id, note: "agent re-judged a carried criterion: <its note>" }` to `advisories[]`.
- For a `reported-gap`:
  - restore the `carried_members`;
  - keep the agent's verdict on the prior FAIL members and on the members whose evidence changed or is unresolved;
  - send a member absent from `known_members` whose evidence is resolved and unchanged to `advisories[]`;
  - then set the criterion's status from the counted members: PASS when all are PASS. Never take the agent's.
- Recompute `overall` from the merged `acs[]` and `docs[]`: PASS when every item is PASS (or a `docs[]` item is `NOT_APPLICABLE`), FAIL when no criterion passes, PARTIAL otherwise. Never copy the agent's.

### Phase 2: The AC prompt

Add `### Step 0: Read the re-run scope` after `## Instructions` and before Step 1. Leave the four existing step headings untouched. Text, in substance:

- `<RERUN_SCOPE>` always lists the criterion ids to use as `ac_id`. It is either `full` or a list of `rejudge` and `carry` entries.
- Constraints from the tests that read this prompt: no instruction to write anything (`tests/explore-prompts-no-write.test.js`), and no count of kinds (`tests/lib/count-of-kinds.js`). The count stays in Step 3.
- On `full`, judge every criterion, as in Step 3.
- Otherwise, judge only the `rejudge` entries. For a `reported-gap` entry, re-check the members the scope lists as not carried, and the commits since the prior head. Copy each `carry` entry through unchanged. If you see a problem in a carried criterion, put it in `advisories[]` with its evidence. It is reported but does not fail the run.

Output additions: `members:` under an AC (required when the quantifier rule applies), and a top-level `advisories:` list.

### Phase 3: Wire `/finalise`

- **Step 3a** (the existing "Prepare Shared Context" step, extended; no new heading). Resolve the prior record with `source …/newest-numbered.sh` and `newest_numbered "{document-directory}" dod -name "${STEM}.dod.*.ac.json"`. Note that this glob must not match `*.security.*`. Then run `scope` and print `mode`/`reason`.
  - **Checked 2026-10-29:** given `dod.2.ac.json`, `dod.4.ac.json`, `dod.10.ac.json` and `dod.10.security.run.json`, `newest_numbered … -name "task.9.dod.*.ac.json"` returned `dod.10.ac.json`. It orders numerically and does not match the security record. Pin this with a fixture test anyway.
- **Dispatch table:** add `<RERUN_SCOPE>` to row 1.
- **Step 3c** (existing "Aggregate Results", after the YAML parse, before Step 3d): run `merge`, write `${STEM}.dod.${DOD_N}.ac.json` with `head` = the head captured at 3a, and render the Step 2 block with the scope line and advisories.
- **Bug-mode table:** add `| \`rerun-scope\` | Step 3a — re-run scope | run | **skip** — fix-evidence has no criteria list |` and the marker beside Step 3a.
- **6a `ADD_PATHS` and the gaps path:** stage the `.ac.json` with the DoD file. On a bug run there is none to stage.

### Phase 4: Bundle, docs, record

`npm run bundle`, then `npm run bundle:check`. Add a CHANGELOG entry. For each mutation, snapshot with `cp`, mutate with the Edit tool, run the test, and restore with `cp`.

## Key Patterns and References

- CLI idiom and exit codes: `shared/resources/tracker-comment.js`, `shared/resources/observation-log.js`
- Newest-numbered lookup: `shared/resources/newest-numbered.sh`
- Committed per-run records beside the DoD: `{STEM}.dod.{N}.security.run.json` (security probe)
- Reopen rule: `skills/finalise/SKILL.md` § Step 2, item 2

## Testing Approach

- `shared/resources/tests/finalise-rerun-scope.test.mjs`: build a temp git repo per case (`git init`, commit A with the record's head, commit B with the change), then call the exported functions and the CLI.
- task.239 replay: hand-write a run-4-shaped record (SC-11 FAIL, with members split into mapped and unmapped). HEAD changes only the task document.
- Contract tests in `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`: the Step 3 heading is byte-identical, a Step 0 scope section exists, and `<RERUN_SCOPE>` is in the SKILL dispatch table.
