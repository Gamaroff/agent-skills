---
id: story.1.4.plan
title: "Implementation Plan: Rewrite getting-started.md terminus"
type: plan
story-ref: story.1.4.rewrite-getting-started-terminus.md
---

# Implementation Plan: Rewrite getting-started.md terminus

> Requirements: [story.1.4.rewrite-getting-started-terminus.md](story.1.4.rewrite-getting-started-terminus.md)

## Overview

Surgical edit to a single existing doc. Replace the terminating section only; install checklist body untouched.

## Proposed terminus replacement

```markdown
## Next steps

You've installed agent-skills. Pick your first action:

- **Internal work (refactor, infra, cleanup)** → follow [`quickstart-task.md`](./quickstart-task.md) — ships a real task in 10 minutes.
- **User-facing work (feature, bug, UX)** → follow [`quickstart-story.md`](./quickstart-story.md) — ships a real story in 60 minutes.
- **Not sure which** → see [`which-path.md`](./which-path.md) — the decision tree.

### More depth

For reference material once you've shipped your first artifact: [runbooks](../runbooks/README.md), [standards](../standards/), [reference](../reference/).
```

11 lines body + 1 subheading = 13 lines well under 20 cap.

## Task-by-Task Implementation Guide

### Task 1 — Snapshot install body

```bash
sed -n '/^## Install/,/^## /p' docs/concepts/getting-started.md > /tmp/install-body-before.txt
```

(Adjust section heading anchors to actual headers in the file.)

### Task 2–4 — Surgical edit

Use the Edit tool with a precise `old_string` matching the current terminus and `new_string` per the proposed terminus above. Do NOT use a full file rewrite — that risks accidental changes to the install body.

### Task 5 — Diff verify

```bash
git diff docs/concepts/getting-started.md
```

Confirm: changes confined to lines after the install section's end. Install heading + body identical.

```bash
sed -n '/^## Install/,/^## /p' docs/concepts/getting-started.md > /tmp/install-body-after.txt
diff /tmp/install-body-before.txt /tmp/install-body-after.txt
```

Expected: empty diff (or single-line trailing diff if next heading changed, which is allowed).

### Task 6 — Validation + status

Same pattern as prior stories.

## Key Patterns and References

- Sibling links resolve at filename level (same directory).
- Existing terminus may have runbook refs — preserve them in "More depth" subsection.

## Testing Approach

- Diff inspection (gating).
- Static validator + link check.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inadvertent edit to install body | Low | High | Snapshot + diff verification gate |
| Stale references to runbooks lost during rewrite | Low | Low | "More depth" subsection retains them |
