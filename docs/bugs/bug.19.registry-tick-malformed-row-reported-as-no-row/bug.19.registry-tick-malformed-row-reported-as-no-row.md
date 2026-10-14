---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-14'
related: 'none — cross-cutting (registry-tick · finalise Step 7.4 · develop-next parseRegistry)'
github_issue: 643
description: 'registry-tick reports no-row when parseRegistry rejected the row as malformed; parseRegistry rejects every row of a registry whose title is plain text and whose document path sits in its own column.'
---

**Bug ID**: bug.19
**Related**: none — cross-cutting (`registry-tick` · `finalise` Step 7.4 · `develop-next` `parseRegistry`)
**Status**: 🔍 Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-14
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: `finalise` Step 7.4 runs `registry-tick.js --file <task doc> --json`. In a consumer
repository whose task registry uses a plain-text title cell and a separate document-path column, it
answers `no-row` for a row that exists. The shared parser rejected the row's shape; `registry-tick`
never reads the parser's `malformed` list, so the rejection is reported as a missing row.

**Expected Behavior**:

1. A row the parser rejects is reported as a rejected row — a distinct reason carrying the parser's
   own reason and line — never as `no-row`.
2. A registry whose title cell is plain text and whose document path sits in a named column
   (`Document`, `Path`, …) parses: the tick writes `accepted`, and `develop-next` sees the rows.

**Actual Behavior**: `parseRegistry` requires the title cell to be a Markdown link to the work-item
document. Every row of the consumer's registry goes to `malformed` with
`malformed row — no [title](story|task|bug.….md) link`; `rows` is empty. `registry-tick` does
`rows.find((r) => r.n === taskId)` and returns `no-row`.

**Impact**:

- The tick has never worked in that consumer: five `/finalise` runs, five manual ticks.
- `no-row` points the operator at the wrong fix (look for a missing row). The row is there.
- Every outcome exits 0 by design, and the drift test that backstops a silent no-op exists only in
  this repository, so a consumer is never told the tick always fails.
- The same parser feeds `develop-next`'s registry frontier, so for these consumers the registry
  contributes no candidates at all.

---

## Reproduction Steps

**Environment**: any; Node ≥ 20, this repository on `develop` at `cbcc81dd`.

**Steps to Reproduce**:

1. Parse a one-row registry in the consumer's shape:

   ```js
   import { parseRegistry } from "./skills/develop-next/scripts/select-next.mjs";
   const text = [
     "| # | Title | Category | Priority | Icon | Status | Tracker | Document |",
     "|---|---|---|---|---|---|---|---|",
     "| 7 | Plain title | infrastructure | High | ⚠️ | ready-for-review | X-1 | `docs/tasks/task.7.x/task.7.x.md` |",
   ].join("\n");
   parseRegistry(text, "task", "docs/tasks/task-registry.md");
   ```

2. Observe `rows: []` and one `malformed` entry for task 7.
3. Put that table at `docs/tasks/task-registry.md` with an `accepted` task 7 document and run
   `node shared/resources/registry-tick.js --file <task 7 doc> --json`.
4. Observe `reason: "no-row"`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Test Output** (step 1, run 2026-10-14 against `develop`):

```
{ "rows": [],
  "malformed": [ { "kind": "task", "n": 7, "line": 3,
    "reason": "malformed row — no [title](story|task|bug.….md) link" } ],
  "warnings": [] }
```

**Consumer report** (GitHub #643): `{"reason":"no-row","message":"registry docs/tasks/task-registry.md
has no row for task 147", …}`; the probe against that registry gave `rows: 0`, `malformed: 147`.
The consumer's `registry-tick.js` is byte-identical to `develop`'s apart from the generated header.

**Related Files**:

- `shared/resources/registry-tick.js` — reads `rows`, never `malformed`
- `skills/develop-next/scripts/select-next.mjs` — `parseRegistry`, `COLUMN_ALIASES`, the title-link rule
- `skills/finalise/SKILL.md` — Step 7.4 reason table

---

## Scope & Impact

**Reference**: the registry tick (`finalise` Step 7.4, task.103) and the registry frontier
(`develop-next` / `develop-batch` via `parseRegistry`).

**How It Failed**: two defects compound. The parser accepts one registry shape — the one this
repository documents — and rejects a reasonable variant row by row. The tick then collapses "the
parser refused this row" into "there is no row", discarding the information the parser had already
produced. No single story or task owns it: the parser belongs to `develop-next`, the tick to
`finalise`, and the shape to a consumer convention.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-14
**Developer**: agent session

Reproduced on `develop` at `cbcc81dd` with the snippet above: `rows: []`, task 7 in `malformed`
with the title-link reason. Two defects, confirmed by reading the code:

1. `registry-tick.js` destructured only `rows` from `parseRegistry` and returned `no-row` when
   `rows.find` missed — the parser's `malformed` list, which already named the row and the reason,
   was discarded.
2. `parseRegistry` takes the work-item path only from a Markdown link in the title cell. It had no
   notion of a document-path column, so a registry that keeps the path in its own column has every
   row rejected.

Design call (user, 2026-10-14): accept the plain-title + document-column shape **and** add the
distinct reason, so any other malformed shape is still reported truthfully.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-14

**Root Cause**: see Investigation — a parser that accepted one registry shape, and a caller that
collapsed the parser's rejection into "no row".

**Fix Description**:

- `parseRegistry` maps `Document` / `Doc` / `Path` / `File` headers to a document column and
  reads the path from it when the title carries no work-item link. The title's link wins when both
  exist. A link in that column resolves against the registry; a code span or bare path is
  repo-root-relative unless it opens with `./` or `../`. A document column that names no work item
  gives a malformed reason that says so. `DOC_COLUMN_NAMES` is exported from the alias table.
- `registry-tick.js` returns `row-malformed` (exit 0) with `line` and `parserReason` when the
  task's row is in `malformed`, in both tick and `--annotate` modes. `no-row` now means no row.
- `--annotate` answers `no-cell` when the last column is a document column (names imported from
  `DOC_COLUMN_NAMES`, not restated). Without this, the parser fix would have let annotate append
  `· PR #n merged` to the consumer's path cell — the consumer's last column is `Document`.
- `row-malformed` added to `finalise` Step 7.4's reason table and DoD line, the exit-0 lists in
  `develop-next` / `develop-batch` Step 4, and `skill-shape.test.mjs`'s enumeration.
  `roadmap-selection.md` documents the document column.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs`
- `shared/resources/registry-tick.js`
- `skills/finalise/SKILL.md`, `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`
- `skills/develop-next/references/roadmap-selection.md`
- `evals/develop-next/unit/select-next.test.mjs` (7 tests), `shared/resources/tests/registry-tick.test.mjs` (4 tests),
  `evals/develop-next/protocol/skill-shape.test.mjs`

**Testing**:

- New tests: the consumer shape parses and ticks (path cell untouched, width preserved); a rejected
  row reports `row-malformed` with line and parser reason in both modes and writes nothing; a truly
  absent row is still `no-row`; annotate refuses the document column; link / `./` resolution; title
  link precedence; registry frontier selects from the new shape.
- Mutation proofs, each restored after: removing the `row-malformed` branch → its test red; parser
  ignoring the document column → 3 parser + 2 tick tests red; removing the annotate guard → its
  test red; document column overriding the title link → precedence test red.
- `npm test` with the `.agents/skills` symlink moved aside: 5439 pass, 2 fail — both bundle
  freshness (`references/registry-tick.js` STALE in `develop-batch`, `develop-next`, `finalise`).
  The pre-commit hook then bundled the three copies; `bundle_skill.py --check` reports 0 problems.

#### QA Verification (Ready for QA → Closed/Reopened)

[Pending]

---

## Status History

| Date       | Status | Changed By | Notes                                   |
| ---------- | ------ | ---------- | --------------------------------------- |
| 2026-10-14 | New    | —          | Bug created from GitHub #643            |
| 2026-10-14 | Ready for QA | —    | Fix implemented; bundle pending         |

---

## Resolution Summary

[Will be completed when bug is closed]
