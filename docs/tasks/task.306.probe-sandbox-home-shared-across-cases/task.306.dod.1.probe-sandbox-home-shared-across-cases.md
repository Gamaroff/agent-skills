# Definition of Done Verification

**Story/Task:** task.306 — Probe sandbox HOME shared across cases
**Verification Started:** 2026-11-13T15:47Z

---

## Step 1: QA Report Review ✅

**QA reports:** `task.306.qa.1…md`, `task.306.qa.2…md`. **Gates:** `task.306.gate.1…yml` (PASS 95), `task.306.gate.2…yml` (PASS 95, `top_issues: []`).
**PR:** #900 (source: frontmatter `pr_number`). **PR review:** `task.306.pr-review.2…md`, APPROVE, 0 findings (decision on the host is `null`: no review required).
**Re-run scope:** full (no prior AC record).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ❌ FAIL (one criterion, #6, not met as written)
**PR Status:** OPEN (PR #900)

| ID | Criterion (short) | Status | Evidence |
| --- | --- | --- | --- |
| #1 | Legitimate `take`-style case, 0 escapes, bash and zsh | ✅ PASS | `shared/resources/security-probe.mjs:2647`; tests `security-probe.test.mjs:6721`, `:6742`, `:6829` |
| #2 | Hostile write under its `HOME` still reported | ✅ PASS | `security-probe.mjs:2662`; test `:6779`, amended fence test `:5150` |
| #3 | Write outside HOME and work dir still an escape | ✅ PASS | `security-probe.mjs:2693`; test `:6804` |
| #4 | No existing test assertion changed, bar the shared-HOME one | ✅ PASS | only the fence test (`:5150`), named in `qa.1` |
| #5 | task.296 plan, `take` legitimate: 0 reproduced, 0 escaped | ✅ PASS (graded after the agent's FAIL: the run did not exist when it answered) | `task.306.qa.2…md` § "Figures recorded at /finalise": 32 executed, 0 reproduced, 0 escaped |
| #6 | Probe suite wall time at most 1.10 times prior median, 5 runs, `uptime` beside each | ❌ **FAIL** | `qa.2` § "Figures recorded": medians 180.7 s and 221.1 s, ratio **1.22**; paired-ratio median 1.07; CPU ratio 1.016 |
| #7 | `npm run bundle:check` passes | ✅ PASS | CI reading 1: `validate` SUCCESS on `af00fbdf` |
| #8 | `CI=true` suite green | ✅ PASS | CI reading 1: `test` SUCCESS on `af00fbdf` |
| #9 | Coding-standards validation commands | ✅ PASS | `qa.1` line 72; CI `validate`, `shellcheck`, `link-check` SUCCESS |
| #10 | `CHANGELOG.md` cites task 306 | ✅ PASS | `CHANGELOG.md:9` |
| #11 | Traps entry rewritten to match | ✅ PASS | `docs/contributing/traps.md:299` |
| #12 | Phase 4 list in the QA report, each hit excluded with reason | ✅ PASS | `qa.1` line 77 |

**CI reading 1:** SUCCESS @ `af00fbdfa075` (all six checks).
**CI-state criteria:** #7, #8 → PASS (graded from CI reading 1).

**Why #6 fails.** The criterion asks for a wall-time ratio of medians. It was first met on a CPU-time substitute (recorded as a deviation in the implementation report). This run measured wall time on the LAN server, interleaved, five runs each: the ratio of medians is 1.22. The host is shared and its load ran from 2 to 20 across the runs, which is wider than the effect; the paired ratios (0.99, 1.22, 1.12, 1.04, 1.07; median 1.07) and the CPU ratio (1.016) point to no real slowdown. None of that is the measure the criterion names, and the criterion text was not changed. Nothing here is graded as met.

---

## Step 3: Security Review

**Overall Security Status:** ✅ PASS
`boundary: false`. The criteria classifier fired on one phrase ("refuses", task document line 215), which describes the fixture script, not a function this change adds. The engine is a probe harness. No secrets, no `eval`/`exec`, no network, no dependency change; per-run HOME and TMPDIR come from `mkdtemp` under the case directory (`security-probe.mjs:2650`). No probe plan was run for the boundary rule.

### Probe Results

_Probe mode did not fire — the deliverable is not a boundary._

**Separate check (criterion #5):** the task.296 plan re-run, 32 executed, 0 reproduced, 0 escaped (see Step 2).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — internal dev tooling, no user data, UI, payments or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — `CHANGELOG.md:9` cites task 306; `docs/contributing/traps.md:299` rewritten.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA gates: ✅ PASS (95, 95); PR review APPROVE
- Acceptance criteria: ❌ 11 of 12 met; #6 not met as written
- CI: ✅ SUCCESS on `af00fbdf`
- Security: ✅ PASS. Compliance: n/a. Docs: ✅ PASS

**Outcome:**

- [ ] Criterion #6: the wall-time ratio of medians is 1.22 against a bound of 1.10. Re-measure on a quiet host (five interleaved runs each, `uptime` beside each), or the owner amends or waives the bound. Evidence for both readings is in `task.306.qa.2…md` § "Figures recorded at /finalise".

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-13T16:03Z
**Total Duration:** 16 minutes
**CI reading 1:** SUCCESS @ `af00fbdfa075` (Step 6)

**Deviations recorded, not hidden:**

1. The four DoD agents ran as Explore subagents; the AC agent could not grade #5 (the run did not exist yet), so the main context ran the task.296 plan and graded #5 itself from the recorded figure.
2. The #5 and #6 figures were written into `qa.2` (staged, not yet committed) after the agents returned.

**Next Steps:**

- Decide #6: re-measure on a quiet host, or amend or waive the bound (owner decision; the criterion text must not be reworded by the pipeline).
- The change is documentation only; re-run `/finalise` after that.
