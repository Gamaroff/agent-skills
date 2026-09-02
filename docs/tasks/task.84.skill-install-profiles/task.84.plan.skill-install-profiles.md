---
id: task.84.plan
title: "Implementation Plan: Skill install profiles with dependency closure"
type: plan
task-ref: task.84.skill-install-profiles.md
---

# Implementation Plan: Skill install profiles with dependency closure

> Requirements and success criteria: [task.84.skill-install-profiles.md](task.84.skill-install-profiles.md)

## Overview

Generate the skill call graph at build time into a committed JSON file; author three profiles as seed lists; resolve seed → closure → tracker filter in a small Node helper that bash invokes; persist the choice in `skills-config.yaml` so `--update` reproduces it. The one ordering that must not be got wrong: **the tracker filter runs after closure**, or closure re-introduces the skills task 83 removed.

**Prerequisite**: task 83 merged. This plan calls `_skill_excluded_for_tracker` and reuses its config-first resolver order.

---

## Phase-by-Phase Implementation Guide

### Phase 1 — Dependency graph generation

**New file:** `scripts/generate-skill-dependencies.mjs`

```js
#!/usr/bin/env node
// Generates shared/resources/skill-dependencies.json — the skill call graph.
//
// Generated at build time rather than grepped at install time: bash JSON
// traversal is slow and untestable, and a committed manifest is diffable in
// review. Regenerate with `npm run generate-skill-deps`; CI fails on drift.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS = 'skills';
const names = new Set(
  readdirSync(SKILLS, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(SKILLS, d.name, 'SKILL.md')))
    .map(d => d.name)
);

// Scan SKILL.md AND references/ — a step doc under references/ can be the only
// place a callee is named, and a missed edge is an incomplete closure, which
// surfaces as a mid-pipeline failure in the consumer's repo. Over-collecting
// costs a few extra skills; under-collecting breaks a run.
function sourcesFor(skill) {
  const out = [join(SKILLS, skill, 'SKILL.md')];
  const refs = join(SKILLS, skill, 'references');
  if (existsSync(refs)) {
    for (const f of readdirSync(refs)) if (f.endsWith('.md')) out.push(join(refs, f));
  }
  return out;
}

const graph = {};
for (const skill of [...names].sort()) {
  const deps = new Set();
  for (const src of sourcesFor(skill)) {
    const text = readFileSync(src, 'utf8');
    for (const [, cmd] of text.matchAll(/\/([a-z][a-z0-9-]{2,})/g)) {
      if (names.has(cmd) && cmd !== skill) deps.add(cmd);
    }
  }
  graph[skill] = [...deps].sort();
}

writeFileSync(
  'shared/resources/skill-dependencies.json',
  JSON.stringify(graph, null, 2) + '\n'
);
```

**`package.json`:**

```json
"generate-skill-deps": "node scripts/generate-skill-dependencies.mjs"
```

**CI drift check.** Mirror the catalog check already in `.github/workflows/release.yml` — regenerate, `git diff --exit-code` on the JSON.

**Known-good fixture.** Assert these exact edge sets, so a generator regression fails loudly:

```js
// develop-story invokes eight; review-story invokes ten (both verified on v0.45.0)
expect(graph['develop-story']).toEqual(expect.arrayContaining([
  'create-branch','review-story','develop','create-pr',
  'qa-story','qa-fix','finalise','commit-changes',
]));
```

---

### Phase 2 — Profiles and closure resolver

**New file:** `shared/resources/skill-profiles.json`

```json
{
  "minimal": {
    "description": "Branching, commits, PRs and code review. No document pipeline.",
    "seeds": ["commit-changes", "create-branch", "create-pr", "create-issue", "review-code"]
  },
  "pipeline": {
    "description": "The full story/task/bug lifecycle: create → review → develop → QA → finalise.",
    "seeds": [
      "create-story","create-task","create-epic","create-prd","create-bug-report",
      "review-story","review-task","review-epic","review-prd","review-bug","review-code","review-pr",
      "develop","develop-story","develop-task","develop-bug","develop-next",
      "qa-planning","qa-story","qa-task","qa-fix","qa-gate",
      "finalise","create-branch","create-pr","commit-changes"
    ]
  },
  "full": { "description": "Every skill in the library.", "seeds": "*" }
}
```

**New file:** `shared/resources/resolve-skill-set.mjs`

Closure lives in Node, not bash: it is a graph traversal with a conflict report, and it needs unit tests over injected fixtures rather than the real files.

```js
// Resolve a profile + include/exclude into the concrete skill set to install.
//
// ORDER IS LOAD-BEARING. The tracker filter runs LAST, after closure.
// review-story names BOTH sync-github-story and sync-jira-story, so a closure
// that is not filtered afterwards re-installs the very skills task 83 removed —
// silently reverting that task for every profile user.
export function resolveSkillSet({
  profile = 'full', include = [], exclude = [],
  profiles, graph, allSkills, isExcludedForTracker = () => false,
}) {
  const def = profiles[profile];
  if (!def) throw new Error(`Unknown profile: ${profile}`);

  const seeds = def.seeds === '*' ? [...allSkills] : def.seeds;
  const excludeSet = new Set(exclude);

  // 1. seed + include, minus exclude
  const worklist = [...new Set([...seeds, ...include])].filter(s => !excludeSet.has(s));

  // 2. transitive closure. Visited-set, NOT recursion: the graph has cycles
  //    (develop-story -> review-story -> develop-story).
  const resolved = new Set();
  const addedBy = new Map();          // callee -> the seed that pulled it in
  const conflicts = [];               // excluded, but required by closure

  while (worklist.length) {
    const name = worklist.pop();
    if (resolved.has(name)) continue;
    resolved.add(name);
    for (const dep of graph[name] ?? []) {
      if (resolved.has(dep)) continue;
      if (excludeSet.has(dep)) {
        // Never silently re-add. The user asked for it gone; closure says it is
        // needed. Both facts are reported and the user decides.
        conflicts.push({ skill: dep, requiredBy: name });
        continue;
      }
      if (!addedBy.has(dep)) addedBy.set(dep, name);
      worklist.push(dep);
    }
  }

  // 3. tracker filter LAST — see the note above.
  const dropped = [];
  for (const name of [...resolved]) {
    if (isExcludedForTracker(name)) { resolved.delete(name); dropped.push(name); }
  }

  return {
    skills: [...resolved].sort(),
    closureAdditions: [...addedBy].filter(([k]) => resolved.has(k)).sort(),
    conflicts,
    droppedForTracker: dropped.sort(),
  };
}
```

**A conflict is reported, never resolved silently.** `install_skills` prints each one:

```
⚠  create-pr is in skills.exclude but required by develop-story — not installed.
   /develop-story will fail at Step 4. Remove it from skills.exclude, or drop
   develop-story from your profile.
```

**Bash side** — in `setup-consumer.sh`:

```bash
# Resolve the concrete skill list. Node does the graph work; bash consumes lines.
_resolve_skill_set() {
  local _tracker="$1" _tmpdir="$2"
  node "${_tmpdir}/shared/resources/resolve-skill-set-cli.mjs" \
    --profile "$(_config_skills_profile)" \
    --include "$(_config_skills_list include)" \
    --exclude "$(_config_skills_list exclude)" \
    --tracker "$_tracker"
}
```

The CLI wrapper prints the resolved names one per line on stdout, and the closure/conflict report on stderr — so `$( )` capture yields only names.

> **`node` is already a hard prerequisite.** `check_prereqs` (line 145) requires node ≥ 22, so invoking node here adds no new dependency.

---

### Phase 3 — Wizard prompt

**`scripts/setup-consumer.sh`** — new function, modelled exactly on `select_platform()` (line 169). Numbered `read -r`, no TUI: the script runs via `bash <(curl …)` and raw-mode arrow-key input is not reliable there.

```bash
select_skill_profile() {
  heading "Skill selection"
  echo "  All 119 skill descriptions stay in the agent's context permanently"
  echo "  (~11,600 tokens). Install only what this project uses."
  echo ""
  echo "  1) full      — every skill (119). Today's behaviour."
  echo "  2) pipeline  — story/task/bug lifecycle: create → review → develop → QA → finalise."
  echo "  3) minimal   — branching, commits, PRs, code review only."
  echo ""
  ask "Profile [1-3, default 1]:"
  read -r _pchoice
  case "${_pchoice:-1}" in
    2) SKILLS_PROFILE="pipeline" ;;
    3) SKILLS_PROFILE="minimal" ;;
    *) SKILLS_PROFILE="full" ;;
  esac

  SKILLS_INCLUDE=""
  if [[ "$SKILLS_PROFILE" != "full" ]]; then
    echo ""
    echo "  Add individual skills on top? Comma-separated names, or Enter to skip."
    echo "  Full list: docs/reference/skill-catalog.md"
    ask "Extra skills:"
    read -r SKILLS_INCLUDE
  fi
}
```

Call from `main()` **after `select_platform`, before `write_skills_config`**:

```bash
  select_platform
  select_skill_profile          # ← new
  collect_env_vars
  write_env_files
  write_skills_config           # writes the skills: block
  ...
  install_skills
```

Before copying, `install_skills` prints the resolution so the user sees the closure working:

```
→ Profile: pipeline — 45 skills (26 chosen, 19 pulled in by dependency)
    + create-branch (required by develop-story)
    + qa-fix (required by develop-story)
  ...
  − sync-jira-story (not applicable to tracker: github)
```

---

### Phase 4 — Persistence and `--update`

**`write_skills_config`** — emit only when the profile is not `full`, so an untouched config stays byte-identical to today's:

```yaml
# Which skills to install. Absent block ≡ profile: full (every skill).
# Read by setup-consumer.sh on --update, so the choice survives updates.
skills:
  profile: pipeline # full | pipeline | minimal
  include: [] # extra skills on top of the profile
  exclude: [] # skills to leave out (a closure-required entry is reported, never silently re-added)
```

**Reading it back on `--update`.** Same constraint as task 83: `main()` calls `install_skills` at line 1115 and returns before `select_platform`. So the profile MUST come from the config file, with the in-process wizard variable second:

```bash
_config_skills_profile() {
  local _p=""
  [[ -f skills-config.yaml ]] && _p=$(awk '
    /^skills:/        {inblock=1; next}
    /^[a-z-]+:/       {inblock=0}
    inblock && /^[[:space:]]+profile:/ {print $2; exit}
  ' skills-config.yaml 2>/dev/null || true)
  [[ -z "$_p" && -n "${SKILLS_PROFILE:-}" ]] && _p="$SKILLS_PROFILE"
  printf '%s' "${_p:-full}"
}
```

**Grandfather branch** in the copy loop — same shape as task 83's, and again the `continue` is what protects the kept skill:

```bash
        if ! grep -qxF "$_name" <<<"$_RESOLVED_SET"; then
          if [[ -d ".agents/skills/${_name}" ]]; then
            info "  kept     ${_name} (already installed; outside profile)"
            (( _kept++ )) || true
          else
            (( _skipped++ )) || true
          fi
          continue
        fi
```

When `_kept > 0`, `print_summary` states the divergence plainly — config says `pipeline`, disk holds more — and gives the prune recipe (`rm -rf .agents/skills && re-run`). This is the **expected** state for every existing consumer adopting a profile, so it is documented as normal, not flagged as an error.

**`docs/reference/configuration.md`** — add the `skills:` block to "Full schema" (after `devLoadAlwaysFiles`) and a "Key reference" row per key.

---

### Phase 5 — Tests

**`shared/resources/tests/setup-consumer-skill-profiles.test.mjs`**

Unit-test `resolveSkillSet` against **injected fixtures**, not the real graph — the real graph changes with every skill added, and a unit test that moves with it proves nothing:

```js
const graph = {
  'develop-story': ['create-pr', 'review-story', 'qa-fix'],
  'review-story':  ['develop-story', 'sync-jira-story', 'sync-github-story'],
  'create-pr': [], 'qa-fix': [], 'sync-jira-story': [], 'sync-github-story': [],
};
const profiles = { test: { seeds: ['develop-story'] }, full: { seeds: '*' } };
```

| # | Case | Assert |
|---|---|---|
| 1 | Closure from `develop-story` | `create-pr`, `review-story`, `qa-fix` all present |
| 2 | Cycle `develop-story` ↔ `review-story` | terminates, each appears once |
| 3 | Depth ≥ 3 | fully resolved |
| 4 | `exclude: ['create-pr']` | `conflicts` names it + `requiredBy`; NOT in `skills` |
| 5 | `include` outside every profile | present with its own closure |
| 6 | Empty seeds | empty result, no throw |
| 7 | **Tracker filter after closure** | `isExcludedForTracker = n => n === 'sync-jira-story'` → absent from `skills`, listed in `droppedForTracker` |
| 8 | `closureAdditions` | reports `create-pr` was added by `develop-story` |

Integration cases (real tarball fixture, temp dir): profile installs, the `pipeline`+`tracker: github` interaction (case 7 end-to-end), `--update` from config with no wizard, `--update` prunes nothing, `--dry-run` parity.

**Context-saving assertion** — the claim in the task doc must be measured, not asserted:

```js
// Baseline on v0.45.0: 119 skills, 46,408 description bytes (~11,602 tokens).
const pipelineBytes = sumDescriptionBytes(resolved.skills);
assert(pipelineBytes < 46408 * 0.55, `pipeline should cut description budget; got ${pipelineBytes}`);
```

**`shared/resources/tests/skill-dependencies-drift.test.mjs`**
- Committed JSON matches fresh generation
- Every name in `skill-profiles.json` exists in `skills/`
- `develop-story` / `review-story` known-good edge fixtures
- **Report** (not fail) skills in no profile — `full` is legitimately everything, so this cannot be an assertion; print it in CI output where a reviewer sees it

**Register both suites in `package.json`** and confirm the reported test count rises. `package.json` lists globs by hand and has orphaned a whole suite before; registration is the step most likely to be skipped.

**Mutation proving** — revert each, confirm red:

| Mutation | Must fail |
|---|---|
| Remove the visited-set | case 2 (hang/overflow) |
| Move the tracker filter before closure | case 7 |
| Re-add excluded-but-required silently | case 4 |
| `$SKILLS_PROFILE` before config in `_config_skills_profile` | the `--update` test |
| Remove the grandfather `continue` | the no-prune test |

---

## Key Patterns and References

- **Prompt idiom**: `select_platform()` at `setup-consumer.sh:169` — numbered menu, `read -r`, `case`. Match it; do not introduce a TUI.
- **Sourcing hook**: line 1135 — new bash functions must be above it to be testable.
- **Config-first resolution**: task 83's `_resolve_install_tracker`. Same reason, same order; reuse the shape.
- **Node availability**: `check_prereqs` (line 145) already requires node ≥ 22.
- **Counter idiom**: `(( _x++ )) || true` — required under `set -e`.
- **Generated-file drift check**: the catalog check in `.github/workflows/release.yml` is the pattern to copy.
- **Bundling**: `skill-profiles.json`, `skill-dependencies.json` and `resolve-skill-set.mjs` live in `shared/resources/`. Edit them **there**, never in a skill's bundled `references/` — `npm run bundle` silently reverts a fix applied to the bundled copy.

## Testing Approach

1. `npm run generate-skill-deps`, commit the JSON, confirm the drift test passes
2. `npm test` — confirm both new suites are registered and the count rose
3. Manual: scratch repo, choose `pipeline`, verify `develop-story` plus all eight callees present and `sync-jira-story` absent under `tracker: github`
4. Manual grandfather: repo with all 119, add `skills.profile: pipeline`, `--update`, confirm count stays 119 and the summary explains why
5. `shellcheck scripts/setup-consumer.sh`
