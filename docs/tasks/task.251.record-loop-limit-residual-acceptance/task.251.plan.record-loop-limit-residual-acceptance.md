---
id: task.251.plan
title: "Implementation Plan: Record loop-limit residual acceptance"
type: plan
task-ref: task.251.record-loop-limit-residual-acceptance.md
---

# Implementation Plan: Record loop-limit residual acceptance

> Requirements and success criteria: [task.251.record-loop-limit-residual-acceptance.md](task.251.record-loop-limit-residual-acceptance.md)

## Overview

Add one Node engine, `shared/resources/accept-qa-residual.js`, and its unit suite. It records the owner's acceptance in the highest gate and the implementation report, then points the lock at 5c. Wire it into option 2 of both loop-limit HALT messages, the Phase 0b prompts and the resume contract. Prove each downstream reader with a behavioural test and a control.

## Phase-by-Phase Implementation Guide

### Phase 1: The writer

**Files to create:** `shared/resources/accept-qa-residual.js`, `shared/resources/tests/accept-qa-residual.test.mjs`.
**File to modify:** `shared/resources/qa-diminishing-returns.js`, to add `isOpen` to `module.exports`.

**CLI shape.** Follow the `tracker-comment.js` / `observation-log.js` contract: exit 0 for the success family, 1 for a guard, 2 for usage, and `--json` printing `{ reason, … }`:

```
command node .agents/skills/{develop-task|develop-story}/references/accept-qa-residual.js \
  --doc-dir <dir> --report <implementation-report> \
  --approved-by "<name>" --reason "<text>" [--now <iso>] --json
```

| `reason` | exit | when |
| --- | --- | --- |
| `accepted` | 0 | at least one of the gate and report writes ran |
| `already` | 0 | both were already in the accepted state; no byte written |
| `no-gate` | 1 | no `*.gate.{N}.*.yml` in `--doc-dir` |
| `fail-gate` | 1 | highest gate reads `FAIL` |
| `nothing-to-accept` | 1 | gate is not `WAIVED` and has no open entry (it already exits the loop) |
| `no-loop-limit` | 1 | QA Cycle `{N}` Action is neither `Escalating — loop limit reached` nor an already-accepted entry |
| `no-report-entry` | 1 | the report has no `### QA Cycle {N}` heading for the highest gate |
| `usage` | 2 | a missing or empty required flag |

**Gate selection.** Highest `{N}` over `<doc-dir>/*.gate.{N}.*.yml`, parsed base-10. Reuse the regex `grant-qa-cycles.sh` uses, so the two writers agree on the highest gate.

**Reading.** Use `readGateToken` for the verdict, and `readTopIssues` + `isOpen` to find open entries. Do not write a second parser: obs #134 is a classifier and a writer reading the same input differently.

**Gate edit: line-preserving, never a YAML round trip.** The repository has no YAML dependency (`package.json` devDependencies: the SDK, prettier, wireloom), and a round trip would reformat the gate.

- Replace the `gate:` line's value with `WAIVED`.
- Prefix `status_reason` with `'Issued {OLD}; waived {date} — residual accepted by {approved_by}. '`. Keep the original quote style; for single-quoted YAML, double any `'`.
- Replace the `updated:` value with `--now` or the current UTC time (`new Date().toISOString()` with milliseconds stripped).
- Replace the `waiver:` block (`active: false`, or the flow form `{ active: false }`) with a block-style `active: true`, `reason`, `approved_by` and `approved_at` (date).
- For each open entry in `top_issues`:
  - block style with a `status:` line: rewrite that line's value to `waived`;
  - block style with no `status:` line: insert `status: waived` after the entry's last key line, at the key indentation;
  - flow style: replace `status: open` inside the braces, or append `, status: waived` before the closing `}`.
- Write to `<file>.tmp.<pid>`, then `fs.renameSync`.

**Report edit.** Find `### QA Cycle {N}`, and the section up to the next `### ` or `---`. Within it:

- the `**Action**:` line becomes `**Action**: Proceeding to 5c (PR conformance review)`;
- the `**Loop exit**:` line becomes `**Loop exit**: residual accepted by {approved_by} on {date} (accept-qa-residual)`.

Append one Decisions Log row: find the `## Decisions Log` table and append a row in its column shape. Never touch `### QA Loop Limit Reached — …` or the `**PR Review**` row. Write with temp file + rename.

**Already-state detection**

- Gate: token `WAIVED`, `waiver.active: true`, and no `isOpen` entry.
- Report: the Action reads `Proceeding to 5c` **and** the Loop exit reads `residual accepted by`.

Each write is skipped when its artefact is already in that state. Order: gate first, then report.

**FAIL refusal.** Check `token === "FAIL"` directly. `gateFor` cannot be reused, because it only waives for its `STEP_SKIPS` list. Cite its rule in a comment. The mutation test (remove the check) is what holds it.

### Phase 2: Lock re-entry

Preferred shape: a thin `shared/resources/accept-qa-residual.sh` beside `grant-qa-cycles.sh`, which:

1. runs the JS engine and exits on any non-zero;
2. when `.claude/state/develop-pipeline.lock` is absent, runs `bash "$(dirname "$0")/advance-pipeline-lock.sh" --restore <doc-dir>` and relays its stderr and exit;
3. writes `qa_phase` = `5c` with one `jq` + `mktemp` + `mv`, as `set-qa-phase.sh` does, removing the temp file on failure.

Then:

- Add a `.test.sh` modelled on `grant-qa-cycles.test.sh` (restore from snapshot, refuse another document's snapshot, `qa_phase` = `5c`, other fields untouched), and add it to `package.json:27` `test:suite`.
- In `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, add `acceptScript: "shared/resources/accept-qa-residual.sh"` beside `grantScript` (`:97`) and `reenterScript` (`:104`), and include it in the writer loop at `:300`. Check whether `:312`'s phase-rule assertion needs a sibling line for `5c`.

### Phase 3: Wire and prove

**HALT messages** (`develop-pipeline-step-5-6-qa-loop.md:2112`, `:2136`): option 2 becomes

```
2. Accept the residual: re-run /develop-{story|task} and pick "Accept the residual" in
   Phase 0b — it records the waiver in the gate and resumes at Step 5c (/review-pr), then /finalise
```

Rewrite the note *Option 2 goes through 5c, not around it* to say the writer is what makes 5c read the acceptance. Keep the obs #21 sentence.

**Phase 0b** (`skills/develop-task/SKILL.md:334`, `skills/develop-story/SKILL.md:347`): add the accept arm beside the grant block.

```bash
bash .agents/skills/develop-task/references/accept-qa-residual.sh {task-directory} {implementation-report-path} \
  "$(git config user.name)" "{owner's reason, or: residual accepted at the loop-limit escalation}"
```

Read the JSON `reason`: on `accepted` or `already`, resume at 5c; on anything else, report it verbatim and stay halted. Only offer the arm when `halt_reason` matches `loop-limit`, not `not-converging`. The writer refuses that case too, but the prompt should not offer a path that is refused.

**Resume contract** (`develop-pipeline-resume-contract.md:611`): add step 3b, "Offer the acceptance", beside step 3's grant: one call, its reasons, and what it writes.

**`:343`:** append one sentence: "One exception: `accept-qa-residual` records the owner's acceptance of a loop-limit residual as the gate's `waiver:` — a human decision, not a dev-side verdict, and a `FAIL` is never waived."

**`:487`:** `**Loop exit**: {n/a — this exit not taken / the describeLoopRoute() message verbatim / residual accepted by {approver} on {date} (accept-qa-residual)}`. Check `shared/resources/tests/qa-loop-route.test.mjs:463` and any test that pins this line's text.

**Evals.** Copy `evals/develop-task/step-isolation/12-qa-reentry-after-loop-limit-with-grant/` to the next free number, then edit:

- `scenario.json`: the operator chooses accept, and the assertions are the gate `WAIVED`, the report Action `Proceeding to 5c`, and the lock `qa_phase` `5c`;
- `replay/`: the transcript and the expected end state.

Do the same in `evals/develop-story/step-isolation/`.

**Reader evidence**

- **develop-next / develop-batch.** A test in `evals/develop-next/unit/` (globbed in `package.json`) applies the Step 3 open-entry rule to the written fixture gate, through `readTopIssues` + `isOpen` plus the WAIVED clause, and asserts mergeable. The control gate keeps one `status: open` under WAIVED and must assert HALT. If no executable form of the Step 3 rule exists (it is prose), the test encodes the rule once from the table and cites `skills/develop-next/SKILL.md:297`. Say so in the QA report.
- **Lens.** One `/review-pr --effort low --no-code` run on a scratch branch whose report the writer processed: no trail finding. The control, the unprocessed report, must draw it. Record both in the QA report.

### Phase 4: Bundle, sweep, release notes

```bash
npm run bundle && npm run bundle:check
git grep -n "Accept the current gate status" -- ':!docs/tasks' ':!**/references/**'
git grep -n -i "option 2" -- docs shared/resources skills ':!**/references/**' ':!docs/tasks'
npm run validate -- skills/develop-task/ skills/develop-story/
npm run ci
```

Record each `git grep` command and its hit list in the QA report.

## Key Patterns and References

- `shared/resources/grant-qa-cycles.sh`: the writer this one sits beside (reconstruct from disk, restore via `--restore`, atomic lock write).
- `shared/resources/set-qa-phase.sh`: the atomic `qa_phase` write.
- `shared/resources/qa-diminishing-returns.js`: `readTopIssues`, `readGateToken`, `isOpen`.
- `shared/resources/pipeline-answers.js` `gateFor`: the never-mask-FAIL rule.
- `skills/qa-gate/SKILL.md` § "Schema with Waiver": the `waiver:` shape (`active`, `reason`, `approved_by`).
- Inside `shared/resources/`, cite a sibling by bare filename, never by its `shared/resources/` path. The literal path is a bundling instruction (AGENTS.md § Shared Resources).

## Testing Approach

- Fixtures live in `mkdtempSync(join(tmpdir(), "t251-"))`, removed in `finally` (task.250: no test writes under the repository).
- Fixture 1 (task.250 shape): copy `docs/tasks/task.250.*/task.250.gate.5.*.yml` from its pre-waiver form, `git show 2b696725:<path>`, plus a minimal report whose QA Cycle 5 reads `Escalating — loop limit reached`.
- Fixture 2 (control): a hand-written gate with a mix of entries:
  - `high`, `status: resolved`;
  - `medium`, no `status:`;
  - a flow-style `{ id: X, severity: low, status: open }`;
  - a `waiver: { active: false }` flow form.
- Refusal fixtures: FAIL; Action `Escalating — loop not converging`; Action `Running qa-fix (cycle 5 of 5)`; empty dir.
- Byte-identity: `readFileSync` before and after, compared with `assert.equal`.
- Mutations to prove (revert each, confirm a named test goes red, restore):
  1. delete the FAIL check;
  2. skip stamping `status: waived`;
  3. skip the report rewrite.
