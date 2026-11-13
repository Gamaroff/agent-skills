---
id: task.307.plan
title: "Implementation Plan: Instrument-read guard quote and redirect edges"
type: plan
task-ref: task.307.instrument-read-guard-quote-and-redirect-edges.md
---

# Implementation Plan: Instrument-read guard quote and redirect edges

> Requirements and success criteria: [task.307.instrument-read-guard-quote-and-redirect-edges.md](task.307.instrument-read-guard-quote-and-redirect-edges.md)

## Overview

All work is in one file, `tests/orchestration-instrument-reads.test.js`. Change `maskQuoted` and `REDIRECT`, add fixtures to the existing flagged and passing tables, and bring the header's unseen-shapes list up to date.

## Phase-by-Phase Implementation Guide

### Phase 1: Quote edge

**Files to modify:** `tests/orchestration-instrument-reads.test.js`

**Reproduce first.** The matcher has no export, so run it the way the 2026-11-13 reproduction did: read lines 53 to 81 of the file, build a function from them, and call `wrappedStatus` on each shape. Expect `false` for `cmd; echo foo'bar; baz' $?` and `cmd; echo "a"'s; b' $?`, and `true` for the control `cmd; echo foo 'bar; baz' $?`.

**Exact change, option 2 (recommended to try first).** In `maskQuoted` (`:53`), the single-quote branch opens only at a boundary (`:64`). Add a second way to open: at a glued position (`!boundary`), look ahead for a closing `'` later on the line, and open only when one exists. `it's fine; echo "rc=$?"` has no later `'`, so it stays prose. `foo'bar; baz' $?` has one, so it opens. Before writing it, run both option 2 and option 1 over every existing fixture and over the prose cases below, and record which one is right.

**Cases that must keep their verdict (controls from task 299 cycle 3):**

- `Don't write cmd; echo "rc=$?"` flagged
- `it's …` with a real `;`-wrapped status flagged
- apostrophe prose followed by a real `>>` redirect passes

**A case that breaks option 2 and must be decided:** two apostrophes on one line (`Don't do this; it's wrong; echo "rc=$?"`). A glued `'` at `Don't` finds a later `'` in `it's` and opens a quote across the `;` and the status. Add it as a fixture; if option 2 fails it, take option 1 or 3 and say so.

### Phase 2: Redirect and capture edges

**`REDIRECT` (`:73`)** is `/(^|[^0-9&])>/`. The exclusion of a preceding `&` exists for `2>&1` (task 299 cycle 2), where the `>` follows a `2`, and for `>&2`. `&>` and `&>>` put `&` before the `>`; `1>` and `1>>` put a `1` before it. Replace the single character class with an alternation that accepts a redirect when the `>` is preceded by nothing, by `&` and then `>` (the `&>` form), or by `1`, and still rejects `2>&1` as a redirect for this purpose. Write the fixtures first:

| Line | Verdict |
| --- | --- |
| `cmd; echo "rc=$?" &> log` | passes |
| `cmd; echo "rc=$?" &>> log` | passes |
| `cmd; echo "rc=$?" 1> log` | passes |
| `cmd; echo "rc=$?" 1>> log` | passes (already does today; keep as a control) |
| `cmd; echo "rc=$?" 2>&1` | flagged (task 299) |
| `cmd; echo "rc=$?"` | flagged |

**Capture.** `x=$(cmd; echo $?)` returns `true` today. Decide: if the echo is inside `$( … )` the status goes into a variable, which is reading the instrument. Either teach `wrappedStatus` to skip an echo whose enclosing `$(` is unclosed before it, with a fixture, or name the shape in the header as a known false positive. Record the choice in the QA report.

### Phase 3: Prove and record

**Mutation proofs**, one per fix, restored with the Edit tool (never `sed -i`): revert the quote rule and confirm the glued-quote fixture goes red; revert the redirect alternation and confirm a `&>` or `1>` fixture goes red. Record the test title that went red, as the runner prints it.

**Header.** Update the "knowingly does NOT see" list at `:23` to match what the guard does after Phase 1 and 2: remove what is fixed, add what is named.

**Population.** Run the population test and confirm it is clean.

**CHANGELOG.** One entry under `## [Unreleased]` citing `(task 307)`.

## Key Patterns and References

- The fixture tables at `:124` (status shapes) and `:178` (time placeholder) are the pattern: a flagged list and a passing list, each line asserted with its own message.
- `shared/resources/mutation-proving.md` (bundled as `references/mutation-proving.md`) states the proof rules: revert every line of the fix's hunk and read which test went red; a red in a different test is a finding, not a proof.

## Testing Approach

`command node --test tests/orchestration-instrument-reads.test.js` for the guard alone; `npm run test:remote` for the suite. For the timing criterion, five runs with `uptime` beside each, recorded in the QA report.
