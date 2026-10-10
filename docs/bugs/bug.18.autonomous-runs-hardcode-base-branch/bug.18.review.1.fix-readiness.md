---
type: review-report
bug: 'bug.18'
mode: validate-and-apply
reviewed: '2026-10-10'
recommendation: READY TO FIX
score: 9
---

# Bug Review — bug.18 (general)

## Executive Summary

**Fix-readiness:** 9/10 — ✅ **READY TO FIX**
**Issues:** Critical 1 (fixed) · Important 1 (fixed) · Optional 0
**Duplicate:** none · **Reproduces:** likely · **Stale source:** none

Completeness 9 · Reproducibility 10 · Classification 9 · Linkage 10.

## Pre-pass results

Run inline with read-only `grep` (the two scans were narrow enough not to need subagents).

- **Duplicate scan** — `docs/bugs/bug-registry.md` has no other row about the directive, base branch or
  `epic-integration`. task.201 names bug.18 as a dependency, not a duplicate: it replaces the prose
  directive with a `--defaults` flag and lists `develop-batch`'s epic-integration handling as out of
  scope ("fixed there"). → `duplicate: none`.
- **Already-fixed scan** — every cited line still says what the report says it does:
  - `skills/develop-next/SKILL.md:126` — "Q1 = base branch, `develop` and Q2 = PR target, `develop`".
  - `skills/develop-batch/SKILL.md:243` (`git worktree add <dir> -b <branch> <baseBranch>`), `:288`
    (literal Q1/Q2), `:376` (`git rebase origin/<baseBranch>`), `:505` ("no epic integration").
  - `grep -c branch_model` → `0` in `select-next.mjs` and `0` in `schedule.mjs`.
  - Phase 0d §0d (`develop-pipeline-step-0-resolve-and-prepare.md:611–664`) still recommends `EPIC_BRANCH`.
  → `reproduces: likely`.

## Findings by dimension

### Template & frontmatter
- **Critical (fixed)** — the general-bug violation heading `## Scope & Impact` was missing. Added from
  the report's own Summary, Impact and Evidence, and the registry row's Area cell; nothing invented.
- **Important (fixed)** — the `## Resolution Summary` stub was missing. Added from the template.
- Frontmatter: `type: bug`, `status`, `severity`, `priority`, `created`, `related`, `description` all
  present and valid. Identity (filename ↔ `Bug ID` ↔ directory ↔ general mode) consistent.

### Reproducibility
- Numbered, self-contained reading steps with an environment (`v0.55.0`, `develop@7d712757`), Frequency
  and Reproducible fields, and file:line evidence. Expected vs Actual explicit.
- Reachability: the Expected outcome (the directive takes Phase 0d's recommendation verbatim; batch
  supports or excludes `epic-integration` items) needs only prose and selector changes. No contract
  rules it out.

### Severity / priority
- Major / High fits: latent, but an autonomous run would land an epic's story on `develop` early, and a
  batch rebase would replay the epic's commits. No change.

### Linkage
- Registry row 18 exists, status `new`, matching the frontmatter. Issue #620 linked.

## Fixes applied to the bug report (Step 6.5)

- ✅ Fixed: added `## Scope & Impact`.
- ✅ Fixed: added `## Resolution Summary` stub.

Severity and priority unchanged, so no Status History row.

## Next steps

- `develop-bug` Step 3: reproduce (guard test first), then fix. The report leaves one choice open for
  `develop-batch` (support vs exclude `epic-integration` items) and recommends **exclude** as the
  smaller safe fix.
