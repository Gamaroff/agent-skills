---
id: task.235.plan
title: "Implementation Plan: select-next registry fallback selects an item blocked on another repository"
type: plan
task-ref: task.235.select-next-external-precondition.md
---

# Implementation Plan: select-next registry fallback selects an item blocked on another repository

> Requirements and success criteria: [task.235.select-next-external-precondition.md](task.235.select-next-external-precondition.md)

## Overview

Add one injected reader, `readExternalBlock`, beside `readStatus` in the registry loader. Check it
in `registryFrontier` between the eligibility floor and the dependency check, and report held rows
in the rationale and the `roadmap-complete` detail. Tests come first, and every new branch is
mutation-proven.

## Phase-by-Phase Implementation Guide

### Phase 1: Failing tests first

**File**: `evals/develop-next/unit/select-next.test.mjs`

Follow the existing `deps:` tests (from `test("deps: a dependent row is not selected while its
dependency is unaccepted"`). They build rows with `taskRow(n, slug, status, priority, deps)`, a
registry with `taskRegistry(rows)`, and an injected `readStatus` from a `docs` map through
`registryOpts({ tasks, docs })`. Extend `registryOpts` with an optional `external` map that becomes
`readExternalBlock`. When `external` is absent, leave `readExternalBlock` off the loader, so every
existing caller exercises the no-reader default. Do not push to `reads` from the new reader:
existing tests assert on `reads` (the registry loader is never called from a deliberate stop), and
a second push per row would change what they count:

```js
const rows = [
  taskRow(5, "held", "planned", "High"),
  taskRow(6, "free", "planned", "Medium"),
];
const docs = {
  "docs/tasks/task.5.held/task.5.held.md": "planned",
  "docs/tasks/task.6.free/task.6.free.md": "planned",
};
const external = { "docs/tasks/task.5.held/task.5.held.md": "acme-api task.9 merged" };
const { opts } = registryOpts({ tasks: taskRegistry(rows), docs, external });
const f = registryFrontier(opts.registries, { evaluateAll: true });
assert.equal(f.selected.id, "T6");
const held = f.passedOver.find((r) => r.n === 5);
assert.equal(held.eligible, false);
assert.equal(held.externalBlock, "acme-api task.9 merged");
assert.match(held.reason, /external precondition: acme-api task\.9 merged/);
assert.match(held.reason, /task\.5\.held\.md/);
```

Give task 5 a **higher** priority than task 6, so that only the hold explains why T6 wins. Run the
file and record which tests fail before any selector change.

### Phase 2: Read and honour the field

**File**: `skills/develop-next/scripts/select-next.mjs`

1. **Loader (`main`, near `readStatus: (docPath) =>`).** Read each document once. Cache the text
   per path inside `loadRegistries`, so `readStatus` and `readExternalBlock` share one read:

   ```js
   const docCache = new Map();
   const docText = (p) => {
     if (!docCache.has(p)) docCache.set(p, readOrEmpty(p));
     return docCache.get(p);
   };
   // …
   readStatus: (docPath) => {
     const text = docText(docPath);
     return text ? parseFrontmatterStatus(text) : null;
   },
   readExternalBlock: (docPath) => externalBlockOf(docText(docPath)),
   ```

2. **`externalBlockOf(text)`**: a small exported pure function beside `parseFrontmatterStatus`:

   ```js
   export function externalBlockOf(text) {
     const v = frontmatterScalar(text, "blocked_on_external");
     return v && !DEP_EMPTY_RE.test(v) ? v : null;
   }
   ```

   `DEP_EMPTY_RE` is declared later in the file (line 1165) as a `const`. It is read only at call
   time, after module evaluation, so the order does not matter. Do not move it.

3. **`registryFrontier`.** Beside the `readStatus` default:

   ```js
   const readExternalBlock =
     typeof reg.readExternalBlock === "function" ? reg.readExternalBlock : () => null;
   ```

   After the `if (!ELIGIBLE_FOR[row.kind].has(docStatus))` block and before
   `const depBlockers = registryDepBlockers(`:

   ```js
   const externalBlock = readExternalBlock(row.path);
   if (externalBlock) {
     passedOver.push({
       ...entry,
       eligible: false,
       externalBlock,
       reason: `blocked on an external precondition: ${externalBlock} — clear blocked_on_external in ${row.path} when it is met`,
     });
     continue;
   }
   ```

   The order is the requirement. The floor goes first, so a cancelled document reports its status.
   The hold goes before the dependencies, so it is named even when a dependency would also block.

4. **`buildRegistryRationale`.** Replace the single "rejected on document status" count with
   three counts: held (`r.externalBlock`), dependency-blocked (`/^blocked on unaccepted/` on `reason`),
   and the remaining `eligible === false` rows as "rejected on document status". Name held rows:
   `held on an external precondition: T174 (tinker-city task.127 …)`.

5. **`roadmap-complete` detail** (the branch with the `offLifecycle` WARNING). Append, after it:

   ```js
   const held = frontier.passedOver.filter((p) => p.externalBlock);
   // … + (held.length ? ` — ${held.length} row(s) held on an external precondition: ${held.map((p) => `${p.path} (${p.externalBlock})`).join(", ")}` : "")
   ```

### Phase 3: Control and edge cases

Same file and pattern as Phase 1:

- placeholders: `—`, `none`, `N/A`, `tbd`, `""`, plus a quoted `"none"`. Assert that
  `externalBlockOf` returns `null` for each, and that a row carrying one is selected.
- an `accepted` and a `cancelled` document with the field: the reason matches the floor
  (`/outside the task eligibility floor/`), and `externalBlock` is absent.
- a held row with an unaccepted `task.N` dependency: the reason is the hold.
- a **bug** row (`new`) carrying the field is held too. The fallback treats both kinds alike.
- every row held: `selectNext(model, { loadRegistries })` on an all-ticked roadmap returns
  `stop` / `roadmap-complete`, and `detail` names each held path.
- no `readExternalBlock` in the loader: the existing suite is the parity proof. Do not edit any
  existing test to make it pass.

**Mutation proofs** (record each in the implementation report): delete the frontier check, so the
held-row tests go red. Move it above the floor, so the accepted/cancelled test goes red. Drop the
`DEP_EMPTY_RE` test from `externalBlockOf`, so the placeholder test goes red. Remove the detail
append, so the all-held test goes red.

### Phase 4: Docs, rule and migration

- `skills/develop-next/references/roadmap-selection.md`: add `### External preconditions` after
  §"Frontmatter decides; the registry row only nominates". It covers the field, its placeholder
  spellings, the check order, that a held row is named on every run, and that a human clears it.
  At line 87 ("There is no park value, by decision"), add one sentence explaining why
  `blocked_on_external:` is not a park value: it names a condition outside the repository, and it
  is never silent.
- `docs/standards/task-documents.md`: add a row after `estimated_effort_hours`, saying it is
  optional, what it means, and that a human clears it.
- `docs/tasks/task-registry.md:24` and `skills/create-task/SKILL.md` § 1.2 ("A blocker in another
  repository is never written `task.N`"): keep the free-text rule. Add "and set
  `blocked_on_external:` in the task's frontmatter", and replace the sentence saying the selector
  cannot see free text with one saying the selector passes the task over while the field is set.
  Keep the Phase 0 HALT as the backstop for direct runs.
- task.174 frontmatter: `blocked_on_external: "tinker-city task.127 (#982) merged and run on a real PR"`.
  Add a Change Log row through `change-log.js`.
- `CHANGELOG.md` `[Unreleased]`.
- `npm run bundle`. `create-task` and `develop-next` bundle shared references, but no shared source
  changes here, so expect no copies to change. A change in the closure is a finding.

## Key Patterns and References

- `frontmatterScalar` (`select-next.mjs:998`) is the only frontmatter reader. Reuse it.
- The off-lifecycle `WARNING` in the `roadmap-complete` detail is the model for naming held rows.
- `evals/develop-next/unit/select-next.test.mjs` `deps:` tests are the model for injected loaders.
- The `15/SC10` test pins `--batch` as registry-free. It must pass unchanged.

## Testing Approach

- `command node --test evals/develop-next/unit/select-next.test.mjs`. Each new test is red before Phase 2.
- `command node skills/develop-next/scripts/select-next.mjs` on the tree after Phase 4: T174 is in
  `registryFrontier.passedOver` with `externalBlock`, and is not `item`.
- `command node skills/develop-next/scripts/select-next.mjs --lint` lists T174 held.
- `npm run ci` with `.agents/skills` and `.claude/skills` moved aside.
