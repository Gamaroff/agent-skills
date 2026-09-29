---
id: task.158.plan
title: "Implementation Plan: QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment"
type: plan
task-ref: task.158.cycle-file-and-containment-definitions.md
---

# Implementation Plan: QA read-back requires this cycle's links; one definition each for the cycle's gate file and for path containment

> Requirements and success criteria: [task.158.cycle-file-and-containment-definitions.md](task.158.cycle-file-and-containment-definitions.md)

## Overview

Three independent mechanisms, one phase each, and the phases can land in any order:

- Make the read-back check membership, not only existence.
- Move every current-cycle gate lookup onto `qa-cycle.sh`, and extend the existing guard.
- Collapse the containment predicate to one ESM and one CJS export, held equal by a parity test.

## Phase-by-Phase Implementation Guide

### Phase 1: Read-back requires this cycle's links

**`shared/resources/doc-links.js`, `checkDocument`.** The loop already computes `resolved` for every
link. Collect it, and add the list to the return value (the change is additive):

```js
const resolvedAll = [];
for (const { target, line } of links) {
  const noFragment = target.split("#")[0];
  if (noFragment === "") continue;
  const resolved = /* existing normalize(join(dirname(rel), decodeSafe(noFragment))) */;
  resolvedAll.push(resolved);
  // …existing exists / broken logic unchanged…
}
return { file: rel, root: base, links: links.length, resolved: resolvedAll, broken, … };
```

**`shared/resources/qa-read-back.js`, `readBackUnguarded`.** After the second `links = readLinks();`,
and only when both `gate` and `report` were found:

```js
const linked = new Set(links.resolved);
for (const [what, abs] of [["gate", gate], ["QA report", report]]) {
  if (abs && !linked.has(rel(abs)))
    out.problems.push(
      `the document does not link this cycle's ${what} ${path.basename(abs)} — the Step 12 edit did not land (or links a previous cycle's)`,
    );
}
```

`rel()` is the script's existing repo-relative helper, and it produces the same path form
`checkDocument` resolves to.

**Tests** (`shared/resources/tests/qa-read-back.test.mjs`) use the existing `repo()` builder:

- The cycle-2 stale case.
  - In `mutate`, first commit (`git add -A && git commit`) so that gate.1 and qa.1 are tracked.
  - Then write `task.9.gate.2.x.yml` and `task.9.qa.2.x.md` and leave the document untouched.
  - Assert exit 1, and that the problems name `task.9.gate.2.x.yml` and `task.9.qa.2.x.md`.
- The same case with the document's links edited to `gate.2` / `qa.2`: exit 0.
- Both of the above for `SHAPES.story`.
- The existing `./`-prefixed link form already covers the resolver's `./` normalisation. Add one
  bare `task.9.gate.2.x.yml` link case.

**Mutation**: delete the loop, and the cycle-2 stale test goes red.

### Phase 2: One definition for the cycle's gate file

Use the rc-checked form Step 13 already uses. It is repository-root addressed:

```bash
QA_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR"); rc=$?
[ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh not runnable (rc=$rc) — check the path" >&2; exit 1; }
THIS_GATE=""
if [ -n "$QA_CYCLE" ]; then
  THIS_GATE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR" --path gate); rc=$?
  [ "$rc" -le 1 ] || { echo "⚠️  qa-cycle.sh --path not runnable (rc=$rc)" >&2; exit 1; }
fi
```

The sites to change:

- **qa-task Phase 0 step 1** (`LATEST_GATE`) and **qa-story's** twin. Replace the `find … gate.${PRIOR_CYCLE}` line with the `--path gate` call.
- **qa-task Step 13b** (`THIS_GATE`) and **qa-story's** twin. Replace the `find … gate.${QA_CYCLE:-none}` line. The `BLOCKING_COUNT` grep that follows is unchanged.
- **Step 5-6 § Finding the Latest Gate File**: replace both the story and the task `find | awk | sort` blocks with the `qa-cycle.sh` + `--path gate` pair, using the `{develop-story|develop-task}` brace path the doc already uses.
- **Resume contract § QA Cycle Count Reconstruction**: `QA_CYCLE=$(bash …/qa-cycle.sh {doc-directory}); rc=$?`. rc 1 means `QA_CYCLE=0`; rc above 1 means HALT. Keep the `COMPLETED` / `NEXT_CYCLE` lines.
- **Step 7 finalise, completion comment**: `FINAL_GATE` reads `gate:` from `$(… qa-cycle.sh {dir} --path gate)`. Keep `N/A` for rc 1. Keep the DoD lookup as it is: it selects a DoD file, not a gate.

**The guard** (`tests/qa-cycle.test.js`, test "no shipped skill carries an inline gate-number derivation any more"):

- Extend `SKILLS`, or add a sibling constant used by the same test, with
  `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
  `shared/resources/develop-pipeline-resume-contract.md` and
  `shared/resources/develop-pipeline-step-7-finalise.md`.
- Add a second pattern for a selection: a line with `find` and `gate` that does not call
  `qa-cycle.sh` and is not a count (it has no `wc -l`).
  Sketch: `/\bfind\b(?![^\n]*qa-cycle\.sh)[^\n]*\.gate\.[^\n]*(?:head -1|tail -1|\$\{[A-Z_]+)(?![^\n]*wc -l)/`.
- Run it over the joined-continuation blocks that `fencedBlocks` already produces.
- Non-vacuity comes from a small fixture array holding each old shape verbatim, copied from `git show 458bcec0:<file>`. The test asserts each fixture line is caught.

**Header** (`shared/resources/qa-cycle.sh`): replace the "It is NOT yet the only definition …"
sentences with "It is the only definition the QA skills and the develop-pipeline step docs use; the
one deliberate exception is finalise's stem-keyed `newest_numbered` lookup, which must exclude a
co-located bug's gate".

**Executed prose**: for each changed block, run it under bash and zsh with the placeholders bound, in
a fixture directory holding `task.9.gate.02.x.yml` (with `  - severity: high` under `top_issues:`)
and `task.9.qa.02.x.md`. Use `qa-execute-snippets.mjs --copy-as` for seeding.

### Phase 3: One containment predicate per module system

`shared/resources/security-probe.mjs` already has `import { sandboxEnv, snapshotTree } from "./qa-execute-snippets.mjs";`. Add `isWithin` to it.

- **`--entry`**: `const escapes = rel === "" || rel.startsWith("..") || isAbsolute(rel);` becomes `const escapes = entryPath === root || !isWithin(root, entryPath);`. Drop `rel` if nothing else reads it.
- **`--fake-gh`**: `if (rel === "" || rel.startsWith("..") || isAbsolute(rel))` becomes `if (fakeGhDir === root || !isWithin(root, fakeGhDir))`.

`shared/resources/doc-links.js`:

- Add a `function isWithin(parent, child)` with the corrected test, and add it to `module.exports`.
- `linkState`'s symlink branch then reads `if (!isWithin(fs.realpathSync(base), real)) return "outside-repo";`.
- The earlier `resolved === ".." || resolved.startsWith("../")` check works on a posix
  repository-relative string, not two absolute paths. Leave it. It is the same rule in string form,
  and the parity case table covers `..` and `../x`.

`shared/resources/qa-read-back.js`: delete the private `isWithin` and use `engines.docLinks.isWithin`.

**Parity test** (`shared/resources/tests/doc-links.test.mjs`, which already imports CJS through
`createRequire`): `import { isWithin as esm } from "../qa-execute-snippets.mjs"`, plus
`const { isWithin: cjs } = require("../doc-links.js")`. Check this table with `assert.equal(esm(p, c), expected)` and `assert.equal(cjs(p, c), expected)`:

| parent | child | expected |
| --- | --- | --- |
| /a/b | /a/b | true |
| /a/b | /a/b/c | true |
| /a/b | /a/b/..c | true |
| /a/b | /a/b/..c/d | true |
| /a/b | /a | false |
| /a/b | /a/bc | false |
| /a/b | /a/..b/c | false |
| / | /var/x | true |
| /a/b | /x/y | false |

**security-probe tests**: an `--entry` inside a `..fixtures/` directory under the repository root is
probed, not declined. `entry === root` and a `../outside` entry are still declined
`outside-repo-root`. Mutate each site back to `startsWith("..")`, and its `..name` test goes red.

### Phase 4: Docs and bundle

- Add a CHANGELOG `[Unreleased]` › Changed bullet, `(task 158)`, one line per mechanism.
- Run `npm run bundle`. The shared sources are bundled into qa-task, qa-story, qa-fix, finalise, the develop-* skills and review-security.
- Run `npm run ci`, with `.agents/skills` moved aside, to match CI.

## Key Patterns and References

- The rc-checked `qa-cycle.sh` call: qa-task SKILL.md Step 13, the `QA_CYCLE=$(bash .agents/skills/qa-task/references/qa-cycle.sh "$TASK_DIR"); rc=$?` block.
- The stale-link fixture reuses task.149's reproduction, recorded in `task.149.pr-review.1.qa-evidence-integrity.md` CR-1.
- The zero-padded-gate reproduction is in task.149 QA cycle 8 (`task.149.qa.8.qa-evidence-integrity.md`, New Findings).

## Testing Approach

- `node --test shared/resources/tests/qa-read-back.test.mjs shared/resources/tests/doc-links.test.mjs shared/resources/tests/security-probe.test.mjs tests/qa-cycle.test.js`
- Mutation proofs follow `references/mutation-proving.md`: snapshot with `cp`, assert that the edit applied, name the expected red test before running it, and restore from the snapshot.
