---
id: task.147.plan
title: "Implementation Plan: develop pipeline — five steps that fail or overreach on correct input"
type: plan
task-ref: task.147.develop-pipeline-step-mechanics.md
---

# Implementation Plan: develop pipeline step mechanics

> Requirements and success criteria: [task.147.develop-pipeline-step-mechanics.md](task.147.develop-pipeline-step-mechanics.md)

## Overview

This plan makes seven independent edits to shared step documents, one shell helper and three
`SKILL.md` files. Each ships with a test that cuts its block out of the shipped document and
**runs** it in a fixture git repository. Edit `shared/resources/` only, then run `npm run bundle`.
Line numbers below were read on 2026-09-24 at `e04de749`. Each one is paired with its anchor
string, so the edit can still be found after the file moves.

## Shared test harness (write once, reuse in all six new tests)

Follow `shared/resources/tests/probe-base-binding.test.mjs`:

- `extractBlocks(markdown)` from `shared/resources/qa-execute-snippets.mjs`, the repository's
  fence reader. Pick the block by a **unique anchor string inside it**, and assert exactly one
  block matched. That is the non-vacuity floor.
- `bind(block, map)` replaces each `{placeholder}` and then asserts that `/\{[a-z][a-z-]*\}/` no
  longer matches outside `${…}` expansions, so an unbound placeholder is a red test, not a literal
  path.
- `fixtureRepo()`: `git init --bare origin.git`, clone, one base commit on `develop`, feature
  branch pushed. It is the same shape as `new_repo` in `shared/resources/verify-push-state.test.sh`.
- `ghStub(dir, script)` writes an executable `gh` into `dir/bin` and prepends that to `PATH`. The
  stub appends `"$@"` to `dir/gh.argv` and prints canned JSON for `pr view`.
- Run each case under `bash` and, when `zshAvailable()` is true, `zsh`. Take timeouts from
  `spawnBudget("<NAME>")` in `shared/resources/spawn-budget.mjs`, never a literal.

If two or more tests need the same helpers, put them in
`shared/resources/tests/lib/executed-prose.mjs`. Check first whether `probe-base-binding.test.mjs`
already has an extractable form (`grep -n "^function\|^const .* = (" shared/resources/tests/probe-base-binding.test.mjs`).
Reuse it rather than writing a second one.

## Phase-by-Phase Implementation Guide

### Phase 1: Step 8 check 3 (obs #173)

**Anchor**: `shared/resources/develop-pipeline-step-8-commit.md` § "Step 8 Completion Checklist",
comment `# 3. Implementation report finalised` (line 164).

```bash
# before
grep -qE "^\*\*Final Status:\*\* (Completed|Accepted)" "$REPORT" || …
grep -qE "^\*\*Finished:\*\* [0-9]" "$REPORT" || …
# after — the template writes `**Final Status**:` (story/task) and `**Final Status:**` (bug header)
grep -qE "^\*\*Final Status(:\*\*|\*\*:) (Completed|Accepted)" "$REPORT" || …
grep -qE "^\*\*Finished(:\*\*|\*\*:) [0-9]" "$REPORT" || …
```

Also update the comment on line 164 to name both forms and cite obs #173.

**Re-pin** `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`, test "#3+#4 — step-8
doc has BLOCKING post-condition checklist". The two `assert.match` regexes for Final Status and
Finished must match the new alternation text.

**New test** `shared/resources/tests/step-8-completion-checklist.test.mjs`:

- Extract the Completion Checklist block, anchored on `✅ Step 8 post-conditions verified`.
- Bind `{work-item-dir}` to `docs/tasks/task.9.fx`, `IMPLEMENTATION_REPORT` to a report inside
  it, and the path `.agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh`
  to the real `shared/resources/verify-push-state.sh`. `gh` stub: `pr view --json baseRefName`
  prints `develop`.
- **Build the report from the template.** Read `shared/resources/implementation-report-template.md`,
  cut each variant's `## Completion` section (story variant under `## Story variant`, task under
  `## Task variant`), and replace `{populated at end}` with `2026-09-24 10:00 UTC` and
  `{Completed / Failed / Escalated}` with `Completed`. For the bug variant, take the header lines
  (`**Finished:** —`, `**Final Status:** In Progress`) and set them to a timestamp and `Completed`.
  A template edit then reaches the test, which is the obs #173 principle.
- Cases:
  - task report and clean tree → exit 0
  - story report → exit 0
  - bug report → exit 0
  - unfilled template → exit 1, message contains `Final Status`
  - `In Progress` → exit 1
- Commit and push the report in the fixture so check 5 sees a clean, pushed branch.

### Phase 2: Step 4 leak check (obs #141)

**Anchor**: `shared/resources/develop-pipeline-step-4-create-pr.md`, sentence "After create-pr
completes, verify no out-of-scope path leaked into the commit:" (line 114). The block starts at
line 116.

```bash
# before
git log -1 --name-only HEAD | tail -n +3 | while IFS= read -r f; do
# after — file names only; no header or message lines to skip (obs #141)
git diff-tree --no-commit-id --name-only -r HEAD | while IFS= read -r f; do
```

Add one sentence under the block: "`diff-tree` prints file names only. Never parse `git log`
output positionally, because its header and message are variable-length."

`diff-tree` on a merge commit prints nothing without `-m`. Step 4's commit is never a merge, and
the test pins a non-merge commit.

**New test** `shared/resources/tests/step-4-leak-check.test.mjs`:

- Extract by the anchor `LEAK DETECTED`. Bind `SCOPE_PATHS` by prefixing the block with
  `SCOPE_PATHS=("docs/tasks/task.9.fx" "src")`.
- Case A: one commit touching `docs/tasks/task.9.fx/a.md` and `src/b.js`, with a 6-line message
  body → stdout `OK`.
- Case B: the same with a one-line subject → `OK`. On today's code this fails on `Date:`.
- Case C: add `other/c.txt` to the commit → stdout contains `LEAK DETECTED`. The per-line form
  (run the block with the trailing `| grep -q … || echo "OK"` stripped) names exactly `other/c.txt`
  and nothing else.

### Phase 3: QA loop stage-before-gate (obs #171)

**Anchor**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` § "5b. Run QA Fix (shared)".
Insert between item `0. **Check for actual changes**` (line 924) and item `0a. **Run the fast gate
before committing.**` (line 934):

```markdown
0-stage. **Stage this cycle's evidence before the gate.** The fast gate's doc-links check reads
   the tracked tree (`git ls-files`), and `/qa-task` / `/qa-story` have just linked the work item
   to this cycle's gate and QA report, which are still untracked. Staging them here makes the gate
   measure the tree the `fix(...)` commit will carry (obs #171; task.143 cycles 1 and 6):

   ```bash
   GATE_FILE="{the latest gate file — resolved per §Finding the Latest Gate File}"
   QA_FILE="{the cycle's QA report — the .qa.{N}. file with the same N}"
   git add -- "$GATE_FILE" "$QA_FILE"
   ```

   **After step 0, never before it**: a staged new file shows in `git diff --stat HEAD`, so
   staging first would make step 0's no-change HALT unreachable. Step 1 unstages only the
   implementation report, so these two stay staged into the commit.
```

The step number is the implementer's choice (`0-stage`, or renumber to 0a/0b). The resume
contract, the Remaining Work banner and `evals/**` may cite "5b step 0a" by number. Check with
`git grep -n "step 0a\|0a\." -- shared/resources skills evals` before renumbering, and update
every hit if you do.

**New test** `shared/resources/tests/qa-loop-stage-before-gate.test.mjs`:

- Extract by the anchor `git add -- "$GATE_FILE" "$QA_FILE"`. Bind both variables to fixture
  paths. First create untracked `task.9.gate.1.fx.yml` and `task.9.qa.1.fx.md`, plus a modified
  (tracked) `task.9.implementation.1.fx.md`.
- After running: `git ls-files` contains both evidence files, and `git diff --cached --name-only`
  does not contain the implementation report.
- Ordering (structural, within the §5b section only): the offset of the anchor is greater than the
  offset of `git diff --stat HEAD` and less than the offset of `<fastGateCommand> > "$FIX_LOG"`.

### Phase 4: scope-bounded staging and push verification (obs #142 parts 1–2)

**4a. `skills/commit-changes/SKILL.md` § "`--scope` mode"** (lines 46-72):

```bash
git add -u -- "scope/one" "scope/two" ...   # tracked modifications INSIDE the scope only
git add -- "scope/one" "scope/two" ...      # new files inside the scope
# git add -A is NEVER called in scope mode
```

Rewrite the paragraph at line 56 to say the allowlist bounds both halves, and why (obs #142: a
second session's tracked edits in a shared checkout). Update the flags-table row at line 27 and the
smoke test at line 70, which adds a tracked sibling edit that must stay unstaged.

**4b. Prose restatements.** In `develop-pipeline-step-8-commit.md:47`, change "stages tracked
modifications across the whole tree (`git add -u`)" to the scoped wording. In
`develop-pipeline-resume-contract.md:194`, change "Step 8's `/commit-changes --scope` sweeps the
work-item directory" and check the clause still reads true.

**4c. Step 4 Pre-flight Guard** (`develop-pipeline-step-4-create-pr.md`, after the untracked-hold
loop). Report tracked modifications outside `SCOPE_PATHS` and move nothing:

```bash
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  IN_SCOPE=false
  for sp in "${SCOPE_PATHS[@]}"; do case "$f" in "${sp}"*) IN_SCOPE=true; break;; esac; done
  [ "$IN_SCOPE" = false ] && echo "Pre-flight: tracked modification outside scope, NOT staged: $f"
done < <(git diff --name-only HEAD)
```

**4d. `shared/resources/verify-push-state.sh`.**

- Argument loop: `--scope) SCOPES+=("${2:-}"); shift 2 ;;`, with `SCOPES=()` initialised at the
  top. Update the header's Usage and the `-h` `sed -n` range.
- Check 3: when `${#SCOPES[@]} -eq 0`, keep today's behaviour. Otherwise, for each porcelain line,
  take the path (`${line:3}`, and for renames the part after ` -> `) and prefix-match it against
  `SCOPES`. Inside → collect as failing. Outside → `note "! outside scope (warning): $path"`.
  `fail` only when the inside list is non-empty, and `ok "working tree clean within scope (N
  path(s) outside scope, listed above)"` otherwise.
- Keep the NOTE ON EXIT CODES discipline: no status-bearing pipes.

**4e. `shared/resources/verify-push-state.test.sh`** gets cases 10–12 on the existing `new_repo`
fixture. Put the scope at `docs/tasks/task.1/` and create an outside dirty file `package.json` and
an inside dirty file `docs/tasks/task.1/x.md`.

**4f. Step 8 check 5** (`develop-pipeline-step-8-commit.md:181`) gets
`--scope "{work-item-dir}"` added to the `bash … verify-push-state.sh` line. Also update the example
at line 205 and the paragraph "Why check 5 exists" so it says dirt outside the work item is named,
not failed.

**New test** `shared/resources/tests/commit-changes-scope-mode.test.mjs`: extract the scope-mode
block from `skills/commit-changes/SKILL.md` (anchor `git add -A is NEVER called in scope mode`),
bind `"scope/one" "scope/two" ...` to `"docs/tasks/task.9.fx"`, and run it in a fixture with:

- a tracked edit inside (staged ✓)
- a new file inside (staged ✓)
- a tracked edit outside `package.json` (not staged ✓)
- a new file outside (not staged ✓)

### Phase 5: merge guard and post-merge re-sync (obs #142 part 3)

**Population**: `git grep -n "gh pr merge" -- 'shared/resources/*.md' 'skills/*/SKILL.md'
'skills/*/scripts/*' 'scripts/*' | grep -v /references/ | grep delete-branch`. Today it returns
`skills/develop-next/SKILL.md:268` and `skills/develop-batch/SKILL.md:442`. The test runs the same
grep, asserts at least 2 hits, and checks every hit.

**Both sites** (develop-next's `else` arm, and develop-batch item 3 "Merge"):

```bash
HEAD_BRANCH=$(gh pr view "$PR_ID" --json headRefName -q .headRefName)
if [ -z "$(git status --porcelain)" ]; then
  gh pr merge "$PR_ID" --"$mergeStrategy" --delete-branch
else
  # A dirty tree (another session's edits) makes gh's local branch switch abort, which also
  # skips the remote delete (obs #142). Merge without it; delete the remote branch directly.
  gh pr merge "$PR_ID" --"$mergeStrategy" \
    && git push origin --delete "$HEAD_BRANCH"
fi
```

develop-batch uses `<PR#>` and `<mergeStrategy>` placeholders. Keep its notation, and have the
test's `bind` cover both notations.

**develop-next Step 4** (`skills/develop-next/SKILL.md:313`): turn "On `<baseBranch>` (pull first
if Step 3 merged into it)" into a first numbered action with its own bash block. It must never be
chained with `&&` to the merge or to the tick's `git commit`:

```bash
git checkout <baseBranch> && git pull --ff-only origin <baseBranch>
```

Add one sentence: a merge with `--delete-branch` rewrites the checkout asynchronously, so chaining
it to a commit raced the index lock three times on 2026-09-21 (obs #142 recurrence).

**New test** `shared/resources/tests/merge-delete-branch-guard.test.mjs`:

- For each population hit, extract its block and bind `PR_ID=7` and `mergeStrategy=squash` (or
  the angle-bracket forms). The `gh` stub answers `pr view` with `{"headRefName":"feature/x"}` and
  records `pr merge` argv. The fixture origin holds `feature/x`.
- Clean tree → the recorded argv contains `--delete-branch`.
- Dirty tree (an untracked or modified file) → the argv lacks `--delete-branch`, and
  `git ls-remote origin feature/x` is empty afterwards.
- Re-sync: in develop-next's Step 4 section, the `git checkout <baseBranch> && git pull --ff-only`
  line exists in a bash block with no `git commit` in the same block.

### Phase 6: Step 3 inline branch (obs #162)

**Anchor**: `shared/resources/develop-pipeline-step-3-develop-loop.md` § "LOOP (both orchestrators
— execute identically)" (line 108). Add a sub-section before `#### develop-story loop body`:

```markdown
#### Inline implementation instead of `/develop` (iteration 1 only)

The orchestrator may implement the work itself, **in place of** invoking `/develop`, only when
both of these are already recorded in the Decisions Log this run:

1. `Plan file found: {path} — included as implementation context` (Plan File Discovery — a plan
   reused from a prior session does not count unless its freshness check passed this run), and
2. `Pre-develop surface map: …` (the Explore pass above, or its inline fallback).

The inline path must leave **every** post-condition `/develop` leaves: satisfy each item of
`/develop`'s **Story Completion Checklist** (story) or **Task Completion Checklist** (task) in
`skills/develop/SKILL.md`. That includes the single Change Log row below, which the inline path
writes *instead of* `/develop`, never beside it. Record
`Step 3 inline — /develop not invoked: {one-line reason}` in the Decisions Log. Item 2 (the loop
audit) runs unchanged, so an incomplete inline pass reads `In Progress` and the loop re-enters
through `/develop`. On any other input, invoke `/develop`.
```

In each loop body, item 1 becomes: "Invoke `/develop` with the … file path (or implement inline
per §Inline implementation, iteration 1 only). …". In § "Change Log" (line 257), add: "On the
inline path the orchestrator writes this row, because `/develop` did not run. It is still one row."

**New test** `shared/resources/tests/develop-loop-inline-branch.test.mjs`:

- The section extractor is heading-bounded and fence-aware. Reuse `sectionBetween` in
  `evals/shared/tests/pr-review-loop-parity.test.mjs:78` if it fits, extracted into the shared
  helper above, rather than writing a third reader.
- The inline sub-section contains `Plan file found`, `Pre-develop surface map`, `Step 3 inline — /develop not invoked`, `Story Completion Checklist` and
  `Task Completion Checklist`.
- Both cited checklist labels appear as `**… — tick off each before halting:**` lines in
  `skills/develop/SKILL.md`. This is the cross-file anchor that goes red on a rename at either end.
- Both `#### develop-story loop body` and `#### develop-task loop body` item 1 reference
  `Inline implementation`, and item 2 still names `loop-audit-prompt.md`.

### Phase 7: bundle, docs, validation

- `npm run bundle`, then `npm run bundle:check`.
- CHANGELOG `[Unreleased]` › Fixed: one bullet per observation, and a **Changed** bullet for
  `/commit-changes --scope` (the breaking change in § 5 of the task).
- Move `.agents/skills` aside, run `npm test`, then restore it.
- `npm run ci:fast`, then `python skills/create-skill/scripts/quick_validate.py skills/<name>` for
  develop-task, develop-story, develop-next, develop-batch and commit-changes.

## Key Patterns and References

- Executed-prose tests: `shared/resources/tests/probe-base-binding.test.mjs` (fence reader, `gh`
  stub, bash and zsh), `evals/shared/tests/fast-gate-precondition.test.mjs` (`bashBlockUnder`,
  non-vacuity floors).
- Shell fixtures for `verify-push-state.sh`: the `new_repo` helper in
  `shared/resources/verify-push-state.test.sh`.
- Mutation proof, per fix: `cp` the edited file to a scratch path, revert just the behaviour, run
  the named test, confirm it is red and names the case, then restore from the copy. Record each in
  the implementation report.
- Patch files with split/join and assert the split count; `String.replace` treats `$'` in a
  replacement as a pattern.

## Testing Approach

- Per phase: `command node --test shared/resources/tests/<new>.test.mjs`, green with the fix and
  red with it reverted.
- `bash shared/resources/verify-push-state.test.sh` (12 cases).
- `command node --test evals/develop-story/protocol/*.test.mjs evals/develop-task/protocol/*.test.mjs`
  after Phases 1 and 6.
- Full `npm test` once at Phase 7.
