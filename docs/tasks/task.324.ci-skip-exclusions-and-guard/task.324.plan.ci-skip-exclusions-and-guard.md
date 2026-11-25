---
id: task.324.plan
title: "Implementation Plan: The CI skip template can exclude paths, and a guard holds its wiring"
type: plan
task-ref: task.324.ci-skip-exclusions-and-guard.md
---

# Implementation Plan: The CI skip template can exclude paths, and a guard holds its wiring

> Requirements and success criteria: [task.324.ci-skip-exclusions-and-guard.md](task.324.ci-skip-exclusions-and-guard.md)

## Overview

One loop added to `is_docs` in two scripts, and one new dependency-free Node script. Write each test
first and see it red. Nothing in `shared/resources/` changes, so there is nothing to bundle.

## Phase-by-Phase Implementation Guide

### Phase 1: `CODE_PATTERNS`

In both `classify-changes.sh`, as it was run in the trial (71 of 71 committed tests passed):

```bash
DEFAULT_DOCS_PATTERNS='*.md docs/*'
DEFAULT_CODE_PATTERNS='scripts/* */scripts/* test/* */test/* tests/* */tests/* __tests__/* */__tests__/* *.test.* *.spec.*'
is_docs() {
  local p hit=1 noglob_was_on=0
  case $- in *f*) noglob_was_on=1 ;; esac
  set -f
  for p in ${CODE_PATTERNS-$DEFAULT_CODE_PATTERNS}; do
    # shellcheck disable=SC2254 # $p is unquoted on purpose: it is a pattern, not a literal.
    case "$1" in $p) [ "$noglob_was_on" -eq 1 ] || set +f; return 1 ;; esac
  done
  for p in ${DOCS_PATTERNS-$DEFAULT_DOCS_PATTERNS}; do
    …
```

`${VAR-default}` with no colon: unset takes the default, empty means an empty list. Restore `set +f` on
the early return.

**Tests.** Both suites pass `process.env` through. Wherever a helper clears `DOCS_PATTERNS`
(`docs-set-parity.test.js`, *`delete env2.DOCS_PATTERNS`*; the Bitbucket suite's default case), clear
`CODE_PATTERNS` too, or a runner's own variable decides. Extend the pinned verdict strings of the
identity test (`bitbucket-pipelines/classify-changes.test.js:388`) with a `CODE_PATTERNS` case.

**Parity.** Add a second list beside `FIXED_PATHS`: path, template verdict, pipeline verdict, all
`code` against `docs`. Assert each pair literally, so the divergence disappearing is also red.

### Phase 2: The workflow reader and rules 1 to 3

Read by indentation, block style. Needed: the `on:` block, `jobs:` with each job's `needs`, `if`, `uses`,
and the `env` of the job named `changes`. Accept `needs:` as a scalar, a flow list or a block list, and
`on:` as a scalar, a flow list or a block mapping: these are the common spellings. Everything else
(`jobs: {`, `&`/`*`/`<<` under `on:` or `jobs:`, a tab, a duplicate key, a `uses:` job) is exit 2 with
the line number.

A `#` inside a quoted string is not a comment. `if:` may be wrapped in `${{ }}` and quoted: unwrap once,
then compare with the two exact forms. Do not pattern-match the expression. `changes-job.test.js`
records why a substring check was not enough for `concurrency`.

`if: |` and `if: >` are exit 2.

Transitive gating: a job is gated when it has the gate, or when it has no `if:` and needs at least one
gated job. GitHub skips a job whose `needs` was skipped, unless its own `if:` says otherwise.

Print one line with what was read (`read 1 workflow: 7 jobs, 2 light, 4 heavy, aggregate ci-ok`). Zero
heavy jobs is exit 2.

### Phase 3: Rules 4 and 5

Classify all tracked files in one shell, sourced as the parity test does, with the two lists from the
workflow in the environment (and absent when the workflow does not set them):

```js
spawnSync("bash", ["-c",
  'source "$1"; while IFS= read -r -d "" p; do is_docs "$p" && printf "%s\\0" "$p"; done; exit 0',
  "x", script], { input: paths.join("\0") + "\0", encoding: "utf8", maxBuffer: 1 << 28, env });
```

**Reader files** (a `--readers` pattern can replace it): files under `test/`, `tests/`, `__tests__/`;
`*.test.*` and `*.spec.*`; `*.config.*`; `project.json`, `package.json`, `tsconfig*.json`, `nx.json`,
`turbo.json`; `Makefile`. Not a file that is docs itself, and not vendored skills (`.agents/`,
`.claude/`).

**Rule 4** uses the same test plus `scripts/` and `.github/workflows/`: any such tracked file in the
docs set fails.

**Rule 5**, per reader file:

```js
t = t.replace(/\{(workspace|project)Root\}\//g, "");
t = t + "\n" + t.replace(/(["'`])\s*,\s*(["'`])/g, "/");   // raw AND joined: see § 3
const dirRead = /readdir|opendir|[gG]lob|walk/.test(t);
for (const m of t.matchAll(/(?<=["'`])[\w@.][\w@./*-]*(?=["'`])/g)) {
  const tok = m[0].replace(/^(\.{1,2}\/)+/, "").replace(/[/.*]+$/, "");
  // a file: tok ends a docs path at a segment boundary, and has an extension
  // a directory: tok is a docs path's directory, and the file has a dirRead
}
```

The look-around on quotes is what drops paths in comments and messages. The raw half finds a list item;
the joined half finds `join(root, "docs", "a.md")`. A joined string also yields its last part alone
(`a.md`): report one finding per reader and docs path, not per token.

Findings go to stdout as `<reader> <path>`, the accept list's own format, so a reviewed finding can be
pasted with a reason.

**`--self-test`** builds its repositories in a temporary directory and removes it in a `finally`. For
each rule it asserts the rule fires on its own case and the clean case is exit 0. It must not read the
repository it runs in.

### Phase 4: Runbook and records

In `docs/runbooks/ci-docs-only-skip.md`: a `CODE_PATTERNS` row in the inputs table; in "The docs set must
not cover a file a test reads", replace the "A pattern cannot exclude" point and the last sentence of the
section; a guard section before the adoption prompt; one line in its step 2. The guard runs in a job that
is never skipped, and not only on docs changes: a code PR is what adds a reader.

## Key Patterns and References

- `docs/examples/ci/github-actions/changes-job.test.js`: pin, do not pattern-match.
- `docs/examples/ci/github-actions/docs-set-parity.test.js`: sourcing the script to ask one predicate.
- `scripts/test-tmpdir.mjs`: refuses a new leaking temporary prefix.

## Testing Approach

The two tables and the mutation list in § 8 of the task. Guard tests run the script as a child process
against a temporary git repository and assert the exit code, the rule name and the named job or path.
