---
id: task.37.plan
title: "Implementation Plan: tracker-workflow.yaml config engine"
type: plan
task-ref: task.37.tracker-workflow-config-engine.md
---

# Implementation Plan: `tracker-workflow.yaml` config engine

> Requirements and success criteria: [task.37.tracker-workflow-config-engine.md](task.37.tracker-workflow-config-engine.md)

## Overview

Promote the most capable existing YAML reader into `shared/resources/`, then build a pure,
tracker-agnostic engine on top of it that turns an ordered list of statuses into rank, targets and
walk plans. Nothing calls it yet.

## Phase-by-Phase Implementation Guide

### Phase 1: Teach the bundler `.mjs`, then promote the YAML parser

**Files to modify:**

- `skills/create-skill/scripts/bundle_skill.py` — Pass 1 `rglob` set, `rewrite_text`, `JS_SHARED_RE`
- `tests/bundle-mjs.test.js` — new; bundler regression
- `skills/develop-batch/scripts/schedule.mjs` — `parseYamlSubset` at **L172** (the
  `// ── minimal YAML subset ──` block opens at L68), consumed at **L493**
- `shared/resources/yaml-subset.js` — new

**Do this before touching `schedule.mjs`.** `bundle_skill.py` Pass 1 collects skill files with
`rglob('*.md') + rglob('*.js') + rglob('*.sh')` — `.mjs` is never walked — and `rewrite_text` branches
on `.md`/`.js`/`.sh`, returning anything else unchanged. `JS_SHARED_RE` matches
`require("../…/shared/resources/X")` and nothing else, so an ESM `import` is invisible to it.
`schedule.mjs` is `.mjs` and imports. Left as-is, the promoted parser is never bundled into
`skills/develop-batch/references/` and its import path is never rewritten — `develop-batch` breaks in
every tarball/zip install while `npm test` passes here, because the un-bundled relative path resolves
in-repo and only in-repo.

Three changes, all small:

1. add `*.mjs` to Pass 1's `rglob` set (and to the transitive-follow suffix checks);
2. add a `.mjs` branch to `rewrite_text` — same rewrite as `.js`;
3. add an ESM-import regex beside `JS_SHARED_RE`, e.g.
   `from\s+["'](?:\.\./)+shared/resources/([^"']+)["']`, rewriting to `../references/<name>`.

Regression test: a fixture skill with `scripts/x.mjs` importing a shared resource must end up with
`references/<name>` bundled **and** `x.mjs`'s import rewritten. Verify by hand too —
`npm run bundle && ls skills/develop-batch/references/yaml-subset.js`.

**Then, before writing any documented example:** confirm whether `parseYamlSubset` supports **flow
sequences** (`statuses: [A, B, C]`). Its header comment says "no flow collections". The task document
has already been corrected to show block sequences on that assumption — confirm it holds.

```bash
sed -n "68,180p" skills/develop-batch/scripts/schedule.mjs
```

Two acceptable outcomes:

1. Flow sequences work → document them.
2. They do not → keep the documented format at block sequences only and add a validation warning when
   a `[` is seen where a list is expected — the failure is otherwise silent (`parseScalar` returns the
   bracketed text as a plain string and a whole overlay is dropped). Do **not** extend the parser into
   general YAML; its narrowness is the reason it is trustworthy.

Move the **whole parser block**, not just the one function — `parseYamlSubset` depends on
`stripComment`, `parseScalar`, `significantLines` and `parseBlock`, all module-private in
`schedule.mjs`. Preserve the header:

```js
// Deliberately NOT a general YAML parser — no anchors, no multi-line strings,
// no flow collections. It reads the subset this repo's config files use, with
// zero dependencies, which is the whole reason it exists.
```

**CommonJS.** `package.json` is `"type": "commonjs"`, every `shared/resources/*.js` uses
`module.exports`, and `JS_SIBLING_RE` follows only `require("./x.js")` — so an ESM `import` between
`tracker-workflow.js` and `yaml-subset.js` would silently break transitive bundling. Export with
`module.exports = { parseYamlSubset }`; the `.test.mjs` suites can still named-import it via
cjs-module-lexer. The body is unchanged; the export *line* is not, so the contract test must pin
behaviour (parse the same fixtures, assert identical output), not the export statement.

`schedule.mjs` then does `import { parseYamlSubset } from "../../../shared/resources/yaml-subset.js"`.
The bundler rewrite added above turns that into `../references/yaml-subset.js`, which resolves
correctly from `<skill>/scripts/` in an installed layout — but only once that change is in.

### Phase 2: The engine — `shared/resources/tracker-workflow.js`

Pure CommonJS module. No HTTP, no `gh`, no `require("./jira-sync.js")`. It may `require("./yaml-subset.js")`
— that sibling edge is exactly what `JS_SIBLING_RE` follows.

```js
const MOMENTS = Object.freeze([
  "work-started",
  "in-review",
  "changes-requested", // declared here, wired in task.41
  "in-qa",
  "ready-for-merge",
  "pr-merged", // declared here, wired in task.41
  "blocked",
  "done",
]);
```

**The built-in default — the compatibility contract.** Today's defaults are candidate *lists*
(several acceptable names per moment), not single statuses. A ladder is ordered, but a rung may
still carry alternatives. So model a rung as `{ names: [...] }` and let the YAML's plain-string
form be sugar for a one-name rung:

```js
// A rung may carry alternatives. Collapsing today's candidate lists to a single
// name per rung would change behaviour for every consumer with no file — which
// is precisely what this default exists to prevent.
const DEFAULT_LADDER = Object.freeze([
  { names: ["To Do", "Backlog", "Open", "New", "Selected for Development"] },
  { names: ["In Progress", "Doing", "Started", "Development"] },
  { names: ["In Review", "Code Review", "Ready for Review", "Waiting for Review", "Peer Review", "Review"] },
  { names: ["Testing", "Ready for Testing", "In Testing", "QA", "In QA"] },
  { names: ["Waiting for merge", "Ready to Merge", "Ready for Merge", "Awaiting Merge"] },
  { names: ["Done", "Closed", "Resolved", "Complete", "Completed"] },
]);

const DEFAULT_PIPELINE = Object.freeze({
  "work-started": 1, // rung index
  "in-review": 2,
  done: 5,
  // in-qa, ready-for-merge, blocked, changes-requested, pr-merged: absent = off,
  // matching today's defaultEnabled:false on the three new v0.34.0 stages.
});
```

Cross-check this against `DEFAULT_STAGE_MAP` (`jira-sync.js:1388`) rung by rung before writing the
snapshot test. The three enabled-by-default moments must resolve to the same candidate lists.

**Public surface:**

```js
loadWorkflow({ repoRoot })            // → { ladder, pipeline, documentStatus, byIssueType, source }
rankOf(status, workflow)              // → index | null (off-ladder); matches ANY name on a rung
resolveMoment(moment, workflow, { issueType })
                                      // → { targets, rank, offLadder } | null (moment disabled)
                                      //   targets = the rung's full name list, preference order
planMove(fromStatus, toStatus, workflow)
                                      // → [rung, …] strictly between, in order; [] if none
resolveDocumentStatus(local, workflow)
validateWorkflow(workflow)            // → [{level, message}], never throws
MOMENTS, DEFAULT_LADDER
```

`targets` is plural and `planMove` yields rungs rather than first-names deliberately. Taking
`names[0]` would make every alternative unreachable as a move target — a board whose column is
`Waiting for Review` would be moved to `In Review` instead, which is exactly the behaviour change the
default ladder exists to prevent. Task.38/39 try the candidates in order, the way `resolveTransition`
already does.

**Path resolution** — mirror `loadWorkflowRecord` (`jira-sync.js:1952`): `repoRoot` is injectable and
falls back to `execSync("git rev-parse --show-toplevel", GIT_EXEC_OPTS).trim()`. That is the *only*
permitted shell-out, and it is what §9's purity criterion means.

Note: `loadWorkflowRecord` has **no** `--git-common-dir` fallback — that lives in the `.env` loader at
`jira-sync.js:46-50`, for a different reason (gitignored files are absent from linked worktrees).
`tracker-workflow.yaml` is a committed, tracked file, so `--show-toplevel` is correct for it. Do not
copy the `.env` loader's fallback here.

```js
const rel =
  loadScalarSetting(root, "tracker", "workflowFile", "TRACKER_WORKFLOW_FILE") ||
  DEFAULT_WORKFLOW_PATH; // "tracker-workflow.yaml"
```

**Swallow everything.** Missing file, unreadable file, malformed YAML, wrong shape → return the
default with `source: "default"` and a single warning the caller may print. Never throw. This is the
same contract as `loadWorkflowRecord`, and it is what makes "missing file → built-in defaults" safe.

**`planMove` is where the ladder earns its keep:**

```js
// The rungs strictly between `from` and `to`, in ladder order. This is the whole
// multi-hop story: a board that gates Done behind a showcase column needs no
// transition graph to be authored, because the ladder already says what lies
// between. Returns [] when already at target, when moving backwards, or when
// either end is off-ladder (a side-state is entered directly, never walked to).
function planMove(from, to, workflow) {
  const a = rankOf(from, workflow);
  const b = rankOf(to, workflow);
  if (a == null || b == null || b <= a) return [];
  return workflow.ladder.slice(a + 1, b); // rungs, not names[0] — see the note on `targets`
}
```

**Overlay** — `byIssueType` replaces, never merges, matching `resolveStage`'s existing layer
semantics. Key lookup is case-insensitive, as `resolveStage` already does (`jira-sync.js:1998-2005`).
A `pipeline` entry of `~`/`null`/empty disables that moment for the type.

**Matching** — reuse the rules from `jira-sync.js` but do **not** import it. Copy `stripStatusEmoji`
and `eqName` into `yaml-subset.js`'s sibling or into this module, and have `jira-sync.js` re-export
from here in task.38 so there is one implementation. Real boards need this: RAPP's column is
literally `READY FOR SHOWCASE` and GitHub columns are routinely `🚧 In Progress`.

### Phase 3: Tests — `shared/resources/tests/tracker-workflow.test.mjs`

The header must say what each group exists to catch, following
`jira-stage-fixtures.test.mjs:1-29`.

Groups:

1. **Parser** — nested maps; block sequences; flow sequences (or the documented rejection); inline
   comments; a quoted key containing `/` and spaces; `~`, `null`, empty → disabled.
2. **Rank** — index for a rung; `null` off-ladder; case-insensitive; emoji-stripped.
3. **`planMove`** — rungs strictly between, in order; `[]` at target, backwards, or off-ladder.
4. **Overlay** — `byIssueType` replaces `statuses`; nulls a moment; unknown type falls through.
5. **Disablement** — an omitted moment resolves to `null`.
6. **Default snapshot** — assert `DEFAULT_LADDER` and `DEFAULT_PIPELINE` literally, and derive the
   expectations from `jira-sync.js`'s `*_CANDIDATES` constants rather than hand-transcribing them, so
   a change to those constants fails loudly instead of passing a stale copy. Assert the three enabled
   moments resolve to the same candidate lists as `DEFAULT_STAGE_MAP`'s `work-started` / `in-review` /
   `done`. **This is the compatibility contract; write it first.**
6b. **Rung sugar** — a plain-string rung round-trips as `{ names: [one] }`; `rankOf` matches any name
   on a rung; `resolveMoment().targets` returns the full list in order.
7. **Failure modes** — missing, unreadable, malformed, wrong-shape → default, no throw.

### Phase 4: Documentation

**`docs/reference/tracker-workflow.md`** — the format, then the three bespoke-column shapes worked
end to end, because "where does my custom column go?" is the question this whole feature answers:

- **As a gate en route** — list it as a rung between review and done; `planMove` walks it.
- **As the terminal** — point `done:` at it and omit any later rung.
- **As an off-ladder side-state** — name it under `pipeline:` but not under `statuses:`.

State the three properties plainly: order is rank, omission is disablement, off-ladder is free.
Include the moment table with firing points.

**`docs/examples/tracker-workflow.default.yaml`** — the shipped template, byte-equal to the doc's
first example, heavily commented, naming only moments that are wired today (no `changes-requested`,
no `pr-merged`). `docs/examples/` is where this repo keeps copy-paste starter material; a root-level
`assets/` would collide with the per-skill `assets/` meaning in AGENTS.md → Skill Structure.
Task.41 scaffolds it.

**`configuration.md`** — a `tracker.workflowFile` row in the key table, and the precedence order
`tracker-workflow.yaml` > `jira.workflowRecord` > `jira.statusMap` > built-in, with both older keys
marked superseded but still read.

## Key Patterns and References

- `loadWorkflowRecord` — `jira-sync.js:1952-1968`. Copy the swallow-everything contract and the
  injectable-`repoRoot` shape. It has no `--git-common-dir` fallback; do not invent one.
- `resolveStage` — `jira-sync.js:1987-2030`. The layer-overlay shape and case-insensitive type key
  lookup.
- `parseYamlSubset` — `develop-batch/scripts/schedule.mjs:172` (block header at `:68`, consumed at
  `:493`). The parser being promoted; read its header before changing anything.
- `DEFAULT_STAGE_MAP` — `jira-sync.js:1388`; `DEFAULT_STATUS_RANK` — `jira-sync.js:1424`; the
  `*_CANDIDATES` constants — `jira-sync.js:1278-1362`. The behaviour the default ladder must
  reproduce, and the source the snapshot test should derive from.
- `bundle_skill.py` `JS_SIBLING_RE` — follows `require("./x.js")` transitively, so a new CommonJS
  sibling module needs no bundler change, but it only fires once a *root* file references it, and it
  does not match ESM `import` at all. `.mjs` root files are not walked today — hence the Phase 1
  bundler work.

## Testing Approach

- `node --test 'shared/resources/tests/tracker-workflow.test.mjs'` during development.
- `npm test` before commit — `develop-batch`'s suites are the regression signal for Phase 1's parser
  swap, but they **cannot** catch the bundling failure: they resolve the un-bundled path.
- `npm run bundle && git diff --stat -- 'skills/*/references/*'` to see the fan-out before
  committing it, and confirm `skills/develop-batch/references/yaml-subset.js` exists with a rewritten
  import path. This is the only check that catches the install-only breakage.
- Dogfood: author a `tracker-workflow.yaml` for this repo's own board (columns from
  `project.yml`'s board 1) and assert it parses in the test suite. It stays unwired.
