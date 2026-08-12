---
id: task.42.plan
title: "Implementation Plan: Canonical Change Log spec and shared engine"
type: plan
task-ref: task.42.change-log-spec-and-engine.md
---

# Implementation Plan: Canonical Change Log spec and shared engine

> Requirements and success criteria: [task.42.change-log-spec-and-engine.md](task.42.change-log-spec-and-engine.md)

## Overview

Lift the 105-line changelog implementation out of `shared/resources/jira-sync.js` into a
tracker-agnostic `shared/resources/change-log.js`, generalising it to four columns, H2/H3
headings, one marker pair, and doc-type insertion anchors. Write the canonical spec beside
it. `jira-sync.js` keeps its old exports as wrappers so nothing downstream changes yet.

## Phase-by-Phase Implementation Guide

### Phase 1: `shared/resources/document-change-log.md`

**Model it on `shared/resources/sign-off.md`** — read that file first. Its section order is
the one to copy: a one-line "Canonical spec. Consumed by …" blockquote, what the thing is,
"Why it looks like this", "The section" (a fenced example), "Rules" (a bullet list),
who writes what, "Configuration" (a key table), enforcement, and "See also".

Content the spec must pin down:

```markdown
## Change Log

| Date       | Version | Description                                  | Author          |
|------------|---------|----------------------------------------------|-----------------|
| 2026-05-11 | 1.0     | Initial draft                                | create-story    |
| 2026-05-13 | 1.1     | Review passed (9/10) — ready for development | review-story    |
| 2026-08-12 |         | Jira story created (PROJ-42)                 | sync-jira-story |
```

Rules to state explicitly:

- Four columns, in that order. `Date` is `YYYY-MM-DD`, matching frontmatter `created`/`updated`.
- `Version` is a document version (`1.0`, `1.1`), bumped by authoring and review skills only.
  Machine writers leave it blank — that is what lets one table serve both audiences.
- `Author` is the skill name (`create-story`, `review-task`, `qa-story`, `finalise`,
  `sync-jira-story`) or a human name for a hand edit.
- Append-only. Newest at the bottom. Rows are never rewritten, reordered, or removed.
- **Every entry bumps frontmatter `updated:` in the same edit.** Cross-link
  `open-knowledge-format.md` — `updated` is this repo's OKF `timestamp`.
- Heading is `## Change Log` at top level for epic/story/task. PRDs keep `### Change Log`
  nested under §1. Readers accept H2 or H3 with optional numbering (`### 1.5 Change Log`).
- Markers are `<!-- change-log-start -->` / `<!-- change-log-end -->`. Name the two legacy
  pairs (`jira-sync-changelog-*`, `github-sync-changelog-*`) as superseded and migrated.

The **moment table** — copy the visual style of the Pipeline stages table at
`docs/reference/configuration.md:237`. This is the part task.43/44/45 implement against, so
be concrete about the Author cell and whether Version moves:

| Moment | Written by | Version | Example Description |
|---|---|---|---|
| Document created | `create-{prd,epic,story,task}` | `1.0` | `Initial draft` |
| Review verdict | `review-*` | bump minor | `Review passed (9/10) — ready for development` |
| Scope or AC edit | `edit-*`, `correct-course` | bump minor | `AC3 added — offline retry` |
| Tracker issue created | `sync-*` / `ensure-*` | — | `Jira story created (PROJ-42)` |
| Status transition | `review-*`, `develop`, `finalise` | — | `Status → in-progress` |
| Implementation complete | `develop` | — | `Implemented — 12 files, 34 tests` |
| QA verdict | `qa-story`, `qa-task` | — | `QA gate PASS (8/10)` |
| Accepted | `finalise` | bump minor | `DoD passed — accepted` |

Exclusions to state: bug reports use `## Status History` (link
`create-bug-report/assets/bug-report-template.md`); tracker cards never carry the log (link
`tracker-card-summary.md` and quote its reasoning).

Configuration table:

| Key | Type | Default | Effect |
|---|---|---|---|
| `change-log.enabled` | boolean | `true` | Master switch. `false` → `create-*` emits nothing and `review-*` checks nothing. |
| `change-log.enforcement` | `advisory` \| `blocking` \| `off` | `advisory` | How `review-*` grades a missing or stale log. |

### Phase 2: `shared/resources/change-log.js`

Start from `shared/resources/jira-sync.js:408-513` — copy it wholesale, then change what
follows. Keep the module CommonJS (`module.exports`), matching `jira-sync.js` and
`tracker-workflow.js`; `bundle_skill.py`'s `REQUIRE_RE` handles the rewrite.

**Port unchanged** — `bodyStart()` at `:457`. Its comment block explains a real defect
(a `description:` block scalar quoting `## Change Log` captured the insertion point and the
log was written into the YAML, still parsing, silently). Keep the comment; it is the reason
the function exists.

**Markers:**

```js
const CL_START = "<!-- change-log-start -->";
const CL_END = "<!-- change-log-end -->";

// Superseded pairs. Read and migrated in place; never written.
const LEGACY_MARKER_PAIRS = [
  { start: "<!-- jira-sync-changelog-start -->",   end: "<!-- jira-sync-changelog-end -->",   author: "sync-jira" },
  { start: "<!-- github-sync-changelog-start -->", end: "<!-- github-sync-changelog-end -->", author: "sync-github" },
];
```

**Heading regex** — capture the level so it can be preserved:

```js
// H2 or H3, optional section numbering ("### 1.5 Change Log"). The numbering
// tolerance mirrors `sectionRe` in jira-sync.js, which learned it after a task
// card published an empty body because "## 1. Overview" did not match "## Overview".
const RE_HEADING = /^(#{2,3})[ \t]+(?:\d+(?:\.\d+)*[.)]?[ \t]+)?Change Log[ \t]*$/m;
```

**Entry row** — must accept the legacy timestamp form so migration can read it:

```js
// Anchored on a leading YYYY-MM-DD date cell. Deliberately strict: an unrelated
// four-column body table must not be absorbed into the log.
const RE_ENTRY_ROW = /^\|\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?\s*\|/;
```

**Row formatting:**

```js
function fmtEntry({ date, version = "", description, author }) {
  return `| ${date} | ${version} | ${description} | ${author} |`;
}

function buildChangeLogBlock(entries, { level = 2 } = {}) {
  return (
    `${CL_START}\n${"#".repeat(level)} Change Log\n\n` +
    `| Date | Version | Description | Author |\n` +
    `|------|---------|-------------|--------|\n` +
    entries.join("\n") +
    `\n${CL_END}`
  );
}
```

**Finding the block** — marker first, then heading, both scoped past frontmatter:

```js
function findChangeLog(content) {
  // 1. current marker pair
  // 2. any LEGACY_MARKER_PAIRS entry  → { ..., legacyAuthor }
  // 3. RE_HEADING from bodyStart(content), extending to the next heading of the
  //    SAME OR SHALLOWER level (a `### Change Log` under `## Notes & Updates`
  //    ends at the next `###` or `##`, whichever comes first)
  // → { start, end, level, legacyAuthor } | null
}
```

That same-or-shallower rule is the fix for defect #2. The old
`findHandWrittenChangelog()` searched only `/^## /m` for the end, so an H3 log ran to the
next H2 and swallowed its sibling subsections.

**Legacy migration** — widen 2-column rows:

```js
function migrateLegacyEntries(rows, { legacyAuthor, docType } = {}) {
  // "| 2026-04-28 09:40 | Initial Jira story created |"
  //   → "| 2026-04-28 |  | Initial Jira story created | sync-jira-story |"
  // Date: drop the HH:MM. Version: blank. Author: `${legacyAuthor}-${docType}`
  // when docType is known, else legacyAuthor.
}
```

**Insertion anchors** — the doc-type table, replacing "before the first `##`":

```js
const ANCHORS = {
  story: /^## Dev Agent Record\b/m,
  task:  /^## Progress Tracking\b/m,
  epic:  /^## Notes & Updates\b/m,
};

function upsertChangeLog(content, entry, { docType } = {}) {
  const found = findChangeLog(content);
  if (found) { /* rewrite in place, preserving found.level, migrating legacy rows */ }
  // No existing log. Insert before ANCHORS[docType] if it matches, else append at EOF.
  // NEVER "before the first ##" — that is how a Change Log ended up above Epic Goal.
}
```

**`bumpUpdated`:**

```js
function bumpUpdated(content, date) {
  // Replace `updated: …` inside the frontmatter block only (use bodyStart to bound
  // the search). Leave `created` alone. No frontmatter → return content unchanged.
}
```

**Back-compat shim in `jira-sync.js`.** Replace lines 408-513 with a require and wrappers
that preserve the old signatures exactly — `upsertChangelog(content, newEntry)` where
`newEntry` is a preformatted 2-column row string:

```js
const CL = require("./change-log.js");

function upsertChangelog(content, newEntry) {
  // Old callers pass a formatted row. Parse it back into { date, description }
  // and delegate. Author is inferred from the calling sync script's issue type,
  // which is not available here — pass "sync-jira" and let task.45 supply the
  // precise name when it rewires the three scripts to call CL directly.
  return CL.upsertChangeLog(content, CL.parseLegacyRow(newEntry, "sync-jira"));
}
module.exports = { ...existing, upsertChangelog, buildChangelogBlock: CL.buildChangeLogBlock,
                   findHandWrittenChangelog: CL.findChangeLog, extractEntries: CL.extractEntries };
```

Verify the export list at `jira-sync.js:4045-4054` still names all four.

### Phase 3: `shared/resources/tests/change-log.test.mjs`

Follow the shape of `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`: a
header comment naming the defect class each block guards, then `node:test` cases. That file
is worth reading first — its comment at `:16-19` documents the frontmatter-capture bug whose
test you are porting.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const CL = require("../change-log.js");
```

The case that matters most — the live defect:

```js
test("an H3 Change Log under a parent heading is updated in place, not duplicated", () => {
  const doc = [
    "# [Epic 3] Runbook wrappers", "", "## Epic Goal", "", "Ship the wrappers.", "",
    "## Notes & Updates", "", "### Change Log", "",
    "| Date | Version | Description | Author |",
    "|------|---------|-------------|--------|",
    "| 2026-05-11 | 1.0 | Initial draft | create-epic |", "",
    "### Open Questions", "", "- [ ] Who owns the satellites?", "",
  ].join("\n");

  const out = CL.upsertChangeLog(doc,
    { date: "2026-08-12", description: "Review passed", author: "review-epic" },
    { docType: "epic" });

  assert.equal(out.match(/Change Log/g).length, 1, "must not add a second Change Log");
  assert.match(out, /^### Change Log$/m, "heading level must be preserved");
  assert.ok(out.indexOf("## Epic Goal") < out.indexOf("Change Log"),
    "must not be inserted above Epic Goal");
  assert.match(out, /^### Open Questions$/m, "sibling subsection must survive");
});
```

Remaining cases, one test each: numbered `### 1.5 Change Log` found; H2 preserved as H2;
each legacy pair migrated in place with rows widened and Author inferred; both legacy pairs
present collapse to one block; frontmatter block scalar quoting `## Change Log` is not the
insertion point (port from the fidelity test); each of the three anchors; unknown docType
appends at EOF; existing rows never reordered; `bumpUpdated` touches `updated` not `created`.

Then update `jira-sync-publishing-fidelity.test.mjs:172`:

```js
// was: const ROW = "| 2026-07-31 10:00 | Updated: description |";
const ROW = "| 2026-07-31 |  | Updated: description | sync-jira-story |";
```

### Phase 4: Standards and configuration

Each standards file gets a **link, not a restatement** — six independent copies of a format
is the problem being solved, and behaviour restated in several docs drifts silently.

- `docs/reference/configuration.md` — two rows in the key table at `:111`, then a
  `## Document change log` section modelled on `## Stakeholder sign-off` at `:160`.
- `docs/standards/story-documents.md` — a row in the Section-ownership table at `:79`:
  `| Change Log | Every skill that mutates the document | Append-only. Sits between Stakeholder Sign-off and Dev Agent Record. See [document-change-log.md](...) |`
- `docs/standards/task-documents.md:94` — add Change Log to the tail-section sentence, and
  state that it is unnumbered and the 11-section contract is unaffected. Mirror the wording
  the sign-off paragraph already uses two lines below.
- `docs/standards/epic-documents.md` — new `## Required body sections` between
  `## Frontmatter schema` (`:31`) and `## Status lifecycle` (`:69`), listing the epic
  template's H2s and naming Change Log.
- `docs/standards/prd-documents.md:65,78` — name Change Log in both lists, noting it is
  nested under §1 rather than top-level.
- `docs/standards/bug-documents.md:70` — one sentence: bug reports carry `## Status History`,
  not a Change Log, and it is the equivalent.
- `AGENTS.md` — a `## Document Change Log` block in the style of `## Status Lifecycle`.

### Phase 5: Bundle

```bash
npm run bundle
npm test
npm run bundle && git diff --stat   # must be empty
```

Nothing links the two new shared files yet, so the first bundle may be a no-op — that is
expected. Task.43 onward adds the links and the bundle then distributes them.

## Key Patterns and References

- **`shared/resources/sign-off.md`** — the spec template to copy, structurally.
- **`shared/resources/tracker-card-summary.md`** — the most recent instance of this pattern
  (commit `37bcf3f`), including how it handles per-doc-type variation in one document.
- **`shared/resources/tracker-workflow.js`** — a pure, tracker-agnostic engine with its own
  test file; the closest structural sibling to `change-log.js`.
- **`jira-sync.js:772` `extractBodySections`** — how optional heading numbering is already
  tolerated elsewhere; reuse the idea, not the code.
- **`skills/create-skill/scripts/bundle_skill.py`** — `REQUIRE_RE` and `SHARED_REF_RE`
  determine what gets bundled; a `require("./change-log.js")` from `jira-sync.js` is a
  shared→shared reference and is followed transitively.

## Testing Approach

Run in this order — each stage catches a different failure:

```bash
node --test shared/resources/tests/change-log.test.mjs     # the new engine
node --test shared/resources/tests/jira-sync-*.test.mjs    # extraction was lossless
npm test                                                    # nothing else regressed
npm run bundle && git diff --stat                           # idempotent
```

The extraction is behaviour-preserving if and only if the three `jira-sync-*` suites pass
with exactly one edited line (the `ROW` fixture). Any other change needed there means a
signature drifted and the wrappers are wrong.
