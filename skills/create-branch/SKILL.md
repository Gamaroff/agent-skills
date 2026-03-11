---
name: create-branch
description: Create git branches following Gitflow conventions. This skill should be used when starting work on a new feature, hotfix, or release. Accepts story files, task documents, or descriptions to generate properly-named branches from the correct base branch (develop or main).
---

# Create Branch

This skill creates git branches following the Gitflow branching model defined in `docs/development/git-strategy.md`.

## When to Use This Skill

Use this skill when:

- Starting work on a new feature from a story or task document
- Creating a hotfix branch for an urgent production fix
- Creating a release branch to prepare a new version
- Need to ensure branch naming follows Gitflow conventions

## Input Handling

**Flexible Invocation:**

Invoke this skill with any of:

- **A story file path**: `story.178.8.swipe-actions-friend-requests.md`
- **A story directory**: `stories/story.178.8.swipe-actions-friend-requests/`
- **A task document**: `docs/prd/.../task.123.some-task.md`
- **A raw description**: `"implement user authentication"`
- **Explicit type flag**: `--hotfix`, `--release`, `--feature`

## Branch Type Detection

### Automatic Detection

| Context                             | Branch Type | Base Branch                    |
| ----------------------------------- | ----------- | ------------------------------ |
| Story file (`story.*`)              | `feature`   | User choice (see below)        |
| Task file (`task.*`)                | `feature`   | User choice (see below)        |
| `--hotfix` flag or "hotfix" keyword | `hotfix`    | `main`                         |
| `--release` flag or version pattern | `release`   | `develop`                      |
| Default (raw description)           | `feature`   | User choice (see below)        |

### Base Branch Selection for Features

**CRITICAL**: Before creating a feature branch, always check the current branch and ask the user to choose the base branch.

**Detection Logic:**

1. Check current branch: `git branch --show-current`
2. If currently on a feature branch (starts with `feature/`):
   - Detect if the new branch is a sub-story (e.g., creating `story.309.2.3A` while on `feature/story.309.2.3`)
   - Present user with options for base branch
3. If currently on `develop` or `main`:
   - Default to `develop` but still ask for confirmation

**User Prompt Pattern:**

Use `AskUserQuestion` to present options:

```
Question: "Which branch should be the base for feature/story.309.2.3A.core-notification-ui?"

Options:
1. feature/story.309.2.3.mobile-notification-center (current branch - recommended for sub-stories)
   - Use when this is a sub-story or related work
   - Changes will be grouped together for review

2. develop (standard Gitflow)
   - Use when this is independent work
   - Follows standard Gitflow conventions
```

**Sub-story Detection:**

A branch is likely a sub-story if:
- Current branch: `feature/story.X.Y.name`
- New branch: `feature/story.X.Y.Z.name` (where Z extends X.Y)

Example: Creating `story.309.2.3A` while on `feature/story.309.2.3` → likely a sub-story

### Naming Conventions

| Branch Type         | Pattern                               | Example                                             |
| ------------------- | ------------------------------------- | --------------------------------------------------- |
| **Feature (story)** | `feature/story.<epic>.<story>.<name>` | `feature/story.180.3.quick-re-search-functionality` |
| **Feature (task)**  | `feature/task.<id>.<name>`            | `feature/task.123.api-validation`                   |
| **Feature (desc)**  | `feature/<kebab-case-description>`    | `feature/user-authentication`                       |
| **Hotfix**          | `hotfix/v<version>`                   | `hotfix/v1.2.1`                                     |
| **Release**         | `release/v<version>`                  | `release/v1.3.0`                                    |

## Workflow

### Step 1: Parse Input

Determine the input type and extract relevant information:

```
Input: story.178.8.swipe-actions-friend-requests.md
 → Type: feature (from story)
 → Branch Name: feature/story.178.8.swipe-actions-friend-requests
 → Base: TBD (will ask user)
```

### Step 2: Check Current Branch Context

**CRITICAL**: Before proceeding, check the current branch to determine base branch options:

```bash
git branch --show-current
```

**Analysis:**

- If on `feature/*` branch: Offer current branch + `develop`
- If on `develop`: Offer `develop` (recommended) + current branch
- If on `main`: Only offer `develop` (block branching from main for features)
- If detached HEAD: Only offer `develop`

### Step 3: Ask User for Base Branch

Use `AskUserQuestion` with context-aware options:

**Scenario A: Creating sub-story from feature branch**

```
Current: feature/story.309.2.3.mobile-notification-center
New: feature/story.309.2.3A.core-notification-ui

Question: "Which branch should be the base for feature/story.309.2.3A.core-notification-ui?"

Options:
1. feature/story.309.2.3.mobile-notification-center (Recommended)
   Description: "Use current branch - groups related sub-story work together"

2. develop
   Description: "Standard Gitflow - treats as independent feature"
```

**Scenario B: Creating unrelated feature from feature branch**

```
Current: feature/story.309.2.3.mobile-notification-center
New: feature/story.310.1.new-unrelated-feature

Question: "Which branch should be the base for feature/story.310.1.new-unrelated-feature?"

Options:
1. develop (Recommended)
   Description: "Standard Gitflow - for independent features"

2. feature/story.309.2.3.mobile-notification-center
   Description: "Use current branch - only if this depends on uncommitted work"
```

**Scenario C: Creating feature from develop**

```
Current: develop
New: feature/story.309.2.3.mobile-notification-center

Question: "Which branch should be the base for feature/story.309.2.3.mobile-notification-center?"

Options:
1. develop (Recommended)
   Description: "Standard Gitflow - start from integration branch"
```

### Step 4: Ensure Clean Working Directory

Before creating a branch, check for uncommitted changes:

```bash
git status --porcelain
```

If there are uncommitted changes:

1. **HALT** and inform the user
2. Suggest using `/commit-changes` skill first
3. Or offer to stash changes: `git stash push -m "WIP before creating branch"`

**Exception — Orchestrator-managed files**: When invoked by the `develop-story` orchestrator, a single uncommitted implementation report file (`*.implementation.*.md`) may be present — this is expected pipeline state. If the **only** uncommitted file(s) match the pattern `*.implementation.*.md`, proceed without halting. The orchestrator stashes and restores this file around branch creation automatically.

### Step 5: Fetch Latest and Checkout Base

```bash
# Fetch latest from remote
git fetch origin

# Checkout the user-selected base branch
git checkout <selected-base-branch>  # e.g., develop or feature/story.309.2.3

# Pull latest changes
git pull origin <selected-base-branch>
```

### Step 6: Create and Switch to New Branch

```bash
git checkout -b feature/story.178.8.swipe-actions-friend-requests
```

### Step 6: Push Branch (Optional)

Optionally push the branch to set up tracking:

```bash
git push -u origin feature/story.178.8.swipe-actions-friend-requests
```

### Step 7: Confirm Success

Output a summary with context:

```
✅ Created branch: feature/story.178.8.swipe-actions-friend-requests
   Base: develop (user selected)
   Tracking: origin/feature/story.178.8.swipe-actions-friend-requests

Ready to start development!
```

Or for sub-stories:

```
✅ Created branch: feature/story.309.2.3A.core-notification-ui
   Base: feature/story.309.2.3.mobile-notification-center (sub-story)
   Tracking: origin/feature/story.309.2.3A.core-notification-ui

Ready to start development on sub-story!
```

## Quick Reference: Gitflow Rules

| Branch Type | Created From                  | Merges Into        | Purpose                  |
| ----------- | ----------------------------- | ------------------ | ------------------------ |
| **Feature** | `develop` or current feature* | `develop` or base* | New functionality        |
| **Release** | `develop`                     | `main` & `develop` | Release prep & bug fixes |
| **Hotfix**  | `main`                        | `main` & `develop` | Emergency prod fixes     |

\* Feature branches can be created from the current feature branch for sub-stories. The user chooses the base branch interactively.

> [!IMPORTANT]
>
> - Feature branches **never** interact directly with `main`
> - Sub-story feature branches merge back to their parent feature branch
> - Hotfix branches **must** be merged back to both `main` AND `develop`
> - Every merge to `main` triggers a version tag

## Error Handling

### Branch Already Exists

If the target branch already exists:

1. Check if it exists locally: `git branch --list <branch-name>`
2. Check if it exists remotely: `git ls-remote --heads origin <branch-name>`
3. **HALT** and ask the user:
   - Switch to existing branch?
   - Delete and recreate?
   - Use a different name?

### Uncommitted Changes

If working directory is not clean:

1. Show the user what's uncommitted: `git status`
2. Offer options:
   - Commit first (suggest `/commit-changes`)
   - Stash changes
   - Abort

### Network Issues

If fetch fails:

1. Retry once with verbose output
2. If still failing, **HALT** and suggest offline branch creation with warning

## Examples

### Create Feature Branch from Story (Standard)

```
Input: /create-branch story.180.3.quick-re-search-functionality.md
Current Branch: develop

User Prompt:
  Question: "Which branch should be the base for feature/story.180.3.quick-re-search-functionality?"

  Options:
  1. develop (Recommended)
     Description: "Standard Gitflow - start from integration branch"

User selects: develop

Output:
  ✅ Created branch: feature/story.180.3.quick-re-search-functionality
     Base: develop (user selected)
     Tracking: origin/feature/story.180.3.quick-re-search-functionality
```

### Create Sub-story Branch from Feature Branch

```
Input: /create-branch story.309.2.3A.core-notification-ui.md
Current Branch: feature/story.309.2.3.mobile-notification-center

User Prompt:
  Question: "Which branch should be the base for feature/story.309.2.3A.core-notification-ui?"

  Options:
  1. feature/story.309.2.3.mobile-notification-center (Recommended)
     Description: "Use current branch - groups related sub-story work together"

  2. develop
     Description: "Standard Gitflow - treats as independent feature"

User selects: feature/story.309.2.3.mobile-notification-center

Output:
  ✅ Created branch: feature/story.309.2.3A.core-notification-ui
     Base: feature/story.309.2.3.mobile-notification-center (sub-story)
     Tracking: origin/feature/story.309.2.3A.core-notification-ui
```

### Create Hotfix Branch

```
Input: /create-branch --hotfix v1.2.1 "fix payment timeout"

Output:
  ✅ Created branch: hotfix/v1.2.1
     Base: main
     Tracking: origin/hotfix/v1.2.1
```

### Create Release Branch

```
Input: /create-branch --release v1.3.0

Output:
  ✅ Created branch: release/v1.3.0
     Base: develop
     Tracking: origin/release/v1.3.0
```

## Related Skills

- `/commit-changes` - Stage and commit changes with conventional commit messages
- `/create-pr` - Create a pull request for the current branch
- `/develop` - Full story implementation workflow

## References

- [Git Strategy](file:///docs/development/git-strategy.md) - Complete Gitflow documentation
