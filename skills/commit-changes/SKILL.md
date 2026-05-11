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

## Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--exclude <path>` | Exclude a file from staging (repeatable). Switches from patch staging to full-tree staging with explicit pathspec exclusion. | `--exclude docs/task.14.impl.md` |

When one or more `--exclude <path>` flags are passed, collect all values into an array and use full-tree staging in step 3 instead of patch staging:

```bash
git add -A -- '.' ':(exclude)path/one' ':(exclude)path/two'
```

The `:(exclude)` magic is the documented pathspec form (gitglossary(7)). The bare `:!path` short-form is avoided because it requires an accompanying positive pathspec to behave correctly. Multiple `--exclude` flags each expand to one `':(exclude)<p>'` argument.

This is the **enforced form** of the advisory rule in step 3a — the flag converts documentation into a flag-driven guarantee. The advisory rule remains for standalone invocations without the flag.

**Smoke test** (verify the excluded file is absent from staged set):
```bash
git add -A -- '.' ':(exclude)path/to/file.md' && git diff --cached --name-only | grep -c 'file.md' | grep -q '^0$' && echo "OK" || echo "LEAK"
```

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
3a. **Check for files that must NOT be committed yet**

Before finalising staging, check for any files that should be excluded from this commit:
- **Implementation reports** (`*.implementation.*.md`) — if the pipeline has not reached its final Step 8 commit, unstage these: `git restore --staged path/to/story.*.implementation.*.md`. When called by the pipeline orchestrator with `--exclude <path>`, the flag enforces this exclusion automatically via pathspec magic (see Flags section above) — no manual unstage needed.
- **DoD running summaries** (`*.dod.*.md`) — only commit these when finalise has completed
- **Partial QA artifacts** — gate files and QA reports are owned by QA; dev should not commit them unless explicitly part of the current work

If unsure whether a generated file should be included, err on the side of exclusion and note it in the commit message as "not yet included".
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

   ### Tracker Issue Reference

   If a `GITHUB_ISSUE` number is available (passed from the pipeline orchestrator — works for both GitHub and Bitbucket issue numbers):
   - Append ` (#{N})` to the commit subject line
   - Example: `feat(story.37.1): account recovery transparency (#42)`

   If no issue number is available (standalone invocation or document lacks `github_issue`):
   - Commit message format is unchanged
   - Do NOT prompt the user for an issue number

   The issue reference is purely additive — it must never change the commit type, scope, or description.

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

## Commit Report (always required)

After all commits are made, display a summary table in this exact format:

```
  ┌─────┬─────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │  #  │ Commit  │                                               What                                               │
  ├─────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 1   │ <hash>  │ <type(scope)> — <short description>                                                              │
  ├─────┼─────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 2   │ <hash>  │ <type(scope)> — <short description>                                                              │
  └─────┴─────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Rules for the table:
- Show one row per commit made in this session (oldest → newest)
- `#` is sequential starting at 1
- `Commit` is the 7-character short hash (from `git rev-parse --short HEAD` or `git log`)
- `What` is the commit subject line: `type(scope) — concise description` (dash `—` em-dash separator, no colon after scope)
- If only one commit was made, show a single-row table
- Always display this table — never skip it
