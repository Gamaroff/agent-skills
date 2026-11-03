# Definition of Done Verification

**Story/Task:** task.255 — security-probe: a cli: fixture setup cannot reach the host gh
**Verification Started:** 2026-11-03T17:40Z

---

## Verification Results

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.255.qa.1.probe-engine-cli-setup-gh-isolation.md`
**Gate File Found:** `task.255.gate.1.probe-engine-cli-setup-gh-isolation.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Immediate Actions from QA:** None
**Future Actions from QA:** CR-1 (share the setup-PATH build with `caseShellEnv`), CR-2 (re-wrap one doc paragraph) — both advisory, recorded in the gate's `recommendations.future`
**PR Review (5c):** `task.255.pr-review.1.probe-engine-cli-setup-gh-isolation.md` — CONCERNS, 0 open coverage findings. PC-1 (`pr_number` missing) is cleared by this run's Step 7; PC-2 was fixed in the review.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (11 of 12 from the agent; #8 graded from CI reading 1 below)
**PR Status:** OPEN (PR #821, source: branch)
**PR Review Decision:** none required by the host — the newest `*.pr-review.*.md` (verdict CONCERNS, 0 open coverage findings) stands in, per Step 6
**Re-run scope:** full (no-prior-record) — 12 re-judged, 0 carried

### Acceptance Criteria

#### #1: a `cli:` setup reaching `gh` by a scan-missed spelling declines `needs-fake-gh`; host `gh` never runs
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:2154`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8872`

#### #2: a git-only `cli:` setup still runs and the case is scored
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:2972`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8894`

#### #3: the `cli:` entry's PATH is unchanged
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:2970`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8910`

#### #4: `runCaseSetup` still called by both arms
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:2978`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8774`

#### #5: a `cli:` run with no `--fixture-setup` writes no `bin/gh` and spawns no extra process
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:1991`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8784`

#### #6: `ghFreePath` called at most once per case, before the setup spawn
**Status:** ✅ PASS
- Code evidence: `shared/resources/security-probe.mjs:2972`
- Record: QA report Findings table (`task.255.qa.1.*.md:74`)

#### #7: `command node --test shared/resources/tests/security-probe.test.mjs` passes
**Status:** ✅ PASS
- Evidence: QA report records 290 pass, 0 fail (`task.255.qa.1.*.md:75`, `:159`)
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8872`

#### #8: `npm test` passes
**Status:** see "CI-state criteria" below (deferred by the agent; graded from CI reading 1)

#### #9: each of the three guard mutations turns a test red
**Status:** ✅ PASS
- Evidence: `task.255.qa.1.*.md:132-136` — M1, M2, M3 each with a red test and a `mutation-proven:` line, all restored byte-identical (`:142`)

#### #10: `CHANGELOG.md` records the change and cites task 255
**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:52`

#### #11: `probe-boundary-rule.md` states the run-time guard and its inherited limits
**Status:** ✅ PASS
- Evidence: `shared/resources/probe-boundary-rule.md:559`

#### #12: `npm run bundle:check` reports 0 problems
**Status:** ✅ PASS
- Evidence: `task.255.qa.1.*.md:160` — 0 problems across 128 skills

### Advisory (not a gap)

- **#9**: M0 (original code) and M4 were dev-only and were not re-run by QA. Neither is among the three criterion-named mutations.
- **#8**: the QA dev run saw one local failure, a CI-only guard reporting `zsh` missing on this laptop. `test.yml` installs zsh for CI.
- **#11**: CR-2 flags one over-wide paragraph at `probe-boundary-rule.md:565`. The content satisfies the criterion.

### Documentation

- **README / skill files updated where behaviour changed**: ✅ PASS — `shared/resources/probe-boundary-rule.md:559` and its qa-story / qa-task bundled copies

**Agent summary:** 11 of 12 criteria PASS with code and test or committed-record evidence; #8 was deferred to the CI reading.

---

## Step 3: Security Review

**Story Type:** task (infrastructure — probe-engine sandbox isolation)
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced
**Status:** ✅ PASS — `shared/resources/security-probe.mjs:1991`

### No new unsafe patterns (eval/exec/shell.run)
**Status:** ✅ PASS — the diff widens an existing guard condition (`cliSetupGuarded`) and builds a setup-only env copy

### Host `gh` not reachable from a `cli:` `--fixture-setup`
**Status:** ✅ PASS — `shared/resources/security-probe.mjs:1992`. Inspection by the agent; the probe run below is the execution evidence.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS (changed lines only)
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is not in the change set

### Probe Results

**Boundary decision:** the security agent classified this as `boundary: true` (criteria signal `never`; the task's criteria say the host marker `gh` is "never executed"). **This disagrees with the QA gate's `boundary: false`**, whose reason is that no caller-supplied value is classified. The finalise run follows the stricter reading and probed.

**Candidates executed:** 1 — **reproduced:** 0 — **escapes:** 0 — **refusals:** 0

| Control | Fixture setup | Result |
| --- | --- | --- |
| split-name spelling | `setup-gh-split.sh` | declined `needs-fake-gh` (trip-wire fired — the guard working as designed) |
| printf-built name | `setup-gh-printf.sh` | declined `needs-fake-gh` (same) |
| PATH-stripping setup | `setup-gh-unshadowed.sh` | executed 1 legitimate case, accepted; the entry's own PATH carried no harness directory |

✅ **The boundary held** — nothing reproduced and nothing escaped.

**Read this honestly:** the plan carries legitimate-direction cases only, so the engine's verdict per control is `unverifiable` (`no-hostile-evidence`) and `totals.executed` is 1, not 3. The two declines are the trip-wire stopping the setup before any case ran, which is the behaviour the task delivers. They are not executions and are not counted as such. The zero-guard does not fire (executed > 0). The hostile-direction evidence for the guard is the behavioural tests at `security-probe.test.mjs:8867-8934` (split-name, command-substitution, git-only, entry-PATH, trip-wire stepped around), each mutation-proven in the QA report.

- Probe run by `/finalise` from the security agent's plan — 3 controls, record `task.255.dod.1.security.run.json`

**Agent summary:** boundary: true; three probe controls planned; inspection checks PASS.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE (internal developer-tooling change; no user data, payments, UI or PHI)

**Agent summary:** GDPR, PCI-DSS, WCAG and HIPAA are all not applicable.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated
**Status:** ✅ PASS — `CHANGELOG.md:52` cites (task 255)

### API/type-specific docs updated
**Status:** ✅ PASS — `shared/resources/probe-boundary-rule.md` and its synced copies

### README / architecture docs updated
**Status:** ⚠️ NOT_APPLICABLE — internal hardening, no public API, command or config change

**Agent summary:** CHANGELOG entry present; the rule doc and its bundled copies are updated.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**CI reading 1:** SUCCESS @ `ff0eefe991e7` over 6 checks (`test`, `validate`, `link-check`, `shellcheck`, `secret-scan`, branch-source check), taken after waiting out the `test` lane (it read `PENDING` at first and was not rounded up).

**CI-state criteria:** #8 → PASS (CI reading 1 SUCCESS @ `ff0eefe991e7`) — AC_OVERALL re-folded: PASS

**Summary:**

- QA Report: ✅ PASS (100/100), 1 cycle, 0 top issues
- PR Review (5c): ✅ CONCERNS with 0 open coverage findings (PC-1 cleared by this run, PC-2 fixed)
- Acceptance Criteria: ✅ 12/12 (#8 graded from CI)
- Documentation: ✅ CHANGELOG cites task 255; rule doc and bundled copies updated
- Security Review: ✅ boundary held (1 executed, 0 reproduced, 0 escapes); 2 controls declined `needs-fake-gh` as designed
- Compliance Review: ⚠️ NOT_APPLICABLE

**Deviations and honest notes:**

1. The security agent classified the deliverable as a boundary (criteria signal `never`), against the QA gate's `boundary: false`. Finalise followed the stricter reading and ran the probe plan itself.
2. The plan's cases are all legitimate-direction, so each control's verdict is `unverifiable` (`no-hostile-evidence`). Two of the three declined at the trip-wire, so `executed` is 1. The hostile-direction evidence is the mutation-proven behavioural tests, not this run.
3. Advisory, not fixed here: CR-1 (share the setup-PATH build with `caseShellEnv`) and CR-2 (re-wrap one paragraph), both in the gate's `recommendations.future`.

**Outcome:** Task meets all Definition of Done criteria.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-03T18:05Z
**CI reading 1:** SUCCESS @ `ff0eefe991e7` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- ✅ Task registry row ticked
- Outward side-effects (PR canonical comment, tracker comment and close, board move) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
