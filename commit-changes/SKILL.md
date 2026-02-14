---
name: commit-changes
description: 'Create high-quality git commits: review/stage intended changes, split into logical commits, and write clear commit messages (including Conventional Commits). Use when the user asks to commit, craft a commit message, stage changes, or split work into multiple commits.'
---

# Commit work

## Goal

Make commits that are easy to review and safe to ship:

- only intended changes are included
- commits are logically scoped (split when needed)
- commit messages describe what changed and why

## Inputs to ask for (if missing)

- Single commit or multiple commits? (If unsure: default to multiple small commits when there are unrelated changes.)
- Commit style: Conventional Commits are required.
- Any rules: max subject length, required scopes.

## Workflow (checklist)

0. Analyze recent commits to match repository style
   - `git log -5 --pretty=format:"%h - %s%n%b"`
   - Note: subject length, body structure, level of detail
   - This repo uses detailed bullet-point bodies listing specific changes
1. Inspect the working tree before staging
   - `git status`
   - `git diff` (unstaged)
   - If many changes: `git diff --stat`
2. Decide commit boundaries (split if needed)
   - Split by: feature vs refactor, backend vs frontend, formatting vs logic, tests vs prod code, dependency bumps vs behavior changes.
   - If changes are mixed in one file, plan to use patch staging.
3. Stage only what belongs in the next commit
   - Prefer patch staging for mixed changes: `git add -p`
   - To unstage a hunk/file: `git restore --staged -p` or `git restore --staged <path>`
4. Review what will actually be committed
   - `git diff --cached`
   - Sanity checks:
     - no secrets or tokens
     - no accidental debug logging
     - no unrelated formatting churn
5. Describe the staged change in 1-2 sentences (before writing the message)
   - "What changed?" + "Why?"
   - If you cannot describe it cleanly, the commit is probably too big or mixed; go back to step 2.
6. Write the commit message
   - Use Conventional Commits (required):
     - `type(scope): short summary`
     - blank line
     - body with **detailed bullet points**:
       - Specific files/components affected
       - Features added/updated
       - Related changes (tests, docs, config, migrations)
   - Prefer an editor for multi-line messages: `git commit -v`
7. Run the smallest relevant verification
   - Run the repo's fastest meaningful check (unit tests, lint, or build) before moving on.
8. Repeat for the next commit until the working tree is clean

## Commit Message Format Examples

Good commit message structure for this repository:

```
type(scope): concise subject describing what changed

- Add specific component/file changes
- Implement feature details with file paths
- Update related documentation
- Add/update tests for new functionality
- Configure build/deployment changes if applicable
```

Example from this repo:

```
feat(contacts): implement user discovery UI components

- Add SearchBar with debounced search input
- Create UserCard component for displaying @handles
- Implement ActionButton with loading/disabled states
- Update ContactsScreen to integrate search functionality
- Add unit tests for new components (95% coverage)
```

## Deliverable

Provide:

- commands used to analyze recent commits (`git log`)
- the final commit message(s) with detailed bullet-point bodies
- a short summary per commit (what/why)
- the commands used to stage/review (at minimum: `git diff --cached`, plus any tests run)
