# Implementation Report: QA snippet runner allows flags, not just commands

**Task**: `task.289.qa-snippet-runner-flag-level-allow-list.md`
**Run Number**: 1
**Started**: 2026-11-09 13:27
**Status**: In Progress

---

## Summary

Replace the snippet runner's flag-level deny-list with a per-command flag and operand allow-list, closing the seven known write gaps and deciding the 17 refused doc blocks.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | feature/task.289.qa-snippet-runner-flag-level-allow-list (already checked out) |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.{id}.*` exists in git                             | already checked out | —                    | 2026-11-09T13:59Z |
| 2. review-task             | ✅ Done | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | skipped: review 1 current | —                    | 2026-11-09T13:59Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | inline; fast gate green | —                    | 2026-11-09T13:59Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #864; no issue linked | —                    | 2026-11-09T14:08Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-09

- Feature branch base: feature/task.289.qa-snippet-runner-flag-level-allow-list — asked; already checked out, one docs commit ahead of develop
- PR target branch: develop — asked; recommended
- qa-planning gate: skipped (auto — no prompt)
- Observe-work session start: workspace healthy, 86 entries scanned, last review 2026-11-06, no review offered
- Lite-mode inputs (Agent 3 not dispatched; derived inline): risk_level absent, phase_count 5, single_module true → standard (phase_count ≥ 3)
- Tracker: no `github_issue` / `jira_key` in frontmatter → tracker signals skipped

### Step 2 and Step 3 decisions — 2026-11-09

- **Step 2 skipped**: review 1 is current and its blob matched the task document.
- **Step 3 ran inline** (plan file found; surface map done inline without an Explore subagent, so independence was lost). An advisor review stood in for it; no Explore loop audit ran.
- **Owner decision**: accept the refusal of the 17 blocks, no value tracking (asked via AskUserQuestion). Recorded in the task Change Log.
- **Baseline**: 18 blocks change from non-mutating to mutating between the pre-task-274 engine and develop (klass-change definition, `compare.mjs`). Newly refused by this task against develop: 1 block (`tail -f`, `skills/loop-supervisor/README.md:271`); none newly runnable. The two `diff "$OBS_STAGING_DIR/…"` blocks were first refused, then restored by giving `diff` `expansionOk` (no `diff` flag writes a file or runs a chosen program).
- **"A named test per member"**: read as: members with `ANY_FLAG(why)` carry an audit note, checked by the table audit test (31 members, orphan check); the eight explicit entries each have a refusal test.
- **Deviation from Phase 3 "remove entries"**: `DENY_PATTERNS` and the variable-argument rule stay beside the table. They are the only check on `git`, `gh`, `rm`, `curl`, `tee`, and four tests pin their `deny-list:` reasons (`git grep -n 'deny-list:' -- '*.test.*'`).
- **`no-table-entry` literal**: `flag-not-allowed: <cmd> no-table-entry (fail-closed)`, tested by temporarily adding `zzaudit` to `SAFE_COMMANDS`.
- **Mutation proofs**: 15 checks (`<>`, function shadowing, generic loop, find, sed branch, sed verdict, brace, IFS, word-splitting, collapsed `hidden`, forwarded sed rule, `maxOperands`, `date` operand, sed-script variable, sed separator) each turned a named test red, then were restored.
- **Timing**: docs scan was +22% on first measure; after computing `stripNonCode` once and making the variable maps lazy, six alternating pairs at load ~1.5 gave new 460–487 ms vs develop 472–499 ms. `CI=true npm test` wall time vs develop not measured yet.
- **Not done**: Phase 5 (`ctx-wrap-` leak, optional); full `CI=true npm run ci` (only `ci:fast`, exit 0).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1

- **Gate**: FAIL (80/100). Two high findings from the diff reviewer, both reproduced by QA with a control (PR #864 comment).
- **T289-CR-1**: a sed label ends at whitespace in GNU sed, so `sed ':a e echo PWNED' f` ran `e`. Fix: `sedScan` reads a label as one word and refuses anything but a separator after it. Mutation proof: restoring the old skip turned three tests red (the `:a e` and `ta e` gap rows, the sedScriptVerdict table).
- **T289-CR-2**: `shellWord` did not decode `$'…'`, so `sort $'-o' out in` wrote a file. Fix: an unquoted `$'…'` or `$"…"` word is a dynamic expansion, refused where a flag may stand. Mutation proof: removing the branch turned the two `sort $'…'` gap rows red.
- **Probe (Step 3.5)**: `git grep -l -F -i -e 'sedScriptVerdict'` and `-e 'ANSI-C'` over the executed documents: 1 hit each, `shared/resources/qa-runnable-prose-detection.md` — updated. Population: 1.
- **Both directions**: must-now-catch rows added (5); must-still-leave-alone controls added (3: label loop `:a;N;$!ba`, `grep -c 'a$'`, `sort -u 'f g'`). Docs scan against develop unchanged: 1 block newly refused (`tail -f`), none newly runnable.
- **Verification**: 260 of 260 engine tests; `CI=true npm run ci:fast` exit 0; `bundle:check` 0 problems.
- **No struck mechanism, no narrowing residue** (first fix cycle).

### QA Cycle 2

- **Gate**: FAIL (80/100). Full refute pass plus safety re-probe by an Explore reviewer; two high findings, both reproduced by QA with a control (PR #864 comment). Cycle 1's two fixes held.
- **T289-CR2-1**: a sed `#` comment ended at a backslash-newline in `sedScan`, but GNU sed ends it at the first newline, so `sed '#c\<newline>e echo PWNED' f` ran `e`. Fix: scan a comment to the first newline. Mutation proof: restoring `toLineEnd()` turned the two comment gap rows and the sedScriptVerdict test red.
- **T289-CR2-2**: `$(` is a segment break, so a governed command's arguments were cut before the flag table saw them: `sort -$(echo o) out in` wrote a file. Fix: `substitutionAfterWord` refuses a substitution where a flag may stand (a word starting with it or with a dash) and always for `uniq` and `sed`. Mutation proof: disabling the call turned six substitution gap rows red.
- **Narrowing**: the first version refused every substitution after a governed command and newly refused seven copies of the `date -u -d "@$(stat …)"` block in `pipeline-resume-detector-prompt.md`. Narrowed to tokens that could be a flag; the docs scan is back to 1 block newly refused (`tail -f`), 0 newly runnable.
- **Probe (Step 3.5)**: `git grep` for the rule's wording over `shared/resources/*.md`, `docs` and `skills/*/SKILL.md`: the live statement is `shared/resources/qa-runnable-prose-detection.md` (updated); the other hits are closed task documents. Population: 1.
- **Verification**: 274 of 274 engine tests; `CI=true npm run ci:fast` exit 0 on the second run; `bundle:check` 0 problems. The first run failed the tmp-leak ratchet on a new `ctx-wrap` prefix, which is the known intermittent leak (Phase 5, not in this change) and did not recur.
- **Struck mechanism**: none. Two cycles in a row found the scanner reading a construct differently from the tool, so the next re-review should enumerate that class rather than re-read these two fixes.

### QA Cycle 3

- **Gate**: FAIL (80/100). Safety re-probe, unscoped; about 650 inputs including 5k sed scripts under real GNU sed and 150k random blocks. The cycle 2 fixes held and no sed bypass or exception was found. Two high findings, both reproduced by QA with a control (PR #864 comment).
- **T289-CR3-1**: `shellWord` read only `${NAME…}` as an expansion, so `${1}` and `${!X}` stayed literal and a flag they carried was never seen: `set -- -o; sort ${1} out in` wrote a file.
- **T289-CR3-2**: the brace check looked only for a flag, and `uniq`'s operand count was taken on the unexpanded words: `uniq {in,out}` wrote `out`.
- **Third strike**: `qa-execute-snippets.mjs` carried a HIGH finding in gates 1, 2 and 3. Struck mechanism: the enumeration of shell expansion spellings in `shellWord` and the brace check. Move: **replace**. Every `${…}` is now an expansion whatever it holds (a rule, not a list), a command with `maxOperands` refuses an unquoted brace, glob or unnamed expansion in an operand, and a table-driven population test runs every explicit `SAFE_FLAGS` entry through one shared list of nine expansion forms (non-vacuity floor: 6 entries). Other findings in the file: none.
- **Mutation proofs**: disabling the `${` rule turned the two gap rows and the population test red; disabling the operand-shape check turned three gap rows and the second population test red.
- **Both directions**: must-now-catch rows added (5 gap, 2 population tests); controls stay runnable (`uniq in`, `uniq -c f`, `sort -u f`, `find docs/$X -name z` with `X` set). `tail ${!X} f` stays runnable by design: `tail` has `expansionOk`, since no `tail` flag writes or runs a program and `-f` is a hang the block timeout ends.
- **Docs scan against develop**: 1 block newly refused (`tail -f`), 0 newly runnable.
- **Probe (Step 3.5)**: the rule's one live statement is `shared/resources/qa-runnable-prose-detection.md` (updated); population 1.
- **Verification**: 282 of 282 engine tests; `CI=true npm run ci:fast` exit 0; `bundle:check` 0 problems.

### QA Cycle 4

- **Gate**: FAIL (80/100). Safety re-probe, unscoped, with a differential harness (12,797 generated blocks classified, the 1,945 runnable ones executed under real bash). The cycle 3 fixes held. Two high findings, both reproduced by QA with a control (PR #864 comment).
- **T289-CR4-1**: a process substitution cuts a governed command's arguments: `uniq <(echo a) out.txt` and `sort <(echo a) -oout` wrote their files.
- **T289-CR4-2**: a prefix assignment holding a substitution does too: `X=$(echo a) uniq in.txt out.txt` and `X=$(echo a) sort -oout in.txt` wrote theirs. QA also found the cause is wider than the flag table: a command written after a closed substitution is an argument of the substitution's segment, so the allow-list never saw it. `X=$(echo a) python3 x.py` and `X=$(echo a) ln -s a b` classify runnable on develop too (measured: same output on the base), so that part is pre-existing; it is closed here because the same mechanism is the finding.
- **Third strike**: gates 2, 3 and 4 carry a HIGH on `qa-execute-snippets.mjs`. Struck mechanism: `substitutionAfterWord`, the heuristic that guessed where a substitution may stand (patched at cycle 2, found short at cycle 4). Move: **delete and replace**. `maskSubstitutions` swaps each substitution for one word (`$__SUBST__`; `/dev/fd/0` for a process substitution), the block is read a second time, and every governed command and every command the first reading never saw is judged in that text. Other findings in the file: none.
- **Mutation proof**: switching the masked pass off turned 14 tests red (the eight new cycle 4 rows, the six cycle 2 substitution rows and the population test). `cmp` clean after restore.
- **Both directions**: must-now-catch rows added (8); controls stay runnable (`X=$(echo a) uniq in.txt`, `diff <(sort a) <(sort b)`, `x=$(sort -u f)`, `date -u -d "@$(stat -c %Y f)" +%FT%T`). `tail $(echo -f) x` is now a control: `tail` has `expansionOk` (a hang at worst), and the old heuristic refused it only by accident. `sort a$(echo b)` is now refused as unquoted word splitting, which is what the shell does.
- **Docs scan against develop**: 1 block newly refused (`tail -f`), 0 newly runnable. A first version also refused three doc blocks (an unparseable `!` plus backtick idiom, and a plan block the masked reader cannot parse); narrowed so an unparseable word is left to the first reading and a block with no governed command is not refused for being unreadable.
- **Probe (Step 3.5)**: the rule's one live statement is `shared/resources/qa-runnable-prose-detection.md` (updated). Population: 1.
- **Verification**: 292 of 292 engine tests; `CI=true npm run ci:fast` exit 0; `bundle:check` 0 problems. Timing was not re-measured: the masked pass runs only for a block that holds a substitution.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
