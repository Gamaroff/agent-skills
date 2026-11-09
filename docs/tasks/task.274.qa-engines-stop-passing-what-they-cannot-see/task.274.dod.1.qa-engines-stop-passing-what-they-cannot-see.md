# Definition of Done Verification

**Story/Task:** qa-engines-stop-passing-what-they-cannot-see
**Verification Started:** 2026-11-09T11:37Z

---

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.274.qa.1…md`, `qa.2…md`, `qa.3…md`
**Gate Files Found:** `task.274.gate.1…yml` (FAIL 70), `gate.2…yml` (FAIL 80), `gate.3…yml` (CONCERNS 90)
**PR:** #863 (source: branch)

**Gate Status:** CONCERNS, 90/100, `top_issues: []`. Security CONCERNS (five pre-existing deny-list gaps, identical on develop, routed to `recommendations.future`); performance, reliability and maintainability PASS.
**Immediate Actions from QA:** none. **Future Actions from QA:** replace the deny-list with an allow-list (follow-up task); revisit the shape-4 refusal of `sed 2d "$f"`.
**PR Review:** `task.274.pr-review.1…md` — APPROVE (conformance lens; two low findings, both closed by this run).

---

## Supplementary evidence recorded by this run (criteria #2 and #4)

The AC agent returned `FAIL` (low) on criteria #2 and #4 because the evidence was not recorded where a committed artifact holds it. This section is that record. It is part of this DoD file, which the acceptance commit carries.

### Criterion #2 — newly refused blocks in the real docs

**Command** (old classifier = `598e16fe`, the branch point, which has the develop classifier; new classifier = `1d60b861`, tree-equivalent to head; every `bash`/`sh`/`zsh`/`shell` fence in every tracked `.md`):

`classifyBlock` from both `qa-execute-snippets.mjs` copies, run over `extractBlocks(md)` for each of `git ls-files '*.md'`, comparing `klass`.

**Runner output:** `{ blocks: 3435, newlyRefused: 17, newlyRunnable: 0 }`. Fence count by `git grep -c '^```bash' -- '*.md'`: 3,080 `bash` fences (the other fence languages bring the scanned total to 3,435).

**This corrects earlier reports.** The implementation report and QA cycles 1 and 2 recorded one newly refused block (`sed '2d' "$f"` in task.90), and cycle 2 recorded "0 newly refused", measured against cycle 1's classifier. Measured against develop, with the cycle 1 and cycle 2 refusals in, the figure is 17. Nothing became newly runnable.

| # | Block | Refused by |
| --- | --- | --- |
| 1 | `docs/tasks/task.126…/task.126.plan.bundler-citation-form.md:80` | shape 4 — expansion argument to `git` |
| 2 | `docs/tasks/task.137…/task.137.plan.optional-file-glob-sweep.md:52` | shape 4 — expansion argument to `find` |
| 3 | `docs/tasks/task.162…/task.162.plan.stop-hook-step-8-reason-fits-every-orchestrator.md:40` | fail-closed — unparseable |
| 4 | `docs/tasks/task.168…/task.168.plan.gate-head-scoping-hardening.md:83` | fail-closed — unrecognised command `bash` |
| 5 | `docs/tasks/task.217…/task.217.plan.finding-anchors-advisory-follow-ups.md:144` | shape 4 — `git` |
| 6 | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1480` (and its bundled copies in `skills/develop-story` and `skills/develop-task`, line 1481) | shape 4 — `git` |
| 7 | `skills/command-development/references/testing-strategies.md:82` | shape 4 — `sed` |
| 8 | `skills/create-branch/SKILL.md:367` | shape 4 — `git` |
| 9 | `skills/qa-story/SKILL.md:321`, `skills/qa-task/SKILL.md:311`, `skills/review-pr/SKILL.md:478` | shape 4 — `find` |
| 10 | `skills/sync-github-epic/SKILL.md:67`, `sync-github-story/SKILL.md:70`, `sync-jira-epic/SKILL.md:116`, `sync-jira-story/SKILL.md:121` | shape 4 — `find` |

**Disposition of each: annotated here, and left as written in the source.** Each is refused as the owner decided (Phase 1: variable arguments to deny-listed commands are refused, no value tracking), so it is reported as refused and never run. Fixing or re-fencing a block would remove it from the documented-commands check and from the bash and zsh fence tests that read it, which is a larger loss of coverage than the refusal. None was refused wrongly in the sense of a block that must run. The two fail-closed entries (#3, #4) are historical task plans whose text the shell cannot parse as a block. Owner decision pending: whether to accept a coverage loss of 17 blocks, or to add value tracking for the `git rev-parse`/`find "$DIR"` shapes (a follow-up for the allow-list task).

### Criterion #4 — `CI=true npm test` wall time, develop vs head

**Command:** five alternating pairs of `CI=true npm test` (develop worktree at `598e16fe`, then head worktree at `1d60b861`), `uptime` printed before each run; run on this machine, `time` taken with `date +%s.%N` either side.

**Head commit:** `1d60b861`, tree-equivalent to the PR head `40ad7cfd` (`finalise-delta.js docs-only --base 1d60b861 --head HEAD` → `tree-equivalent`; the only commits since are documentation).

| Run | develop (s) | load before | head (s) | load before |
| --- | --- | --- | --- | --- |
| 1 | 170.8 | 0.74 | 196.8 | 4.89 |
| 2 | 231.8 | 5.85 | 234.4 | 8.51 |
| 3 | 211.6 | 5.00 | 215.7 | 7.93 |
| 4 | 241.1 | 7.94 | 239.1 | 6.45 |
| 5 | 172.1 | 8.06 | 169.9 | 6.27 |
| **median** | **211.6** | | **215.7** | |

Median ratio 1.019, so the head is **+1.9%** against a bound of 10%. Load was high and uneven (0.7 to 8.5), so each pair is noisy; the medians sit inside the bound with room. Both sides exit 1 in these scratch worktrees because the same two tests fail on develop and on head (`skills/create-task/tests/from-observation.test.js`, `tests/test-clean-checkout.test.js`); I did not investigate the cause, and the failure is identical on both sides, so it does not bias the ratio. The pass counts are 8,072 on develop and 8,105 on head (the head adds 33 tests).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (after the re-judge of #2 and #4, and grading #6 from CI reading 1)
**PR Status:** OPEN (PR #863, source: branch)
**PR Review Decision:** none required by the host; satisfied by `task.274.pr-review.1…md`, verdict APPROVE
**Re-run scope:** full (no-prior-record) — 8 re-judged, 0 carried
**AC record:** `task.274.dod.1.ac.json` (agent 1's first answer, 6bb6528f…, was edited by this run for #2 and #4 after the re-judge, so the record reads `verified: false`)

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 Four base-scan shapes mutating, controls runnable | ✅ PASS | `shared/resources/qa-execute-snippets.mjs:1871`; tests `shared/resources/tests/qa-execute-snippets.test.mjs:3808-3830` |
| #2 Newly refused real-docs blocks listed with command | ✅ PASS (first pass FAIL low; evidence recorded above) | this file, "Criterion #2" |
| #3 Second control coexists; width mismatch refused | ✅ PASS | `security-probe.test.mjs:3002`, `status-history-cli.test.mjs:356` |
| #4 Wall time within 10% of develop | ✅ PASS (first pass FAIL low; re-measured above) | this file, "Criterion #4": +1.9% |
| #5 Each fix has a mutation proof | ✅ PASS | QA reports 2 and 3, bugs 1 to 4 |
| #6 `bundle --check` 0 problems; `CI=true npm test` passes | ✅ PASS | CI reading 1, below |
| #7 Cases file under 100,000 bytes | ✅ PASS | QA report 2: 8,813 bytes |
| #8 Existing committed cases file runs unchanged | ✅ PASS | `security-probe.test.mjs:3035` |

**CI reading 1:** SUCCESS after one re-run @ `40ad7cfd9cc7`. The first `Test` run on this head passed all 8,135 tests and then failed the post-suite temp-directory leak check on a new prefix, `ctx-wrap-`, created by `shared/resources/tests/context-pressure-statusline.test.mjs`, a test this PR does not touch. The same code was green at `1d60b861`, and the delta since is documentation only (`finalise-delta.js rerun-eligible` → `eligible`). The one allowed re-run was green (attempt 2).
**CI re-run:** attempt 1 FAILURE on the `test` job, post-suite leak check, `ctx-wrap` prefix from `context-pressure-statusline.test.mjs`, @ `40ad7cfd9cc7`; delta `1d60b861..40ad7cfd` is docs-only; attempt 2 SUCCESS @ `40ad7cfd9cc7`. The leaking test looks intermittent. I did not investigate it, and it is worth a follow-up.

**Advisory (not a gap):** QA gate 3 routes five pre-existing deny-list gaps in the snippet runner to `recommendations.future` (identical on develop). They are the reason security reads CONCERNS in the gate, and they need an owner decision on a follow-up task (replace the deny-list with an allow-list).

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- No hardcoded secrets in the added lines — PASS.
- No new unsafe patterns; the `spawnSync(shell, ["-n","-c","--",code])` syntax check runs nothing — PASS (`qa-execute-snippets.mjs:2274`).
- `--fixture-copy` path containment — PASS by read-only review (`security-probe.mjs:1876`, realpath re-check at 1898-1903); the engine cannot score a decline.
- Dependency risk — NOT_APPLICABLE (no `package.json` change).

### Probe Results

**Candidates executed:** 59 — **reproduced:** 0 — **escaped:** 0. ✅ **The boundary held.** Plan run by `/finalise` from the security agent's plan (extracted byte-exact from its transcript, 7,324 bytes, sha256 541ec597…): the 39-case QA cycle 3 replay by committed cases file, plus 20 new spec-grounded cases. Record: `task.274.dod.1.security.run.json`; plan: `task.274.dod.1.security.plan.json`.

### Recommendations for the owner

Not security findings, and they do not count against the verdict. Both are identical on develop.
- **Spec challenge:** `find docs -de{lete,lete}` (brace expansion builds a deny-listed flag from literal text) classifies runnable; the spec (task doc, shape 4) covers only variable expansion.
- **Spec challenge:** `find docs -name x${IFS}-delete` (an unquoted expansion after a literal prefix word-splits into a flag) classifies runnable; tightening it would refuse the control `find docs/$X -name z`.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. Internal QA tooling with no personal data, payment, UI or health-data surface.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- `CHANGELOG.md:9` cites `(task 274)` under `[Unreleased]` — PASS.
- Prose restatements and bundled copies updated (`qa-runnable-prose-detection.md`, `probe-boundary-rule.md`); the one `SKILL.md` edit is body-only, so no catalog regeneration — PASS.
- README and architecture docs — NOT_APPLICABLE.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Gate: CONCERNS 90/100 — no open finding against the change set; one pre-existing security concern routed to a follow-up
- Acceptance Criteria: ✅ 8/8
- PR Review: ✅ APPROVE (`task.274.pr-review.1…md`)
- Documentation: ✅
- Security: ✅ 59 probes, 0 reproduced
- Compliance: not applicable
- CI: ✅ SUCCESS @ `40ad7cfd9cc7` after one recorded re-run

**Deviations recorded, not hidden:**

1. The first AC pass failed two criteria (#2, #4) low. They were closed by recording evidence in this file and re-measuring timing, then re-judged by a second agent pass; the AC record was edited by hand to carry that, so it is marked `verified: false`.
2. The real-docs figure is 17 newly refused blocks against develop, not the one or zero earlier reports gave. All 17 are owner-decided refusals (shape 4 or fail-closed). The coverage loss is unfixed and needs an owner decision.
3. One CI re-run on a leak check from a test this PR does not touch.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-09T12:28Z
**Total Duration:** 51 minutes
**CI reading 1:** SUCCESS (after one re-run) @ `40ad7cfd9cc7` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (the PR canonical comment, and any tracker action) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Ready for merge by the develop-next orchestrator
- Decide the follow-up for the five pre-existing deny-list gaps and the 17 refused doc blocks
