# QA Report: Task 198 - Skill reference and discoverability docs (cycle 2)

**Task**: [Link to task document](./task.198.skill-reference-and-discoverability-docs.md)
**Gate File**: [task.198.gate.2.skill-reference-and-discoverability-docs.yml](./task.198.gate.2.skill-reference-and-discoverability-docs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 was a refute pass over the whole branch diff. Six of gate 1's seven findings are fixed. The seventh (QA1-CR-6) was fixed only in part: the rewritten B.3 body left its heading saying "auto". The refute pass also found two claims the original change carried and cycle 1 missed:

- qa-next's README credits `/qa-next` with writing the Automated-by cell, which it never does.
- `create-story` is described as letting the platform resolver pick the tracker, when the user picks.

Mechanical checks are unchanged and clean.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate 1 finding | Status | Evidence at `b47f076e` |
| --- | --- | --- |
| QA1-CR-1 overview.md resolve-platform paragraph | ✅ FIXED | Names the sourcing skills; the source-only grep is quoted from platform-detection.md. Residual advisory on finalise wording (below) |
| QA1-CR-2 overview.md table row | ✅ FIXED | "the platform-aware skills source" |
| QA1-CR-3 review-story README Step 10a | ✅ FIXED | Matches `SKILL.md:2456` |
| QA1-CR-4 review-task README Step 9a | ✅ FIXED | Matches `SKILL.md:1981` |
| QA1-CR-5 jira-publish.md caller list | ✅ FIXED | review-epic added (`review-epic/SKILL.md:850`) |
| QA1-CR-6 story-development.md B.3 | ⚠️ PARTIAL | Body fixed. The heading still says "auto" (QA2-CR-2), and "chosen by the platform resolver" is wrong for create-story (QA2-CR-3) |
| QA1-CR-7 create-epic rows | ✅ FIXED | Both rows name `ensure-epic-github-issue` / `sync-jira-epic` |

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer running the cycle-2 refute directive. Its brief was to start with the cycle-1 fixes, then re-read the whole diff and its combination. The diff has no code, so the claim fact-check prompt from cycle 1 was reused with the refute directive appended. The reviewer was dispatched at 05:12:45Z and returned at 05:18:00Z (295,494 ms by the completion notice).

```
Re-review scope: whole branch diff (cycle 2 refute pass) — origin/develop...HEAD, 623-line patch excluding docs/tasks and .agents/plans
```

Step 4b: not applicable. The change contains no runnable prose.

---

## New Findings This Cycle

- **[medium]** `skills/qa-next/README.md:43`: `/qa-next` is said to update the Automated-by cell with `--automated`. `skills/qa-next/SKILL.md:237` only prints that hand-off, and the skill writes with `--items` and `--set` → say who runs `uat-status.mjs --automated`.
- **[medium]** `docs/runbooks/story-development.md:130`: the B.3 heading says "auto". Its body and `create-story/SKILL.md:38,48` say opt-in → rename the heading.
- **[low]** `docs/runbooks/story-development.md:283` (also `:132`, `docs/concepts/architecture.md:120`): "picked by the platform resolver" is false for create-story, which asks the user (`SKILL.md:443-458`) → say the user picks and the resolver recommends.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| SC-1 | PASS | 27/27; each finding has a Resolved line |
| SC-2 | CONCERNS | qa-next README still states a writer that does not exist (QA2-CR-1) |
| SC-3 | PASS | The new grep is the platform-detection.md command. The reviewer re-ran it: 22 files |
| SC-5 | PASS | prettier clean at `b47f076e` |
| SC-6 | PASS | markdown-link-check clean; new anchor `#skills-migrated-to-the-helper` ok |
| SC-7 | PASS | validate ✓ review-story, review-task |
| SC-8 | PASS | Audit report OVERVIEW-20 resolution notes the narrowed claim |
| SC-9 | PASS | Map unchanged since the cycle-1 render |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1 (all three in `top_issues[]`)

---

## NFR Assessment

All four axes: PASS. Security evidence is `reasoned` with 0 probes executed; there is no boundary in the change.

---

## Code Review

boundary: false. The change is documentation only, with no predicate, script or runnable prose.

**Correctness bugs (4):**

- [medium/high] `skills/qa-next/README.md:43`: promoted as QA2-CR-1.
- [medium/high] `docs/runbooks/story-development.md:130`: promoted as QA2-CR-2.
- [low/high] `docs/runbooks/story-development.md:283`: promoted as QA2-CR-3.
- [low/medium] `docs/concepts/overview.md:127`: says finalise reads the caller-resolved TRACKER. finalise has no resolver source line and says "resolver already sourced above" (`SKILL.md:2094`). That is a gap in finalise itself. Not promoted (medium confidence); routed to `recommendations.future`.

**Cleanups (2):**

- `docs/concepts/architecture.md:113`: `CE --> EGH` is drawn unconditionally, with no `sync-jira-epic` edge.
- `CHANGELOG.md:11`: the entry says 16 docs but names 15 (architecture.md is missing).

QA re-read each contradicting source:

- `qa-next/SKILL.md:237`, which is the only `--automated` mention.
- `create-story/SKILL.md:443-458`, the AskUserQuestion.
- finalise: 0 resolver source lines, `:2094`.

---

## Regression Testing

`npm run ci:fast` at `b47f076e` (the cycle-1 5b fast gate, same tree): 5969 tests, 5955 pass, 0 fail.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL. Conditions: QA2-CR-1 to QA2-CR-3 fixed.
**Next Steps**: `/qa-fix` on gate 2.
