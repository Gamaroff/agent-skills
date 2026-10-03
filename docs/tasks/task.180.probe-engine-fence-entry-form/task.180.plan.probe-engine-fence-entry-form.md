---
id: task.180.plan
title: "Implementation Plan: security-probe — a fence: entry form"
type: plan
task-ref: task.180.probe-engine-fence-entry-form.md
---

# Implementation Plan: security-probe — a `fence:` entry form

> Requirements and success criteria: [task.180.probe-engine-fence-entry-form.md](task.180.probe-engine-fence-entry-form.md)

## Overview

Add `fence:` as the fifth entry form. It is a shell-family form whose script is extracted from a Markdown heading on every run and whose verdict is the exit status, the `cli:` arm's rule. Write the tests first, then the form, then route the documents and prove it on task.167's cases.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**File:** `shared/resources/tests/security-probe.test.mjs`

Build fixture docs in a temp directory under the repo root's test sandbox, the way the existing `shell:` tests build fixture scripts (search the file for `SHELL_PREFIX` to find the helper they use). One doc carrying two headings, each with a bash block, lets one test pin "the block under *this* heading":

~~~~markdown
### Admit

```bash
GATE="<slot>"
[ "$GATE" = "ok" ] || exit 1
```

### Refuse everything

```bash
exit 1
```
~~~~

Cases to add (one `test()` each, bash and zsh through the existing shell loop):

- `resolveEntry("fence:<doc>#Admit")` → `{ ok: true, kind: "fence", heading: "Admit" }`; `fence:<doc>` → `bad-entry`; `fence:x.js#H` → `bad-entry` (not `.md`); `fence:../outside.md#H` → `outside-repo-root`.
- Heading `Nope` → declined, with `entry-not-probeable` naming "heading not found"; a heading with prose but no bash block → `entry-not-probeable` naming "no bash block under heading".
- `--slot '<slot>'` with inputs `ok` (legitimate) and `bad` (hostile) → `engages`. With `--slot '<absent>'` → declined: "slot not in block".
- An input of `a$&b` is substituted literally (assert through `expected.stdout` on a block that `printf %s "<slot>"`s).
- `fixture.env: { X: "1" }` reaches a block that tests `[ "$X" = 1 ]`; `fixture.files: { "pkg/a.txt": "hi" }` is readable; `fixture.files: { "../escape": "x" }` → declined case.
- Fresh read: run once, rewrite the doc's block to `exit 0`, run again → a different verdict.

### Phase 2: The entry form

**File:** `shared/resources/security-probe.mjs`

1. Beside the other prefixes (`:481`–`:485`):

```js
/** The entry-spec prefix that selects the fenced-block form (task.180). */
export const FENCE_PREFIX = "fence:";
```

2. In `resolveEntry` (`:371`), a branch before `isShellFn`. The prefixes are disjoint (`fence:` shares no first byte with `shell`/`cli`):

```js
const isFence = entry.startsWith(FENCE_PREFIX);
// …
} else if (isFence) {
  const body = entry.slice(FENCE_PREFIX.length);
  const hash = body.indexOf("#");              // the FIRST #: a heading may contain one, a path may not
  if (hash <= 0 || hash === body.length - 1) {
    return { ok: false, reason: "bad-entry", detail: `entry must be "fence:path.md#heading", got "${entry}"` };
  }
  rawPath = body.slice(0, hash);
  heading = body.slice(hash + 1);
  if (!rawPath.endsWith(".md")) {
    return { ok: false, reason: "bad-entry", detail: `fence: names a Markdown file, got "${rawPath}"` };
  }
}
// … after containment:
if (isFence) return { ok: true, kind: "fence", entryPath, heading };
```

3. `extractFencedBlock(docText, heading)`. Reuse `extractBlocks` from `./qa-execute-snippets.mjs` (already imported for `isWithin`, `sandboxEnv`, `snapshotTree` at `:191`). Match the heading line as `^#{1,6}\s+<heading>\s*$` (exact text, so a heading that is a prefix of another does not match). More than one match → `{ ok: false, detail: "heading appears at lines A and B" }`. Take the first block whose language is `bash` (or `sh`), whose `line` is greater than the heading's line, and which comes before the next heading of the same or a higher level.

4. `runFenceCase(c, opts)`, modelled on `runCliCase` (`:1784`), not `runShellCase`:
   - Decline a non-string `input`, an invalid `expected` (`expectedProblem`, `:1381`) and an invalid `fixture` (non-object `env` values, file keys that are absolute or resolve outside the case directory through `isWithin`).
   - Substitute: `script = block.replaceAll(slot, () => c.input)`. The replacer function is load-bearing.
   - Write `script` to `<workDir>/fence.sh` and the fixture files under `<workDir>/`; run `<shell> fence.sh` per shell from `probeShells()` through `watchedSpawn` with `caseEnv(…)` plus `fixture.env` (applied **before** `HOME`/`TMPDIR`/`LC_ALL`, so a case cannot unset the sandbox).
   - Verdict: if `isLaunchFailure(child, …)`, the case is `errored`; with `expected`, use `compareExpected`; otherwise exit 0 is `accepted` and any other exit `rejected`.

5. `main()` (`:2396`): parse `--slot <token>`. It is required when the entry starts with `FENCE_PREFIX`, and a usage error with every other form, the same pattern as `--argv` for `cli:` (`:2481`). `--fake-gh` stays shell-form-only, and its message at `:1041` gains `fence:` once fence runs through the shell family's trip-wire (decide in Phase 2; record the decision in the implementation report).

6. `shared/resources/security-input-corpus.mjs` (`:67`): `OPTIONAL_CASE_FIELDS = Object.freeze(["expected", "fixture"])`, with a doc comment saying `fixture` is read only by `fence:`.

7. `npm run bundle`, then `npm run bundle:check`.

### Phase 3: Routing and proof

**Routing** — the population is the command in the task's § 7, re-run after the edit. Each document gets one clause, not a new section:

- `probe-boundary-rule.md` §5 (`:221`): "four entry forms" becomes "five", plus one sentence: *a boundary shipped as a fenced bash block in a step doc is `fence:<doc>#<heading>` with `--slot`, and "it is prose, not a script" is never a reason for `boundary: false`*.
- `finalise-dod-security-prompt.md` Step 1b signal (`:47`) and the Step 4 invocation examples (`:202`, `:217`): add the `fence:` route beside `cli:`.
- `probe-boundary-signals.mjs` (`:58`): the same clause in the signal text it exports (and update its test if it pins the text).
- `security-review-prompt.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/review-security/SKILL.md`: wherever `cli:` is offered as a form, offer `fence:` beside it.

**Proof test** — commit `shared/resources/tests/fixtures/fence-probe/t167-cases.json`, the 13 cases from `.claude/state/t167-probe-cases.json` rewritten to the new shape (`input` is the gate command; `fixture: { env, files: { "package.json": …, ".npmrc": … } }`). Then:

```js
test("fence: task.167's cases against the shipped fast-gate precondition", () => {
  const r = runProbeSpec({
    entry: "fence:shared/resources/develop-pipeline-step-3-develop-loop.md#Precondition — the gate must resolve before the first iteration",
    slot: "<fastGateCommand>", sink: "filename", cases: T167, repoRoot,
  });
  assert.equal(r.verdict, "engages");
  assert.equal(r.reproduced, 0);
});
```

Discrimination: copy the doc into a temp file **inside the repo root's test sandbox** with `--loglevel=notice` removed, run the same cases, and assert the 4 silent-environment legitimate cases are `rejected`. The shipped file is never mutated.

`npm` must be on the child's `PATH`. `caseEnv` → `sandboxEnv` keeps `PATH`; confirm, and if it does not, the case's `fixture.env` cannot be the fix (it would make the test host-specific). Report it as a finding instead.

## Key Patterns and References

- `runCliCase` (`:1784`) is the closest model: exit status as the verdict, `expected` optional, one record entry per control.
- Spawn timeouts come from `spawnBudget`, never a literal.
- Edit `shared/resources/` only; the bundle overwrites a `references/` edit.

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs`: red after Phase 1, green after Phase 2.
- Mutations (the task's § 8 table): revert each and observe the named test red; snapshot with `cp`, never `git checkout --`.
- `npm run ci:fast`, `npm run bundle:check`, `npm run lint:shell`, `npm run validate -- skills/{qa-task,qa-story,review-security,finalise}/`.
