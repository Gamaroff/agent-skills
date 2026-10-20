---
id: task.217.plan
title: "Implementation Plan: Finding-anchors advisory follow-ups"
type: plan
task-ref: task.217.finding-anchors-advisory-follow-ups.md
---

# Implementation Plan: Finding-anchors advisory follow-ups

> Requirements and success criteria: [task.217.finding-anchors-advisory-follow-ups.md](task.217.finding-anchors-advisory-follow-ups.md)

## Overview

Harden the engine first: refuse non-object findings, and stamp what `--annotate` writes. Then make both `--inline` blocks require that stamp and parse anchors exactly as the checker does. Finish with review-code's `--staged --fix` skip, the derived dispatcher population, and the changelog. Each fix lands with a test that reproduces the defect, plus a mutation proof.

Line numbers below are from `develop` at `7d67f5ad` and are paired with the identifier, so a stale coordinate can still be found.

## Phase-by-Phase Implementation Guide

### Phase 1: Engine

**Files to modify:**
- `shared/resources/finding-anchors.js`: the refusal and the stamp
- `shared/resources/tests/finding-anchors.test.mjs`: new cases, plus `GIT_CEILING_DIRECTORIES`

**1a. Refuse a non-object finding.** In `run` (`:395`), after `findingsOf(doc)` returns non-null and **before** `makeReader` and `checkAnchors`, find the first entry that is not a plain object:

```js
// A finding is an object. null crashed checkAnchors on `f.id` and read as "not runnable"; a
// string read no-line/unparseable and --annotate skipped it, so the guard then HALTed with the
// wrong cause (task.195 gates 2–3). Refused before any file is read.
const lenses = lensesOf(doc);
const bad = findings.findIndex((f) => f === null || typeof f !== "object" || Array.isArray(f));
if (bad !== -1) {
  const where = lenses ? `${lenses[bad] === "code" ? "code_review" : "pr_conformance"}.findings[${bad - offsetOf(lenses, bad)}]` : `[${bad}]`;
  return usage(opts, `${where} is not an object — a finding is an object`);
}
```

- `offsetOf` is the index of the first finding in that lens, so the message names the index *inside* the lens. Keep it inline if it reads better.
- Use the existing `usage(opts, message)` helper (`finding-anchors.js:378`, `function usage(opts, message)`), which sets `reason: "usage"` and exit 2 on both the `--json` and plain paths. Do not build a second payload.
- `checkAnchors` stays pure and keeps its `f.id` read. The refusal sits in `run`, at the boundary. A bare-array caller (`checkAnchors` used directly by tests) is unaffected.

**1b. Stamp the annotated file.** In the `opts.annotate` branch (`:448-452`), after the per-finding loop:

```js
// Only the checker writes this; the --inline guards require it, so a reviewer-written
// anchor_check with no checker run is refused (task.195 gate 3 CR-2).
if (!Array.isArray(doc)) doc.anchor_checked = { by: "finding-anchors", findings: results.length };
```

- **A bare array gets no stamp.** Neither `--inline` block reads a bare array: both read `.code_review` / `.pr_conformance`. State this in a comment.
- Once 1a lands, the `if (f && typeof f === "object")` guard in the annotate loop always holds. Keep it, because it is free, or drop it and say why in the commit.

**1c. Item 8.** In the "`--index` with `--rev` exits 2 usage; `--index` outside a git work tree exits 2 bad-root" test (`:999`), the `outside` call runs in `plain` under `os.tmpdir()`. Pass `GIT_CEILING_DIRECTORIES=path.dirname(plain)` in that call's env. `cli(args, cwd)` (`finding-anchors.test.mjs:367`) takes no env today, so add an optional third `env` argument merged over `process.env`. Do not set it globally: other tests rely on real repo discovery.

**Tests to add** (`finding-anchors.test.mjs`):
- Table-driven: for `null`, `"x"`, `1`, `true` and `[]`, on `code_review` and on `pr_conformance`, the result is exit 2, `reason: usage`, a message naming the lens path and index, and no `--annotate` output file.
- A valid finding *before* the bad one: still `usage`, and `[1]` is named.
- A stamp on a two-lens file holding 2 + 1 findings: `anchor_checked` equals `{by: "finding-anchors", findings: 3}`.
- A bare array with `--annotate`: no `anchor_checked`, and the existing bare-array behaviour is unchanged.

**Mutations:**
- Remove the refusal: the `null` case crashes and the string case reads `no-line`.
- Remove the stamp: the stamp test goes red.
- Remove `GIT_CEILING_DIRECTORIES`: run with `TMPDIR` inside a checkout and the test goes red.

Then run `npm run bundle`.

### Phase 2: `--inline` blocks

**Files to modify:** `skills/review-pr/SKILL.md` (block at `:945-997`) and `skills/review-code/SKILL.md` (block at `:156-188`).

**2a. Guard.** Extend each `jq -e` with the stamp, the count and the verdict set. For review-pr:

```jq
([.code_review, .pr_conformance] | map(select(. != null)) | length > 0)
and all(.code_review, .pr_conformance | select(. != null); .findings | type == "array")
and (.anchor_checked.by == "finding-anchors")
and (.anchor_checked.findings == ([.code_review.findings[]?, .pr_conformance.findings[]?] | length))
and ([ (.code_review.findings[]?, .pr_conformance.findings[]?)
       | select((.anchor_check | IN("ok","unchecked-text","no-line","no-such-file","out-of-range","text-mismatch","unparseable")) | not) ]
     | length == 0)
```

- **Order matters.** Today the clause checks `(.anchor_check | type) != "string"`, and `IN(...)` subsumes it. Replacing it is fine, but keep the comment's history line.
- For review-code, use the same clauses over `.code_review.findings[]?` only.
- **The verdict enumeration.** Restating the seven here is a fourth copy (review-pr `:790` holds another). Add both guard strings to whatever test already pins the review-pr schema enumeration against `MALFORMED` plus the clean three. If no such test exists, add one to `evals/shared/tests/finding-anchors-blocks.test.mjs` that derives the set from the engine's exports (`MALFORMED` is exported at `:477`; export the clean set beside it if needed). Never write a second literal list in a test.
- Keep the HALT message, and add "(no checker stamp, a stale count, or an unknown verdict)" so each refusal names its cause class.

**2b. Selector.** Replace the `test(…)` / `split(":")` pair with one `capture`:

```jq
| (.anchor | if type == "string" then ltrimstr(" ") else "" end) as $a   # see note
| ($a | capture("^\\s*(?<path>\\S+):(?<line>-?[0-9]+)\\s*$")?) as $m
| select($m != null)
| {path: $m.path, line: ($m.line | tonumber), body: …}
```

- **The note.** `ltrimstr` strips only one space. Prefer letting `\\s*` in the regex absorb the whitespace, as written, and drop the `ltrimstr`.
- The `?` on `capture` makes a non-match yield `empty` rather than abort, which keeps the "jq is all-or-nothing inside `[ … ]`" property the existing comment explains.
- **The checker trims first and then applies `^(\S+):(-?\d+)$`.** The `\\s*` anchors reproduce that trim. `\S+` is greedy and the line is digits only, so the last colon wins, exactly as in the checker.
- `-?` keeps parity with the checker. A negative line is already `out-of-range` and never reaches the selector, which only selects `ok`/`unchecked-text`.

**2c. review-code bindings** (item 7). Mirror review-pr `:945-950`:

```bash
FINDINGS_JSON="{findings-json}"   # Step 2b — the file finding-anchors.js annotated
PR_NUMBER="{pr-number}"           # the PR under review (Step 1's target)
SUMMARY_FILE="{summary-file}"     # the summary you wrote for the inline path
[ -s "$FINDINGS_JSON" ] || { echo "HALT: FINDINGS_JSON ($FINDINGS_JSON) is missing or empty"; exit 1; }
[ -s "$SUMMARY_FILE" ] || { echo "HALT: SUMMARY_FILE ($SUMMARY_FILE) is missing — write the summary first"; exit 1; }
: "${PR_NUMBER:?bind PR_NUMBER from Step 1's target}"
```

- Then `INLINE_FILE="$(mktemp -t review-code-inline.XXXXXX.json)"` **after** the guard. Add `rm -f "$INLINE_FILE"` on the jq-failure path and after the CLI call, as review-pr does.
- Change `node` to `command node` on the CLI line (`:185`); the rest of the repository uses `command node`.

**Tests** (`skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js`). These files already execute the guard block (task.195 added the "`--inline` guards" tests). Extend the existing fixture builder:
- **No stamp** (reviewer-written `anchor_check: "ok"`): HALT, and no inline file is created.
- **Stale stamp** (`findings: 1` over 2 findings): HALT.
- **`anchor_check: "verified"`:** HALT.
- **Stamped, `file_line: "src/a:b.js:3"`:** the selector output is `[{path:"src/a:b.js", line:3, …}]`.
- **Stamped, `file_line: "  a.js:1"`:** `path: "a.js"`.
- **Stamped, `file_line: "a.js:1-4"`:** excluded, and no abort.
- **review-code:** run the block with only its three placeholders substituted (stub `pr-inline-comment.js` through the existing test seam) and assert it exits 0.

**Mutations:**
- Drop each new guard clause in turn.
- Revert the selector to `split(":")[0]`; the colon test goes red.
- Remove the `\\s*`; the padded test goes red.
- Remove one binding; the review-code run test goes red.

**Probe re-run.** The `--inline` guard is a fence-probed boundary. Re-run `docs/tasks/task.195.finding-anchors-follow-ups/task.195.dod.2.security.cases.1.json` against the new block through `shared/resources/security-probe.mjs`, and add stamp cases. Escapes are findings (obs #73).

### Phase 3: `--staged --fix`, population, changelog

**3a. `--staged --fix`** (item 6). In `skills/review-code/SKILL.md` Step 5, item 1 (`:238-239`), add after the anchor skip:

> Under `--staged`, also **skip every finding whose file differs between the working tree and the index**, and list it as "skipped — working tree differs from the staged content that was reviewed". The anchor was checked against the index (Step 2b `--index`), and the edit lands on the working tree.

Make it runnable:

```bash
# For each finding to apply under --staged; $P is the anchor's path as the checker parsed it.
git diff --quiet -- "$P" || { echo "skipped — working tree differs from the staged content that was reviewed: $P"; continue; }
```

Test it in `review-code.test.js` with a temp repo: stage `a.js`, edit it unstaged, and assert the documented check skips it while a clean staged file is applied. If Step 5 has no executable block today (`:234-245` is prose), pin the rule's sentence the way the repository pins prose rules elsewhere, *and* execute the one-line check against the temp repo.

**3b. Population** (item 9). `evals/shared/tests/finding-anchors-blocks.test.mjs:41` hard-codes `DISPATCHERS`.
- Derive the population: every fenced `bash` block in `skills/*/SKILL.md` and `shared/resources/*.md` whose lines invoke the engine (`/\bnode\s+\S*finding-anchors\.js\b/`, which matches both `command node` and `node`).
- Assert `new Set(derivedSkills)` deep-equals `new Set(DISPATCHERS)` with `derived.length >= 4`.
- **Control (obs #135):** a fixture string holding a fenced block that names `finding-anchors.js` in a comment only must not match. Assert that on the matcher directly.
- Measured population on `7d67f5ad`: `grep -rln 'finding-anchors.js' skills/*/SKILL.md shared/resources/*.md` returns qa-task, review-pr, review-code and qa-story. The `--inline` blocks mention the engine only in comments, so the invocation regex must not count them twice. Check which blocks match and pin that.

**3c. CHANGELOG.** Under `[Unreleased]` › Fixed, add one entry naming task 217: non-object findings are refused (`usage`); the `--inline` guards require the checker's stamp; the selectors parse anchors as the checker does; `--staged --fix` skips drifted files. Name the stamp requirement as the visible change.

## Key Patterns and References

- **The field reader**: `fieldOf` (`finding-anchors.js:110`), the task.195 QA4 consolidation. Do not add a second per-field reader.
- **Guard shape**: review-pr's block (`skills/review-pr/SKILL.md:945-997`) binds its inputs, refuses before `mktemp`, and cleans up. review-code copies it.
- **The dispatcher `reason` contract**: `usage` already HALTs in all four dispatchers, so no dispatcher edit is needed for 1a. Confirm by grepping each block's `case "$REASON"` arms.
- **Edit `shared/resources/` sources only**, then run `npm run bundle`.
- **Use `command node`**, never bare `node`/`npx`.

## Testing Approach

- `command node --test shared/resources/tests/finding-anchors.test.mjs evals/shared/tests/finding-anchors-blocks.test.mjs evals/shared/tests/finding-anchors-callers.test.mjs`
- `command node --test skills/review-pr/tests/*.test.js skills/review-code/tests/*.test.js`
- Run item 8's variance check:

  ```bash
  mkdir -p "$PWD/.tmp-ceiling" && TMPDIR="$PWD/.tmp-ceiling" command node --test shared/resources/tests/finding-anchors.test.mjs
  rm -rf "$PWD/.tmp-ceiling"
  ```
- Run `npm run ci:fast` per phase and `npm run ci` before the PR.
- **Move the gitignored `.agents/skills` symlink aside** before trusting a local green on the skill tests, so the tests read the in-tree copies CI reads.
