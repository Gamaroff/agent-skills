---
id: task.146.plan
title: "Implementation Plan: qa-fix — a fix to an identity rule must prove both directions"
type: plan
task-ref: task.146.identity-rule-fix-probe.md
---

# Implementation Plan: qa-fix — identity-rule probe

> Requirements and success criteria: [task.146.identity-rule-fix-probe.md](task.146.identity-rule-fix-probe.md)

## Overview

A third probe table in qa-fix Step 3.5, one paragraph in the shared cycle-2 refute directive (edited
identically in qa-task and qa-story), and one test that holds both plus the directive's byte-parity.

## Phase-by-Phase Implementation Guide

### Phase 1: qa-fix Step 3.5

**Anchor**: `skills/qa-fix/SKILL.md` § *Step 3.5: Adversarial pass over the fixes themselves*, after
the documentation table's closing paragraph (`… the diff does not show them. (obs #21)`) and before
**Review the combination, not only each fix.**

```markdown
**For a fix to an identity rule, probe both directions.** When the fix changes a rule that decides
whether two things are the same — a dedupe key, a cache key, a record identity, a normaliser, an
equality or hash-of-key function — the rule can fail by splitting what is one or merging what is
two, and a fix for one direction pushes toward the other. On one task a record key was patched once
per direction for four QA cycles: the whole template split re-runs, the flag before the input merged
different controls, the argv skeleton merged `--mode strict` and `--mode lax`, and a declined probe
split from its corrected re-run — each fix's test proving only the direction its finding named
(obs #169). The fix's tests carry both pairs, **drawn from real call sites**:

| Probe | Ask |
| ----- | --- |
| **Should merge** | Two inputs a real call site treats as one — does the new rule give them one key? |
| **Should not merge** | Two inputs a real call site treats as two — does the new rule still give them two? |
| **Which direction did the last fix move?** | A fix for a split pushes toward merging, and vice versa — the test must carry the pair for the direction the finding did **not** name |
```

### Phase 2: refute directive (both files, identical)

**Anchor**: the fenced `REFUTE PASS.` block in `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`
§ *Step 3b* step 2, after the four-transition list (its last bullet is `• Reconnect …`) and before
`Review the COMBINATION` — its **own paragraph**, not a fifth bullet. The list is introduced as
*"probe these four transitions"* for lifecycle changes; a fifth bullet would falsify "four" and gate
this probe on a trigger an identity rule does not share (review.1):

```
   Identity rules — for every change to a dedupe, cache or record key, a normaliser or an equality
   predicate, whether or not it touches a lifecycle: find one pair that must be the same and one
   that must differ. A key changed to fix one direction has usually broken the other.
```

Indent to the block's three spaces, with a blank line either side, matching *Review the COMBINATION*.

Apply the edit with one script to both files (split/join with an anchor-count assertion — the
patch-files memory) so they cannot diverge, then diff the extracted blocks.

### Phase 3: test

`tests/identity-rule-probe.test.js` (CommonJS, `node:test`):

```js
// refuteBlock(file): from the line matching /^\s*REFUTE PASS\./ to the next /^\s*```$/.
// stepSection(file, "### Step 3.5"): heading to the next "### ".
test("qa-task and qa-story carry one refute directive, byte for byte", () => {
  const a = refuteBlock("skills/qa-task/SKILL.md"), b = refuteBlock("skills/qa-story/SKILL.md");
  assert.ok(a.length > 0 && b.length > 0, "both blocks found");   // floor
  assert.equal(a, b);
});
test("the refute directive probes identity rules", …);          // /Identity rules —/ in each
test("the identity entry sits outside the four-transition list", …); // exactly four `•` bullets in each block
test("qa-fix Step 3.5 probes both directions of an identity rule", …); // three rows + obs #169
```

Mutation proofs: edit one block only (parity red); delete the entry from both (entry red); turn the
entry into a fifth `•` bullet in both (count red); delete the Should-not-merge row (qa-fix red). `cp` snapshot, mutate, run, restore.

### Phase 4: docs

CHANGELOG `[Unreleased]` › Changed: *qa-fix proves both directions of an identity-rule fix, and the
refute directive looks for the pair (task 146)*.

## Key Patterns and References

- The existing Step 3.5 tables (lifecycle; documentation, obs #21) are the format to copy.
- The refute block is indented three spaces inside a numbered list; keep the indentation, or the
  extracted blocks will still match each other but the fence will render outside the list.

## Testing Approach

- `command node --test tests/identity-rule-probe.test.js`; `command node --test 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'`; then `npm run ci:fast`.
- The worked application in the task's § 8 is recorded in the implementation report.
