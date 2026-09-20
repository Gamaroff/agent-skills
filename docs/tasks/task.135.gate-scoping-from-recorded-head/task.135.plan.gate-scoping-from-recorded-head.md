---
id: task.135.plan
title: "Implementation Plan: Gate scoping from a recorded head"
type: plan
task-ref: task.135.gate-scoping-from-recorded-head.md
---

# Implementation Plan: Gate scoping from a recorded head

> Requirements and success criteria: [task.135.gate-scoping-from-recorded-head.md](task.135.gate-scoping-from-recorded-head.md)

## Overview

Replace one typed input (`updated:`) with one recorded fact (`head:`) at the gate's writer, then move the three readers onto it. The scope snippet lives once in `qa-re-review-scope.md` and is mirrored verbatim in both skills' Step 3b — edit the shared source and re-paste, as the file's own header instructs.

## Phase-by-Phase Implementation Guide

### Phase 1: `head:` on the gate

**Files to modify:** `skills/qa-task/SKILL.md` (gate YAML template, the `updated: '{ISO-8601 timestamp}'` line, and the "Write gate YAML" step); `skills/qa-story/SKILL.md` (same); every `schema: 1` reader.

**Exact changes:** template header becomes
```yaml
schema: 2
task: '…'
gate: PASS | CONCERNS | FAIL | WAIVED
status_reason: '…'
reviewer: '…'
head: '{GATE_HEAD}'        # git rev-parse HEAD when the review was performed — the tree judged
updated: '{GATE_UPDATED}'  # date -u +%Y-%m-%dT%H:%M:%SZ at write time — never typed
```
and the write step gains, immediately before the YAML is written:
```bash
GATE_HEAD=$(git rev-parse HEAD)
GATE_UPDATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```
with the instruction *"substitute both; a gate whose `updated:` was typed rather than read from the clock is the defect task.135 removed — on task.130 four gates carried local time with a `Z` suffix"*.

Readers: `grep -rn "schema: 1\|schema === 1\|schema == 1" shared/resources evals skills/*/scripts` — widen each to `1 | 2`. Eval fixtures: `grep -rn "updated:" evals/*/step-isolation/*/scenario.json` — where a gate's frontmatter is asserted, add `head:` to the expectation (re-record with the eval runner if the fixture is a replay).

### Phase 2: Scope and trigger from the head

**Files to modify:** `shared/resources/qa-re-review-scope.md` (§ the fenced snippet under "Default scoping" and the table row `| 3+ | ≥2 | since LAST_GATE_DATE | false |`); both skills' Step 3b step 1 fence; `qa-task` Phase 0 step 3 (`GATE_DATE`/`DOC_DATE`/`CODE_MOVED`); `develop-pipeline-step-5-6-qa-loop.md` (grep `updated:` — one sentence in the Step 3b description).

**Exact changes** (the shared snippet; paste verbatim into both Step 3b blocks):
```bash
LAST_GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/head:[[:space:]]*//; s/['\"]//g")
if [ "$PRIOR_GATES" -ge 2 ] && [ "$SAFETY_REPROBE" != "true" ]; then                 # cycle 3+
  if [ -z "$LAST_GATE_HEAD" ]; then
    echo "scope: unscoped — prior gate carries no head: (schema 1); scoping needs the commit it judged, not its timestamp"
    git diff "$BASE...HEAD" > "$DIFF_FILE"
  else
    git cat-file -e "${LAST_GATE_HEAD}^{commit}" 2>/dev/null \
      || { echo "HALT: gate $PRIOR_GATES names head $LAST_GATE_HEAD, which this checkout does not have — fetch, or run unscoped deliberately"; exit 1; }
    git merge-base --is-ancestor "$LAST_GATE_HEAD" HEAD \
      || { echo "HALT: gate $PRIOR_GATES's head $LAST_GATE_HEAD is not an ancestor of HEAD — the branch was rewritten; re-record the gate's head or run unscoped deliberately"; exit 1; }
    mapfile -t FILES < <(git diff --name-only "$LAST_GATE_HEAD"..HEAD)   # zsh: FILES=("${(@f)$(git diff --name-only "$LAST_GATE_HEAD"..HEAD)}")
    if [ "${#FILES[@]}" -eq 0 ]; then
      echo "HALT: nothing changed since gate $PRIOR_GATES's head ${LAST_GATE_HEAD:0:12} — there is no fix to review; check the cycle order"; exit 1
    fi
    git diff "$BASE...HEAD" -- "${FILES[@]}" > "$DIFF_FILE"
    [ -s "$DIFF_FILE" ] || { echo "HALT: ${#FILES[@]} files changed since ${LAST_GATE_HEAD:0:12} but the scoped diff is empty — check the pathspec expansion"; exit 1; }
    echo "Re-review scope: files changed since gate $PRIOR_GATES (head ${LAST_GATE_HEAD:0:12}; ${#FILES[@]} files) — default scoping"
  fi
else
  …unchanged whole-branch / refute / re-probe arm…
fi
```
Note the new HALT on an **empty** file list: with `--since`, "nothing since the stamp" was indistinguishable from "stamp in the future"; with a head it means no commit landed after the gate, which on cycle 3+ is a sequencing error worth stopping on. The existing "N files but empty diff" guard stays — it catches a pathspec that expanded to nothing. Both shells: `mapfile` is bash-only; the zsh spelling is in the comment and the executed test runs both.

Phase 0 trigger (`qa-task` step 3): replace the three-variable block with
```bash
GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" | head -1 | sed -E "s/head:[[:space:]]*//; s/['\"]//g")
DOC_STATUS=$(grep -E '^status:' "$TASK_FILE" | head -1 | awk '{print $2}')
if [ -n "$GATE_HEAD" ]; then
  CODE_MOVED=$(git rev-list --count "$GATE_HEAD"..HEAD -- apps packages shared skills evals 2>/dev/null || echo 1)
  DOC_MOVED=$(git diff --quiet "$GATE_HEAD"..HEAD -- "$TASK_FILE" && echo 0 || echo 1)
else
  CODE_MOVED=1; DOC_MOVED=1     # a gate with no head cannot vouch for the present tree — re-review
fi
```
and the skip conditions read `CODE_MOVED -eq 0 && DOC_MOVED -eq 0 && …`. The `|| echo 1` fails toward re-review when git cannot answer.

Table row: `| 3+ | ≥2 | since gate N's head: (git diff <head>..HEAD) | false |`. The `develop-pipeline-step-5-6-qa-loop.md` sentence *"files changed since the last gate's `updated:` date"* → *"files changed since the last gate's `head:`"*.

Executed test (add to `shared/resources/tests/` as `qa-scope-from-head.test.mjs`, following `probe-base-binding.test.mjs`'s extract-by-anchor pattern): scratch repo with base, two fix commits, a gate file whose `head:` is the first fix and whose `updated:` is `date -u -v+3H` (macOS) / `+3 hours`; run the snippet under bash and `zsh -f` → `FILES` is exactly the second commit's files; then flip the gate to schema 1 (no head) → the `unscoped` line prints and the diff is the whole branch. Mutation: snippet reverted to `--since=$LAST_GATE_DATE` → the future-dated case yields an empty list → red.

### Phase 3: Freshness test and the 5c row

**Files to modify:** 🆕 `shared/resources/tests/gate-head-freshness.test.mjs`; `shared/resources/pr-conformance-prompt.md` § D.

**Exact changes:**
```js
// for every docs/**/*.gate.*.yml
const fm = parseFrontmatter(yml);                    // reuse the reader qa-loop tests use
if (Number(fm.schema) < 2) { skipped++; continue; }
assert.match(fm.head, /^[0-9a-f]{40}$/, `${rel}: head missing or not a full SHA`);
run(`git cat-file -e ${fm.head}^{commit}`);          // exists
run(`git merge-base --is-ancestor ${fm.head} ${tip}`); // tip = the branch that carries the gate (HEAD in CI)
const authored = Date.parse(run(`git log -1 --format=%aI ${fm.head}`));
assert.ok(Date.parse(fm.updated) >= authored, `${rel}: updated ${fm.updated} precedes its head's author time`);
checked++;
// floor: once any schema-2 gate exists in the corpus, checked must be ≥ 1 — a scan that finds only schema-1 gates says so and passes
```
Mutation fixtures live under `tests/fixtures/gate-head/` and are read by a second test in the same file (a future-dated `updated:` → red; missing `head:` → red), so the corpus test's assertions are proven live without touching a real gate.

5c § D row: *"`updated:` earlier than the author time of the commit `head:` names (`git log -1 --format=%aI <head>`) — the gate claims to predate the tree it judged (task.130 5c PC-2)"*; drop the mtime comparison.

CHANGELOG [Unreleased] › Changed, with a **Breaking:** marker for `schema: 2`.

## Key Patterns and References

- `qa-re-review-scope.md`'s own rule that the snippet is stated once and pasted verbatim into both skills — do not edit the skills first.
- `probe-base-binding.test.mjs` — extract a fenced block by a comment anchor and execute it under both shells; the pattern for the new scope test.
- Task.130 Decisions Log cycles 4–7: each scope line reads *"scope rebuilt from `<hash>`"* — the behaviour this task makes the rule.
- Task.52's rationale in `qa-task` Phase 0 for why the trigger must fail toward re-review.

## Testing Approach

Phase 1: write one gate through the updated skill on a scratch task and read `head:`/`updated:` back. Phase 2: the executed scope test (bash + zsh; future-dated gate; schema-1 gate); the trigger test with a future-dated gate flips from skip to re-review. Phase 3: the corpus test plus its two fixture mutations. Throughout: `npm run ci:fast`, `npm run eval:develop-task`, `npm run eval:develop-story`, `npm run bundle -- --check`, `npm run lint:shell`.
