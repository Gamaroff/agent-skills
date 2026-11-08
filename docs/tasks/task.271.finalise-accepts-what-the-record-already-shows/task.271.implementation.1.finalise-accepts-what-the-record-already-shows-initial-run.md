# Implementation Report: finalise accepts what the record already shows

**Task**: `task.271.finalise-accepts-what-the-record-already-shows.md`
**Run Number**: 1
**Started**: 2026-11-07 00:00
**Status**: In Progress

---

## Summary

Add three recorded acceptance arms to `/finalise` (equivalent-commit measurement, one bounded re-run of a red outside the diff, an owner-deferred probe reproduction); run launched by develop-next.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml)                                           |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.271.*` exists in git                              | Created from develop at 1bb1aaa4 | —                    | 2026-11-07T19:38Z |
| 2. review-task             | ✅ Done    | `task.271.review.{N}.{name}.md` exists (or skip logged)                | 9/10, READY TO IMPLEMENT; no Explore subagents (pre-passes inline) | —                    | 2026-11-07T19:40Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map known from review); ci:fast 8043 tests green | —                    | 2026-11-07T19:50Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #859; no tracker issue to comment on | —                    | 2026-11-07T19:52Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.271.qa.{N}.*.md`; `task.271.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.271.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-07

- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (3+ phases, High-risk phases)
- qa-planning gate: skipped (auto — no prompt)
- Phase 1 owner decisions recorded in the task plan before dispatch (commit 1bb1aaa4, local, unpushed).

### Step 2: review-task — 2026-11-07

- Output format: Comprehensive report (pipeline default). Fixes: apply all critical + important (pipeline default). Status: promoted to ready-for-development (pipeline default).
- Tracker sync: skipped (no `github_issue`; creating a remote issue is outward-facing and the opt-in prompt cannot be answered unattended).
- Review report: `task.271.review.1.finalise-accepts-what-the-record-already-shows.md`. Independence: pre-pass Agents B/C ran inline, not as Explore subagents.

### Step 3: develop — 2026-11-07

- Step 3 inline — /develop not invoked: the plan file (`task.271.plan.*.md`) and the review's surface map were both in hand, and the plan names every hunk. Pre-develop surface map: 9 files (AC prompt, `skills/finalise/SKILL.md` CI gate and Step 3b.1, `ci-tree-equivalence.js` as the reused docs-path definition, `executed-prose.mjs`, `configuration.md`, `CHANGELOG.md`) found during review, not by an Explore subagent (independent mapping did not run). Plan file found: `task.271.plan.finalise-accepts-what-the-record-already-shows.md` — included as implementation context.
- Design choice: Arms 1 and 2 share one new engine, `finalise-delta.js` (`docs-only`, `rerun-eligible`), which reuses `isDocsPath`, `diffNames` and `readConfigAtCommit` from `ci-tree-equivalence.js` so the repository still has one definition of a docs path. The existing engine could not be called as-is: it needs a PENDING/NONE head and walks to a CI-green ancestor, while Arm 1 starts from a commit the figure names and Arm 2 from a red head.
- Arm 3 owner identity: `finalise.deferralApprover` in `skills-config.yaml` (comma-separated), read by the caller and passed as `--approver`; unset means nothing is deferred. Documented in `configuration.md`.
- Vanishing fixture template (obs #50): reproduced nothing. Measured with `GIT_TRACE2_EVENT=… node probe-fixture.mjs`: building the template spawned 3 detached `git maintenance run --auto --quiet --detach` children. Fix: `maintenance.auto=false`, `gc.auto=0`, `receive.autogc=false` on the template's repos. Held by `executed-prose-no-background-git.test.mjs`. The cause of the original ENOENT is **suspected, not proven**.
- Mutation proofs (revert, run, restore): M1 drop the docs-path check (5 tests red), M2 drop the in-diff exclusion (1 red), M3 drop the owner-list check (2 red), M4 allow unlimited re-runs (1 red), fixture fix reverted (1 red). Each file restored byte-identical (`diff` against a saved copy).
- Plan deviation: `finalise-dod-security-prompt.md` and `finalise-ci-poll.sh` were not changed (see the task's Files Summary).
- Not done in Step 3: the Performance criterion (`npm test` median of five alternating runs against `develop`) is left to QA, which records it.
- Verification: `CI=true npm run ci:fast` exit 0 (8043 tests, 0 fail, 2 skipped; tmp-leak ratchet ok); `npm run bundle -- --check` 0 problems.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

### QA Cycle 1 — 2026-11-07

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 60/100: T271-QA-1, QA-2 (HIGH), QA-3, QA-4 (MEDIUM) |
| `/qa-fix` | All four fixed in one commit; `ci:fast` 8055 tests, 0 failed |
| Mutation proofs | Dropping the placeholder refusal, the canonicalisation, the real-date check and the newline in the owner read each turns a named test red; files restored (`cmp`) |
| Bug found by the new test | The first zsh-safe owner read used `printf '%s'`, which dropped the last owner (no trailing newline); the zsh and bash test caught it before commit |
| Timing comparison | The first attempt recorded no seconds (`bc` is not installed on this machine); rewritten to use shell arithmetic, to run in cycle 2 on an idle machine |
| Process slip | Two `sed -i` edits on tracked task-document status lines against the "Edit tool only" rule; no content harm |

Fix summary:

- Struck mechanism: none (first cycle).
- Narrowing residue: none (HIGH findings, not MEDIUM-only).
- Probe: `git grep -l -F -i -e 'failed-file'` over SKILL.md, shared resources and hand-authored references.
  `skills/finalise/SKILL.md` — updated (block rewritten, `bad-failed-file` named); `shared/resources/finalise-delta.js` — updated; `skills/finalise/references/finalise-delta.js` — generated copy, bundled.
  `docs/reference/configuration.md` — unaffected (names the owner key, not the failed-file input). `CHANGELOG.md` — unaffected (states the arms, not path handling).
- Population: 3 executed documents. Move: patch — the four findings are distinct defects in the deliverable, not one subject re-narrowed.

### QA Cycle 2 — 2026-11-07

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 60/100, full refute pass plus safety re-probe: T271-QA-5, QA-6 (HIGH), QA-7 (MEDIUM) |
| Probe engine | 17 probes, 0 escapes; the deferral matcher reproduced 3 of 7 (negated, commented-out, second-id bullets accepted) |
| `/qa-fix` | All three fixed; `ci:fast` 8057 tests, 0 failed (run while the timing job was loading the machine) |
| Mutation proofs | Negation guard, single-backtick guard, symlink-parent guard and the closed-comment strip each turn a named test red; files restored (`cmp`) |
| Gap found by mutation | Removing the closed-comment strip reddened nothing, because the unterminated-comment rule masked it; a control with an honest bullet after a closed comment now holds it |
| Timing comparison | Runs 1 and 2 recorded (166 s branch, 165 s develop, then 224 s branch under load from `ci:fast`); the median is taken from the full five when the job finishes |
| Process slip | A mutation restore edit did not match and left the mutant in the tree for a moment; restored from the byte snapshot and verified with `cmp` and `git diff` |

Fix summary:

- Struck mechanism: none (the three findings are distinct defects, none a re-narrowing of an earlier fix).
- Narrowing residue: none.
- Probe: `git grep -l -F -e 'Deferred Work'` over SKILL.md, shared resources, docs/reference and CHANGELOG.
  `skills/finalise/SKILL.md` — updated (the bullet form is stated); `shared/resources/finalise-deferral-match.js` — updated (header and engine); other hits (`develop`, `qa-*`, `review-*`, the QA loop doc) use the pipeline's own loop-exit section, a different list, unaffected; `CHANGELOG.md` — states the arm, not the bullet grammar, unaffected.
- Population: 4 executed documents. Move: patch.
- Advisory, not fixed: `--base` ancestry is not checked; approver names fold non-ASCII lookalikes (Kelvin sign) to ASCII. Both are in the gate's `recommendations.future`.

### QA Cycle 3 — 2026-11-07

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 70/100, unscoped safety re-probe: T271-QA-9 (HIGH), T271-QA-8 (MEDIUM) |
| Probe engine | 21 probes, 0 escapes; the matcher reproduced 1 of 10 (a conditional lead accepted); the delta engine 0 of 11 |
| `/qa-fix` | Both fixed; `ci:fast` 8058 tests, 0 failed |
| Mutation proofs | Lead allow-list, blob check and toplevel reduction each turn a named test red; files restored (`cmp`) |
| Cause of the repeat | Cycle 2 fixed the negated bullet with a closed list of negation words, which is a deny-list; the next phrasing nobody listed passed. The lead is now an allow-list |
| Test broken by the fix | The bash and zsh re-run block test named a path with a space that did not exist; it now exists in the fixture, because a failed file must be a file |
| Ungated fix | The cycle-3 fix was written in the working tree before gate 3 was written, then gated as findings against the committed head `31ee1c69` and committed with it; the gate record says so |
| Gate score | Gate 2 recorded 60/100; its rule gives 70, corrected from gate 3 on |

Fix summary:

- Struck mechanism: the negation word list (replaced, not extended).
- Narrowing residue: none.
- Probe: `git grep -l -F -e 'failed-file' -e 'Deferred Work'` over SKILL.md, shared resources, docs/reference and CHANGELOG: `skills/finalise/SKILL.md` — updated (bullet form and failed-file wording); `shared/resources/finalise-deferral-match.js` and `finalise-delta.js` — updated; generated copies bundled; other hits are the pipeline's own loop-exit section or unaffected prose.
- Population: 3 executed documents. Move: replace (deny-list to allow-list).
- Advisory, not fixed: gate-entry `action` text and duplicate keys; exact-case comparison (macOS, task 210); `--base` ancestry; Kelvin-sign folding.

### QA Cycle 4 — 2026-11-07

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 60/100, unscoped safety re-probe: T271-QA-10 (HIGH), T271-QA-11 (HIGH), T271-QA-12 (MEDIUM) |
| Probe engine | 14 probes, 0 escapes; the matcher reproduced 4 of 7, the delta engine 1 of 7 |
| `/qa-fix` | All three fixed; `ci:fast` 8060 tests, 0 failed |
| Mutation proofs | Exact approver compare, every-record-must-approve and the regular-file mode check each turn a named test red; files restored (`cmp`) |
| Third strike | Third consecutive HIGH on `finalise-deferral-match.js`. Fix replaced the mechanism: the bullet is one exact line with no optional slot and no word list, a gate entry matches on an explicit `case:` field, the approver is compared exactly, and every record that names the case must approve it |
| Tests broken by the fix | The matcher tests and the bash and zsh block test used the old bullet and gate shapes; updated to the new ones, with refused controls for each rejected phrasing |
| Performance | Four of five pairs, loaded machine (median 194 s against 180 s, spread 166 to 224 s); not a usable measurement, a clean rerun is still owed |

Advisory, not fixed: the Deferred Work section ends only at the next H2; exact-case path compare (macOS, task 210); `--base` ancestry; follow-up task existence is not checked.

### QA Cycle 5 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 70/100, unscoped re-probe: T271-QA-13 (HIGH), T271-QA-14 (MEDIUM) |
| Budget | The five-gate budget was spent; the owner granted one more cycle (`grant-qa-cycles.sh`, `qa_max_cycles` 6) |
| `/qa-fix` | Both fixed; `ci:fast` 8062 tests, 0 failed |
| T271-QA-13 | The gate reader now counts the lines of the `future:` block that name the case against the lines the parsed entries account for; an unaccounted line (a block scalar the subset parser cut) is a blocking record |
| T271-QA-14 | `cleanName` removes one matching pair of backticks or quotes and nothing else, so `sam_` is not `sam` |
| Mutation proofs | Disabling the unread-line check and re-adding the `_`/`*` strip each turn a named test red; file restored (`cmp`) |
| Controls | A block scalar that does not name the case blocks nothing; wrapper pairs of backticks and quotes still match |

Advisory, not fixed: `ls-tree` without `-z` (non-ASCII failed-file names fail closed); an explanatory note naming the case id blocks an approved deferral; a nested list item is read as a record; section end at next H2; exact-case compare (macOS, task 210).

### QA Cycle 6 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 80/100, unscoped: T271-QA-15 (HIGH), T271-QA-16 (HIGH) |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 7) |
| Cause | The cycle-5 check located the unread text by line shape (the `future:` block), so a column-0 comment or an earlier `future:` key hid it. A second heuristic over the same parser |
| `/qa-fix` | Mechanism replaced, no line shape: every occurrence of the case id in the whole gate text (full-line comments excluded) must also occur in a key or value the parser read; an unread occurrence is a blocking record |
| Tests | A withdrawal after a comment, after an earlier `future:` key, and in another section are refused; controls: the id read in another section and an id in a full-line comment still match. `ci:fast` 8063 tests, 0 failed |
| Mutation proofs | Disabling the reconciliation and counting comment lines each turn a named test red; file restored (`cmp`) |

Advisory, not fixed: an inline comment naming the id fails closed; `ls-tree` without `-z`; a nested list item is read as a record; section end at next H2; exact-case compare (macOS, task 210).

### QA Cycle 7 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 80/100, unscoped: T271-QA-17 (HIGH), T271-QA-18 (HIGH) |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 8) |
| Cause | Cycle 6 reconciled the gate but stripped full-line `#` lines from the raw count (text, inside a block scalar) and did not reconcile the work item at all |
| `/qa-fix` | Both sources are reconciled on their RAW text with nothing stripped: every occurrence of the case id in the whole gate and in the whole Deferred Work section must also occur in a key, value or list item the reader took; a surplus blocks |
| Tests | Refused: `#` inside a block scalar, a full-line comment, a `+` bullet, a numbered item, prose, a table row; a commented-out bullet now blocks (`unapproved`) rather than `no-match`. Controls: the id read in another gate section, the id in another work-item section, a longer id. `ci:fast` 8064 tests, 0 failed |
| Mutation proofs | Disabling the work-item reconciliation and re-adding the comment strip each turn a named test red; file restored (`cmp`) |
| Slip | I wrote gate 7's `updated:` by estimate; the gate-timestamp guard caught it in `ci:fast`; corrected from `date -u` |

Advisory, not fixed: `ls-tree` without `-z`; a nested list item is read as a record; section end at next H2; exact-case compare (macOS, task 210). `finalise-delta.js` was last re-probed at gate 5.

### QA Cycle 8 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 90/100, unscoped: T271-QA-19 (HIGH). One finding where the two gates before found two |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 9) |
| Cause | The Deferred Work section boundary was found on raw text while the item reader works on comment-stripped text, so a heading hidden in a comment ended the raw section early |
| `/qa-fix` | The boundary is found on the same visible text, tracked per line (a heading or fence inside a comment is not one), while comment text still counts as section text |
| Tests | Refused: a hidden heading, a hidden fence. Controls: a heading with a trailing comment, a comment-only line still match. `ci:fast` 8064 tests, 0 failed |
| Mutation proof | Detecting the boundary on the raw line again turns a named test red; file restored (`cmp`) |
| Owner decision | The owner did not answer whether a mention outside the section should block, so the documented boundary stands; `skills/finalise/SKILL.md` now says a withdrawal is recorded in the gate or the Deferred Work section, because text under another H2 is not read |

Advisory, not fixed: `ls-tree` without `-z`; a nested list item is read as a record; exact-case compare (macOS, task 210).

### QA Cycle 9 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 80/100, unscoped, both engines: T271-QA-20 (HIGH), T271-QA-21 (HIGH). `finalise-delta.js` held against about 30 probes |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 10) |
| Cause | Two readers of one file stripped HTML comments by different rules (per line against across the text), so a multi-line comment moved the section boundary and an id split by a comment gave slack on one side |
| `/qa-fix` | One shared pass: comments are removed once, the section is found and counted on that single text, and a comment anywhere that names the case id is counted as unread |
| Tests | Refused: a multi-line comment, an id split by a comment, a comment naming the id. Earlier controls still match. `ci:fast` 8064 tests, 0 failed |
| Mutation proofs | Finding the section on the raw text again, and dropping the comment count, each turn a named test red; file restored (`cmp`) |

Advisory, not fixed: `ls-tree` without `-z`; a nested list item is read as a record; exact-case compare (macOS, task 210).

### QA Cycle 10 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 90/100, unscoped: T271-QA-22 (HIGH). The work-item side held against about 30 probes |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 11) |
| Cause | A gate entry counted as a record about the case only through two named fields (`action`, `case`), so a withdrawal in any other field was read as parsed text and never blocked |
| `/qa-fix` | An entry that names the case in any key or value is a record about it; only the entry whose `case:` equals the id approves, every other blocks. Also (the reviewer's low item, taken in the same cycle, T271-QA-23): a fence closes only on the same marker, at least as long, so a record Markdown shows as code is not read |
| Tests | Refused: a withdrawal in `note`, in `reason`, in a key; a bullet inside a ``` fence a `~~~` line cannot close. Controls: an unrelated second entry, a longer id, a proper closer, a tilde fence. `ci:fast` 8066 tests, 0 failed |
| Mutation proofs | Reverting the entry rule to the `action` field, and closing a fence on any marker, each turn a named test red; file restored (`cmp`) |

Advisory, not fixed: a bullet indented four spaces (an indented code block) is still read; `ls-tree` without `-z`; a nested list item is read as a record; exact-case compare (macOS, task 210).

### QA Cycle 11 — 2026-11-08

| Item | Result |
| ---- | ------ |
| `/qa-task` gate | FAIL, 60/100, unscoped: T271-QA-24 (MEDIUM), T271-QA-25 (MEDIUM). About 70 probes found no balanced pair |
| Budget | Spent again; the owner granted a further cycle (`qa_max_cycles` 12) |
| Cause | The code named a fixed set of places that count as the record: one exact heading spelling, and the `future` list |
| `/qa-fix` | Any ATX H2 that renders as the section (closing hashes, case, spacing, emphasis, trailing colon) is the section. A gate record about the case outside `future[]` blocks: an `immediate[]` entry, any other key under `recommendations`, a root key that is not a prose field of the gate schema, and a note or nested value inside the approving entry |
| Tests | Refused: six heading spellings, an immediate entry, another recommendations key, a root key, a note in the approving entry. Controls: gate prose (`top_issues`, `status_reason`) citing the id, an immediate entry about another case, an honest bullet under a variant heading, an unrelated H2, an H3. `ci:fast` 8068 tests, 0 failed |
| Mutation proofs | Reverting to the exact heading, dropping the immediate-entry rule and dropping the stray-note rule each turn a named test red; file restored (`cmp`) |
| Scoring | Gate 11 applies the rule (60); gates 8 and 10 recorded 90 for the same NFR set, which was wrong and was corrected in report 11 |

Advisory, not fixed: withdrawal wording is not machine-readable (the skill now says a withdrawal must name the case id); a bullet indented four spaces is still read; `case` is compared after `trim()`; `ls-tree` without `-z`; exact-case compare (macOS, task 210).

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required; reconcile later with /tracker-reconcile}
