---
id: task.121.plan
title: "Implementation Plan: cycle-scoped QA tracker comments"
type: plan
task-ref: task.121.cycle-scoped-qa-tracker-comments.md
---

# Implementation Plan: cycle-scoped QA tracker comments

> Requirements and success criteria: [task.121.cycle-scoped-qa-tracker-comments.md](task.121.cycle-scoped-qa-tracker-comments.md)

## Overview

One list member in the engine, three tracker `--stage` arguments and four PR-lead ones at the call
sites, two deleted orchestrator blocks, one contract table, one guard assertion over both call-site
populations. The mechanism (numeric suffix, marker from the suffixed name,
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

Tests to extend: `tracker-comment.test.mjs:1495-1509` ("NEW-6") is **enumerated**, not
table-driven — its closing `assert.deepEqual([...cli.CYCLE_SCOPED_STAGES], ["qa-cycle", "qa-fix",
"pipeline-paused"])` goes red on the addition. Update the literal to four members and add
`qa-gate-2` accepted / `qa-gate-x` rejected. (Verified 2026-09-18.)

### Phase 2: call sites

**`skills/qa-fix/SKILL.md` Step 7 (tracker call `:898-900`; PR lead `:828`):**

```bash
    --stage "qa-fix-${FIX_CYCLE}" \
```

at both. `FIX_CYCLE` is derived once at `:820` (`sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'`), above
both calls — that is the shape the two QA skills must copy.

**`skills/qa-task/SKILL.md` Step 13b (PR lead `:1264`, `THIS_GATE` `:1328`, tracker call
`:1337-1339`) and `skills/qa-story/SKILL.md` (PR lead `:1854`, `THIS_GATE` `:1915`, tracker call
`:1924-1926`):**

The PR-lead call runs ~60 lines **before** `THIS_GATE` is resolved, so the cycle cannot be taken
from `THIS_GATE` at the point the lead needs it. Derive it once, **above the PR-lead call**, from
the newest gate file (the same `ls -t … | head -1` Step 13b uses later):

```bash
  # The cycle number lives in the gate filename — the same derivation qa-fix uses
  # for FIX_CYCLE, so the two comments cannot disagree about which round this is.
  QA_CYCLE=$(ls -t "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | head -1 \
    | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/')
  QA_CYCLE=${QA_CYCLE:-1}
```

(`$STORY_DIR`/`story.*` in qa-story.) Then change the stage at **both** calls:

```bash
    --stage "qa-gate-${QA_CYCLE}" \
```

Decided in review (2026-09-18, Q2): the PR-lead call takes the suffixed form too. It renders the
same lead either way, but identical text at both calls lets the guard cover `PR_SITES` without an
exemption. Say so in the comment beside the derivation.

**`shared/resources/develop-pipeline-on-precompact.sh:227`:** the lead call passes
`--stage pipeline-paused` bare while the tracker call at `:329` already passes
`"pipeline-paused-${CURRENT_STEP}"`. Suffix the lead call the same way — it is the fourth PR-lead
site the `PR_SITES` guard will find.

Update the prose beside Step 13b that says "per-stage" / "posts once".

**`shared/resources/develop-pipeline-step-5-6-qa-loop.md`** — two blocks, not one:

- Lines ~350-379: delete the "Post QA cycle result to tracker issue" fenced block
  (`--stage qa-cycle-{N}`) and the slot note under it. Replace with:

  > The per-cycle gate comment is posted by the QA skill itself (`qa-task`/`qa-story` Step 13b,
  > stage `qa-gate-{N}`); the orchestrator posts nothing here.

- Lines ~894-910, step 4a: delete the "Post QA fix summary to tracker issue" fenced block
  (`--stage qa-fix-{N}`) and its `cycle`-slot note. Replace with:

  > The per-cycle fix comment is posted by `/qa-fix` itself (Step 7, stage `qa-fix-{N}`); the
  > orchestrator posts nothing here.

Leave `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:89` (`--stage
qa-cycle-{N}`) alone — `develop-bug` never runs `qa-task`/`qa-story`, so that call is its only
per-cycle comment.

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
for (const [label, sites, floor] of [["SITES", SITES, 4], ["PR_SITES", PR_SITES, 4]]) {
  test(`a cycle-scoped stage is never passed bare (${label})`, () => {
    const bare = sites.filter(
      (s) => CYCLE_SCOPED_STAGES.includes(s.stage) // no suffix → equals a list member exactly
    );
    const suffixed = sites.filter((s) => s.stage && baseStage(s.stage) !== s.stage);
    assert.ok(suffixed.length >= floor, `non-vacuity: expected ≥${floor} suffixed ${label}, found ${suffixed.length}`);
    assert.deepEqual(bare.map((s) => `${s.file}:${s.line}`), []);
  });
}
```

`SITES` and `PR_SITES` are the two populations the file already collects. Expected on the fixed
tree (re-run the collector, do not trust this table): 5 suffixed tracker sites
(`precompact.sh:329`, `develop-bug` verify-loop `:89`, `qa-task`, `qa-story`, `qa-fix`) and
4 suffixed PR-lead sites (`qa-fix`, `qa-task`, `qa-story`, `precompact.sh:227`). Record the actual
counts in the implementation report.

The collector regex already handles the quoted, variable-bearing form: `--stage\s+"?([A-Za-z0-9_-]+)`
captures `qa-gate-` from `"qa-gate-${QA_CYCLE}"` (stopping at `$`) and `baseStage` strips the
trailing hyphen to `qa-gate` — verified 2026-09-18 by running the collector against the current
tree. **No regex extension is needed** once `qa-gate` is in `CYCLE_SCOPED_STAGES`.

**Mutation proof** (record in the implementation report): change `qa-fix` Step 7 back to
`--stage qa-fix`, run the file, confirm the failure names `skills/qa-fix/SKILL.md`, restore.

## Key Patterns and References

- Suffix handling: `tracker-comment.js:249-260` (validator), `stakeholder-summary.js:296` (`stripCycleSuffix`).
- Existing correct call: `develop-pipeline-step-5-6-qa-loop.md:364` (`--stage qa-cycle-{N}`) — being removed, but its shape is the model; `develop-pipeline-on-precompact.sh:329` is the shell-variable form that stays.
- Call-site collection: `comment-slot-coverage.test.mjs` `shippedDocs()` / `collectCallSites()` — reuse, do not re-walk the tree.
- Enumeration rule: `docs/reference/anti-patterns.md` — the contract table cross-references the engine list.

## Testing Approach

`npm test` for the unit and guard layers. For the consumer check, the next multi-cycle pipeline run:
`gh issue view <N> --json comments --jq '.comments[].body' | grep -o 'agent-skills-comment:qa-[a-z]*-[0-9]*'`
should list `qa-gate-1`, `qa-fix-1`, `qa-gate-2`, … in order.
