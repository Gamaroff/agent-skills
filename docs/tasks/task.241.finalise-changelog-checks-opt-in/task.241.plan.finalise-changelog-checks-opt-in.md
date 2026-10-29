---
id: task.241.plan
title: "Implementation Plan: Make /finalise changelog checks opt-in"
type: plan
task-ref: task.241.finalise-changelog-checks-opt-in.md
---

# Implementation Plan: Make /finalise changelog checks opt-in

> Requirements and success criteria: [task.241.finalise-changelog-checks-opt-in.md](task.241.finalise-changelog-checks-opt-in.md)

## Overview

One small shell resolver turns `changelog.enforce` into `on` / `off`. 6d and the docs subagent dispatch both call it. With the key unset, neither opens `CHANGELOG.md`. Edit `shared/resources/` sources only, then `npm run bundle`. Never hand-edit `skills/*/references/`.

## Phase-by-Phase Implementation Guide

### Phase 1: The resolver

**New file** `shared/resources/changelog-enforce.sh`. Inside `shared/resources/`, refer to the sibling by bare filename (AGENTS.md § Shared Resources):

```bash
#!/usr/bin/env bash
# changelog-enforce.sh — does this project opt in to /finalise's changelog checks?
#
# Prints `on` or `off` on stdout, always exits 0. The ONE definition read by /finalise 6d and the
# Step 3 docs-subagent dispatch (task.241, obs #118): two checks of one condition drift.
#
# Only the literal `true` is on. The two read-config.sh tiers disagree on YAML 1.1 booleans
# (`yes` is `true` under python, `yes` under awk — measured 2026-10-28), so accepting them would
# make the answer depend on which tier ran.
set -u
_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=read-config.sh
source "$_dir/read-config.sh" || { echo off; exit 0; }
v=$(read_nested_config_key changelog enforce 2>/dev/null)
case "$v" in
  true) echo on ;;
  ""|false) echo off ;;
  *) echo "changelog-enforce: changelog.enforce is '$v' — only \`true\` turns the checks on; treating it as off" >&2
     echo off ;;
esac
```

Decide during implementation whether a read-config.sh source failure should print `off` (as above, the fail-quiet direction for consumers) or warn. Whichever it is, the test states it.

Call it with `bash`, not `source`, so `set -u` and the `_dir` variable don't leak into `/finalise`'s shell. That also works from zsh, which `/finalise` runs under.

**New test** `shared/resources/tests/changelog-enforce.test.mjs`. It writes `skills-config.yaml` into a temp dir and runs `bash <abs path>/changelog-enforce.sh` with `cwd` set to that dir, once per tier via `AGENT_SKILLS_CONFIG_TIER`. Copy the tier-skip pattern from an existing `read-config` test (`git grep -l AGENT_SKILLS_CONFIG_TIER -- '*.test.*'`). `npm test` already runs `shared/resources/tests/*.test.mjs` (`package.json`), so the new suite is not orphaned.

### Phase 2: Gate both call sites

**6d block** (`skills/finalise/SKILL.md`, inside `6d. **CHANGELOG citation check`). Prepend the gate, and keep the existing body byte-identical under `on`:

```bash
CL=$(bash .agents/skills/finalise/references/changelog-enforce.sh)
N=""
case "$STEM" in task.*) N="${STEM#task.}" ;; esac
if [ "$CL" != on ]; then
  echo "6d: changelog checks not enabled"
elif [ ! -f CHANGELOG.md ]; then
  echo "6d: no CHANGELOG.md — not applicable"
elif [ -n "$N" ] && [[ "$N" =~ ^[0-9]+$ ]]; then
  … unchanged …
fi
```

Heading: keep `6d. **CHANGELOG citation check` as the prefix, because `sixDBlock()` and four other assertions anchor on it. Add the opt-in to the sentence after the heading, not to the anchor.

**Step 3 dispatch.** Just before the substitution table, add:

```bash
CHANGELOG_ENFORCE=$(bash .agents/skills/finalise/references/changelog-enforce.sh)
```

Row 4 becomes `<STORY_FILE>`, `<PR_NUMBER>`, `<STORY_TYPE>`, `<DIFF_FILE>`, `<CHANGELOG_ENFORCE>`. Bug mode dispatches the same docs prompt, so check its paragraph and add the substitution there too if it lists placeholders.

**Docs prompt** (`shared/resources/finalise-dod-docs-prompt.md`):

- frontmatter `description` and the `**Usage**` line: add `<CHANGELOG_ENFORCE>`.
- Step 2, new first item: "`<CHANGELOG_ENFORCE>` is `off`: mark `CHANGELOG.md updated` as `NOT_APPLICABLE` with the note "changelog checks not enabled" and skip the rest of this step. Do not `ls`, read or grep `CHANGELOG.md`. The project has not opted in (`changelog.enforce` in `skills-config.yaml`), and a changelog it keeps is its own business."
- Then the existing item 1 with the absent-file rule (the stopgap reverted on 2026-10-28): "If it does not exist, mark `NOT_APPLICABLE`, note "repository keeps no CHANGELOG.md", skip the rest of this step."

**Completion checklist** line (search `CHANGELOG citation checked (6d)`):
`- [ ] CHANGELOG citation checked (6d) — \`6d: changelog checks not enabled\` (key unset), \`6d: no CHANGELOG.md — not applicable\`, or \`(task N)\` present under \`[Unreleased]\`; otherwise HALT \`no-changelog-entry\` before the PR comment`

### Phase 3: Config and docs

`skills-config.yaml`: add a block after `ci:`:

```yaml
changelog: # /finalise's CHANGELOG checks — schema: docs/reference/configuration.md
  # This repository's release convention: every accepted task cited under [Unreleased] as
  # (task N) (docs/contributing/releases.md). Off by default for consumers (task.241).
  enforce: true
```

`docs/reference/configuration.md`: a `changelog:` entry in the Full schema block, near `ci:`, and a key-reference row:
`| \`changelog.enforce\` | boolean | \`false\` | Turns on /finalise's changelog checks: the docs subagent's "CHANGELOG.md updated" judgement and the blocking 6d \`(task N)\` citation check. Only the literal \`true\` turns them on … |`

`docs/contributing/releases.md` "The owner" bullet: add that 6d runs only under `changelog.enforce: true`, which this repository sets. Check the `releases` assertions in `finalise-publish-boundary.test.mjs` still hold.

`docs/runbooks/task-development.md`: under both `/finalise flags "CHANGELOG.md not updated"` and `/finalise halts with no-changelog-entry`, add one line: only when `changelog.enforce: true`. To stop it, unset the key.

`CHANGELOG.md` `[Unreleased]` → Changed: `- **/finalise changelog checks are opt-in (task 241).** … Consumers that want them: \`changelog: enforce: true\`.`

### Phase 4: Tests

`evals/shared/tests/finalise-publish-boundary.test.mjs`:

```js
const FINALISE_REFS = "skills/finalise/references";
function runSixD(shell, stem, changelog, config = "changelog:\n  enforce: true\n") {
  const dir = mkdtempSync(path.join(tmpdir(), "finalise-6d-"));
  const refs = path.join(dir, ".agents/skills/finalise/references");
  mkdirSync(refs, { recursive: true });
  for (const f of ["changelog-enforce.sh", "read-config.sh"])
    copyFileSync(path.join(REPO_ROOT, FINALISE_REFS, f), path.join(refs, f));
  if (config !== null) writeFileSync(path.join(dir, "skills-config.yaml"), config);
  if (changelog !== null) writeFileSync(path.join(dir, "CHANGELOG.md"), changelog);
  …unchanged spawnSync…
}
```

`REPO_ROOT` is the file's existing root constant (`finalise-publish-boundary.test.mjs:39`). `read-config.sh` sources nothing else (`grep -n '^source' shared/resources/read-config.sh` is empty, 2026-10-28), so two files are enough.

New cases per shell: `config=null` (no file) + `task.303` + fixture → exit 0, `/^6d: changelog checks not enabled$/m`, no `HALT`. `enforce: false` → same. `enforce: yes` → same, plus stderr names `yes`. Control: `config=null` + `task.301` (cited) → the not-enabled line, which shows the grep never ran.

This-repo assertion: run `changelog-enforce.sh` with `cwd: REPO_ROOT` → `on`.

Wiring test: `between(finalise, "| 4. Docs & changelog", "\n")` contains `<CHANGELOG_ENFORCE>`; the docs prompt's Step 2 section contains `<CHANGELOG_ENFORCE>` before its first `ls CHANGELOG.md`.

**Mutation proofs** (record each in the implementation report: what was reverted, which test went red, its message):

1. Remove the `if [ "$CL" != on ]` arm from 6d → the unset-key case goes red with `HALT: no-changelog-entry`.
2. Resolver `*) echo on` → the `yes` case goes red.
3. Remove `<CHANGELOG_ENFORCE>` from row 4 → the wiring test goes red.

## Key Patterns and References

- `source .agents/skills/finalise/references/X || exit 1` is the in-skill idiom for sourcing. Use `bash …` here because the resolver has no functions to export.
- The 6d test runs what the skill ships (`sixDBlock()`). Keep that: don't test a copy.
- Run `command node`, never bare `node` (nvm shell function).
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside (memory: it masks CI failures).

## Testing Approach

```bash
command node --test shared/resources/tests/changelog-enforce.test.mjs
command node --test evals/shared/tests/finalise-publish-boundary.test.mjs
npm run bundle && npm run bundle:check && npm run check:generated
npm run validate -- skills/finalise/
shellcheck shared/resources/changelog-enforce.sh
npm test
```
