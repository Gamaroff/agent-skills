---
id: task.192.plan
title: "Implementation Plan: Read-back checks this cycle's verdict"
type: plan
task-ref: task.192.read-back-checks-this-cycles-verdict.md
---

# Implementation Plan: Read-back checks this cycle's verdict

> Requirements and success criteria: [task.192.read-back-checks-this-cycles-verdict.md](task.192.read-back-checks-this-cycles-verdict.md)

## Overview

Two additions to `shared/resources/qa-read-back.js`. The verdict checks reuse the existing parsers.
The lock retry stays inside `stage()`.

## Phase 1: Verdict checks

In `load()` (`:56`), add `qaResults: require("./qa-results.js")` beside `changeLog`. Check that
`qa-results.js` is bundled wherever `qa-read-back.js` is: a `require` of a sibling makes it a
dependency for the bundler, and `npm run bundle` adds it.

After the "does not link this cycle's" loop:

```js
if (gate) {
  const token = (fs.readFileSync(gate, "utf8").match(/^gate:\s*([A-Z]+)/m) || [])[1];
  const text = fs.readFileSync(doc, "utf8");
  // Section: read findQaResults' return shape first ({ sections, changeLog }); take the span of the
  // QA section and match /^\*\*Gate Decision\*\*:\s*([A-Z]+)/m inside it only.
  // Row: newest entry from engines.changeLog.extractEntries(text) whose last cell is qa-task|qa-story.
}
```

Messages (one per problem):

- `the QA section has no **Gate Decision** line — the Step 12 edit did not land`
- `**Gate Decision** is ${gd} but this cycle's gate ${basename(gate)} says ${token} — the Step 12 edit did not land`
- `no qa-task/qa-story Change Log row — the verdict row did not land`
- `the newest QA Change Log row reads "${desc}" but this cycle's gate says ${token}`

A gate with no readable `gate:` token is already a problem elsewhere (check `artifact()`'s
handling). Do not add a second message for it.

**Measurement** (`5978d32e`, the control that the rule does not over-fire). A one-off `command
node -e` loop read, for tasks 183, 185, 186, 170 and 172: the newest gate's `gate:`, the document's
`**Gate Decision**`, and the newest Change Log row naming `qa-task`/`qa-story`. All five agreed:
PASS/PASS/PASS ×4 and CONCERNS/CONCERNS/CONCERNS for task.186. Re-run it after the change: all
five must still read clean.

## Phase 2: Lock retry

```js
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const stage = (abs) => {
  let r, attempts = 0;
  for (const wait of [0, 200, 400, 800]) {
    if (wait) sleepMs(wait);
    attempts++;
    r = git(["add", "--", rel(abs)], root);
    if (r.status === 0 || !/index\.lock/.test(r.stderr || "")) break;
  }
  if (r.status !== 0) { /* existing push, message + ` (after ${attempts} attempt${attempts > 1 ? "s" : ""})` */ }
  …
};
```

**Test for the released lock.** Write `.git/index.lock`, then spawn the CLI as a child process, and
remove the lock from the parent after about 300 ms with `setTimeout`. The child's `Atomics.wait`
blocks only the child. Assert exit 0 and the file staged. Expose the attempt count in the `--json`
output (`out.stageAttempts`), so the non-lock case asserts 1 attempt without timing.

## Key Patterns and References

- Engines are loaded lazily in `load()` and reached as `engines.*`.
- One problem per finding, no duplicate for an already-reported stage failure (`failedStage`).

## Testing Approach

`command node --test shared/resources/tests/qa-read-back.test.mjs`, then `npm test`. Record both
mutation proofs' red output in the implementation report.
