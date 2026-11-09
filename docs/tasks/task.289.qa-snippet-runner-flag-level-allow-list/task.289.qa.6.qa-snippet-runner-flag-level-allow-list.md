# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: WAIVED (owner)

---

## Executive Summary

Cycle 6 re-probed the newest code (`closingParen` and the masked reading) with about 1000 differential inputs, 39 of them judged runnable and run under real bash. The cycle 5 fix held. The reviewer found one reproduced write and one crash, both in older code and both identical on `develop`. On its findings the gate is FAIL; the owner accepted the branch as a strict improvement over `develop` and filed both findings as task.290, so the gate is recorded as waived by the owner.

**Overall Assessment**: WAIVED by the owner (findings: 1 high, 1 medium, both pre-existing)
**Deployment Recommendation**: READY, with task.290 filed

---

## Testing Scope

- Direct tools plus one read-only Explore reviewer with the SAFETY RE-PROBE directive.
- Re-review scope: unscoped (the prior gate failed on security); the whole `origin/develop...HEAD` diff of the shared sources.
- CI on the head: not read this cycle.

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR5-1 a quoted paren inside a substitution | FIXED | `X=$(echo ")") touch out` and four variants refused; 18 further hostile spellings classified as expected |

---

## Issues Found

### HIGH (1)

**T289-CR6-1: a `#` after an escaped space is read as a comment**
- **Observation**: `echo a\ # ; touch out` classifies runnable; under real bash it created `out`. `echo $(echo a\ #) ; touch out`, a newline and `)` does the same.
- **Control**: `echo a # ; touch out` is a real comment and correctly stays runnable.
- **Provenance**: identical on `develop` (QA ran both engines). Not caused by this diff and not covered by any claim in cycles 1 to 5.

### MEDIUM (1)

**T289-CR6-2: deep nesting throws**
- `echo ` + `"$(` x20000 + `")` x20000 throws `RangeError` out of `closingParen`. Identical on `develop`. Control: depth 1000 returns `mutating`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0. Both are filed as task.290.

---

## NFR Assessment

- **Security**: CONCERNS. Probe: 31 executed, 0 reproduced, 0 escaped (`task.289.qa.6.security.run.json`).
- **Performance**: PASS. No new resource finding; timing not re-measured against `develop`.
- **Reliability**: CONCERNS. The deep-nesting exception (task.290).
- **Maintainability**: PASS.

---

## Final Assessment

**Gate Status**: WAIVED by the owner (the findings are as above and are not cleared)
**Quality Score**: 82/100
**Deployment Recommendation**: READY

**Next Steps**: merge task.289; develop task.290.

---

## Closing Records (measured at `/finalise`, head `880af12b`)

These are the records the success criteria name "in the QA report". They were first held only in the implementation report, which is committed at the end of the pipeline, so they are written here where `/finalise` can read them.

### Blocks the task 274 engine ran and the new engine refuses (criterion 4)

Command, from the repository root, with the scratchpad copies of the pre-task-274 engine (`pre274.mjs`) and of `develop`'s engine (`develop.mjs`, byte-identical to `origin/develop`):

```bash
node compare.mjs pre274.mjs shared/resources/qa-execute-snippets.mjs --list
```

Runner output: `{"blocks":3438,"newlyRefused":19,"newlyRunnable":0,"byReason":{"deny-list":16,"unrecognised-command":2,"flag-not-allowed":1}}`. Eighteen of the 19 are already refused by `develop` (`compare.mjs pre274.mjs develop.mjs`: 18 refused, 0 runnable); only the last row is new in this task.

| # | Block | Reason |
| --- | --- | --- |
| 1 | `docs/tasks/task.126.bundler-citation-form/task.126.plan.bundler-citation-form.md:80` | deny-list: argument to `git` that the shell expands at run time |
| 2 | `docs/tasks/task.137.optional-file-glob-sweep/task.137.plan.optional-file-glob-sweep.md:52` | deny-list: argument to `find` expanded at run time |
| 3 | `docs/tasks/task.162.stop-hook-step-8-reason-fits-every-orchestrator/task.162.plan.stop-hook-step-8-reason-fits-every-orchestrator.md:40` | unrecognised-command: `<unparseable>` (fail-closed) |
| 4 | `docs/tasks/task.168.gate-head-scoping-hardening/task.168.plan.gate-head-scoping-hardening.md:83` | unrecognised-command: `bash` (fail-closed) |
| 5 | `docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.plan.finding-anchors-advisory-follow-ups.md:144` | deny-list: argument to `git` expanded at run time |
| 6 | `docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md:512` | deny-list: argument to `sed` expanded at run time |
| 7 | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1480` | deny-list: argument to `git` expanded at run time |
| 8 | `skills/command-development/references/testing-strategies.md:82` | deny-list: argument to `sed` expanded at run time |
| 9 | `skills/create-branch/SKILL.md:367` | deny-list: argument to `git` expanded at run time |
| 10 | `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md:1481` | deny-list: argument to `git` expanded at run time |
| 11 | `skills/develop-task/references/develop-pipeline-step-5-6-qa-loop.md:1481` | deny-list: argument to `git` expanded at run time |
| 12 | `skills/loop-supervisor/README.md:271` | **new in task 289**: flag-not-allowed: `tail -f` (a hang the block timeout ends; refused as a flag outside the table) |
| 13 | `skills/qa-story/SKILL.md:321` | deny-list: argument to `find` expanded at run time |
| 14 | `skills/qa-task/SKILL.md:311` | deny-list: argument to `find` expanded at run time |
| 15 | `skills/review-pr/SKILL.md:478` | deny-list: argument to `find` expanded at run time |
| 16 | `skills/sync-github-epic/SKILL.md:67` | deny-list: argument to `find` expanded at run time |
| 17 | `skills/sync-github-story/SKILL.md:70` | deny-list: argument to `find` expanded at run time |
| 18 | `skills/sync-jira-epic/SKILL.md:116` | deny-list: argument to `find` expanded at run time |
| 19 | `skills/sync-jira-story/SKILL.md:121` | deny-list: argument to `find` expanded at run time |

The owner decision on these (accept the refusal, no value tracking) is in the task's Change Log, 2026-11-09.

### Docs-scan cost against develop (criterion 6)

`timing.mjs <engine>` classifies every tracked `.md` bash fence once and prints the time: 3,438 blocks. Five alternating develop/new pairs on head `880af12b`, with the first `/proc/loadavg` figure (the 1-minute load `uptime` prints) taken beside each run:

| Pair | develop (ms) | new (ms) | load |
| --- | --- | --- | --- |
| 1 | 485 | 581 | 1.74 |
| 2 | 475 | 493 | 1.76 |
| 3 | 492 | 493 | 1.76 |
| 4 | 493 | 514 | 1.76 |
| 5 | 522 | 499 | 1.76 |

Median develop 492 ms, median new 499 ms: **+1.4%**, under the 10% bound. Pair 1's new run (581 ms) is a cold-start outlier, reported and kept.

### Full-suite wall time (criterion 5)

Measured with `suite-timing.sh` on `npm run test:suite` (the suite `npm test` wraps), `CI=true`, develop in a separate worktree, alternating, five pairs. Median develop 205.6 s, median branch 207.5 s, ratio 1.009.

| Pair | develop (s, load) | branch (s, load) |
| --- | --- | --- |
| 1 | 205.6 (7.19) | 207.5 (6.07) |
| 2 | 165.9 (4.77) | 289.2 (8.05) |
| 3 | 170.7 (5.83) | 165.6 (4.16) |
| 4 | 206.2 (6.00) | 187.9 (5.20) |
| 5 | 339.1 (31.09) | 293.5 (9.88) |

Pair 2's branch run and pair 5 are host-load outliers, reported and kept. The runs were taken on the branch at `c42729c5`; `880af12b` adds documentation only.

### Full CI (criterion 9)

`CI=true npm run ci` exited 0 on `c42729c5` (2026-11-09) with the `tmp-leak` ratchet held; `880af12b` adds documentation only. `npm run bundle:check` reported 129 skills checked, 0 problems.

### Mutation proofs, by finding (criterion 7)

Each row names the finding, the change reverted and the tests that went red. `cmp` against a snapshot was clean after every restore.

| Finding | Reverted | Went red |
| --- | --- | --- |
| Initial: `<>` refusal | refusal disabled | `task.289 gap: the <> redirection opens a file read-write is refused as mutating` (QA 1) |
| Initial: generic flag loop | loop returns null | 11 task.289 tests (QA 1) |
| T289-CR-1 (sed label) | `sedScan` label skip restored | three tests: the `:a e` and `ta e` gap rows, the `sedScriptVerdict` table |
| T289-CR-2 (ANSI-C quoted flag) | `$'…'` / `$"…"` branch removed | the two `sort $'…'` gap rows |
| T289-CR2-1 (sed comment) | `toLineEnd()` restored | two comment gap rows and the `sedScriptVerdict` test |
| T289-CR2-2 (substitution cuts arguments) | `substitutionAfterWord` call disabled | six substitution gap rows |
| T289-CR3-1 (`${…}` expansion) | `${` rule disabled | two gap rows and the population test |
| T289-CR3-2 (brace operands of `uniq`) | operand-shape check disabled | three gap rows and the second population test |
| T289-CR4-1, CR4-2 (process substitution, prefix assignment) | masked pass switched off | 14 tests: eight cycle 4 rows, six cycle 2 substitution rows, the population test |
| T289-CR5-1 (quoted paren in a substitution) | naive paren count restored; carve-out restored | 5 tests; 1 test |

### The other 13 initial-implementation proofs, re-run at `/finalise`

QA 1 re-ran two of the developer's 15 proofs and left 13 as the developer's own record, with no test named. They were re-run on head `a383342e` in an isolated worktree: snapshot, revert the one behaviour, run `shared/resources/tests/qa-execute-snippets.test.mjs` (300 tests, all green before), record the red titles, restore, `cmp` clean. All 13 went red in a test about that behaviour.

| # | Behaviour | Reverted (in `classifyInternal`, `flagViolation` or `sedScan`) | Tests that went red |
| --- | --- | --- | --- |
| 1 | function shadowing | the `shadowingFunctions` check skipped | 3: "a function named after an allowed command (function keyword) is refused as mutating"; "(parentheses) is refused as mutating"; "probes: a variable in a sed script, an indented function, a date operand" |
| 2 | `find` flag table | an unlisted find flag continues instead of refusing | 2: "find -fprint0 writes a file is refused as mutating"; "table: each command with a flag list refuses a flag outside it, by name" |
| 3 | sed branch commands (`:`, `b`, `t`, `T`) | the check that only a separator follows a label dropped | 1: "sedScriptVerdict: what is read-only, what is forbidden, what is not understood" |
| 4 | sed verdict (`e f F r R w W v`) | those commands skipped to end of line instead of marked forbidden | 7, including "sed e command runs a shell command", "a sed comment ending in a backslash does not hide an e command", "sed --expression=1e", "sed 1w after a process substitution" |
| 5 | brace expansion | the brace check disabled | 1: "a brace expansion in operand position builds a flag is refused as mutating" |
| 6 | `${IFS}` | the `IFS` check disabled | 1: "word-splitting on ${IFS} builds -delete is refused as mutating" |
| 7 | word-splitting | the untrusted `$n` check disabled | 1: "a variable this block gives two words is refused as mutating" |
| 8 | collapsed `hidden` | `hidden` made `() => false` | 1: "expansions: a quoted span cannot hide a flag, and the scan's collapsed reading refuses what it cannot read" |
| 9 | forwarded sed rule | a forbidden script accepted when forwarded | 1: "forwarded arguments: a flag every governed command refuses stands; a path for find does not fail sed" |
| 10 | `maxOperands` | the operand-count refusal disabled | 3: "uniq after a process substitution writes its output operand"; "uniq output operand after a prefix assignment holding a substitution"; "uniq writes its second operand" |
| 11 | `date` operand | the `operandRe` refusal disabled | 1: "probes: a variable in a sed script, an indented function, a date operand" |
| 12 | sed-script variable | the "script built from `$n`" refusal disabled | 1: the same "probes" test as 11 |
| 13 | sed separator | the `cmdEnd()` check after the simple commands skipped | 2: "sedScriptVerdict: what is read-only, what is forbidden, what is not understood"; "T191 CR3-1: a function's reach is every definition of its name, whichever was sourced last" |

Weak holds, recorded and not fixed here: checks 1, 11 and 12 share one combined test, and checks 3 and 13 are held by the single `sedScriptVerdict` table test (13's second red is probably unrelated). A test per behaviour would hold each on its own. The `sed` label (3) and separator (13) mutations are the nearest branches to those labels: the label commands share one branch in `sedScan`.

The per-cycle detail is in the implementation report's QA Iteration History, which is committed at the pipeline's last step.
