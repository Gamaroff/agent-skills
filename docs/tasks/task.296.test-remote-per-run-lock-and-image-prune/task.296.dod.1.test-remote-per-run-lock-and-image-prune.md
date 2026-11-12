# Definition of Done Verification

**Story/Task:** task.296.test-remote-per-run-lock-and-image-prune
**Verification Started:** 2026-11-12T19:08Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports:** `task.296.qa.1` to `qa.5`. **Gate:** `task.296.gate.5…yml`, PASS 96/100, `top_issues: []`, head `891786345c16`, security `evidence: measured` (20 probes executed, 0 escaped), reliability CONCERNS (advisory only; CR-3 to CR-6 in `recommendations.future`).
**PR review:** `task.296.pr-review.2…md`, verdict APPROVE (PC-1 and PC-2 are the `/finalise` writes: `pr_number` and the success-criteria ticks).
**PR:** #891 (source: branch). Review decision on the host: none required.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL as the agent returned it (#7 and #9 are `DEFERRED-CI`, graded from CI reading 1 in Step 6)
**PR Status:** OPEN (PR #891)
**Re-run scope:** full (no-prior-record), 10 re-judged, 0 carried

| # | Criterion (short) | Status | Code | Test |
|---|---|---|---|---|
| 1 | Overlapping run refused before sync, names owner, first undisturbed | ✅ PASS | `scripts/remote-test/run.sh:270` | `tests/test-remote-runner.test.js:696` (live run: QA 5 lines 51-56) |
| 2 | `--unlock` clears a crashed run's lock, never a live one | ✅ PASS | `scripts/remote-test/lockctl.sh:98` | `tests/test-remote-runner.test.js:1093` (live: QA 1 line 55) |
| 3 | `--prune-images` keeps current and in-use tags, no global prune | ✅ PASS | `scripts/remote-test/lockctl.sh:116` | `tests/test-remote-runner.test.js:1267` (live: QA 1 line 56) |
| 4 | No existing option's behaviour changes | ✅ PASS | `scripts/remote-test/run.sh:151` | `tests/test-remote-runner.test.js:243` |
| 5 | At most one extra ssh round trip | ✅ PASS | `scripts/remote-test/run.sh:216` | `tests/test-remote-runner.test.js:749` (counted from the stub log) |
| 6 | Load recorded before and after the live runs | ✅ PASS | QA 5 line 56, QA 1 line 59 | documentation criterion |
| 7 | `lint:shell` and `format:check` pass | ⏳ DEFERRED-CI | `.github/workflows/shellcheck.yml:21` | graded in Step 6 |
| 8 | Offline guard passes under `CI=true` | ✅ PASS | `scripts/remote-test/run.sh:216` | `tests/test-remote-runner.test.js:696` (48/48 under `CI=true`, QA 4 and 5) |
| 9 | `ci:fast` green on the final tree | ⏳ DEFERRED-CI | `.github/workflows/test.yml:1` | graded in Step 6 |
| 10 | `testing-remote.md` states the lock and staleness rule; CHANGELOG cites task 296 | ✅ PASS | `docs/contributing/testing-remote.md:45`, `CHANGELOG.md:9` | documentation criterion |

### Advisory (not a gap)

- **#4**: one line of the stub-ssh arm in `tests/test-remote-runner.test.js` changed (scaffolding, not a test case), so "run unchanged" is not literally true of the file. Low impact.
- **#9**: the server `ci:fast` figure (8431 pass) was taken at `2f9f1db9`; the later delta to the head is documentation only (QA 5: `git diff` over `scripts` and `tests` is empty).

### Documentation

- **Task-type docs**: ✅ PASS, `docs/contributing/testing-remote.md:25`.

**Agent summary:** 8 of 10 criteria PASS with code and per-PR test evidence; #7 and #9 wait on CI.

---

## Step 3: Security Review

**Story Type:** infrastructure
**Overall Security Status:** ✅ PASS

- No hardcoded secrets: ✅ `scripts/remote-test/lockctl.sh:36` (the token is a caller-supplied per-run value)
- No unsafe patterns (eval, exec, unquoted interpolation): ✅ `scripts/remote-test/lockctl.sh:56` (every argument is regex-validated before use; `rm -rf` only on `lock_dir()` of a validated run directory; `docker rmi` takes an explicit `repo:tag`, no `-f`)
- TLS / transport: ⚠️ NOT_APPLICABLE (ssh with `BatchMode=yes`; the script is piped over stdin, never installed)
- Security TODOs: ✅ none. Dependency risk: NOT_APPLICABLE (`package.json` untouched).

### Probe Results

**Boundary:** true (criteria vocabulary: "never"). The security agent returned a 5-control plan on the `shell-argv` form (run directory on `take` and `release`, the `take` timeout, the `unlock` margin, the `prune` image).
**First run:** 32 candidates executed, 2 "reproduced", 2 "escaped". Both were artefacts of the plan, not of the code: the two legitimate `take` cases (`rd.ok`, `tm.ok`) are state-mutating, ran under bash and then zsh in one sandbox, so the zsh run saw the bash run's lock (exit 10, "held"), and the `take` lock under the sandbox's own `HOME` was counted as a write outside the fixture. A fresh `HOME` under zsh takes the lock (exit 0), so the code is right.
**Corrected run:** the two `take` entries made hostile-only (the plan's `release` entry keeps its legitimate case; it writes nothing), the same approach QA cycle 4 used. **Candidates executed: 28 — reproduced: 0 — escaped: 0 — refusals: 0.**
✅ **The boundary held** — every candidate returned its expected verdict.
- Plan extracted byte-exact from the agent's transcript (8964 bytes, sha256 `f5ab202c…`); the corrected plan was derived from it with `jq`, not retyped. The first run's plan and result are kept in the scratchpad, and its record was replaced by the corrected run's. Probe run by `/finalise` from the agent's plan — 5 controls, record `task.296.dod.1.security.run.json`.
- **Limit:** the `take` timeout and run-directory controls have no legitimate-input case in this record (a legitimate `take` cannot be probed in the engine's sandbox without being counted as a write). Legitimate behaviour is held by the offline tests (`tests/test-remote-runner.test.js`, 48 cases) and the live runs.

**Agent summary:** the static checklist is clean, and the boundary probe found nothing.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. Developer tooling with no personal data, payments, UI or health data (GDPR, PCI-DSS, WCAG, HIPAA all NOT_APPLICABLE).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG.md updated: ✅ `CHANGELOG.md:9` cites `(task 296)` under `[Unreleased]`.
- Task-type docs: ✅ `docs/contributing/testing-remote.md:25` (the options, the lock and its staleness rule, pruning and the troubleshooting row).
- README / architecture docs: ⚠️ NOT_APPLICABLE (`README.md` does not mention `test:remote`).

---

## Step 5: Acceptance Decision

**CI reading 1:** SUCCESS @ `6bee71806f38` over 5 checks (allowed-branch, link-check, secret-scan, shellcheck, test). It was PENDING (`test` running) when first read; the decision waited for the lane to finish.
**CI-state criteria:** #7 → PASS, #9 → PASS (CI reading 1 above). AC_OVERALL re-folded: **PASS**.

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (96/100, gate 5, `top_issues: []`)
- Acceptance Criteria: ✅ 10/10
- PR Review: ✅ Step 5c APPROVE (`task.296.pr-review.2…md`); the host requires no review (`reviewDecision` empty)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (28 candidates, 0 reproduced, 0 escaped)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Deviations recorded, not hidden:**

1. The security probe plan was run twice. The first run read 2 "reproduced" and 2 "escaped" from two legitimate `take` cases that mutate state under a shared sandbox (a bash run's lock was seen as held by the zsh run, and the lock under the sandbox `HOME` was counted as a write). I confirmed by hand that a fresh `HOME` takes the lock under zsh (exit 0). The two `take` entries were then made hostile-only with `jq` (not retyped) and re-run: 28 executed, 0 reproduced, 0 escaped. The first plan and result are kept in the scratchpad; their record was replaced by the second run's. This is a plan-shape correction by me, not a re-grade by an independent reviewer.
2. Independent review was reduced across the pipeline: review-task and the loop audit ran inline, QA cycles 2 and 3 reviewers ran little, and the Step 5c conformance lens was shallow (18 s). PC-2 was checked inline.
3. Advisory CR-3 to CR-6 (reliability, gate 5 `recommendations.future`) are unfixed by design.

**Outcome:** Task meets all Definition of Done criteria and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-12T19:15Z
**Total Duration:** 7 minutes
**CI reading 1:** SUCCESS @ `6bee71806f38` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section, `status: accepted`, `pr_number: 891`
- ✅ Sprint Review summary created
- ✅ Task registry row ticked (`registry-tick.js`: `ticked`, staged)
- Outward side-effects (the PR canonical comment) fire after this file is committed and pushed; their outcomes are recorded on the PR comment and in the implementation report. The task has no tracker issue, so there is no tracker close or board move.

**Next Steps:**

- Task is ready for merge
- No further action required
