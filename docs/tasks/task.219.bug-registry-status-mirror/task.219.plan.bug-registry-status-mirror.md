---
id: task.219.plan
title: "Implementation Plan: General-bug registry status: one writer at every transition"
type: plan
task-ref: task.219.bug-registry-status-mirror.md
---

# Implementation Plan: General-bug registry status: one writer at every transition

> Requirements and success criteria: [task.219.bug-registry-status-mirror.md](task.219.bug-registry-status-mirror.md)

## Overview

Add a `--bug-status` mode to `shared/resources/registry-tick.js` that reuses its parser import and its one-line rewrite. Then replace every hand edit of a general bug's registry row with a call to it, add the missing call in qa-fix, and add a drift test as the backstop.

## Phase-by-Phase Implementation Guide

### Phase 1: `--bug-status` mode

**File**: `shared/resources/registry-tick.js`.

**Arguments.** In `parseArgs` (`:96`), add `--bug-status` (boolean). `--bug-status` with `--annotate` is a usage error (exit 2). `--registry` defaults to `docs/bugs/bug-registry.md` when `--bug-status` is set.

**Classification.** The existing `isBugStem` regex (`:247`, `/(^|\.)bug\.\d+\./`) matches both a general bug (`bug.19.x.md`) and a parent-stemmed bug (`task.67.bug.3.x.md`). A general bug's basename *starts* with `bug.`:

```js
const generalBug = base.match(/^bug\.(\d+)\./);
if (!generalBug) return emit(opts, { reason: "not-a-general-bug", ... exitCode: 0 });
const bugId = Number(generalBug[1]);
```

Bug-number parsing is the bug grammar, not the PRD/epic/story grammar that `doc-id.js` owns. Check `tests/doc-id-chokepoint.test.js` before adding the regex. If it flags it, add an allowlist entry with the reason "general-bug filename, not a PRD-family id", following the existing entries. `isBugStem` sets the precedent for a bug regex in this file.

**Status.** Use `frontmatterField(text, "status")` (`:137`), then strip a trailing ` # …` comment (bug files carry `status: closed # bug lifecycle: …`). Lowercase it, and check it against `BUG_LIFECYCLE_STATUSES` imported from `select-next.mjs` beside `parseRegistry`. On a miss, answer `not-a-lifecycle-status`.

**Vocabulary.**

```js
const BUG_LABELS = {
  new: "🆕 New",
  "in-progress": "🔧 In Progress",
  "ready-for-qa": "🔍 Ready for QA",
  reopened: "⚠️ Reopened",
  closed: "✅ Closed",
};
// From the OTHER rows: a cell is "labelled" when it equals a BUG_LABELS value, case-insensitively.
const others = rows.filter((r) => r.n !== bugId);
const labelled = others.filter((r) => LABEL_VALUES.has(r.registryStatus)).length;
const vocabulary = others.length && labelled * 2 > others.length ? "label" : "token";
const target = vocabulary === "label" ? BUG_LABELS[status] : status;
```

`registryStatus` is lowercased by the parser, so compare against lowercased label values.

**Normalise for `already`.** Map the row's current cell to a lifecycle token (a label maps back through `BUG_LABELS`). If it equals the file's status *and* is already in the chosen vocabulary, answer `already`. If the status is right but the vocabulary is not, rewrite the cell. Report `mirrored` with `from`/`to`, so a stray plain token in an emoji registry is healed.

**Rewrite.** Reuse the tick's block from `:403` (split keeping the separators, locate the one cell whose trimmed lowercase equals `row.registryStatus`, refuse with `ambiguous-row` when the hit count is not 1, `setCell`, join). Lift it into a helper, `rewriteStatusCell(registryText, row, value)`, that both the tick and `--bug-status` call. Do not copy it. The tick's existing tests then hold the helper.

**Reasons.** Reuse `no-registry`, `no-row`, `row-malformed`, `ambiguous-row`, `engine-unavailable` and `dry-run` with their existing meanings. Add `mirrored`, `already`, `not-a-general-bug` and `not-a-lifecycle-status`. Document all of them in the header's reason list under a `--bug-status` heading.

**Tests** (`shared/resources/tests/registry-tick.test.mjs`): follow the file's temp-dir fixture pattern.

- A table over the five statuses × two vocabularies: write the bug file and a three-row registry, run the CLI, then assert `reason`, `to`, and that exactly one line changed.
- `already` in each vocabulary; plain token in a label registry → `mirrored` to the label.
- CRLF registry: only the target line changes, and CRLF is kept.
- `task.67.bug.3.x.md` with `--bug-status` → `not-a-general-bug`. `bug.4.x.md` *without* `--bug-status` → `not-a-task` (the finalise contract).
- `status: fixed` → `not-a-lifecycle-status`. No row → `no-row`. Malformed row → `row-malformed`. Two cells reading the status → `ambiguous-row`.
- `--dry-run` leaves the file byte-identical.
- `--bug-status --annotate` → exit 2.
- The argument-surface assertion near `:345`: add `--bug-status` to the expected set.

### Phase 2: Call sites

Re-run the population grep first (task §7). Then, at each site, the instruction becomes: write the bug file's status, then run

```bash
node .agents/skills/{qa-fix|develop-bug}/references/registry-tick.js --bug-status --file "{bug-file}" --json
```

and act on `reason`:

| `reason` | Do this |
| --- | --- |
| `mirrored`, `already`, `not-a-general-bug` | Nothing |
| `no-registry`, `no-row`, `row-malformed`, `ambiguous-row`, `engine-unavailable` | Log it in the Issues Log and edit the row's Status cell by hand |
| `not-a-lifecycle-status` | Fix the status you just wrote. It is outside the bug lifecycle |

Put the table once, in the develop-bug Step 3 callout, and link to it from the other develop-bug sites. qa-fix gets its own copy of the call and table, because it is a separate skill and its bundled references are its own.

**Sites:**

- `skills/qa-fix/SKILL.md`, under `#### Starting Investigation (New/Reopened → In Progress)` and the Ready for QA update in the same `### Updating Bug Reports` section. State that the call applies to a general bug (`docs/bugs/bug.{N}.…`), and that the CLI answers `not-a-general-bug` for the rest, so the caller does not branch.
- `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md`: item 1 (`in-progress`) and the `ready-for-qa` write. Rewrite the callout's last half: keep the why (tinker-city's guard, bug.89–91), and replace "use the registry's own vocabulary, read from its existing rows" with "the CLI reads the vocabulary from the rows".
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:174`: the `reopened` write.
- `skills/develop-bug/references/develop-bug-step-7-close-bug.md:83`: the `closed` write. **Refresh Last Updated** stays a hand edit. The CLI writes only the Status cell.
- `skills/develop-bug/SKILL.md`, the Step 3 and Step 7 summaries (`:234`, `:254`): name the call instead of "mirror … in the same edit".

Then run `npm run bundle`. Expect new `skills/qa-fix/references/registry-tick.js` and `skills/develop-bug/references/registry-tick.js`. Commit them with the source.

### Phase 3: Drift backstop and changelog

**File**: `evals/shared/tests/bug-registry-drift.test.mjs`. Model it on `evals/shared/tests/task-registry-drift.test.mjs`:

- Import `parseRegistry` and `BUG_LIFECYCLE_STATUSES` from `skills/develop-next/scripts/select-next.mjs`. Never restate them.
- Population: `docs/bugs/bug.*/` directories. For each, the main file is `bug.{N}.{slug}.md` (exclude `.dod.`, `.pr-review.`, `.implementation.`, `.qa.` and `.gate.` siblings by requiring the basename to equal the directory name plus `.md`).
- Floor: at least 15 bugs (19 at `9067ba92`).
- For each bug: the row exists, and its status, normalised from either vocabulary, equals the file's status with the comment stripped. A row with no file is reported too.
- Mutation proof: edit one row's cell in a temp copy and assert the comparison function reports it. Keep the comparison as an exported function, so the test can run it on fixtures as well as on the real tree.

**File**: `CHANGELOG.md` `[Unreleased]`:

```markdown
### Added

- **`registry-tick.js --bug-status` (task 219).** Sets a general bug's row in
  `docs/bugs/bug-registry.md` to the bug file's status, in the registry's own vocabulary.
  develop-bug and qa-fix call it at every status change, so the row no longer goes stale after
  a reopen. A new drift test fails CI when a bug file and its row disagree.
```

## Key Patterns and References

- `registry-tick.js` header comments explain why every outcome exits 0 and why the parser is imported. Keep both.
- bug 19 (`docs/bugs/bug.19.…`) is why `row-malformed` exists. Do not collapse it into `no-row`.
- `CLAUDE.md` § Task Registry: "the guard lives in the writer". The `not-a-general-bug` answer is that rule for this mode.

## Testing Approach

1. `command node --test shared/resources/tests/registry-tick.test.mjs`
2. `command node --test evals/shared/tests/bug-registry-drift.test.mjs`
3. The reopen-cycle fixture (task §8 Integration)
4. `npm run bundle:check`, `npm run ci:fast`, then `npm run ci`
5. Mutation proofs: revert the vocabulary detection (always token) and the label-registry case goes red. Drop the vocabulary half of the `already` check and the stray-token case goes red. The qa-fix and develop-bug call sites are prose. No test executes them, so their proof is the §7 population grep, re-run after Phase 2 and quoted in the implementation report.
