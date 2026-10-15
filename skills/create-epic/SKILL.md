---
name: create-epic
description: Create single epic for medium-sized brownfield enhancements (1-3 stories). Use when enhancement follows existing patterns, has minimal architectural changes, and manageable integration complexity.
invokes: [mermaid-architect]
---

# Brownfield Epic Creation

## When to Use This Skill

Activate when user needs:

- **Medium-sized** brownfield enhancement (1-3 stories)
- No significant architectural changes
- Follows existing project patterns
- Minimal integration complexity
- Low risk to existing system

**Natural triggers:**

- "Add [medium feature] to existing app"
- "Create epic for [enhancement]"
- "Need 2-3 stories for [feature]"

**Decision Tree:**

- **1-3 stories, follows patterns, low risk** → Use THIS skill
- **4+ stories, architectural changes** → Use `create-prd`
- **Single session, isolated** → Use `brownfield-story`

## ⚠️ Documentation-Only Scope — Do NOT Implement

This skill produces **the epic document only** (plus the parent PRD's regenerated epics index). It MUST NOT begin implementing the stories the epic describes, nor scaffold any source code.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside the epic's directory (and the epics-index side effect below)
- ❌ Creating story files (that is `create-story`'s job, invoked separately)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Auto-invoking `create-story`, `develop-story`, or any implementation skill on completion

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The epic file `${PRD_ROOT}/{domain}/prd.{P}.{feature}/epics/epic.{P}.{E}.{name}/epic.{P}.{E}.{name}.md`
- ✅ The parent PRD's `<!-- epics-index -->` block, regenerated (see *Update the Parent PRD's Epic Index*)
- ✅ Tracker issue creation (GitHub/Jira issue for the epic itself) — **only after explicit opt-in** via the prompt in the *Offer Tracker Sync* step; never created unprompted

**If the user asks to "create the epic and start the first story"**: create the epic doc, then STOP and explicitly hand off — tell user to invoke `/create-story` as a separate step. Do not chain.

## Prerequisites

**Project context required:**

- Project purpose and current functionality
- Existing technology stack
- Current architecture patterns
- Integration points

**Enhancement clarity:**

- Enhancement clearly defined and scoped
- Impact on existing functionality assessed
- Integration points identified
- Success criteria established

**Epic Numbering (CRITICAL):**

- Every epic is numbered **within its parent PRD**: `epic.{P}.{E}`, where `P` is the PRD's number and
  `E` counts epics in that PRD (`epic.1.1`, `epic.1.2`, `epic.2.1`). The PRD's "Epic 2" is the file
  `epic.{P}.2` — one number everywhere.
- A parent PRD is **mandatory**. There is no PRD-less epic: with no PRD there is no `P`.
- `E` is allocated by `doc-id.js next epic` in *Discover Parent PRD* below — never picked by hand,
  and never from a registry (the global epic registry is retired).

## File Naming Convention

**Format**: `epic.{P}.{E}.{descriptive-name}.md`

**Examples** (PRD 1, its first and second epic):

- `epic.1.1.feature-notifications.md`
- `epic.1.2.payment-integration.md`

**Location**: `${PRD_ROOT}/{domain}/prd.{P}.{feature}/epics/epic.{P}.{E}.{descriptive-name}/` (Directory name must exactly match file name). Resolve `${PRD_ROOT}` from `skills-config.yaml` via `references/resolve-paths.sh` (default: `docs/prd`).

**Naming Rules**:

- Use DOTS (.) for structural separators
- Use hyphens (-) within descriptive names; the name begins with a letter
- ✅ Correct: `epic.1.3.auto-hide`
- ❌ Wrong: `epic-1-3-auto-hide`, `epic.3.auto-hide` (no PRD number), `epic.1.3.5.x` (no decimal epics)

## Discover Parent PRD

Before writing the epic file, resolve the parent PRD — it gives the epic both its number and a real, navigable reference back to its source spec (stakeholders open the epic and click straight through to the PRD). Resolve `${PRD_ROOT}` from `references/resolve-paths.sh` first (default `docs/prd`).

Run this block from the repository root. It finds the PRD — a `prd.{P}.{feature}/` directory holding
its own `prd.{P}.{feature}.md` under `${PRD_ROOT}/{domain}/` — reads `P` from it, and allocates `E`
with `references/doc-id.js`:

```bash
# create-epic — Discover Parent PRD and allocate the epic id (task 205)
# INPUTS: DOMAIN (the epic's domain directory under the PRD root), and — only when the domain holds
# several PRDs — PRD_DIR, the one the user chose (exit 3 below asks). PRD_ROOT is resolved HERE.
DOC_ID=.agents/skills/create-epic/references/doc-id.js
source .agents/skills/create-epic/references/resolve-paths.sh || exit 1
: "${DOMAIN:?bind DOMAIN to the domain directory of the epic}"
if [ -z "${PRD_DIR:-}" ]; then
  CANDIDATES=""
  for d in "${PRD_ROOT}/${DOMAIN}"/prd.*/; do
    [ -d "$d" ] || continue
    d=${d%/}; b=${d##*/}
    [ -f "$d/$b.md" ] || continue
    [ -n "$(command node "$DOC_ID" parse "$b" --json | jq -r 'select(.kind == "prd" and .artifact == null) | .prd')" ] || continue
    CANDIDATES="${CANDIDATES}${d}
"
  done
  COUNT=$(printf '%s' "$CANDIDATES" | grep -c .)
  case "$COUNT" in
    0) echo "❌ No parent PRD found under ${PRD_ROOT}/${DOMAIN}/. Every epic is numbered within a PRD (epic.{P}.{E}). Run /create-prd first, then re-run /create-epic."
       exit 1 ;;
    1) PRD_DIR=$(printf '%s' "$CANDIDATES" | head -1) ;;
    *) echo "ASK: ${COUNT} PRDs under ${PRD_ROOT}/${DOMAIN}/ — ask the user which is the parent, bind PRD_DIR to it, and re-run:"
       printf '%s' "$CANDIDATES"
       exit 3 ;;
  esac
fi
PRD_STEM=${PRD_DIR##*/}
PRD_SOURCE_PATH="${PRD_DIR}/${PRD_STEM}.md"
P=$(command node "$DOC_ID" parse "$PRD_STEM" --json | jq -r '.prd // empty')
[ -n "$P" ] || { echo "❌ ${PRD_DIR} is not a prd.{P}.{feature} directory"; exit 1; }
# The PRD's own prd_number, when it carries one, must agree with its directory.
FM_P=$(command node -e '
  const d = require(process.argv[1]);
  console.log(d.frontmatterField(require("fs").readFileSync(process.argv[2], "utf8"), "prd_number"));
' "$PWD/$DOC_ID" "$PRD_SOURCE_PATH")
[ -z "$FM_P" ] || [ "$FM_P" = "$P" ] \
  || { echo "❌ ${PRD_SOURCE_PATH} says prd_number: ${FM_P}, its directory says ${P} — fix the PRD first"; exit 1; }
NEXT=$(command node "$DOC_ID" next epic --prd-dir "$PRD_DIR" --json) \
  || { echo "❌ doc-id next epic: $(printf '%s' "$NEXT" | jq -r '.detail // .reason')"; exit 1; }
E=$(printf '%s' "$NEXT" | jq -r '.next')
echo "PRD_SOURCE_PATH=${PRD_SOURCE_PATH} P=${P} E=${E}"
```

- **Exit 1** — no parent PRD (or a malformed one): **HALT** with the message. Do not invent a PRD,
  and do not write the epic. A small enhancement needs a PRD first; `/create-prd` makes one.
- **Exit 3** — several PRDs in the domain: ask the user which is the parent via `AskUserQuestion`,
  bind `PRD_DIR` to that directory, and run the block again.
- **Exit 0** — the epic is `epic.{P}.{E}.{name}` in `${PRD_DIR}/epics/`. Use `PRD_SOURCE_PATH` for the
  `prd_source:` frontmatter field — a real repo-relative path, never a placeholder.

Then build `PRD_URL` — a full web URL for the body link that works in any markdown renderer (GitHub, Bitbucket, VS Code preview):

```bash
source references/resolve-platform.sh || exit 1   # sets VCS=github|bitbucket

# Resolve current branch; fall back to the repo default when HEAD is detached
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$CURRENT_BRANCH" = "HEAD" ] || [ -z "$CURRENT_BRANCH" ]; then
  if [ "$VCS" = "github" ]; then
    BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo develop)
  else
    BRANCH=$(git remote show origin 2>/dev/null | awk '/HEAD branch/{print $NF}' || echo main)
  fi
else
  BRANCH="$CURRENT_BRANCH"
fi

# Build the full URL
if [ "$VCS" = "github" ]; then
  REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
  PRD_URL="https://github.com/${REPO}/blob/${BRANCH}/${PRD_SOURCE_PATH}"
else
  # Normalise SSH or credentialed HTTPS remote to a plain HTTPS base URL
  REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
  BB_BASE=$(echo "$REMOTE" \
    | sed -e 's|git@bitbucket\.org:|https://bitbucket.org/|' \
          -e 's|https://[^@]*@bitbucket\.org/|https://bitbucket.org/|' \
          -e 's|\.git$||')
  PRD_URL="${BB_BASE}/src/${BRANCH}/${PRD_SOURCE_PATH}"
fi
```

## Epic Structure

```markdown
---
prd_number: P
epic_number: E
title: "[Enhancement Name]"
type: epic
description: "[One-sentence summary of what this epic delivers]"
tags: []
domain: "[Domain]"
status: "📋 Planned"
priority: "Critical | High | Medium | Low"
estimated_stories: N
created: YYYY-MM-DD
target_completion: YYYY-MM-DD
prd_source: "{{PRD_SOURCE_PATH}}"   # repo-relative path to the parent PRD (required) — from Discover Parent PRD
---

# [Epic P.E] {{Enhancement Name}} - Brownfield Enhancement

## Epic Goal

{{1-2 sentences: what accomplishes, why adds value}}

## Epic Description

**Source PRD**: [View document]({{PRD_URL}})
<!-- PRD_URL is a full https:// URL resolved in Discover Parent PRD. Every epic has a parent PRD, so this line is always present. -->

**Existing System Context:**

- Current relevant functionality: {{brief description}}
- Technology stack: {{relevant technologies}}
- Integration points: {{where connects to existing}}

**Enhancement Details:**

- What's being added/changed: {{clear description}}
- How it integrates: {{integration approach}}
- Success criteria: {{measurable outcomes}}

## Stories Breakdown

**Epic Story Guidelines:**

- **User-Value First:** Organize by user value, not technical layers.
- **No Forward Dependencies:** Stories must NOT depend on future stories within the epic. Each must be independently completable.
- **Incremental Technical Setup:** Create database entities or infrastructure ONLY in the story that first needs them.

### Stories Overview

| Story | Status         | Priority | Description                     |
| ----- | -------------- | -------- | ------------------------------- |
| P.E.1 | ❌ Not Started | High     | {{Title and brief description}} |
| P.E.2 | ❌ Not Started | Medium   | {{Title and brief description}} |
| P.E.3 | ❌ Not Started | Low      | {{Title and brief description}} |

### Story P.E.1: {{story_title}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

_(Repeat structure for Stories P.E.2 and P.E.3)_

**Status Indicators**:

- ❌ Not Started
- 🔄 In Progress
- ⚠️ Blocked
- ✅ Complete

## Compatibility Requirements

- [ ] Existing APIs remain unchanged
- [ ] Database schema changes backward compatible
- [ ] UI changes follow existing patterns
- [ ] Performance impact minimal

## Risk Mitigation

- **Primary Risk:** {{main risk to existing}}
- **Mitigation:** {{how addressed}}
- **Rollback Plan:** {{how to undo}}

## Definition of Done

- [ ] All stories completed with acceptance criteria
- [ ] Existing functionality verified through testing
- [ ] Integration points working correctly
- [ ] Documentation updated appropriately
- [ ] No regression in existing features

## Completion Tracking

**Epic Progress**: [0%] (Update as stories complete)

**Timeline**:

- **Started**: [Date]
- **Target**: [Date]
- **Completed**: [Date]

**Story Completion**:

- Story P.E.1: ❌ Not Started
- Story P.E.2: ❌ Not Started
- Story P.E.3: ❌ Not Started

**Update Progress**: Calculate as (completed stories / total stories) × 100

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| {today}    | 1.0     | Initial draft | create-epic |
```

> **Change Log**: append-only, newest row last, four columns exactly as above. Canonical format:
> `references/document-change-log.md` — link it rather than restating the columns. Seed row one at
> creation with today's date. Epic frontmatter has no `updated:` field (its date fields are `created:`
> and `target_completion:`), so there is nothing to bump — unlike PRD, story and task documents.

## Visual Diagram (conditional, via `mermaid-architect`)

After drafting the Stories Breakdown, decide whether a Mermaid Value Stream diagram would clarify the epic. **Mandatory only if it enhances understanding** — do not pad the epic with a diagram that just restates the table.

**Justified when:** the epic has 3 stories with non-trivial sequencing constraints, cross-story dependencies, or risk-isolated parallel tracks.

**Process:**

1. Invoke `mermaid-architect` with: epic file path, the list of stories (with IDs and titles), and any sequencing constraints surfaced in Stories Breakdown.
2. The skill returns a `flowchart` (Value Stream type) showing story order, dependencies, and any parallel branches — plus a 2-sentence "Architectural assumptions" summary.
3. Paste the Mermaid block (with YAML metadata header) into a new "Story Flow" subsection placed between "Stories Breakdown" and "Compatibility Requirements".
4. Accept `no diagram justified — {reason}` without pushing back; not every epic needs one.

## Offer Tracker Sync (opt-in)

After the epic file is fully written, ask the user whether to sync it to an issue tracker. This step **never creates a remote issue without explicit confirmation in this run**. Skip automatically (no prompt) if the epic frontmatter already contains a `github_issue` or `jira_key` — log `"ℹ️  tracker issue already linked — skipping"` and continue (idempotent — no duplicate creation on re-runs).

**Step A — detect** the configured platform using the canonical resolver (see `references/platform-detection.md`):

```bash
source references/resolve-platform.sh || exit 1
# TRACKER = jira | github   (empty/unknown if neither is configured)
```

**Step B — prompt** the user with `AskUserQuestion`:

> **Header:** `Tracker sync`
> **Question:** "Epic doc created. Sync it to an issue tracker now? Detected platform: {TRACKER or 'none detected'}."
> **Options:**
> - **Sync to GitHub** — append `(Recommended)` when `TRACKER=github`. Creates the epic issue, adds it to the project board, and writes `github_issue` to frontmatter.
> - **Sync to Jira** — append `(Recommended)` when `TRACKER=jira`. Creates/updates the epic issue (idempotent) and writes `jira_key`/`jira_url` to frontmatter.
> - **Skip — docs only** — make no remote changes; leave `github_issue`/`jira_key` unwritten. The user can sync later (`/sync-jira-epic` for Jira, or re-run `/create-epic` for GitHub).
>
> The user may also pick "Other" (auto-provided) to skip or explain.

**Step C — act on the answer:**

- **Skip / no tracker chosen** → make no remote changes, log `"Tracker sync skipped by user — run /sync-jira-epic later (Jira) or re-run /create-epic to sync to GitHub."` and continue to Post-Creation Validation. Do NOT halt.
- **Sync to Jira** → run the Jira Path below.
- **Sync to GitHub** → run the GitHub Path below.

> **Note:** If the user picks a platform that isn't actually configured (e.g. Jira while `JIRA_URL` is unset), the corresponding path logs a warning and creates nothing — it never halts. Surface the warning and continue.

### Jira Path (when the user chose Sync to Jira)

Delegate entirely to `/sync-jira-epic` — it is idempotent (create-or-update), handles ADF rendering, writes `jira_key` and `jira_url` back to the epic frontmatter, and guards against concurrent edits. No inline Jira REST in this skill.

```bash
/sync-jira-epic "$EPIC_FILE"
```

**On failure**: log warning and continue. Never halt. The epic file already exists; the Jira issue can be synced manually later via `/sync-jira-epic`.

### GitHub Path (when the user chose Sync to GitHub)

Invoke the `ensure-epic-github-issue` sub-routine with the epic file path. On return, `EPIC_ISSUE_NUM` is set (integer) or empty. The sub-routine is idempotent and handles everything inline:

- skips creation and returns the existing number if `github_issue` is already set in frontmatter;
- auto-creates the milestone (`Epic {N} — {epic_title}`, or the frontmatter `milestone:` value) if absent;
- creates the issue (`[Epic {N}] {epic_title}`, label `epic`, milestone attached);
- adds it to the GitHub Project board;
- writes `github_issue` back to the epic frontmatter.

On failure it logs a warning and returns empty — never halts.

> **Why delegate?** `ensure-epic-github-issue` is the same primitive `/review-epic`, `/create-story`, `/review-story`, and `/sync-github-epic` all call. Routing every entry point through it means the epic issue (title, body, milestone, board membership) is byte-identical no matter which skill creates it first, so the four paths converge on one issue with no diff churn when they cross.

## Card Preflight (offline, advisory)

Run the tracker-card preflight on the document just written, **before** reporting completion:

```bash
# INPUT: {epic file} — substitute the path of the epic file this run just wrote (QA cycle 3, CR-1).
command node .agents/skills/create-epic/references/card-preflight.js --file "{epic file}"
```

Offline — no auth, no network, no writes. It reports whether this document will publish a complete
tracker card or a thin one, printing the exact heading to add or rename beside each finding.

- **No findings** → say nothing. A clean preflight is not news — and it is not an all-clear: the
  clean line ends `N card blocks resolve — this checks the card sections only, not template
  completeness`, because it reads the handful of headings the card is built from and nothing else.
  Template completeness is the step above's job, not this call's.
- **Findings** → print the tool's output verbatim and tell the user it is **advisory**: the document
  is not blocked, and `/review-epic` is the gate that will block it. A `heading-only` finding means the
  section is present and useless — it resolves to a bold label or sub-heading rather than to content.
  The finding comes in two forms and the tool's `Fix:` line names the remedy for each; print it, do
  not re-derive it.

Do not paraphrase a finding or re-derive its fix, and **never restate the list of required sections
in this skill**. The list lives once, in `CARD_SECTIONS_BY_KIND` in `references/jira-sync.js`;
a second copy here would drift, and it would drift silently in the direction that matters — this
check passing a document the sync then publishes thin. Full contract:
[`references/authoring-card-preflight.md`](references/authoring-card-preflight.md).

## Post-Creation Validation

After generating the epic file, check its id first — **blocking**, because this skill chose the
name, so a disagreement is this skill's defect, not the author's:

```bash
# INPUT: {epic file} — substitute the path of the epic file this run just wrote. Nothing else is read
# from another block: PRD_ROOT is resolved here (QA cycle 2, CR-6).
EPIC_FILE="{epic file}"
source .agents/skills/create-epic/references/resolve-paths.sh || exit 1
[ -f "$EPIC_FILE" ] || { echo "❌ ${EPIC_FILE} is not a file — substitute the epic file this run wrote"; exit 1; }
command node .agents/skills/create-epic/references/doc-id.js check "$EPIC_FILE" --prd-root "${PRD_ROOT}" --json \
  || { echo "❌ doc-id check failed on ${EPIC_FILE} — fix the name or frontmatter before continuing"; exit 1; }
```

Any `reason` other than `ok` (directory and stem disagree, `prd_number` / `epic_number` disagree
with the filename, a duplicate `(P, E)`) is a **HALT** — print it verbatim. Then invoke
`documentation-standards-validator` to confirm:

- Filename uses dots as separators (`epic.{P}.{E}.descriptive-name.md`)
- All required YAML frontmatter fields are present (prd_number, epic_number, title, `type: epic`, domain, status, priority, estimated_stories, created, target_completion; `description` recommended, `tags` optional — see [OKF conformance](references/open-knowledge-format.md))
- Status indicator uses the standard icon (✅ 🔄 ⚠️ ❌ 📋)
- File placed in correct location (`${PRD_ROOT}/{domain}/prd.{P}.{feature}/epics/epic.{P}.{E}.descriptive-name/`)
- `## Change Log` is present with exactly one row (`| {today} | 1.0 | Initial draft | create-epic |`)
  whose Date is today — canonical format: `references/document-change-log.md`. Epics have no
  frontmatter `updated:` field, so there is nothing to reconcile it against.

## Regenerate the PRD Epic Index

After the epic file is written and its id check passes, refresh the parent PRD's linked epic index
so PRD→epic links stay complete and statuses current. Every epic has a parent PRD, so this step
always runs. With `${PRD_ROOT}` already resolved (see [Discover Parent PRD](#discover-parent-prd)):

```bash
node scripts/generate-prd-epic-index.mjs --prd-root "${PRD_ROOT}" \
  || node references/generate-prd-epic-index.mjs --prd-root "${PRD_ROOT}"
```

The generator prefers the consumer's vendored `scripts/` copy and falls back to this skill's
bundled `references/generate-prd-epic-index.mjs`. It is idempotent — only PRD files whose index
actually changed are rewritten. The index lists the epic as `P.E`, and only when its directory
parses as `epic.{P}.{E}.{slug}` under PRD `P` and its `prd_number` / `epic_number` agree; any other
epic is skipped and named on stderr. The id check above already guarantees that. Pass `--strict`
to turn a skip into a hard error when you want to fail loudly.

Stage the changed `prd.*.md` alongside the epic file in the **same** commit so the downstream
`docs:epic-index:check` never sees drift.

## Key Principles

1. **Scope constraint** - Maximum 3 stories
2. **User-Value First** - Stories must enable users to accomplish something meaningful, not just technical milestones
3. **No Forward Dependencies** - Stories must NOT depend on future stories; they must be independently completable in sequence
4. **Incremental Technical Setup** - Database creations or structural changes should only happen within the story that actually needs them
5. **Pattern adherence** - Follows existing architecture
6. **Risk minimization** - Low risk to existing system
7. **Integration awareness** - Clear integration approach
8. **Rollback feasibility** - Changes can be reversed

## Success Criteria

- Enhancement scope clearly defined and appropriately sized (1-3 stories)
- Integration respects existing architecture
- Risk to existing functionality minimized
- Stories logically sequenced for safe implementation
- Compatibility requirements specified
- Rollback plan feasible and documented

## Notes

- Specifically for SMALL brownfield enhancements
- If scope grows beyond 3 stories → use create-prd
- Always prioritize existing system integrity
- When in doubt about complexity → escalate to create-prd

## Related Skills

- `documentation-standards-validator` - Validates epic file naming, YAML frontmatter fields, and status indicator usage after creation
- `create-story` - Creates individual stories within the epic
- `mermaid-architect` - Generates Value Stream flowchart of the epic's stories when sequencing or parallelism warrants a diagram
