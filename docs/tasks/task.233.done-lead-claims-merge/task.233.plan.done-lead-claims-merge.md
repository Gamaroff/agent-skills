---
id: task.233.plan
title: "Implementation Plan: Done lead claims a merge that has not happened"
type: plan
task-ref: task.233.done-lead-claims-merge.md
---

# Implementation Plan: Done lead claims a merge that has not happened

> Requirements and success criteria: [task.233.done-lead-claims-merge.md](task.233.done-lead-claims-merge.md)

## Overview

Write a red test against the rendered `done` lead, reword the one template, then bring the spec's two
quotes into line and re-bundle.

## Phase-by-Phase Implementation Guide

### Phase 1: Test first

**File:** `shared/resources/tests/stakeholder-summary.test.mjs`. Put the test after the deny-list
loop (`:120`–`:130`), so it sits with the other wording rules.

```js
// task.233 (obs #98): every caller posts `done` before the pull request is
// merged, so the lead may claim acceptance but not release.
test("done lead claims acceptance, not release — the merge is named as the step left", () => {
  for (const slots of [{}, { pr: "#748" }]) {
    const lead = renderLead("done", slots);
    assert.doesNotMatch(lead, /now part of the product/i, JSON.stringify(lead));
    assert.doesNotMatch(lead, /no further action/i, JSON.stringify(lead));
    assert.match(lead, /merged/i, JSON.stringify(lead));
  }
});
```

Run `command node --test shared/resources/tests/stakeholder-summary.test.mjs` and confirm this test
alone is red.

### Phase 2: Reword

**File:** `shared/resources/stakeholder-summary.js:145`.

Before:

```js
  done: (s) =>
    `This work is finished and has been accepted. Everything it set out to do was checked and ` +
    `confirmed working, and the change is now part of the product${s.pr ? ` (${s.pr})` : ""}. ` +
    `No further action is needed on this item.`,
```

After (proposed):

```js
  // Every caller posts this before the pull request is merged (develop-pipeline
  // Step 7 runs /finalise first), so it claims acceptance, never release
  // (task.233, obs #98).
  done: (s) =>
    `This work has been checked and accepted. Everything it set out to do was confirmed ` +
    `working${s.pr ? ` (${s.pr})` : ""}. It becomes part of the product once the change is ` +
    `merged, which is the last step for this item. No action is needed from anyone reading this.`,
```

Check the sentence split: the no-slots test splits on `(?<=\.)\s+`. The proposed text gives 4
sentences, the test's upper bound. A `pr` value such as a URL contains `.` with no space after it,
so it does not add one (run at review on `{}`, `{pr:"#748"}` and a PR URL: 3 sentences before the
fourth was added, no deny-list hit slot-free).

**Mutation proof:** put the Before text back, run the file, confirm the new test is red, restore.

### Phase 3: Spec and bundle

**File:** `shared/resources/stakeholder-summary.md`.

- `:201`–`:202` (§ `done`, Slots `{pr}`): replace the quote with the new text.
- `:375`–`:376` (Before/After, After block): replace the two lead lines.
- `:389`–`:392`: rewrite the paragraph. Keep its point (the lead tells the reader nothing is
  expected of them), and add why it names the merge: the comment is posted at acceptance, before
  the merge, so "part of the product" would be a claim about a later event.

Then:

```bash
cd /home/gamaroff/Development/agent-skills && npm run bundle && npm run bundle:check
grep -rn "part of the product" shared skills evals | grep -v "once the change is merged"
```

The grep must return nothing outside `docs/tasks/task.104*` and `task.106*` (which it does not
scan).

CHANGELOG `[Unreleased]` → **Changed**: the `done` lead claims acceptance, not release (task 233).

## Key Patterns and References

- The lead standard's two rules (`stakeholder-summary.md`): a lead reads correctly with no slots, and
  a verdict is mapped, not passed through. This change keeps both.
- Patch with split/join and check the split count; never `String.replace` with a template that may
  hold `$`.

## Testing Approach

- The new test (Phase 1), red then green, then mutation-proved.
- Full suite: move `.agents/skills` aside, restore it with a trap, then `npm run ci`.
