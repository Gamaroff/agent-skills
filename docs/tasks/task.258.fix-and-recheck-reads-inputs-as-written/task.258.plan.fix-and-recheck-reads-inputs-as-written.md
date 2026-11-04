---
id: task.258.plan
title: "Implementation Plan: finalise fix-and-recheck reads test names, scope entries and run logs as written"
type: plan
task-ref: task.258.fix-and-recheck-reads-inputs-as-written.md
---

# Implementation Plan: finalise fix-and-recheck reads test names, scope entries and run logs as written

> Requirements and success criteria: [task.258.fix-and-recheck-reads-inputs-as-written.md](task.258.fix-and-recheck-reads-inputs-as-written.md)

## Overview

Four small edits to `shared/resources/finalise-fix-and-recheck.mjs`, each written test-first against a defect reproduced on the unchanged tree. Edit only `shared/resources/`; `npm run bundle` refreshes the `skills/finalise/references/` copy.

## Phase-by-Phase Implementation Guide

### Phase 1: Test-file recognition (CR2-1)

**Files to modify:**
- `shared/resources/finalise-fix-and-recheck.mjs` — the `TEST_FILE_SHAPE` constant (`/\.(?:test|spec)\.(?!md$)[A-Za-z0-9]+$/`) and its one use, `if (TEST_FILE_SHAPE.test(m.test.trim()))` in the `"mutation-proved"` check.

**Reproduce first** (must print `PROVED` four times on the unchanged tree). Write one-line run files `✖ <name> (1ms)` and call `evaluateFixAndRecheck` with a finding whose `mutationProof.test` is the name.

**Replacement** (a shape, not final text):

```js
const TEST_EXT = "[a-z0-9]+";
const TEST_DIRS = new Set(["test", "tests", "__tests__"]);

/** A single token that names a test FILE, in any letter case. A title has spaces. */
function isTestFileName(name) {
  if (/\s/.test(name) || /\.md$/i.test(name)) return false;
  const segs = name.split("/");
  const base = segs[segs.length - 1].toLowerCase();
  if (new RegExp(`\\.(?:test|spec)\\.${TEST_EXT}$`).test(base)) return true;
  if (new RegExp(`_test\\.${TEST_EXT}$`).test(base)) return true;
  if (new RegExp(`^test_.+\\.${TEST_EXT}$`).test(base)) return true;
  const hasExt = new RegExp(`\\.${TEST_EXT}$`).test(base);
  return hasExt && segs.slice(0, -1).some((s) => TEST_DIRS.has(s.toLowerCase()));
}
```

Keep the existing message `... a test file — name the test by its title` (an existing test pins it).

### Phase 2: Scope entries (CR2-2)

**Files to modify:** the same module — `pathInScope` (`filesSummary.includes(p)`) and `entryPatterns` (`expandBraces(entry.trim())`).

**Reproduce first:** `pathInScope("src/a.js", ["./src/a.js"])` prints `false`.

```js
/** An entry as an author writes it, brought to the canonical repo-relative form. */
function normaliseEntry(entry) {
  if (typeof entry !== "string") return entry;
  let e = entry.trim();
  const tick = /^`([^`]*)`$/.exec(e);
  if (tick) e = tick[1].trim();
  while (e.startsWith("./")) e = e.slice(2);
  if (e.startsWith("/")) e = e.slice(1);
  return e;
}
```

In `pathInScope`, admit the candidate when it equals the raw or the normalised entry, and build patterns from `normaliseEntry(entry)`. The candidate guard (`isPlainRelativePath`) is untouched, so a leading-`/` candidate is still refused.

### Phase 3: CRLF and the `:<digit>` boundary (CR2-3, CR2-4)

**Files to modify:** `analyseRun` (`for (const line of text.split("\n"))`) and `subjectNames` (`const pathy = test.includes("/") || /\.md$/.test(test);`).

```js
for (const line of text.split(/\r?\n/)) { ... }
const pathy = /\.md$/.test(test);
```

**Reproduce first:** a log `not ok 1 - crlf title\r\n` is refused; `✖ GET /v1:5 stuff` proves `GET /v1`.

### Phase 4: Bundle, CHANGELOG and prose

Run `npm run bundle` then `npm run bundle:check`. Add the CHANGELOG entry (cite `task 258`). Reword the Step 8a sentence in `skills/finalise/SKILL.md` ("the evaluator refuses a file-shaped value") to name the shapes.

## Key Patterns and References

- The module already exports `pathInScope`; the probe engine reaches it, so a scope change should keep it pure and exported.
- `realRun(name, titles, reporter)` in the test file produces a log from a real `node --test` run. Use it for the CRLF test by converting the written log's line ends, so the fixture is a real runner's output and not a hand-made line.
- `shared/resources/mutation-proving.md` is the rule for the mutation table.

## Testing Approach

One test per defect, written first and shown red; the controls listed in the task's § 8; then the four mutations, each reverted with a snapshot restore and confirmed green. Run with `CI=true`.
