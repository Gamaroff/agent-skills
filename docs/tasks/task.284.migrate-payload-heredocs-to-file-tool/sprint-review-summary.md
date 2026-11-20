# Sprint Review Summary - Migrate shipped payload heredocs to the file tool

**Story/Task ID:** task.284
**Completed Date:** 2026-11-20
**Completed By:** Claude (develop-next pipeline)
**Pull Request:** [#923](https://github.com/Gamaroff/agent-skills/pull/923)

---

## Summary

Shipped skill prose no longer writes a tracker or PR payload with a heredoc. Each site now writes its body with the file tool and posts it with `--body-file` or `--findings-file`, and the ratchet that guarded the old sites has an empty allowlist.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The ratchet allowlist is empty and its test fails on any added payload heredoc (mutation-proven).
- [x] Every changed block that `qa-execute-snippets.mjs` classes as runnable still runs clean (criterion narrowed and approved by the repository owner).
- [x] `CI=true npm test` wall time is within 10% of `develop`: median 618,157 ms against 618,433 ms (−0.04%), five alternating runs per tree with the load recorded.
- [x] `bundle:check` reports 0 problems and `quick_validate` passes for the 26 changed skills.
- [x] `CHANGELOG.md` `[Unreleased]` cites (task 284).
- [x] Each remaining `--body-file` site cites the fresh-body-post recipe or is listed as excluded with a reason.

### Key Features Implemented

- **31 payload heredocs migrated** to the file tool across 26 skills and shared step documents.
- **Fresh-body-post recipe** cited at the posting sites, so a stale body file cannot be posted.
- **Single-use body file** in `tracker-comment.js`: the file is removed once the comment is posted.
- **Create-issue pre-flight** halts on a missing, empty or foreign body file (found by QA, fixed in this PR).

---

## Technical Details

### Files Modified/Created

- `skills/*/SKILL.md` and `shared/resources/*.md` - payload blocks rewritten (26 skills)
- `shared/resources/tracker-comment.js` - single-use body file
- `shared/resources/tests/payload-heredoc-ratchet.test.mjs` - allowlist emptied
- `CHANGELOG.md` - entry citing task 284
- Generated bundle copies under `skills/*/references/`

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Tests:** CI-parity gate on the LAN server green; PR CI green on the head.
- **QA:** five cycles, gate PASS 100/100 on cycle 5. Four bugs found and closed, including a wrong `review-code` citation I wrote in cycle 4.
- **PR review:** `/review-pr` verdict APPROVE.

---

## Security & Compliance

- **Security:** PASS. The create-issue pre-flight was probed with 18 cases; none reproduced. One owner recommendation: the freshness check is a substring match.
- **Compliance:** not applicable.

---

## Known Limitations & Future Work

- Advisory follow-ups: reword the stale comment above `CONSUMING_REASONS` in `tracker-comment.js`; state in the contract that a kept body file relies on the pre-post assertion; `review-pr` Step 8, `qa-task`, `qa-story` and `qa-fix` say "write with the file tool" over `mktemp` blocks (on `develop` already).

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
