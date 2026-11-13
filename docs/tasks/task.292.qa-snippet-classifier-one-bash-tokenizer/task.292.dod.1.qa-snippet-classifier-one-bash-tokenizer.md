# Definition of Done Verification

**Story/Task:** task.292 — One bash tokenizer for the QA snippet classifier
**Verification Started:** 2026-11-10T06:01Z

---

## Step 1: QA Report Review

**QA reports:** `task.292.qa.1`, `qa.2`, `qa.3`; **gate:** `task.292.gate.3…yml`
**Gate Status:** CONCERNS, 90/100. `top_issues` is empty; three pre-existing findings (T292-CR-1..3) sit in `recommendations.future`.
**PR review:** `task.292.pr-review.1…md`, verdict CONCERNS, no open coverage finding.
**PR:** #869 (source: branch)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ❌ FAIL (PARTIAL after the merge: #5, #6, #7, #10 fail; #11 deferred to CI)
**Re-run scope:** full (no-prior-record). AC record: `task.292.dod.1.ac.json`.

| Criterion | Status | Reason |
| --- | --- | --- |
| #1 CR/FF/VT/NBSP/U+2028 before `#` | ✅ PASS | engine :3096; tests :4775 |
| #2 task.290 gap rows and controls | ✅ PASS | tests :4542, :4563 |
| #3 `classifyBlock` never throws | ✅ PASS | `classifyFailClosed`; test :4590 |
| #4 differential ≥200000, 0 writes | ✅ PASS | QA 3 :126-138 (60000 arith + 6×30000) |
| #5 docs scan timing | ❌ FAIL (low) | 5-run median is in QA 1 :74, taken on `b708546f`; engine changed after (`code-changed`). Re-measure on head |
| #6 slice under 10 s | ❌ FAIL (low) | QA 1 :75 is on `b708546f`, no `uptime`; later figures are single runs. Re-measure, median of five, load recorded |
| #7 scans read `tokenize`; call-site test counts consumers | ❌ FAIL (low) | All scans reach `tokenize`. The test (:4653) counts `"#"` literals, not tokenize consumers. Checkbox unticked |
| #8 `\s` allowlist test | ✅ PASS | allowlist :4607; test :4628 |
| #9 recursive substitution scan fails a test | ✅ PASS | 20000-deep test :4950. Advisory: no committed revert run |
| #10 every change mutation-proven, red test named in the QA report | ❌ FAIL (medium) | No QA report records: recursive-scan revert (QA 1 :147 says not-run), classifyInternal blank-normalisation (QA 1 :144 says nothing red), the T292-QA-1 fix, or a per-migration revert (section 8) |
| #11 lint and prettier | ⏳ DEFERRED-CI | prettier passes locally on the four `.mjs`; CI decides |
| #12 CHANGELOG and `bundle:check` | ✅ PASS | `CHANGELOG.md:9`; `bundle:check` 129 skills, 0 problems |
| #13 0 newly runnable | ✅ PASS | QA 3 :128 (3446 blocks, 0 newly runnable) |

**Documentation:** ✅ `shared/resources/qa-runnable-prose-detection.md` and its generated copies updated.

---

## Step 3: Security Review

**Overall Security Status:** 🔍 NEEDS_MANUAL_REVIEW
**Boundary:** true (sink `shell-exec`, entry `qa-execute-snippets.mjs#isRunnableBlock`).
The agent ran no checklist items (all `NOT_APPLICABLE`, "not run in this pass") and returned a probe plan.
**Probe run by /finalise:** NOT RUN. The decision is already GAPS, so the plan was held until the gaps are closed (a code change in #7/#10 invalidates the run anyway). The latest probe record is QA 3's: 31 executed, 0 escaped (`task.292.qa.3.security.run.json`). It is not this DoD's evidence.
**Pre-existing, deferred:** T292-CR-1..3 (indirect evaluation). No `deferrals.json` exists, so none is rendered as deferred.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. Internal QA tooling; no PII, payment, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS
- CHANGELOG: `CHANGELOG.md:9` cites `(task 292)`.
- Type-specific docs: shared resource and generated copies updated; no `SKILL.md` frontmatter changed, so no catalog regeneration.
- README and architecture docs: not applicable (two maintainer npm scripts, no public change).

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED

**Summary:**

- QA Gate: CONCERNS 90/100 (not blocking)
- Acceptance criteria: 8 of 13 pass, 4 fail, 1 deferred to CI
- Security: probe plan not run (held; see Step 3)
- Compliance: not applicable
- Docs: pass
- CI reading 1: not taken; the decision is already GAPS

**Outcome:**

- [ ] #10: Mutation-prove each uncovered change and name the red test in a QA report: the substitution scan made recursive, the `classifyInternal` blank normalisation, the T292-QA-1 fix (`$[` and `<<` in `(( ))`), and a revert of each scan migration (`maskSubstitutions`, `collapseQuotedSpans`, `stripProse`, `stripNonCode`, `cutJoins`, the prose-pass join).
- [ ] #7: Make the call-site test count tokenizer consumers (not only `"#"` literals), then tick the criterion and the dead-code and call-site-count boxes.
- [ ] #5: Re-measure the docs scan against `develop` on the head: median of five alternating runs, `uptime` beside each, recorded in a QA report.
- [ ] #6: Re-measure the fixed-seed slice on the head: median of five, `uptime` recorded, in a QA report.
- [ ] Re-run the security probe plan after the fixes and record the count.

Changing the test (#7) and the mutation proofs (#10) is a code change, so it re-enters QA (`/qa-task`, then `/qa-fix` where it finds more) before `/finalise` re-runs. #5 and #6 are measurements recorded in documents.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-10T06:12Z
**Total Duration:** 11 minutes
