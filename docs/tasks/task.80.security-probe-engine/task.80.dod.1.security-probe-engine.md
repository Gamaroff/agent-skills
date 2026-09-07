# Definition of Done Verification

**Task:** task.80 — Make a security probe runnable without widening the snippet allow-list
**Verification Started:** 2026-09-07
**Status:** COMPLETED - ACCEPTED

---

## Step 1: QA Report Review ✅

**QA reports:** `task.80.qa.{1,2,3}.security-probe-engine.md`
**Gate files:** `task.80.gate.{1,2,3}.security-probe-engine.yml`
**PR conformance review:** `task.80.pr-review.1.security-probe-engine.md`

**Final gate:** ✅ **PASS** — `task.80.gate.3.security-probe-engine.yml`, quality score **100/100**, `top_issues: []`

**Prior-run acceptance blocks in the document body:** 0. This is run 1; nothing is inherited.

| Cycle | Gate | Score | Findings |
| --- | --- | --- | --- |
| 1 | CONCERNS | 60/100 | 0 HIGH, 4 MEDIUM, 1 LOW |
| 2 | CONCERNS | 80/100 | 0 HIGH, 2 MEDIUM (new, from the refute pass), 1 LOW |
| 3 | **PASS** | **100/100** | **none** |

Six findings raised, six closed. None carried forward, none waived, no bug reports warranted (nothing reached HIGH).

**NFR validation (gate 3):** Security PASS · Performance PASS · Reliability PASS (upgraded from CONCERNS) · Maintainability PASS

**Step 5c `/review-pr`:** ⚠️ CONCERNS — advisory and non-blocking by contract. 0 code findings; 3 conformance findings, all documentation currency. **Both medium findings were fixed before this step ran** rather than carried into the merge.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (#337) — `feature/task.80.security-probe-engine` → `develop`
**PR Review Decision:** no formal GitHub review exists (single-maintainer repo). The pipeline's own gates stand in its place and are recorded above: QA gate PASS, plus an independent Step 5c conformance review.

### Success Criteria — 11/11, each traced to a named test

**Functional**

| Criterion | Evidence |
| --- | --- |
| `runProbeSpec` returns a verdict the engine computed | `computeVerdict` exported; no caller-supplied verdict field on the input shape |
| Zero executed cases → `unverifiable`; declined ≠ zero count | `security-probe.test.mjs` — "zero cases — never engages", "a non-importable entry is DECLINED, not reported as executed: 0" |
| Probes run contained: minimal env, temp cwd, escape sentinel, budgeted timeout | `sandboxEnv()`, `snapshotTree()` sentinel, `spawnBudget("PROBE")` |
| `probe-boundary-rule.md` records the refusal and the v1 limits | 222 lines; §2 the refusal, §5 the limits |

**Regression**

| Criterion | Evidence |
| --- | --- |
| Classifier behaviourally unchanged | `qa-execute-snippets.test.mjs` — "QA-1…QA-17 classify exactly as they did before the extraction"; 98/98 |
| `bug.3` replay routes still classify as they did | `snippet-classifier-fail-open-replay.test.mjs` 8/8 |
| `npm run ci` green | `ci:fast` 2570/0 locally; **CI rollup SUCCESS** — see below |

**Safety** — all four verified by execution, not inspection (detail in the Security section)

### CI Status — the gate that is checked, not assumed

**`CI_ROLLUP` = ✅ SUCCESS**, on head `9ab45cba9457`, which **matches local HEAD exactly** — so this is a green on the commit being accepted, not on an ancestor.

| Job | Result |
| --- | --- |
| `test` | ✅ SUCCESS |
| `validate` | ✅ SUCCESS |
| `link-check` | ✅ SUCCESS |
| `shellcheck` | ✅ SUCCESS |
| `PR into main comes from an allowed branch` | ✅ SUCCESS |

The first sample read `PENDING` (`test` was `IN_PROGRESS`). **Finalise waited rather than assuming** — per the gate's own rule, `PENDING` is non-acceptance and waiting is the correct action. The rollup was re-polled to completion.

---

## Step 3: Security Review

**Story type:** infrastructure / security-boundary
**Overall Security Status:** ✅ PASS

This task **is** a security boundary, so the review is weighted accordingly rather than run as a formality.

| Check | Status | Evidence |
| --- | --- | --- |
| No interpreter on the snippet allow-list | ✅ PASS | 13 names probed against `SAFE_COMMANDS` — all absent |
| Entry path outside the repo root rejected **before** import | ✅ PASS | Proved with a fixture whose *module top level* writes a sentinel; the sentinel file was never created |
| Inputs never reach a shell as text | ✅ PASS | `RUNNER` is a fixed string; inputs cross as JSON on stdin. Injection input → clean rejection, no artifact |
| Zero cases → `unverifiable`, never a pass | ✅ PASS | Verdict **and** exit code 1 |
| `declined` its own state | ✅ PASS | Populated on all four decline paths while `executed` stays 0 |
| Per-case timeout from the shared budget | ✅ PASS | `spawnBudget("PROBE")` at the CLI **and** API boundaries (the API half was the cycle-2 finding) |
| Extraction behaviour-preserving | ✅ PASS | 98 snippet tests + 8-route `bug.3` replay |
| No hardcoded credentials | ✅ PASS | `sandboxEnv()` is a six-key allow-list; no parent token reaches a child |
| No network access | ✅ PASS | 0 network calls in the engine |

### Probe Results

**boundary: true** — the deliverable is a boundary (a containment check plus a fail-closed classifier), so probe mode fired.

**Candidates executed: 39 — reproduced: 1**

- `entry.url-file` — input `file:///etc/passwd#x`, expected the entry check to **reject**, actual **accepted**.

**Analysis — this is a LOW-severity misclassification, not a containment escape, and the criterion holds.**

`isAbsolute("file:///etc/passwd")` is `false` (it does not begin with `/`), so the string is resolved *relative to the repo root* and becomes `<root>/file:/etc/passwd`. That path **is** inside the root, so the containment check is answering its own question correctly: it admitted nothing outside the root. Verified end-to-end — the path does not exist, the import fails, and the run returns `unverifiable` / `entry-not-probeable` with `executed: 0`. **`/etc/passwd` was never read.**

The defect is that a `file://` URL is silently reinterpreted as a relative path and then reported as *"entry not probeable"* — a confusing decline where `bad-entry` would be the honest answer. It cannot leak, because the reinterpretation lands inside the root by construction.

Recorded as a **non-blocking follow-up**, not a DoD gap: §9 criterion 2 is *"an entry path outside the repo root is rejected before import"*, and no such path was admitted.

> Worth noting what this demonstrates: probe mode found something three QA cycles did not, by enumerating the boundary's input space rather than re-testing the inputs a previous cycle happened to name. That is the argument for task.80 existing, made against task.80's own deliverable.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none.

GDPR (no personal data), PCI-DSS (no payment path), WCAG (no UI), HIPAA (no health data). This is internal QA/CI tooling that processes markdown and module exports.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

| Item | Status | Evidence |
| --- | --- | --- |
| Required deliverable documentation | ✅ PASS | `shared/resources/probe-boundary-rule.md`, 222 lines — the task's own §4 deliverable, not an afterthought |
| CHANGELOG updated | ✅ PASS | Three `### Added` entries (engine, extraction, boundary rule) |
| Task document current | ✅ PASS | Files-Actually-Landed table refreshed at Step 5c (PC-2); Implementation Record and both QA Fix Cycle sections present |
| PR description current | ✅ PASS | Refreshed at Step 5c (PC-1) to name the two out-of-scope changes |
| Bundled copies in sync | ✅ PASS | `npm run bundle` a clean no-op; pre-commit hook re-ran it on every commit |

---

## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Column | Result |
| --- | --- |
| All Success Criteria Met | ✅ 11/11 |
| Tests & PR | ✅ 2570 tests / 0 failures; PR open, pipeline gates stand for review |
| **CI green** | ✅ **SUCCESS** on the accepted head |
| Documentation | ✅ PASS |
| Security | ✅ PASS |
| Compliance | ⚠️ NOT_APPLICABLE (counts as pass) |
| QA Gate | ✅ PASS (100/100) |

No section returned `NEEDS_MANUAL_REVIEW`.

### Outstanding follow-ups — recorded, not blocking

1. **No linked tracker issue.** Flagged Important by the Step 2 review and carried unactioned through all three QA cycles, because creating a remote issue is consent-gated and this run is autonomous. Not a DoD failure on any criterion — no criterion requires it. **Run `/sync-github-task` to close it.**
2. **`file://` entry misclassification** (LOW) — see the probe analysis above.
3. `runProbeSpec` falls back to the budget on an unparseable `timeoutMs` rather than reporting it. Deliberate and documented; revisit with real usage.
4. The exit-after-write guard is proximity-based (`LOOKBACK_CHARS = 1200`). Not this task's defect.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-07

**Artifacts Generated:**

- ✅ Task document updated with the DoD PASSED section
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted
- ⏭️ Tracker issue close — **skipped, no issue linked** (`github_issue` absent from frontmatter)
- ⏭️ Project board `done` move — **skipped, same reason**. Neither is a failure; there is no card to move.

**Next Steps:**

- Task is ready for Sprint Review and for merge.
- Link the tracker issue with `/sync-github-task` when convenient.
