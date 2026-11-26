---
id: task.327.plan
title: "Implementation Plan: SubagentHandback replies are extracted, not hand-copied"
type: plan
task-ref: task.327.subagenthandback-replies-are-extracted.md
---

# Implementation Plan: SubagentHandback replies are extracted, not hand-copied

> Requirements and success criteria: [task.327.subagenthandback-replies-are-extracted.md](task.327.subagenthandback-replies-are-extracted.md)

## Overview

One reader serves both extracts, so the change is in `shared/resources/agent-reply-block.js` alone.
`finalise-rerun-scope.js` delegates to it (`:1217`) and needs only a CLI test. Each change is test-first.

## Phase-by-Phase Implementation Guide

### Phase 1: `replyText` reads the hand-back (`agent-reply-block.js:116`)

Today the loop keeps assistant messages after the last `user` line (`:127`) and joins their `text`
blocks. A hand-back transcript ends `assistant tool_use SubagentHandback` → `user tool_result`, so the
tail is empty when the loop ends.

Change: walk the lines once and track two candidates by line index.

- `textAt` / `textTail`: today's tail. Record the index of the first assistant line that starts it.
- `handbackAt` / `handback`: on each `assistant` line, for each content block with
  `type === "tool_use"`, `name === "SubagentHandback"` and a non-empty string `input.message`, store
  the message and the line index. A later one replaces an earlier one.

At the end, if the text tail is non-empty and starts after the last hand-back, return
`{ text, reply: "text" }`. Otherwise, if a hand-back exists, return `{ text: handback, reply: "handback" }`.
If neither exists, return `null`. A parse error still returns `null` (unchanged).

**Earlier-turn rule.** The existing test at `agent-reply-block.test.mjs:205` requires that a block
quoted in an earlier turn does not run. With hand-backs, "the reply" is the newest message of either
shape. An older hand-back followed by a text turn returns the text turn, so a block only in the older
hand-back answers `no-block`. Write that fixture first.

`extract` (`:209`) reads `r.text` and `r.reply`. It adds `reply` to the `extracted` answer.

Red first: the hand-back fixture answers `transcript-unreadable` before the change.

### Phase 2: clear `--out` (`agent-reply-block.js:170`)

Put `fs.rmSync(opts.out, { force: true })` at the top of `extract`, before the transcript lookup.
`extractUsageError` (`:279`) runs in `main` and in `finalise-rerun-scope.js:1214` before `extract` is
called, so a usage error still removes nothing. A test calls `extract` directly with a stale file at
`out` and a `no-block` transcript, then asserts that `existsSync(out)` is false.

Red first: the stale file survives before the change.

### Phase 3: callers and prose

- `finalise-rerun-scope.test.mjs`: next to the test at `:1953`, extract from a hand-back transcript
  with the CLI, then run `merge --sha256` and assert `verified: true`. Reuse that test's
  `writeTranscript` helper with a hand-back variant.
- `skills/finalise/SKILL.md:729`–`:735` and `:1027`–`:1033`: "wrote nothing" becomes "wrote nothing,
  and removed any earlier file at that path". Name the `reply` field in the `extracted` line.
- Module header (`agent-reply-block.js:11`–`:31`): say the reply is the final text or the last
  `SubagentHandback` message, whichever is later.
- `npm run bundle`, then `CHANGELOG.md` `[Unreleased]` citing (task 327).

### Phase 4: verify

- One real hand-back transcript from this host:
  `command node shared/resources/agent-reply-block.js extract --transcript <agent jsonl> --block finalise-ac-yaml --out <scratch>/ac.yaml --json`.
  Compare the bytes with the `jq` extraction of the same message.
- Mutation table: (a) drop the hand-back branch, (b) prefer the hand-back regardless of order,
  (c) accept any tool name, (d) remove the `rmSync`. Each one must turn a named test red.
- `npm run test:remote` (CI parity), `npm run bundle:check`.

## Risks

- **Order ties.** A text block and a hand-back in the same assistant message: the tool call is the
  later block, so the hand-back wins. Add one fixture for this case.
- **Host shape drift.** Only the measured shape is read. Anything else answers a named reason.
