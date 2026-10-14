---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-14'
related: 'none — cross-cutting (registry-tick · finalise Step 7.4 · develop-next parseRegistry)'
github_issue: 643
description: 'registry-tick reports no-row when parseRegistry rejected the row as malformed; parseRegistry rejects every row of a registry whose title is plain text and whose document path sits in its own column.'
---

**Bug ID**: bug.19
**Related**: none — cross-cutting (`registry-tick` · `finalise` Step 7.4 · `develop-next` `parseRegistry`)
**Status**: ✅ Closed
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

**Date**: 2026-10-14
**QA Engineer**: agent session (`/finalise --bug`) — the same session that wrote the fix; no independent reviewer

**Verification Result**: ✅ Fixed

**Notes**: verified on `develop` at `97e56a7a` (the merge of PR #651), not on the branch:

- The reproduction snippet now returns task 7 in `rows` with `path: docs/tasks/task.7.x/task.7.x.md` and an empty `malformed`.
- End to end, through the merged `shared/resources/registry-tick.js`, on a sandbox registry in the consumer's exact shape (plain title, `Icon`/`Tracker` columns, backticked path in `Document`) with an accepted task 147: `reason: ticked`, `ready-for-review → accepted`, only the Status cell changed, path cell untouched.
- Suites on the merge commit: `select-next.test.mjs` 155/155, `registry-tick.test.mjs` 40/40, `skill-shape.test.mjs` 34/34; `bundle_skill.py --check` 0 problems. PR #651 CI: all five checks SUCCESS (`test` 2m59s).
- Mutation on the merge commit: disabling the `row-malformed` branch turns the `row-malformed` test red (0 pass, 1 fail); restored.

**Decision**: Reopened — `/finalise --bug` DoD run 1 (`bug.19.dod.1.…md`) found 4 gaps, so the bug stays Ready for QA. See Iteration 2.

### Iteration 2

#### Investigation (Reopened by DoD run 1)

**Date**: 2026-10-14
**Developer**: agent session

DoD run 1 recorded four gaps:

1. `CHANGELOG.md` `[Unreleased]` had no `(bug 19)` entry.
2. The document column accepted an absolute path. `/etc/task.1.x.md` resolved to `/etc/task.1.x.md`, where a title link with the same href is joined under the registry directory. Confirmed in memory against `97e56a7a`. A `../` escape out of the repo was also possible; title links allow that too, and they are not changed here.
3. Security probe zero-guard: no engine form could score `parseRegistry`, which returns `{rows, malformed}`, and `docCellPath` was not exported.
4. PR #651 had no review.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-10-14

**Fix Description**:

- `docCellPath` becomes the exported `resolveDocCell(cell, registryPath)`, which returns `{ok: true, path}` or `{ok: false, reason}`. It refuses an absolute path (leading `/` or a drive letter), a backslash, a control character, a non-work-item path, and any path that normalises outside the repo root, in both the code-span and link forms. `parseRegistry` calls it, and a refusal is a malformed row reading `document column refused: <reason>`.
- `CHANGELOG.md` `[Unreleased]` → `### Fixed` gains the `(bug 19)` entry. `roadmap-selection.md` states the containment rule.
- Gap 4: `/review-pr` on PR #652 (`bug.19.pr-review.1.…md`) returned ⚠️ CONCERNS with two medium findings, both fixed here. **CR-2:** an absolute `--task-registry` path made every joined path absolute, so the `../` containment check never fired. `registryDir` now re-expresses an absolute registry path from the working directory, the base `readStatus` opens paths from. **CR-1** (pre-existing; the same input on `97e56a7a~1` gives the same result): a title link could still resolve outside the repo. It now meets the same rule and becomes a malformed row (`title link … resolves outside the repository`). PC-2 is fixed by the Decision wording above. PC-1 (#643 closed while the bug is open) is fixed by reopening #643; DoD run 2 closes it.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs`, `skills/develop-next/references/roadmap-selection.md`, `CHANGELOG.md`
- `evals/develop-next/unit/select-next.test.mjs` (5 tests)
- `bug.19.dod.2.security.cases.json` (beside this file): 18 probe cases, 11 hostile and 7 legitimate

**Testing**:

- Unit: `resolveDocCell` refuses 10 cell shapes, each with its reason; it resolves 6 legitimate spellings; a refused cell becomes a malformed row naming the refusal. `select-next.test.mjs` and `registry-tick.test.mjs`: 198/198.
- Mutation proofs, each restored after. Removing the absolute check turns 2 tests red. Removing the outside-repo check turns 1 red. Removing the control-character/backslash check turns 1 red.
- Security probe: `security-probe.mjs --cases-file bug.19.dod.2.security.cases.json --entry skills/develop-next/scripts/select-next.mjs#resolveDocCell --args-json '["docs/tasks/task-registry.md"]'` gave `engages`: 18 executed, 0 reproduced, 0 over-blocked. With the absolute check removed it gave `present-but-inert`, reproducing `absolute-code-span`, `absolute-link` and `drive-letter`. Two cases were wrong as first written and the probe exposed both: `../outside/…` and `../../task.1.x.md` resolve inside the repo from `docs/tasks/`. They were corrected, not the code.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-10-14
**QA Engineer**: `/finalise --bug` DoD run 2, plus `/review-pr` on #652 (`bug.19.pr-review.1.…md`). The same session wrote the fix; the review's two lenses and the four DoD agents ran as separate read-only subagents

**Verification Result**: ✅ Fixed

**Notes**: verified at PR #652 head `2187e98f`:

- DoD run 1's four gaps are closed. The CHANGELOG cites `(bug 19)`. The document column refuses an absolute path. `resolveDocCell` is exported and probed. #652 has a PR review.
- The PR review's findings are all fixed in `2187e98f`: CR-2 (absolute registry path), CR-1 (title-link escape, pre-existing), PC-1 (#643 reopened) and PC-2 (Decision wording).
- Mutation proofs for the review fixes: making `registryDir` return an absolute directory unchanged turns the CR-2 test red. Disabling title-link containment turns the CR-1 test red. Both were restored.
- Security probe, recorded at `bug.19.dod.2.security.run.json`: 18 executed, 0 reproduced (`engages`).
- `npm test` with the `.agents/skills` symlink moved aside: 5446 pass, 0 fail.

**Decision**: Closed

---

## Status History

| Date       | Status | Changed By | Notes                                   |
| ---------- | ------ | ---------- | --------------------------------------- |
| 2026-10-14 | New    | —          | Bug created from GitHub #643            |
| 2026-10-14 | Ready for QA | —    | Fix implemented; bundle pending         |
| 2026-10-14 | Ready for QA | finalise | DoD incomplete — 4 gap(s) — bug.19.dod.1.registry-tick-malformed-row-reported-as-no-row.md |
| 2026-10-14 | Ready for QA | — | Iteration 2 — DoD run 1 gaps 1–3 fixed; review pending |
| 2026-10-14 | Ready for QA | finalise | DoD verified — bug.19.dod.2.registry-tick-malformed-row-reported-as-no-row.md |
| 2026-10-14 | Closed | develop-bug | Fix verified and accepted |

---

## Resolution Summary

**Final Status**: Closed — Fixed
**Total Iterations**: 2
**Time to Resolution**: same day (filed and closed 2026-10-14)
**Final Fix Details**: `registry-tick` threw away the parser's `malformed` list and reported every rejected row as `no-row`. It now answers `row-malformed` with the parser's reason and line. `parseRegistry` accepts a plain-text title with the path in a `Document`/`Doc`/`Path`/`File` column, so the tick and `develop-next`'s frontier see those registries. The path must name a work item inside the repository (`resolveDocCell`); title links follow the same rule, whatever spelling the registry path was given in. Fixed in PR #651 and PR #652.
**Lessons Learned**: (1) A caller that collapses a parser's rejection into "not found" hides the parser's diagnosis. Read `malformed` wherever `rows` is read. (2) Widening what a parser accepts makes new input reachable by every writer and reader that trusts it. Here that was `--annotate`'s notes cell and the selector's file open, and both needed a guard (obs #36). (3) A path boundary has to be exported as a verdict, or the probe engine cannot score it: DoD run 1 caught the absolute-path gap only by hand.
