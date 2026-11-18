---
id: task.280.plan
title: "Implementation Plan: Skill and test tooling see what ships"
type: plan
task-ref: task.280.skill-and-test-tooling-see-what-ships.md
---

# Implementation Plan: Skill and test tooling see what ships

> Requirements and success criteria: [task.280.skill-and-test-tooling-see-what-ships.md](task.280.skill-and-test-tooling-see-what-ships.md)

## Overview

Edit sources in `skills/create-skill/`, `shared/resources/` and `tests/` with the Edit tool; never a bundled copy. Re-measured at `develop` `ce2fed589` on 2026-11-18 (review fixes, Change Log 1.1): obs #47's and #48's instances and obs #102 are already fixed, so Phase 4 is dropped and Phases 1 and 2 are re-scoped.

## Phase-by-Phase Implementation Guide

### Phase 1

- **Quote lint.** In `tests/unbound-default-reads.test.js`, where it scans `${NAME:?…}`, add a check that the word contains no `'` or unescaped `"`. No file offends today (`git grep -nE "\\\$\{[A-Za-z_]+:\?[^}]*'[^}]*\}" -- 'skills/**/*.md' 'shared/resources/*.md'` finds none), so the test is a fixture pair run through the lint's own function: `"${X:?bind X to the epic's directory}"` is flagged, `"${X:?bind X to the epic directory}"` is not. Mutation proof: drop the quote term and the flagged fixture goes green.
- **Fence balance.** In `shared/resources/qa-execute-snippets.mjs`, export one function beside `extractBlocks` (name it `fenceProblems(markdown)`) that returns `[{ line, kind: "unclosed" | "stray-closer" }]`, using the same line walk `extractBlocks` uses (factor the walk if it is inline; `extractBlocks`' output must not change, and its existing tests hold that). New `tests/fence-balance.test.js` runs it over every tracked `skills/*/SKILL.md` and `shared/resources/*.md` and fails with the file and line. **Do not compare the block count with the raw ` ^\s*```bash ` line count**: that equality fails five balanced files (an example fence nested in a ` ````markdown ` wrapper is a raw line but not a block): `shared/resources/security-review-prompt.md` 1 vs 2, `skills/create-parallel-stories/SKILL.md` 10 vs 14, `skills/mermaid-architect/SKILL.md` 0 vs 1, `skills/qa-story/SKILL.md` 24 vs 25, `skills/qa-task/SKILL.md` 26 vs 27 (measured with `command node` over `git ls-files`). Controls: those five pass; a fixture with an unclosed fence and one with a stray closer fail. Mutation proof: make the walk ignore the end-of-file open state and the unclosed fixture goes green.
- **Defects found.** None is known: `skills/create-epics-from-shards/SKILL.md` was fixed by `6b33e2985` (its fences at `:302`/`:348` and `:442`/`:470` pair up). If the check finds one, fix it and name it in the QA report.
- `create-skill/SKILL.md`: one sentence beside the `${NAME:?}` guard convention (no quote inside the word), and one on fences (a test that runs or lints a bash block reads it with `extractBlocks`).

### Phase 2

- List the population with `git grep -nE '```(bash|sh)' -- tests ':!tests/fixtures'` (43 lines, 20 files at `ce2fed589`). Also read the files a line-state scanner hides from that grep: `git grep -nE '^\s*```|`{3}\\n' -- tests` style patterns, e.g. `tests/identity-rule-probe.test.js:48`, `tests/doc-link-branch-sites-execute.test.js:67`.
- Classify each file. **Bash/sh extractors move to `extractBlocks`:** `unbound-default-reads` (`:192`), `key-lookup-single-statement` (`:311`), `qa-fix-structural-move` (`:78`), `worktree-root-coverage` (`:154`), `fenced-bash-optional-file-globs` (`:58`); and the line-state scanners `ensure-bug-label-tolerance`, `gh-labels`, `qa-cycle`, `doc-link-branch-sites-execute`, `identity-rule-probe` unless a scanner needs the opening line number `extractBlocks` does not return, in which case it is allowlisted with that reason. **Allowlisted with a reason:** non-bash fences (`create-bug-report-bug-reports-heading` and `deferred-work-placement` read `markdown`; `restricted-access-docs` reads `yaml` and `mermaid`), fixture strings (`bundled-links`), and the guard tests whose subject is the fence text itself (`doc-id-chokepoint`, `no-consumer-names`, `untrusted-content-rule`, `halt-fence`, `shared-script-literals`, `fenced-bash-positional-params`, `outcome-reachability-check`, `qa-results-step12-wiring`, `gh-labels` fixture lines): read each before deciding.
- New ratchet `tests/fence-reader-ratchet.test.js`: fail on a regex literal, `new RegExp` or `matchAll`/`match` over a triple-backtick fence in `tests/` (excluding `tests/fixtures`) whose file is not in the test's allowlist; each allowlist entry is `file → reason`, and an entry with an empty reason fails. Non-vacuity: a fixture string containing ``/```bash\n([\s\S]*?)```/`` must be flagged by the ratchet's scan function. Record the migration table (file, disposition, reason) and the final allowlist size in the QA report.

### Phase 3

`bundle_skill.py:622`: scan `skill_path/references/*.md` that are skill-owned (no `AUTO-GENERATED — DO NOT EDIT` marker line, the one bundling writes into generated copies) with the invocation-form matcher `discover_needed` uses for `SKILL.md`, as a dependency edge; a fragment citation and a bare mention inside `<!-- cite: … -->` stay citations. Add the files found to the needed set; fail `bundle:check` on an invocation whose script is neither present nor vendorable. First run `git grep -n "'references' not in"` and read each test that pins the old filter. Tests go in `tests/bundle-check-mode.test.js` and/or `tests/bundle-transitive.test.js` (there is no `skills/create-skill/tests/`): a fixture skill whose own reference doc invokes `bash .agents/skills/<skill>/references/fast-gate-outcome.sh` (the task.238 shape) must fail `bundle:check` before the change and vendor the script after; control cases are an example in prose, a fragment citation and a generated copy.

### Phase 4

Dropped. `security-probe.test.mjs` already builds every scratch root with `fenceRoot()` under `tmpdir()` (refusing a root inside the repository; `t131-mutant-` at `:4729`), and `tests/bundle-comment-origin.test.js:126` lists tracked files only (obs #145). No edit.

### Phase 5

Mutation-prove each check with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`. Run `tests/bundle-comment-origin.test.js` beside `shared/resources/tests/security-probe.test.mjs` ten times in parallel and record the commands and exit codes (regression evidence).

## Key Patterns and References

- `skills/create-skill/scripts/bundle_skill.py:585`–`:622`; `shared/resources/qa-execute-snippets.mjs:70`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node and Python tests; a fixture skill for the discovery case. New test files live under `tests/`, which the `test:suite` glob (`tests/*.test.js`) reaches; `tests/test-runner-reach.test.js` is the backstop.
