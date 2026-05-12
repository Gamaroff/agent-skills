---
id: story.1.5.plan
title: "Implementation Plan: README Start-here callout"
type: plan
story-ref: story.1.5.readme-start-here-callout.md
---

# Implementation Plan: README Start-here callout

> Requirements: [story.1.5.readme-start-here-callout.md](story.1.5.readme-start-here-callout.md)

## Overview

Insert a small callout block into `README.md` between the badges/install section and the skill catalog. Plus discharge the deferred Linux walkthrough verification for Stories 1.1 + 1.2.

## Proposed callout block

```markdown
> ### 🚀 Start here
>
> - **First time?** → [Decision tree](./docs/concepts/which-path.md) tells you which path fits your work.
> - **Want a 10-min hands-on?** → [Task quickstart](./docs/concepts/quickstart-task.md)
> - **Want a 60-min full chain?** → [Story quickstart](./docs/concepts/quickstart-story.md)
```

6 lines + blank — well under 10.

## Task-by-Task Implementation Guide

### Task 1 — Locate insertion point

Open README, find the line after the install instructions and before the skill catalog (often marked by a heading like `## Skill catalog` or similar). Insertion point = immediately before that heading.

### Task 2–3 — Insert

Edit tool with `old_string` = the heading line + the line above it (for uniqueness), `new_string` = same + callout block + blank line.

### Task 4 — Catalog generator survival

```bash
npm run generate-catalog
git diff README.md
```

Expected: only catalog-section diffs; callout block intact above the catalog. If the generator overwrites the callout, the generator script needs a "preserve regions" feature — file as a follow-up task and use HTML comment markers (`<!-- start-here:start -->` / `<!-- start-here:end -->`) to demarcate.

### Task 5 — GitHub web preview

Push to PR; open the PR's README preview; verify the callout is visible above the fold on a 1080p screen.

### Task 6 — Linux walkthrough (parent NFR3)

```bash
# On a Linux machine (Docker container, VM, or remote)
git clone git@github.com:Gamaroff/agent-skills.git
cd agent-skills
# Walk docs/concepts/quickstart-task.md verbatim, stopwatch
# Walk docs/concepts/quickstart-story.md verbatim, stopwatch
# Record both times in this story's implementation report
```

If either walkthrough fails on Linux, file the failure as a task (not as a new story in this PRD) and unblock by patching the quickstart doc directly.

### Task 7 — Validation + status flip

Same pattern. Also: confirm `examples/README.md` and other README-referring docs still resolve.

## Key Patterns and References

- Callout uses GitHub blockquote-with-heading pattern (renders prominently on github.com).
- HTML-comment region markers are the standard escape hatch if a generator overwrites manual content.

## Testing Approach

- Diff inspection (insertion-only).
- Catalog-generator survival.
- GitHub web preview render.
- Linux walkthrough × 2 — produces real elapsed-time data for the parent NFR3 acceptance.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Catalog generator overwrites callout | Medium | High (silent regression) | Run generator in Task 4; add HTML-comment markers if needed |
| Linux walkthrough fails | Medium | High (breaks parent NFR3) | File patch task, fix quickstart, re-walk before merging |
| Callout pushes existing first-viewport content (install, badges) below fold | Low | Medium | Visual check on Task 5; trim block if needed |
