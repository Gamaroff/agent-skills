---
id: task.83.plan
title: "Implementation Plan: Platform-aware skill exclusion in setup-consumer.sh"
type: plan
task-ref: task.83.platform-aware-skill-exclusion.md
---

# Implementation Plan: Platform-aware skill exclusion in setup-consumer.sh

> Requirements and success criteria: [task.83.platform-aware-skill-exclusion.md](task.83.platform-aware-skill-exclusion.md)

## Overview

Add two pure helper functions and one branch inside the existing copy loop of `install_skills()`. The classification lives in two shell constants; the resolver reads `skills-config.yaml` first so the `--update` path (which never runs the wizard) resolves correctly, and falls back to the same `github` default `resolve-platform.sh` applies. An excluded skill that is already on disk is kept, never deleted.

> **Amended 2026-09-04 after `/review-task`.** Three things in the original draft were wrong and are
> corrected below: the resolver's final fallback (`""` could never prune for a GitHub consumer on
> `--update` — the task's own headline path), the claim that `package.json` needs a new glob entry (it
> already globs this directory), and the `--dry-run` count-parity requirement (that branch never
> downloads the tarball, so it has no skill list to count).

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
# Anything unresolved → `github`, the same default resolve-platform.sh applies,
# so install time and run time cannot disagree about what this repo is.
_resolve_install_tracker() {
  local _t=""

  # 1. skills-config.yaml scalar `tracker:` (ignore the map form — `tracker:`
  #    with a nested workflowFile carries no platform identity)
  if [[ -f skills-config.yaml ]]; then
    _t=$(awk '/^tracker:[[:space:]]*[a-z]/ {print $2; exit}' skills-config.yaml 2>/dev/null || true)
  fi

  # 2. wizard answer, when select_platform has run in this process
  [[ -z "$_t" && -n "${TRACKER:-}" ]] && _t="$TRACKER"

  # 3 + 4. `auto`, unset, or an unrecognised value resolves the way
  #        resolve-platform.sh does: a JIRA_URL implies jira, otherwise github.
  case "$_t" in
    jira|github) : ;;
    *)
      if [[ -n "${JIRA_URL:-}" ]] \
        || { [[ -f .env ]] && grep -qE '^JIRA_URL=.+' .env 2>/dev/null; }; then
        _t="jira"
      else
        _t="github"
      fi
      ;;
  esac

  printf '%s' "$_t"
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

**Dry-run.** The `DRY_RUN` branch prints and returns *before the tarball is downloaded*, so it has no
skill list to run the predicate over. Do not make it download one: that would put a network request in a
dry run and break the "one request, whole archive" property. Instead it resolves the tracker and reports
**which exclusion set would apply**, without per-skill counts. Integration case 11 asserts exactly that,
and asserts nothing was written.

**`write_skills_config`.** Add `tracker: github` for GitHub consumers — it currently writes the key only
for Jira, which is why the resolver had nothing to read on `--update`. `setup-consumer-config.test.mjs`
asserts on this function's output and is updated in the same commit.

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
5. **Resolver — map form ignored.** A `tracker:` key with only a nested `workflowFile:` must not resolve to the word `workflowFile`; it falls through to the default chain.
6. **Nothing to go on → `github`.** No config key, no `$TRACKER`, no `JIRA_URL` → `github`, not `""`. This is the `--update` case that motivated the task; `""` made the filter inert.
6b. **An empty tracker argument excludes nothing.** Defence in depth for a caller that passes `""` directly.
7. **`--all-skills`.** `ALL_SKILLS=true` excludes nothing under either tracker.
8. **Drift guard.** Every `skills/*jira*` and `skills/*github*` directory appears in exactly one constant. Fails CI when a new tracker skill is added unclassified.
9. **Integration — fresh prune.** Fixture tarball + `tracker: github` → the 11 absent from `.agents/skills/`, `create-pr` present.
10. **Integration — grandfather.** Pre-create `.agents/skills/sync-jira-story/SKILL.md`, run with `tracker: github` → still present, summary says `kept`.
11. **Integration — dry-run.** `--dry-run` writes nothing to `.agents/skills/` and names the resolved tracker and the exclusion set that would apply.

**Registration is NOT needed.** `package.json:26` already globs `shared/resources/tests/*.test.mjs`, so
a new `.test.mjs` there is picked up with no edit. (The hand-listed-glob hazard in this repo is real but
applies to `skills/*/tests/`, which are enumerated one by one.) Verify by observing the reported test
count rise; do not add a redundant glob entry, which would imply this directory needs per-file
registration.

**Mutation proving** (per `shared/resources/mutation-proving.md` — revert each, confirm red):

| Mutation | Must fail |
|---|---|
| Delete the grandfather branch | case 10 |
| Swap resolver steps 1 and 2 | case 3 |
| `_skill_excluded_for_tracker` always returns 1 | cases 1, 9 |
| Add `create-pr` to `SKILLS_JIRA_ONLY` | case 2 |
| `grep -qF` instead of `grep -qxF` | the whole-line case — assert a **substring** name (`sync-jira`, which `-F` matches against the line `sync-jira-epic`), not a longer one; `-F` fails to match a longer name too, so testing that direction proves nothing |
| Final fallback `github` → `""` | case 6 and the fresh-prune-with-no-config integration case |
| Drop the `continue` after grandfather | case 10 (skill deleted) |

---

### Phase 4 — Documentation

**`docs/concepts/getting-started.md`** — "What the wizard does", step 8. State: the platform filter, the resolution order, the grandfather rule, `--all-skills`, and that deleting `.agents/skills/` + re-running is the manual way to prune an existing install. Describe the sets relatively (11 Jira-only / 6 GitHub-only), not as absolute install totals — those go stale on every skill added.

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
- Manual smoke: scratch repo with `tracker: github`, run the wizard, `ls .agents/skills | wc -l` → total − 11
- Manual grandfather check: in a repo holding every skill, run `--update`, confirm the count is unchanged
- `shellcheck scripts/setup-consumer.sh` — no new warnings
