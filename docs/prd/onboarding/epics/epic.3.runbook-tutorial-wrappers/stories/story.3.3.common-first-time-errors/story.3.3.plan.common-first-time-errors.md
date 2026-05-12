---
id: story.3.3.plan
title: "Implementation Plan: Common first-time errors"
type: plan
story-ref: story.3.3.common-first-time-errors.md
---

# Implementation Plan: Common first-time errors

> Requirements: [story.3.3.common-first-time-errors.md](story.3.3.common-first-time-errors.md)

## Overview

Append a troubleshooting section to each anchor runbook. Entries sourced from real dogfood-run errors.

## Entry format

```markdown
### {Symptom — one-line, user-perspective}

**You see:** {exact error text or behavior}
**Cause:** {root cause, 1–2 sentences}
**Fix:**
1. {Step}
2. {Step}

_Provenance: {implementation-report path or commit SHA}_
```

## Survey checklist (Task 1)

Grep implementation reports for friction signals:

```bash
grep -lir "error\|failed\|did not\|unexpected\|prompt" docs/prd/onboarding/epics/*/stories/*/story.*.implementation.*.md 2>/dev/null
```

For each match, decide: real error, AskUserQuestion confusion, or noise.

## Candidate entries (likely to surface — confirm via Task 1 survey)

**Task pipeline:**
1. `/develop-task` paused at Phase 0 base-branch prompt — user didn't know default
2. Task registry conflict (two task creations racing)
3. `documentation-standards-validator` failed on missing frontmatter field
4. `qa-task` flagged AC verification but the AC was unclear
5. Practice task left an uncancelled registry row

**Story pipeline:**
1. `/develop-story` Phase 0 epic-branch prompt — user didn't know to create
2. Epic-registry conflict (two epic creations racing)
3. PR target branch wrong (chose `main` instead of epic branch)
4. `qa-fix` loop hit max iterations without resolving
5. Sprint review summary missed because finalise stage skipped (lite mode)

These are **candidates** — Task 1 confirms which are real. Speculative entries marked.

## Task-by-Task Implementation Guide

### Task 1 — Survey

Run grep above. For each candidate, find the implementation report passage that captured it. Note SHA or file path.

### Task 2 — Categorise

Two buckets: task-specific, story-specific. Overlap → mention in both, cross-reference.

### Tasks 3–4 — Draft sections

Use the entry format. ≥ 5 entries per runbook. ≤ 60 lines per section. Real first, speculative last (with marker).

### Task 5 — Append

Edit tool. `old_string` = last content line of the runbook. `new_string` = same + section.

### Task 6 — Provenance

For each entry, verify the provenance pointer resolves. Speculative entries explicit.

### Task 7 — Diff + validate

```bash
# Confirm only appends; nothing edited above the new section
git diff docs/runbooks/story-development.md docs/runbooks/task-development.md
```

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| < 5 real errors observed | Medium | Medium | Speculative-marker pattern documented |
| Provenance pointer rots | Medium over time | Low | Use commit SHAs (immutable) not file paths where possible |
| Section appended to wrong location | Low | High | Diff verification gate |
