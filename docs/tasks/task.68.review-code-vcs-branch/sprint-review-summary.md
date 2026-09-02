# Sprint Review Summary — Task 68

**Task:** `/review-code` branches on TRACKER where it should branch on VCS
**Status:** ✅ Accepted — 2026-09-01
**PR:** [#294](https://github.com/Gamaroff/agent-skills/pull/294) → `develop`
**Roadmap item:** T68 (Phase 5 — Current frontier)

---

## Summary

`/review-code` decided how to post PR comments by asking which **tracker** held the issues. But a comment on a pull request is a property of where the **code** is hosted. In a repo that hosts code on Bitbucket and tracks work on GitHub or Jira — a combination the platform resolver exists to support — the skill took the `gh` path against a Bitbucket PR. `gh` cannot address one, so the comment never appeared and the run reported success. Nothing went red.

This fixes the branch key, replaces the arm it fell through to (which pointed at a step that does not exist), and gives the skill its first tests.

## What changed

- **The branch key**: `TRACKER=github` → `VCS=github`, with a `VCS=bitbucket` arm alongside it. The rule is now stated in `review-code` in `review-pr`'s exact words, and a contract test asserts the two skills state it **identically** — so rewording one fails until the other follows.
- **A real Bitbucket recipe**: the old arm said "mirror `/qa-story` step 6". `/qa-story` has no numbered Step 6 at all. The new arm names the credential resolver, the REST endpoint and the marker-based idempotency pattern, and points at `finalise` Step 7, which carries both platform arms and works.
- **First tests for the skill**: 12 contract tests, plus the `package.json` glob that makes them run — this repo hand-lists those globs, and a suite absent from the list runs nowhere.
- **A sweep**: all 64 `TRACKER=github` occurrences across 20 source files classified as PR-shaped or issue-shaped. `review-code` was the only wrong one. The 63 correct ones are recorded as deliberately kept.

## Impact

Bitbucket-hosted users get working PR comments from `/review-code`, where previously they silently got none. **No behaviour change for anyone on GitHub** — the two keys resolve identically there, which is exactly why the defect survived undetected.

## Testing & QA

| | |
|---|---|
| Suite | 2116 tests, 0 failures; prettier clean |
| New tests | 12 contract tests |
| Mutation reverts | **7**, all red — 5 by develop, 1 independent by QA, 1 of the QA fix itself |
| CI | SUCCESS, 4/4 jobs, verified on the final head |
| QA cycles | 2 — CONCERNS (90/100) → PASS (100/100) |
| DoD | 6/6 criteria met |

**What QA caught**: the new test file failed outside this repository. Two tests read sibling skills, and `tests/` ships in the packaged skill, so a standalone install failed 2 of 12 with `ENOENT`. Reproduced rather than inferred. Fixed by guarding the reads while keeping both assertions — and then verified three ways, because the obvious fix would have silently deleted the guard by skipping everywhere while leaving a green suite behind.

## Notes for the demo

The interesting part is not the one-line branch key — it is *why nothing was red*. Both the original defect and the defect QA found in its fix share one shape: **a check that reports success without having checked anything**. The `gh` comment that never posted; the test suite that would have crashed unseen; the skip-everywhere fix that would have looked green. Each is caught only by asking what the mechanism does when it *cannot* do its job.

## Known limitations

- The corrected Bitbucket path cannot be executed on this GitHub-hosted repo. Verified by inspection and pinned by contract tests; stated plainly rather than implied.
- Inline per-finding comments remain GitHub-only — the Bitbucket arm posts one summary. Follow-ups: **task 69** (Bitbucket PR-comment path for `/qa-story` and `/qa-task`), **task 70** (inline Bitbucket comments).
- `review-code`'s own fenced bash blocks are all classified `mutating` and never execute under the QA snippet engine. Verified pre-existing, not a regression from this work.
