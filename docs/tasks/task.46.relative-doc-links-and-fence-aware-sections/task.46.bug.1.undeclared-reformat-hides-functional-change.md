# Bug Report: Task 46 - Undeclared Prettier reformat hides the functional change

**Task**: [task.46.relative-doc-links-and-fence-aware-sections.md](./task.46.relative-doc-links-and-fence-aware-sections.md)
**Bug ID**: TASK-46-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-14
**Fixed**: 2026-08-14 (qa-fix cycle 1)

## Description

The change set reformats `sync-jira-task.js`, `sync-jira-story.js` and (partly) the other two
files wholesale, in the same commit as the functional change, without declaring it anywhere in
the task's Scope or Files Summary.

Normalising **both** sides of the diff with `prettier@3 --parser babel` and re-diffing isolates
how much of each file's diff is real:

| File | Raw diff | Functional | Reformatting |
| ---- | -------- | ---------- | ------------ |
| `skills/sync-jira-task/scripts/sync-jira-task.js` | 647 lines | **27** | 96% |
| `skills/sync-jira-story/scripts/sync-jira-story.js` | 788 lines | **35** | 96% |
| `skills/sync-jira-epic/scripts/sync-jira-epic.js` | 120 lines | 84 | 30% |
| `shared/resources/jira-sync.js` | 157 lines | 110 | 30% |

So a reviewer opening PR #215 sees ~1,700 changed lines across these four files to find 256 that
matter, and 62 of those are spread through two files that are 96% noise.

## Expected Behavior

Either the reformat is declared and separated — its own commit ahead of the functional one, so
the PR's second commit reads as the change it claims to be — or it does not happen in a card
whose own Scope section says it left `dropHeadingLines` / `firstTableIn` alone specifically "so
this card's diff stays reviewable."

## Actual Behavior

The reformat is undeclared, interleaved with the functional change, and the diff is ~5× larger
than the work it contains.

## Impact

- **Review.** The task's blast radius is every tracked document in every consumer repo. That is
  precisely the change a reviewer should read line by line, and this diff makes doing so
  impractical.
- **Reproducibility.** The repo has no `.prettierrc`, no `format` script in `package.json`, and
  no format step in `.githooks/pre-commit`. The formatting is therefore one author's editor
  settings, not repo policy — the next person to edit these files without the same setup will
  produce another churn diff, in the opposite direction.
- **Not a runtime risk.** Prettier is deterministic and the full suite (1,242 tests) passes, so
  this is reviewability and maintenance debt rather than a behavioural defect.

## Recommendation

Pick one and record it:

1. **Split** — reorder into `style(jira-sync): prettier` followed by the functional commit, so
   the PR reads. Best for this PR.
2. **Adopt** — add a `.prettierrc` and an `npm run format` script (optionally a pre-commit
   step), declare the reformat in the task's Scope, and treat the churn as a one-time cost that
   will not recur.

Doing neither leaves the repo in the state that produced this: files that get silently
reformatted whenever someone with format-on-save opens them.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-14

The reformat matches Prettier 3's defaults exactly — `npx prettier@3 --check` reports the
already-reformatted files clean with no config present. So the change was a formatter run, not
hand-editing, and the question was only whether to un-run it or to adopt it.

**Decision** (user, via qa-fix Step 2a): **adopt Prettier as repo policy**. Splitting the commits
was the alternative and was rejected — it would rewrite already-pushed history on PR #215 for a
one-time reviewability gain, while leaving the recurrence cause untouched.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-14

**Fix Description**:

- Added `.prettierrc` pinning the settings explicitly rather than relying on defaults, so a future
  Prettier major cannot silently re-churn the repo.
- Added `.prettierignore` scoping the tool to **JavaScript only**. Markdown, YAML and JSON are
  excluded because this repo's documents are hand-wrapped; generated `skills/*/references/` are
  excluded because formatting a copy independently of its source is how the two drift.
- Added `npm run format` and `npm run format:check`.
- Added `prettier@^3` as a devDependency.
- Formatted the two test suites this change set added — they were themselves not Prettier-clean,
  which is the inconsistency the policy exists to prevent.
- Declared the reformat in the task document's Scope, including the measured
  functional-vs-formatting split, and declared the repo-wide sweep out of scope.

**Files Modified**:

- `.prettierrc`, `.prettierignore` — new
- `package.json` — `format` / `format:check` scripts, `prettier` devDependency
- `skills/sync-jira-{story,epic}/tests/relative-doc-links.test.js` — formatted
- `docs/tasks/task.46.../task.46.relative-doc-links-and-fence-aware-sections.md` — Scope declaration
- `CHANGELOG.md` — Added entry

**Deliberately NOT done**: a repo-wide `npm run format` sweep. **50 files** are currently
unformatted — 10 in `shared/resources/tests`, 8 in `evals/shared/tests`, 7 in `shared/resources`,
4 in `tests/`, and the rest scattered. Sweeping them into this PR would bury this card's
functional change a second time, in the very commit that documents why not to. Left as a
follow-up.

> **Corrected in QA cycle 2.** This section first said "15 pre-existing test files" — that was the
> count for the `sync-jira-*` subset only, not the repo. The real figure is 50. A consequence
> follows that the first draft did not state: **`npm run format:check` fails today.** That is
> intended — it reports real drift — but it must not be wired into CI until the sweep lands, and
> saying so is the difference between a known state and a surprise.

**Verification Steps for QA**:

1. `npx prettier --check` over this change set's files reports clean.
2. `npm run format` exists and is scoped by `.prettierignore` (no `.md` / `.yml` / `.json`).
3. The task document's Scope now states the reformat and its measured size.
