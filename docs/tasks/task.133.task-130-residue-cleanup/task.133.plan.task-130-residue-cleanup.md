---
id: task.133.plan
title: "Implementation Plan: Residue of task.130's seven QA cycles"
type: plan
task-ref: task.133.task-130-residue-cleanup.md
---

# Implementation Plan: Residue of task.130's seven QA cycles

> Requirements and success criteria: [task.133.task-130-residue-cleanup.md](task.133.task-130-residue-cleanup.md)
>
> **Review 1 (2026-09-30) changed three things below; where this plan and the task disagree, the task wins.** Phase 1 also fixes the header bullet at `advance-pipeline-lock.sh:70-72` ("an ABSENT directory … matches"). Phase 3's listing fence is already `find`-based (task.137) — it gets a test, not a rewrite. Phase 5 is a cross-revision append-only check, not a writer-side throw: `upsertChangeLog` keeps all six rows on the `fdba78d9~1` shape (executed), so the guard below could never fire.

## Overview

Eleven small fixes grouped into five file-scoped phases, each shipped with an executed test or a mutation proof. Nothing here changes what the code does on a well-formed input except Phase 5's shrink guard, which turns a silent loss into a throw.

## Phase-by-Phase Implementation Guide

### Phase 1: Lock script

**Files to modify:**
- `shared/resources/advance-pipeline-lock.test.sh` — the third cycle-7 scenario (comment *"A candidate that already names a directory keeps its own under the flag"*)
- `shared/resources/advance-pipeline-lock.sh` — the `legacy-snapshot:` echo inside `choose_candidate()`'s loop; the final no-candidate branch; header bullets
- `shared/resources/grant-qa-cycles.sh` header (the bullets describing what `--restore` rebuilds); `shared/resources/develop-pipeline-pause.md` § the paragraph naming `--which` / `--accept-legacy`

**Exact changes:**

```bash
# test — seed a canon-equal, textually different spelling, written FROM $R
( cd "$R" && printf '{"task_or_story_directory":"./doc/","current_step":4}\n' > "$S" )
PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$S" "$SH" "$SCRIPT" --restore --accept-legacy "$R/doc" >/dev/null 2>&1
[ "$(jq -r '.task_or_story_directory' "$L")" = "./doc/" ]   # NOT "$R/doc" — the candidate's own spelling survives
```
Mutation: replace the fill with `.task_or_story_directory = $dir` → this scenario red under both shells (today it stays green).

Advice placement: keep the loop's line as `echo "advance-pipeline-lock: '$c' carries no task_or_story_directory — skipped (legacy)" >&2`; in the branch that reaches *"no halt snapshot or orphaned claim is for …"* with `legacy=1`, append the existing advice sentence. Scenario: matched `.pausing.*` claim + newer legacy `last-halt.json`, no flag → exit 0, lock from the claim, `! grep -q -- '--accept-legacy' <<<"$ERR"`.

Header/prose clause (three mirrors, same sentence): *"A candidate with no `task_or_story_directory` is refused without `--accept-legacy`; under the flag the rebuilt lock is stamped with `<doc-dir>` as passed, so every snapshot derived from it is a matched candidate — a present value is never overwritten."*

### Phase 2: Contract delete block

**Files to modify:** `shared/resources/develop-pipeline-resume-contract.md` § Consume Output (both fences); `shared/resources/tests/stale-snapshot-delete.test.mjs`

**Exact changes:**

Pass 2, before the directory read:
```bash
  jq -e 'type == "object"' "$p" >/dev/null 2>&1 \
    || { echo "HALT: $p is not a JSON object — cannot read its evidence; the detector mislabelled it; nothing deleted"; exit 1; }
  SNAP_DIR=$(jq -r '.task_or_story_directory // ""' "$p")
```
(keep the existing directory HALT; its `${SNAP_DIR:-absent}` now means "parsed, no field" only).

Unrecognised-label pass, after `STALE_PATHS` is materialised:
```bash
printf '%s' "$DETECTOR_JSON" | jq -r '[ .deltas_since_pause[] | select(type == "object") | (.concern // "")
  | select(startswith("stale-snapshot") and . != "stale-snapshot: PR merged"
           and (startswith("stale-snapshot check skipped") | not)) ] | .[]' \
  | while IFS= read -r c; do echo "unrecognised stale-snapshot label — kept: '$c'"; done
```
(the two skip notes are `stale-snapshot check skipped — …`; the prefix test on the skip form is what keeps them silent, as today).

Quoting: `mkdir -p "{doc-directory}/.summaries"`, `cat > "{doc-directory}/.summaries/step-0a-resume-detector.json"`, `DETECTOR_JSON=$(cat "{doc-directory}/.summaries/…")`, `DETECTOR_FILE="{doc-directory}/.summaries/…"`.

Tests (extend `run()`'s snapshot options): `snapshotRaw: '{not json'` → new text; `snapshotRaw: '{"pr_url":"…"}'` → old text; `concern: "stale-snapshot: PR merged "` and `"stale-snapshot: <p> — PR merged; deleted"` → the `kept:` line, file present; `docDir` containing a space → A passes under both shells.

### Phase 3: Detector prompt

**Files to modify:** `shared/resources/pipeline-resume-detector-prompt.md` (Step 1 items 1 and 3; the listing fence); new `shared/resources/tests/detector-candidate-rule.test.mjs`

**Exact changes:** Step 1 item 1 gains: *"A candidate with **no** `task_or_story_directory` is a pre-task.123 snapshot: drop it and file `{ "path": "<it>", "concern": "legacy snapshot (no task_or_story_directory) — restore deliberately with --restore --accept-legacy, or delete" }`."* Item 3: *"Among the remaining candidates a directory-matched `.pausing.*` claim outranks `last-halt.json` **regardless of mtime**; only among candidates of the same provenance does the newest win — the same ranking `advance-pipeline-lock.sh` `choose_candidate()` applies, which is the authority; if in doubt run `--restore --which <doc-dir>` and report what it names."* Listing fence: already `find .claude/state -maxdepth 1 \( -name "develop-pipeline.last-halt.json" -o -name "develop-pipeline.lock.pausing.*" \) -exec ls -t {} + 2>/dev/null || true` (`:81`, task.137) — leave it. Test: extract the fence, run under `zsh -f` and `bash --noprofile --norc` in a scratch dir with only `last-halt.json` present → stdout names it; mutation: the pre-task.137 `ls -t … .pausing.*` form → empty under zsh. Prose assertions anchored on two new HTML markers `<!-- candidate-rule: legacy -->` / `<!-- candidate-rule: provenance -->`, and the script's suite names `provenance-first ranking` and `legacy snapshot refused` scenarios (grep the `.test.sh` for the `pass` labels).

### Phase 4: Citations and messages

**Files to modify:** step-0 § 0b paragraph; `skills/develop-{task,story,bug}/SKILL.md` Step 0-lock paragraphs; `develop-pipeline-step-8-commit.md` lint block; the three SKILL.md lint sites; three tests.

**Exact changes:** the `--restore` sentence at each of the four sites becomes *"**When** resume contract § Restore the lock (both resume paths) says the restore runs here — and only then — run, before Phase 0b verification: `advance-pipeline-lock.sh --restore {doc-directory}`."* `who-restores-single-statement.test.mjs` (ii): each site's `--restore` mention is preceded within the same sentence by `When … § Restore the lock`.

Lint `2)` arm, step-8: *"2) report-lint refused its inputs (exit 2): read the `report-lint:` line above — unknown argument, `--file` missing or unreadable, bad `--variant`, or an unreadable template. Fix the call or the path; the report itself was not judged."* The three SKILL.md sites: *"2) see `develop-pipeline-step-8-commit.md` lint arm 2)"*. `report-lint-call-sites.test.mjs`: parse every `usage(` message in `report-lint.js`, assert step-8's sentence names each cause class; assert each SKILL.md `2)` arm cites step-8.

Test D: replace the negative regex with
```js
const tokens = [...citation[0].matchAll(/`(stale-snapshot[^`]*)`/g)].map(m => m[1]);
const allowed = t => t === "stale-snapshot: PR merged" || t.startsWith("stale-snapshot check skipped");
assert.deepEqual(tokens.filter(t => !allowed(t)), [], `${rel} names a stale-snapshot token other than the exact label or a skip note`);
```
Mutations: `` `stale-snapshot*` `` → red; the sentence *"the two skip notes share the prefix"* (no backticked token) → green.

### Phase 5: change-log append-only check

**Files to modify:** `shared/resources/change-log.js`; `shared/resources/tests/change-log.test.mjs`; `shared/resources/pr-conformance-prompt.md` § C. TRAIL

**Exact changes:**
```js
// rows of prev's Change Log that next no longer carries — the reader the writer uses, both sides
function rowsDropped(prevContent, nextContent) {
  const key = (e) => fmtEntry(e).trim();
  const next = new Set(extractEntries(nextContent).map(key));
  return extractEntries(prevContent).map(key).filter((r) => !next.has(r));
}
```
(Confirm `extractEntries`' return shape before writing `key` — if it returns raw rows, compare trimmed rows; the point is one reader for both sides.) CLI: `--check-append-only --file <doc> --against <rev>` → `git show <rev>:<doc>` via `execFileSync` (no shell); absent at `<rev>` → `{reason:"new-document"}` exit 0; dropped → print each, `{reason:"rows-dropped", dropped:[…]}` exit 1; none → `{reason:"ok"}` exit 0.

Fixture: the task.130 document at `fdba78d9~1` and at `fdba78d9`, trimmed to the Change Log block plus enough frontmatter to parse, committed as test fixtures — assert six dropped rows. Mutation: `rowsDropped` → `() => []` → red.

`pr-conformance-prompt.md` § C. TRAIL: *"the Change Log lost rows since the base — run `change-log.js --check-append-only --file <doc> --against <merge-base>`; any dropped row is a trail defect"*.

## Key Patterns and References

- `develop-pipeline-step-8-commit.md`'s `jq -e 'type == "object"'` arm — the shape Phase 2 mirrors.
- `advance-pipeline-lock.sh` `canon()` — why `./doc/` and `$R/doc` compare equal and why the stamp keeps the candidate's spelling.
- `stale-snapshot-delete.test.mjs` `run()` — extend its options rather than adding a harness; every scenario already runs under both shells.
- `docs/reference/anti-patterns.md` — enumeration class; Phases 3 and 4 are its instances.

## Testing Approach

One commit per phase; before each commit: the phase's mutation proof (cp snapshot → mutate → predicted red → restore → baseline green), `npm run ci:fast`, the shell suites, `npm run bundle -- --check`, `npm run lint:shell`. Phase 5 additionally: run `--check-append-only --against origin/develop` over every tracked document carrying `<!-- change-log-start -->` and record the count (a corpus non-vacuity check before the lens cites it).
