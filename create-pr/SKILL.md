---
name: create-pr
description: Create pull requests following project conventions. This skill should be used when ready to submit code for review. Automatically commits any uncommitted changes using /commit-changes before creating the PR. Prompts for target branch (typically develop), pushes the current branch, generates a PR description using the project template, and opens a PR using the GitHub CLI.
---

# Create Pull Request

This skill creates pull requests following the conventions defined in `docs/development/git-strategy.md`.

## When to Use This Skill

Use this skill when:

- Code is ready for review after implementing a feature or fix
- Need to open a PR with a properly formatted description
- Want to interactively select the correct target branch (typically `develop`)
- Have uncommitted changes that should be committed before creating the PR (this skill will automatically commit them using `/commit-changes`)

## Prerequisites

- **GitHub CLI (`gh`)** must be installed and authenticated
- Current branch must have commits to push (or uncommitted changes that can be committed)

## Target Branch Selection

**CRITICAL**: Always ask the user which branch to merge into rather than auto-detecting.

Common Gitflow patterns:

| Current Branch | Typical Target | Notes                                         |
| -------------- | -------------- | --------------------------------------------- |
| `feature/*`    | `develop`      | Feature branches merge to develop             |
| `fix/*`        | `develop`      | Bug fixes merge to develop                    |
| `hotfix/*`     | `main`         | Hotfixes merge to main (and later to develop) |
| `release/*`    | `main`         | Releases merge to main (and later to develop) |
| Other          | `develop`      | Default recommendation                        |

> [!IMPORTANT]
> For `hotfix/*` and `release/*` branches, after merging to `main`, a second PR should be created to merge back into `develop`.

## Workflow

**IMPORTANT**: This skill performs a complete workflow from uncommitted changes to PR creation:
1. Commits any uncommitted changes (if present)
2. Asks user for target branch
3. Pushes branch to remote
4. Generates PR title and description
5. Creates the actual PR using `gh pr create`
6. Returns the PR URL to the user

**Do not stop after Step 1** - all steps must be completed to finish the PR creation process.

### Step 1: Verify Prerequisites and Commit Changes

Check that the environment is ready:

```bash
# Verify gh CLI is available and authenticated
gh auth status

# Check current branch
git branch --show-current

# Check for uncommitted changes
git status --porcelain
```

If there are uncommitted changes:

1. **Automatically invoke the `/commit-changes` skill** to commit all changes
2. **After commits are complete, IMMEDIATELY CONTINUE with Step 2** - Do not stop after committing

**CRITICAL**: The commit step is just preparation. After `/commit-changes` completes successfully, you MUST continue with Steps 2-7 to actually create the PR. Do not stop after committing - that's only the first part of this skill's job.

### Step 2: Ask User for Target Branch

**REQUIRED**: Use AskUserQuestion to confirm the target branch.

```
Question: Which branch should this PR target?

Options:
1. develop (Recommended) - For features, fixes, and regular development
2. main - For hotfixes and releases only
```

**Recommended default**: `develop` for most PRs

Parse the current branch name to provide context:

```bash
CURRENT_BRANCH=$(git branch --show-current)

# Suggest target based on branch prefix
case "$CURRENT_BRANCH" in
  hotfix/*|release/*)
    echo "Note: This appears to be a $CURRENT_BRANCH branch, which typically targets 'main'"
    ;;
  feature/*|fix/*)
    echo "Note: This appears to be a $CURRENT_BRANCH branch, which typically targets 'develop'"
    ;;
esac
```

### Step 3: Push Branch to Remote

Ensure the branch is pushed with tracking:

```bash
git push -u origin $(git branch --show-current)
```

### Step 4: Generate PR Title

Extract a meaningful title from the branch name or commits:

**From branch name:**

```
feature/story.180.3.quick-re-search-functionality
 → feat(story.180.3): quick re-search functionality
```

**From latest commit:**

```bash
git log -1 --pretty=format:"%s"
```

Prefer using the conventional commit format: `type(scope): description`

### Step 5: Generate PR Description

Use the project's PR template:

```markdown
## Summary

Brief description of changes and motivation.

## Changes

- List of specific changes made
- Another change item

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes

List any breaking changes (if applicable)

## Related Issues

Closes #123
```

**Auto-populate from commits:**

```bash
# Get commit messages for the PR body
git log origin/develop..HEAD --pretty=format:"- %s"
```

### Step 6: Create the Pull Request

Use the GitHub CLI to create the PR:

```bash
gh pr create \
  --base develop \
  --title "feat(story.180.3): quick re-search functionality" \
  --body "## Summary

Implements quick re-search functionality for recent searches.

## Changes

$(git log origin/develop..HEAD --pretty=format:'- %s')

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes

None

## Related Issues

Part of Epic 180"
```

### Step 7: Output Result

Provide the user with the PR URL and summary:

```
✅ Pull Request Created!

   Title: feat(story.180.3): quick re-search functionality
   URL: https://github.com/org/repo/pull/123
   Base: develop ← feature/story.180.3.quick-re-search-functionality

Next steps:
- Review the PR description on GitHub
- Request reviewers
- Monitor CI checks
```

## Interactive Mode

**REQUIRED**: Always ask for target branch first (Step 2).

If additional information is missing, prompt the user:

1. **Target branch (REQUIRED):**

   ```
   Which branch should this PR target?
   - develop (Recommended) - For features, fixes, and regular development
   - main - For hotfixes and releases only
   ```

2. **No meaningful title detected:**

   ```
   Could not extract a PR title from the branch name.
   Please provide a title (conventional commit format preferred):
   ```

3. **Missing summary:**

   ```
   Please provide a brief summary of the changes for the PR description:
   ```

4. **Related issues:**
   ```
   Are there any related GitHub issues to link? (e.g., #123, or press Enter to skip):
   ```

## PR Templates by Branch Type

### Feature PR

```markdown
## Summary

Implements [feature name] as part of [Epic/Story reference].

## Changes

- Specific change 1
- Specific change 2
- Tests for new functionality

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Breaking Changes

None

## Related Issues

Part of Epic XXX / Story XXX
```

### Hotfix PR

```markdown
## Summary

🚨 **HOTFIX**: [Brief description of the critical fix]

## Problem

Describe the production issue being fixed.

## Solution

Describe the fix implemented.

## Changes

- Specific change 1
- Specific change 2

## Testing

- [ ] Verified fix resolves the issue
- [ ] Regression tests pass
- [ ] Tested in staging environment

## Deployment Notes

Any special deployment considerations.

## Related Issues

Fixes #XXX
```

### Release PR

```markdown
## Summary

🚀 **Release v1.X.X**

## Included Features

- Feature 1 (Story XXX)
- Feature 2 (Story XXX)

## Bug Fixes

- Fix 1 (#XXX)
- Fix 2 (#XXX)

## Breaking Changes

List any breaking changes.

## Deployment Checklist

- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] All CI checks pass
- [ ] Release notes prepared

## Post-Merge Actions

- [ ] Tag the release on main
- [ ] Merge back to develop
- [ ] Notify stakeholders
```

## Error Handling

### gh CLI Not Authenticated

```
Error: gh CLI is not authenticated.

To authenticate, run:
  gh auth login

Then retry /create-pr
```

### No Commits to Push

```
Error: Current branch has no commits ahead of the target branch.

Make some changes and commit them first using /commit-changes.
```

### Branch Not Pushed

If push fails:

1. Check for upstream issues
2. Suggest force-push if branch exists but diverged (with caution)

### PR Already Exists

```
A pull request already exists for this branch.

Existing PR: https://github.com/org/repo/pull/123

Options:
- View existing PR
- Update PR description
- Close existing and create new
```

## Options

| Flag         | Description        | Example                             |
| ------------ | ------------------ | ----------------------------------- |
| `--draft`    | Create as draft PR | `/create-pr --draft`                |
| `--title`    | Override PR title  | `/create-pr --title "custom title"` |
| `--body`     | Override PR body   | `/create-pr --body "custom body"`   |
| `--reviewer` | Add reviewers      | `/create-pr --reviewer @username`   |
| `--label`    | Add labels         | `/create-pr --label "feature"`      |

## Examples

### Basic Feature PR

```
Input: /create-pr

(If uncommitted changes detected, automatically invokes /commit-changes first)

Prompt: Which branch should this PR target?
        - develop (Recommended)
        - main

User selects: develop

Output:
  ✅ Pull Request Created!

     Title: feat(story.180.3): quick re-search functionality
     URL: https://github.com/goji-wallet/goji-system/pull/456
     Base: develop ← feature/story.180.3.quick-re-search-functionality
```

### Draft Hotfix PR

```
Input: /create-pr --draft

Output:
  ✅ Draft Pull Request Created!

     Title: fix(payment): resolve timeout in transaction processing
     URL: https://github.com/goji-wallet/goji-system/pull/457
     Base: main ← hotfix/v1.2.1
     Status: Draft (not ready for review)
```

### PR with Reviewers

```
Input: /create-pr --reviewer @alice --reviewer @bob

Output:
  ✅ Pull Request Created!

     Title: feat(auth): implement OAuth2 integration
     URL: https://github.com/goji-wallet/goji-system/pull/458
     Reviewers: @alice, @bob
```

## Related Skills

- `/create-branch` - Create a properly named branch before starting work
- `/commit-changes` - Automatically invoked by this skill if there are uncommitted changes
- `/develop` - Full story implementation workflow

## References

- [Git Strategy](file:///docs/development/git-strategy.md) - PR requirements and templates
- [GitHub CLI Documentation](https://cli.github.com/manual/gh_pr_create) - `gh pr create` options
