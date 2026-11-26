---
id: task.330.plan
title: "Implementation Plan: isDocsPath refuses the NTFS .git stream and C1 controls"
type: plan
task-ref: task.330.docs-path-stream-and-c1-refusals.md
---

# Implementation Plan: isDocsPath refuses the NTFS .git stream and C1 controls

> Requirements and success criteria: [task.330.docs-path-stream-and-c1-refusals.md](task.330.docs-path-stream-and-c1-refusals.md)

## Overview

Two one-line changes in `shared/resources/ci-tree-equivalence.js`, proved through the `git-name`
corpus and its mutation test, then four wording fixes. Tests first: every new case is red before the
code changes.

## Phase-by-Phase Implementation Guide

### Phase 1: The predicate and its corpus

**Failing cases first.**

- `shared/resources/security-input-corpus.mjs`, in the `git-name` list (beside `id: "control-char"`):
  - hostile `dot-git-stream`, input `docs/.git::$INDEX_ALLOCATION/x.md`;
  - hostile `dot-git-stream-name`, input `docs/.git:x/y.md`;
  - hostile `c1-control`, input `"docs/a\u0085.md"`;
  - legitimate `colon-name`, input `docs/a:b.md`.

  Give each a `why` and a `correct` in the house style. A `why` says what git does, not what this code
  does: git refuses `.git:` because NTFS reads the stream as the directory, and a C1 control is a
  control character. Then regenerate the tables in `security-input-corpus.md` with the command that
  file gives (`renderCorpusTables()`), and raise the floor in `security-input-corpus.test.mjs:63` to
  `{ hostile: 17, legitimate: 9 }`.
- `shared/resources/tests/ci-tree-equivalence.test.mjs`: one `task.330:` test over the § 3 "Tried"
  table, and one `readConfig`/`parseConfig` case. `ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n      - "!docs/a\u0085.md"\n`
  must throw a `UsageError` naming `ci.docsOnly.patterns`. Build the U+0085 with `String.fromCharCode(0x85)`,
  never a literal, so the file stays printable.

Run them and confirm red: the hostile corpus cases reproduce, and the probe test's "HEAD must hold"
step fails.

**The code.** In `isDotGitSegment` (`:135`):

```js
const folded = seg
  .replace(DOTGIT_IGNORABLE, "")
  .replace(/:.*$/s, "")      // NTFS: `.git:<stream>` is the .git directory (task.330)
  .replace(/[. ]+$/, "")
  .toLowerCase();
```

Strip the stream before the trailing dots and spaces, so `.git. :x` folds to `.git`. In
`hasPathFormDefect` (`:182`):

```js
if (/\p{Cc}/u.test(p)) return true; // control characters, C0, DEL and C1: never documentation
```

Update the bullet in the `isDocsPath` comment block that says "U+0000–U+001F, U+007F", and the one on
`.git` spellings, which should now name the stream form.

**The anchors.** In `security-probe.test.mjs:4666–4684`, rewrite `IS_DOCS_LINES` so each refusal lists
the one spelling that exists. Task 325 merged `hasPathFormDefect`, so the inline `file` spellings of
`control`, `segment` and `normalise` are dead. Rewrite the comment to say so (T329-QA-10). The
`control` anchor becomes the new line verbatim. Add the mutation rows to `GIT_NAME_MUTATIONS`:

- `control` reproduces `c1-control` too;
- `dotGit` reproduces `dot-git-stream` and `dot-git-stream-name` too.

The test already demands that every hostile id is reached by some row.

The fold-every-segment mutation (§ 8) is not a removed line. Run it by hand for the QA record. Apply
the `:` strip to every segment in `isDocsPath`, outside `isDotGitSegment`, and the `colon-name`
legitimate case goes red.

### Phase 2: Corpus and test claims

- `plus-signs` (`security-input-corpus.mjs:805`). Its `why` names two failure modes. Only the first
  ("treats the name as a pattern") is reached with `**`. Make the second true with a unit case in
  `ci-tree-equivalence.test.mjs`. `isDocsPath("docs/c++.md", ["docs/c++.md"])` is `true` and
  `isDocsPath("docs/cc.md", ["docs/c++.md"])` is `false`, both measured at `ba0882a1f`. Cite that test
  from the `why`. Do not drop the clause: a glob compiled without escaping is exactly the defect a
  rewrite of `glob-match.js` could bring in.
- `control-char` `correct`: "Refuse every control character: C0 (below U+0020), U+007F, and C1
  (U+0080–U+009F)."

### Phase 3: Wording and records

- The bracket message (`ci-tree-equivalence.js:823`). After "or use * or ?", add that a literal `[`
  or `]` in a file name is written `?` (`!docs/blog/?slug?.md` excludes `docs/blog/[slug].md`).
  Assert the new sentence in the existing task 325 refusal test, by behaviour: the thrown message
  contains it.
- `docs/runbooks/ci-docs-only-skip.md:205` and `CHANGELOG.md:31`: replace "extglob" with "`@(`, `!(`
  or `+(`", as `docs/reference/configuration.md:308` does. Add the `?` advice.
- A new `[Unreleased]` entry citing `(task 330)` names both changes of § 5.
- `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- `UNPRINTABLE` (`ci-tree-equivalence.js:109`) is the engine's existing control class. Use `\p{Cc}`
  from it, not a second hand-written range.
- Task 329's `GIT_NAME_MUTATIONS` pattern: one row per refusal line, the hostile ids that line alone
  stops.
- Task 325's refusal tests in `ci-tree-equivalence.test.mjs` are the model for the usage-error case.

## Testing Approach

The four suites of § 8, then `npm run test:remote` on the LAN server. Record each § 8 mutation in the
QA report with the test it turned red.
