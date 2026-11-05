---
id: task.257.plan
title: "Implementation Plan: finalise fix-and-recheck reads severity, scope and the named test"
type: plan
task-ref: task.257.fix-and-recheck-reads-what-it-claims.md
---

# Implementation Plan: finalise fix-and-recheck reads severity, scope and the named test

> Requirements and success criteria: [task.257.fix-and-recheck-reads-what-it-claims.md](task.257.fix-and-recheck-reads-what-it-claims.md)

## Overview

Three small changes to the same evaluator's inputs. The proof must be red on the line naming the test. Scope entries are rewritten into patterns the existing `glob-match.js` reads. Every DoD agent grades a FAIL, and the merge keeps the grade.

## Phase-by-Phase Implementation Guide

### Phase 1: The proof rule

**Files to modify:**
- `shared/resources/finalise-fix-and-recheck.mjs` — `RED_MARKER` (`:154`), `RED_WINDOW` (`:157`), `redNamesTest` (`:168`), `mutation-proved` (`:247`)

**Reproduce first.** This ran on 2026-11-04, and the first run below must be red before the change:

```text
✔ new guard refuses (0.6ms)
✖ findRelatedDocs a (0.7ms)
```

With `mutationProof.test: "new guard refuses"`, today's result is exit 0, `failed: []`. Generate the log with a real `node --test` run in a scratch directory; do not hand-write it.

**Replacement** (a shape, not a final text):

```js
// `ℹ fail N` names no test, so it cannot prove one.
const RED_LINE = /^\s*(not ok\b|✖|FAIL\b)/;

function redNamesTest(text, test) {
  return text.split("\n").some((line) => {
    if (!RED_LINE.test(line)) return false;
    const at = line.indexOf(test);
    if (at === -1) return false;
    const next = line[at + test.length];
    // End of line, ` (1.2ms)`, or the docs-link clause's `:<line>`.
    return next === undefined || next === " " || next === ":";
  });
}
```

A space boundary admits the title `a` matching `✖ a b`, so tighten it to ` (` during implementation unless a shape in the tests needs the bare space. The `FAIL doc-links: …` line names no file and proves nothing by itself, which is the intended change: the docs-link clause's proof rests on its `✖ <file>:<line>` line.

**Test-file refusal**, before the log is opened:

```js
if (/\.(test|spec)\.[a-z]+$/.test(m.test.trim())) {
  return `mutationProof.test is ${m.test}, a test file — name the test by its title`;
}
```

**`otherRed`**: collect the names on `✖` and `not ok` lines other than the named one, and drop node:test's `failing tests:` heading. A failing test appears twice in spec output, so use a Set. Return it from `evaluateFixAndRecheck` beside `failed`, and print it in the `--json` output.

**Fixtures to update:** the `test:` value and log at `finalise-fix-and-recheck.test.mjs:57` onward, and `acceptance-commit-carries-5c.test.mjs:926` (`test: "b.js"` becomes the title in its log, `reverted fix goes red`).

### Phase 2: Severity from every agent

**Files to modify:**
- `shared/resources/finalise-dod-ac-prompt.md` — the YAML block at `## Output`, on the criterion entry and the `checks` entries
- `finalise-dod-docs-prompt.md`, `finalise-dod-compliance-prompt.md`, `finalise-dod-fix-evidence-prompt.md` — each `checks` entry
- `shared/resources/finalise-rerun-scope.js` — the field list at `:520-531`

**Prompt text**, following `finalise-dod-security-prompt.md`'s severity rule (`:423`):

```markdown
**Severity rule**: every FAIL carries `severity`. `low`: one member or one check, where the code's behaviour is right or it fails closed, such as a missing test for a correct branch or one wrong doc line. `medium`: behaviour is wrong for a member. `high`: the criterion is undelivered, or it fails open. More than one failed member is not low. A FAIL with no severity is read as not low and halts, so leaving it off is never the lenient choice.
```

**Merge:** first write a test per path with a low FAIL, and see which path drops it. From reading, the named-field path does and `mergeReportedGap`'s spread does not; that is unverified until the test runs. The expected fix on the named-field path:

```js
severity: status === "FAIL" ? (ac.severity ?? null) : null,
```

The evaluator treats `null` as no severity, which stays refused.

### Phase 3: Scope in the notation authors use

**Files to modify:**
- `shared/resources/finalise-fix-and-recheck.mjs` — `inScope`, in `inside-files-summary` (`:218`)

**Behaviour measured on 2026-11-04** (`matchesAnyGlob` from `glob-match.js`, signature `(file, globs)`):

| Pattern | Path | Result |
|---|---|---|
| `skills/*/references/` | `skills/finalise/references/wireframe-map.js` | false |
| `skills/*/references/**` | `skills/finalise/references/wireframe-map.js` | true |
| `skills/*/references/**` | `shared/resources/wireframe-map.js` | false |
| `skills/{a,b}/SKILL.md` | `skills/a/SKILL.md` | false |
| `skills/*/SKILL.md` | `skills/a/b/SKILL.md` | false |
| `**` | `anything/at/all` | true |

So:

```js
const MAX_EXPANSIONS = 256;

/** `a/{b,c}/d` → ["a/b/d", "a/c/d"]; null when the expansion exceeds the bound. */
function expandBraces(entry) { /* innermost-free, one group at a time, bounded */ }

const hasLiteralSegment = (p) =>
  p.split("/").some((s) => s !== "" && !/[*?]/.test(s));

function entryPatterns(entry) {
  const expanded = expandBraces(entry);
  if (expanded === null) return [];
  return expanded
    .map((p) => (p.endsWith("/") ? `${p}**` : p))
    .filter(hasLiteralSegment);
}
```

Then `inScope` uses `matchesAnyGlob(p, filesSummary.flatMap(entryPatterns))`, keeping the `documentPath` and `artifactPaths` rules beside it as they are. Import through the existing `createRequire` at `:55`.

**Real entries to test**, from this repository's own documents: `skills/*/references/`, `skills/create-{story,task}/SKILL.md`, and `skills/{create-story,create-task,develop-story}/references/wireframe-map.js`.

`--git-base` compares `touched` with git and does not read `filesSummary`, so it needs no change.

### Phase 4: Step 8a prose, bundles and proof

**Files to modify:**
- `skills/finalise/SKILL.md` — Step 8a's record template (`"mutationProof": { "test": … }`), the proof bullet, and the sentence "`severity`, `filesSummary` and `otherFindingsOpen` come from things already on disk"

**Changes:**
- `test`: "{the title of the test that must go red on revert}", and the run command takes the test's file: `node --test <test file> > .claude/state/finalise-mutation-proof.log 2>&1`. Run the whole file, so neighbouring reds are visible.
- Severity: for an AC FAIL, from `.ac_result` in `$AC_MERGED_FILE`; for the others, from the agent's YAML.
- After exit 0: record any `otherRed` in the DoD's Step 5. Read them against `mutation-proving.md` row 2, since a different test going red is a finding.
- The docs-link clause's sentence about `mutationProof.test` stays true: the first reproduced file's `✖ <file>:<line>` line names it.

**Coordination.** `skill-updates/finalise/` holds a staged, prose-only update to the same bullet. It says the evaluator does not check which test went red, which stops being true when this merges. If it was installed first, remove that sentence here. If not, drop it from the staged copy.

## Key Patterns and References

- `shared/resources/glob-match.js`: the only matcher.
- `ci-tree-equivalence.js:68`: the existing consumer, as a pattern for the import.
- `finalise-dod-security-prompt.md:379` and `:423`: the severity field's existing shape.
- `mutation-proving.md` rule 2 and row 2: a red in a different test is a finding.

## Testing Approach

- **Tests**: `shared/resources/tests/finalise-fix-and-recheck.test.mjs` and `finalise-rerun-scope.test.mjs`, then `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` for the prompts.
- **Real logs**: generate the proof logs with `node --test` in a scratch directory. A hand-written log is what let the window pass in the first place: the comment describes a shape nobody ran against an adjacent failure.
- **Mutations**: the six in the task's § 8, each restored from a `cp` snapshot per `mutation-proving.md`.
- `CI=true` before pushing: some guards fire only then.
