# QA Report: Task 267 - review-task catches the plan defects it lets through (cycle 2)

**Task**: [Link to task document](./task.267.review-task-catches-the-plan-defects-it-lets-through.md)
**Gate File**: [task.267.gate.2.review-task-catches-the-plan-defects-it-lets-through.yml](./task.267.gate.2.review-task-catches-the-plan-defects-it-lets-through.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: PASS

---

## Executive Summary

Re-review after QA fix cycle 1. Both medium findings are closed and nothing new was found. The full fast gate is green.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

## Review Methodology

Direct tools. Re-review scope: unscoped is not needed; the files changed since gate 1 (head b4a302c2) are CHANGELOG.md and the task directory only, no code and no fenced bash. The dispatched diff code review was not run (no reviewable code). CI on 1294c8d025a9: pending.

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T267-QA-1 CHANGELOG entry citing task 267 | FIXED (`changelog-cites.sh` reports `cites (task 267)`) |
| T267-QA-2 wall-time criterion unmeasured | FIXED by amendment: a five-run median on the shared LAN server was not obtainable (load 17 to 20 on 8 cores); one quiet pair measured (develop 537 s, branch 464 s). The criterion carries `approved by Lorien Gamaroff`; `criteria-drift.js` reports the change as approved. |

## New Findings This Cycle

None. Searched the diff since gate 1 (CHANGELOG.md plus task documents); no code, no executed prose changed.

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Checks present and numbered | 23-29 contiguous | 1-29 contiguous | PASS |
| Pinning tests green | 5 of 5 | green inside ci:fast | PASS |
| Bundle check | 0 problems | 0 problems | PASS |
| Wall time (amended) | quiet pair, owner-approved | develop 537 s, branch 464 s | PASS |
| CHANGELOG cites the task | present | present | PASS |

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

## NFR Assessment

Performance, Reliability, Security, Maintainability: all PASS. Security evidence: reasoned (prose only).

## Code Review

Not run: no reviewable code in the cycle 2 change set.

## Regression Testing

`CI=true npm run ci:fast`: 7946 tests, 7944 pass, 0 fail, 2 skipped.

## Behavioural Evidence — Findings Table (success criterion 2)

Recorded here because this is the committed QA report (found at `/finalise` preflight: the earlier record lived only in scratch state). One fresh reviewer agent judged 24 task-document excerpts from the check texts alone, controls unlabelled. Result: 12 of 12 defective fixtures fired at Important, 12 of 12 controls were clean. The fixture-to-check assignment below is by content; the reviewer's own attribution of F03 named check 20, and the rule it applied is check 13's (the diff context it was given lacked check numbers). The content was correct.

| Check | Defect shape | Defective fixture | Control fixture | Defective fires | Control clean |
| --- | --- | --- | --- | --- | --- |
| Step 6 item 4 (sharpened) | criterion with no named holding test | F01 | F02 | yes | yes |
| 13 (sharpened) | guard over text names its spellings and unseen shapes | F03 | F04 | yes | yes |
| 15 (sharpened) | removed-literal sweep covers every sentence and the file name | F07 | F08 | yes | yes |
| 11 (sharpened) | invariant test holds both terms, mutation proof names the term | F09 | F10 | yes | yes |
| 20 (sharpened) | sweep population derived from the concept's own names | F23 | F24 | yes | yes |
| 23 | parity claim enumerates the sibling's guards | F05 | F06 | yes | yes |
| 24 | refusal in a self-rewriting writer applied to its own output | F11 | F12 | yes | yes |
| 25 | new member of an enumerated class names the enumerating tests | F13 | F14 | yes | yes |
| 26 | fixture literals run through the banned-name guard | F15 | F16 | yes | yes |
| 27 | asynchronous read timed against the state's latency | F17 | F18 | yes | yes |
| 28 | planned temp directories name their removal | F19 | F20 | yes | yes |
| 29 | new write into a directory names every reader | F21 | F22 | yes | yes |

### Fixtures (kept here, not committed elsewhere)

Condensed from the scratch copy the reviewer judged; F15 names its consumer name by description only, because the repository's banned-name guard scans shipped text.

- **F01**: Success criteria: "No hard-coded hostnames anywhere in `scripts/`." Testing Strategy: "Run `npm test`."
- **F02**: Success criteria: "No hard-coded hostnames anywhere in `scripts/`; held by `tests/no-hostnames.test.js`, which scans `git ls-files scripts/` and has a non-vacuity case (a fixture file containing a hostname that the scan must flag)."
- **F03**: Phase 2 adds a guard test: "the test fails when any script restates the retry loop, however it is spelled." Its key is a regex over shell text. No fixture table of spellings is listed.
- **F04**: Phase 2 adds a guard test over shell text. Plan states: "The guard catches these four shapes (table in the test): `while ! cmd`, `until cmd`, `for i in 1 2 3`, `retry cmd`. Known unseen shapes: recursion via a function, `xargs -n1` retries. These are out of the guard's claim."
- **F05**: Phase 1 says: "The new `shell-fence:` entry form honours a fixture directory exactly as `fence:` honours it, and cleans up its work dir as `fence:` does." No list of what `fence:` does is given.
- **F06**: Phase 1 says the same, then lists the guards read off `runFence` (lines 40-130): (1) work-dir escape snapshot, a shared helper both arms call; (2) env scrub, reimplemented in `runShellFence` with test T3; (3) timeout, deliberately different because the shell arm runs under the harness timeout.
- **F07**: Phase 2 rewrites the sentence "A task may not be accepted with open findings" in `docs/standards/acceptance.md` and removes the sentence "Findings are listed in the DoD". The plan's literal search is for the first sentence only, with no hits in tests. It does not search the second sentence or the file name.
- **F08**: Phase 2 rewrites two sentences in `docs/standards/acceptance.md`. The plan lists both, runs a literal `git grep` once per sentence with hit counts (0 and 1; the one hit is added to the tests to update), and runs a `git grep -l` on the file name that finds a second test matching the heading by regex, which the plan adds.
- **F09**: Phase 1 changes `shouldRetry(err, attempt)` to add an `|| err.forceRetry` term. Test T4 holds only the first term's inputs. Mutation proof named: drop `|| err.forceRetry`, T4 goes red.
- **F10**: The same change. Test T4 includes an input with `forceRetry: true` expecting true. Mutation proof named: drop `|| err.forceRetry`, the second T4 input goes red.
- **F11**: Phase 3 adds a refusal to `upsert()` in `config-writer.js` for a section whose keys are not sorted. `upsert()` reads the file, replaces the section and writes the result back; later calls re-read that file. Criterion: an unsorted section is refused. Test T7 reproduces the bug's report.
- **F12**: The same refusal, plus the criterion that every document `upsert()` produces is one its next `upsert()` accepts, with the guard run on the output before writing; test T8 is a property test over 200 generated sections asserting `upsert(upsert(doc))` never refuses.
- **F13**: Phase 2 adds an npm script `lint:sql` and `scripts/lint-sql.mjs`. The Files Summary lists both. No mention of any test that lists scripts.
- **F14**: The same addition. The plan names the tests that enumerate scripts (found by a `git grep` it quotes), adds the row one of them requires in `docs/reference/scripts.md`, and sets the executable bit another requires.
- **F15**: Phase 1 test code uses a Jira key and host built on a real-looking consumer name; the repository's `tests/no-consumer-names.test.js` bans that name from every shipped line. The plan does not mention the guard.
- **F16**: The same test code uses `PROJ-101` and `https://example.atlassian.net`. The plan notes it was checked against the guard's pattern with no match.
- **F17**: Phase 2 adds a QA step that reads deploy status once at the start of each QA cycle. The deploy workflow takes about 12 minutes; a QA cycle starts about 3 minutes after the push. The plan states neither duration.
- **F18**: The step reads deploy status at the end of the cycle. The plan states the measured durations (deploy about 12 min from three runs, QA review about 14 min from three cycles), says the read sees the deploy settled in all three samples, and records "pending" without failing if not.
- **F19**: Phase 1 test code creates a directory with `fs.mkdtempSync` under the OS temp dir, writes fixtures and asserts. No cleanup is shown; the plan says to follow a test that also never removes its directory.
- **F20**: The same creation, followed by an `t.after` that removes the directory recursively; the plan notes the new prefix and that every test removes its directory.
- **F21**: Phase 2 makes `runner.js` write a new file `.lock` into `workDir`. The plan updates `runner.js` and its tests. `workDir` is also scanned by `escape-watch.js` and `cleanup.js`; the plan names neither.
- **F22**: The same change. The plan lists every reader of `workDir` from a `git grep`: `escape-watch.js` (allowed name added), `cleanup.js` (skips `.lock`, test T9), and `report.js` (reads only `*.json`, unaffected, stated).
- **F23**: Sweep task: retire the term "legacy runner". Population: `git grep -nE 'legacy runner'`; success: zero hits. The concept is also named `OldRunner`, `runner-v1` and `docs/runner-v1.md`; the plan does not look for them.
- **F24**: The same sweep with the population derived from the concept's own names (`legacy.runner|OldRunner|runner-v1`), the file `docs/runner-v1.md` and every skill linking to it, then a diff pass over changed lines mentioning legacy, old, previous or retired.

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED
