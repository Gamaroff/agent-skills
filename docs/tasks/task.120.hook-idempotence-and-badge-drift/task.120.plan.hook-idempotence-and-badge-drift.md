---
id: task.120.plan
title: "Implementation Plan: the pause hook, the hook installer and the README badge each rely on a human remembering"
type: plan
task-ref: task.120.hook-idempotence-and-badge-drift.md
---

# Implementation Plan: the pause hook, the hook installer and the README badge each rely on a human remembering

> Requirements and success criteria: [task.120.hook-idempotence-and-badge-drift.md](task.120.hook-idempotence-and-badge-drift.md)

## Overview

Three independent one-file mechanisms, each with a test that goes red when the mechanism is reverted. Edit `shared/resources/` sources only — never the bundled `references/` or `skills/*/scripts/*.sh` shims — then `npm run bundle`.

## Phase-by-Phase Implementation Guide

### Phase 1: Atomic pause claim and a marked PR comment

**Files to modify:**
- `shared/resources/develop-pipeline-on-precompact.sh` — the check at `:84-86`, the trap at `:99`, the PR comment at `:200-226`
- `shared/resources/develop-pipeline-on-precompact.test.sh` — new cases
- `shared/resources/develop-pipeline-pause.md` — one paragraph

**Exact changes:**

Today (`:81-99`):

```bash
if [ ! -f "$LOCK" ]; then
  emit_empty
fi
write_pause_snapshot
trap 'rm -f "$LOCK"' EXIT
```

After:

```bash
# The claim. `mv` on one filesystem is atomic: of N concurrent runs exactly one
# renames the lock; every other run's mv fails ENOENT and takes the noop path.
# $$ keeps a stale claim from a killed run from ever blocking the next pause.
CLAIM="${LOCK}.pausing.$$"
if ! mv "$LOCK" "$CLAIM" 2>/dev/null; then
  emit_empty
fi
# Only the winner reaches this line, and a loser never owns a claim file — so
# every OTHER .pausing.* here belongs to a killed run. Sweep them now, or
# .claude/state/ accumulates one per crash forever. (No nullglob in bash 3.2:
# with no match the loop sees the literal pattern, and rm -f of it is a noop.)
for stale in "$LOCK".pausing.*; do
  [ "$stale" = "$CLAIM" ] || rm -f "$stale"
done
LOCK="$CLAIM"                       # every later read (jq -r … "$LOCK") and the trap use the claimed copy
write_pause_snapshot
trap 'rm -f "$LOCK"' EXIT
```

`write_pause_snapshot` copies `$LOCK` to `$SNAPSHOT` — it reads the variable, so it follows the rename with no change. Check the `jq -r '.skill' "$LOCK"` reads at `:119-121` do the same (they do; they use `$LOCK`). The degraded `rm -f "$LOCK"` at `:127` and the final one at `:264` also follow. `SNAPSHOT` and `STATE_DIR` are derived from `$LOCK` *before* the reassignment (`:50`, `:56`), so they keep pointing at the real state directory. Never sweep *before* the `mv`: a `rm -f "$LOCK".pausing.*` from a loser that started a beat later would delete the winner's claim.

PR comment (`:200-211`): prefix the body with the marker and post idempotently.

```bash
MARKER="<!-- agent-skills-comment:pipeline-paused-${CURRENT_STEP} -->"
printf '%s\n%s\n\n---\n\n%s\n' "$MARKER" "$LEAD" "$PR_BODY" > "$PR_BODY_FILE"
EXISTING=$(gh pr view "$PR_URL" --json comments \
  -q ".comments[] | select(.body | startswith(\"$MARKER\")) | .url" 2>/dev/null | head -1 | grep -oE '[0-9]+$')
if [ -n "$EXISTING" ]; then
  tracker_write gh api -X PATCH "/repos/{owner}/{repo}/issues/comments/$EXISTING" -F "body=@$PR_BODY_FILE"
else
  tracker_write gh pr comment "$PR_URL" --body-file "$PR_BODY_FILE"
fi
```

The marker family is `tracker-comment.js`'s (`agent-skills-comment:<stage>`, `markerHtml` at `:280`); the find-then-edit recipe is `finalise` Step 7's (`finalise/SKILL.md:1312-1320`). The marker goes **first**, before `$LEAD` — `finalise:1298-1301` records that a lead inserted above the marker makes `startswith` miss and produces the duplicate this is meant to prevent. Resolve `{owner}/{repo}` the way `finalise` does (`gh repo view --json owner,name`). Keep `TRACKER_WRITE_KIND=github.pr.comment` on both arms so the deferral journal is unchanged — `tracker_write` records any `gh …` argv generically, so the `gh api -X PATCH` arm needs no gate change.

Two properties to state in the `develop-pipeline-pause.md` paragraph: (1) `gh pr view --json comments` is a **partial read** — no paging, which is why `tracker-comment.js:399-420` moved its own search to `gh api --paginate`; accepted here as `finalise` accepts it, because a PR busy enough to page the marker out of view is not a case the pause hook has met. (2) A second pause at the **same** step edits the earlier PR comment in place, while the issue arm (`tracker-comment.js`, stage `pipeline-paused-<step>`) reports `already` and posts nothing; the implementation report keeps every pause, so nothing is lost — but a reader of the PR should know the comment is the *latest* pause at that step, not the first.

**Tests** (`develop-pipeline-on-precompact.test.sh` already builds a temp repo with a stub `gh`/`git`/`node` on PATH — follow its `setup` helper):

- `two_concurrent_runs_produce_one_of_everything`: `bash "$HOOK" & bash "$HOOK" & wait`; assert `ls "$STATE/"*.last-halt.json | wc -l` = 1, `grep -c '^## Pipeline Paused' "$REPORT"` = 1, the stub `gh` call log has one `pr comment`, the stub tracker-comment log has one call; both exit codes 0.
- `stale_claim_does_not_block`: pre-create `$LOCK.pausing.99999`; run once; assert the pause completes **and** the stale file is gone.
- `marker_makes_second_post_an_edit`: seed the stub `gh pr view --json comments` with a marked comment; assert the log shows `api -X PATCH`, not `pr comment`.

**Mutation**: replace `mv` with `cp` + `[ -f ]` → the concurrency test must go red (two blocks).

### Phase 2: Installer dedupes by identity and heals

**Files to modify:**
- `shared/resources/develop-pipeline-install-hooks.sh` — `patch_hook` (`:122-150`), `unpatch_hook_exact` (`:193`) and its candidate loop (`:237-240`), call sites (`:242-246`)
- `shared/resources/develop-pipeline-install-hooks.test.sh` — new
- `package.json` — `scripts.test` glob entry (shell suites run via `bash …test.sh`; see how `develop-pipeline-on-precompact.test.sh` is wired and mirror it)

**Exact changes:**

The installer already carries one healer for spelling drift — `unpatch_hook_exact` (`:193`), looped over every candidate base at `:237-240` to strip the legacy **bare-relative** `bash <candidate>/on-precompact.sh`. It is exact-string, so the `${CLAUDE_PROJECT_DIR}`-quoted `.claude/skills/` form in `.claude/settings.json.bak-2026-09-16` slipped past it. Do not add a second healer beside it; replace both with one rule on identity.

```bash
# The identity of a hook is <skill>/scripts/<hook>.sh — the same script whether it
# is reached bare-relative or via "${CLAUDE_PROJECT_DIR}/", through .claude/skills
# or .agents/skills (symlinks in this repo, a copy in a consumer). Every spelling
# is one hook; the harness runs all of them in parallel.
hook_identity() {
  printf '%s' "$1" | sed -E 's#^bash +##; s#^"?\$\{CLAUDE_PROJECT_DIR\}/##; s#^\.(claude|agents)/skills/##; s#"$##'
}
```

In `patch_hook`, replace the `index($cmd)` string test with a loop over `[.hooks[$event][]?.hooks[]?.command]` comparing `hook_identity` values (bash 3.2: a `while read` over `jq -r '.hooks[$event][]?.hooks[]?.command'`). Before adding, heal by **identity equal, command different** — no prefix case, no regex, no escaping:

```bash
heal_hook() {   # remove every entry for the same identity that is not spelled exactly $cmd
  local event="$1" cmd="$2" id c
  id=$(hook_identity "$cmd")
  while IFS= read -r c; do
    [ -n "$c" ] || continue
    [ "$c" = "$cmd" ] && continue
    [ "$(hook_identity "$c")" = "$id" ] || continue
    unpatch_hook_exact "$event" "$c" "removing duplicate spelling"
  done < <(jq -r --arg event "$event" '.hooks[$event][]?.hooks[]?.command' "$SETTINGS_FILE")
}
heal_hook "PreCompact" "$PRECOMPACT_CMD"; patch_hook "PreCompact" "$PRECOMPACT_CMD"
heal_hook "Stop"       "$STOP_CMD";       patch_hook "Stop"       "$STOP_CMD"
```

`unpatch_hook_exact` already matches on `==`, prints, and honours `--dry-run`; give it an optional third arg for the label (default stays `removing legacy pre-CLAUDE_PROJECT_DIR hook`). **Delete the `for c in "${CANDIDATES[@]}"` loop at `:237-240`** — the bare-relative form it strips is one more spelling of the identity, and `heal_hook` now removes it. The `PostToolUse`/`on-skill-return.sh` `unpatch_hook` at `:246` is a different hook, not a spelling; leave it.

**Tests**: fixture settings.json = this repo's pre-fix shape (both quoted spellings for PreCompact and Stop) **plus** the legacy bare-relative `bash .claude/skills/develop-story/scripts/on-precompact.sh` (the form the retired loop covered — its coverage must not regress), plus an unrelated `PostToolUse` hook and a `permissions` block. Run with `--settings "$TMP"`: assert `jq '.hooks.PreCompact | length'` = 1 and the survivor is the `$BASE` (`.agents/skills`) spelling; assert `jq 'del(.hooks)'` and the `PostToolUse` entry byte-identical before/after; run again → no diff; `--dry-run` prints the prune and changes nothing.

**Mutation**: make `hook_identity` return its input unchanged → the fixture ends with three entries → red. A second mutation for the retired loop: drop the bare-relative row from the healer's reach (e.g. `hook_identity` stops stripping `bash `) → red.

### Phase 3: The badge is generated

**Files to modify:**
- `skills/create-skill/scripts/generate_catalog.py` — `main()` (`:218-223`, positional `sys.argv` only today) and after `output_file` is written (`:214`)
- `.github/workflows/validate.yml` — the diff at `:76` and both trigger lists (`on.pull_request.paths` `:5-20`, `on.push.paths` `:22-30`)
- `README.md` — generated
- a test: `tests/generate-catalog-badge.test.js` (node --test, runs the script with `--readme <fixture>`), or a Python test if the generator already has one (check `skills/create-skill/scripts/` for `test_*.py` first)

**Exact changes:**

```python
BADGE = re.compile(r"(img\.shields\.io/badge/skills-)\d+(-)")

def update_readme_badge(readme: Path, total: int) -> bool:
    text = readme.read_text()
    new, n = BADGE.subn(rf"\g<1>{total}\g<2>", text, count=1)
    if n == 0:
        print(f"⚠️  {readme}: no skills badge line found — left untouched", file=sys.stderr)
        return False
    if new != text:
        readme.write_text(new)
        print(f"✅ README badge → skills-{total}")
    return new != text
```

`main()` reads `sys.argv[1]` / `sys.argv[2]` positionally, so a `--no-readme` today would be taken as the skills dir. Switch to `argparse`: `skills_dir` and `output_file` as optional positionals (`nargs="?"`, today's defaults), `--no-readme` (store_true) and `--readme PATH` (default `repo_root / "README.md"`). `npm run generate-catalog` (no args) and the CI step keep working unchanged. Call `update_readme_badge(args.readme, total)` after the catalog write unless `--no-readme`; the test passes `--readme <fixture>`.

`validate.yml:76`: `if ! git diff --quiet docs/reference/skill-catalog.md README.md; then` and widen the error text to name both files. **And** add `- 'README.md'` to `on.pull_request.paths` and `on.push.paths` — the workflow is path-filtered, so without the trigger a hand-edit of the badge runs no check at all; the file's own comment on `skill-dependencies.json` (`:8-10`) is the precedent. Three lines, not one.

Run `python3 skills/create-skill/scripts/generate_catalog.py` once → `README.md:5` becomes `skills-128-`; commit it with Phase 3.

**Tests**: fixture README with `skills-126-` → `skills-128-` given a catalog of 128 (or pass the count through the fixture skills dir the existing generator tests use); fixture without the badge → unchanged, stderr warning, exit 0.

**Mutation**: comment out the `update_readme_badge` call → red.

## Key Patterns and References

- Marker family and find-then-edit: `shared/resources/tracker-comment.js`; `finalise` SKILL.md Step 7 (`<!-- finalise-canonical-summary -->`); `review-pr` Step 8 (`<!-- agent-skills-pr-review -->`)
- Existing healer to reuse: `unpatch_hook` in `develop-pipeline-install-hooks.sh:159`
- Test harness to follow: `develop-pipeline-on-precompact.test.sh` (temp repo, stubbed binaries on PATH, `PIPELINE_LOCK` env override)
- The atomic-`mv` idiom in bash 3.2 (no `flock` on macOS) — same reasoning as `observation-log.js`'s `wx` create for ids
- Edit sources, then `npm run bundle`; `bundle --check` must be clean (project memory: bundling silently reverts fixes made only to `references/`)

## Testing Approach

- All three suites hermetic: temp dirs, stubbed `gh`/`git`/`node`, fixture README; nothing touches the real settings file, PR or README
- Each mechanism has a named mutation that turns exactly its test red; record `covered` per mechanism in the implementation report
- `npm test` runs all three (add the globs); `shellcheck` on both shell scripts; `bundle --check`; `prettier --check`
- Final: `python3 skills/create-skill/scripts/generate_catalog.py && git diff --quiet docs/reference/skill-catalog.md README.md` — the CI step, green locally
