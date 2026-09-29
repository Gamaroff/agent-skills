---
id: task.145.plan
title: "Implementation Plan: review-task — trace a criterion's stated outcome through the function that decides it"
type: plan
task-ref: task.145.review-outcome-reachability-check.md
---

# Implementation Plan: review-task — outcome reachability

> Requirements and success criteria: [task.145.review-outcome-reachability-check.md](task.145.review-outcome-reachability-check.md)

## Overview

One new numbered check in review-task Step 3, its authoring twin in create-task Step 3.5, a sibling
form in review-story Step 4 and review-bug Step 3, and one section-scoped population test. No runtime
code changes.

## Phase-by-Phase Implementation Guide

### Phase 1: review-task check 10

**Anchor**: `skills/review-task/SKILL.md` § *Step 3: Technical Accuracy and Anti-Hallucination Review*,
after check **9. Configuration Key Accuracy** and before *Common Hallucination Patterns to Detect*.
Match the shape of checks 6–8 (bold name, obs citation, bullets, a severity line):

```markdown
10. **Outcome reachability** (obs #168):
   - When a success criterion, test case or Testing Strategy row states the outcome a **named
     function** produces for a **stated input** — a verdict, an exit code, a status, a return value —
     open the function and walk that input through its decision branches
   - Confirm the stated outcome is the branch that fires. Existence of the function is check 2's
     question; this one asks whether the function can return what the document promises
   - Worked example: task.144 said an accept-all fixture would score `present-but-inert`;
     `computeVerdict` needs a control that rejects *some* hostile input for that verdict, so an
     accept-all scores `absent`. Review read the function and passed the claim; develop found it
   - Flag as **Important** when the outcome is unreachable — name the branch that fires and what it
     returns; **Optional** when the branch depends on an input the document does not pin down
```

Add to *Common Hallucination Patterns to Detect*:

```markdown
- ❌ An outcome no branch of the named function returns for the stated input
```

### Phase 2: sibling sites

- **create-task** § *3.5 Adversarial Quality Review* › *🚨 Critical* — after the obs #102 bullet:
  `- **An outcome the named function cannot return** (obs #168): when a criterion or test case states
  what a named function returns for a stated input, walk the input through the function's branches.
  An unreachable outcome is a criterion the developer must silently rewrite or silently fail.`
- **review-story** § *Step 4* › *Validation Checks* — check **7. Outcome reachability** (obs #168),
  after *6. Reference Validation* (checks 5 and 6 already exist), the review-task text with
  "acceptance criterion" for "success criterion".
- **review-bug** § *Step 3: Reproducibility Clarity* — one bullet after *Expected vs Actual*: when the
  Expected Behavior names what a function returns for the reproduction input, confirm a branch of the
  fixed code returns it; an unreachable expected outcome is a fix that cannot pass its own
  verification → **Important** (obs #168).

### Phase 3: population test

`tests/outcome-reachability-check.test.js` (CommonJS, `node:test`, like the other `tests/*.test.js`):

```js
const SITES = [
  { file: "skills/review-task/SKILL.md",  heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review" },
  { file: "skills/create-task/SKILL.md",  heading: "### 3.5 Adversarial Quality Review" },
  { file: "skills/review-story/SKILL.md", heading: "### Step 4: Technical Accuracy and Anti-Hallucination Review" },
  { file: "skills/review-bug/SKILL.md",   heading: "### Step 3: Reproducibility Clarity (the core gate)" },
];
// section(file, heading): lines from the heading to the next heading of the same or higher level,
// skipping fenced blocks — so a mention elsewhere in the file cannot satisfy the site.
// item(section): the list item whose first line carries `obs #168`, through to the next list item at
// the same indentation (or the section end). The three elements are asserted on the ITEM, not the
// section — `a function` already occurs in the review-task Step 3 and create-task 3.5 sections, so a
// section-scoped element assertion passes with the check absent (task.145 review, finding 2).
// Assert per site: section found (floor), /obs #168/ in the section, item found, and the three
// elements in the item (/stated input|reproduction input/, /named function|a function/, /branch/).
```

Mutation proof: for each site, `cp` the file, delete the check, run the test, confirm red names that
file, restore from the snapshot. Then, on one site, remove each element phrase from the item in turn
and confirm red names the element.

### Phase 4: docs

CHANGELOG `[Unreleased]` › Changed: *review-task checks that a criterion's stated outcome is reachable
(task 145)* — one paragraph naming the four sites and the task.144 example.

## Key Patterns and References

- Checks 6–8 and their create-task twins are the shape to copy (obs #103 / #117 / #102).
- Section extraction: reuse the heading-bounded, fence-aware reader pattern of
  `shared/resources/tests/probe-boundary-signals.test.mjs` (task.144's block-scoped population tests)
  rather than a file-wide grep — a file-scoped test passed on a site that lacked the text (task.144 QA
  cycle 2, CR-4).

## Testing Approach

- `command node --test tests/outcome-reachability-check.test.js`, then `npm run ci:fast`.
- The hand run in the task's § 8 is recorded in the implementation report.
