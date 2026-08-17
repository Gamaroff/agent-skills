---
id: task.59
title: '[Task 59] Finish the Prettier adoption — sweep the 50 stragglers, then guard the boundary'
type: task
description: 'Prettier became repo policy on 2026-08-14 but the repo-wide sweep was deliberately deferred, so `npm run format:check` fails today on 50 files and nothing enforces the policy. This task runs the sweep as an isolated commit, re-bundles the shared resources it touches, adds a `.git-blame-ignore-revs` covering the pure-formatting commits, wires `format:check` into CI, and closes the two documentation gaps issue #179 left open — the unannounced reformat in the v0.29.5 changelog entry, and a contributor note that formatter hooks must not bundle a reformat into a functional commit.'
tags: [tooling, formatting, ci, technical-debt]
category: infrastructure
status: accepted
priority: Medium
risk_level: low
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 4
github_issue: 237
---

# [Task 59] Finish the Prettier adoption — sweep the 50 stragglers, then guard the boundary

**Status:** Accepted

**Task File**: [task.59.prettier-sweep-and-format-guard.md](./task.59.prettier-sweep-and-format-guard.md)

**Implementation Plan**: [task.59.plan.prettier-sweep-and-format-guard.md](./task.59.plan.prettier-sweep-and-format-guard.md)

**GitHub Issue**: [#237](https://github.com/Gamaroff/agent-skills/issues/237)

**Closes**: [#179](https://github.com/Gamaroff/agent-skills/issues/179)

## Overview

Prettier was adopted as repo policy on 2026-08-14 (`d477cee`, task.46 qa-fix cycle 1, shipped in
v0.39.0): `.prettierrc` with settings pinned explicitly, a JavaScript-only `.prettierignore`,
`format` / `format:check` scripts, and `prettier@^3` as a devDependency. The repo-wide sweep was
**deliberately** left out of that PR — sweeping 50 files into the very commit that documents why not
to bury a functional change would have been self-refuting.

That deferral was correct. It is also only three days old, which is the argument for picking it up
now rather than a reproach: the repo currently sits in the one state that is worse than either
endpoint — a policy exists, `npm run format:check` **fails**, and nothing enforces anything. Every
day it stays there is another branch that will have to be rebased over the sweep, and another
contributor who runs `format:check`, sees it fail, and concludes the tooling is broken.

**Scope**: run the sweep as an isolated commit, propagate it through `npm run bundle`, add a
`.git-blame-ignore-revs`, wire `format:check` into the existing Test workflow, and write the two
notes issue #179 asked for and nobody wrote.

---

## Motivation

### Current Problems

1. **`npm run format:check` fails on 50 files.** Verified 2026-08-17 — the same count
   `task.46.bug.1` recorded on 2026-08-14. A check that has never once passed is not a check; the
   next person to run it will conclude the tooling is broken rather than that the repo is dirty.

2. **The policy has no enforcement, so it does not prevent the thing it was adopted to prevent.**
   `.prettierrc` fixes the *style mismatch* — a contributor's editor hook can no longer impose a
   foreign convention, because the repo now has one of its own. It does nothing about the *actual*
   failure mode in both incidents: a reformat silently bundled into a functional commit. The
   formatter is now agreed on; the diff is still unreviewable.

3. **It has already happened twice, just over two weeks apart.**

   | Commit | Date | Shipped in | Raw diff | Functional | Noise |
   | ------ | ---- | ---------- | -------- | ---------- | ----- |
   | `ee12ab7` | 2026-07-29 | v0.29.5 (PR [#178](https://github.com/Gamaroff/agent-skills/pull/178)) | 5,669 insertions | ~40 | >99% |
   | `08c917b` | 2026-08-13 | task.46 (PR [#215](https://github.com/Gamaroff/agent-skills/pull/215)) | ~1,700 lines across the four Jira files | 256 | ~85% |

   The second landed **while issue #179 was open**, filed fifteen days earlier and describing the
   identical mistake in detail. Both were caught after the fact — the first by that issue, the
   second by QA. Neither was caught by a gate, because there is no gate.

   That is the whole case for enforcement over documentation. An open, well-argued issue did not
   prevent the recurrence, and the `.prettierrc` written the day after the second incident would
   not have prevented it either: it settles *which style wins*, not *whether the reformat gets
   bundled into someone's bugfix*.

4. **The v0.29.5 changelog entry still describes only the fix.** `CHANGELOG.md:672` documents the
   section-heading work in detail and says nothing about the ~5,600 lines of reformatting shipped
   alongside it. The diff and the changelog disagree about what that release contained, and a
   reader who trusts the changelog will be surprised by the diff.

5. **`git blame` on the shared Jira files attributes formatting churn to bugfix commits**, and
   there is no `.git-blame-ignore-revs` to filter any of it — not even the one commit in the repo
   that is verifiably a pure reformat (`3d7fc25`, `style(gh-stage)`).

### Benefits

1. **`format:check` starts passing**, so it can become load-bearing. This is the precondition for
   everything else here — a gate cannot be wired into CI while it fails.
2. **The next reformat cannot ship silently.** CI fails on unformatted files, so the only way in is
   a deliberate `npm run format`, which produces a diff the author has to look at.
3. **`git blame` and `git log -L` get cleaner** on `gh-stage.js` and on every file the sweep
   touches — partially; see Decisions for what this honestly cannot fix.
4. **The changelog stops disagreeing with the diff** for v0.29.5.
5. **Issue #179 closes** — filed 2026-07-29, open ever since — with each of its asks either done or
   explicitly declined in writing.

---

## Technical Background

### Current Architecture

Prettier is configured but unenforced and unapplied.

```
.prettierrc            printWidth 80, tabWidth 2, semi, double quotes,
                       trailingComma all, arrowParens always, endOfLine lf
                       (pinned explicitly, not defaults — a Prettier major
                       cannot silently re-churn the repo)

.prettierignore        JavaScript only:
                         *.md *.yml *.yaml *.json   — hand-wrapped, excluded by design
                         skills/*/references/       — generated by `npm run bundle`
                         evals/**/replay/           — fixtures must stay byte-exact
                         skills/*/*.zip             — build artifacts

package.json           "format": "prettier --write ."
                       "format:check": "prettier --check ."
                       devDependency prettier ^3.9.6

.github/workflows/     docs-link-check · release · test · validate
                       — none of them runs format:check

.git-blame-ignore-revs does not exist
```

**The 50 unformatted files**, by directory:

| Directory | Files |
| --------- | ----- |
| `shared/resources/tests/` | 11 |
| `evals/shared/tests/` | 8 |
| `shared/resources/` | 6 |
| `tests/` | 4 |
| `evals/shared/lib/` | 3 |
| `evals/shared/drivers/`, `evals/develop-task/protocol/` | 2 each |
| 14 further directories (skill `scripts/` and `tests/`, eval protocol/unit) | 1 each |

### The bundled-copy multiplier

Five of the six unformatted files in `shared/resources/` are bundle sources, so formatting them and
re-running `npm run bundle` rewrites their copies under `skills/*/references/`:

| Source | Bundled copies |
| ------ | -------------- |
| `change-log.js` | 14 |
| `tracker-workflow.js` | 14 |
| `yaml-subset.js` | 14 |
| `jira-stage.js` | 9 |
| `create-skills-lib.js` | 2 |

**~53 additional files**, for ~103 in the sweep commit. This is expected and is exactly how
`3d7fc25` behaved (one source file, nine bundled copies, all moving together). The copies are in
`.prettierignore` precisely so they are never formatted independently of their source — the sweep
must therefore reach them through `npm run bundle`, never through `prettier --write`.

### Target Architecture

```
.prettierrc            unchanged
.prettierignore        unchanged
package.json           unchanged

.git-blame-ignore-revs NEW — 3d7fc25 + the sweep commit, with a header comment
                       recording which commits are deliberately absent and why

.github/workflows/     test.yml gains a `Formatting` step running
  test.yml             `npm run format:check` before `npm test`

CHANGELOG.md           v0.29.5 entry gains a note recording the undeclared reformat

CONTRIBUTING.md        "Before you open a PR" gains the formatter-hook rule

npm run format:check   passes
```

---

## Breaking Changes

No runtime behaviour changes — Prettier is deterministic and semantics-preserving, and this task
adds no functional code. Two workflow-level breaks, both with migration paths:

### 1. `format:check` becomes a blocking CI gate

**Before**: a PR containing unformatted JavaScript merges.
**After**: it fails the Test workflow before the suite runs.

**Affected**: every contributor, and any agent-driven pipeline that opens a PR.

**Migration**: run `npm run format` before pushing. `prettier` is already a devDependency, so
`npm ci` provides it — no new install step. Added to `CONTRIBUTING.md` in Phase 3.

### 2. In-flight branches that touch JavaScript will conflict with the sweep

**Before**: a branch cut before the sweep rebases cleanly.
**After**: any branch touching one of the ~103 swept `.js` files hits conflicts, because every line
moved.

**Affected**: open branches that touch JavaScript. **Doc-only branches are not affected** —
Markdown, YAML and JSON are `.prettierignore`d, so the sweep never touches them. This matters
because most of the 51-58 sequence is documentation.

**Checked 2026-08-17: nothing was actually at risk.** Task 49 had already merged
([#223](https://github.com/Gamaroff/agent-skills/pull/223)), and task 51's branch turned out to be
markdown-only — it merged as [#238](https://github.com/Gamaroff/agent-skills/pull/238) with no
interaction with this task at all. The exposure was assumed rather than measured; measuring it took
one `git diff --name-only | grep -v '\.md$'`.

**Migration**: merge or rebase in-flight *code* work before the sweep lands, or resolve by taking
the branch's version and re-running `npm run format`. Check the actual exposure first rather than
assuming it:

```bash
for b in $(git branch -r --no-merged origin/main --format='%(refname:short)'); do
  n=$(git diff --name-only origin/main..."$b" | grep -cE '\.(js|mjs|cjs)$')
  [ "$n" -gt 0 ] && echo "$b — $n JS files"
done
```

---

## Scope

### In Scope

- ✅ `npm run format` across the repo — the 50 files `format:check` currently reports
- ✅ `npm run bundle` to propagate formatted `shared/resources/*.js` into their ~53 bundled copies
- ✅ `.git-blame-ignore-revs` listing the pure-formatting commits only
- ✅ A `Formatting` step in `.github/workflows/test.yml`, before the suite
- ✅ A note on the v0.29.5 `CHANGELOG.md` entry recording the undeclared reformat
- ✅ A formatter-hook rule in `CONTRIBUTING.md` under "Before you open a PR"
- ✅ Closing issue #179 with a comment recording what was done and what was declined

### Out of Scope

- ❌ **Formatting Markdown, YAML or JSON.** `.prettierignore` excludes them deliberately — this
   repo's documents are hand-wrapped and a reformat would churn hundreds of files while making them
   harder to read. Not revisited here.
- ❌ **ESLint, or any lint rule beyond formatting.** Separate decision, separate task.
- ❌ **A pre-commit format hook.** `.githooks/pre-commit` already does bundling; adding a blocking
   format check there slows every commit and surprises people mid-rebase. CI is the gate.
- ❌ **Rewriting `ee12ab7` or `08c917b`.** Both are pushed, released, and referenced. History
   rewriting for a retroactive reviewability gain is not worth it — the same reasoning that
   rejected option 3 in #179.
- ❌ **Blame-ignoring the two mixed commits.** See Decisions.
- ❌ **Re-releasing v0.29.5.** The changelog gets a note, not a new version.

---

## Decisions

Three decisions were taken at task creation (2026-08-17, user):

### 1. `.git-blame-ignore-revs` lists the pure reformats — and, after measuring, the mixed ones too

**As originally decided**, the file listed only `3d7fc25` (`style(gh-stage)`, verified pure) and
this task's sweep commit. `ee12ab7` and `08c917b` were excluded because both interleave a reformat
with a functional change, and ignoring them hides ~296 genuinely functional lines along with the
noise. The consequence was recorded honestly at the time: #179's complaint about `git blame` on
`jira-sync.js` would be only *partly* addressed.

**Revised 2026-08-17, after measuring what "partly" actually meant.** Across the four affected Jira
files the two commits held **2,376 lines** of blame attribution:

| File | `ee12ab7` | `08c917b` |
| ---- | --------- | --------- |
| `shared/resources/jira-sync.js` | 586 | 141 |
| `skills/sync-jira-story/scripts/sync-jira-story.js` | 0 | 598 |
| `skills/sync-jira-task/scripts/sync-jira-task.js` | 0 | 491 |
| `skills/sync-jira-epic/scripts/sync-jira-epic.js` | 487 | 73 |

An 8:1 ratio of noise to signal. Excluding them left blame *technically accurate and practically
useless* on precisely the files the issue was about — accuracy that answers no question anyone
asks. Including them drops attribution to **77 lines**, a 97% reduction; the residue is additions
git cannot re-attribute, which sit close to the functional core.

There is no third option: git cannot ignore part of a commit. Ignoring one re-attributes its added
lines to whatever last touched the region, so the trade is unavoidable — 2,376 uninformative
attributions against ~296 wrong ones.

**The cost is documented rather than hidden.** The ignore file's header states which lines are
affected and carries the `git show` commands that recover their true provenance. The general rule
does not move: a reformat belongs in its own commit, `CONTRIBUTING.md` says so, and no further
mixed commit should be added there without measuring the same ratio first.

### 2. The gate is a step in `test.yml`, not a new workflow or a pre-commit hook

Cheapest option, no new workflow file, and it fails fast — before the hermetic suite and the replay
evals, which are the slow part.

### 3. One PR, three commits

1. `style: apply Prettier repo-wide` — the sweep plus the re-bundle. Zero functional change.
2. The guard — `.git-blame-ignore-revs` and the CI step.
3. The docs — changelog note and contributor note.

Reviewable commit-by-commit, and the sweep is isolated so a reviewer can skip it in one keystroke.
This is the shape both incidents failed to use, which makes using it here the point.

Commit 2 references commit 1's sha, so `.git-blame-ignore-revs` is written with a placeholder and
amended once commit 1 exists — or written after commit 1, which is simpler. The plan file takes the
latter route.

---

## Implementation Plan

> Detailed implementation guide: [task.59.plan.prettier-sweep-and-format-guard.md](./task.59.plan.prettier-sweep-and-format-guard.md)

### Phase 1 — The sweep (Risk: Low)

Files: ~103 (50 formatted + ~53 re-bundled).

- [ ] Run the JS-exposure check (Breaking Changes #2); land or rebase any branch it names.
      Doc-only branches need nothing — `.md` is `.prettierignore`d
- [ ] Re-confirm the baseline: `npm test` green at **1,287 passing / 0 failing** (measured
      2026-08-17; re-measure rather than trust this if the branch has moved)
- [ ] `npm run format`
- [ ] `npm run bundle` — propagates formatted shared resources into `skills/*/references/`
- [ ] `npm run format:check` → passes
- [ ] `npm test` → same count, same result as the baseline
- [ ] `npm run validate:all` → passes
- [ ] Verify `npm run bundle` is now a no-op (`git status` clean after a second run)
- [ ] Commit as `style: apply Prettier repo-wide (task.59)` — **nothing else in this commit**

Dependencies: none.

### Phase 2 — The guard (Risk: Low)

Files: `.git-blame-ignore-revs` (new), `.github/workflows/test.yml`.

- [ ] Create `.git-blame-ignore-revs` with the full sha of `3d7fc25` and of Phase 1's commit
- [ ] Write the header comment: what the file is for, the `git config` line to activate it, and
      why `ee12ab7` / `08c917b` are absent
- [ ] Add a `Formatting` step to `test.yml` running `npm run format:check`, placed after
      `npm ci` and before `Hermetic test suite`
- [ ] Verify the gate bites: introduce a deliberate formatting violation locally, confirm
      `npm run format:check` exits non-zero, revert it
- [ ] Confirm `git blame --ignore-revs-file .git-blame-ignore-revs shared/resources/gh-stage.js`
      no longer attributes lines to `3d7fc25`
- [ ] Commit as `ci: gate on Prettier, and ignore pure-format commits in blame`

Dependencies: Phase 1 (needs its sha).

### Phase 3 — The record (Risk: Low)

Files: `CHANGELOG.md`, `CONTRIBUTING.md`.

- [ ] Add a note to the v0.29.5 entry (`CHANGELOG.md:672`) recording that the release also carried
      an unrelated whole-file reformat, with the measured size and a pointer to #179
- [ ] Add an `Unreleased` entry for this task's own changes
- [ ] Add the formatter-hook rule to `CONTRIBUTING.md` under "Before you open a PR": a reformat may
      not share a commit with a functional change; run `npm run format` as its own commit
- [ ] Commit as `docs: record the v0.29.5 reformat, and the rule that prevents the next one`
- [ ] Open the PR; on merge, close #179 with a comment recording what was done and what was declined

Dependencies: Phase 1 (the contributor note describes the now-enforced state).

---

## Files Summary

**Formatted (Phase 1)** — no review needed beyond confirming the diff is formatting-only:

1. ✅ 50 files reported by `npm run format:check`, across `shared/resources/`,
   `shared/resources/tests/`, `evals/shared/{lib,drivers,tests}/`, `evals/*/protocol/`,
   `evals/*/unit/`, `tests/`, and eight `skills/*/{scripts,tests}/` files
2. ✅ ~53 regenerated copies under `skills/*/references/` (via `npm run bundle`, not Prettier)

**New (Phase 2)**:

3. ✅ `.git-blame-ignore-revs` — pure-formatting commits, with an explanatory header

**Modified (Phase 2–3)**:

4. ✅ `.github/workflows/test.yml` — `Formatting` step before the suite
5. ✅ `CHANGELOG.md` — note on the v0.29.5 entry; `Unreleased` entry for this task
6. ✅ `CONTRIBUTING.md` — formatter-hook rule under "Before you open a PR"

**Registry**:

7. ✅ `docs/tasks/task-registry.md` — row for task 59, counter to 60

**Deleted**: none.

---

## Testing Strategy

The whole task is a formatting change plus configuration, so testing is about proving the sweep
changed **nothing** and the gate catches **something**.

### Semantics preservation (the load-bearing check)

- **Scope**: every file the sweep touches.
- **Method**: `npm test` before and after Phase 1 — identical pass count, identical result. The
  baseline is **1,287 passing / 0 failing**, measured on this branch on 2026-08-17. Prettier is
  deterministic and semantics-preserving, so any delta is a real defect, not a formatting artifact.
- **Command**: `npm test` (hermetic L1–L4) and `npm run eval:all` (replay).
- **Watch for**: tests that assert on source text or line numbers rather than behaviour. None are
  known, and `evals/**/replay/` is `.prettierignore`d so recorded fixtures stay byte-exact — but a
  failure here is the signal that one exists.

### Bundle integrity

- **Scope**: the ~53 `skills/*/references/` copies.
- **Method**: after Phase 1, run `npm run bundle` a second time and confirm `git status` is clean.
  A non-empty diff means a copy is out of step with its source — the exact drift `.prettierignore`
  exists to prevent.
- **Also**: `npm run validate:all` (115 skills) must pass, confirming no bundled copy was corrupted.

### Gate verification

- **Scope**: the new `test.yml` step.
- **Method**: introduce a deliberate violation (collapse a wrapped call onto one line), confirm
  `npm run format:check` exits non-zero and names the file, then revert. A gate nobody has seen
  fail is a gate nobody knows works.
- **CI confirmation**: the PR itself exercises the step — it must appear green in the Test workflow.

### Blame verification

- **Scope**: `.git-blame-ignore-revs`.
- **Method**: `git blame --ignore-revs-file .git-blame-ignore-revs shared/resources/gh-stage.js`
  attributes no lines to `3d7fc25`; the same command over a Phase 1-swept file attributes none to
  the sweep commit.

**No new automated tests.** There is no behaviour to pin — the CI gate *is* the regression test, and
the semantics check is the existing suite.

---

## Success Criteria

### Functional

- [ ] `npm run format:check` exits 0
- [ ] `npm test` passes at 1,287 / 0 — the same count as the pre-sweep baseline
- [ ] `npm run eval:all` passes
- [ ] `npm run validate:all` passes (115/115)
- [ ] `npm run bundle` is a no-op after Phase 1 — no uncommitted diff

### Performance

- [ ] The `Formatting` CI step adds under ~15s to the Test workflow (Prettier over a JS-only repo
      of this size; `npm ci` already installed it, so there is no extra install cost)
- [ ] No runtime performance impact — no shipped code path changes

### Code Quality

- [ ] Phase 1's commit contains **only** formatting and re-bundling — verified by
      `git show --stat` against the expected ~103 files, and by re-diffing both sides through
      Prettier to confirm zero functional delta
- [ ] Phases 2 and 3 contain no formatting churn
- [ ] `.git-blame-ignore-revs` uses full 40-character shas (git rejects abbreviated ones)
- [ ] The blame-ignore header states which commits are deliberately absent, and why

### Migration / Documentation

- [ ] The v0.29.5 changelog entry records the reformat, its measured size, and a link to #179
- [ ] `CONTRIBUTING.md` states the formatter-hook rule
- [ ] `CHANGELOG.md` has an `Unreleased` entry for this task
- [ ] Issue #179 is closed with a comment naming what shipped and what was declined
- [ ] `docs/tasks/task-registry.md` row added, counter incremented to 60

---

## Risk Assessment

### High Risk

None. The change is semantics-preserving, deterministic, reversible with `git revert`, and touches
no shipped code path.

### Medium Risk

**1. In-flight branches that touch JavaScript conflict with the sweep.**

- **Risk**: an open branch touching one of the ~103 swept `.js` files hits conflicts on every line.
- **Probability**: Low as measured on 2026-08-17 — no branch was at risk (49 already merged, 51
  markdown-only). Rises with the number of open *code* branches, so re-measure before running the
  sweep rather than trusting this line.
- **Impact**: Medium — annoying, not dangerous. Resolution is mechanical: take the branch's
  version, re-run `npm run format`.
- **Mitigation**: run the exposure check in Breaking Changes #2 first. Land or rebase whatever it
  names. Announce the sweep in the PR description.

**2. A test asserts on source text rather than behaviour.**

- **Risk**: a test reading a source file and matching against literal formatting breaks.
- **Probability**: Low — none known, and the suite has already survived two large Prettier runs
  (`ee12ab7`, `08c917b`) unchanged.
- **Impact**: Medium — would surface as a red suite in Phase 1, before anything is committed.
- **Mitigation**: the before/after baseline comparison catches it immediately. If one exists, fix
  the test to assert on behaviour — it was fragile regardless.

### Low Risk

**3. A bundled copy drifts from its source.**

- **Risk**: `skills/*/references/` copies end up formatted differently from `shared/resources/`.
- **Probability**: Low — `.prettierignore` excludes them, so the only way they change is
  `npm run bundle`.
- **Impact**: Low — caught by the second-`bundle`-is-a-no-op check and by `validate:all`.
- **Mitigation**: never run `prettier --write` against `skills/*/references/` directly; the
  ignore file already enforces this.

**4. The CI gate blocks an urgent hotfix on a formatting triviality.**

- **Risk**: a one-line production fix fails CI because the file was not Prettier-clean.
- **Probability**: Low after the sweep — every file is clean, so only a *new* violation trips it.
- **Impact**: Low — resolution is `npm run format`, seconds of work.
- **Mitigation**: none needed. This is the gate doing its job.

---

## Rollback Plan

### Immediate Rollback (< 15 minutes)

**Triggers**:

- `npm test` count differs from the baseline after Phase 1 and the cause is not immediately obvious
- CI red on `main` for a reason traced to the sweep

**Steps**:

1. `git revert <sweep-sha>` — a single revert restores all ~103 files; Prettier's determinism makes
   this exact
2. `git revert <guard-sha>` if the CI step is implicated
3. Push; confirm CI green

**Validation**: `npm test` back to baseline, CI green.

### Partial Rollback (< 30 minutes)

**When**: the sweep is fine but the CI gate is disruptive — e.g. it is blocking an urgent release.

**Steps**: revert Phase 2's `test.yml` change only. The sweep, the blame-ignore file and the docs
all stand on their own; the gate can be re-added in a follow-up PR without redoing anything.

### Forward Fix

**When**: an individual file formats badly (an ASCII table in a template literal, a hand-aligned
matrix).

**Approach**: do not revert. Add a targeted `// prettier-ignore` above the construct, or add the
path to `.prettierignore` with a comment saying why. Both keep the gate intact.

### Rollback Triggers

- **Critical** (revert now): test-count delta traced to the sweep; CI red on `main`
- **Non-critical** (fix forward): an ugly individual reformat; a contributor blocked by the gate;
  a bundled copy out of step

---

## Progress Tracking

- [x] Phase 1 — The sweep (`99c556b`)
- [x] Phase 2 — The guard (`dd74778`)
- [x] Phase 3 — The record (`2e1adee`)
- [x] PR opened ([#240](https://github.com/Gamaroff/agent-skills/pull/240))
- [x] CI green — `test`, `validate`, `link-check`; the new Formatting step ran and passed in position
- [x] PR merged (`26e4aff` → `develop`)
- [x] Issue [#179](https://github.com/Gamaroff/agent-skills/issues/179) closed with a resolution comment

### Outcome against the baseline

| Check | Before | After |
| ----- | ------ | ----- |
| `npm test` | 1287 / 0 | 1287 / 0 |
| `npm run validate:all` | 115 / 0 | 115 / 0 |
| `npm run format:check` | fails, 50 files | passes |
| `npm run bundle` re-run | — | no-op |

**Two deviations from this document, both benign:**

1. **Bundled copies were 56, not the estimated ~53** — 106 files in the sweep commit rather than ~103. The estimate counted copies of the five unformatted bundle sources; the actual regeneration is what `npm run bundle` decides.
2. **The pre-flight JS-exposure check found nothing at risk**, so no branch had to be landed or rebased first. This confirmed the correction already recorded in Breaking Changes #2 — the two branches originally named as blockers never were.

One process note worth keeping: the first attempt at the formatting-only proof reported **57 false positives**. The harness shelled out through pipelines that `nvm` was injecting help text into, corrupting the captured output. Re-run in-process against Prettier's API it was clean at zero. A verification harness can fail in ways that look exactly like the defect it is checking for.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-17 | 1.0     | Initial draft | create-task |
| 2026-08-17 | 1.1     | Implemented and merged (#240). Status → accepted. Recorded outcome, two deviations, and the false-positive verification harness. | develop-task |
| 2026-08-17 | 1.2     | Blame decision reversed on measured grounds: the two mixed commits are now ignored (2,376 → 77 attributed lines). Cost documented in the ignore file's header. | develop-task |

---

## References

- [Issue #179 — v0.29.5 shipped a whole-file reformat alongside a 40-line fix, unannounced](https://github.com/Gamaroff/agent-skills/issues/179)
- [task.46.bug.1 — Undeclared Prettier reformat hides the functional change](../task.46.relative-doc-links-and-fence-aware-sections/task.46.bug.1.undeclared-reformat-hides-functional-change.md) — the second incident, and the decision to adopt Prettier
- [task.46](../task.46.relative-doc-links-and-fence-aware-sections/task.46.relative-doc-links-and-fence-aware-sections.md) — the card that adopted the policy and deferred the sweep
- `d477cee` — `fix(task.46): qa-fix cycle 1 — adopt Prettier as policy`
- `3d7fc25` — `style(gh-stage): reformat to Prettier, no behaviour change` (the one verified-pure reformat)
- `ee12ab7` — the v0.29.5 mixed commit (2026-07-29)
- `08c917b` — the task.46 mixed commit (2026-08-13)
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — "Before you open a PR"
- [docs/contributing/packaging.md](../../contributing/packaging.md) — bundling and `skills/*/references/`
