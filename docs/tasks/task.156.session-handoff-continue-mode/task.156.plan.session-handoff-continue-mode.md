---
id: task.156.plan
title: "Implementation Plan: session-handoff continue mode — a continuation file a fresh context resumes from"
type: plan
task-ref: task.156.session-handoff-continue-mode.md
---

# Implementation Plan: session-handoff continue mode

> Requirements and success criteria: [task.156.session-handoff-continue-mode.md](task.156.session-handoff-continue-mode.md)

## Overview

Add a pure resolver script that decides where a continuation file goes and what the resume prompt
says. Add a template whose every state figure the **existing, unchanged** `handoff-verify.mjs` can
re-measure, and a `## Continue` procedure in `SKILL.md` that ties them together. The verifier is
the fixed point: the template is designed to fit it, never the reverse.

## Phase-by-Phase Implementation Guide

### Phase 1: `skills/session-handoff/scripts/continuation.mjs`

Follow `handoff-verify.mjs` for shape: a header comment stating the contract and reasons, pure
functions exported for tests, and a thin `main()` that sets `process.exitCode` and returns (never
`process.exit()` — see that file's header, line ~61).

```js
// Exports
export function resolveContinuation({
  repoRoot,          // absolute, from `git rev-parse --show-toplevel`
  branch,            // from `git rev-parse --abbrev-ref HEAD`; "HEAD" when detached
  prdRoot,           // from resolve-paths (default "docs/prd"), relative to repoRoot
  home,              // os.homedir()
  today,             // "YYYY-MM-DD"
  slug,              // optional override
  exists,            // (absPath) => boolean       — injected
  list,              // (absDir) => string[]       — injected (readdir, [] on ENOENT)
  findStory,         // (epic, story) => absDir|null — injected (walk prdRoot for story.E.S.*.md)
}) // => { reason: "ok"|"no-verifier", path, workItem, verifier, resumePrompt }

export function nextIndex(names, prefix) // max(parseInt(m[1], 10)) + 1 over /^prefix\.handoff\.(\d+)\./
export function kebab(s)                 // lower, [^a-z0-9]+ → "-", trim "-", never empty ("session")
```

**Path rules** (first match wins):

| Branch | Condition | Path |
| --- | --- | --- |
| `feature/task.(\d+).(.+)` | `docs/tasks/task.N.slug/` exists | `docs/tasks/task.N.slug/task.N.handoff.{k}.slug.md` |
| `feature/story.(\d+).(\d+).(.+)` | `findStory(E,S)` returns a dir | `<dir>/story.E.S.handoff.{k}.slug.md` |
| anything else | — | `.agents/handoffs/{today}-{kebab(slug ?? branch)}.md`, suffixed `-2`, `-3`… if taken |

**Verifier order**: `<repoRoot>/.agents/skills/session-handoff/scripts/handoff-verify.mjs` (emit
repo-relative), then `<home>/.agents/skills/…` and `<home>/.claude/skills/…` (emit absolute).

**Resume prompt** (exact text lives in the script as one template string; the SKILL does not
restate it):

```
Continue the work handed off in `<path>`.
1. Run `command node <verifier> <path>` and read every line's verdict. Treat `stale` and
   `unverifiable` figures as unknown, not as true.
2. Read the file. §4 "Ruled out" lists approaches already rejected — do not retry them without a
   new reason.
3. Start at §1 "Next step".
```

With `reason: no-verifier`, step 1 becomes: "No verifier is installed — re-run each command in the
state table by hand and compare before trusting it."

**CLI**: `command node scripts/continuation.mjs [--json] [--slug s] [--repo dir]`. Reads branch and
toplevel with `execFileSync("git", …)`. Without `--json` it prints `path` then the prompt. Exit 0 on
`ok`/`no-verifier`, exit 2 on an unknown flag.

### Phase 2: template and procedure

`assets/continuation.template.md` starts from `handoff.template.md`'s header conventions. The
figure rules are the same comment block, shortened:

```markdown
# Continuation — {work item or slug} — {YYYY-MM-DD}

**Goal:** {1–3 sentences}. Work item: [{doc}]({relative link}) · branch `{branch}`

| Check | Command | Result |
| --- | --- | --- |
| Branch tip | `git rev-parse --short HEAD` | **{sha}** |
| Uncommitted files | `git status --porcelain` | {**clean** or the files} |
| Targeted tests | `command node --test --test-name-pattern={pattern}` | **exit 0** |

## 1. Next step
## 2. Done this session
## 3. Decisions taken
## 4. Ruled out
## 5. Files that matter
## 6. Open questions
## Resume prompt
```

Check the dirty-file row against the verifier's whitelist and comparison rules **before** fixing
its form. The targeted-test row must use `--test-name-pattern=`: the verifier refuses any positional after `node --test` (SKILL § whitelist, `node` row; gate 8 / bug.11), so `node --test {file}` would always read `unverifiable`. `git status --porcelain` prints nothing when clean, so a `**clean**` figure would read
`stale`. Pick a figure form that fits the verifier (for example a whitelisted count form, or
`expect:` with a regex). If none fits, drop the row rather than change the verifier. Record the
choice in the implementation report.

`SKILL.md` `## Continue — hand in-flight work to a fresh context`, placed after `## Write`:

1. `command node <skill>/scripts/continuation.mjs --json`, then use `path` and `resumePrompt` as
   given.
2. If `.claude/state/develop-pipeline.lock` or `develop-pipeline.last-halt.json` exists, add the
   pipeline pointer and **do not** restate step state.
3. Measure every figure, then fill the sections in order. §4 and §6 are never omitted.
4. Run Read on the file. Fix or re-measure every `stale` row. Accept `unverifiable` only with a reason.
5. Print the resume prompt verbatim. Say the file is **not committed**.

Top-of-file mode summary: three modes (Write, Read, Continue) with one line each. Description:
append the triggers "hand off to a fresh session", "context is filling up", "continue this in a new
context". Keep it ≤ ~100 words.

### Phase 3: naming, catalog, changelog

`docs/standards/file-naming.md`, in the story-artifacts and task-artifacts tables, next to the
implementation report rows:

```
| Continuation handoff | `story.{epic}.{story}.handoff.{n}.{name}.md` | `story.2.3.handoff.1.add-footer-link.md` |
| Continuation handoff | `task.{n}.handoff.{n}.{name}.md` | `task.44.handoff.1.database-migration.md` |
```

Then `npm run generate-catalog` and a CHANGELOG `[Unreleased]` → `Added` entry.

## Key Patterns and References

- `skills/session-handoff/scripts/handoff-verify.mjs`: header-comment style, `exitCode` emission,
  and the whitelist the template's commands must satisfy.
- `skills/session-handoff/assets/handoff.template.md`: figure-writing rules to mirror.
- `shared/resources/develop-pipeline-on-precompact.sh` (`LOCK=`, `SNAPSHOT=`): the paths to detect for
  the pipeline pointer.
- Observation-log `nextIndex` precedent: parse ids base 10 and take max + 1. Lexical sort puts `10`
  before `9`.

## Testing Approach

`skills/session-handoff/tests/continuation.test.js` (CommonJS, `node:test`, same style as
`handoff-verify.test.js`; import the ESM module via `pathToFileURL`):

- A resolver table test over an injected `exists`/`list`/`findStory` for every row of the path
  rules, the index-10 case, and the slug-sanitising case (`../x y` → `x-y`, never outside the dir).
- Verifier order: three cases, one per location, plus none.
- Integration: `git init` a temp dir, commit a file, and fill the template with real `git rev-parse`
  output. Run `handoff-verify.mjs <file> --json` via `spawnSync(process.execPath, …)` and assert
  that all rows are `confirmed`. Then change the SHA figure and assert `stale`.
- A piped `--json` read (`spawnSync` with `stdio: "pipe"`) that parses, which covers the truncation
  trap.
- Mutation-prove each by hand: break `nextIndex` to lexical order, and drop the dir-exists check.
  Record both in the implementation report.
