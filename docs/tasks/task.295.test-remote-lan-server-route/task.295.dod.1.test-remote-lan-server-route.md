# Definition of Done Verification

**Story/Task:** task.295 Run the test suite on the LAN server (test:remote)
**Verification Started:** 2026-11-10T16:26Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports:** 5 (`task.295.qa.1` to `qa.5`). **Gates:** 5 (`task.295.gate.1` to `gate.5`).
**Latest gate:** CONCERNS 85/100 (`task.295.gate.5.test-remote-lan-server-route.yml`). The implementation report's QA Cycle entries record the loop's exit at its 5-gate budget, then the Step 5c review (`task.295.pr-review.1.test-remote-lan-server-route.md`, CONCERNS, conformance lens only, no open coverage finding).
**Open gate items:** none at `severity: high`; the open recommendations are advisory (deferred SIGTERM trap, 9999-minute cap, touch chaining not held by a test, per-run lock).
**PR:** #872 (source: branch). Review decision: none required; the Step 5c report stands in for it.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (re-folded after CI reading 1 graded #8 to #10)
**CI-state criteria:** #8 → PASS, #9 → PASS, #10 → PASS (CI reading 1: SUCCESS, tree-equivalent to `13486822061f` @ `77fd0b51b78d`) — AC_OVERALL re-folded: PASS
**PR Status:** OPEN (PR #872)
**Re-run scope:** full (no-prior-record) — 12 re-judged, 0 carried

This is the second AC pass. The first found three low evidence gaps (#1 laptop process observation, #2 deliberate red run, #6 `.249` uptime in the QA report) and was discarded; the evidence was then produced by real runs and committed (QA report 5, "Acceptance runs"). The AC record is `task.295.dod.1.ac.json`.

| Criterion | Status | Evidence |
| --- | --- | --- |
| #1 `test:remote` on a clean tree runs `ci:fast` on .249, exits 0, no local test process | ✅ PASS | qa.5 Green 2 at `13486822`: exit 0, 8362 pass, 0 fail; 38 laptop process samples show only `ssh` and its `timeout` wrapper. Test `tests/test-remote-runner.test.js:228` |
| #2 A red run is red | ✅ PASS | qa.5 Red row: one assertion changed in a throwaway clone, exit 1, the failing test named in the output. Green 1 is a second red: the spawn-budget guard caught a real defect |
| #3 `--run 'x;y'` exits 2 before any ssh | ✅ PASS | `scripts/remote-test/run.sh:48`, test `:135` |
| #4 Unreachable host exits non-zero, names `TEST_LOCAL=1`, no local run | ✅ PASS | `run.sh:100`, test `:186` |
| #5 zsh and awk variants run on the server | ✅ PASS | qa.5 Green 2: 87 `PASS ... zsh` lines, no skip notice |
| #6 `uptime` on both hosts before and after | ✅ PASS | qa.5 load table: three runs, both hosts, before and after |
| #7 `--cpu-shares 128`, verified by `docker inspect` | ✅ PASS | `run.sh:207`, test `:249`, qa.1 `CpuShares=128 User=1000:1000` |
| #8 lint:shell, format:check, guard under `CI=true` | ✅ PASS | graded from CI reading 1 (shellcheck lane SUCCESS; guard green in qa.5 Green 2) |
| #9 `ci:fast` green on the final tree | ✅ PASS | graded from CI reading 1, tree-equivalent to `13486822`; local evidence is qa.5 Green 2 |
| #10 shellcheck clean via lint:shell | ✅ PASS | graded from CI reading 1 (shellcheck lane SUCCESS) |
| #11 Contributor doc exists, `AGENTS.md` carries the line | ✅ PASS | `AGENTS.md:232`, `docs/contributing/testing-remote.md` |
| #12 No existing script's behaviour changed; one added `package.json` line | ✅ PASS | `package.json:28`, diff is 1 insertion, 0 deletions |

**Advisory (not a gap):** the AGENTS.md addition is a heading plus one paragraph, a minor deviation from "one line".

### Documentation

- Contributor doc, README index entry and `AGENTS.md` section: ✅ PASS (`docs/contributing/testing-remote.md:1`).

**Deviation recorded, not hidden:** the first full `ci:fast` run on the final tree came during `/finalise`, after the QA loop had spent its five gates, and found a real defect: `tests/test-remote-runner.test.js` hardcoded `timeout: 5000`, which `tests/test-harness-concurrency.test.js` rejects. It was fixed in `13486822` (the timeout now comes from the shared spawn budget), proved by reverting the change locally (the guard goes red) and by a green full run on `.249`. It was verified inline here, not by a further QA cycle or an independent reviewer. The fix touched one file inside the task's Files Summary, and the other DoD sections were not affected by it.

---

## Step 3: Security Review

**Story Type:** task (infrastructure). **Overall Security Status:** ✅ PASS

- No secrets in version control: ✅ PASS (`scripts/remote-test/run.sh:25`; `.env` and `.secrets/` are excluded from the sync, `run.sh:166`).
- TLS: ⚠️ NOT_APPLICABLE (ssh with `BatchMode=yes`; no HTTP endpoint).
- Logs carry no PII: ✅ PASS (`run.sh:43`).
- No hardcoded secrets introduced: ✅ PASS (`container.sh:1`).
- No new unsafe patterns: ✅ PASS (`run.sh:207`): no `eval`; only validated names, a slug-and-hash directory, a hex image tag and a numeric timeout reach the remote shell.
- General: no security TODOs; no dependency added (`package.json:28` adds only the script).

### Probe Results

`boundary: true` (the `--run` and `--host` validators feed a remote shell command). The security agent planned 18 cases over two entries; `/finalise` ran the plan.

**Candidates executed:** 34 — **reproduced:** 0. ✅ **The boundary held** — every candidate returned its expected verdict. Probe run by `/finalise` from the security agent's plan, 2 controls, record `task.295.dod.1.security.run.json`; the plan was extracted from the agent's transcript (6802 bytes, sha256 `a1ec4ee5…b6c7`), not hand-copied.

### Recommendations for the owner

These are not security findings and do not count against the verdict.

- **Spec challenge:** a `--run` name that is valid but is not a script in `package.json` (for example `x`) is allowed by the task's grammar and fails only on the server at `npm run`. Fail-closed and harmless; the owner may want a check against `package.json` scripts.
- **Spec challenge:** `--run` names `.` and `..` match the grammar. They are passed to `npm run` as an argument, not a path, so there is no traversal; a stricter grammar would exclude them.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. Developer tooling: no personal data (GDPR), payments (PCI-DSS), UI (WCAG) or health data (HIPAA).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG: ✅ PASS (`CHANGELOG.md:68`, under `[Unreleased]` → Added, cites task 295; committed hunk only, the foreign uncommitted lines in the working tree are not part of it).
- Task docs: ✅ PASS (`docs/contributing/testing-remote.md:1`, `docs/contributing/README.md:14`, `AGENTS.md:232`).
- README / architecture docs: ⚠️ NOT_APPLICABLE (internal developer tooling).

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA: gate 5 CONCERNS 85/100 (no high item open); Step 5c PR review CONCERNS, no open coverage finding
- Acceptance Criteria: ✅ 12/12 (three graded from CI reading 1)
- Documentation: ✅ PASS; Security: ✅ PASS (34 probes, 0 reproduced); Compliance: not applicable
- CI reading 1: SUCCESS (tree-equivalent to `13486822061f`) @ `77fd0b51b78d`

**Outcome:** Meets the Definition of Done. One deviation is recorded under Step 2: a real defect found by the first full run on the final tree, fixed and proved inline in `13486822`.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-10T17:06Z
**Total Duration:** 40 minutes
**CI reading 1:** SUCCESS (tree-equivalent to `13486822061f`) @ `77fd0b51b78d` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment, tracker comment and close, board move) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment and in the implementation report, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
