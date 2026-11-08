# Implementation Report: finalise names its preconditions and standalone routes

**Task**: `task.272.finalise-names-its-preconditions-and-standalone-routes.md`
**Run Number**: 1
**Started**: 2026-11-08 00:00
**Status**: In Progress

---

## Summary

Add a preconditions preflight to `/finalise` and a defined standalone/post-merge bug route (obs #38, #40).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml)                                           |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.272.*` exists in git                              | Branch created at `ff5f54c9` (plain `git checkout -b`, pushed; /create-branch skill not invoked — no prompts needed) | —                    | 2026-11-08T00:00Z |
| 2. review-task             | ✅ Done | `task.272.review.{N}.{name}.md` exists (or skip logged)                | Review 8/10, READY TO IMPLEMENT; 4 important + 2 optional fixes applied; status → ready-for-development; report `task.272.review.1.*.md` | —                    | 2026-11-08T00:00Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan exists). Resolver `linked-issue` rung; `finalise-preconditions.js` engine; Step 0b preflight; 7.7 QA-Verification verdict fallback; 6a post-merge docs branch. Full `CI=true npm test` 8101 pass / 0 fail; bundle `--check` 0 problems | —                    | 2026-11-08T00:00Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.272.qa.{N}.*.md`; `task.272.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.272.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-08

- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- qa-planning gate: skipped (auto — no prompt)
- Plan Phase 1 owner decision answered by the user before dispatch: post-merge bug acceptance commit goes on a docs-only branch off `develop` with a PR (recorded in the plan).

---

### Step 3 — develop — 2026-11-08

- Step 1 used a plain `git checkout -b`; Step 2's pre-pass was done in-line, so **independent review did not run**; Step 3 ran in-line because a plan exists.
- `FINALISE_BASE_BRANCH` was dropped: nothing binds it, and `tests/unbound-default-reads.test.js` rightly refuses a default with no writer. The post-merge base set is `develop|main|master`; any other trunk name finalises on a non-base branch.
- `security-probe.test.mjs` now passes `--fake-gh` for `resolve-pr-number.sh`, which names `gh` since the linked-issue rung.
- The post-merge route HALTs `post-merge-docs-pr` after pushing the docs branch; opening that PR is left to the operator (outward-facing).
- Mutation proofs: resolver rung (4 tests), engine (5), 7.7 fallback, 6a route guard, 6a HALT, base-branch case — each reverted behaviour turned a test red.

## Issues Log

| Step | Issue | Resolution |
| ---- | ----- | ---------- |
| 3 | `finalise-bug-mode` skip-table key test and `unbound-default-reads` and `security-probe` uniform-decline tests went red on the change | Added the `preconditions` key to the expected map; removed the unbound env default; added `--fake-gh` |
| 3 | New test left bare-origin temp dirs | Removed at exit; 98 earlier leftovers cleared |

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
