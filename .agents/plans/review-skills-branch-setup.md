# Plan: Branch-Prompt Step 0 for `/review-story`, `/review-task`, `/review-epic`

## Context

Today `/review-story`, `/review-task`, `/review-epic` mutate documents (frontmatter status, Change Log, review report files, Jira/GitHub sync) on whatever branch the user happens to be sitting on — often `develop` or `main`. This pollutes base branches with review artifacts and makes the work hard to PR cleanly.

`/develop-story` and `/develop-task` already solve the branch problem in **Phase 0d + Step 1** (`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `…step-1-create-branch.md`):
- Phase 0d uses `AskUserQuestion` to pick a base branch (auto-derived recommended option first).
- Step 1a (develop-story only) ensures the epic branch `feature/epic.{N}.{name}` exists.
- Step 1b stashes work, invokes `/create-branch`, restores.

We want the three review skills to use the **same methodology**, exposed as a single shared resource so it stays consistent.

## Approach

Extract the branch-setup logic into a new shared resource and call it from a new **Step 0a** at the top of each review skill — before any file mutation, Jira sync, or status change.

### New shared resource

**File:** `shared/resources/review-pipeline-step-0a-branch-setup.md`

Contents:
1. **Detect current branch** (`git branch --show-current`).
2. **Auto-skip condition**: if current branch matches the doc-appropriate pattern, log "✅ Already on matching branch — skipping branch prompt" and return.
   - review-story: `feature/story.{epic}.{story}.*` OR `feature/epic.{epic}.*` (epic branch is acceptable)
   - review-task: `feature/task.{id}.*`
   - review-epic: `feature/epic.{N}.*`
3. **Prompt via `AskUserQuestion`** (reusing the Phase 0d pattern — recommended option first):
   - review-story: two questions when epic branch missing (mirrors develop-story Q1.1 + Q1.2): create `feature/epic.{N}.{slug}` from `develop`? + story branch base. When epic branch exists: just confirm base (`{EPIC_BRANCH}` recommended / `develop` / Other).
   - review-task: one question — base branch (`develop` recommended / current `feature/*` / Other).
   - review-epic: one question — create `feature/epic.{N}.{slug}` from `develop`? (Recommended Yes / "Stay on current branch" / Abort).
4. **Stash, invoke `/create-branch`, restore** — copy the stash/restore block from `develop-pipeline-step-1-create-branch.md` §"Step 1b" verbatim (with `review-{story|task|epic}` stash message).
5. **For review-story with missing epic branch**: run the Case-A epic-branch creation block from `develop-pipeline-step-1-create-branch.md` §"Step 1a" (guarded local create + guarded push) **before** invoking `/create-branch` for the story branch.
6. **Failure handling**: any `git`/`/create-branch` failure → HALT with error; do not proceed to review.
7. **No pipeline lock file** — review is read-mostly compared to develop; the lock is develop-pipeline-specific.

### Skill edits

For each of the three skills, insert a new **Step 0a — Branch Setup** ahead of all current steps, after input resolution but before any document mutation.

| Skill | File | Insert point |
|---|---|---|
| review-story | `skills/review-story/SKILL.md` | New `### Step 0a` between line 459 (end of "Step 0: Determine Mode and Output Format") and line 460 (`### Step 1: Load Configuration and Context`). Resolve `EPIC_NUM`/`EPIC_SLUG`/`EPIC_BRANCH` here (mirror develop-pipeline-step-0 §0a). |
| review-task | `skills/review-task/SKILL.md` | New `### Step 0a` between line 352 (end of "Step 0: Determine Output Format") and line 353 (`### Step 1: Load Configuration and Context`). |
| review-epic | `skills/review-epic/SKILL.md` | New `### Step 0a` between line 99 (end of "Step 0 — Determine Output Mode") and line 100 (`### Step 1 — Load Epic & Reference Documents`). |

Each skill's Step 0a body is a short reference + invocation: "Execute the protocol in `references/review-pipeline-step-0a-branch-setup.md` (shared spec at `shared/resources/review-pipeline-step-0a-branch-setup.md`). Variables exposed to subsequent steps: `BRANCH_NAME`, `BASE_BRANCH`, `EPIC_BRANCH` (story/epic only)."

### Bundling

After authoring the new shared resource, run `npm run bundle` so each skill's `references/` directory gets a self-contained copy and the in-skill `.md` path is rewritten from `shared/resources/...` → `references/...`. Required before commit per `AGENTS.md`.

### Develop-* re-entry safety

No edits needed in `develop-story`/`develop-task`. When they invoke `/review-story` or `/review-task` in Step 2, the pipeline has already created the feature branch in Step 1, so the new Step 0a auto-skip condition fires silently.

## Critical files

**New:**
- `shared/resources/review-pipeline-step-0a-branch-setup.md`

**Modified:**
- `skills/review-story/SKILL.md` (insert Step 0a, +EPIC_BRANCH resolution)
- `skills/review-task/SKILL.md` (insert Step 0a)
- `skills/review-epic/SKILL.md` (insert Step 0a, +EPIC_NUM/SLUG resolution)
- `skills/review-story/references/review-pipeline-step-0a-branch-setup.md` (bundle output)
- `skills/review-task/references/review-pipeline-step-0a-branch-setup.md` (bundle output)
- `skills/review-epic/references/review-pipeline-step-0a-branch-setup.md` (bundle output)

## Reused functions / patterns

- `AskUserQuestion` prompt pattern — copied from `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0d Q1.
- Epic-branch creation block (Case A) — copied from `shared/resources/develop-pipeline-step-1-create-branch.md` §"Step 1a Case A".
- Stash/restore around `/create-branch` — copied from same file §"Step 1b" + "Restore the Stash".
- `/create-branch` skill — invoked verbatim; no edits to that skill.

## Verification

1. **Standalone review-task on `develop`**: `git checkout develop && /review-task docs/tasks/task.X.foo/task.X.foo.md` → expect `AskUserQuestion` for base branch, then `/create-branch` runs, then review proceeds on `feature/task.X.foo`.
2. **Standalone review-story on `develop`, epic branch missing**: expect two-question prompt (create epic branch + story branch base), epic branch created from develop, story branch from epic branch, then review.
3. **Standalone review-epic on `develop`**: expect single create-epic-branch prompt; on Yes, `feature/epic.{N}.{slug}` created from develop, review proceeds.
4. **Auto-skip (pipeline re-entry)**: `git checkout feature/story.X.Y.foo && /review-story …` → log line "✅ Already on matching branch — skipping branch prompt", no prompt.
5. **develop-story end-to-end**: run `/develop-story` on a story whose epic branch doesn't exist; confirm review-story Step 0a auto-skips (Step 1 already created the branch) and the existing pipeline behavior is unchanged.
6. **Bundle check**: `npm run bundle` is idempotent; re-running produces no diff. `git diff` shows `references/review-pipeline-step-0a-branch-setup.md` mirrors the shared file with path rewrites applied.
7. **No new packaged zips committed**: confirm `.zip` files remain gitignored.
