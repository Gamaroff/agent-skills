# Sprint Review Summary - 'Is this the right runbook?' Callouts for Satellites

**Story/Task ID:** story.3.2
**Epic:** epic.3.runbook-tutorial-wrappers
**Completed Date:** 2026-05-13
**Completed By:** dev-agent
**Pull Request:** [#108](https://github.com/Gamaroff/agent-skills/pull/108)

---

## Summary

Added "Is this the right runbook?" orientation callouts to the top of four satellite runbooks (`hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, `change-management.md`). Each callout confirms the correct use case, redirects to alternatives when appropriate, and links to the `which-path.md` decision tree.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Each of the 4 satellite runbooks has a callout block at the top: "Use this if X. Use [Y runbook] instead if Z."
- [x] All callouts cross-reference `docs/concepts/which-path.md` (Story 1.3 output)
- [x] Each callout is 8 lines (≤ 10 line cap)
- [x] Existing body content untouched — insertions only confirmed by diff inspection

### Key Features Implemented

- **hotfix.md callout**: Targets production incidents ("broken in prod right now"); redirects task/story-cycle work and uncertain users
- **bug-fix.md callout**: Targets local development bug cycle; redirects production incidents (→ hotfix) and architectural changes (→ story-development)
- **create-parallel-stories.md callout**: Targets multi-developer/multi-agent parallel streams; redirects solo or task-only work
- **change-management.md callout**: Targets mid-pipeline pivots and scope changes; redirects routine bugs (→ bug-fix) and fresh starts (→ story-development)

---

## Technical Details

### Files Modified/Created

- `docs/runbooks/hotfix.md` — callout block inserted at top (lines 3–10)
- `docs/runbooks/bug-fix.md` — callout block inserted at top (lines 3–10)
- `docs/runbooks/create-parallel-stories.md` — callout block inserted at top (lines 3–10)
- `docs/runbooks/change-management.md` — callout block inserted at top (lines 3–10)

### Architecture/Design Decisions

Callout pattern follows the Story 3.1 diff-inspection gate approach. Each callout is a Markdown blockquote (`>`) immediately after the H1 title, separated from the original audience blockquote by a `---` horizontal rule. Content is parameterised per runbook (not generic copy-paste) with use-case-specific "Use this if / Use a different runbook if" guidance.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Automated checks:** diff inspection ×4 (insertions-only gate), line-count ×4 (≤10), grep ×4 (callout presence), link check ×4 (`which-path.md`)
- **Manual testing:** N/A (documentation change)

### Code Review

- **QA Gate:** PASS (100/100)
- **QA Report:** `story.3.2.qa.1.satellite-runbook-callouts.md`
- **Gate File:** `story.3.2.gate.1.satellite-runbook-callouts.yml`

---

## Security & Compliance

### Security Review

✅ **Not Applicable** — documentation-only change; no security surface introduced.

### Compliance Review

✅ **Not Applicable** — internal developer documentation; no PII, UI, or data handling.

---

## Documentation

### Updated Documentation

- [x] 4 satellite runbooks updated with orientation callouts (the deliverable IS the documentation)
- [x] Story change log updated (versions 1.0–1.2)
- [x] QA report and gate file created

### Documentation Links

- [which-path.md decision tree](../../../../../concepts/which-path.md)
- [Story 3.2 QA Report](story.3.2.qa.1.satellite-runbook-callouts.md)

---

## Demo Notes

### How to Verify

1. Open any of the 4 satellite runbooks: `docs/runbooks/hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, `change-management.md`
2. Confirm a `> ### Is this the right runbook?` blockquote appears immediately after the H1 title
3. Confirm the callout contains "Use this if" and "Use a different runbook if" guidance
4. Confirm the callout links to `../concepts/which-path.md`
5. Confirm the original audience blockquote and body are unchanged

---

## Impact & Value

### User Impact

New users landing on any satellite runbook now see immediate orientation guidance — confirming they are in the right place, or redirecting to a better fit. Reduces wasted time following wrong-runbook instructions.

### Technical Impact

Establishes the callout insertion pattern (Story 3.1 gate + blockquote at top) as a repeatable, diff-verifiable convention for all runbooks.

---

## Known Limitations & Future Work

### Current Limitations

None.

### Suggested Follow-Up Stories

- Apply similar callouts to remaining runbooks not yet covered

---

## Metrics

- **Story Points:** N/A
- **Lines of Code Changed:** ~40 lines inserted, 0 deleted
- **Test Coverage Delta:** N/A (doc-only)

---

**Status:** ✅ **ACCEPTED**

_This story has been verified against the Definition of Done and is ready for Sprint Review presentation._
