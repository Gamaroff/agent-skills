# QA Report: Task 193 - Scripts reach only the skills that run them

**Task**: [task.193.scripts-reach-only-skills-that-run-them.md](./task.193.scripts-reach-only-skills-that-run-them.md)
**Gate File**: [task.193.gate.1.scripts-reach-only-skills-that-run-them.yml](./task.193.gate.1.scripts-reach-only-skills-that-run-them.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

The change switches 11 prose script literals to bare filenames, removes 17 bundled copies no skill runs, and adds `tests/shared-script-literals.test.js`. Every phase is delivered and every gate measured green. The independent diff review found one real hole in the new guard: a script literal inside a `<!-- cite: … -->` wrapper is exempted by the test, but the bundler still copies it (CR-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 `[x]`)
- [x] Tests passing
- [x] Breaking changes documented (none — a skill loses only copies it never runs)
- [x] Code on feature branch with open PR (#691, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review

### Review Methodology

Direct tools (small task, 4 phases, prose + one test file) plus one read-only Explore diff reviewer for Step 3b. Reviewer duration 198,784 ms (`duration_ms` from its completion notice); it read 7 changed files and checked all 17 deleted copies against every runner. First review: no prior gate, whole branch diff (bundled `references/` copies and task docs excluded from the patch; the deletions given as a list).

Step 4b: fired (the change modifies `skills/develop-bug/SKILL.md` and four `shared/resources/*.md` with fenced bash). `changed` blocks: **0 in every file** — the edits are prose only. File-level: develop-bug `SKILL.md` 1 runnable / 7 mutating, 0 findings; lite-mode 0 blocks; resume contract 2 runnable / 8 placeholder / 21 mutating, 0 findings; step-0 and step-7 report `zero-blocks-executed` (1 and 2 placeholders, rest mutating) — a property of those files' unchanged blocks, recorded as information. Shells: bash and zsh.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Classify | PASS | Verified | 37 literals classified; table + witnesses in the implementation report |
| Phase 2: Fix | PASS | Verified | 11 switched; `grant-qa-cycles.sh` only in develop-story/develop-task; `bundle:check` 0 problems; reviewer confirmed no skill runs a removed copy |
| Phase 3: Guard and pin | CONCERNS | Verified with gap | 6/6 tests pass; CR-1 hole in the cite exemption |
| Phase 4: Changelog | PASS | Verified | `[Unreleased]` › Fixed names guard and 17 removed copies |

**Overall Phase Completion**: 4/4 delivered, 1 with a finding

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Every prose script literal is bare, cite-wrapped or ALLOWED | `tests/shared-script-literals.test.js` §2 (per-PR) — but a cite-wrapped script literal is not safe (CR-1) | CONCERNS |
| Stale ALLOWED entry fails | same test §2 stale check; mutation M3 red at Step 3 | PASS |
| No `grant-qa-cycles.sh` copy outside runners; no `UNREACHED` | `ls skills/*/references/grant-qa-cycles.sh` → develop-story, develop-task only; `npm run bundle:check` 0 problems; held per-PR by §2 (QA proof below) | PASS |
| create-skill rule reads the unbundled form | same test §3 (per-PR) | PASS |
| Performance | not applicable | PASS |
| `npm test`, `bundle:check`, `prettier --check .` pass | ci:fast 5903/0 at Step 3; `bundle:check` and `prettier --check .` re-run here, clean | PASS |
| CHANGELOG names guard and removed copies | `CHANGELOG.md:173` | PASS |

---

## Breaking Changes Validation

None documented, none found. A skill loses only copies of scripts that no line of it runs (reviewer verified all 17).

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the guard exempts cite-wrapped script literals the bundler still copies (CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: `scan()` skips any literal inside `<!-- cite: … -->` (`tests/shared-script-literals.test.js:142`). `quick_validate.py:88` `ref_kind` returns `cite` only when the name ends in `.md` (`CITABLE_SUFFIXES = ('.md',)`), so a cite-wrapped `.sh`/`.js`/`.mjs` is a dependency and is bundled into every skill that bundles the document. The §1 fixture asserts the exemption as correct. The task's § 8 listed "a cite wrapper" as a must-pass control, so the spec carried the error.
- **Impact**: the obs #263 incident can recur through a cite wrapper with the guard green.
- **Recommendation**: drop the cite exemption for script literals (the guard's extensions are never citable) and flip the fixture so a cite-wrapped script literal is reported.
- **Priority**: P2

### LOW Severity Issues (2)

- CR-2 (advisory): `RUN_PREFIX` (`:55`) reads English "the single source `…`" or "import nothing from `…`" as a command.
- CR-3 (advisory): only `shared/resources/*.md` is scanned; a `shared/resources/<script>` literal in a shared `.sh` comment also propagates copies.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
One text scan; each live-tree test ~15 ms.

### Reliability — PASS
`bundle:check` 0 problems; no removed copy has a runner.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No runtime boundary. `boundary: false` — candidates named: `scan`, `citeState`, `RUN_PREFIX` in `tests/shared-script-literals.test.js`; each classifies a CI lint finding, takes no external input and gates no runtime action.

### Maintainability — CONCERNS
CR-1 leaves a hole in the guard this task adds.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `tests/shared-script-literals.test.js:142` — cite-wrapped script literal exempted although `ref_kind` makes it a dependency → exempt only `.md` targets; flip the fixture. **Promoted to gate `top_issues` (CR-1, code_review_blocking).**
- [low/medium] `tests/shared-script-literals.test.js:55` — `RUN_PREFIX` accepts English "source " and a greedy `import … from` → anchor the command token to a code span; add a lowercase-"source" prose control.
- [low/medium] `tests/shared-script-literals.test.js:172` — scan covers `.md` only; shared `.sh` comment literals also propagate → extend the scan or state the scope.

**Cleanups (0).**

All three anchors `ok` (`finding-anchors.js --rev HEAD`). Provenance: the file is new in this change, so every finding is new.

mutation-proven: restore `Source: \`shared/resources/grant-qa-cycles.sh\`` in the resume contract (scratch worktree) → §2 live tree + §2 mutation → covered
mutation-proven: restore `shared/resources/handover-render.js` at step-7 finalise `:437` → §2 live tree → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundler tests (`bundle-missing-source`, `bundle-comment-origin`, `bundled-links`) | PASS (25 tests incl. the new file) |
| `npm run validate` on develop-bug, develop-story, develop-task, qa-story, qa-task, review-pr, review-story, review-task, create-skill | PASS (9/9 exit 0) |
| Full suite (`npm run ci:fast`, Step 3, `.agents/skills` moved aside) | PASS 5903 / 0 fail |

---

## Test Artifacts

### Files Reviewed
`tests/shared-script-literals.test.js`, `tests/lib/markdown-section.js`, `skills/create-skill/scripts/quick_validate.py`, `skills/develop-bug/SKILL.md`, the four edited `shared/resources/*.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
npm run validate -- skills/<skill>/        # 9 changed skills
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <f> --diff-base <merge-base> --copy-as skills:.agents/skills --json
npm run bundle:check
prettier --check .
command node --test tests/shared-script-literals.test.js tests/bundle-missing-source.test.js tests/bundle-comment-origin.test.js tests/bundled-links.test.js
```

### Coverage Report
Not measured (Node test runner, no coverage configured for `tests/`).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — drop the cite exemption for script literals; flip the §1 fixture.

### Short-term Actions (Non-Blocking)
1. CR-2 — tighten `RUN_PREFIX`.
2. CR-3 — `.sh` comment literals.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: delivered and green, with one medium finding in the new guard.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.193.qa.1.scripts-reach-only-skills-that-run-them.md`
**Gate File**: co-located at `task.193.gate.1.scripts-reach-only-skills-that-run-them.yml`
**Next Steps**: `/qa-fix` for CR-1, then QA cycle 2.
