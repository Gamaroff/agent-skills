# Sprint Review Summary - Pause commits cancel the step 7 CI poll

**Story/Task ID:** task.308
**Completed Date:** 2026-11-14
**Completed By:** Lorien Gamaroff (pipeline run)
**Pull Request:** [#907](https://github.com/Gamaroff/agent-skills/pull/907)
**Issue:** [#906](https://github.com/Gamaroff/agent-skills/issues/906)

---

## Summary

A pause during a develop pipeline's step 7 no longer pushes, so it stops cancelling the CI run `/finalise` is waiting on. `/finalise` also stops reading the acceptance head from local `HEAD`, which a held pause commit makes wrong.

---

## What Was Delivered

### Success Criteria Met

- [x] A step 7 pause commits the report and leaves the remote head unchanged (scenario 17h, mutation-proved)
- [x] A step 5 pause still pushes (scenario 17g, moved from step 7)
- [x] A step 8 pause is still held (scenario 17f)
- [x] Every step 7 exit pushes the held commit (scenario 17i)
- [x] The later turn of the 6c CI poll reads the acceptance head from a recorded file, not local `HEAD` (three tests, mutation-proved)
- [x] The Phase 1 table of SHA sources, with a disposition for each, is in the task document

### Key Features Implemented

- **Step 7 hold**: the PreCompact hook holds its push at steps 7 and 8 (`PUSH_HOLD_REASON` `step7` / `step8`).
- **Recorded acceptance head**: `/finalise` 6c writes `.claude/state/finalise-ci-head-2.txt` before the poll starts. The later turn reads it and HALTs when it is missing.
- **Carrier wording**: the docs and signals name the real carrier of a held step 7 pause: `/finalise`'s own commit for a pause before 6a, Step 8's commit for a pause during the CI wait.

---

## Technical Details

### Files Modified/Created

- `shared/resources/develop-pipeline-on-precompact.sh` - the step 7 hold arm, messages and report-lint note
- `shared/resources/develop-pipeline-on-precompact.test.sh` - scenarios 17g (moved), 17h, 17i
- `skills/finalise/SKILL.md` - the 6c recorded-head writer and reader
- `evals/shared/tests/finalise-publish-boundary.test.mjs` - reader and writer tests
- `shared/resources/develop-pipeline-hooks.md`, `shared/resources/develop-pipeline-pause.md`, `CHANGELOG.md`, and the regenerated bundled copies

### Architecture/Design Decisions

Option (a), hold at `7|8`, over option (b), which keys on the free-text `waiting_on` label and misses a pause between two polls. Reasons are in the task's Phase 1 record.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none. A held pause commit reaches the remote with the next commit instead of at once.

---

## Testing & Quality Assurance

- **Tests:** 40 hook scenarios; 3 recorded-head tests; fast gate 8178 ok, 0 not ok
- **QA:** 2 gates (CONCERNS 80, then PASS 100); 2 bugs found and closed
- **PR review:** APPROVE, 0 findings. CI green (6 checks).

---

## Security & Compliance

- **Security:** no secrets or unsafe patterns. The 6c recorded-head guard was judged a boundary by the security agent; the probe engine cannot reach it, and the owner recorded an override with by-hand test evidence (see the DoD file).
- **Compliance:** not applicable (internal pipeline tooling).

---

## Documentation

- [x] `develop-pipeline-pause.md` and `develop-pipeline-hooks.md` updated
- [x] `CHANGELOG.md` cites `(task 308)`

---

## Demo Notes

1. Run `bash shared/resources/develop-pipeline-on-precompact.test.sh`: scenarios 17f–17i show step 5 pushing and steps 7 and 8 held.
2. Run `command node --test evals/shared/tests/finalise-publish-boundary.test.mjs`: the recorded-head tests run the shipped 6c lines.

---

## Impact & Value

### Technical Impact

A pause no longer costs a cancelled CI run at step 7. On the consumer run that raised this (tinker-city bug.144) the cancelled run was about an hour of CI.

---

## Known Limitations & Future Work

- Scenario 17i models the next commit as a plain commit and push; it does not drive `/finalise`.
- Advisory cleanups: pin the writer's position in its test; remove the head file beside the result and pid files in 6c.
- Out of scope, candidate follow-up from task.303: the template `ci-ok` aggregator's handling of cancelled jobs.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
