# QA Report: Task 206 - Hierarchical story ids in the pipeline

**Task**: [task.206.hierarchical-story-ids-in-pipeline.md](./task.206.hierarchical-story-ids-in-pipeline.md)
**Gate File**: [task.206.gate.1.hierarchical-story-ids-in-pipeline.yml](./task.206.gate.1.hierarchical-story-ids-in-pipeline.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline cycle 1)
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered: the 11 code sites and the story-pipeline blocks read ids through
`doc-id.js`, the fixtures are migrated, and the full fast gate is green (5752 tests, 0 failures).
The independent diff review found four medium, high-confidence bugs. Three are executable blocks
that read a value only another block binds, so each fails silently when run as its own shell. The
fourth is a regression: `bug-doc.js` now rejects a story bug whose slug starts with a digit.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (15/15 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG `[Unreleased]`, task § 5)
- [x] Code on feature branch with open PR (#677, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, executed-prose, eval replay)
- [x] Performance Testing (wall-time comparison)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (independent Explore reviewer)

### Review Methodology

Parallel agents, because the task spans four phases and many modules. One read-only Explore code
reviewer ran over the branch diff against `origin/develop`. The diff left out the generated
`skills/*/references/*` copies and the renamed `evals/develop-story/step-isolation/*/replay/*`
fixtures, which are byte copies or mechanical renames. It came to 6134 lines; the reviewer reported
"77 files in the diff". The reviewer ran 234.9 s (`duration_ms` from its completion notice). Direct
tools were used for everything else.

The QA engineer is the same pipeline session that implemented the task. The code review is the
independent pass in this cycle.

Step 4b ran over 8 changed runnable-prose files. Every new task.206 block is classified `mutating`
or `placeholder` by `qa-execute-snippets.mjs`, because each reads repository files. The new suite
`evals/shared/tests/step-0-epic-resolution.test.mjs` executes those blocks instead (9 cases, bash;
zsh is not installed on this host). There are two engine execution failures in `create-branch`, at
lines 337 and 367. Both are unchanged blocks (`git status`, `git rev-parse`), and both fail because
the engine's temp copy is not a git repository. They are an environment artefact, not a finding.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Shared code consumers | CONCERNS | Verified | finalise-fix-and-recheck, doc-links test, create-story lib OK; bug-doc digit-slug regression (CR-4) |
| Phase 2: Selectors and handoff | PASS | Verified | continuation, uat-status, select-next; CR-9 advisory |
| Phase 3: Executable snippets and prose | CONCERNS | Verified | Step 0/0a/create-branch/create-story blocks executed by tests; CR-1, CR-2, CR-5, CR-8 |
| Phase 4: Fixtures, tests, bundle | PASS | Verified | 9 trees migrated by script (logs in implementation report), 3 create-story fixtures by hand; bundle:check 0 problems |

**Overall Phase Completion**: 2/4 PASS, 2/4 CONCERNS

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Step 0 / 0a extract (P, E, S) via doc-id; `story.1.2.3.x.md` → P=1 E=2 S=3 | `step-0-epic-resolution.test.mjs` (Step 0 and 0a cases) | PASS |
| Step 0 HALTs on zero and on 2+ matches, never `head -1` | same suite (zero / two-documents cases) | PASS |
| uat-status lists `1.2.3`, reports an unparseable story | `uat-status.test.mjs` "scanStories reads story.P.E.S…" (stderr only — CR-9) | PASS |
| `isCoLocatedArtifact` refuses `story.1.2.4.*` for `story.1.2.3` | `finalise-fix-and-recheck.test.mjs` task-206 case; QA mutation covered | PASS |
| continuation writes `story.1.2.3.handoff.k.slug.md`, never resolves 1.2.30 | `continuation.test.js` task-206 cases | PASS |
| select-next keys `## Epic 1.2` / `deps: Epic 1.2`; legacy `## Epic 2` errors | `select-next.test.mjs` task-206 cases; QA mutation covered | PASS |
| bug-doc resolves `story.1.2.3A.bug.1.x.md` to `story.1.2.3A` | `sync-jira-bug.test.js` sub-story case | PASS (digit-led slug regressed — CR-4) |
| create-story allocates S via `doc-id next story`; `assertUniqueStoryId` HALTs | `create-story.test.js`, allocation block test | CONCERNS (first-story ENOENT — CR-5) |
| `npm test` wall within 10% | 115.7 s → 117.2 s (+1.3%), measured on the working tree before the Step 3 commits | PASS |
| `eval:all` scenario count unchanged | 44 → 44 | PASS |
| No § 3 code site declares a story/epic id regex | population grep: remaining hits are comments, messages and `doc-id.parse` calls; `select-next` `epicRef` keeps a roadmap-heading token pattern and `uat-status` `storyIds` a dotted-token collector, both validated by doc-id (stated in the Implementation Record) | PASS |
| `npm test`, `eval:all`, `bundle:check`, `lint:shell`, `validate:all` pass | exit 0 each | PASS |
| Every Phase 1–2 site mutation-proved | 12 dev proofs (implementation report) + 2 QA spot checks | PASS |
| Fixtures renamed by migrate-doc-numbering, log cited | implementation report Step 3 | PASS |
| CHANGELOG states the four breaking changes and the order | CHANGELOG `[Unreleased]` | PASS |
| configuration.md documents `{p}` and the refusal | `docs/reference/configuration.md:257` | PASS |

---

## Breaking Changes Validation

| Breaking change | Documented | Migration path | Consumer code updated |
| --- | --- | --- | --- |
| Story / branch names | Yes | migrate-doc-numbering, then upgrade | Yes |
| `branchPattern` `{p}` | Yes | add `{p}` to the configured pattern | Yes |
| `qa-next` `epicSurface` keys | Yes | rename keys; old keys reported | Yes |
| Roadmap `Epic P.E` | Yes | rewrite headings; leftover is a selector error | Yes |

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (4)

- **CR-1**: [task.206.bug.1](./task.206.bug.1.sync-github-story-edit-block-reads-unbound-story-id.md). The sync-github-story edit block reads an unbound `STORY_ID`.
- **CR-2** (with CR-3): [task.206.bug.2](./task.206.bug.2.ensure-story-milestone-and-dedup-read-unbound-values.md). The ensure-story milestone, create and dedup blocks read unbound values.
- **CR-4**: [task.206.bug.3](./task.206.bug.3.story-bug-with-digit-led-slug-no-longer-resolves.md). bug-doc rejects a digit-led story-bug slug. This is a regression: the base regex accepted it.
- **CR-5**: [task.206.bug.4](./task.206.bug.4.create-story-uniqueness-check-throws-on-first-story.md). create-story's uniqueness check throws for an epic's first story.

### LOW Severity Issues (1 gated, 5 advisory)

- **CR-8** (gated): the 0a.3 auto-skip reads `STORY_STEM`, which only 0a.2 binds.
- Advisory: CR-6 (story-bug name writers), CR-7 (sub-story label), CR-9 (stderr-only warnings),
  CR-10 (pipefail), CR-11 and CR-12 (cleanups).

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 1 gated

---

## NFR Assessment

### Performance — PASS
`npm test` +1.3% against base; `eval:all` scenarios 44 → 44.

### Reliability — CONCERNS
The unbound cross-block reads (CR-1, CR-2, CR-3, CR-8) each fall into a plausible wrong result:
an empty title, no milestone, a wrong dedup hit, or a skip that never fires. The Step 0 epic listing
guard checks `sort`'s exit, not the filter's (CR-10).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 40
- `isWorkItemDocument` was probed with the `path` corpus (11), the `filename` corpus (14) and 15
  targeted cases: four legitimate controls, plus NUL, LF, `..`, outside `docs/`, QA/DoD artifacts,
  a legacy `story.5.1`, a leading zero, `.yml`, a PRD and a digit-led slug. Verdict `engages`, 0
  reproduced. Record: `task.206.qa.1.security.run.json`.

### Maintainability — PASS
One id definition now serves 11 sites. Each site has a named test and a mutation proof.

---

## Code Review

**Correctness bugs (10):**

- [medium/high] `skills/sync-github-story/SKILL.md:190` — The Step 5b edit block reads `STORY_ID`, bound only in Step 3's block. → Re-derive it in the block. → **gate TASK-206-CR-1**
- [medium/high] `skills/ensure-story-github-issue/SKILL.md:178` — The milestone and create blocks read `MILESTONE_TITLE`, bound only in Step S1. → Bind it per block. → **gate TASK-206-CR-2**
- [medium/medium] `skills/ensure-story-github-issue/SKILL.md:77` — The dedup block reads an unbound `STORY_ID` and can link an unrelated issue. → Bind it and HALT on empty. (folded into bug.2)
- [medium/high] `shared/resources/bug-doc.js:111` — A digit-led story-bug slug resolves as `unknown`. → Read the remainder with the bug-slug rule. → **gate TASK-206-CR-4**
- [medium/high] `skills/create-story/SKILL.md:342` — `readdirSync` throws for a missing `stories/` directory. → Treat it as empty. → **gate TASK-206-CR-5**
- [medium/medium] `skills/create-bug-report/SKILL.md:30` — Still writes story bugs as `story.{epic}.{story}.bug`, which bug-doc now rejects. → Enumerate every story-bug name writer.
- [medium/medium] `skills/review-story/SKILL.md:673` — The label fallback drops the sub-story letter. → Build it from `STORY_STEM`.
- [low/high] `shared/resources/review-pipeline-step-0a-branch-setup.md:127` — The 0a.3 block reads `STORY_STEM` without binding it. → Re-derive it. → **gate TASK-206-CR-8**
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:270` — Warnings go to stderr only, so they never reach `--check` or `--coverage` output. → Fold them into both.
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:71` — The `||` guard checks `sort`, not the node filter. → Use `pipefail`.

**Cleanups (2):**

- `shared/resources/bug-doc.js:156` — The warning still names `story.{e}.{s}.bug`. → Name P.E.S.
- `skills/create-story/scripts/lib.js:112` — `scanExistingStoryIds` counts artifacts while `nextStoryId` does not. → Use one population.

Anchors: `finding-anchors.js --rev HEAD` returned `ok` or `unchecked-text` for all 12 findings, with
no malformed anchor. CR-4 provenance: the base `RE_STORY_BUG` (`.+` capture) accepted the digit-led
slug, so the defect is new to this change.

Boundary: `boundary: true` for `finalise-fix-and-recheck.mjs#isWorkItemDocument`, probed above
(`probes_executed: 40`). `bug-doc.js#resolveBugMode` is a classifier, and its digit-slug defect is
CR-4.

Mutation spot checks (QA, snapshot and restore):

mutation-proven: `isCoLocatedArtifact` prefix without the trailing dot → `isCoLocatedArtifact keys on the doc-id story id…` (and the task.152 artifactPaths test) → covered
mutation-proven: `select-next` legacy-heading error branch disabled → `a legacy ## Epic 8 heading … are model ERRORS` → covered

---

## Regression Testing

The full `npm test` (5752 tests) and `eval:all` (44 scenarios) are green. The develop-story,
create-story and develop-next replays all ran on the renamed fixtures. One regression was found
outside the suite: CR-4.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                 # 5752 tests, 0 failures
npm run eval:all                # exit 0
npm run bundle:check            # 0 problems
npm run lint:shell; npm run validate:all; npm run check:generated   # exit 0
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <8 changed files> --json
node .agents/skills/qa-task/references/security-probe.mjs --sink path|filename|--cases-file … --entry 'shared/resources/finalise-fix-and-recheck.mjs#isWorkItemDocument'
node .agents/skills/qa-task/references/finding-anchors.js --rev HEAD …
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1, CR-2 (with CR-3), CR-4, CR-5 and CR-8, each pinned by an executed-block or unit test.

### Short-term Actions (Non-Blocking)
1. CR-6, CR-7, CR-9, CR-10, CR-11 and CR-12. Cheap enough to fold into the same fix cycle.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding, but four medium high-confidence bugs map to the gate under
`code_review_blocking`, and reliability is CONCERNS.
**Quality Score**: 60/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the gated findings fixed and re-reviewed.

---

**Next Steps**: `/qa-fix` (cycle 1), then QA cycle 2, a full refute pass.
