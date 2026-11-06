---
id: task.280.plan
title: "Implementation Plan: Skill and test tooling see what ships"
type: plan
task-ref: task.280.skill-and-test-tooling-see-what-ships.md
---

# Implementation Plan: Skill and test tooling see what ships

> Requirements and success criteria: [task.280.skill-and-test-tooling-see-what-ships.md](task.280.skill-and-test-tooling-see-what-ships.md)

## Overview

Edit sources in `skills/create-skill/`, `tests/` and `shared/resources/tests/` with the Edit tool; never a bundled copy.

## Phase-by-Phase Implementation Guide

### Phase 1

- In `tests/unbound-default-reads.test.js`, where it scans `${NAME:?…}`, add a check that the word contains no `'` or unescaped `"`; run it first to list current offenders (expect `skills/create-epic/SKILL.md`), fix each.
- Fence count: new `tests/fence-balance.test.js` importing `extractBlocks` from `shared/resources/qa-execute-snippets.mjs`; per tracked `SKILL.md` and `shared/resources/*.md`, compare the bash-block count `extractBlocks` returns with the count of raw lines matching ` ^\s*```bash`; mismatch fails with the file. Fix `skills/create-epics-from-shards/SKILL.md:334`.
- `create-skill/SKILL.md`: one sentence beside the `${NAME:?}` guard convention, and one on fences.

### Phase 2

`git grep -nE "\`\`\`(bash|sh)" -- tests ':!tests/fixtures'` lists hand regexes; switch `epic-numbering-retirement.test.js` and any other to `extractBlocks`. Add a guard test failing on a regex literal containing a triple backtick in `tests/`.

### Phase 3

`bundle_skill.py:622`: scan `skill_path/references/*.md` that are skill-owned (not generated copies, identified by the marker line bundling already uses for generated copies) with the invocation-form matcher `discover_needed` uses for `SKILL.md`; add the files found to the needed set. Test: a skill fixture with a reference doc invoking `references/fast-gate-outcome.sh`.

### Phase 4

Open `security-probe.test.mjs:4505`–`:4530`; make the mutant root `mkdtempSync(join(tmpdir(), "t131-mutant-"))` if it is under the repo tree. Run `bundle-comment-origin.test.js` beside the probe suite ten times.

### Phase 5

Mutation-prove each check with the Edit tool and `git diff --stat`. `command npm run bundle`, `command npm run bundle -- --check`, `CI=true command npm test`.

## Key Patterns and References

- `skills/create-skill/scripts/bundle_skill.py:585`–`:622`; `shared/resources/qa-execute-snippets.mjs:70`.
- Control design: `create-task` § 8 (obs #176).

## Testing Approach

Node and Python tests; a fixture skill for the discovery case.
