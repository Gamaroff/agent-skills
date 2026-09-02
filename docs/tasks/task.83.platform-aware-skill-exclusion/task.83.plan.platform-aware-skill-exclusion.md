---
id: task.83.plan
title: "Implementation Plan: Platform-aware skill exclusion in setup-consumer.sh"
type: plan
task-ref: task.83.platform-aware-skill-exclusion.md
---

# Implementation Plan: Platform-aware skill exclusion in setup-consumer.sh

> Requirements and success criteria: [task.83.platform-aware-skill-exclusion.md](task.83.platform-aware-skill-exclusion.md)

## Overview

Add two pure helper functions and one branch inside the existing copy loop of `install_skills()`. The classification lives in two shell constants; the resolver reads `skills-config.yaml` first so the `--update` path (which never runs the wizard) resolves correctly. An excluded skill that is already on disk is kept, never deleted.

---

## Phase-by-Phase Implementation Guide

### Phase 1 — Classification and resolver

**Files to modify:** `scripts/setup-consumer.sh` — insert after the `SKILLS_API` constant at line 730, before `_resolve_skills_version()` at 732.

**Exact changes:**

```bash
SKILLS_REPO="https://github.com/Gamaroff/agent-skills"
SKILLS_API="https://api.github.com/repos/Gamaroff/agent-skills/releases/latest"

# ── platform-scoped skills ───────────────────────────────────────────────────
# Skills that exist only for one tracker. Installing the other tracker's set is
# not merely wasted disk: both siblings carry near-identical `description`
# fields, and description text is what drives skill auto-activation, so the
# wrong-platform sibling is a live mis-selection risk.
#
# MAINTENANCE: setup-consumer-skill-exclusion.test.mjs asserts every
# skills/*jira* and skills/*github* directory appears in exactly one list.
# A new tracker skill fails CI until it is classified here.
SKILLS_JIRA_ONLY="ensure-epic-jira-issue
ensure-story-jira-issue
ensure-task-jira-issue
sync-jira-epic
sync-jira-story
sync-jira-task
jira-epic-creator
jira-sprint-manager
jira-sprint-retrospective
jira-sprint-review-prep
jira-standup-auditor"

SKILLS_GITHUB_ONLY="ensure-epic-github-issue
ensure-story-github-issue
ensure-task-github-issue
sync-github-epic
sync-github-story
sync-github-task"
```

> **Do not add anything to these lists on the `vcs:` axis.** `create-pr`, `create-branch` and `create-issue` serve GitHub *and* Bitbucket from one skill by sourcing `resolve-platform.sh` internally. There is no per-VCS sibling to exclude, and excluding on `vcs` would remove a skill the consumer needs.

Then the resolver:

```bash
# Resolve which tracker this install targets.
#
# Order matters and is asserted by test. `skills-config.yaml` is FIRST because
# `main()` calls install_skills at line 1115 on the --update path and returns
# before select_platform (line 1120) ever runs — so on the path consumers use
# most, $TRACKER is unset. A resolver that trusted $TRACKER first would be
# silently inert exactly where it is needed.
#
# The .env probe is LAST because a stale JIRA_URL outlives the setup that wrote
# it, and trusting it over an explicit `tracker: github` would exclude the six
# GitHub-sync skills the consumer actually uses.
#
# Unresolvable → "" → exclude nothing. Deliberate: 119 skills is a working
# install; 108 of the wrong 108 is not.
_resolve_install_tracker() {
  local _t=""

  # 1. skills-config.yaml scalar `tracker:` (ignore the map form — `tracker:`
  #    with a nested workflowFile carries no platform identity)
  if [[ -f skills-config.yaml ]]; then
    _t=$(awk '/^tracker:[[:space:]]*[a-z]/ {print $2; exit}' skills-config.yaml 2>/dev/null || true)
  fi

  # 2. wizard answer, when select_platform has run in this process
  [[ -z "$_t" && -n "${TRACKER:-}" ]] && _t="$TRACKER"

  # 3. a JIRA_URL in .env implies Jira
  if [[ -z "$_t" && -f .env ]]; then
    grep -qE '^JIRA_URL=.+' .env 2>/dev/null && _t="jira"
  fi

  case "$_t" in
    jira|github) printf '%s' "$_t" ;;
    *)           printf '' ;;
  esac
}

# Return 0 (excluded) when $1 cannot fire under tracker $2.
_skill_excluded_for_tracker() {
  local _name="$1" _tracker="$2"
  [[ "${ALL_SKILLS:-false}" == true ]] && return 1
  case "$_tracker" in
    github) grep -qxF "$_name" <<<"$SKILLS_JIRA_ONLY"   && return 0 ;;
    jira)   grep -qxF "$_name" <<<"$SKILLS_GITHUB_ONLY" && return 0 ;;
  esac
  return 1
}
```

`grep -qxF` matches a whole line, fixed-string — so `sync-jira-epic` never matches a hypothetical `sync-jira-epic-v2`.

**Placement constraint:** both functions must sit above line 1135's `[[ -n "${SETUP_CONSUMER_NO_MAIN:-}" ]] || main "$@"`. Anything below it is unreachable to the test harness.

---

### Phase 2 — Wire the filter into the copy loop

**Files to modify:** `scripts/setup-consumer.sh` — flag parser at line 41; `install_skills()` at 755.

**Flag parser** (add alongside `--dry-run` / `--update`):

```bash
ALL_SKILLS=false
# in the while/case block at line 41:
    --all-skills) ALL_SKILLS=true; shift ;;
```

Update the usage header comment at line 17:

```bash
#   bash scripts/setup-consumer.sh --all-skills  # install every skill, no platform filter
```

**The copy loop.** Replace the block starting at the `for _skill_dir` line:

```bash
      mkdir -p .agents/skills
      local _tracker; _tracker=$(_resolve_install_tracker)
      local _installed=0 _updated=0 _skipped=0 _kept=0

      if [[ -n "$_tracker" && "$ALL_SKILLS" != true ]]; then
        info "Filtering skills for tracker: ${_tracker}"
      fi

      for _skill_dir in "$_tmpdir"/skills/*/; do
        [[ -f "${_skill_dir}SKILL.md" ]] || continue
        local _name; _name=$(basename "$_skill_dir")

        if _skill_excluded_for_tracker "$_name" "$_tracker"; then
          # GRANDFATHER: an excluded skill that is already installed is KEPT.
          # This branch must be evaluated BEFORE the rm -rf below — reordering
          # it silently deletes a skill from a working install, which is the
          # one outcome this task must never produce.
          if [[ -d ".agents/skills/${_name}" ]]; then
            info "  kept     ${_name} (already installed; not pruned)"
            (( _kept++ )) || true
          else
            (( _skipped++ )) || true
          fi
          continue
        fi

        if [[ -d ".agents/skills/${_name}" ]]; then
          rm -rf ".agents/skills/${_name}"
          cp -r "$_skill_dir" ".agents/skills/${_name}"
          info "  updated  ${_name}"
          (( _updated++ )) || true
        else
          cp -r "$_skill_dir" ".agents/skills/${_name}"
          info "  new      ${_name}"
          (( _installed++ )) || true
        fi
      done
```

> The `continue` after the grandfather branch is what protects the kept skill. Without it, control falls into the `rm -rf` — an easy edit to make later and the reason the comment names the ordering explicitly.

**Reporting.** Extend the existing `ok` line and `record_step` detail:

```bash
      local _detail="${_installed} new, ${_updated} updated"
      (( _skipped > 0 )) && _detail="${_detail}, ${_skipped} skipped (${_tracker})"
      (( _kept > 0 ))    && _detail="${_detail}, ${_kept} kept"
      ok "Skills ${_version} installed into .agents/skills/ (${_detail})"
```

and when `_kept > 0`, a `record_warning` pointing at `--all-skills` and at task 84's config keys, so the consumer learns why an inapplicable skill is still on disk.

**Dry-run parity.** The `DRY_RUN` branch currently prints one line and returns. It must resolve the tracker and run the same predicate over the tarball listing, or `--dry-run` will under-report. Integration case 5 asserts this.

---

### Phase 3 — Tests

**File:** `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`

Follow the harness already used by `setup-consumer-config.test.mjs`: source the script with `SETUP_CONSUMER_NO_MAIN=1` and call functions from `bash -c`.

```js
import { execFileSync } from 'node:child_process';

const SCRIPT = 'scripts/setup-consumer.sh';

function callFn(snippet, { cwd = process.cwd(), env = {} } = {}) {
  return execFileSync('bash', ['-c',
    `set -euo pipefail
     export SETUP_CONSUMER_NO_MAIN=1
     source "$OLDPWD/${SCRIPT}"
     ${snippet}`
  ], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' }).trim();
}
```

**Test cases:**

1. **Classification, both directions.** For each of the 11 Jira names assert excluded under `github` and not under `jira`; mirror for the 6 GitHub names.
2. **Never-exclude set.** `create-pr`, `create-branch`, `create-issue`, `develop-story`, `finalise` are not excluded under either tracker. This is the `vcs`-axis guard.
3. **Resolver order — the `--update` case.** In a temp dir with `skills-config.yaml` saying `tracker: github` and `TRACKER=jira` exported, `_resolve_install_tracker` returns `github`. Reversing the order makes this fail.
4. **Resolver — stale `.env`.** `skills-config.yaml` says `tracker: github`, `.env` has `JIRA_URL=...` → resolves `github`.
5. **Resolver — map form ignored.** A `tracker:` key with only a nested `workflowFile:` resolves to `""`, not to the word `workflowFile`.
6. **Unresolvable → exclude nothing.** Empty tracker excludes none of the 17.
7. **`--all-skills`.** `ALL_SKILLS=true` excludes nothing under either tracker.
8. **Drift guard.** Every `skills/*jira*` and `skills/*github*` directory appears in exactly one constant. Fails CI when a new tracker skill is added unclassified.
9. **Integration — fresh prune.** Fixture tarball + `tracker: github` → the 11 absent from `.agents/skills/`, `create-pr` present.
10. **Integration — grandfather.** Pre-create `.agents/skills/sync-jira-story/SKILL.md`, run with `tracker: github` → still present, summary says `kept`.
11. **Integration — dry-run parity.** `--dry-run` writes nothing and reports the counts case 9 produces.

**Register the suite.** `package.json` lists test globs by hand; a new file under `shared/resources/tests/` runs nowhere until it is added. After registering, assert the reported test count rises — the registration itself is the thing most likely to be forgotten.

**Mutation proving** (per `shared/resources/mutation-proving.md` — revert each, confirm red):

| Mutation | Must fail |
|---|---|
| Delete the grandfather branch | case 10 |
| Swap resolver steps 1 and 2 | case 3 |
| `_skill_excluded_for_tracker` always returns 1 | cases 1, 9 |
| Add `create-pr` to `SKILLS_JIRA_ONLY` | case 2 |
| `grep -qF` instead of `grep -qxF` | add a `sync-jira-epic-v2` fixture; case 1 must fail |
| Drop the `continue` after grandfather | case 10 (skill deleted) |

---

### Phase 4 — Documentation

**`docs/concepts/getting-started.md`** — "What the wizard does", step 8. State: the platform filter, both counts, the grandfather rule, `--all-skills`, and that deleting `.agents/skills/` + re-running is the manual way to prune an existing install.

**`scripts/setup-consumer.sh`** header (line 14) — amend step 8's one-liner to mention the filter.

**`CHANGELOG.md`** — `[Unreleased]` → `### Changed`. Name both counts, the grandfather guarantee, and be accurate about the context saving (~1,493 tokens of ~11,602 for a GitHub consumer). Do not imply this is the large win; task 84 is.

---

## Key Patterns and References

- **Sourcing hook**: `setup-consumer.sh:1135` — `[[ -n "${SETUP_CONSUMER_NO_MAIN:-}" ]] || main "$@"`. All new functions must be above it.
- **Existing test harness**: `shared/resources/tests/setup-consumer-config.test.mjs` — copy its source-and-call pattern rather than inventing one.
- **`record_step` / `record_warning`**: `setup-consumer.sh:58,63` — the wizard's summary mechanism; reuse, do not print ad-hoc.
- **Config reading**: this task reads `tracker:` with a narrow `awk` and does **not** source `resolve-platform.sh` — that script validates and can `exit 1` on an unrecognised value, which would abort an install over a key the installer only wants a hint from.
- **Counter idiom**: `(( _x++ )) || true` — the existing loop uses it because `set -e` treats `(( 0++ ))`'s zero result as failure. Match it.

## Testing Approach

- Run `npm test` after Phase 3; confirm the suite count rose (registration check)
- Manual smoke: scratch repo with `tracker: github`, run the wizard, `ls .agents/skills | wc -l` → 108
- Manual grandfather check: in a repo with all 119, run `--update`, confirm the count stays 119
- `shellcheck scripts/setup-consumer.sh` — no new warnings
