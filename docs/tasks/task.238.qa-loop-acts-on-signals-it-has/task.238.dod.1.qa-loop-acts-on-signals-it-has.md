# Definition of Done Verification

**Story/Task:** task.238.qa-loop-acts-on-signals-it-has
**Verification Started:** 2026-10-28T04:45Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.238.qa.1` – `task.238.qa.3.qa-loop-acts-on-signals-it-has.md`
**Gate File Found:** `task.238.gate.3.qa-loop-acts-on-signals-it-has.yml` (newest of 3)

**Gate Status:** ✅ PASS
**Quality Score:** 90/100
**Gate history:** FAIL 70 → CONCERNS 80 → PASS 90 (3 cycles, 4 bugs filed and closed)
**PR conformance (5c):** ✅ APPROVE — `task.238.pr-review.1.qa-loop-acts-on-signals-it-has.md` (1 low doc-only finding, fixed in the carry)

**Immediate Actions from QA:** None (`top_issues: []`)
**Future Actions from QA:** carried in gate 3 `recommendations.future` (cycle-1–3 low advisories)

**PR:** #770 (source: branch)
**CI reading 1:** SUCCESS @ `8ac7ffef9446354a0b86ec6941f7eb07d2a45ea1` over 6 checks (allowed-branch, link-check, secret-scan, shellcheck, test, validate — all SUCCESS)
**PR review decision:** none required by the host (`reviewDecision` empty); satisfied by the 5c `/review-pr` APPROVE report above (obs #253)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ❌ FAIL (agent: PARTIAL — 13/14 PASS; SC-10 FAIL, confirmed by execution below)
**PR Status:** OPEN (PR #770)
**PR Review Decision:** null — host requires none; evidence is `task.238.pr-review.1.qa-loop-acts-on-signals-it-has.md` (APPROVE)

### Acceptance Criteria

| SC | Status | Code evidence | Test evidence (runs per PR) |
| --- | --- | --- | --- |
| SC-1 red log survives, green removed | ✅ | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1206` | `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:125` |
| SC-2 three fast-gate outcomes | ✅ | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1246` | `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:695` |
| SC-3 CI read once at Step 10 | ✅ | `skills/qa-task/SKILL.md:1198` | `shared/resources/tests/qa-ci-read.test.mjs:190` |
| SC-3a Bitbucket PR check over REST | ✅ | `skills/qa-task/SKILL.md:130` | `skills/qa-task/tests/qa-task.test.js:327` |
| SC-4 CONCERNS + open coverage → 5b | ✅ | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1525` | `evals/shared/tests/pr-review-loop-parity.test.mjs:788` |
| SC-4a qa-fix coverage priority row | ✅ | `skills/qa-fix/SKILL.md:475` | `evals/shared/tests/pr-review-loop-parity.test.mjs:955` |
| SC-4b resume re-enters 5b | ✅ | `shared/resources/develop-pipeline-resume-contract.md:555` | `evals/shared/tests/pr-review-loop-parity.test.mjs:1628` |
| SC-5 no CI wait | ✅ | `skills/qa-task/SKILL.md:1203` | `skills/qa-task/tests/qa-task.test.js:348` |
| SC-6 green gate, no base worktree | ✅ | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1241` | `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:282` |
| SC-7 ci:fast | ✅ | `package.json:25` | CI `test` SUCCESS @ `8ac7ffef` |
| SC-8 bundle:check | ✅ | `package.json:66` | CI `validate` SUCCESS @ `8ac7ffef` |
| SC-9 validate five skills | ✅ | `package.json:52` | CI `validate` SUCCESS @ `8ac7ffef` |
| **SC-10 every new guard mutation-proved, recorded in a commit message** | ❌ | commit messages `12dfb4b6`, `908d3713`, `8b7e8d1c` | see below |
| SC-11 CHANGELOG cites task 238 | ✅ | `CHANGELOG.md:9` | `evals/shared/tests/changelog-entry-drift.test.mjs` |
| SC-12 restatements updated | ✅ | `shared/resources/develop-pipeline-autonomous-defaults.md:34` | `evals/shared/tests/pr-review-loop-parity.test.mjs:371` |

#### SC-10 — executed, not just read

The AC agent found 11 new guards whose mutation proof no commit message records. `/finalise` ran each one in a scratch worktree at `8ac7ffef`. Each behaviour was reverted, the guard's test file run, and the tree restored. Baseline: all four files green (16 / 15 / 26 / 22).

| Guard | Revert | Result |
| --- | --- | --- |
| `qa-story.test.js` bitbucket PR check | `if [ "$VCS" = "bitbucket" ]` → `if false` | ✅ red |
| `qa-story.test.js` github PR check | → `if true` | ✅ red |
| `qa-story.test.js` CI read + no-wait | `sleep 5` added to the block | ✅ red |
| `qa-task.test.js` CI read + no-wait (SC-5) | `sleep 5` added to the block | ✅ red |
| `qa-loop-fast-gate-outcomes` SC-6 green gate | green arm deleted | ✅ red |
| `qa-loop-fast-gate-outcomes` old cleanup rule | rule re-added to step 3 | ✅ red |
| `qa-loop-fast-gate-outcomes` three-outcome wording | row renamed | ✅ red |
| `qa-loop-fast-gate-outcomes` usage — `FAST_GATE_BASE_TIMEOUT` check | check disabled | ✅ red |
| `qa-ci-read.test.mjs` never waits | `sleep 0` added | ✅ red |
| **`qa-ci-read.test.mjs` usage errors exit 2** | `--vcs` validation deleted | ❌ **stays green**: the test runs in `os.tmpdir()`, not a git checkout, so every case also exits 2 at `git rev-parse` (`qa-ci-read.sh:40`) |
| **`qa-loop-fast-gate-outcomes` usage — `--exit abc`** | `--exit` number check deleted | ❌ **stays green**: the case also exits 2 at "no such log: x" (`fast-gate-outcome.sh:41`) |

**Two guards are unheld.** The behaviour they name is correct today, but neither test can catch its removal. The fix is test-only: assert each usage case's own stderr message as well as exit 2. It was drafted and verified in the scratch worktree: green on `8ac7ffef`, prettier-clean. It is **not applied**, because Step 6 below routes to gaps.

### Documentation

- **CHANGELOG [Unreleased] entry**: ✅ PASS — `CHANGELOG.md:9`
- **Skill/README files updated**: ✅ PASS — `skills/develop-task/README.md:121`

**Agent summary:** 13 of 14 success criteria PASS with code and per-PR test evidence. SC-10 FAILs on the record: its 11 unrecorded guards were then executed, and 2 of them do not go red on revert.

---

## Step 3: Security Review

**Story Type:** task (infrastructure: CI and pipeline shell scripts, skill step docs)
**Overall Security Status:** ❌ FAIL — 3 probes reproduced (2 medium, 1 low)

### Checklist

- **No secrets in version control**: ✅ PASS — `shared/resources/qa-ci-read.sh:130` (the credential comes from `bitbucket-auth.sh`, never a literal)
- **TLS configured**: ✅ PASS — `shared/resources/qa-ci-read.sh:128`
- **Logs carry no PII or credentials**: ✅ PASS — `shared/resources/qa-ci-read.sh:133`
- **No hardcoded secrets introduced**: ✅ PASS
- **No new unsafe patterns**: ✅ PASS — `shared/resources/fast-gate-outcome.sh:120` (`exec node --test "${FILES[@]}"`, an array expansion with no eval). Advisory: the Bitbucket open-PR lookup puts the local branch name into a BBQL string without escaping `"` (`skills/qa-task/SKILL.md:139`, `skills/qa-story/SKILL.md:180`). `skills/develop-next/SKILL.md:238` already ships the same pattern.

### General Security

- **Security TODOs/FIXMEs**: ✅ PASS
- **Dependency risk**: ⚠️ NOT_APPLICABLE — no package changes

### Probe Results

**Candidates executed:** 28 — **reproduced:** 3 — escapes 0 — refusals 0

- `escape.log` (`test at ../../h.test.mjs:4:1`) — expected **rejected**, got **accepted** — **medium**. The gate log is the PR's own test output. A `../` path climbs out of `.worktrees/base-check-*` and runs the head checkout's copy, so a head-only failure is classed `pre-existing` and step 0a commits and pushes red. `fast-gate-outcome.sh:99` refuses only a leading `/`, which breaks the script's own "Repo-relative only" contract (`:94`).
- `escape-loc.log` (`location: '../../h.test.mjs:4:1'`) — expected **rejected**, got **accepted** — **medium**. The same hole through the reporter's `location:` form (`:96`).
- `r.md` with `category: "coverage"` (quoted) — expected **rejected** (counted open), got **accepted** (`OPEN_COVERAGE=0`) — **low**. The 5c awk (`develop-pipeline-step-5-6-qa-loop.md:1547`) matches only the bare scalar. It fails open to the pre-task behaviour, where `/finalise` still catches it. None of the repository's 489 `category:` lines is quoted.

Controls that held: `base-argument` (8/8, QA's bug.3 control, re-run), `pr-argument` (8/8, `qa-ci-read.sh --pr` guard), and the other 7 `open-coverage-check` cases.

- Probe run by /finalise from the security agent's plan — 4 control(s), record `docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.dod.1.security.run.json`

**Agent summary:** The infrastructure checklist passes. The deliverable is a boundary (fast-gate-outcome.sh calls `pre-existing` "narrow by construction"). Two of four controls held completely. The log-path control and one open-coverage spelling did not.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. The task changes pipeline prose and shell/Node tooling, with no personal data, payments, UI or health data. The only email-like string is a test-fixture git identity, `qa@example.invalid`.

**Agent summary:** No compliance areas apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:9`. Cites task 238 and all four behaviours.
- **API/type-specific docs**: ✅ PASS — `skills/qa-task/SKILL.md:1204`, `skills/qa-story/SKILL.md:1900`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1253`. Bundled copies regenerated. The catalog is unchanged because the SKILL.md hunks are body-only.
- **README / architecture docs**: ✅ PASS — `skills/develop-task/README.md:121`, `skills/develop-story/README.md:125`

**Agent summary:** All documentation checks pass.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (90/100, gate 3); 5c `/review-pr` APPROVE
- Acceptance Criteria: ❌ 13/14 — SC-10 FAIL
- PR Review & Tests: ✅ host requires no reviews; 5c report cited. CI reading 1: SUCCESS @ `8ac7ffef` (6 checks)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — 3 probes reproduced (2 medium, 1 low)
- Compliance Review: ⚠️ N/A

**Fix-and-recheck (Step 8a):** not applicable. Two sections are FAIL and two findings are medium. The evaluator's `severity-low` and `no-other-finding-open` preconditions cannot hold, so it was not run.

**Blocking Issues:**

1. Security (medium): `shared/resources/fast-gate-outcome.sh:99` accepts a `../` failing-test path from the gate log (`test at` form). The base run then executes the head checkout's copy and can class a head-only red as `pre-existing`.
2. Security (medium): the same hole through the `location: '…'` form (`fast-gate-outcome.sh:96`).
3. Security (low): the 5c open-coverage awk (`develop-pipeline-step-5-6-qa-loop.md:1547`) does not count `category: "coverage"` (quoted).
4. SC-10: `shared/resources/tests/qa-ci-read.test.mjs:397` "usage errors exit 2" does not go red when the `--vcs` validation is removed.
5. SC-10: the `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:632` usage test's `--exit abc` case does not go red when the `--exit` number check is removed.

**Outcome:**

- [ ] Refuse a failing-test path containing a `..` segment in `fast-gate-outcome.sh` (both log forms), with a test red on `8ac7ffef` (the DoD probe cases `log-path-dotdot-*` are the ready-made fixtures)
- [ ] Accept an optionally quoted `category:` value in the 5c open-coverage awk, plus a test case
- [ ] Assert each usage case's own stderr message in `qa-ci-read.test.mjs:397` and `qa-loop-fast-gate-outcomes.test.mjs:632`, then mutation-prove both (drop the validation → red)
- [ ] Record every SC-10 mutation proof in the fix commit's message (the 9 held guards above, plus these)

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-28T05:10Z
**Total Duration:** ~25 min
**CI reading 1:** SUCCESS @ `8ac7ffef9446354a0b86ec6941f7eb07d2a45ea1` over 6 checks (taken for the decision; no acceptance commit, so no reading 2)

**Blocking Issues Summary:**

1. Security (medium ×2): `fast-gate-outcome.sh` accepts `../` failing-test paths from the gate log (`test at` and `location:` forms)
2. Security (low): 5c open-coverage awk misses a quoted `category: "coverage"`
3. SC-10: two usage-error tests stay green with their validation removed (`qa-ci-read.test.mjs:397`, `qa-loop-fast-gate-outcomes.test.mjs:632` `--exit abc`)

**Estimated Effort to Close Gaps:** Small (1–2 hours). One script guard, one awk pattern, two test assertions, and their tests and mutation proofs.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ Probe record `task.238.dod.1.security.run.json` and cases files
- ✅ PR comment posted (see the implementation report's Decisions Log)

**Next Steps:**

- These gaps change code, so they re-enter QA (a `/qa-fix` cycle against this DoD, then a fresh gate) before `/finalise` re-runs
- Re-run `/finalise` after the fixes
