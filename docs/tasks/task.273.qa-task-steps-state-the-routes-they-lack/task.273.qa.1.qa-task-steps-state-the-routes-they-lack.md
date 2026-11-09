# QA Report: Task 273 - qa-task steps state the routes they lack

**Task**: [Link to task document](./task.273.qa-task-steps-state-the-routes-they-lack.md)
**Gate File**: [task.273.gate.1.qa-task-steps-state-the-routes-they-lack.yml](./task.273.gate.1.qa-task-steps-state-the-routes-they-lack.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

All five routes (obs #64, #74, #78, #116, #125) are stated in `qa-task` and `qa-story`, with the shared sources and the new docs-only prompt bundled. Each route fires on its fixture and not on its control. The full suite passes at the same speed as `develop` (+0.6 percent). One MEDIUM finding: no CHANGELOG entry cites task 273.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (add the CHANGELOG entry)

---

## Testing Scope

### Review Methodology

Direct tools, one read-only Explore reviewer for the diff. First review, so the whole branch diff was reviewed.

Diff review: code review (the change set holds one code path, `evals/shared/tests/finding-anchors-callers.test.mjs`, so it takes the code route). Step 4b: not applicable beyond the executed-prose tests the fast gate already runs; the change set adds no new fenced bash block.

CI on 30da588c5c12: green

### Testing Approach

- [x] Automated Testing (`CI=true npm test`, 160 s, exit 0)
- [x] Performance Testing (five alternating runs)
- [x] Regression Testing (`bundle --check`, `quick_validate.py`)
- [x] Code Review

---

## New Findings This Cycle

First review: not applicable.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: overlap and scratch rules | PASS | Verified | `qa-task` and `qa-story` Step 3c rule, `mutation-proving.md` rule 7, scratch bullet in `code-review-prompt.md` |
| Phase 2: docs-only branch and reproduced route | PASS | Verified | `qa-docs-only-review-prompt.md`, Step 3b item 2, item 5d |
| Phase 3: vacuous criterion | PASS | Verified | Probe paragraph in both QA skills, `review-task` check 30, `create-task` bullet |
| Phase 4: fixtures, bundle | PASS | Verified | See below |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Five routes present, each citing its observation | present in both skills | present (obs #266 and #64, #74, #78, #116, #125) | PASS | grep per skill; `5d` and the probe paragraph appear in `qa-task` and `qa-story` |
| Each fires on its fixture and not on its control | per route | see the fixtures table | PASS | |
| Docs-only prompt returns the same YAML shape | same shape | an Explore run over a Markdown-only diff returned a `code_review:` block with `reviewed`, `findings: []`, `truncated_count: 0` | PASS | |
| `npm test` wall time within 10 percent of develop | median of five alternating runs | develop 161, 161, 162, 163, 171 s (median 162); head 161, 162, 163, 167, 169 s (median 163); +0.6 percent | PASS | load average 0.5 to 1.6 at start; each run exit 0 |
| `bundle --check` 0 problems; `npm test` passes | 0 / pass | 0 problems (129 skills); `npm test` exit 0 | PASS | |
| `quick_validate.py` for the four skills | pass | pass for qa-task, qa-story, review-task, create-task | PASS | |
| No QA report improvises a docs-only substitute | on the next docs-only task | not checkable this cycle | UNVERIFIED | This criterion names a later task's QA report. It is carried to that task's QA, not a defect in this change. |

### Fixtures with controls

| Route | Fixture | Control | Result |
| --- | --- | --- | --- |
| Docs-only | a Markdown-only set (`skills/qa-task/SKILL.md`, `docs/x/y.md`, `shared/resources/a.md`) through `isDocsPath` with the default patterns: `true` | the same set plus `evals/shared/tests/finding-anchors-callers.test.mjs`: `false` (this PR's own set is therefore on the code route); `skills-config.yaml`: `false` | PASS |
| Mutation overlap | the rule text names a backgrounded suite or fast gate and a re-run of an overlapped suite result; this cycle followed it (no mutation ran while the reviewer was live) | a cycle with no background process mutates in place (Step 3c wording: "nothing else running over the tree") | PASS, by reading the rule |
| Reproduced finding | rule 5d: reproduced, passes its control, not `pre-existing` goes to `top_issues[]` with confidence unchanged and `origin: code-review, reproduced by QA` | CR-1 (medium) was not reproducible by execution, so it stayed advisory | PASS |
| Reviewer scratch | the scratch bullet is in the shared prompt; both reviewers were told to use `mktemp -d` and `git status --porcelain` shows no file written by them | none | PASS |
| Criterion probe | rule: `prettier --check` on `.md` is flagged because `.prettierignore` excludes `*.md`; a check that processes the file is not | `doc-links.js --file` reads the report and reported a count | PASS, by reading the rule and running `doc-links.js` |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: no CHANGELOG entry for task 273**
- **Severity**: MEDIUM
- **Observation**: `changelog-cites.sh` prints `missing (task 273)`; `changelog.enforce` is on here
- **Impact**: `/finalise` 6d HALTs with `no-changelog-entry`
- **Recommendation**: add an Added entry under `[Unreleased]` citing `(task 273)`

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Median of five alternating `CI=true npm test` runs: develop 162 s, head 163 s.

### Reliability — PASS
The new rule removes a known source of load-sensitive false failures (task.189 cycle 6).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The diff adds no predicate-shaped function. `boundary: false`; the criteria classifier found no boundary signal.

### Maintainability — PASS
Rules are stated once in shared sources and bundled. `bundle --check`: 0 problems.

---

## Code Review

Reviewer: one Explore subagent over the whole branch diff (1035 patch lines; `references/` copies and `docs/tasks` excluded).

**Correctness bugs (3, all advisory; none reproducible by execution):**
- [medium/medium] `skills/qa-task/SKILL.md:609` — the docs-only prompt has no equivalent of category E (unbound reads in fenced bash), and a SKILL.md-only change set takes that route → add category E to the docs-only prompt. Step 4b executes the fenced blocks, which covers part of it.
- [low/medium] `skills/qa-task/SKILL.md:609` ⚠️ unverified anchor (text-mismatch; the reviewer paraphrased the line, the sentence is on line 609) — the route is computed from the whole branch diff while the cycle 3+ patch is scoped → state which list decides.
- [low/low] `shared/resources/qa-docs-only-review-prompt.md:19` ⚠️ unverified anchor (text-mismatch; the prompt never mentions `ci.docsOnly.enabled`, so the claim holds, the line is wrong) — the route ignores `ci.docsOnly.enabled` → say so.

**Cleanups (0).**

mutation-proven: dropped the `qa-docs-only-review-prompt.md` entry from `CONSUMER_CITE_ONLY` (renamed its key) → `finding-anchors-callers.test.mjs` went red on two tests (the entry-membership test and the `anchor_check` consumer test; 15 pass, 2 fail) → covered. Restored; `cmp` clean; 16 of 16 pass.

Provenance (5b): not applicable, no reproduced bug.

---

## Regression Testing

`CI=true npm test`: exit 0, 160 s. `npm run bundle -- --check`: 129 skills, 0 problems. `quick_validate.py`: four skills pass.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm test
npm run bundle -- --check
python3 skills/create-skill/scripts/quick_validate.py skills/<skill>
node --test evals/shared/tests/finding-anchors-callers.test.mjs
bash .agents/skills/qa-task/references/changelog-cites.sh task.273
```

Standards-named validation: `npm run validate -- skills/<changed-skill>/` is covered by `quick_validate.py` for the four changed skills.

---

## Recommendations

### Immediate Actions (Blocking)
1. Add the CHANGELOG entry citing (task 273).

### Short-term Actions (Non-Blocking)
1. Consider adding category E to the docs-only prompt (CR-1).
2. State which file list decides the route (CR-2) and that `ci.docsOnly.enabled` is ignored (CR-3).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every route is present and holds on its fixture; the only open item is the missing CHANGELOG citation.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` adds the CHANGELOG entry, then re-review.
