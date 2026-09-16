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
- `shared/resources/develop-pipeline-on-precompact.sh` — the check at `:84-86`, the trap at `:99`, the PR comment at `:200-224`
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
LOCK="$CLAIM"                       # every later read (jq -r … "$LOCK") and the trap use the claimed copy
write_pause_snapshot
trap 'rm -f "$LOCK"' EXIT
```

`write_pause_snapshot` copies `$LOCK` to `$SNAPSHOT` — it reads the variable, so it follows the rename with no change. Check the `jq -r '.skill' "$LOCK"` reads at `:116-125` do the same (they do; they use `$LOCK`). The degraded `rm -f "$LOCK"` at `:125` also follows.

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

The marker family is `tracker-comment.js`'s (`agent-skills-comment:<stage>`); the find-then-edit recipe is `finalise` Step 7's. Resolve `{owner}/{repo}` the way `finalise` does (`gh repo view --json owner,name`). Keep `TRACKER_WRITE_KIND=github.pr.comment` on both arms so the deferral journal is unchanged.

**Tests** (`develop-pipeline-on-precompact.test.sh` already builds a temp repo with a stub `gh`/`git`/`node` on PATH — follow its `setup` helper):

- `two_concurrent_runs_produce_one_of_everything`: `bash "$HOOK" & bash "$HOOK" & wait`; assert `ls "$STATE/"*.last-halt.json | wc -l` = 1, `grep -c '^## Pipeline Paused' "$REPORT"` = 1, the stub `gh` call log has one `pr comment`, the stub tracker-comment log has one call; both exit codes 0.
- `stale_claim_does_not_block`: pre-create `$LOCK.pausing.99999`; run once; assert the pause completes.
- `marker_makes_second_post_an_edit`: seed the stub `gh pr view --json comments` with a marked comment; assert the log shows `api -X PATCH`, not `pr comment`.

**Mutation**: replace `mv` with `cp` + `[ -f ]` → the concurrency test must go red (two blocks).

### Phase 2: Installer dedupes by identity and heals

**Files to modify:**
- `shared/resources/develop-pipeline-install-hooks.sh` — `patch_hook` (`:122-150`), call sites (`:242-246`)
- `shared/resources/develop-pipeline-install-hooks.test.sh` — new
- `package.json` — `scripts.test` glob entry (shell suites run via `bash …test.sh`; see how `develop-pipeline-on-precompact.test.sh` is wired and mirror it)

**Exact changes:**

```bash
# The identity of a hook is <skill>/scripts/<hook>.sh — the same script whether it
# is reached through .claude/skills or .agents/skills (symlinks in this repo, a copy
# in a consumer). Two spellings are one hook; the harness runs both in parallel.
hook_identity() {
  printf '%s' "$1" | sed -E 's#^bash "?\$\{CLAUDE_PROJECT_DIR\}/##; s#^\.(claude|agents)/skills/##; s#"$##'
}
```

In `patch_hook`, replace the `index($cmd)` string test with a loop over `[.hooks[$event][]?.hooks[]?.command]` comparing `hook_identity` values. Before adding, heal:

```bash
heal_hook() {   # remove any entry for the same identity under the OTHER prefix
  local event="$1" cmd="$2" id other
  id=$(hook_identity "$cmd")
  case "$cmd" in *".agents/skills/"*) other='\\.claude/skills/' ;; *) other='\\.agents/skills/' ;; esac
  unpatch_hook "$event" "${other}$(printf '%s' "$id" | sed 's/[.]/\\./g')"
}
heal_hook "PreCompact" "$PRECOMPACT_CMD"; patch_hook "PreCompact" "$PRECOMPACT_CMD"
heal_hook "Stop"       "$STOP_CMD";       patch_hook "Stop"       "$STOP_CMD"
```

`unpatch_hook` already prints `removing obsolete hook (…)` and honours `--dry-run`; reword its echo to `removing duplicate spelling` when called from `heal_hook` (pass a third arg for the label).

**Tests**: fixture settings.json = this repo's pre-fix shape (both spellings for PreCompact and Stop, plus an unrelated `PostToolUse` hook and a `permissions` block). Run with `--settings "$TMP"`: assert `jq '.hooks.PreCompact | length'` = 1 and the survivor is the `.agents/skills` spelling; assert `jq 'del(.hooks)'` byte-identical before/after; run again → no diff; `--dry-run` prints the prune and changes nothing.

**Mutation**: make `hook_identity` return its input unchanged → the fixture ends with two entries → red.

### Phase 3: The badge is generated

**Files to modify:**
- `skills/create-skill/scripts/generate_catalog.py` — after `output_file` is written (`:214`)
- `.github/workflows/validate.yml` — `:76`
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

Call it with `total` after the catalog write unless `--no-readme`; `--readme PATH` overrides the default `README.md` at the repo root (used by the test with a fixture).

`validate.yml:76`: `if ! git diff --quiet docs/reference/skill-catalog.md README.md; then` and widen the error text to name both files.

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
