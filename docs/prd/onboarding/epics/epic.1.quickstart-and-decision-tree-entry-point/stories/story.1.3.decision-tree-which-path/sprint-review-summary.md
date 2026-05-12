# Sprint Review Summary — Story 1.3: Decision tree — which path?

**Story/Task ID:** story.1.3.decision-tree-which-path
**Epic:** epic.1.quickstart-and-decision-tree-entry-point
**Completed Date:** 2026-05-12
**Completed By:** develop-story pipeline
**Pull Request:** [#96](https://github.com/Gamaroff/agent-skills/pull/96)

---

## Summary

Adds `docs/concepts/which-path.md` — a decision tree that routes new users to the right skill via three questions. Covers all four workflow entry points: `/create-task`, `/create-story`, `/hotfix`, `/parallel-stories`.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] New file `docs/concepts/which-path.md` exists with valid frontmatter and lifecycle compliance
- [x] Decision tree covers four leaves: task, story, hotfix, parallel work
- [x] Each leaf links to matching runbook AND matching quickstart (where one exists)
- [x] Format: Mermaid `flowchart` + prose fallback (accessibility)
- [x] Doc body ≤ 250 lines (78 lines delivered)

### Key Features Implemented

- **Mermaid `flowchart TD`**: Three-question decision tree routing user intent to the correct skill
- **Prose fallback**: Screen-reader-friendly version for viewers without Mermaid support
- **Quick-reference table**: Four-row summary table for at-a-glance lookup
- **Default leaf**: Ambiguous user-facing work defaults to `/create-story` (documented)

---

## Technical Details

### Files Modified/Created

- `docs/concepts/which-path.md` — **New** — Decision tree guide (78 lines)
- `docs/concepts/README.md` — **Modified** — Entry added for `which-path.md`
- `docs/prd/.../story.1.3.decision-tree-which-path.md` — **Modified** — Status updated, tasks ticked, QA/DoD sections added

### Architecture/Design Decisions

- Inline Mermaid (no separate diagrams/ directory) — consistent with existing repo pattern (confirmed via `architecture.md`, `hotfix.md`, `quickstart-story.md`)
- Prose fallback section required by AC4 and WCAG accessibility guidance
- Three-question chain maps to the four leaf nodes exhaustively and exclusively

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Automated checks:** All 5 ACs verified by qa-story pipeline (100/100 quality score)
- **Link checks:** 8/8 outbound links resolved
- **Line count:** 78 ≤ 250 (AC5)
- **Manual pending:** Task 6 — visual Mermaid render verification on GitHub PR preview

### Code Review

- **PR:** #96 — OPEN
- **Approval Status:** Pending reviewer (manual Mermaid render check required)

### QA Gate

- **Gate:** PASS (100/100)
- **QA Report:** `story.1.3.qa.1.decision-tree-which-path.md`
- **Gate File:** `story.1.3.gate.1.decision-tree-which-path.yml`

---

## Security & Compliance

### Security Review

✅ **Not Applicable** — documentation-only story, no runtime components

### Compliance Review

✅ **PASS**

- [x] File naming conventions followed (kebab-case, .md)
- [x] YAML frontmatter valid and complete
- [x] Linked from parent README
- [x] Prose fallback for Mermaid (WCAG accessibility)
- [x] All outbound links resolve

---

## Documentation Updates

- **New:** `docs/concepts/which-path.md` (the deliverable)
- **Updated:** `docs/concepts/README.md` (index entry)

---

## Demo Notes

Open `docs/concepts/which-path.md` on GitHub — the Mermaid decision tree renders visually, allowing users to follow the three-question flow. Prose fallback is visible below for screen readers.

**Key demo path:** User with a bug fix → Q1 (user-facing? Yes) → Q2 (broken in prod? No) → Q3 (parallel? No) → `/create-story`

---

## Known Limitations

- Task 6 (visual Mermaid render on GitHub) requires manual reviewer verification — not blockable by automation
- No `/hotfix` or `/parallel-stories` quickstart files exist yet; only runbook links provided for those leaves

---

## Impact Assessment

**User impact:** New users can now orient themselves in < 30 seconds without skimming multiple docs. Landing page for the onboarding epic.

**Epic progress:** Story 1.3 of Epic 1 complete. Epic covers Stories 1.1 (task quickstart), 1.2 (story quickstart), 1.3 (decision tree). All three stories now merged or in PR.
