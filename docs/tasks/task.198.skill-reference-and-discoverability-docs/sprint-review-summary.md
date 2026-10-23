# Sprint Review Summary - Skill reference and discoverability docs

**Story/Task ID:** task.198
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#703](https://github.com/Gamaroff/agent-skills/pull/703)

---

## Summary

The command reference, activation phrases, workflow overviews and four skill READMEs now describe the skills that ship. Task 198 fixed the 27 findings it took from the 2026-10-07 doc-drift audit: missing flags and modes, removed or never-shipped skills, and skills absent from the maps.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: 27/27 findings fixed. The audit report marks each one Resolved, and none was closed in Phase 0
- [x] SC-2: No changed doc still states the old behaviour (old-wording probes across 3 QA cycles)
- [x] SC-3: The one shell command runs (the platform-detection.md source grep, 22 files). Slash forms are cited against their `SKILL.md` argument tables
- [x] SC-4: Not applicable (documentation only)
- [x] SC-5: `prettier --check` clean (note: `.prettierignore` excludes `*.md`)
- [x] SC-6: `markdown-link-check@3` with the CI config is clean on all 16 docs, including the 4 skill READMEs CI skips. 5 new anchors resolve
- [x] SC-7: `quick_validate.py` ✓ for develop-next, qa-next, review-story and review-task
- [x] SC-8: The audit report marks all 27 findings
- [x] SC-9: The architecture dependency map re-validated after every edit

### Key Features Implemented

- **Missing flags and modes**:
  - `/review-pr` target forms, `--effort` and `--inline`
  - `/review-code` PR, range and `--staged`
  - `/create-task --from-observation`
  - session-handoff continue mode
- **Removed or never-shipped skills**: `document-project`, `qa-technical-task` and `uat-automate` are no longer presented as live
- **Map gaps**:
  - `wireframe`, `ensure-*` and `sync-jira-epic` added to the architecture map and the runbook call tables
  - tracker-sync wording now says who chooses the tracker: the user in `create-story`, the resolver in `review-story`

---

## Technical Details

### Files Modified/Created

- `docs/reference/commands.md`, `activation-phrases.md`, `invocation.md`: the command and trigger reference
- `docs/concepts/architecture.md`, `overview.md`; `docs/operations/workflows.md`: maps and overviews
- `docs/runbooks/` (5 runbooks), `README.md`, and `skills/{develop-next,qa-next,review-story,review-task}/README.md`
- `CHANGELOG.md`: the [Unreleased] entry (task 198)
- `.agents/plans/doc-drift-audit-2026-10-07.md`: 27 findings marked Resolved

### Architecture/Design Decisions

The fixes cite canonical sources (`SKILL.md` argument tables, `platform-detection.md`) rather than restating them. Where a doc listed which skills do something, the list is now backed by the command that produces it.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** None added (documentation only)
- **Regression:** `npm run ci:fast` 5969 tests, 5955 pass, 0 fail. PR CI: test, validate, link-check and shellcheck all green

### Code Review

- **QA:** 3 cycles. Gate 1 CONCERNS 90 (7 findings), gate 2 CONCERNS 90 (3 findings), gate 3 PASS 100. Each cycle used an independent claim fact-check reviewer
- **PR conformance review (Step 5c):** ✅ APPROVE, 0 findings
- **Review Comments Addressed:** 10/10 QA findings fixed, plus 4 cleanups

---

## Security & Compliance

- **Security:** Not applicable. The change is documentation only, and no boundary deliverable was found
- **Compliance:** Not applicable. No data, payment, UI or health changes

---

## Known Limitations / Future Work

- `finalise/SKILL.md` says "resolver already sourced above" but has no `resolve-platform.sh` source line. This is a skill-behaviour gap and was out of scope here; file it as a follow-up.
- SC-5's `prettier --check` passes without checking anything, because `.prettierignore` excludes `*.md`.
