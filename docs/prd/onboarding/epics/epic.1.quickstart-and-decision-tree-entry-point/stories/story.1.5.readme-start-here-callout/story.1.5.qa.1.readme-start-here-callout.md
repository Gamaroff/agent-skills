# QA Report: Story 1.5 — README "Start here" callout

**Epic**: Epic 1 — Quickstart and Decision Tree Entry Point
**Story**: 1.5 — README "Start here" callout
**QA Engineer**: QA Engineer
**Testing Completed**: 2026-05-12
**Status**: PASS

---

## Executive Summary

Documentation-only story. A 5-line "Start here" blockquote callout was inserted at `README.md` line 15. All 3 acceptance criteria pass. Link targets exist on disk. Callout survives `npm run generate-catalog`. 167/167 tests pass. Gate: **PASS** (quality score: 100/100).

---

## Review Methodology

**Adaptive strategy**: Direct tools — small change (<5 implementation files, documentation-only). No parallel agents dispatched.

**Traceability matrix**: Caller-supplied from `.summaries/qa-traceability-matrix.md` (generated in Phase 0a-parallel). Steps 1–4 of internal traceability mapping skipped.

---

## Testing Scope

### Prerequisites Verified ✅

- [x] PR #98 OPEN — `feat(story.1.5): add "Start here" callout to README`
- [x] `npm test` — 167/167 pass, 0 fail
- [x] Story status: `ready-for-review`
- [x] File List complete (`README.md` only)

### Testing Approach

- [x] Diff inspection (insertion-only verification)
- [x] Link target existence check
- [x] Catalog generator survival test (`npm run generate-catalog`)
- [x] First-viewport line position verification

---

## Test Results Summary

### Acceptance Criteria Status

| AC  | Status   | Test Result  | Notes                                                              |
|-----|----------|--------------|--------------------------------------------------------------------|
| AC1 | ✅ PASS  | Verified     | Callout at line 15 — within first 30 rendered lines; links to `which-path.md`; above `## Contents` |
| AC2 | ✅ PASS  | Verified     | Diff: 6 lines added, 0 deleted in callout area — insertion only; `generate-catalog` preserves callout |
| AC3 | ✅ PASS  | Verified     | Block is 5 lines (header + blank + 3 bullets) — under 10-line cap |

---

## Detailed Verification

### AC1 — First-viewport visibility + link to which-path.md

- Callout at lines 15–19 of `README.md` (168 lines total)
- GitHub web render: at 1080p, ~30 lines visible above the fold; line 15 is unambiguously within viewport
- Link `./docs/concepts/which-path.md` → file confirmed on disk ✅
- Additional links `./docs/concepts/quickstart-task.md` and `./docs/concepts/quickstart-story.md` → both confirmed on disk ✅
- Block positioned between `---` divider (line 13) and `## Contents` (line 21) — above skill catalog ✅

### AC2 — Insertion-only, no restructuring

- `git diff origin/main...HEAD -- README.md`: 6 lines added in callout area, 0 deleted
- `npm run generate-catalog` executed post-check: callout at lines 15–19 after generation — **survived** ✅
- Note: diff also includes `document-project` → `document-existing-project` fix in the Meta featured skills list (line 80). This is a valid skill-name correction, not a structural reorganization. Does not affect AC2.

### AC3 — Block ≤ 10 lines

Block content:
```
> ### 🚀 Start here
>
> - **First time?** → [Decision tree](./docs/concepts/which-path.md) tells you which path fits your work.
> - **Want a 10-min hands-on?** → [Task quickstart](./docs/concepts/quickstart-task.md)
> - **Want a 60-min full chain?** → [Story quickstart](./docs/concepts/quickstart-story.md)
```

5 lines. ✅ (cap is 10)

---

## Issues Found

No issues. All ACs satisfied.

### Informational: Task 6 (Linux walkthrough) deferred

**Severity**: LOW (informational only — not an AC)
**Nature**: Task 6 (Linux walkthrough of Stories 1.1 + 1.2, parent NFR3 verification) explicitly deferred in the story. Requires physical/virtual Linux environment. Documented with ⚠️ in the task list and in the Dev Agent Record's Deferred Work section.
**Action**: Manual post-PR verification. Does not block gate.

---

## Requirements Traceability

Source: caller-supplied matrix from `.summaries/qa-traceability-matrix.md`.

| Criterion | Coverage | Verification Method | Status |
|-----------|----------|---------------------|--------|
| AC1: Start here block within first 30 rendered lines, above catalog, links to `which-path.md` | integration | Line position check + link existence | ✅ PASS |
| AC2: Insertion only, no reorganization | integration | `git diff` + `generate-catalog` survival | ✅ PASS |
| AC3: Block ≤ 10 lines | integration | Line count in diff | ✅ PASS |

No coverage gaps. This is a documentation-only story with no automated test suite — integration-level verification is appropriate and sufficient.

---

## NFR Compliance Assessment

Documentation-only change. NFR scope is narrow.

### Security ✅
- Status: PASS
- Notes: No code paths, no auth, no secrets. N/A for this change.

### Performance ✅
- Status: PASS
- Notes: Static documentation. No runtime impact.

### Reliability ✅
- Status: PASS
- Notes: Change is a pure insertion. Callout survives catalog regeneration (verified). Rollback is a single `git revert`.

### Maintainability ✅
- Status: PASS
- Notes: Callout is in a manually-edited section of README (above the generated skill catalog). Generator does not overwrite it. 5-line block is minimal and self-explanatory. Test suite at 167/167 ✅.

---

## Final Assessment

### Gate Status: PASS

**Rationale**: All 3 acceptance criteria met with direct evidence. No high or medium severity issues. All NFRs pass. Deferred Task 6 is explicitly acknowledged, non-AC, and non-blocking.

**Quality Score**: 100/100

### Deployment Recommendation: APPROVED

**Conditions**: None.

### Next Steps

1. Proceed to `/finalise`
2. Task 6 (Linux NFR3 walkthrough) should be tracked as a post-merge follow-up item

---

**QA Report**: `story.1.5.qa.1.readme-start-here-callout.md` (co-located)
**Gate File**: `story.1.5.gate.1.readme-start-here-callout.yml` (co-located)
