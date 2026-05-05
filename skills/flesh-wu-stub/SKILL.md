---
name: flesh-wu-stub
description: Flesh out a website-unification (WU) stub task IN-PLACE — fills the four template sections (Acceptance criteria, Test plan, Implementation steps, Definition of done) using the parent phase doc and any code/files referenced in the stub's frontmatter, then sets doc-status to "fleshed". After fleshing, automatically generates a create-task-format task document, creates a GitHub issue, and links both back into the WU stub frontmatter. Does not touch impl-status or flip doc-status to "reviewed" — that happens when the user runs /review-task on the generated task document.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# flesh-wu-stub

## When to use

Invoke when the user asks to flesh out a WU stub. Accepts an explicit ID (`/flesh-wu-stub WU-P3-22`), the `--next` flag, or **no argument at all** — bare `/flesh-wu-stub` is equivalent to `/flesh-wu-stub --next` and auto-selects the next unblocked stub. This is the canonical fleshing tool for the website-unification task registry; it operates in-place on stubs under `docs/tasks/migration/website-unification/`.

This skill is **separate from `create-task`**, which writes new tasks to `docs/development/tasks/` and uses different status values. Do not redirect to `create-task` for WU stubs.

## When NOT to use

- The stub already has `doc-status: fleshed` or `doc-status: reviewed`. Refuse unless the user explicitly passes `--force` or says "re-flesh"; fleshing twice silently overwrites work.
- The user wants a brand-new task that isn't already a stub. Use `create-task` for ad-hoc technical tasks, or add a new entry to `/tmp/generate_wu_stubs.py` and re-run if they want it tracked in the WU registry.
- Bulk fleshing of many stubs in one go. Each stub deserves a focused pass; bulk fleshing produces shallow specs.
- Implementation work. This skill writes specs only; it never edits code outside the stub file itself.

## Prerequisites

- The stub file exists at `docs/tasks/migration/website-unification/<WU-ID>.md`.
- The parent phase doc exists at `docs/migration/website-unification/0<phase>-phase-<phase>-*.md`.

## Inputs

| Argument | Required | Default | Notes |
|---|---|---|---|
| `WU-ID` | no | — | e.g. `WU-P3-22`. If omitted (and `--next` not passed), `--next` behaviour is used automatically. |
| `--next` | no | true (implicit) | Auto-selects the lowest-phase, lowest-sequence unblocked stub. This is the default when no argument is given. Mutually exclusive with explicit `WU-ID`. |
| `--force` | no | false | Allow re-fleshing a stub already at `fleshed` or `reviewed`. Warn first. |

## Steps

### 0. Auto-select next stub (default behaviour; also triggered by `--next`)

If the user invokes `/flesh-wu-stub` with no arguments, or explicitly passes `--next` without a `WU-ID`:

1. Glob all files matching `docs/tasks/migration/website-unification/WU-P*.md`.
2. For each file, read its frontmatter and collect: `id`, `phase`, `doc-status`, `depends-on`.
3. Filter to candidates where `doc-status: stub`.
4. For each candidate, resolve blockers: every entry in `depends-on` must have `doc-status` of `fleshed` or `reviewed` (not `stub`). Candidates where any blocker is still `stub` are ineligible.
5. Sort eligible candidates by phase ascending, then by the numeric suffix of the ID ascending (e.g. WU-P0-01 < WU-P0-02 < WU-P1-01).
6. Select the first candidate. Proceed with that ID as if the user had passed it explicitly.
7. If no eligible candidate exists, stop and report: `No eligible stubs found. All remaining stubs are either already fleshed/reviewed or blocked by unresolved depends-on.`

### 1. Locate and read the stub

Read `docs/tasks/migration/website-unification/<WU-ID>.md`. Parse its frontmatter to get:

- `phase`, `phase-name` — to find the parent phase doc
- `doc-status` — refuse to proceed if not `stub` (unless `--force`)
- `depends-on` — to summarise blocking work in the spec
- `files` — to read for context (each path is relative to the workspace root)
- `title`, `size`, `risk` — for the spec body

### 2. Read context

Read the parent phase doc (e.g. `docs/migration/website-unification/05-phase-3-monorepo-merge.md`). Pay attention to:

- The atomic-tasks table row for this WU-ID — gives the canonical Verification column
- The phase's "Critical files" list
- The phase's "Exit gate" — the Definition of done MUST tie back to relevant exit-gate items
- Any phase-specific strategy sections (e.g. "Data import strategy" for Phase 4)

For each entry in the stub's `files:` list:

- If it's a glob (e.g. `prisma/migrations/**`), use Glob to expand and read 2-3 representative files.
- If it's a single path, read the file. If the file does not exist yet (the task creates it), note this in the spec rather than failing.
- If it's a path under `goji-website/` and the file is referenced as something to migrate, read the source for context but plan the destination under `goji-system/`.

### 3. Draft the four sections

Replace the entire block:

```
## To be fleshed out via `flesh-wu-stub`:
- [ ] Acceptance criteria
- [ ] Test plan
- [ ] Implementation steps
- [ ] Definition of done
```

with four real sections. Standards:

**Acceptance criteria** — 3-7 numbered conditions, each independently testable. Use the language of "the codebase looks like X" or "command Y returns Z", not "we should". Example:

```
1. `package.json` shows `"prisma": "^7.4.0"` and `"@prisma/client": "^7.4.0"`.
2. `npx prisma generate` runs cleanly.
3. Every existing migration in `prisma/migrations/` replays cleanly on a fresh database.
```

**Test plan** — explicit commands a reviewer can run. Each step in this format: `command — expected outcome`. Reuse existing test scripts where possible (check the project's `package.json` scripts and `nx.json` targets). Do not invent new test infrastructure.

**Implementation steps** — ordered, each step small enough to be one commit. Reference exact file paths from the codebase. Where a step has a non-obvious why, add a one-line note. Keep dependencies between steps clear.

**Definition of done** — a checklist that maps to the relevant phase exit-gate items in `verification-plan.md`. Every item must be a state ("X is true"), not an action ("we did X"). Always include:

- All acceptance criteria met
- Test plan run, all passing
- Code reviewed
- For tasks with `risk: High` or `Medium`: rollback plan documented in this stub

### 4. Update frontmatter

Change `doc-status: stub` to `doc-status: fleshed`. Leave every other frontmatter field untouched (especially `impl-status` — that's the human's job to flip when starting work).

Also update the stub-status line in the body — replace the `> **Status: STUB.** Flesh out via the `flesh-wu-stub` skill before requesting review.` line with `> **Status: FLESHED.** Awaiting human review before implementation begins.`

### 5. Determine next task ID

Task IDs are shared across the entire project. Scan **both** of the following for the global maximum:
- `docs/development/tasks/` — directories matching `task.{N}.*`
- `docs/tasks/migration/website-unification/` — directories matching `task.{N}.*`

Extract all numeric {N} values, find the global maximum, and use `max + 1` as the next task ID. This ensures IDs are unique system-wide even though WU task docs live in a different tree.

Derive the kebab-case task name from the stub's **title**, not the WU ID. Distil the title down to 2-4 meaningful words in kebab-case that describe the actual work:

- "Upgrade goji-system Prisma 6.18 → 7.4; replay all migrations" → `upgrade-prisma`
- "Run `npx nx migrate 22.5.4` on goji-system; verify build green" → `nx-version-upgrade`
- "Add `platform:web` token to goji-system eslint depConstraints" → `add-platform-web-tag`
- "Audit overlap between scripts/ dirs; produce collision matrix" → `scripts-collision-audit`

Also derive the **Title-Cased Descriptive Name** used for the GitHub issue title — this is simply the kebab-case name converted to Title Case:
- `upgrade-prisma` → `Upgrade Prisma`
- `nx-version-upgrade` → `Nx Version Upgrade`
- `add-platform-web-tag` → `Add Platform Web Tag`
- `audit-sync-sites` → `Audit Sync Sites`

The WU ID (`wu-p0-01`) must **not** appear in the file or directory name — it is recorded in the frontmatter's `wu-ref:` field instead.

The task directory lives **inside the WU task tree** (not `docs/development/tasks/`):

```
docs/tasks/migration/website-unification/task.{N}.{descriptive-name}/
├── task.{N}.{descriptive-name}.md          # Main task document
└── task.{N}.plan.{descriptive-name}.md     # Co-located plan file
```

Example for WU-P0-01 ("Upgrade Prisma") with next ID 99:
- Directory: `docs/tasks/migration/website-unification/task.99.upgrade-prisma/`
- Main file: `task.99.upgrade-prisma.md`
- Plan file: `task.99.plan.upgrade-prisma.md`

### 6. Auto-generate the task document

Create the task directory and two files following the exact naming and structure rules of the `create-task` skill. Place them under `docs/tasks/migration/website-unification/task.{N}.{descriptive-name}/`.

**Do not invoke the interactive `/create-task` skill.** Generate the files directly using the WU stub's fleshed content as the source for all 11 sections. The mapping is:

| Task document section | Source in fleshed WU stub |
|---|---|
| 1. Overview | `title` frontmatter + `Deliverable` body section |
| 2. Motivation | Why the WU migration requires this; reference phase name and exit-gate item |
| 3. Technical Background | Current state derived from `files:` list + phase doc context; target state from `Deliverable` |
| 4. Scope | In-scope: `Acceptance criteria`; Out-of-scope: things explicitly not covered; Dependencies: `depends-on` |
| 5. Breaking Changes | Inferred from `risk:` + `Implementation steps`; if no breaking changes, write "None — internal migration task" |
| 6. Implementation Plan | `Implementation steps` section, grouped into phases (one phase per logical group of steps) |
| 7. Files Summary | `files:` frontmatter list + any additional files mentioned in Implementation steps |
| 8. Testing Strategy | `Test plan` section, expanded with unit/integration/performance categories |
| 9. Success Criteria | `Acceptance criteria` → Functional; `Test plan` passing → Code Quality; no breaking API changes → Migration |
| 10. Risk Assessment | `risk:` frontmatter maps to HIGH/MEDIUM/LOW; draw specifics from `Rollback plan` if present |
| 11. Rollback Plan | `Rollback plan` subsection from DoD; if absent (Low risk), write a brief 3-step generic rollback |

**Task document frontmatter**:
```yaml
---
id: task.{N}
wu-ref: {WU-ID}
title: "{title from WU stub}"
type: infrastructure
priority: {High if risk=High, Medium if risk=Medium, Low if risk=Low}
category: infrastructure
effort: {S=0.5d, M=1-2d, L=3-5d based on WU stub size}
milestone: "{phase milestone from WU stub, e.g. WU Phase 0 — Preflight}"
status: 📋 Planned
created: {today's date YYYY-MM-DD}
github_issue: null
---
```

**Plan file** (`task.{N}.plan.{descriptive-name}.md`): Contains the same Implementation steps from the WU stub, formatted as the plan file format from `create-task` (phase-by-phase with file references and exact change descriptions).

Add a cross-reference at the top of the Implementation Plan section in the task doc:
```
> Detailed implementation guide: [task.{N}.plan.{descriptive-name}.md](task.{N}.plan.{descriptive-name}.md)
> WU stub (source of truth for spec): [WU-{ID}.md](../WU-{ID}.md)
```

### 7. Update WU stub with task-doc link

Add a `task-doc:` field to the WU stub's YAML frontmatter (after `github-issue:`), pointing to the newly created task document using a path relative to the repo root:

```yaml
task-doc: docs/tasks/migration/website-unification/task.{N}.{descriptive-name}/task.{N}.{descriptive-name}.md
```

If `task-doc:` already exists in the frontmatter, overwrite it.

### 8. Create GitHub issue and link back

**Create the issue:**

```bash
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
TASK_DOC_URL="https://github.com/$REPO/blob/develop/docs/tasks/migration/website-unification/task.{N}.{descriptive-name}/task.{N}.{descriptive-name}.md"
WU_STUB_URL="https://github.com/$REPO/blob/develop/docs/tasks/migration/website-unification/{WU-ID}.md"

gh issue create \
  --title "[Task {N}] {Title-Cased-Descriptive-Name}" \
  --label "migration:website-unification" \
  --label "phase:{phase}" \
  --milestone "{milestone from WU stub frontmatter}" \
  --body "## Overview

{First paragraph of the Deliverable section from the WU stub}

## Acceptance Criteria

{Numbered acceptance criteria from the fleshed stub}

## Metadata

| Field | Value |
|-------|-------|
| WU ID | {WU-ID} |
| Phase | {phase} — {phase-name} |
| Size | {size} |
| Risk | {risk} |
| Depends on | {depends-on or —} |

## Documents

📋 [Task Document]($TASK_DOC_URL)
📄 [WU Stub Spec]($WU_STUB_URL)"
```

**If the milestone does not exist yet**, create it first:
```bash
gh api repos/{owner}/{repo}/milestones -f title="{milestone}" -f state="open"
```

**On success**: parse the issue URL (e.g. `https://github.com/org/repo/issues/N`) and:
1. Update the WU stub frontmatter: `github-issue: {url}` (replacing `null`)
2. Update the task document frontmatter: `github_issue: {N}` (the issue number)
3. Try to add to GitHub Project board and set Status=Backlog — read `project.yml` at the repo root for `github.owner` and `github.project_board_number`; if the file doesn't exist, skip this step silently.

   When `project.yml` is present, add the issue to the project and set its fields using the Projects v2 GraphQL API. Use **four steps in sequence**:

   ```bash
   # Step 1 — get project node ID + field IDs + option IDs
   gh api graphql -f query='
   {
     organization(login: "{github.owner}") {
       projectV2(number: {github.project_board_number}) {
         id
         fields(first: 20) {
           nodes {
             ... on ProjectV2SingleSelectField {
               id name
               options { id name }
             }
           }
         }
       }
     }
   }'
   # Extract: projectId
   # From the "Status" field: statusFieldId, backlogOptionId (option where name=="Backlog")
   # From the "Phase" field (if present): phaseFieldId, phase option ID matching "P{phase}-*"
   # From the "Size" field (if present): sizeFieldId, size option ID matching the stub's size (S/M/L)
   # From the "Risk" field (if present): riskFieldId, risk option ID matching the stub's risk (Low/Medium/High)

   # Step 2 — add the issue to the project; capture the item ID from the response
   ISSUE_NODE_ID=$(gh api repos/{owner}/{repo}/issues/{N} -q '.node_id')
   gh api graphql -f query='
   mutation {
     addProjectV2ItemById(input: {
       projectId: "{projectId}"
       contentId: "{ISSUE_NODE_ID}"
     }) {
       item { id }
     }
   }'
   # Extract: itemId from item.id in the response
   # IMPORTANT: use the id returned here — do NOT make a separate query to find the item

   # Step 3 — set Status = Backlog
   gh api graphql -f query='
   mutation {
     updateProjectV2ItemFieldValue(input: {
       projectId: "{projectId}"
       itemId: "{itemId}"
       fieldId: "{statusFieldId}"
       value: { singleSelectOptionId: "{backlogOptionId}" }
     }) {
       projectV2Item { id }
     }
   }'

   # Step 4 — set Phase, Size, and Risk fields (if those fields exist on the board)
   # Run one updateProjectV2ItemFieldValue mutation per field, using the IDs extracted in Step 1.
   # Skip any field that doesn't exist on this project — do not error.
   ```

   If any step fails, log a warning and continue — never halt the flesh run over a board status failure.

**On failure**: set `github-issue: null` in the WU stub, log a warning in the summary, and continue — never halt.

### 9. Regenerate `task-index.md`

After writing all stub frontmatter updates, regenerate the index in one Bash pass — do not rely on any external script:

```bash
for f in "docs/tasks/migration/website-unification"/WU-P*.md; do
  echo "===FILE:$f"
  head -20 "$f"
done
```

Parse the output to collect per-stub: `id`, `phase`, `doc-status`, `impl-status`, `size`, `risk`, `depends-on`, `github-issue`, `title`.

Sort rows by WU-ID (phase ascending, then numeric suffix ascending).

Compute phase progress counts:
- Per phase: count stubs at each `doc-status` (stub / fleshed / reviewed) and each `impl-status` (not-started / in-progress / done)
- Total row: sum across all phases

Collapse `depends-on` runs for the Blocked By column:
- Consecutive WU-IDs in the same phase → `WU-P4-01..07`
- Non-consecutive or cross-phase → comma-separated list
- Empty → `—`

For the GitHub Issue cell: use `—` if the value is `null`, empty, or missing; otherwise use the raw URL value.

Write `docs/migration/website-unification/task-index.md` with this exact structure:

```
# Task Index — Website Unification

All {N} atomic tasks across 7 phases. Each row links to the local stub file.

Each task has **two independent lifecycle axes** — see the [README status legend](./README.md#status-legend) for definitions and gating rules. The `Blocked By` column lists each task's `depends-on`; a task is unblockable while any blocker is not yet `done`.

**Project board:** [Goji System Migration](https://github.com/orgs/goji-wallet/projects/2)
**Migration docs:** [README](./README.md)

## Phase progress

| Phase | Tasks | Doc (stub / fleshed / reviewed) | Impl (not-started / in-progress / done) |
|---|---|---|---|
| {phase} | {count} | {stub} / {fleshed} / {reviewed} | {not-started} / {in-progress} / {done} |
...
| **Total** | **{N}** | **{stub} / {fleshed} / {reviewed}** | **{not-started} / {in-progress} / {done}** |

## All tasks

Sort: by Task ID (which is also rough execution order within each phase). The `Blocked By` column shows true dependency edges — start with tasks whose blockers are all `done`.

| Task ID | Phase | Title | Doc | Impl | Blocked By | Size | Risk | GitHub Issue |
|---|---|---|---|---|---|---|---|---|
| [{id}](../tasks/migration/website-unification/{filename}) | {phase} | {title} | {doc-status} | {impl-status} | {blocked-by} | {size} | {risk} | {github-issue} |
...

---

Generated from frontmatter. Regenerated automatically by `flesh-wu-stub` after each flesh run, or manually via `/wu-index`.
```

### 10. Surface summary

End your tool-call sequence by printing:

```
Fleshed:   {WU-ID} — {title}
Doc:       stub → fleshed
Task doc:  docs/tasks/migration/website-unification/task.{N}.{descriptive-name}/task.{N}.{descriptive-name}.md
Issue:     {url or "FAILED — create manually"}
Index:     docs/migration/website-unification/task-index.md updated
Impl:      not-started (unchanged)

Next: Run /review-task on the task document to complete the QA-review gate.
```

If `--next` was used **or no argument was given**, prefix with: `Auto-selected: {WU-ID} (next unblocked stub)`

## Anti-patterns

- **Don't invent dependencies.** If the stub says `depends-on: [WU-P3-02]`, don't add WU-P3-01 to the test plan because "it might also be needed". The `depends-on` array is authoritative; if it's wrong, fix the stub frontmatter via the regenerator (`/tmp/generate_wu_stubs.py`), not by working around it.
- **Don't write code as part of the spec.** The Implementation steps section names files and describes changes. Actual code goes in the implementation phase, not the spec.
- **Don't add a "Risks" section** unless `risk: High`. The frontmatter already records risk level; restating it in the body is noise. For `risk: High` tasks, add a brief "Rollback" subsection under Definition of done.
- **Don't bulk-flesh.** If asked to flesh several stubs, do them one at a time with full context for each. Bulk fleshing produces specs that all look alike and miss task-specific nuance.
- **Don't touch `impl-status`.** That field flips only when work actually starts; the fleshing pass leaves it at `not-started`.
- **Don't flip `doc-status` past `fleshed`.** The skill sets `doc-status: fleshed` and stops there. The `reviewed` transition happens when the user runs `/review-task` on the generated task document — not before.
- **Don't block on `project.yml` absence.** If the file doesn't exist, skip the GitHub Project board step silently. Log a warning in the summary but never halt.
- **Don't duplicate the interactive create-task workflow.** This skill generates the task document directly from the WU stub. Do not invoke `/create-task` interactively — that would re-prompt the user for content they already provided.

## Output

Single-message summary at the end (the Step 10 template, reproduced here for reference):

```
Auto-selected: <WU-ID> (next unblocked stub)   ← only when --next
Fleshed:   <WU-ID> — <title>
Doc:       stub → fleshed
Task doc:  docs/tasks/migration/website-unification/task.<N>.<descriptive-name>/task.<N>.<descriptive-name>.md
Issue:     <url>  (or "FAILED — create manually")
Index:     docs/migration/website-unification/task-index.md updated
Impl:      not-started (unchanged)

Next: Run /review-task on the task document to complete the QA-review gate.
```

If `--force` was used, prefix with `RE-FLESHED (forced)`.
