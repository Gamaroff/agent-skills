---
id: task.327
title: "SubagentHandback replies are extracted, not hand-copied"
type: task
description: "Teach both extractors to read the `SubagentHandback` tool_use's `input.message` as the agent's reply when no final assistant text exists."
tags: [finalise, observation]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-26
updated: 2026-11-26
estimated_effort_hours: 8
github_issue: 952
---

# Technical Task: SubagentHandback replies are extracted, not hand-copied

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.327.review.1.subagenthandback-replies-are-extracted.md` implemented 2026-11-26
**GitHub Issue**: [#952](https://github.com/Gamaroff/agent-skills/issues/952)

---

## 1. Overview

`/finalise` takes two subagent answers out of their transcripts byte for byte: the security agent's
probe plan and the AC agent's YAML. In this harness an async agent replies through a
`SubagentHandback` tool call, so its transcript ends with no final assistant text, and both extracts
answer `transcript-unreadable`. Every DoD run then falls back to a hand copy recorded as unverified.
This task teaches the one shared reader to take the hand-back message as the reply. It also clears the
`--out` file before an extract runs, so a failed extract can never leave an earlier run's file behind.

**Scope**: `shared/resources/agent-reply-block.js` (the reader both extracts use), its tests, the
`finalise-rerun-scope.js extract` tests, and the finalise SKILL.md prose that describes the fallback.

**Key deliverables:**

- A transcript whose reply is a `SubagentHandback` call answers `extracted`, with the block byte-exact
- A failed extract leaves no `--out` file, whatever was there before
- The finalise fallback prose says what a failed extract now leaves on disk

## 2. Motivation

### Current Problems

1. **Every DoD run here copies by hand.** On task 320, both extracts answered `transcript-unreadable`
   on all four DoD runs (2026-11-25 and 26). Run 1 copied the hand-back text by script into a transcript
   the extractor could read; runs 2 to 4 cut it out with `jq` and `awk` and ran `merge` without
   `--sha256`, so `task.320.dod.{2,3,4}.ac.json` carry no verified result.
2. **The hash the extractor exists to give is lost.** `merge` checks the extract's `sha256` against the
   file it reads (`finalise-rerun-scope.js:1175`). With a hand copy there is no hash to check, which is
   the obs #142 defect task 269 closed.
3. **A failed extract can leave a stale file in place.** On task 320 DoD run 1, the probe run issued in
   the same batch as the failed extract ran on a stale plan (33 cases, not 70) and had to be repeated.
   On run 2, run 1's 7-entry `probe-plan.json` was again on disk after the failed extract (task 320
   implementation report, Issues Log, Step 7).

### Benefits

- The DoD's AC record and probe plan are verified again on this host (`verified: true`)
- Orchestrators stop re-extracting by hand with `jq` and `awk`, which is the step that drifts
- A failed extract is visibly failed: nothing on disk can be read as its output

## 3. Technical Background

### Current Architecture

There is one reader, and both extracts reach it:

- `shared/resources/agent-reply-block.js:170` *(`function extract(opts)`)* finds the transcript
  (`findTranscripts`, `:71`), reads it (`:201`), and calls `replyText` (`:116`).
- `replyText` keeps the assistant messages after the last `user` line and joins their `text` blocks.
  A `user` line resets the tail (`:127`, `else if (o && o.type === "user") tail = [];`).
- With no text, `extract` answers `transcript-unreadable` with the message "the transcript holds no
  final assistant text" (`:210`–`:215`).
- `shared/resources/finalise-rerun-scope.js:1212` *(`if (opts.cmd === "extract")`)* delegates to
  `agentReplyBlock.extract` (`:1217`) with `block` defaulting to `finalise-ac-yaml`. It reads nothing
  itself, so one fix serves both.
- `extract` writes `--out` only on `extracted` (`:241`). On every other answer it leaves
  whatever file was already at `--out`.

**Why the host's shape defeats it.** A hand-back transcript, measured on this host
(`~/.claude/projects/<project>/<session>/subagents/agent-a7b3a36606dac7dad.jsonl`, task 320 DoD run 4),
ends with these lines:

| Line type | Content |
| --- | --- |
| `assistant` | `thinking` |
| `assistant` | `tool_use`, `name: "SubagentHandback"`, `input: { message }` |
| `user` | `tool_result` |
| `attachment` | — |

The `user` tool-result line clears the tail. The reply is in `input.message`, so `replyText` returns
`null`. The workaround used on every task 320 run recovers it exactly:
`jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="SubagentHandback") | .input.message'`.

**Callers.** `git grep -ln agent-reply-block` over `skills/*/SKILL.md`, `shared/resources/*.{md,js,mjs}`
and `scripts/`: `finalise-rerun-scope.js` (`require`, `:43`), `security-probe-plan.mjs:257` (a comment
citing its entity rule, no call), the test, and `skills/finalise/SKILL.md`. The two prose call sites
are `skills/finalise/SKILL.md:725` (probe-plan extract, fallback at `:729`–`:735`) and `:1020`
(AC extract, fallback at `:1026`–`:1032`). Both say a failed extract "wrote nothing".

**Tests that hold today's decisions** (`git grep -n "transcript-unreadable\|tool_use" -- '*.test.*'`):

- `shared/resources/tests/agent-reply-block.test.mjs:200`: an unparseable transcript (`not json`)
  answers `transcript-unreadable`. This task keeps that answer.
- `shared/resources/tests/agent-reply-block.test.mjs:205`: only the final turn is read, so a block
  quoted in an earlier turn does not run. This task keeps that rule for hand-backs too.
- `shared/resources/tests/finalise-rerun-scope.test.mjs:1928`: a `tool_use` named `Read` in a
  transcript. Only a tool named `SubagentHandback` may be read as a reply.

No test asserts `transcript-unreadable` for a hand-back transcript, so no held decision is overridden.
The remedy is narrowed in two places to keep the decisions the tests hold: only the exact name
`SubagentHandback` is read, and only when no later final-turn text exists.

**Remedy tried before planning (2026-11-26).** The rule was applied to a scratch copy of
`agent-reply-block.js`. The scratch copy ran its suite: 6 of 6 pass, the same as the unmodified
baseline. It was then run on the real transcript above:
`extract --transcript <agent-a7b3a36606dac7dad.jsonl> --block finalise-ac-yaml --out <scratch>/ac.yaml --json`.
That answered `extracted`, 17900 bytes, sha256 `77072d33…a970c9`, identical to the `jq | awk` hand
copy of the same message.

### Target Architecture

- `replyText` reads the line sequence in order and keeps the **later** of two candidates: the
  final-turn text (as today), and the `input.message` of the last `SubagentHandback` tool_use. Whichever
  appears later in the transcript is the reply. A resumed agent that hands back again, or answers in text
  after an earlier hand-back, replies with its newest message.
- A `SubagentHandback` whose `input.message` is not a non-empty string is not a reply. `extract`
  then falls through to today's answers.
- `extract` removes `opts.out` before it reads the transcript, once the usage checks have passed
  (`fs.rmSync(out, { force: true })`). Every answer except `extracted` then leaves no file there.
- `extractUsageError` refuses an `--out` that resolves to the same path as `--transcript`
  ("extract --out must not be the --transcript file"). Without it the new removal would delete the
  transcript before reading it. The refusal is a usage error (exit 2), not a new `REASONS` entry.
- The `extracted` answer gains `reply: "text" | "handback"`, so the DoD can say which shape it read.
- `REASONS` does not change. `transcript-unreadable` keeps its meaning: unparseable, or no reply of
  either shape.

## 4. Scope

### In Scope

✅ `replyText` reads the hand-back shape, with the newest reply winning
✅ `extract` clears `--out` before reading
✅ `reply` field on `extracted`
✅ Tests for both extracts (the module and the `finalise-rerun-scope.js extract` CLI)
✅ The two fallback paragraphs in `skills/finalise/SKILL.md`, and the module header's reason list

### Out of Scope

❌ Other harness reply shapes not seen on this host. A new shape is a forward fix with its own fixture
❌ `merge`, `resolve-ci` and the probe runner, which already consume a verified file
❌ Re-extracting task 320's past AC records. They stay `verified: false`, which is true

## 5. Breaking Changes

**A failed extract now removes the `--out` file.** Before: a file already at `--out` survived a failed
extract. After: it is removed. Affected: only a caller that relied on a stale file surviving, and the
fallback prose already says to write the file afresh. Migration: none. The fallback writes the file
with the Write tool, as it does today.

## 6. Implementation Plan

> Detailed implementation guide: [task.327.plan.subagenthandback-replies-are-extracted.md](task.327.plan.subagenthandback-replies-are-extracted.md)

### Phase 1: Read the hand-back reply (Risk: Low)

- [x] Add hand-back and resumed-agent fixtures to `agent-reply-block.test.mjs`, each red first
- [x] Teach `replyText` the later-of-two rule; return the shape with the text
- [x] Add `reply` to the `extracted` answer and the module header

### Phase 2: Clear `--out` before reading (Risk: Low)

- [x] Add a test with a stale `--out` file and a transcript that answers `no-block`; red first
- [x] Remove `opts.out` in `extract` once the usage checks have passed
- [x] `extractUsageError` refuses `--out` equal to `--transcript`; a test shows the transcript survives and the call exits 2

### Phase 3: Callers and prose (Risk: Low)

- [x] Add a `finalise-rerun-scope.js extract` CLI test on a hand-back transcript (byte-exact, hash merges)
- [x] Update `skills/finalise/SKILL.md` at both fallback paragraphs
- [x] Run `npm run bundle`; add a CHANGELOG entry citing (task 327)

### Phase 4: Verify (Risk: Low)

- [x] Mutation table: revert each remedy, name the test that goes red
- [x] `npm test` under `CI=true` on the LAN server; `npm run bundle:check` clean

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/agent-reply-block.js` — `replyText`, `extract`, header

**Tests:**

2. ✅ `shared/resources/tests/agent-reply-block.test.mjs`
3. ✅ `shared/resources/tests/finalise-rerun-scope.test.mjs`

**Documentation:**

4. ✅ `skills/finalise/SKILL.md` — the two fallback paragraphs
5. ✅ `CHANGELOG.md`

**Bundled copies:** `npm run bundle` refreshes `skills/finalise/references/agent-reply-block.js`, the one
bundled copy (`ls skills/*/references/agent-reply-block.js | wc -l` = 1 on 2026-11-26).

## 8. Testing Strategy

**Unit tests.** New cases in `agent-reply-block.test.mjs`, each red before its change. Command:
`command node --test shared/resources/tests/agent-reply-block.test.mjs shared/resources/tests/finalise-rerun-scope.test.mjs`.

**Fixtures.** Each one is built in a temp directory removed in `finally` (the suite's `withDir`):

- **Hand-back only.** `assistant` `thinking`, then `assistant` `tool_use SubagentHandback` whose
  `message` holds the block, then `user` `tool_result`, then `attachment`. This is the measured host shape.
- **Control: text reply.** Today's shape, unchanged answer and hash.
- **Resumed agent, text after hand-back.** The later text wins.
- **Resumed agent, hand-back after text.** The later hand-back wins.
- **A block only in an earlier hand-back, then a text turn with no block.** Answers `no-block`, as the
  final-turn rule requires.
- **Another tool named in a `tool_use`** (`Read`, with a `message`-shaped input). Not a reply.
- **Hand-back with an empty or non-string `message`.** Answers `transcript-unreadable`.
- **Stale `--out`.** A file at `--out` plus a transcript that answers `no-block`. The file is gone afterwards.
- **`--out` is the transcript.** `--out` and `--transcript` name one file. The CLI exits 2 with the usage message and the transcript is unchanged.

**Byte-exactness.** The hand-back fixture carries the seven characters a hand copy loses
(`CONTROLS`, test line 91), and the extracted file must equal the block exactly.

**Real transcript.** Run the extract once on a real hand-back transcript from this host. Record the
command and its `reason` and `sha256` in the QA report.

## 9. Success Criteria

**Functional:**

- [ ] A transcript whose only reply is a `SubagentHandback` call answers `extracted` with `reply: "handback"`, and the file equals the block byte for byte, the seven `CONTROLS` characters included (Phase 1)
- [ ] The control (a final-turn text reply) answers `extracted` with `reply: "text"` and the same bytes as before the change (Phase 1)
- [ ] Of a text reply and a hand-back, the later one in the transcript is read, in both orders (Phase 1, later-of-two rule)
- [ ] A block only in an earlier turn is not read (the existing final-turn rule holds for hand-backs; Phase 1)
- [ ] A `tool_use` of any other name is never read as a reply; an empty or non-string hand-back `message` answers `transcript-unreadable` (Phase 1: no candidate returns `null`)
- [ ] After any answer but `extracted`, no file exists at `--out`, even when one existed before (Phase 2)
- [ ] An `--out` that names the `--transcript` file is a usage error (exit 2) and the transcript is left unchanged (Phase 2)
- [ ] `finalise-rerun-scope.js extract` on a hand-back transcript writes the AC YAML, and `merge` with its `sha256` records `verified: true` (Phase 3)
- [ ] One real hand-back transcript from this host extracts, with the command, `reason` and `sha256` recorded in the QA report

**Code quality:**

- [ ] Every new test was red before its change; the red runs are in the QA report
- [ ] Reverting any one remedy turns a named test red; the mutation table is in the QA report
- [ ] `npm test` passes under `CI=true`; `npm run bundle` leaves no diff

**Migration:**

- [ ] `skills/finalise/SKILL.md` says a failed extract leaves no `--out` file, at both fallback paragraphs
- [ ] CHANGELOG `[Unreleased]` cites (task 327)

## 10. Risk Assessment

**LOW — a hand-back read as a reply when it is not.** Probability: low. Impact: a wrong file is
extracted. Mitigation: only the exact tool name `SubagentHandback`, only a non-empty string `message`,
and the newest-reply rule. The fixtures above cover each.

**LOW — removing `--out` deletes a file a caller wanted.** Probability: low; both call sites write the
file afresh on fallback. Mitigation: the removal comes after the usage checks, so a mistyped call removes
nothing.

**LOW — the host changes the transcript layout again.** Mitigation: an unknown shape still answers a
named reason, and the hand copy fallback remains.

## 11. Rollback Plan

**Immediate (< 1 hour).** Trigger: an extract on a real transcript writes a file that differs from the
agent's block, or a text-reply transcript answers differently from before. Steps: revert the commit, run
`npm run bundle`, re-run the two suites.

**Partial.** Phase 2 (clearing `--out`) reverts alone; Phase 1 does not depend on it.

**Forward fix.** A new reply shape gets its own fixture and reader branch.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-26 | 1.0 | Initial draft — cut from observation #185 | create-task |
| 2026-11-26 | 1.1 | Review passed (9/10) — added the `--out` = `--transcript` refusal, its fixture and criterion; corrected two SKILL.md anchors | review-task |
| 2026-11-26 |  | Status → ready-for-development | review-task |
| 2026-11-26 |  | Implemented — 6 files, 13 tests | develop |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: Read the hand-back reply
- [x] Phase 2: Clear `--out` before reading
- [x] Phase 3: Callers and prose
- [x] Phase 4: Verify

## References

- Observation #185 — Reply extractors cannot read a SubagentHandback transcript, so every DoD copy is unverified
- [Task 320 implementation report](../task.320.task-319-leftover-findings/task.320.implementation.1.task-319-leftover-findings-initial-run.md) — Issues Log, Step 7 entries for DoD runs 1 to 3
- Task 269 — the extractor and the result hash (`CHANGELOG.md:604`)

## Notes

- QA report: `task.327.qa.{N}.subagenthandback-replies-are-extracted.md`
- Bug reports: `task.327.bug.{N}.{name}.md`
- Quality gate: `task.327.gate.{N}.subagenthandback-replies-are-extracted.yml`
