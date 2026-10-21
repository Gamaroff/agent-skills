# Sprint Review Summary - finalise gaps path: true gap count, lock held at Step 7

**Story/Task ID:** task.222
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#718](https://github.com/Gamaroff/agent-skills/pull/718)

---

## Summary

Two `/finalise` gaps-path defects are fixed. The `dod-gaps` lead now counts each gap once, as one list item under the current section's `### Missing Criteria` (obs #24). The develop pipeline lock now stays at Step 7 on a gaps outcome, so a gaps halt resumes at `/finalise` instead of reading Step 7 as done (obs #79).

---

## What Was Delivered

### Success Criteria Met

- [x] `dod-gap-count.sh` returns 2 / 3 / 1 / 7 for the task.213, task.181, task.199 and Step 8.4 example shapes (was 4 / 5 / 3 / 8)
- [x] Step 8.5's lead for a two-gap report reads "(2 of them)"
- [x] `advance-pipeline-lock.sh --skill finalise --dod <path>` moves 7 → 8 only on `**Final Status:** ✅ ACCEPTED`; every other case holds at 7, exit 0
- [x] Bug-mode DoDs: filled `accepted` advances, filled `gaps` holds
- [x] The develop-* orchestrators and the Stop hook read Step 7's outcome before any advance to 8
- [x] `npm test` wall time rises by +3.05 s (0.84%, bound 2%); CI green; bundle, validate ×4 and shellcheck clean

### Key Features Implemented

- **One gap-count definition** (`shared/resources/dod-gap-count.sh`): reads only the current `## Definition of Done - Gaps Identified` section, tracks CommonMark fences, and counts top-level items under `### Missing Criteria`. `--body` prints the same section, so Step 8.5's lead and body cannot disagree.
- **Lock held on gaps** (`advance-pipeline-lock.sh --dod`): fails closed on a missing, empty, unfilled or gaps DoD.
- **Status-first Step 7 transition**: the develop-task, develop-story and develop-bug Step Transition Protocols, and the Stop hook's lock-7 text, advance to 8 only on `accepted`. The Stop hook marks ✅ only after Step 7's tail and Completion Checklist pass.

---

## Technical Details

### Files Modified/Created

- `shared/resources/dod-gap-count.sh` (new): the counter and section reader
- `shared/resources/advance-pipeline-lock.sh`: the `--dod` guard
- `shared/resources/develop-pipeline-on-stop.sh`: the NEXT=7 branch
- `skills/finalise/SKILL.md`: Steps 8.4 and 8.5 and the cooperation block
- `skills/develop-{task,story,bug}/SKILL.md` and the shared step docs: the status-first exception
- `shared/resources/tests/finalise-gaps-path.test.mjs` (new), plus additions to `finalise-bug-mode.test.mjs`, `step-8-completion-checklist.test.mjs` and `develop-pipeline-on-stop.test.sh`

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** `advance-pipeline-lock.sh --skill finalise` now needs `--dod <path>` to advance. Older finalise copies hold at 7 until reinstalled (CHANGELOG).

---

## Testing & Quality Assurance

- **QA cycles:** 4 (CONCERNS 80 ×3 → PASS 100); 12 findings fixed, each mutation-proven; QA-222-13 (low) deferred
- **PR conformance review (5c):** APPROVE
- **Fast gate:** 6141 pass on .249 (1 environmental npm 9 failure); CI `test` SUCCESS

## Security & Compliance

- **Security:** PASS. The boundary is internal and recorded (`advance-pipeline-lock.sh#--dod` reads only finalise's own DoD summary).
- **Compliance:** not applicable (internal tooling)

## Known Limitations / Future Work

- QA-222-13: `dod-gap-count.sh --body` prints the marker `S` for a gaps section with no lines. This is masked in Step 8.5, because the count call HALTs first.
- Step 8.3's Change Log gap count is still composed by the agent (out of scope, § 4).
