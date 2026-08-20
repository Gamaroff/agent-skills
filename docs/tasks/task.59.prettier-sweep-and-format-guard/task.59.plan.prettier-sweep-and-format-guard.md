---
id: task.59.plan
title: 'Implementation Plan: Finish the Prettier adoption'
type: plan
task-ref: task.59.prettier-sweep-and-format-guard.md
---

# Implementation Plan: Finish the Prettier adoption

> Requirements and success criteria: [task.59.prettier-sweep-and-format-guard.md](task.59.prettier-sweep-and-format-guard.md)

## Overview

Three commits in one PR. Commit 1 is mechanical and large (~103 files); commits 2 and 3 are small
and hand-written. The ordering matters in one place only: `.git-blame-ignore-revs` needs commit 1's
sha, so commit 1 must exist before commit 2 is written.

**The one rule that governs the whole task**: no commit mixes formatting with anything else. This
card exists because two commits did.

---

## Phase 1 — The sweep

### Pre-flight

Check what is in flight before churning ~103 files under it — but measure the exposure rather than
assuming it. The sweep is **JavaScript only**, so a doc-only branch is not at risk no matter how
large it is:

```bash
git fetch --all --prune
for b in $(git branch -r --no-merged origin/main --format='%(refname:short)'); do
  n=$(git diff --name-only origin/main..."$b" | grep -cE '\.(js|mjs|cjs)$')
  [ "$n" -gt 0 ] && echo "$b — $n JS files"
done
gh pr list --repo Gamaroff/agent-skills --state open
```

Land whatever that names. Rebasing someone else's branch over this sweep is mechanical but tedious,
and the cost is entirely avoidable by ordering.

> When this was first checked (2026-08-17) the loop printed nothing: task 49 had already merged and
> task 51's branch was markdown-only. Two branches had been named as blockers on the assumption that
> any open branch conflicts. Run the loop; do not inherit that assumption.

### Baseline

```bash
npm test 2>&1 | tail -8      # expect: tests 1287 / pass 1287 / fail 0
npm run validate:all         # expect: 115 passed, 0 failed
npm run format:check         # expect: FAILS, "Code style issues found in 50 files"
```

Record the actual numbers — the point of the baseline is the comparison, and a number written down
before the change is worth more than one recalled after it.

### Run it

```bash
npm run format
npm run bundle
```

Order matters. `npm run format` skips `skills/*/references/` (`.prettierignore`), so the bundled
copies are stale until `npm run bundle` regenerates them from the now-formatted sources. Running
bundle first would copy the *unformatted* sources and achieve nothing.

**Never** `prettier --write skills/*/references/`. Formatting a copy independently of its source is
exactly the drift `.prettierignore` exists to prevent.

### Verify

```bash
npm run format:check                    # must now pass
npm test 2>&1 | tail -8                 # must match the baseline exactly
npm run eval:all
npm run validate:all

npm run bundle && git status --short    # second bundle must be a no-op
```

Confirm the diff is formatting-only. Prettier is deterministic, so normalising *both* sides through
it and re-diffing must produce nothing:

```bash
git stash
git rev-parse HEAD > /tmp/base
git stash pop
# spot-check the largest source file both ways
git show HEAD:shared/resources/change-log.js | npx prettier --parser babel > /tmp/before.js
npx prettier --parser babel shared/resources/change-log.js > /tmp/after.js
diff /tmp/before.js /tmp/after.js       # expect: empty
```

An empty diff proves the file's *content* is unchanged and only its *layout* moved. Repeat for any
file whose diff looks surprising.

### Commit

```bash
git add -A
git commit -m "style: apply Prettier repo-wide (task.59)

The sweep deferred by task.46 when Prettier was adopted as policy. 50 source
files reported by \`npm run format:check\`, plus ~53 regenerated copies under
skills/*/references/ via \`npm run bundle\`.

No functional change: npm test 1287/1287 before and after, validate:all 115/115,
and a second \`npm run bundle\` is a no-op.

Listed in .git-blame-ignore-revs by the following commit.

Refs #179"
```

Then capture the sha — Phase 2 needs it:

```bash
git rev-parse HEAD    # full 40 chars, not abbreviated
```

> **Note on the pre-commit hook.** `.githooks/pre-commit` re-runs `npm run bundle` when
> `shared/resources/*` or a `SKILL.md` is staged, and stages only the `references/` delta *it*
> created. Since bundle was already run and its output staged, the hook's delta is empty and it is
> a no-op. Nothing to work around — just don't be surprised if it prints.

---

## Phase 2 — The guard

### `.git-blame-ignore-revs` (new, repo root)

Full 40-character shas — git rejects abbreviated ones with
`fatal: invalid object name`, and does so at blame time rather than at write time, so the mistake
surfaces late.

```
# Commits that are pure reformatting. Activate with:
#
#     git config blame.ignoreRevsFile .git-blame-ignore-revs
#
# GitHub honours this file automatically in its blame view.
#
# Only commits that contain NOTHING but formatting belong here. A commit that
# mixes a reformat with a functional change must not be listed: ignoring it
# would hide the functional lines' authorship too.

# style(gh-stage): reformat to Prettier, no behaviour change
<full sha of 3d7fc25>

# style: apply Prettier repo-wide (task.59)
<full sha of Phase 1's commit>

# Deliberately NOT listed — both interleave a reformat with a functional change,
# so ignoring them would hide ~296 genuinely functional lines along with the
# noise. Their history keeps the churn; see issue #179.
#
#   <sha of ee12ab7>  fix(jira-sync): section extraction dropped every numbered
#                     heading — 5,669 insertions, ~40 of them functional
#                     (2026-07-29, v0.29.5)
#   <sha of 08c917b>  fix(jira-sync): write relative document links — ~1,700
#                     lines across the four Jira files, 256 of them functional
#                     (2026-08-13, task.46)
```

Resolve the shas with:

```bash
git rev-parse 3d7fc25 ee12ab7 08c917b
```

### `.github/workflows/test.yml`

Insert between `Install dependencies` and `Hermetic test suite`:

```yaml
      - name: Formatting
        run: npm run format:check
```

Placed there deliberately: after `npm ci` (Prettier is a devDependency and must be installed), and
before the suite so a formatting failure costs seconds rather than the full ~60s test run plus the
replay evals.

### Verify the gate bites

A gate nobody has watched fail is a gate nobody knows works:

```bash
# collapse a wrapped call onto one line in any tracked JS file
node -e "const f='shared/resources/change-log.js';const s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s.replace(/\n\s+/,' '))"
npm run format:check    # must exit non-zero AND name change-log.js
git checkout shared/resources/change-log.js
npm run format:check    # clean again
```

And confirm blame filtering works:

```bash
git blame --ignore-revs-file .git-blame-ignore-revs shared/resources/gh-stage.js | grep -c 3d7fc25
# expect: 0
```

### Commit

```bash
git add .git-blame-ignore-revs .github/workflows/test.yml
git commit -m "ci: gate on Prettier, and ignore pure-format commits in blame

Wires \`npm run format:check\` into the Test workflow, before the suite so a
formatting failure fails fast. Only possible now that the sweep has landed —
the check has never passed before today.

.git-blame-ignore-revs lists the two verified-pure reformats. The two mixed
commits are named in a comment and deliberately excluded, with the reason.

Refs #179"
```

---

## Phase 3 — The record

### `CHANGELOG.md` — the v0.29.5 note

The v0.29.5 entry starts at line 672. Add the note directly under the `## [v0.29.5]` heading,
**above** `### Fixed`, so it is read before the content it qualifies:

```markdown
## [v0.29.5] - 2026-07-29

> **Note added 2026-08-17.** This release also contains a whole-file Prettier reformat of
> `shared/resources/jira-sync.js` and `skills/sync-jira-epic/scripts/*.js` that is unrelated to the
> fixes below and was not declared at the time. The release commit carries 5,669 insertions; roughly
> 40 of them are the functional change described here. The reformat came from a contributor's editor
> hook at a time when this repo had no formatter config of its own. Prettier was subsequently adopted
> as repo policy in [v0.39.0](#v0390---2026-08-14) and the repo swept to match (task.59). See
> [#179](https://github.com/Gamaroff/agent-skills/issues/179).
```

Do not edit the existing prose. The entry's account of the *fix* is accurate; what it lacked was an
account of everything else in the diff.

### `CHANGELOG.md` — the `Unreleased` entry

```markdown
### Changed

- **The repo is now Prettier-clean, and CI keeps it that way.** Adopting Prettier as policy
  (task.46) deliberately stopped short of the repo-wide sweep, so `npm run format:check` failed on
  50 files from the day it was added and nothing enforced the policy it described. This sweeps them
  — plus the ~53 `skills/*/references/` copies that `npm run bundle` regenerates from the formatted
  shared sources — as an isolated commit, then wires `format:check` into the Test workflow ahead of
  the suite. No behaviour changes: 1,287 tests pass identically before and after. Adds
  `.git-blame-ignore-revs` so the sweep and the earlier `style(gh-stage)` reformat drop out of
  blame; the two commits that interleaved a reformat with a functional change are named there but
  deliberately not ignored, because filtering them would hide the real edits too.
```

### `CONTRIBUTING.md` — the formatter-hook rule

Under `### Before you open a PR`, after the `npm test` block:

```markdown
**Formatting is checked in CI.** Run `npm run format` before you push — `prettier` is already a
devDependency, so `npm ci` provides it.

If your editor formats on save, keep the reformat out of your functional commits. A commit that
mixes a whole-file reformat with a 40-line change is unreviewable, breaks `git bisect` and
`git log -L`, and attributes the churn to a bugfix in `git blame` — this has happened twice here
([#179](https://github.com/Gamaroff/agent-skills/issues/179)). Run `npm run format` as its own
`style:` commit and add it to `.git-blame-ignore-revs`.
```

### Commit and open the PR

```bash
git add CHANGELOG.md CONTRIBUTING.md
git commit -m "docs: record the v0.29.5 reformat, and the rule that prevents the next one

Closes #179"
```

PR description should say, near the top, that commit 1 is a pure formatting sweep and can be
reviewed with `?w=1` or skipped — and that commits 2 and 3 are the actual content.

### On merge

Close #179 with a comment recording the disposition of each of its three proposals: option 1
adopted (policy in task.46, sweep here), option 2 done (the changelog note), option 3 declined
(history rewriting not worth it). State plainly that the blame complaint about `jira-sync.js` is
only partly resolved — the file's future is clean, its history keeps the churn — so nobody
re-opens it expecting otherwise.

---

## Key Patterns and References

- **`.prettierignore` is the contract.** JS only; Markdown/YAML/JSON are hand-wrapped and excluded
  by design; `skills/*/references/` are generated; `evals/**/replay/` must stay byte-exact. Do not
  widen it as part of this task.
- **`3d7fc25` is the worked example.** One source file plus nine bundled copies, all moving in a
  single `style:` commit with no functional change. Phase 1 is the same operation at repo scale.
- **`.githooks/pre-commit`** re-bundles and stages only its own delta. Its header comment explains
  why a blanket `git add skills/*/references/` was wrong — worth reading before touching bundling.
- **Bundle direction is one-way**: `shared/resources/` → `skills/*/references/`. Editing a bundled
  copy is silently reverted by the next `npm run bundle`.

## Testing Approach

There is nothing new to test, so the work is proving nothing changed:

| Check | Command | Expected |
| ----- | ------- | -------- |
| Semantics preserved | `npm test` | 1287 / 1287, identical to baseline |
| Replay evals | `npm run eval:all` | green |
| Skills valid | `npm run validate:all` | 115 / 115 |
| Formatting clean | `npm run format:check` | exit 0 |
| Bundle in step | `npm run bundle && git status --short` | empty |
| Gate bites | deliberate violation → `npm run format:check` | non-zero, names the file |
| Blame filtered | `git blame --ignore-revs-file …` | no lines from the pure-format commits |

No new test files. The CI gate is the regression test; the existing suite is the semantics check.
