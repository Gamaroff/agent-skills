# Definition of Done Verification

**Bug:** bug.17.zsh-nul-truncates-candidate-directory (general bug — `docs/bugs/bug.17.zsh-nul-truncates-candidate-directory`)
**Verification Started:** 2026-09-30T11:10Z
**PR:** [#530](https://github.com/Gamaroff/agent-skills/pull/530) → `develop`, head `521805a8` (the code tree is unchanged since `40894377`; only bug-directory docs changed)
**Mode:** `/finalise --bug` checks a bug report's fix evidence against the Definition of Done. A bug has no acceptance criteria and carries no Change Log (`document-change-log.md` §Exclusions). It closes through its own lifecycle in `develop-bug` Step 7 Part B. The mode skips the story/task-shaped steps; no step here was skipped by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). **Run 2.** `bug.17.dod.1` recorded one gap, the security zero-guard. This run records the operator's override of that gap. `git diff 40894377..521805a8` touches only files under the bug directory, so the fix, its tests and the bundled copies are the ones dod.1's four agents verified. This run re-ran those checks locally rather than re-dispatching the agents: `advance-pipeline-lock.test.sh` 109/109, `grant-qa-cycles.test.sh` 46/46, `npm run bundle:check` 0 problems. It took a fresh CI reading on the current head.

---

## Step 1: QA Report Review

**QA Reports:** None. A bug directory carries no gate file. The develop-bug verify loop is the QA record: 1 cycle in the implementation report (`bug.17.implementation.1.initial-run.md` §QA Iteration History), PASS. The bug file's `#### QA Verification` on Iteration 1 reads `✅ Fixed`. Lite mode (Minor/Low) ran signals 1 and 2 only.

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** ✅ PASS

#### Expected behaviour — "A candidate whose `task_or_story_directory` holds a control character is refused under **both** shells … skipped with a stderr line naming the candidate and is never chosen"

**Status:** ✅ PASS

- Code evidence: `shared/resources/advance-pipeline-lock.sh:237` runs a `jq -e` control-character test on the JSON value before the lossy `$(jq -r …)` read at `:241`. On a match it prints a named refusal (`:238`) and `continue`s, so the candidate never joins `MINE`.
- Test evidence: `shared/resources/advance-pipeline-lock.test.sh:633` (4 suffixes) and `:654` (a NUL claim beside a matched snapshot). They run in the `test` lane via `npm test` on every PR. CI run 36703989248 shows the 4 `[bash]` cases passing. ubuntu-latest has no zsh, so the `[zsh]` pass is skipped in CI and runs on local hosts only.
- Executed evidence: 109/109 locally, bash and zsh.

#### Regression test fails without the fix, passes with it

**Status:** ✅ PASS

- The implementation report and the bug file record the new cases as 9 of 10 red before the fix. The fix-evidence agent independently neutered the predicate on a scratch copy and got `100 passed, 9 failed`, 4 of them under bash. So the bash lane in CI goes red on regression by behaviour, not only by message.

#### The guard's stated scope matches its scanned scope

**Status:** ⚠️ NOT_APPLICABLE

- The fix adds scenario cases to an existing behavioural test. It adds no corpus or call-site guard.

#### Bundled copies match the source

**Status:** ✅ PASS

- All 12 `skills/*/references/advance-pipeline-lock.sh` copies are in the diff. `npm run bundle:check` reports `129 skill(s) checked, 0 problems`.

#### Suite + lint green

**Status:** ✅ PASS

- `npm run ci:fast` passed on the fix tree (format check + full `npm test`). `npm run lint:shell` reports shellcheck clean.

### Documentation

- **Bug report fix record**: ✅ PASS. Investigation (`:79`), Fix Implementation (`:89`), QA Verification (`:118`). No template placeholders remain, other than `## Resolution Summary`, which Part B writes.
- **Status History**: ✅ PASS. 5 rows before this run; the last one (`Ready for QA`) matches the frontmatter.
- **Change Log**: ⚠️ NOT_APPLICABLE. Bug reports carry `## Status History`, never a Change Log. The bug file has 0 `## Change Log` headings, as required.
- **Review report**: ✅ PASS. `bug.17.review.1.zsh-nul-truncates-candidate-directory.md` (READY TO FIX 10/10).
- **Implementation report**: ✅ PASS. `bug.17.implementation.1.initial-run.md`: Pipeline Progress through Step 5–6, Verify Cycle 1.
- **Behaviour docs**: ✅ PASS. `pipeline-resume-detector-prompt.md:90` already drops any candidate whose directory string differs, and it defers to `choose_candidate()`, so it was left unchanged on purpose.

---

## Step 3: Security Review

**Story Type:** bug (shell script: pipeline-lock provenance guard)
**Overall Security Status:** ❌ FAIL (agent), ✅ **PASS by human override** (see Step 5)

- **No hardcoded secrets introduced**: ✅ PASS (`advance-pipeline-lock.sh:237`)
- **No new unsafe patterns**: ✅ PASS. The candidate is read by `jq -e` from a file path with a fixed filter, and no candidate value reaches a shell string.
- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE (`package.json` unchanged; jq was already required)

### probe mode executed no candidates

**Status:** ❌ FAIL (medium)

- Evidence: `bug.17.dod.security.run.json`
- The boundary is `advance-pipeline-lock.sh#choose_candidate`, reachable only through `--restore [--which] <doc-dir>`. The probe engine has no form for a shell script that takes a flag plus a positional. `shell-fn:` was declined `entry-not-probeable` (sourcing runs the top-level parse, which exits 97). `cli:` was declined (neither `.mjs` nor `.js`). `shell:` reaches only the numeric-advance arm. Result: `totals.executed: 0`. This is the same engine gap as task.133 dod.2 (obs #231), not a defect in the fix.

### Probe Results

**Candidates executed:** 0 — **reproduced:** 0

❌ **Probe mode executed no candidates.** A boundary was identified, but nothing ran against it, so this is a finding, not a pass.

**Supplementary (not a probe count):** `bug.17.dod.security.by-hand-probe.md` is a §5.1 by-hand probe: 33 cases (25 hostile, 8 legitimate) × bash and zsh under `env -i`. The post-fix script matched 66/66. The same harness on the pre-fix script (`8d5ba45e`) gives 8 mismatches, so it tells the two apart. It also shows bash accepted `<doc>\u0000` and `<doc>\n` before the fix.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. The change is to an internal pipeline shell script and its tests: no personal data, payments, UI or PHI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS (see Step 2 → Documentation). `CHANGELOG.md:102` under `## [Unreleased]` › Fixed cites `(bug 17, #529)`. Bug-registry row 17 moves to `closed` in Part B.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED, with one explicit, human-authorised override, stated below

- QA record: ✅ verify loop PASS (cycle 1 of 5)
- Fix evidence: ✅ 4/4 applicable checks (1 N/A)
- PR review: none by a human (autonomous run; the merge gate is `npm run ci` on the PR branch plus the CI rollup)
- Documentation: ✅
- Security: ✅ **PASS by human override of the engine's zero-guard FAIL** (see below)
- Compliance: ⚠️ N/A
- **CI rollup on the current head:** see CI reading 1 below

**The override, stated in full:**

- **What was overridden.** The security agent's one FAIL was `probe mode executed no candidates` (medium). Its checklist is otherwise clean. The FAIL comes from the probe engine having no entry form for a shell script that takes a flag plus a positional, which is the shape of `advance-pipeline-lock.sh --restore [--which] <doc-dir>`. The engine record (`bug.17.dod.security.run.json`) stands as **engine: unverifiable (flag + positional shell script)**, never as a probe count.
- **Who decided.** The operator (the user) authorised it in this session, after reading dod.1's gap report, with the instruction "override it". The task.133 override was not reused; this is a fresh decision for bug.17.
- **The evidence the decision rests on.**
  - `bug.17.dod.security.by-hand-probe.md`, the §5.1 by-hand probe: 33 cases × bash and zsh under `env -i`. Post-fix it matched 66/66. The pre-fix script gave 8 mismatches, so the harness tells the two apart.
  - Fix-evidence PASS, including the agent's own scratch mutation (`100 passed, 9 failed`).
  - CI green.
- **Why the diff itself is low-risk.** It adds one refusal branch that runs before the existing compare and changes nothing about any other candidate.
- **Follow-up.** Obs #231 (the engine extension to a `cli:`-style argv template for shell scripts) now carries a recurrence note. Until that lands, every change to this script needs the same override.

**Fix-and-recheck (Step 8a):** not taken. The finding is medium, and the fix belongs in `security-probe.mjs`.

**Outcome:** The fix meets every applicable Definition of Done criterion on a CI-green head, with the security zero-guard overridden by the operator. Accepted.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-30T11:46Z
**CI reading 1:** SUCCESS @ `521805a861f4` over 5 checks (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ This DoD summary (committed and pushed at 6a)
- ✅ Bug report: Status History row `DoD verified — bug.17.dod.2.zsh-nul-truncates-candidate-directory.md` (6a). The Resolution Summary and `status: closed` are written by develop-bug Step 7 Part B, after this skill returns.
- Outward side-effects (the PR canonical comment, the tracker comment and close, the board move) fire **after** this file is committed and pushed, at the Step 7 publish boundary. Their outcomes are recorded on the PR canonical comment and in the implementation report, not here.
- Sprint Review summary: not generated. A bug fix is reported through its Resolution Summary and the registry, not a sprint-review artifact (bug mode skip).
- Change Log row: not written. It is forbidden for a bug report (bug mode skip).
- Task registry tick: `not-a-task` (a bug run; the bug registry row is written in Part B).

**Next Steps:**

- develop-bug Step 7 Part B: Resolution Summary, `status: closed`, final Status History row, registry row `closed`.
