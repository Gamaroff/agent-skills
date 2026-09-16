# QA Report: Task 112 - The hotfix runbook predates /develop-bug's hotfix model and never mentions it

**Task**: [Link to task document](./task.112.hotfix-runbook-rewrite.md)
**Gate File**: [task.112.gate.1.hotfix-runbook-rewrite.yml](./task.112.gate.1.hotfix-runbook-rewrite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-16
**Testing Completed**: 2026-09-16
**Gate Status**: CONCERNS

---

## Executive Summary

Documentation-only change: `docs/runbooks/hotfix.md` rewritten against `/develop-bug`'s hotfix branch model, plus a lead paragraph in `workflows.md`, a link in `faq.md`, a README row and a CHANGELOG entry. Both phases are delivered and all seven success criteria hold when checked by grep and against the cited sources. The adversarial diff review found four LOW accuracy defects — three where the new `workflows.md` paragraph says more than the spec it links to, one where `hotfix.md` says the Q1 prompt is skipped when it is only defaulted. One fix cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Progress Tracking 3/3 ticked)
- [x] Tests passing (`npm run ci:fast` exit 0 — 3340 pass / 1 skipped / 0 fail)
- [x] Breaking changes documented — none (documentation only)
- [x] Code on feature branch with open PR (#414, OPEN, base `develop`)

### Testing Approach

- [x] Manual Testing (read-through of every changed page against its cited source)
- [x] Automated Testing (`ci:fast`; `changelog-entry-drift.test.mjs` 6/6)
- [ ] Performance Testing — N/A
- [x] Regression Testing (link check on the four changed docs; Mermaid parse; Verification block executed)
- [x] Security Review (reasoned — no boundary in the change set)
- [x] Code Review (Step 3b, one read-only Explore subagent over the branch diff, 107 s)

### Review Methodology

Direct tools — small task (2 phases, documentation only, `risk_level: low`), standard pipeline mode. Step 3b diff review dispatched as a single read-only Explore subagent (dispatched 23:40 → returned 23:42) over `origin/develop...HEAD` excluding the implementation and review reports; its `code_review:` block was in hand before this gate was written. Traceability mapper not dispatched (Success Criteria is a numbered list, not a table). Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` touched; the runbook's fenced blocks are illustrative git/gh queries and were executed by hand instead, see Regression Testing). Boundary rule: `boundary: false` — nothing in the change set accepts or rejects input; `probes_executed: 0` by design. Platform variance: no environment-derived value in the diff.

---

## Implementation Verification

| Phase                          | Status | Test Result | Notes                                                                                                                                                                                   |
| ------------------------------ | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1: `hotfix.md` rewrite   | CONCERNS | Verified  | 62 → 140 lines; `bug-fix.md` section order mirrored; `develop-bug` claims match SKILL.md:39/165/194/196 and step-0 §0d; one misstatement about Q1 being skipped (CR-4)                  |
| Phase 2: two small drifts      | CONCERNS | Verified  | `workflows.md` paragraph present under Cross-cutting references but overstates the spec in three places (CR-1..3); `faq.md` Step 5c link resolves to `qa-flow.md` Phase 3b (anchor recomputed) |

**Overall Phase Completion**: 2/2 phases delivered; both carry LOW accuracy findings.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| - | --------- | ------ | ------ | ------ | ----- |
| 1 | `hotfix.md` names `/develop-bug`, the Phase 0d hotfix answer, and the actual step order | yes | 8× `develop-bug`; Q1/Q2/Q3 table; 8-step diff table; Phase C | PASS | CR-4 misstates that Q1 is not asked |
| 2 | Bug filed before the branch is cut; page says which mode | yes | Phase A precedes Phase B; "Pick the bug mode first" recommends general bug with the story/task exception | PASS | |
| 3 | Back-merge appears as a pipeline-recorded step | yes | Step 4 row: Issues-Log `hotfix: merge-back to develop required`; diagram node K; Phase C step 2 | PASS | matches develop-bug SKILL.md:196 |
| 4 | Tag survives as an explicit human action | yes | Phase C (human), diagram node J, line 20 | PASS | `release.sh --patch` per releases.md |
| 5 | "Force-pushing main is never authorised" survives unchanged | byte-identical | `grep -Fx` match | PASS | |
| 6 | Both tracker arms named; every link resolves; ≤ 150 lines | yes / 0 dead / ≤150 | `ensure-bug-github-issue` + `ensure-bug-jira-issue`; 16 links, 0 dead; 140 lines | PASS | |
| 7 | `workflows.md` describes the lead; `faq.md` Step 5c links | yes | `### What the pipelines post`; `[Step 5c](../runbooks/qa-flow.md#phase-3b--pr-conformance-review-review-pr-step-5c)` | PASS (with CR-1..3) | the description is present but not accurate to the spec |

**Code Quality:** prettier clean on all changed files (`.prettierignore` excludes `*.md`, so this is the task/CHANGELOG check only); fence parity even on `hotfix.md` (4 fences); CHANGELOG entry carries the `(task 112)` citation the drift test requires.

---

## Breaking Changes Validation

None — documentation only. **Overall Breaking Changes Assessment:** PASS (N/A).

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (4)

All four are `category: bug`, `confidence: medium` from the Step 3b diff review, each verified by reading the cited spec. LOW because a reader who follows the link reaches the accurate statement; still worth fixing because a paragraph whose purpose is to describe the behaviour should not contradict the spec it points at.

- **CR-1** `docs/operations/workflows.md:170` — attributes PR-comment leads to `tracker-comment.js`; the spec says PR stages are not in `COMMENT_STAGES` (exit 2) and are rendered via `stakeholder-summary-cli.js` / `pr-inline-comment.js`. Verified against `LEAD_STAGES` vs `PR_COMMENT_STAGES` in `stakeholder-summary.js`.
- **CR-2** `docs/operations/workflows.md:166` — "every comment … to a pull request" carries a lead; the spec's "Inline findings carry no lead, deliberately" section says inline review findings do not.
- **CR-3** `docs/operations/workflows.md:169` — the `---` is stated unconditionally; the spec says it is GitHub-only (Jira/ADF gets a paragraph boundary).
- **CR-4** `docs/runbooks/hotfix.md:41` — "instead of asking" — step-0 §0d still asks Q1; the description sets the recommended default. The page's own lines 68 and 118 say the opposite.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS

Not applicable — no executable change. Page length 140 within the satellite budget.

### Reliability — PASS

Every relative link and `#anchor` in the four changed docs resolves (`markdown-link-check` 16 + 23 + 8 + 23 = 70 links, 0 dead; four anchor slugs recomputed from heading text since the checker does not resolve fragments). Mermaid block parses. The `Verification` block's commands were run against this repo (`git branch -r --list 'origin/hotfix/*'`, `git tag --contains`, `git merge-base --is-ancestor`) and returned the documented shapes.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (`boundary: false` — nothing in the change set accepts or rejects input)
- No secrets, no network calls, no auth handling introduced. The documented commands are read-only queries plus the release procedure `releases.md` already documents.

### Maintainability — CONCERNS

Four one-sentence accuracy fixes (CR-1..4). Otherwise: section-for-section mirror of `bug-fix.md`, sources cited by identity (skill name + step) rather than line number, README/CHANGELOG/task doc all updated in the same change.

---

## Code Review

From Step 3b — **`code_review_blocking=true`** was passed by the pipeline, but every finding is `confidence: medium`, so none is promoted to the gate by the blocking rule. They enter `top_issues[]` as open LOW entries on the maintainability axis instead, because they are accuracy defects in the deliverable itself.

**Correctness bugs (4):**

- [low/medium] `docs/operations/workflows.md:170` — leads for PR comments attributed to `tracker-comment.js`, which rejects PR stages → attribute to the shared engine, or name the PR-side renderers
- [low/medium] `docs/operations/workflows.md:166` — "every … pull request" comment carries a lead; inline findings deliberately do not → scope the claim
- [low/medium] `docs/operations/workflows.md:169` — `---` stated unconditionally; GitHub-only per spec → qualify or defer to the spec
- [low/medium] `docs/runbooks/hotfix.md:41` — "instead of asking" — Q1 is asked with a recommended default → reword

**Cleanups (0):** none.

`boundary: false`; `probes_executed: 0`. No mutation-proof spot check — the change set adds no tests and fixes no code-level defect (nothing to revert).

---

## Regression Testing

| Area | Check | Result |
| ---- | ----- | ------ |
| Docs link integrity | `markdown-link-check -c .github/markdown-link-check.json` on the 4 changed docs | PASS — 70 links, 0 dead |
| Heading anchors | slugs for `#pick-the-bug-mode-first`, `#phase-1--the-8-steps`, `#tracker-sync--both-arms`, `#phase-3b--pr-conformance-review-review-pr-step-5c` recomputed from live headings | PASS |
| CHANGELOG drift | `evals/shared/tests/changelog-entry-drift.test.mjs` | PASS 6/6 |
| Hermetic suite | `npm run ci:fast` | PASS 3340/3341 (1 skipped) |
| Sibling runbook | `bug-fix.md:9` still links `hotfix.md`; README row updated | PASS |

---

## Test Artifacts

### Files Reviewed

`docs/runbooks/hotfix.md`, `docs/operations/workflows.md`, `docs/reference/faq.md`, `docs/runbooks/README.md`, `CHANGELOG.md`, `docs/tasks/task.112.hotfix-runbook-rewrite/task.112.hotfix-runbook-rewrite.md`; sources: `skills/develop-bug/SKILL.md`, `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, `skills/create-branch/SKILL.md`, `docs/contributing/releases.md`, `shared/resources/stakeholder-summary.md` + `.js`, `docs/runbooks/qa-flow.md`, `docs/runbooks/bug-fix.md`.

### Test Commands Executed

```bash
npm run ci:fast                                     # exit 0
node --test evals/shared/tests/changelog-entry-drift.test.mjs   # 6/6
npx markdown-link-check -c .github/markdown-link-check.json docs/runbooks/hotfix.md docs/operations/workflows.md docs/reference/faq.md docs/runbooks/README.md
grep -Fx -- '- **Force-pushing main is never authorised by this runbook.** …' docs/runbooks/hotfix.md
wc -l docs/runbooks/hotfix.md                       # 140
```

### Coverage Report

Not applicable — no source code in the change set.

---

## Recommendations

### Immediate Actions (Blocking)

1. Reword the `workflows.md` lead paragraph to match the spec: engine-generic attribution, tracker + summary-level PR comments only, `---` GitHub-only (CR-1, CR-2, CR-3).
2. Reword `hotfix.md:41`: the description makes hotfix the *recommended default* for Q1; the prompt is still asked (CR-4).

### Short-term Actions (Non-Blocking)

None.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Deliverable complete and every success criterion met; four LOW accuracy defects in the prose itself, all against the spec the prose links to. Maintainability CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1..CR-4 fixed and re-reviewed.

---

**QA Report**: co-located at `task.112.qa.1.hotfix-runbook-rewrite.md`
**Gate File**: co-located at `task.112.gate.1.hotfix-runbook-rewrite.yml`
**Next Steps**: `/qa-fix` cycle 1 on the four LOW entries, then re-review (cycle 2 refute pass).
