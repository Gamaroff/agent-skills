# QA Report: Task 66 — Review a pull request against the paper trail that is supposed to justify it

**Task**: [task.66.review-pr.md](./task.66.review-pr.md)
**Gate File**: [task.66.gate.1.review-pr.yml](./task.66.gate.1.review-pr.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-31
**Gate Status**: CONCERNS
**PR**: [#283](https://github.com/Gamaroff/agent-skills/pull/283)

---

## Executive Summary

All ten implementation phases are complete, the full repo suite is green (1986 tests, 0 failures), and the standards doc sweep landed as specified. The document-anchored checks all pass.

The diff code review is where this cycle earned its keep. It found **ten correctness defects and one cleanup in the skill's own shell snippets and test assertions** — four of them high-confidence, and every testable one confirmed empirically. The most serious is a glob that matches **zero of 110** gate files in this repo.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix the four blocking findings first

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (11 sections, card preflight clean)
- [x] All 10 implementation phases completed — 59/59 checkboxes ticked
- [x] Tests passing — 1986 repo tests, 1985 pass, 0 fail, 1 pre-existing skip
- [x] Breaking changes documented (None; additive only)
- [x] Code on feature branch with open PR #283

### Review Methodology

Direct tools for the document-anchored checks, plus one read-only Explore subagent for Step 3b.

The Adaptive Review Strategy nominally calls for parallel agents at >5 phases, but the change set is prose plus one JS test file with no runtime surface, and the reviewing party authored it in this same session — so breadth came from scoping the code review carefully rather than from fanning out. **Adaptive strategy note: diff scoped from 23,037 lines to 1,019** by excluding the 30 auto-generated bundle copies, which are byte-identical to `shared/resources/` and carry an `AUTO-GENERATED — DO NOT EDIT` header. Reviewing them would have been pure noise and would likely have crowded out the real findings.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1. Skill scaffold + platform resolution | PASS | Verified | Both sourced helpers guarded `\|\| exit 1`; auth by status code |
| 2. PR resolution (dual platform) | CONCERNS | Partial | CR-4: `$PR` / `$BRANCH` never bound from `target` |
| 3. Work-item resolution cascade | CONCERNS | Partial | CR-1 (unanchored grep), CR-2 (dead `**` glob) |
| 4. Artifact + tracker collection | PASS | Verified | Exercised against PR 281 / task 65 — all 8 kinds |
| 5. Diff construction | CONCERNS | Partial | CR-5: unchecked fetch breaks the merged-PR case |
| 6. Conformance prompt | PASS | Verified | 4 categories, full `pr_conformance:` key set |
| 7. Lenses, verdict, report | CONCERNS | Partial | CR-6: verdict table middle row is ambiguous |
| 8. `--comment` | CONCERNS | Partial | CR-3 (`$BODY_FILE` unassigned), CR-7 (pagination) |
| 9. Wiring and validation | CONCERNS | Partial | CR-8, CR-9 (two weak assertions), CR-11 (bad run cmd) |
| 10. Standards doc sweep | PASS | Verified | 6 additive rows across 4 files; no deletions |

**Overall Phase Completion**: 10/10 complete; 6 carry findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Contract tests | present | 40 tests, 40 pass | PASS |
| Full repo suite | 0 failures | 1985/1986, 1 skip | PASS |
| `quick_validate.py` | passes | ✓ review-pr | PASS |
| Description ≤150 words | ≤150 | 130 | PASS |
| `npm run bundle` idempotent | no diff | in sync (pre-commit hook) | PASS |
| Catalog regenerated | 119 skills | 119 | PASS |
| `.pr-review.` registered | 4 files | file-naming ×2, both co-located tables, pipeline-artifacts | PASS |
| Test glob in package.json | present | present (10 → 49 tests, mutation-proved) | PASS |
| No `*.review.*` glob swallows `.pr-review.` | none | none (fixed in-cycle) | PASS |
| Resolution cascade works | rungs converge | rungs 1/2/3 → same doc (PR 281) | PASS |

---

## Breaking Changes Validation

**None declared, and none found.** `shared/resources/code-review-prompt.md` is unmodified in the diff, so `/review-code`, `/qa-story` and `/qa-task` are untouched. No existing skill's `references/` changed. All six standards edits are pure additions — the diff contains no deletion lines in `docs/standards/` or `docs/reference/pipeline-artifacts.md`.

**Assessment**: PASS

---

## Issues Found

All issues this cycle came from the diff code review — see below. No separate bug report files created: every finding is a single-line fix inside the change set under review, with a named remedy, and belongs in the qa-fix cycle rather than in its own document.

**Total**: HIGH: 0, MEDIUM: 6, LOW: 5

---

## Code Review

**Correctness bugs (10):**

- [medium/high] `skills/review-pr/SKILL.md:113` — rung 2 greps `pr_number: ${PR_NUMBER}` with no end anchor, so reviewing PR 28 matches `pr_number: 281` → anchor to end-of-value. **Confirmed empirically**: `grep -rl "pr_number: 28" docs/` returns task.14, task.65 and its DoD.
- [medium/high] `skills/review-pr/SKILL.md:114` — `docs/**/*.gate.*.yml` relies on `globstar`, which is off by default → use recursive grep. **Confirmed empirically**: 0 matches without globstar, 110 with.
- [medium/high] `skills/review-pr/SKILL.md:296` — `$BODY_FILE` consumed by three commands, assigned by none; Step 9 removes only `$DIFF_FILE` → assign via mktemp, delete in Step 9. **Confirmed**: three uses, zero assignments.
- [medium/medium] `skills/review-pr/SKILL.md:88` — `${PR}` and `$BRANCH` dereferenced but never derived from `target` → add a target-parsing step.
- [medium/medium] `skills/review-pr/SKILL.md:181` — fetch/diff exit status unchecked, so the documented "audit a merged PR after the fact" case yields an empty patch when the head branch was deleted on merge → fall back on any fetch failure, not only cross-fork.
- [medium/medium] `skills/review-pr/SKILL.md:217` — verdict table's middle row says only "any `medium`"; a code bug at `severity: high` + `confidence: medium` matches no row and falls through to APPROVE → name the field explicitly, in both copies of the table.
- [low/medium] `skills/review-pr/SKILL.md:307` — Bitbucket marker search reads only the first page of comments → request a large `pagelen` or follow `next`.
- [low/high] `skills/review-pr/tests/review-pr.test.js:286` — schema-mirror assertion has a dead first alternative (the prompt writes `code_review[]` without backticks) plus a loose `|parallel` fallback, so it passes on one stray word. **Confirmed**: "parallel" appears in the prompt, satisfying the assertion alone.
- [low/medium] `skills/review-pr/tests/review-pr.test.js:159` — the eight-artifact-kinds test substring-checks generic tokens against the whole Step 3 block; deleting the globs leaves it green → scope to the fenced block and match the glob form.
- [low/low] `skills/review-pr/SKILL.md:284` — Arguments and the Step 8 heading disagree on whether an explicit `--comment` still prompts.

**Cleanups (1):**

- `skills/review-pr/tests/review-pr.test.js:9` — the documented run command `node --test skills/review-pr/tests/` fails with MODULE_NOT_FOUND; the glob form works. **Confirmed.**

**Promoted to gate `top_issues[]`** (`code_review_blocking=true`, `category: bug` + `confidence: high`): **CR-1, CR-2, CR-3, CR-8**.

CR-4 through CR-7, CR-9 and CR-10 are `confidence: medium|low` and stay advisory by contract; CR-11 is a cleanup and never gates. All are nonetheless worth fixing in the same cycle — each was verified by reading and each is a one-line change.

> **On CR-8 and CR-9.** Two of the skill's own contract tests were weaker than they read. Both would have passed against a SKILL.md with the behaviour deleted — precisely the vacuity the repo's mutation-proving rule exists to catch, and precisely what the 11 mutation proofs run during development did **not** catch, because neither assertion was among the mutated behaviours. That is the honest limit of the mutation set: it proves the claims you thought to revert, not the ones you did not.

### Mutation-Proof Spot Check (Step 3c)

11 mutation proofs were run during implementation; each reverted behaviour turned exactly one test red. Two of them (M5, M11) exposed weak assertions that were then tightened and re-proved.

`mutation-proven: yes` for the 11 claims covered. **`mutation-proven: no` for CR-8 and CR-9** — those two assertions were never mutated, which is why their vacuity survived to this review.

---

## NFR Assessment

### Performance — PASS
Diff written to a scratch patch file, never read into main context. Both lenses dispatched in a single parallel message. Re-review scoping documented. The review itself demonstrated the discipline: 23,037 lines scoped to 1,019.

### Reliability — CONCERNS
Both sourced helpers guarded with `|| exit 1`; Bitbucket auth verified by status code with the 404-not-401 trap called out; degrade path when no work item resolves; tracker fetch non-blocking. But CR-2, CR-3 and CR-5 mean three documented paths fail **silently** rather than loudly — a dead glob returns empty, an unassigned variable expands to nothing, an unchecked fetch yields an empty patch reported as "no changes". Silent failure is the failure mode this skill exists to prevent elsewhere.

### Security — PASS
No secrets in authored files. Comment bodies always file-sourced — zero inline `--body` — which matters because bodies carry backticks and `$(…)`. Bitbucket auth scheme selected by variable name, never by sniffing the token value. `addCommentToJiraIssue` absent.

### Maintainability — PASS
Shared prompts referenced, never copied — `code-review-prompt.md` provably unmodified. 40 contract tests, bundle idempotent, catalog regenerated, dead reference caught and removed by the repo's own guard suite.

---

## Regression Testing

| Area | Result |
|---|---|
| `/review-code`, `/qa-story`, `/qa-task` | PASS — `code-review-prompt.md` unmodified |
| All other skills' bundles | PASS — no `references/` changed outside review-pr |
| Standards docs | PASS — additive rows only, no deletions |
| Full repo suite | PASS — 1985/1986, 1 pre-existing skip |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Rationale**: The work is complete and well-tested at the document level, but the code review found four high-confidence defects — three of which make a documented path fail silently — plus six further verified issues. None is architectural; all are small, localised fixes.

**Deployment Recommendation**: CONDITIONAL — staging conditional, production blocked until CR-1, CR-2, CR-3 and CR-8 are fixed and mutation-proved.

**Next Steps**: `/qa-fix` addresses the four blocking findings and, given they are all one-liners, the six advisory ones in the same cycle. Re-review as gate 2.
