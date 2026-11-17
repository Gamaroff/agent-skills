---
name: skill-resolution
description: The rule every develop pipeline follows after loading a sub-skill with the Skill tool — check that the skill that loaded is this repository's copy, and what to do when it is not.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/skill-resolution.md. Regenerate via `npm run bundle`. -->

# Checking the skill you loaded

The Skill tool resolves a skill **by name**. A same-named copy outside the repository — one a sync tool left under `~/.claude/skills/synced/`, or any other user-level directory — can load in place of this repository's copy, and nothing in the result says so. The run then follows a copy that may lack the publish boundary, the probe plan or a flag the repository's copy has, and it still looks complete. This happened on task.193 (`finalise`, `create-pr`, `review-pr`) and again on task.232 (`qa-task`, `review-pr`, `finalise`); each time it was noticed by luck.

The Skill tool's result begins with a line `Base directory for this skill: <path>`. That path is the identity, and comparing it is one command.

## After every load

Run this after every `Skill(...)` call a pipeline makes to one of its sub-skills (`create-branch`, `review-task`, `develop`, `create-pr`, `qa-task`, `qa-fix`, `review-pr`, `finalise`, `commit-changes`, and their story and bug counterparts), **before** acting on the loaded instructions:

```bash
command node .agents/skills/{develop-story|develop-task|develop-bug}/references/skill-resolution.js check \
  --name "{skill-name}" --base-dir "{path from the Base directory line}" \
  --root "$(git rev-parse --show-toplevel)" --json
```

`--name` is the skill's name without a leading slash. Read `reason`, not the exit code alone:

| `reason` | Exit | What it means | What to do |
| --- | --- | --- | --- |
| `repo` | 0 | The loaded copy is this repository's | Nothing. Follow the loaded instructions |
| `shadowed` | 1 | The loaded copy is some other path for that name | Read `.agents/skills/{skill-name}/SKILL.md` and follow **that**, not the loaded text. Log "skill `{skill-name}` loaded from `{baseDir}`, not this repository — followed the repository copy" in the Issues Log |
| `unreadable` | 1 | The base directory does not resolve, so identity is unknown | Log a warning in the Issues Log and proceed with the loaded copy, as before this check existed. It never reads as `repo` |
| `usage` | 2 | The call is wrong (missing flag, bad name, root not a directory) | Fix the call; this says nothing about the skill |

**No `Base directory` line.** If the Skill result carries no `Base directory for this skill:` line, there is no identity to check, and an empty `--base-dir` only returns `usage`. Do not run the check. Treat the load as `unreadable`: log "skill `{skill-name}` loaded with no Base directory line — identity unchecked" in the Issues Log and proceed with the loaded copy.

A Skill call that returns "Unknown skill" is the same situation from the other side: read `.agents/skills/{skill-name}/SKILL.md` and follow it.

**Why not just prefer the repository's copy every time?** Reading and following a second file for every load costs a turn each. The check costs one command, and only a `shadowed` result pays for the read.

**What this does not do.** It does not change how the harness resolves names; it detects the outcome. It does not judge whether the repository's copy is the right one for the run, only that it is the one that loaded.

Engine: `skill-resolution.js` (peer of `finalise-record-preflight.js`; the test is `skill-resolution.test.mjs`).
