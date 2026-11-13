# Definition of Done Verification

**Story/Task:** task.306 — Probe sandbox HOME shared across cases
**Verification Started:** 2026-11-13T16:20Z

---

## Step 0: Why this run is scoped

Run 1 (`task.306.dod.1…md`, historical) found one gap: criterion 6. The owner amended that criterion to "the median of five interleaved paired ratios" and approved it (task Change Log, 2026-11-13). Nothing else moved: no code, test or other document changed since run 1 except this task's own records. This run therefore carries run 1's agent verdicts for #1–#5 and #7–#12 and the security, compliance and docs sections, and re-judges criterion 6 only. The four agents were not dispatched again.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (12 of 12)
**PR Status:** OPEN (PR #900). Review report `task.306.pr-review.2…md`: APPROVE.
**Re-run scope:** carried from run 1, criterion 6 re-judged.

| ID | Status | Note |
| --- | --- | --- |
| #1–#5 | ✅ PASS | carried from run 1; #5 evidence is `task.306.qa.2…md` § "Figures recorded at /finalise" (32 executed, 0 reproduced, 0 escaped) |
| #6 | ✅ PASS (as amended) | median of the five paired ratios 1.07 (0.99, 1.22, 1.12, 1.04, 1.07), at most 1.10; table with load before every run in `qa.2` § "Figures recorded at /finalise". The unamended reading (ratio of medians 1.22) is recorded there too |
| #7–#12 | ✅ PASS | carried from run 1; #7 and #8 from CI reading 1 |

**CI reading 1:** SUCCESS @ `af00fbdfa075` (all six checks). The commits after it are documentation only.

---

## Step 3: Security Review

✅ PASS (carried): `boundary: false`, no probe plan run. The task.296 plan re-run is recorded under #5.

## Step 4: Compliance Review

⚠️ NOT_APPLICABLE (carried).

## Step 4b: Docs & Changelog

✅ PASS (carried): `CHANGELOG.md:9` cites task 306; `docs/contributing/traps.md:299`.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA gates PASS (95, 95); PR review APPROVE
- Acceptance criteria 12 of 12
- CI SUCCESS; security PASS; docs PASS; compliance n/a

**Outcome:** Task meets the Definition of Done.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-13T16:25Z
**Total Duration:** 5 minutes
**CI reading 1:** SUCCESS @ `af00fbdfa075` (the acceptance decision)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report

**Deviations recorded, not hidden:**

1. This run did not re-dispatch the four DoD agents; it carried run 1's verdicts and re-judged criterion 6 alone, because only that criterion's text changed. Independent review of the amended bound did not run: the owner approved it.
2. Criterion 6 was amended at /finalise on the owner's instruction after the unamended measure read 1.22 on a loaded shared host. The pipeline did not reword it.
3. The success-criteria checkboxes in the task document were not ticked.

**Artifacts Generated:**

- ✅ Task document updated (DoD section, Change Log, `status: accepted`)
- ✅ Sprint Review summary created
- Outward side-effects (PR comment) fire after this file is committed and pushed.
