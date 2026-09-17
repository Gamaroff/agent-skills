---
id: task.121.plan
title: "Implementation Plan: cycle-scoped QA tracker comments"
type: plan
task-ref: task.121.cycle-scoped-qa-tracker-comments.md
---

# Implementation Plan: cycle-scoped QA tracker comments

> Requirements and success criteria: [task.121.cycle-scoped-qa-tracker-comments.md](task.121.cycle-scoped-qa-tracker-comments.md)

## Overview

One list member in the engine, three `--stage` arguments at the call sites, one deleted block, one
contract table, one guard assertion. The mechanism (numeric suffix, marker from the suffixed name,
lead rendered from the stripped name) already exists for `qa-fix` and `qa-cycle`; nothing new is
designed here.

## Phase-by-Phase Implementation Guide

### Phase 1: engine

**Files to modify:**
- `shared/resources/tracker-comment.js` — `CYCLE_SCOPED_STAGES` (near line 107)
- `shared/resources/stakeholder-summary.js` — `CYCLE_SCOPED_LEAD_STAGES` (near line 291)

**Exact changes:**

```js
// tracker-comment.js
const CYCLE_SCOPED_STAGES = Object.freeze([
  "qa-gate",        // NEW — qa-task / qa-story Step 13b post it once per QA cycle
  "qa-cycle",
  "qa-fix",
  "pipeline-paused",
]);
```

Same one-line addition in `stakeholder-summary.js`; `stakeholder-summary.test.mjs:493-505` already
asserts the two lists are equal and ≥ 3 long — bump the floor to 4 so a future removal is noticed.

Tests to extend: `tracker-comment.test.mjs` around line 1506 iterates `cli.CYCLE_SCOPED_STAGES` —
check whether the suffix-legality cases are table-driven from the list (then nothing to add) or
enumerated (then add `qa-gate-2` accepted / `qa-gate-x` rejected).

### Phase 2: call sites

**`skills/qa-fix/SKILL.md` Step 7 (line ~859):**

```bash
    --stage "qa-fix-${FIX_CYCLE}" \
```

`FIX_CYCLE` is derived a few lines above (`sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'`).

**`skills/qa-task/SKILL.md` Step 13b (line ~1301) and `skills/qa-story/SKILL.md` (line ~1892):**

`THIS_GATE` is already resolved for `blocking_count`. Add, immediately after it:

```bash
  # The cycle number lives in the gate filename — the same derivation qa-fix uses
  # for FIX_CYCLE, so the two comments cannot disagree about which round this is.
  QA_CYCLE=$(printf '%s\n' "$THIS_GATE" | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/')
  QA_CYCLE=${QA_CYCLE:-1}
```

and change the stage:

```bash
    --stage "qa-gate-${QA_CYCLE}" \
```

The lead call (`stakeholder-summary-cli.js --stage qa-gate`) can stay on the bare name — it renders
the same lead either way — but passing the suffixed form there too keeps the two calls textually
identical; either is correct, pick one and say why in the comment.

Update the prose beside Step 13b that says "per-stage" / "posts once".

**`shared/resources/develop-pipeline-step-5-6-qa-loop.md` (lines ~352-379):** delete the
"Post QA cycle result to tracker issue" fenced block and the slot note under it. Replace with:

> The per-cycle tracker comment is posted by the QA skill itself (Step 13b, stage `qa-gate-{N}`);
> the orchestrator posts nothing here.

Then `npm run bundle` and commit the `references/` churn in the same commit.

### Phase 3: contract + guard

**`shared/resources/tracker-comment-contract.md`** — add under the stages section:

| Stage | Fires | Marker |
|---|---|---|
| `work-started`, `in-review`, `develop-complete`, `review*`, `done` | once per issue | `agent-skills-comment:{stage}` |
| `qa-gate`, `qa-cycle`, `qa-fix` | once per QA cycle — numeric suffix **required** | `agent-skills-comment:{stage}-{N}` |
| `pipeline-paused` | once per pause — step number as suffix | `agent-skills-comment:pipeline-paused-{step}` |

State that the second row is `CYCLE_SCOPED_STAGES` in the engine and that the engine list wins.

**`shared/resources/tests/comment-slot-coverage.test.mjs`** — the collector (`collectCallSites`)
and `baseStage` already exist. Add one test:

```js
test("a cycle-scoped stage is never passed bare", () => {
  const sites = collectCallSites(shippedDocs());
  const bare = sites.filter(
    (s) => CYCLE_SCOPED_STAGES.includes(s.stage) // no suffix → equals a list member exactly
  );
  const suffixed = sites.filter((s) => baseStage(s.stage) !== s.stage);
  assert.ok(suffixed.length >= 3, `non-vacuity: expected ≥3 suffixed sites, found ${suffixed.length}`);
  assert.deepEqual(bare.map((s) => `${s.file}:${s.line}`), []);
});
```

Check how `collectCallSites` captures a `--stage "qa-gate-${QA_CYCLE}"` argument — the quoted,
variable-bearing form must parse to a stage string whose `baseStage` is `qa-gate`. If the regex
only matches a literal token, extend it to accept `-${…}` and `-{N}` as suffix forms.

**Mutation proof** (record in the implementation report): change `qa-fix` Step 7 back to
`--stage qa-fix`, run the file, confirm the failure names `skills/qa-fix/SKILL.md`, restore.

## Key Patterns and References

- Suffix handling: `tracker-comment.js:249-260` (validator), `stakeholder-summary.js:296` (`stripCycleSuffix`).
- Existing correct call: `develop-pipeline-step-5-6-qa-loop.md:364` (`--stage qa-cycle-{N}`) — being removed, but its shape is the model.
- Call-site collection: `comment-slot-coverage.test.mjs` `shippedDocs()` / `collectCallSites()` — reuse, do not re-walk the tree.
- Enumeration rule: `docs/reference/anti-patterns.md` — the contract table cross-references the engine list.

## Testing Approach

`npm test` for the unit and guard layers. For the consumer check, the next multi-cycle pipeline run:
`gh issue view <N> --json comments --jq '.comments[].body' | grep -o 'agent-skills-comment:qa-[a-z]*-[0-9]*'`
should list `qa-gate-1`, `qa-fix-1`, `qa-gate-2`, … in order.
