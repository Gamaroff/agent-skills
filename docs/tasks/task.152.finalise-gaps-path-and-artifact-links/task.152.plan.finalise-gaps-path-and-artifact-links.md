---
id: task.152.plan
title: "Implementation Plan: finalise — bug-mode gaps path and co-located artifacts in 8a and the link guard"
type: plan
task-ref: task.152.finalise-gaps-path-and-artifact-links.md
---

# Implementation Plan: finalise — bug-mode gaps path and co-located artifacts

> Requirements and success criteria: [task.152.finalise-gaps-path-and-artifact-links.md](task.152.finalise-gaps-path-and-artifact-links.md)

## Overview

Part A extends `--bug` mode to cover Step 8. It adds one shared fill helper, five skip-table rows and
their markers, a bug branch in 8.5, and gives the `status-history.js` CLI the `reason` contract its
sibling tools already have. Part B widens three things from "the document" to "the document and the
artifacts filed next to it": the evaluator's scope rule, the 8a clause, and the corpus guard. It also
makes the three skills that write reports check each report as they write it. Edit only the
`shared/resources/` sources and `SKILL.md` files. `npm run bundle` regenerates every `references/`
copy.

## Phase-by-Phase Implementation Guide

### Phase 1: `shared/resources/fill-verification-complete.sh`

Lift the body of 7.1's fill block (`skills/finalise/SKILL.md`, the block under *`**Bug mode
(\`verification-complete\`):** run`*) into a script, and make the verdict an argument:

```bash
#!/usr/bin/env bash
# usage: fill-verification-complete.sh <DOD_PATH> <accepted|gaps>
# Fills the bug DoD template's `## Verification Complete` block IN PLACE — never appends.
# One definition, called from finalise 7.1 (accepted) and 8.1 (gaps). task.152, obs #148.
DOD_PATH="${1:-}"; VERDICT="${2:-}"
case "$DOD_PATH$VERDICT" in ''|*'{'*) echo "HALT: DOD_PATH and VERDICT must be bound"; exit 1 ;; esac
case "$VERDICT" in
  accepted) LINE='✅ ACCEPTED'; OTHER='❌ GAPS IDENTIFIED - NOT ACCEPTED' ;;
  gaps)     LINE='❌ GAPS IDENTIFIED - NOT ACCEPTED'; OTHER='✅ ACCEPTED' ;;
  *) echo "HALT: VERDICT must be accepted or gaps, got '$VERDICT'"; exit 1 ;;
esac
[ -r "$DOD_PATH" ] || { echo "HALT: $DOD_PATH is not readable; Step 0 creates it from the template"; exit 1; }
# A decided file is not re-decided — a re-run writes dod.{N+1} (Step 0).
grep -qF "**Final Status:** $OTHER" "$DOD_PATH" && { echo "HALT: $DOD_PATH already reads $OTHER"; exit 1; }
TMP=$(mktemp) && sed -E \
  -e "s/^\*\*Final Status:\*\* \{.*\}$/**Final Status:** $LINE/" \
  -e "s/^\*\*Completion Time:\*\* \{YYYY-MM-DDTHH:MMZ\}$/**Completion Time:** $(date -u +%Y-%m-%dT%H:%MZ)/" \
  "$DOD_PATH" > "$TMP" && mv "$TMP" "$DOD_PATH"
[ "$(grep -c '^## Verification Complete$' "$DOD_PATH")" = 1 ] && [ "$(grep -c '^\*\*Final Status:\*\*' "$DOD_PATH")" = 1 ] \
  || { echo "HALT: $DOD_PATH must carry exactly one ## Verification Complete heading and one **Final Status:** line"; exit 1; }
grep -qxF "**Final Status:** $LINE" "$DOD_PATH" \
  || { echo "HALT: the Final Status placeholder in $DOD_PATH was not filled (is the template's line intact?)"; exit 1; }
```

Both `LINE` values contain characters that `sed` treats as special. The `|` inside the template's
placeholder is escaped by the `\{.*\}` match, and neither `LINE` contains `/` or `&`. Confirm this
with the executed test rather than by reading the script. Keep the diagnostics that 7.1 prints
today, **verbatim**. The existing test *`7.1 fill block refuses unbound inputs and a doubled
file`* matches `exactly one ## Verification Complete heading and one \*\*Final Status:\*\* line`.

7.1's block keeps its `DOC_KIND` / `DOD_PATH` binding and its placeholder guard. Its body becomes:

```bash
if [ "$DOC_KIND" = "bug" ]; then
  bash .agents/skills/finalise/references/fill-verification-complete.sh "$DOD_PATH" accepted || exit 1
fi
```

**Test** (`evals/shared/tests/finalise-bug-mode.test.mjs`):

- The `CONSUMER_ROOT` fixture (`:54–58`) symlinks `.agents/skills` to the repo's `skills/`. The
  helper therefore resolves from the fixture as soon as `npm run bundle` has copied it into
  `skills/finalise/references/`, and the fixture needs no change. Run the bundle before the test,
  or it fails with a missing-file HALT, which is the correct failure.
- Add a test beside the three 7.1 tests at `:1345–1415`: `[shell] the fill helper writes GAPS on the
  template, is idempotent, and refuses to overwrite ACCEPTED`.
- Add a one-definition test modelled on `:1442`. Assert that SKILL.md contains no inline
  `s/^\*\*Final Status` sed, that it calls the helper from 7.1 and from 8.1, and that the bundled
  copy equals the source.

### Phase 2: Step 8 rows, markers, 8.5

**Table**: add the five rows (task § 3) after `tracker-done`, so every Step 8 row follows every
Step 7 row. The bug-column verbs are:

- `gaps-verification-complete`: run
- `gaps-change-log-row`: **skip**
- `gaps-status-history-row`: run
- `gaps-body-section`: **skip**
- `gaps-pr-comment`: run

**Markers**, each placed directly under the item it governs:

- 8.1, after the example block:

  **Bug mode (`gaps-verification-complete`):** run — **fill**, never append, via
  `fill-verification-complete.sh "$DOD_PATH" gaps`. Write each gap as a `- [ ] {gap}` line under
  `## Step 5: Acceptance Decision` → `**Outcome:**`, replacing that placeholder. 8.5 counts these
  lines.

- 8.3:

  **Bug mode (`gaps-change-log-row`):** skip — **forbidden**, for the same reason as
  `change-log-row` in 7.3.

  **Bug mode (`gaps-status-history-row`):** run —

  ```bash
  node references/status-history.js --file "$DOC_FILE" --json \
    --date "$(date -u +%Y-%m-%d)" --status "{the bug's current status, unchanged}" \
    --changed-by finalise --notes "DoD incomplete — {N} gap(s) — {bug-prefix}.dod.{N}.{name}.md"
  ```

  Read the `reason` from the JSON. `usage` is a HALT.

- 8.4:

  **Bug mode (`gaps-body-section`):** skip — the gap report is the DoD file's Step 5 section, and a
  `## Definition of Done - Gaps Identified` section in the bug report would be a second verdict.

- 8.5:

  **Bug mode (`gaps-pr-comment`):** run — the block below reads the gap body from the DoD file when
  `DOC_KIND=bug`.

**8.5 block change** (`SKILL.md:2275` region). Bind `DOC_KIND` and `DOD_PATH` in the block, refuse
placeholders exactly as 7.6a/7.6b do, then branch:

```bash
if [ "$DOC_KIND" = "bug" ]; then
  GAP_REPORT_BODY=$(awk '/^## Step 5: Acceptance Decision/{f=1;next} /^## /{f=0} f' "$DOD_PATH")
else
  GAP_REPORT_BODY=$(awk '/^## Definition of Done - Gaps Identified/{f=1;next} /^## /{f=0} f' "$DOC_FILE")
fi
```

Leave the `GAP_COUNT` line and the empty-body post-condition unchanged. The test extracts this
block the same way `fillBlock()` extracts 7.1's, by needle and fence end. Then:

- Bug mode, on a DoD fixture filled with `gaps` whose Outcome has 2 `- [ ]` lines: exit 0,
  `GAP_COUNT=2`, and the body contains the Outcome.
- Task mode, on a document with the body section: unchanged behaviour.
- Bug mode with the branch removed: `gap report body is empty — not posting`. This is the mutation
  proof.

Stub `stakeholder-summary-cli.js` in the fixture's `references/` if the extracted block calls it.
Alternatively, cut the extraction before the `LEAD=` line and assert on `GAP_REPORT_BODY` and
`GAP_COUNT` directly.

**`EXPECTED_VERBS`** (`:142`): add the five keys. No other change to the parity tests.

**Step 8 Completion Checklist** (`SKILL.md:2484`): change the line to
`- [ ] Gap report section added to story/task document body (bug mode: the DoD file's Step 5 Outcome instead — no body section)`.
Do not add a `**Bug mode (` marker here.

### Phase 3: `status-history.js`

Rewrite `main()` along the lines of `doc-links.js`'s `main()` / `usage()` (`doc-links.js:287`):

```js
const LIFECYCLE_TITLE = Object.freeze({
  new: "New", "in-progress": "In Progress", "ready-for-qa": "Ready for QA",
  closed: "Closed", reopened: "Reopened",
});
function normaliseStatus(s) {
  const k = String(s == null ? "" : s).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LIFECYCLE_TITLE, k) ? LIFECYCLE_TITLE[k] : s;
}
```

- `--json` is a boolean flag. On success, print
  `JSON.stringify({ reason, exitCode: 0, file: opts.file, status: written })`.
- The usage cases are: missing `--file`, an unknown flag, a value flag with a missing or
  flag-shaped operand, and an unreadable file. Each returns 2, printing
  `{reason:"usage",exitCode:2,error}` under `--json` and the current text otherwise.
- Apply `normaliseStatus(opts.status)` before calling `upsertStatusHistory`.
- Export `normaliseStatus` in the `module.exports` block.
- Keep `process.exitCode = main(process.argv)`. The guard against `process.exit(` stays green.

**Test** `shared/resources/tests/status-history-cli.test.mjs`:

- Spawn the CLI on a temp bug file seeded from `skills/create-bug-report/assets/bug-report-template.md`.
- Assert `updated`, then `unchanged` when the same row is written again. If the engine appends
  duplicates, assert what it actually does, and state that.
- Assert exit 2 and `reason:"usage"` for `--bogus`.
- Assert each of the five tokens lands in Title Case in the written row.
- Assert `Blocked` passes through unchanged.

### Phase 4: evaluator

In `shared/resources/finalise-fix-and-recheck.mjs`:

```js
export const isCoLocatedArtifact = (documentPath, p) => {
  if (!isWorkItemDocument(documentPath) || typeof p !== "string") return false;
  if (p.includes("..") || p.includes("\0") || !p.endsWith(".md")) return false;
  const dir = documentPath.slice(0, documentPath.lastIndexOf("/") + 1);
  if (!p.startsWith(dir) || p.slice(dir.length).includes("/")) return false;
  const base = p.slice(dir.length);
  const id = documentPath.slice(dir.length)
    .match(/^(task\.\d+|story\.\d+\.\d+|epic\.\d+|bug\.\d+)\./)[1];
  return base.startsWith(`${id}.`) &&
    WORK_ITEM_ARTIFACT_RE.test(base) && !/\.bug\./.test(base);
};
```

In `inside-files-summary`, extend `inScope` with
`(isList(f.artifactPaths) && f.artifactPaths.includes(p) && isCoLocatedArtifact(f.documentPath, p))`.

Two edge cases to check:

- A story document's id is `story.E.S`, and its artifacts carry `story.E.S.qa.N…`. The prefix test
  handles that.
- A bug document `task.67.bug.3.x.md` has the id `task.67`, which is wrong. The regex must prefer
  the longest match. Either extract the id with
  `/^((?:task\.\d+|story\.\d+\.\d+)(?:\.bug\.\d+)?|epic\.\d+|bug\.\d+)\./`, or declare bug documents
  out of scope for `artifactPaths`, since 8a in bug mode is out of scope. Pick one, and add a test
  either way.

Update the `inside-files-summary` entry in `finalise-fix-and-recheck-preconditions.json`: add
"or a co-located `.md` pipeline artifact of that document, named in `artifactPaths`" to the
statement, and set `input` to `touched, filesSummary, documentPath, artifactPaths`. Extend the
header comment in the `.mjs` with the new key.

**Tests** (`shared/resources/tests/finalise-fix-and-recheck.test.mjs`, beside `:141`, *`inside-files-summary:
the work item's own document is in scope`*): one admission test and seven refusal tests, one for
each condition. Each refusal test turns red when its condition is deleted from the predicate, which
is the mutation proof.

### Phase 5: 8a prose and the artifact corpus guard

**8a clause** (`SKILL.md:2345–2383`):

- In the paragraph that closes *When this step applies*, replace "on the work item's own document"
  with "on the work item's own document or a co-located `.md` pipeline artifact (its QA report,
  DoD, implementation report, review or PR review)".
- In bullet 2, change "reproduces the red on the work-item document, and nowhere else in the diff"
  to "…on the work-item document and/or its co-located artifacts, and on nothing else in the diff".
- In bullet 3, `touched` becomes exactly the reproduced files. Artifacts go in `artifactPaths`.
- In bullet 4, list the pre-fix engine runs of each reproduced file in turn in `mutationProof.run`.
  `mutationProof.test` names the first reproduced file.
- In the JSON record template (step 1), add
  `"artifactPaths": [{co-located artifacts the red is on — only for the docs-link clause; omit otherwise}]`.
- CI-table row `SKILL.md:857`: "reproduced by `doc-links.js` on the work item's own document or its
  co-located artifacts and nowhere else".

**Artifact corpus guard** (`shared/resources/tests/doc-links.test.mjs`, after the document test):

```js
function artifactDocs() {
  return execFileSync("git", ["ls-files", "-z", "--", "docs/tasks", "docs/prd", "docs/development"],
    { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\0").filter((f) => f && WORK_ITEM_RE.test(f) && ARTIFACT_RE.test(f));
}
const KNOWN_ARTIFACT_LINKS = new Set([/* seeded from the first red run, file → target */]);
const KNOWN_ARTIFACT_FENCES = new Set([/* file paths */]);
```

Start with empty sets. Run the test and copy the `newDead` and fence lists it prints into the sets,
with a comment saying these are consumer-layout links from before the guard existed, pinned by
`file → target` and to be deleted with their fix. Floors: `docs.length >= 1000`, `links >= 1000`.
The fence assertion compares against `KNOWN_ARTIFACT_FENCES` and needs its own healed check, so
that a closed fence must be unpinned.

The measurement in task § 3 came from this read-only scan. It uses the test's regexes with
`ARTIFACT_RE` kept rather than excluded. Run it from the repo root:

```bash
command node -e '
const { execFileSync } = require("child_process");
const { checkDocument, repoRoot, trackedSet } = require("./shared/resources/doc-links.js");
const W = /(^|\/)(task\.\d+|story\.\d+\.\d+|epic\.\d+)\.[^/]+\.md$/;
const A = /\.(qa|gate|bug|implementation|review|dod|plan|handover|pr-review|risk|test-design|sprint-review-summary)\./;
const fs = execFileSync("git", ["ls-files","-z","--","docs/tasks","docs/prd","docs/development"], {encoding:"utf8"})
  .split("\0").filter(f => f && W.test(f) && A.test(f));
const t = trackedSet("."), r = repoRoot(".");
let links = 0, dead = [], fences = [];
for (const f of fs) { const x = checkDocument(f, {root: ".", tracked: t, repo: r});
  links += x.links; x.broken.forEach(b => dead.push(f + " → " + b.target));
  if (x.unterminatedFence) fences.push(f); }
console.log({ artifacts: fs.length, links, dead: dead.length, fences });'
```

On 2026-09-24 it printed 1,182 artifacts, 1,461 links, 11 dead and 2 fences. These are
orientation figures only. The test records the real list.

### Phase 6: writer-site checks

Add the same block at each site, adjusting only the skill name and the report path:

````markdown
**Check the report's links before leaving this step.** CI's `docs-link-check` reads every changed
`docs/**/*.md` — a QA report as much as the document beside it — and a quoted finding that
contains a bracket-paren shape renders as a live link (task.139 run 2, obs #155). The engine
resolves against the git index, so stage first:

```bash
git add "{report path}" {every sibling it links to that this run wrote, e.g. the gate file}
node .agents/skills/qa-task/references/doc-links.js --file "{report path}"
```

Exit 1 → fix the quotation (put it in a fence, or break the `[..](..)` shape) and re-run until it
exits 0. Exit 2 is a usage error: fix the call.
````

The sites are:

- `skills/qa-task/SKILL.md` § *Step 11: Write QA Report*: after the template, before
  `### Step 12`.
- `skills/qa-story/SKILL.md` § *Output 1: QA Report File*: after the report template.
- `skills/review-pr/SKILL.md` § *Step 7 — Write the review report*: after the template and inside
  the "work item resolved" branch. With no work item, no file is written, so there is nothing to
  check.

**Population test** (`doc-links.test.mjs`):

- Define `const WRITER_SITES = [["skills/qa-task/SKILL.md", "### Step 11: Write QA Report"], ["skills/qa-story/SKILL.md", "#### Output 1: QA Report File"], ["skills/review-pr/SKILL.md", "### Step 7 — Write the review report"]]`.
- Extract each section from its heading to the next heading at the same or a higher level, skipping
  fences for heading detection only.
- Assert that the section contains `references/doc-links.js --file` and `git add`.
- Floor: 3 sections found.
- Add a second assertion that each skill's bundled `references/doc-links.js` exists after
  `npm run bundle`.

Run `npm run bundle`, then `npm run bundle:check`. The bundler will copy `doc-links.js` into three
skills. If `UNREACHED` appears, the citation is not in a form the discovery rule reaches. See
`skills/create-skill/SKILL.md` § *A bundled copy nothing reaches is `UNREACHED`*.

## Key Patterns and References

- `shared/resources/newest-numbered.sh` and its one-definition test: the model for Phase 1.
- `doc-links.js` `usage()` / `main()`: the model for Phase 3's `--json` / exit-2 contract.
- The existing corpus test's `KNOWN` + `healed` assertion: the ratchet shape to copy in Phase 5.
- The `fillBlock()` extractor: the model for extracting 8.5's block in Phase 2.
- Memory rules that apply:
  - Use `command node`, never bare `node`.
  - Mutation-prove every fix.
  - Patch files with split/join, not `String.replace` (`$'` in replacement text).
  - Move the gitignored `.agents/skills` symlink aside before trusting a local green.
  - Always edit `shared/resources/`, never `references/`.

## Testing Approach

The target files are:

- `evals/shared/tests/finalise-bug-mode.test.mjs`
- `shared/resources/tests/status-history-cli.test.mjs` (new)
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs`
- `shared/resources/tests/doc-links.test.mjs`

All four are inside `package.json`'s `test` globs. For each fix, revert the behaviour, run the named
test to a file, confirm it goes red, restore it, and record the red run in the implementation report.
The executed shell tests run in both shells in `SHELLS` (`finalise-bug-mode.test.mjs:338`).
