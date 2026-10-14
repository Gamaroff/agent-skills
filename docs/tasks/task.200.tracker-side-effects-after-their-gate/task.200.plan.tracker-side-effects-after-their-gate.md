---
id: task.200.plan
title: "Implementation Plan: Tracker side effects after their gate"
type: plan
task-ref: task.200.tracker-side-effects-after-their-gate.md
---

# Implementation Plan: Tracker side effects after their gate

> Requirements and success criteria: [task.200.tracker-side-effects-after-their-gate.md](task.200.tracker-side-effects-after-their-gate.md)

## Overview

Build a pure document-link-branch resolver and move all nine derivations onto it, then reorder
`develop-bug` so its tracker writes run only after `review-bug` returns READY TO FIX. Re-grep every
`path:line` below before editing: line numbers are as of `develop` at `6ac5d62d`.

## Phase-by-Phase Implementation Guide

### Phase 1: The resolver

**New file** `shared/resources/doc-link-branch.js`, CommonJS, no `shared/` dependency, `#!/usr/bin/env node`:

```js
// The work item a document belongs to, from its filename. Bug ids keep their parent prefix.
function workItemOf(docPath) {
  const base = path.basename(String(docPath)).replace(/\.md$/, "");
  const m =
    base.match(/^(story\.\d+\.\d+\.bug\.\d+)\./) ||
    base.match(/^(task\.\d+\.bug\.\d+)\./) ||
    base.match(/^(bug\.\d+)\./) ||
    base.match(/^(story\.\d+\.\d+)\./) ||
    base.match(/^(task\.\d+)\./) ||
    base.match(/^(epic\.\d+)\./);
  return m ? m[1] : null;
}

// True when the branch names this work item: the id is followed by "." or the end of the
// last path segment, so task.20 never matches feature/task.200.x. A story also matches its
// epic's integration branch epic/{E}.<name>.
function branchNamesWorkItem(branch, docPath) { … }

function resolveDocLinkBranch({ explicit, configured, upstream, defaultBranch, docPath }) {
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  if (configured) return configured;
  if (upstream && branchNamesWorkItem(upstream, docPath)) return upstream;
  return defaultBranch;
}
```

The CLI (`--doc <path> [--explicit <b>] [--default <b>]`) reads the upstream with
`git rev-parse --abbrev-ref --symbolic-full-name @{u}` and strips the remote name, exactly as
`jira-sync.js` `stripRemotePrefix` does (`shared/resources/jira-sync.js:464`). Without `--default`
it uses `gh repo view --json defaultBranchRef` and falls back to `develop`, which is the GitHub sites'
current fallback. It prints one line and exits 0, or exits 2 on usage.

The epic integration branch is `epic/{n}.{name}` by default (`skills/create-branch/SKILL.md:410`), but
its pattern is configurable (`branchPattern: "epic/{n}.{slug}"`, `skills/create-branch/SKILL.md:385`) and
an epic may name its own branch. Match on the epic number in the last path segment, and read the
epic's frontmatter branch name when one is declared, rather than hard-coding the `epic/` prefix.

### Phase 2: Migrate the link sites

Each GitHub site replaces two lines:

```bash
# before (skills/ensure-task-github-issue/SKILL.md:103-104)
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo develop)
DOC_BRANCH=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | sed 's|^[^/]*/||')
DOC_URL="https://github.com/$REPO/blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/${TASK_RELATIVE_PATH}"

# after
DOC_BRANCH=$(command node .agents/skills/ensure-task-github-issue/references/doc-link-branch.js --doc "$TASK_RELATIVE_PATH")
DOC_URL="https://github.com/$REPO/blob/${DOC_BRANCH}/${TASK_RELATIVE_PATH}"
```

`sync-github-story` keeps its caller-supplied `DOC_BRANCH`: pass it as `--explicit "${DOC_BRANCH:-}"`.
Check whether `DEFAULT_BRANCH` is read again later in each file before deleting its line.

`jira-sync.js` `resolveDocBranch(explicit, repoRoot)` becomes `resolveDocBranch(explicit, repoRoot, docPath)`
and calls `resolveDocLinkBranch({ explicit, configured: loadDocBranchSetting(repoRoot), upstream:
getCurrentBranchUpstream(), defaultBranch: gitDefaultBranch(), docPath })`. A call without `docPath` keeps
today's behaviour (upstream used), so an unmigrated caller cannot regress. Pass the path from
all four `sync-jira-{epic,story,task,bug}` scripts (`lib.resolveDocBranch(args.docBranch)`, e.g.
`skills/sync-jira-task/scripts/sync-jira-task.js:543`).

Population test: `git grep -n 'DOC_BRANCH=.*@{u}' -- 'skills/*/SKILL.md'` must be empty, and
`git grep -c 'doc-link-branch.js --doc'` over the same files must be ≥ 8.

### Phase 3: develop-bug gate order

1. `skills/develop-bug/SKILL.md` Step 1: delete the "Ensure a tracker issue" bullet and the "Signal Work
   Started" bullet. The lock bullet writes `"tracker_issue": ""`. Keep the historical paragraph about
   bug cards, moved to Step 2b.
2. New `### Step 2b: Open the Tracker Issue`, after READY TO FIX: the moved bullets, then
   `jq --arg t "$TRACKER_ISSUE" '.tracker_issue = $t'` on the lock (mktemp + mv), then Signal Work Started.
3. HALT rows at `skills/develop-bug/SKILL.md:291-293`: each runs the cleanup block before halting:

   ```bash
   BASE="{Q2_answer}"; BR=$(git branch --show-current)
   if git diff --name-only "$BASE"...HEAD | grep -qv '^{bug-directory}/'; then
     echo "Branch $BR has commits outside the bug directory; kept."
   else
     TIP=$(git rev-parse HEAD); git checkout -q "$BASE"
     git branch -D "$BR" && echo "Deleted $BR (was $TIP)."
     git ls-remote --exit-code --heads origin "$BR" >/dev/null 2>&1 && git push -q origin --delete "$BR"
   fi
   ```

   Uncommitted bug-directory edits from `review-bug` validate-and-apply must be committed or stashed
   first. Decide which, and say so in the HALT message.
4. Resume contract: a `develop-bug` lock past Step 2 with `tracker_issue: ""` re-enters at Step 2b.

### Phase 4: create-bug-report

Add to the Evidence / Related Files guidance: a grep that enumerates affected sites must match the
defective primary branch, not a line that also appears on correct files (a fallback, a comment). Record
the grep beside the list, so `review-bug`'s stale scan can re-run it.

## Key Patterns and References

- `stripRemotePrefix` and `loadDocBranchSetting` in `shared/resources/jira-sync.js`: reuse, do not copy.
- `grant-qa-cycles.sh` writes the lock with mktemp + mv: copy that shape for Step 2b's update.
- Cite the new script from `SKILL.md` as `.agents/skills/<skill>/references/doc-link-branch.js` so the bundler reaches it.

## Testing Approach

- `shared/resources/tests/doc-link-branch.test.mjs`: table-driven over `resolveDocLinkBranch`, plus the CLI in a
  fixture repo with an upstream set (`git init`, `git remote add`, `git branch -u`).
- Mutation-prove: drop the `branchNamesWorkItem` check (unrelated branch test goes red); drop the `.`/end anchor
  (`task.20` control goes red); move `ensure-bug-*` back into Step 1 (step-order test goes red).
