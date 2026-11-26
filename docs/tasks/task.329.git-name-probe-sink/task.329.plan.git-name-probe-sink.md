---
id: task.329.plan
title: "Implementation Plan: A git-name sink for classifiers of repository names"
type: plan
task-ref: task.329.git-name-probe-sink.md
---

# Implementation Plan: A git-name sink for classifiers of repository names

> Requirements and success criteria: [task.329.git-name-probe-sink.md](task.329.git-name-probe-sink.md)

## Overview

Add one corpus sink in the shape of the existing seven, name it wherever a sink is chosen, and prove its
hostile cases bite with a test that probes broken copies of `isDocsPath`.

## Phase-by-Phase Implementation Guide

### Phase 1: The sink

**`shared/resources/tests/security-input-corpus.test.mjs`**, first. Add to `FLOORS` (`:56`):

```js
  // task.329: the names isDocsPath refuses, each caught by a broken copy, and
  // the literal names a filesystem-minded check would wrongly refuse.
  "git-name": { hostile: 14, legitimate: 8 },
```

Run it. It must fail, because `corpusFor("git-name")` throws.

In the same file, add a test that pins `corpusFor("path")` as it stands: the eleven ids in order with
their directions. This holds the criterion that `path` is unchanged.

**`shared/resources/security-input-corpus.mjs`.**

- `SINKS` (`:29`): insert `"git-name"` directly after `"path"`. The `.md` peer and the rendered tables
  follow `SINKS` order.
- After `const PATH` (ends near `:666`), add a section header comment in the same shape, then
  `const GIT_NAME = sinkCases("git-name", [ ... ])`. Ids and inputs:

| id | direction | input |
| :-- | :-- | :-- |
| `dot-git-root` | hostile | `.git/config` |
| `dot-git-bare` | hostile | `.git` |
| `dot-git-nested` | hostile | `docs/.git/x.md` |
| `dot-git-case` | hostile | `docs/.GIT/x.md` |
| `dot-dot-segment` | hostile | `docs/../x.md` |
| `leading-slash` | hostile | `/docs/a.md` |
| `dot-slash` | hostile | `./docs/a.md` |
| `empty-segment` | hostile | `docs//a.md` |
| `trailing-slash` | hostile | `docs/guides/` (not `docs/`: that literal is in the DoD prompt, and `finalise-dod-prompt-contract.test.mjs` refuses a corpus input the prompt restates) |
| `control-char` | hostile | `docs/a\u0001.md` |
| `tab` | hostile | `docs/a\tb.md` |
| `nul` | hostile | `docs/a\u0000.md` |
| `config-root` | hostile | `skills-config.yaml` |
| `config-nested` | hostile | `docs/skills-config.yaml` |
| `encoded-slash-literal` | legitimate | `docs/a%2fb.md` |
| `encoded-traversal-literal` | legitimate | `..%2f..%2fetc%2fpasswd` |
| `symlink-shaped-name` | legitimate | `uploads/link-to-etc/passwd` |
| `space-and-parens` | legitimate | `docs/notes (draft).md` |
| `plus-signs` | legitimate | `docs/c++.md` |
| `non-ascii` | legitimate | `docs/café.md` |
| `dotfile` | legitimate | `docs/.gitkeep` |
| `dots-in-name` | legitimate | `docs/archive..2026.md` |

  Each `why` names what git prints and what a wrong check does. Each `correct` says "refuse: never in a
  permissive class" or "accept: the name is literal". Points to carry:
  - `encoded-*`: git does not decode, so `%2f` is three characters. Decoding before classifying invents a
    traversal the repository does not contain. This is the direction flip from `path.encoded-traversal`.
  - `symlink-shaped-name`: a name classifier never opens the file. Whether `link-to-etc` is a symlink in
    the worktree decides nothing here.
  - `dot-git-case`: on a case-insensitive filesystem `.GIT` is the repository's directory.
  - `config-*`: this repository's pipeline config. A change to it changes pipeline behaviour, so it is
    never documentation.
  - `dotfile`: only a spelling of `.git`, in any case, is internal. A `.git` prefix is not.
- `CORPUS` (`:1081`): add `"git-name": GIT_NAME,` after `path`.
- `SINK_BLURB` (`:1174`): add after `path`:

  > A classifier deciding **which class a repository-relative name belongs to**, such as documentation,
  > generated output or config, from the name git prints, without opening the file. Choose it over
  > `path` when the name is only compared against patterns. The hostile cases are names no class may
  > admit. The legitimate cases are literal names that a filesystem-minded check would refuse. Probe
  > with the classifier's widest patterns, e.g. `ci-tree-equivalence.js#isDocsPath` with `[["**"]]`, so
  > a refusal is the classifier's own and not a pattern miss.

**`shared/resources/security-input-corpus.md`.** Regenerate `## The cases` with the command in the
module's comment (`renderCorpusTables`). Then replace the whole `## The cases` body with the output
using the Write tool, never a shell redirect into the tracked file. Change `:387` "The six sinks" to
"The eight sinks".

### Phase 2: The routing

- **`finalise-dod-security-prompt.md:159`**: add `` `git-name` `` after `` `path` `` in `Sinks:`. In
  the "pick by" list, after "what location is read or written", add "which class a repository name
  belongs to". Add a row to *Entries disqualified from `internal`* (`:95`):
  `| \`ci-tree-equivalence.js#isDocsPath\` | \`git-name\` |`. Do not touch the `lintReport` row: the
  test at `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:772` reads it.
- **`security-review-prompt.md:79`**: add `` `git-name` `` to the `SINKS` sentence. Add this row after
  `path` in the table:
  `| which class a repository-relative name belongs to (docs, config, generated), compared against patterns and never opened | \`git-name\` |`.
  Then add one sentence under the table: a name passed to a filesystem call is `path`, and a name only
  compared is `git-name`.
- **`probe-boundary-rule.md`**: after the `boundary: internal` section's "A sink disqualifies it for
  the shape it models" sentence (`:200`), add: `git-name` models git-form names, so a classifier of
  `git diff --name-only` output is probed there, not under `path`, whose decoding and symlink cases
  describe a filesystem call it never makes (task.325.dod.1).

### Phase 3: The proof and records

**`shared/resources/tests/security-probe.test.mjs`**: a new block after the task.131 block (`:4525`).
Copy its shape: that test calls the engine on a function entry with `--args-json`.

1. **At HEAD**: probe `shared/resources/ci-tree-equivalence.js#isDocsPath` with sink `git-name` and
   args `[["**"]]`. Assert every hostile case is `rejected`, every legitimate one `accepted`, and
   `probes_executed === corpusFor("git-name").length`.
2. **Mutations**: `mkdtemp` a directory and copy `ci-tree-equivalence.js`, `glob-match.js`,
   `yaml-subset.js` and `bb-auth.js` into it. For each row below, write a copy with the named line
   removed, by `split`/`join` on the exact line, never `String.replace` with a `$` pattern. Assert the
   reproduced set equals the row exactly. Remove the directory in a `finally`.

| Removed | Expected to reproduce |
| :-- | :-- |
| `if (/[\u0000-\u001f\u007f]/.test(file)) return false;` | `control-char`, `tab`, `nul` |
| the empty/`.`/`..` segment check (two lines) | `dot-dot-segment`, `empty-segment`, `trailing-slash` |
| `if (file.split("/").some(isDotGitSegment)) return false;` | `dot-git-root`, `dot-git-bare`, `dot-git-nested`, `dot-git-case` |
| `if (file.split("/").pop() === CONFIG_BASENAME) return false;` | `config-root`, `config-nested` |
| segment check **and** `if (normalisePath(file) !== file) return false;` | the segment row plus `leading-slash`, `dot-slash` |

   An anchor line that is not found must **fail** the test, not skip it. A moved line would otherwise
   pass every mutation as "nothing reproduced".
3. Every hostile id appears in at least one row. Assert that from the table, so a new hostile case with
   no mutation fails.

**`CHANGELOG.md`** `[Unreleased]` → `### Added`: the sink, its cases, and that a name classifier is
probed there and not under `path`.

**Bundle**: `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- `sinkCases` namespaces ids (`git-name.dot-git-root`), so write the bare id in the cases.
- `renderInput` shows U+0000 as `␀` and tab as `␉`. U+0001 has no glyph and renders raw, so check the
  regenerated table reads as intended.
- Edit with the Edit tool. Generate the table from the module, then paste it.

## Testing Approach

`command node --test shared/resources/tests/security-input-corpus.test.mjs shared/resources/tests/security-probe.test.mjs`,
then `npm run test:remote` and `CI=true` before push.
