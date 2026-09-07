---
id: task.95.plan
title: "Implementation Plan: observe-work — config schema, skill boundaries and the meta-skill family"
type: plan
task-ref: task.95.observe-work-docs-boundaries.md
---

# Implementation Plan: observe-work — config schema, skill boundaries and the meta-skill family

> Requirements and success criteria: [task.95.observe-work-docs-boundaries.md](task.95.observe-work-docs-boundaries.md)

## Overview

Four small, independent documentation changes with one shared hazard: three of them edit an existing `SKILL.md`, and touching a `description:` there moves the generated catalog. Every phase ends with the same one-command check.

## Phase-by-Phase Implementation Guide

### Phase 1: Config schema

**File to modify:** `docs/reference/configuration.md`

Three insertions, each matching the file's existing style — the Full schema block uses inline comments to carry the semantics, and the Key reference is a table.

**1. Into the Full schema block**, near the other consumer-facing blocks:

```yaml
# observe-work — where the observation log lives, and whether it is written at all.
# Every key is optional. Absent block == enabled with the default workspace.
observations:
  enabled: true
  # The workspace ROOT. Absolute, or ~-relative. This is the highest-precedence
  # source; $OBS_WORKSPACE is second; the project-identity path is the default.
  # It must be ONE STABLE path that outlives a session — never derived from the
  # cwd, and never inside an ephemeral checkout (a git worktree, a temp clone),
  # which is torn down and takes the log with it.
  workspace: ~/.agents/skill-observations
  # Days before the session-start review offer fires. Default 7.
  review_interval_days: 7
```

**2. Key reference rows**, in the existing table format — one row per key, each stating the default and what an absent value means.

**3. A `## Observation workspace` prose section.** Two things belong here that a schema table cannot carry:

- **The resolver order, and why it is refused rather than defaulted at the bottom.** `observations.workspace` → `$OBS_WORKSPACE` → project-identity default; and a resolved path under `.claude/worktrees/`, `/tmp`, or a secondary git worktree is a hard refusal, not a fallback. State the failure it prevents: a snippet run against a torn-down or relative path does not error, it reports an empty, clean backlog — which is the one answer that never gets questioned.
- **The scope rule.** Skills installed at user or global scope are observed from *every* project, so their log must be one user-scope path shared across projects. A per-project anchor is correct only for skills that exist in that project alone. A per-project default scatters observations about a global skill across every project touched, and a review run in any one of them looks complete while seeing a fraction of the backlog.

**Verify against behaviour, not against the script's comments:**

```bash
# config beats env
printf 'observations:\n  workspace: /tmp/from-config\n' > /tmp/probe/skills-config.yaml
OBS_WORKSPACE=/tmp/from-env sh -c 'cd /tmp/probe && . …/resolve-observation-workspace.sh && echo "$OBS_WORKSPACE"'
# expect /tmp/from-config
```

(Use a real scratch dir, not `/tmp` itself — the resolver refuses `/tmp` anchors, which is itself worth asserting.)

---

### Phase 2: Boundary notes

Three files, one short section each. **Body only. Do not touch `description:`.**

Place each note where a reader already looks for scope — next to the existing "When to Use" / "What NOT to save" material rather than at the very bottom.

**`skills/autoskill/SKILL.md`** — the closest neighbour, so this note does the most work:

> **Related: `observe-work`.** `autoskill` is the explicit, on-demand pass: you ask it to learn from *this* session, and it proposes edits to the skills that were active. `observe-work` runs continuously and writes what it notices to a durable observation log for a later review. They are complements — `observe-work` is what catches the insight you would otherwise have lost by the time you thought to ask, and `autoskill` is what you reach for when you want the edits now. If an observation log exists, check it for open observations naming the skills you are about to edit before proposing changes to them.

**`skills/remember-insight/SKILL.md`**:

> **Related: `observe-work`.** `remember-insight` persists an insight **you state** to the project memory directory. `observe-work` notices signals unprompted during ordinary work and writes them to the observation log, targeting *skills* rather than memory. Rule of thumb: if it changes how you want the agent to behave across projects, it is a memory; if it names a missing rule, step or principle in a specific skill, it is an observation.

**`skills/double-check/SKILL.md`**:

> **Related: `observe-work`.** `double-check` audits the artifact just produced — does it match the disk, the constraints and the original request. `observe-work` observes the behaviour that produced it. They meet at the findings: a `double-check` finding that generalises beyond this artifact — a rule the agent violated, a gate that failed to fire — is exactly the shape of an observation, and is worth logging as one.

**The check that matters, after all three:**

```bash
npm run generate-catalog && git diff --stat docs/reference/skill-catalog.md
# must be empty
```

An empty diff is the proof that no `description:` moved. Run it; do not reason about it.

---

### Phase 3: Family template

**File to create:** `skills/observe-work/assets/skill-families.template.md`

Ships as an **asset**, not a live registry — `assets/` is for templates used in output, which is exactly what this is. The live file belongs at `$OBS_WORKSPACE/skill-observations/skill-families.md`, copied from here on first use.

Content:

```markdown
# Skill families

A *family* is a set of skills implementing one idea — the same methodology for
different tools, the same structure for different subjects, the same companion
pattern for different base skills. The shared part drifts by default, because
each member is maintained only in the sessions that use it and nobody looks at
the set.

Two columns carry the weight:

- **Shared** — the material every member should carry. This is what the drift
  audit greps for.
- **Member-specific** — what legitimately differs, and why. Without it, every
  observation looks like it might apply everywhere and the check generates
  noise instead of signal. Duplication is sometimes correct and absence is not
  always drift; this column is what records the difference.

**Coherence model** decides what fixing drift *means*:

| Model | Meaning | Fixing drift means |
|---|---|---|
| `synced-duplicates` | each member is self-contained and shared sections are kept in sync | edit every member |
| `shared-core` | one skill holds the common material; others load it as a companion | edit the core once, check the pointers |

## Format

## [family name]
**Members:** skill-a, skill-b, skill-c
**Coherence model:** synced-duplicates | shared-core
**Shared:** [the material every member should carry]
**Member-specific:** [what legitimately differs, and why]

## meta-skills
**Members:** observe-work, autoskill, remember-insight, double-check
**Coherence model:** shared-core
**Shared:** self-observation output is presented for review and never applied
  silently; any check a member recommends asserts behaviour rather than the
  presence of source text.
**Member-specific:** the trigger (passive vs explicit), the durable artefact
  (observation log / none / memory directory / none), and the unit observed
  (the session / the session / a stated insight / the artifact just produced).
```

**Pointer**, one line into `observe-work`'s Session Start Protocol step 1:

> When the workspace has no `skill-families.md`, copy `assets/skill-families.template.md` into it rather than starting empty — the sibling check needs a registry, and the seeded meta-skills family is the one this skill belongs to.

**Test additions** to `skills/observe-work/tests/observe-work.test.js`:

```js
// the template ships, is pointed at, and parses
// every member it names is a real skills/ directory
// coherence model is one of the two defined values
```

The member-resolves-to-a-directory assertion must tolerate ENOENT: `tests/` ships inside the packaged skill, where the sibling directories are absent. Skip rather than fail in that case, exactly as the existing per-skill suites do.

---

### Phase 4: README and changelog

**`README.md`** — the count and badge are hand-maintained; after tasks 93–95 the number is off by the skills added. Update both, and add `observe-work` to the featured list if the list is meant to be representative rather than exhaustive.

**`CHANGELOG.md`** — one entry for the capability, not three for the tasks. A reader wants "the library can now observe its own use and stage improvements", with the three task numbers as the trail:

```markdown
### Added
- **`observe-work`** — a meta-skill that observes the working session for skill-improvement
  signals, writes each as an observation to a durable log, and periodically reviews that
  backlog to stage skill updates. Methodology adapted from task-observer by Eoghan Henn
  (CC BY 4.0); the mechanism is a rewrite against `shared/resources/observation-log.js`.
  Tasks 93–95.
```

**Final gate:**

```bash
npm run format
npm test
npm run generate-catalog && git diff --stat docs/reference/skill-catalog.md   # empty
npm run bundle && git status --short skills/                                  # clean on second run
for s in observe-work autoskill remember-insight double-check; do
  python3 skills/create-skill/scripts/quick_validate.py "skills/$s"
done
```

## Key Patterns and References

| Need | Read this |
|---|---|
| Config schema style (Full schema block + Key reference table) | `docs/reference/configuration.md` — existing blocks, e.g. `loopSupervisor` |
| How a per-topic prose section reads | `docs/reference/configuration.md` → `## Tracker workflow` |
| Assets convention | `skills/explain-simply/assets/storyboard-template.html` |
| Prose-driven test style with sibling tolerance | `skills/review-code/tests/review-code.test.js` |
| The resolver whose behaviour is being documented | `shared/resources/resolve-observation-workspace.sh` (task 93) |

## Testing Approach

- **Framework**: node's built-in runner; assertions land in the existing `skills/observe-work/tests/observe-work.test.js`, so no new `package.json` glob is needed — task 94 added it.
- **The catalog check is the load-bearing one.** Three `SKILL.md` files are edited and the only thing standing between a tidy-up of a description and an unrelated CI failure is running `npm run generate-catalog` and looking at the diff.
- **Assert the resolver's behaviour, not its comments.** The contract test drives the script with a config file and an env var and reads what it exports. A test that greps the script for the word "precedence" proves the word is there.
- **Bundle freshness**: editing a `SKILL.md` fires the pre-commit hook. Commit what it stages, then run `npm run bundle` again and confirm no diff — that second run is the actual check.
