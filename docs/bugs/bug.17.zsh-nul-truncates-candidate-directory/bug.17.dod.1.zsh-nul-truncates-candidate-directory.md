# Definition of Done Verification

**Bug:** bug.17.zsh-nul-truncates-candidate-directory (general bug — `docs/bugs/bug.17.zsh-nul-truncates-candidate-directory`)
**Verification Started:** 2026-09-30T10:40Z
**PR:** [#530](https://github.com/Gamaroff/agent-skills/pull/530) → `develop`, head `40894377f71c`
**Mode:** `/finalise --bug` checks a bug report's fix evidence against the Definition of Done. A bug has no acceptance criteria and carries no Change Log (`document-change-log.md` §Exclusions). It closes through its own lifecycle in `develop-bug` Step 7 Part B. The mode skips the story/task-shaped steps; no step here was skipped by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited.

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
**Overall Security Status:** ❌ FAIL (agent: zero-guard, medium)

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

**Decision:** ❌ GAPS IDENTIFIED

- QA record: ✅ verify loop PASS (cycle 1 of 5)
- Fix evidence: ✅ 4/4 applicable checks (1 N/A)
- PR review: none by a human (autonomous run; the merge gate is `npm run ci` on the PR branch plus the CI rollup)
- Documentation: ✅
- Security: ❌ zero-guard FAIL (medium). The engine cannot reach the boundary. The by-hand probe is clean but does not count.
- Compliance: ⚠️ N/A
- **CI rollup on `40894377f71c`:** SUCCESS over 5 checks (`test`, `validate`, `shellcheck`, `link-check`, branch policy)

**Outcome:**

- [ ] Security: `probe mode executed no candidates` (medium). The probe engine has no entry form for `advance-pipeline-lock.sh --restore <doc-dir>`. Closing it needs either an operator override on the evidence in `bug.17.dod.security.by-hand-probe.md` (the resolution task.133 dod.2 took for the same boundary) or the engine extension tracked by obs #231. Step 8a does not apply, because the finding is medium and the fix belongs in `security-probe.mjs`, outside this diff.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-09-30T10:55Z
**CI reading 1:** SUCCESS @ `40894377f71c` (the acceptance decision — Step 6)
**CI reading 2:** not taken; the gaps path publishes no acceptance commit

**Artifacts Generated:**

- ✅ This DoD summary
- ✅ `bug.17.dod.security.run.json` (+ `.run.json.d/`) is the engine record, with `totals.executed: 0`.
- ✅ `bug.17.dod.security.by-hand-probe.md` is the §5.1 supplementary record.
- ✅ The bug report gains a Status History row: `DoD incomplete — 1 gap(s) — this file`.
- The gaps PR comment is posted after this file is written, and its outcome is recorded in the implementation report.
- Sprint Review summary: not generated (bug mode skip).
- Change Log row: not written. A bug report is forbidden one (bug mode skip).

**Next Steps:**

- Operator decision on the security zero-guard: override on the by-hand evidence, as task.133 did, or wait for the obs #231 engine extension. Then re-run `/finalise --bug` (or `/develop-bug`, which resumes at Step 7).
