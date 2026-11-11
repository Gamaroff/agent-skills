# Definition of Done Verification

**Story/Task:** task.304 — QA snippet classifier refuses git literal execution
**Verification Started:** 2026-11-11T08:00Z

---

## Verification Results

## Evidence recorded by this run (measured on head d611a3c7 plus the doc fixes)

- **#1 amendment.** Criterion #1 said `--exec-path` is not refused. QA cycle 2 measured that `ls-remote --exec-path=<dir>` runs `<dir>/git-upload-pack`, so the engine refuses it. The owner approved the amendment (criteria-drift reports `#1 reworded, approved: true`). The other criteria text is unchanged from the review commit (`criteria-drift.js`: no other drift).
- **#3.** Differential on the LAN server: 0 writes in 20000 blocks on the enlarged git atom set (QA 7). The original 600-block figure stands for the first delivery.
- **#5 docscan timing on head.** `node scripts/qa-snippets-docscan.mjs --time`, five runs, load average about 2.3 beside each: develop 546, 487, 543, 505, 594 ms (median 543); now 494, 449, 505, 472, 553 ms (median 494). Newly runnable 0, newly refused 0 on 3473 blocks. No outlier. The bound (+10%) is met, now is 9% faster.
- **#5 re-measured on head 4217703a (the develop merge), 2026-11-11.** `node scripts/qa-snippets-docscan.mjs --time`, ten runs, load average 2.6 to 3.4 beside each (`uptime` read before each run; the laptop was busier than at the first measurement). The script times both sides itself. develop (ms): 831, 1232, 930, 784, 925, 782, 870, 939, 823, 880, median 875. now (ms): 769, 1150, 854, 843, 980, 749, 800, 872, 756, 810, median 826. Now is 5.5% faster than develop, bound +10% met. Newly runnable 0, newly refused 0 in every run. The 1232 and 1150 ms runs are the same pair (a load spike), not an outlier on one side. This replaces the d611a3c7 figure above.
- **#8 amendment.** `-c` is held by three overlapping layers, so no revert turns a test red. Criterion #8 was reworded to say so and to name the outcome rows as its proof. The owner approved the amendment in this session (2026-11-11), as for #1.
- **Security probe plan, re-run on head 4217703a.** 62 executed, 0 reproduced, 0 escaped, 0 refusals. The cases file is byte-identical to the one committed at the first run (`cmp`). The record and its sidecar were replaced with this run's.
- **#6.** `CI=true node --test shared/resources/tests/qa-execute-snippets.test.mjs`: 405 pass, 0 fail (397 at first delivery; the criterion's claim is "green").
- **#7 bundle freshness.** `python3 skills/create-skill/scripts/bundle_skill.py --check`: 129 skill(s) checked, 0 problems.
- **#8 per-refusal mutation proofs, re-run this run** (one refusal off at a time, engine restored from a snapshot, `cmp` clean each time):
  - `--config-env` refusal off: red, `AssertionError: --config-env`.
  - `--upload-pack` / `--exec` refusal off: red (2 fail): `git: classified runnable, but bash wrote: ["git ls-remote --upload-pack='touch out' file:///none…` and `ls-remote --upload-pack=`.
  - `-c` refusal off: **no test goes red**, and neither does turning off the operand-flag refusal as well (only `git --namespace x log -1` goes red). `-c <value>` is still refused because the value is then read as the subcommand and is not on the allow-list. So `-c` is held by three independent layers, and no single or double revert proves one of them alone. That is defence in depth, recorded here as it is, not as a red proof. The `-c` rows in the bash-verified table (`T304_FORMS`) assert the outcome (a bash-verified write is refused), and QA reports 1 to 7 hold them green.
  - Earlier cycles: GIT_ name (QA 2), `--exec-path=<dir>` and unquoted brace (QA 3), unknown flag (QA 5), reader-agreement (QA 6), operand-flag, plain-flag and `-C` plain-word (QA 7).
- **Security probe plan.** The security agent's 62-case plan ran through the engine: 62 executed, 0 reproduced, 0 escaped, 0 refusals (record `task.304.dod.1.security.run.json`).

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.304.qa.1` to `qa.7`. **Gate:** `task.304.gate.7.*.yml`, **PASS**, quality score 95. Seven gates, four fixes. **PR review:** `task.304.pr-review.1.*.md`, CONCERNS (three medium and three low findings, all documentation, fixed in the same cycle). **PR:** #876 (source: branch). **Waiver:** none.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS once the two CI-state criteria are graded from CI reading 1 (see the line under Step 5). The AC agent's second pass, on head 66eea6e8, returned `PARTIAL`: eight PASS, two `DEFERRED-CI`.
**PR Status:** OPEN (PR #876). **PR Review Decision:** null (no review required on this repository), satisfied by the pr-review report above.
**Re-run scope:** full (no-prior-record), 10 re-judged, 0 carried. The first pass on head 4217703a had two low FAILs, #5 (timing measured on a head that was not tree-equivalent) and #8 (`-c` has no single-revert red). #5 was re-measured on 4217703a and #8 was amended with the owner's approval; the pass below judged both as they now stand.

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 git literal forms refused, bash-verified | ✅ PASS | `shared/resources/qa-execute-snippets.mjs:2613`, `qa-execute-snippets.test.mjs:5634-5680`. Reworded for `--exec-path=<dir>`, approved. |
| #2 control table stays runnable | ✅ PASS | `qa-execute-snippets.mjs:531`, `qa-execute-snippets.test.mjs:5897` |
| #3 differential writes nothing | ✅ PASS | `qa-execute-snippets.test.mjs:5139` (calibration), `qa.1:67` (0 writes, old engine 10 of 600), `qa.3:87` (0 of 20000) |
| #4 docscan newly runnable 0 | ✅ PASS | `qa.7:66` (3472 blocks, newly refused 0); the run above (3473 blocks, 0 and 0) |
| #5 docscan median within +10% | ✅ PASS | The re-measure above: develop 875 ms, now 826 ms. Tree-equivalent to head (`finalise-delta.js docs-only`: `tree-equivalent`). |
| #6 CI=true test green, format clean | ⏳ DEFERRED-CI | Graded from CI reading 1 below. Local: 405 pass, 0 fail. |
| #7 bundle:check 0 problems | ⏳ DEFERRED-CI | Graded from CI reading 1 below. Local: 129 skills, 0 problems. |
| #8 refusals mutation-proven (`-c` by outcome) | ✅ PASS | Amended, approved. `-c` proven by the `T304_FORMS` rows (`qa-execute-snippets.test.mjs:5635`); every other refusal has a named red test across `qa.2` to `qa.7`. |
| #9 CHANGELOG cites (task 304) | ✅ PASS | `CHANGELOG.md:9` |
| #10 doc § 2a-iii names the forms | ✅ PASS | `shared/resources/qa-runnable-prose-detection.md:336` |

### Advisory (not a gap)

- **#5**: the criterion text still carries the first-delivery parenthetical (428 vs 406 ms). Informational.
- **#6**: the criterion text says 397 pass; the run records 405 because tests were added after first delivery. Informational.
- **#9**: no changelog guard was named; `evals/shared/tests/changelog-entry-drift.test.mjs` is the guard.

### Documentation

- **README or skill files updated where behaviour changed**: ✅ PASS, `qa-runnable-prose-detection.md:336` and the regenerated `skills/*/references/` copies.

---

## Step 3: Security Review

**Story Type:** task. **Overall Security Status:** ✅ PASS

- No hardcoded secrets: ✅ PASS. No unsafe patterns (`eval`, `exec`, `spawn`): ✅ PASS (`isRunnableBlock` is a pure classifier). No security TODOs, no dependency change: ✅ PASS.

### Probe Results

**Boundary: true** (shell-exec classifier; the task's own refusal list matched). **Candidates executed:** 62 — **reproduced:** 0 — **escapes:** 0 — **refusals:** 0.
✅ **The boundary held** — every candidate returned its expected verdict.
- Probe run by /finalise from the security agent's plan: 1 control, record `task.304.dod.1.security.run.json`. Plan extracted from the agent's transcript (sha256 `fce6c39f…`). Cases file `task.304.dod.1.security.cases.json` is byte-identical to the one committed at the first run (`cmp`) and holds 62 cases (15 legitimate), each with a `spec_ref`.

**Agent summary:** boundary held, no new unsafe pattern.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. GDPR, PCI-DSS, WCAG and HIPAA do not apply: an internal classifier, its tests, a script and a prose doc, with no user data, payment, UI or health content.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS. CHANGELOG entry under `[Unreleased]` cites `(task 304)` (`CHANGELOG.md:9`). `qa-runnable-prose-detection.md:336-368` documents the refusals and the skill copies are regenerated. README and architecture docs: NOT_APPLICABLE (no public surface changed).

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED. QA gate PASS (95), AC 10 of 10 (#6 and #7 graded from CI reading 1), docs PASS, security PASS (boundary held), compliance not applicable.

**CI-state criteria:** #6 → PASS, #7 → PASS (CI reading 1: SUCCESS @ `66eea6e8`). AC_OVERALL re-folded: PASS.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-11T17:22Z
**Total Duration:** 562 minutes, 08:00Z to 17:22Z (the run halted for bug 21 and resumed)
**CI reading 1:** SUCCESS @ `66eea6e8` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD section, status `accepted`, Change Log row
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment) fire after this file is committed and pushed. The task has no linked tracker issue, so no tracker close or board move applies.

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
