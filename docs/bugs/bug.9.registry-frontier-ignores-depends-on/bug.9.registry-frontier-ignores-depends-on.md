---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-02'
related: 'none — cross-cutting (no single owner)'
description: 'The registry fallback frontier never read the Depends on column, so it could nominate a task whose prerequisite was unbuilt; the ascending-number tie-break masked it in the common case.'
---

**Bug ID**: bug.9
**Related**: none — cross-cutting (selection · task registry)
**Status**: ✅ Closed
**Priority**: High
**Severity**: Major
**Created**: 2026-09-02
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `registryFrontier()` in `skills/develop-next/scripts/select-next.mjs` ranked registry rows
by priority then ascending number and consulted **nothing** about dependencies. `DEFAULT_COLUMNS.task`
had no `deps` index and `COLUMN_ALIASES` had no entry that would map one — so the `Depends on` column of
`docs/tasks/task-registry.md` was never read on any code path. The `⛔ blocked until X accepted`
machinery that handles this correctly is **roadmap-only**.

**Expected Behavior**: a registry row declaring `Depends on: task.83` is not nominated while task 83 is
unfinished, and if it is passed over the recorded reason says so.

**Actual Behavior**: the row is nominated on rank alone. The prerequisite is reported as *"eligible, but
T84 ranked higher"* — the frontier states the inverse of the truth: it names the dependency as the
lower-priority item rather than as the thing that must be built first.

**Impact**: `/develop-next` dispatches `/develop-task` against a task whose prerequisite does not exist
yet. The pipeline does not fail cleanly at Step 0 — the task document is well-formed and its own status
is eligible — so the run proceeds into `/review-task` and `/develop` before anything notices, if it
notices at all. For a task like 84 in this repo, whose plan calls `_skill_excluded_for_tracker` from
task 83, the implementation would be written against a function that has not been added.

**Why it survived**: the trailing tie-break is ascending number, and a prerequisite conventionally
carries the **lower** number. So the ordering looked correct for as long as every dependency also
happened to be numbered lower and to share a priority — which is the common case, and was the case for
every dependency pair in this registry until now. The defect only surfaces when a dependent row is
ranked above its prerequisite, which any priority difference produces.

---

## Reproduction Steps

**Environment**: `agent-skills` at `v0.45.0` (commit `0d09860`) or any earlier tag carrying the registry
fallback. No credentials, no network.

**Steps to Reproduce**:

1. Save this as `repro.mjs`:

   ```js
   const { registryFrontier } = await import(process.argv[2]);
   const text = [
     "| # | Title | Status | Category | Priority | Created | Issue | Depends on |",
     "| - | ----- | ------ | -------- | -------- | ------- | ----- | ---------- |",
     "| 83 | [Task 83](task.83.base/task.83.base.md) | planned | infra | Medium | 2026-09-02 | — | — |",
     "| 84 | [Task 84](task.84.dep/task.84.dep.md) | planned | infra | High | 2026-09-02 | — | task.83 |",
   ].join("\n");
   const docs = {
     "docs/tasks/task.83.base/task.83.base.md": "planned",
     "docs/tasks/task.84.dep/task.84.dep.md": "planned",
   };
   const f = registryFrontier({
     bugRegistry: { path: "docs/bugs/bug-registry.md", text: "" },
     taskRegistry: { path: "docs/tasks/task-registry.md", text },
     readStatus: (p) => docs[p] ?? null,
   }, { evaluateAll: true });
   console.log("selected:", f.selected?.id);
   for (const p of f.passedOver) console.log(`passedOver: T${p.n} — ${p.reason}`);
   ```

2. Run it against the pre-fix selector:

   ```bash
   git show v0.45.0:skills/develop-next/scripts/select-next.mjs > /tmp/select-next.PRE.mjs
   node repro.mjs "file:///tmp/select-next.PRE.mjs"
   ```

**Note on the fixture**: T84 is `High` and T83 is `Medium` deliberately. Equal priorities would let the
ascending-number tie-break select T83 for the wrong reason, and the test would pass while proving
nothing. Inverting the rank is what makes the fixture load-bearing.

**Frequency**: deterministic — 100% whenever a dependent row outranks its prerequisite.

---

## Evidence

Measured on this repository, 2026-09-02.

**Before** (`v0.45.0`, commit `0d09860`):

```
selected: T84
passedOver: T83 — eligible, but T84 ranked higher
```

**After** (the fix in this change):

```
selected: T83
passedOver: T84 — blocked on unaccepted dependency: task.83 (planned)
```

**The column was never readable.** `select-next.mjs` at `v0.45.0`:

```js
// Documented positions, used when a registry has no recognisable header.
//   bug:  | # | Title | Status | Severity | Priority | Created | Area |
//   task: | # | Title | Status | Category | Priority | Created | Issue | Deps |
const DEFAULT_COLUMNS = {
  bug: { n: 0, title: 1, status: 2, severity: 3, priority: 4 },
  task: { n: 0, title: 1, status: 2, priority: 4 },   // ← no deps index
};
```

The comment two lines above the map documents the header as ending in `| Deps |`. The map does not read
it, and `COLUMN_ALIASES` had no key that would resolve `Depends on` by name either — so neither the
header path nor the positional fallback could see the column. **The documentation of the field and the
handling of the field were written at the same time, and only one of them was finished.**

**Ordering consults nothing about dependencies** — `compareCandidates`, unchanged by this fix:

```js
const p = rankOf(PRIORITY_RANK, a.priority) - rankOf(PRIORITY_RANK, b.priority);
if (p) return p;
return a.n - b.n;
```

**The correct machinery existed, in the wrong path.** `blockedUntil` / `idDone` implement exactly this
check for roadmap rows, including the `⛔ blocked until X accepted` marker and a lint warning when a
blocker names no current row. None of it was reachable from `registryFrontier`.

**The live instance**: this repo's own tasks 83 and 84, filed 2026-09-02. Task 84's registry row declares
`Depends on: task.83`; its plan calls `_skill_excluded_for_tracker`, a function task 83 adds. Both are
`Medium`, so the ascending-number tie-break currently orders them correctly **by accident** — raising 84
to `High` is all it takes.

---

## Scope & Impact

**Affected**: `/develop-next` (single-item selection) and `select-next.mjs --lint`, on the registry
fallback path only.

**Not affected**:

- **The roadmap path.** `deps:` and `⛔` already gate correctly there, which is where every dependency in
  this repo has been expressed to date.
- **`/develop-batch`.** `selectBatch` does not call `registryFrontier` — it works off the roadmap.
- **Bug rows.** The bug registry has no dependency column, and none is added by the fix.

**Blast radius is bounded by the fallback's own precedence**: the registries are consulted only at the
terminal `roadmap-complete` return, so no repo with an actionable roadmap row could reach this. That is
why it has not bitten yet, and it is also why it would have bitten *silently* the first time it did —
the fallback exists precisely for the case where nobody is watching.

**Consumers**: anyone pinned to `v0.45.0` or earlier who relies on the registry fallback and writes a
`Depends on` cell. The column has been in the documented header the whole time, so a consumer filling it
in reasonably expects it to be honoured.

---

## Suggested Fix

Implemented in this change:

1. `COLUMN_ALIASES` gains `deps`, `dep`, `depends on`, `depends-on`, `depends_on`, `blocked by`;
   `DEFAULT_COLUMNS.task` gains `deps: 7`, matching the header its own comment documents.
2. `parseDepCell(cell, kind)` — parses `task.83`, `T83`, `bug.4`, `B4`, `#83` and a bare `83` (read as
   the declaring row's kind). `—`, `none`, `n/a`, `tbd` and an empty cell place no constraint. Story
   references and dotted numbers are dropped.
3. `registryDepBlockers()` — resolves each reference across **both** registries and reads the target
   **document's** status, matching the frontier's existing "frontmatter decides, the row only nominates"
   rule. Satisfied on `accepted`.
4. The gate runs **after** the eligibility floor and **before** the ranked-lower branch, so a blocked row
   reports the dependency rather than claiming it was outranked.

**Three cases are satisfied-with-a-warning, not blockers**: a `cancelled` dependency, a reference naming
no row in either registry, and one whose document is missing or unreadable. This follows the reasoning
task 71 settled the eligibility floor on — selecting early costs **one visible cycle**, because
`develop-*` Step 2 reviews before any code is written and HALTs on findings, whereas an unresolvable
blocker costs **indefinite silence**, which is the failure the fallback exists to remove. All three still
emit a `--lint` warning, so the condition is never mute.

**One level deep, deliberately.** The check asks only whether each named dependency is `accepted`, never
what that dependency in turn depends on. A transitive walk would need cycle detection over a
hand-maintained table nothing validates; the shallow check needs none, and the deeper ordering falls out
anyway, because a dependency cannot itself be selected until *its* dependencies are accepted — a chain
drains one accepted item at a time.

---

## Developer Fix Cycle

### Iteration 1

**Root cause**: the `Depends on` column was documented in `DEFAULT_COLUMNS`' own comment and in
`taskRegistry`'s header, and read by nothing. The roadmap's equivalent gate (`blockedUntil` / `idDone`)
was never generalised to the registry path when the fallback was added in task 65.

**Changes**:

| File | Change |
| ---- | ------ |
| `skills/develop-next/scripts/select-next.mjs` | `COLUMN_ALIASES` + `DEFAULT_COLUMNS.task` deps entry; `parseDepCell()`; `registryDepBlockers()`; the gate in `registryFrontier`'s loop |
| `evals/develop-next/unit/select-next.test.mjs` | 12 cases; `taskRow()` helper gains a `deps` argument |
| `skills/develop-next/references/roadmap-selection.md` | new "Dependencies" section; `Columns` and `Visibility` lists updated |
| `CHANGELOG.md` | `[Unreleased]` → `### Fixed` |

**Verification**: 135/135 in the selector suite.

**Mutation proofs** — each reverted in isolation, test count observed to go red:

| Mutation | Failing tests |
| -------- | ------------- |
| Drop the deps blocker branch | 5 |
| Never push a blocker (all deps satisfied) | 5 |
| Remove the `cancelled` carve-out | 1 |
| Remove the `depends on` header alias | 1 |
| Remove `deps: 7` from `DEFAULT_COLUMNS` | 1 |
| Remove the dotted-number guard | 1 |
| Move the check after the ranked-lower branch | 2 |

**Found by the tests, not by review**: the first `parseDepCell` draft matched a bare `\d+`, so
`story.2.3` parsed as story 2 **plus a phantom task 3** — inventing a dependency nobody declared. The
number capture now consumes dotted segments and drops them whole.

**A test the mutation pass showed was missing**: removing `deps: 7` initially failed nothing, because
every fixture used a headered table and the `deps` alias covered it. `DEFAULT_COLUMNS` only fires for a
headerless registry, and no case exercised that path — so the entry was unheld. A headerless-registry
test was added, and the mutation then failed as it should.

---

## Status History

| Date       | Status       | Changed By | Notes                                                                                       |
| ---------- | ------------ | ---------- | ------------------------------------------------------------------------------------------- |
| 2026-09-02 | New          | Claude     | Found while checking whether `/develop-next` honours task 84's `Depends on: task.83`          |
| 2026-09-02 | Ready for QA | Claude     | Fix, 12 tests and 7 mutation proofs landed in the same change; awaiting PR review and merge |
| 2026-09-02 | Closed       | Claude     | [PR #303](https://github.com/Gamaroff/agent-skills/pull/303) merged to `develop`; 4/4 CI checks green |

---

## Resolution Summary

**Final Status**: ✅ Closed
**Total Iterations**: 1 fix cycle
**Time to Resolution**: same day (found, filed, fixed and merged 2026-09-02)
**Merged**: [PR #303](https://github.com/Gamaroff/agent-skills/pull/303) → `develop` (`48d1ac2`), 4/4 CI checks green

**Final Fix Details**:

`registryFrontier()` now reads the `Depends on` column and gates on it. `COLUMN_ALIASES` gained the
name-based keys and `DEFAULT_COLUMNS.task` gained `deps: 7`, so the column resolves on both the header
path and the positional fallback — previously neither could see it. `parseDepCell()` parses the
spellings a hand-maintained table carries; `registryDepBlockers()` resolves each reference across both
registries and treats a dependency as satisfied when the **document** it points at reads `accepted`,
matching the frontier's existing "frontmatter decides, the row only nominates" rule.

The gate sits after the eligibility floor and before the ranked-lower branch, so a blocked row reports
the dependency rather than claiming it was outranked — the inverted reason was half the defect, not a
cosmetic detail.

A `cancelled` dependency, a reference naming no row, and one whose document is unreadable are all
satisfied-with-a-warning rather than blockers, on the ground task 71 settled the eligibility floor on:
selecting early costs one visible cycle because `develop-*` Step 2 reviews before any code is written
and HALTs, whereas an unresolvable blocker costs indefinite silence.

Nothing about ranking, the eligibility floor, the roadmap path or `selectBatch` changed.

**Verification**: 135/135 in the selector suite; 410 pass / 0 fail across `evals/develop-next`,
`evals/develop-batch` and `evals/loop-supervisor`; 7 mutation proofs each observed to turn tests red.
End-to-end on the real roadmap: T83 is selected while T84 waits, and ticking T83 yields
`selected T84 — deps satisfied: T83`.

**Lessons Learned**:

1. **A documented field and a handled field are not the same field.** The header comment directly above
   `DEFAULT_COLUMNS` listed `| Deps |` for as long as the map omitted it. The documentation was written
   at the same time as the handling, and only one of the two was finished — so every later reader,
   human or agent, saw a column that looked supported. Documenting a field is the cheap half; the
   comment is not evidence the code reads it.

2. **A total tie-break can hide a missing rule for as long as the data cooperates.** Ordering falls back
   to ascending number, and a prerequisite conventionally carries the lower number, so the frontier
   produced the right answer for the wrong reason on every dependency pair that ever existed here. The
   fixtures added with the fix all invert the numbering or the priority precisely because a fixture that
   the tie-break alone would satisfy proves nothing.

3. **Machinery solving the same problem one path over is not reuse until someone reuses it.**
   `blockedUntil` / `idDone` implemented this exact check — including the "blocker names no current row"
   warning — for roadmap rows. When task 65 added the registry fallback it gained a second selection
   path and inherited none of it. A new path beside an existing one should be audited against what the
   old one already guarantees.

4. **The mutation pass found an unheld line the test pass did not.** Removing `deps: 7` from
   `DEFAULT_COLUMNS` initially failed nothing: every fixture used a headered table, so the positional
   fallback was never exercised. The tests were green over a line that did nothing. Reverting each
   change individually is what surfaced it, and a headerless-registry case was added in response.
