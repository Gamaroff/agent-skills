---
id: task.169.plan
title: "Implementation Plan: Close the four advisory findings on the reference-doc pinning test"
type: plan
description: "Code-level guide for task 169: boundary flag matching, activation-flag checks, empty-vs-missing SKILL.md messages and a memoised corpus, each with the test and mutation that holds it."
task-ref: task.169.pinning-test-advisory-fixes.md
created: 2026-09-30
updated: 2026-09-30
---

# Implementation Plan: Close the four advisory findings on the reference-doc pinning test

> Requirements and success criteria:
> [task.169.pinning-test-advisory-fixes.md](task.169.pinning-test-advisory-fixes.md)

## Overview

All four fixes land in `tests/reference-doc-skill-pinning.test.js` and route through
`resolveCorpus()`, the single function the live assertions and the cost tests already share. Keep
that property: nothing below may add a second code path that the cost tests do not spy on.

## Phase-by-Phase Implementation Guide

### Phase 1: Boundary flag match and empty-vs-missing

```js
// A flag is documented when SKILL.md carries it as a whole token: `--read` must
// not pass on `--read-only`. `=`, `.`, `,`, `)`, a backtick or whitespace may follow.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function documentsFlag(body, flag) {
  return new RegExp(`${escapeRegExp(flag)}(?![a-z0-9-])`).test(body);
}
```

In `resolveCorpus`, replace `!body.includes(flag)` with `!documentsFlag(body, flag)`, and split the
missing test:

```js
const body = lookup(r.skill);
if (body === null) { missingCommands.push(`… does not exist`); continue; }
if (!body.trim()) { emptySkills.push(`commands.md:${r.line}: ${r.cell} names /${r.skill}, but skills/${r.skill}/SKILL.md is empty`); continue; }
```

`makeSkillMd()` already stores `null` for a missing file; keep it. Return `emptySkills` and assert
it empty in the commands group (and the same for activation mentions).

Fixtures (under `describe("extractors …")` or a new `describe("resolution rules")`):

- `documentsFlag("use --read-only here", "--read") === false`;
  `documentsFlag("pass --read.", "--read") === true`; `documentsFlag("--apply=x", "--apply") === true`.
- `resolveCorpus` with a fake lookup — `(name) => name === "develop-next" ? "" : skillMd(name)` —
  returns an `emptySkills` entry naming `develop-next` and no `missingCommands` entry for it.

### Phase 2: Activation flags checked

In `extractActivationSkills`, walk the spans in order; a span whose head starts with `--` attaches to
the last skill mention pushed from the same row:

```js
let last = null;
for (const span of spans) {
  const [head, ...rest] = span.split(/\s+/);
  if (head.startsWith("--")) { if (last) last.flags.push(head); continue; }
  if (!SKILL_HEAD.test(head)) continue;
  last = { line: i + 1, skill: head, flags: rest.filter((t) => t.startsWith("--")) };
  named.push(last);
}
```

Note the `new Set(spans)` dedupe in today's loop: keep order-preserving dedupe of *skill* spans, but a
flag span must still attach.

In `resolveCorpus`, for each `named` entry with a non-null, non-empty body, check each flag with
`documentsFlag`; collect `undocumentedActivationFlags` and count `activationFlagChecks`. Live test:
empty list and `activationFlagChecks >= 2` (3 measured: `review-story --validate`,
`review-bug` `--validate`, `observe-work` `--review`).

### Phase 3: One corpus resolution per run

```js
let corpusMemo = null;
function getCorpus() {
  if (!corpusMemo) corpusMemo = resolveCorpus(skillMd);
  return corpusMemo;
}
```

Both live `describe` blocks: `const corpus = getCorpus();`. Test:

```js
test("the corpus is resolved once per run", () => {
  const first = getCorpus();
  const spied = withSpies([["fs", fs, ["readFileSync"]]], () => getCorpus());
  assert.equal(getCorpus(), first);
  assert.deepEqual(spied.calls.filter((c) => [COMMANDS, PHRASES].includes(String(c.args[0]))), []);
});
```

(`withSpies` lives inside the cost `describe`; hoist it to module scope so this test can use it.)

## Mutation proofs (record each in the implementation notes)

| Mutation | Expected red |
| :--- | :--- |
| `documentsFlag` → `body.includes(flag)` | the prefix fixture |
| Drop the standalone-flag attachment | activation-flag fixture; live floor (1 < 2) |
| `body === null` → `!body` | the empty-vs-missing fixture |
| `getCorpus` → `resolveCorpus(skillMd)` (no memo) | the resolved-once test |

## Measurement commands (re-run before setting floors)

```bash
command node -e 'const fs=require("fs");for(const f of fs.readdirSync("skills")){const p=`skills/${f}/SKILL.md`;if(fs.existsSync(p)&&!fs.readFileSync(p,"utf8").trim())console.log("EMPTY",p)}'
grep -n -- '`--\|` --' docs/reference/activation-phrases.md
```

## Testing Approach

```bash
command node --test tests/reference-doc-skill-pinning.test.js
npm run ci:fast   # with .claude/skills and .agents/skills moved aside
```
