# QA Report: Task 207 - Doc numbering enforcement and sweep (cycle 2)

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.2.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.2.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 refute pass at head `c5432aa8`. BUG-1 and BUG-4 are fixed. BUG-3's guard (§5) is blind to
two placeholder spellings that nine canonical files still use, so BUG-3 is reopened at HIGH; BUG-2's
comment stripper still opens a phantom block comment on a `/*` inside a regex literal, so BUG-2 is
reopened; and the backfill title drops the sub-story letter (BUG-5).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Finding | Cycle 1 | Status now | Evidence |
| --- | --- | --- | --- |
| TASK-207-BUG-1 review-epic 0a.3 unbound reads | MEDIUM | ✅ FIXED | §4 runs 0a.3 alone in a git checkout; mutation (drop `CURRENT_BRANCH=`) → red |
| TASK-207-BUG-2 phantom block comment | MEDIUM | ❌ NOT FIXED | the `//` case is fixed; a `/*` inside a regex literal still opens one (CR-2) |
| TASK-207-BUG-3 placeholder residues | MEDIUM | ❌ NOT FIXED (now HIGH) | §5's key misses `<epic>`/`<N>` and `{N}.{M}` spellings; 9 files (CR-1) |
| TASK-207-BUG-4 title shape | MEDIUM | ✅ FIXED | MUST_HIT literal-space rows; mutation → red |
| CR-5 backfill story-title strip | LOW | ✅ FIXED | `stripIdPrefix` |
| CR-6 quickstart cancellation | LOW | ✅ FIXED | sentence rewritten |

---

## Testing Scope

### Review Methodology

Re-review scope: unscoped — cycle 2 refute pass (`origin/develop...HEAD`, generated
`skills/*/references/**` excluded; 96 files, 6832 patch lines). One read-only Explore reviewer with
the refute directive, dispatched 17:25:12Z, `duration_ms` 137936. `SAFETY_REPROBE=false` (gate 1
security PASS). Step 4b re-run over the two runnable-prose files cycle 1 changed
(`review-pipeline-step-0a-branch-setup.md`, 16 blocks; `review-epic/SKILL.md`, 5 blocks): no
findings.

---

## New Findings This Cycle

- **[high]** `tests/doc-id-chokepoint.test.js:520` — OLD_PLACEHOLDER misses `story.<epic>.<story>`, `epic.<N>`, `story.<N>.<M>`, `story.{N}.{M}`; nine files still teach them, including an executed subagent glob in `shared/resources/qa-findings-ingester-prompt.md:16` → widen the key; rewrite the sites. (BUG-3, reopened)
- **[medium]** `tests/doc-id-chokepoint.test.js:101` — a `/*` inside a regex literal (`skills/session-handoff/scripts/handoff-verify.mjs:489`) opens a phantom block comment → open one only where `/*` starts a token. (BUG-2, reopened)
- **[medium]** `.agents/scripts/backfill-story-issues.sh:65` — the issue title drops `.sub`. (BUG-5)
- **[low]** `.agents/scripts/backfill-story-issues.sh:49` — an epic or artifact file is processed as a story. (CR2-6)
- **[medium/medium, pre-existing]** `shared/resources/review-pipeline-step-0a-branch-setup.md:181` — no 0a.3 variant echoes `AUTO_SKIPPED`; and 0a.6 (`:285`) reads `EPIC_BRANCH`/`BASE_DEFAULT` from other blocks. Provenance: `git show origin/develop:shared/resources/review-pipeline-step-0a-branch-setup.md` has the same reads (lines 113, 163, 204, 253ff) and the same silent 0a.3 in every variant. Outside numbering scope → `recommendations.future`, not `top_issues`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–1 | PASS | unchanged since cycle 1 |
| Phase 2: Chokepoint test | CONCERNS | BUG-2 reopened |
| Phase 3: Prose sweep | FAIL | BUG-3 reopened (HIGH) |
| Phase 4 | PASS | bundle clean |

---

## Success Criteria Verification

As cycle 1, except: "§7 population — zero unexplained hits" **FAIL** — nine files outside every spelling
the sweep and §5 search.

---

## Breaking Changes Validation

None for consumers. **PASS.**

---

## Issues Found

### HIGH (1)
- **TASK-207-BUG-3** (reopened) — [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)

### MEDIUM (2)
- **TASK-207-BUG-2** (reopened) — [task.207.bug.2.chokepoint-phantom-block-comment.md](./task.207.bug.2.chokepoint-phantom-block-comment.md)
- **TASK-207-BUG-5** — [task.207.bug.5.backfill-substory-title.md](./task.207.bug.5.backfill-substory-title.md)

### LOW (1)
- **CR2-6** — backfill processes non-story documents.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
§5 adds one pass over ~700 Markdown files; re-measured at finalise.

### Reliability — CONCERNS
BUG-5.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned — no boundary changed since gate 1; `relatedDocInfo`'s cycle-1 run record (`task.207.qa.1.security.run.json`, `totals.executed` 26) stands.
- **Probes executed**: 0 this cycle

### Maintainability — FAIL
BUG-3 reopened: the guard added to hold the sweep passes over files that still teach the flat scheme.

---

## Code Review

**Correctness bugs (6):**
- [high/high] `tests/doc-id-chokepoint.test.js:520` — §5 key misses two spellings. **Promoted: BUG-3 (reopened).**
- [medium/high] `tests/doc-id-chokepoint.test.js:101` — `/*` in a regex literal. **Promoted: BUG-2 (reopened).**
- [medium/high] `.agents/scripts/backfill-story-issues.sh:65` — sub-story letter dropped. **Promoted: BUG-5.**
- [medium/medium] `shared/resources/review-pipeline-step-0a-branch-setup.md:181` — 0a.3 prints nothing; pre-existing, future.
- [medium/medium] `shared/resources/review-pipeline-step-0a-branch-setup.md:285` — 0a.6 cross-block reads; pre-existing, future.
- [low/medium] `.agents/scripts/backfill-story-issues.sh:49` — kind/artifact unchecked. CR2-6.

**Cleanups (0).**

**Boundary:** unchanged since gate 1 (`relatedDocInfo`, measured, 26).

---

## Regression Testing

Fast gate on `c5432aa8`: exit 0. **PASS.**

---

## Test Artifacts

```bash
command node --test tests/doc-id-chokepoint.test.js        # 12/12
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/review-pipeline-step-0a-branch-setup.md --json
git grep -nE 'story\.<(epic|E|N)>|epic\.<(N|n|epic)>|story\.\{N\}\.' -- 'skills/**/*.md' 'shared/resources/*.md' 'docs/**/*.md'
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH (BUG-3 reopened).
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` (cycle 2)
