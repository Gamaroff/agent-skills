---
name: create-task
description: Create comprehensive technical task documentation for refactoring, infrastructure changes, and technical improvements. Interactive workflow with decision guidance for non-user-facing work. `--from-observation` with a list of observation ids seeds the task from observation-log entries, asks only what they leave open, and parks the entries on the new task.
invokes: [ensure-task-github-issue, ensure-task-jira-issue, mermaid-architect]
---

> **Status lifecycle**: see [`references/document-status-lifecycle.md`](references/document-status-lifecycle.md)

# Create Task

## When to Use This Skill

### Decision Tree

Use this decision tree to determine the right documentation type:

```
Is this user-facing?
├─ YES → Use PRD/Epic/Story structure
└─ NO → Is it a technical improvement?
    ├─ YES → Is it complex (3+ major steps)?
    │   ├─ YES → Use this skill (/create-task)
    │   └─ NO → Add to development-todos.md
    └─ NO → Is it a bug fix? → Use GitHub Issue
```

### When to Use

Activate this skill when:

- Creating comprehensive technical task documentation for refactoring, infrastructure changes, or technical improvements
- Task requires 3+ implementation phases with complex success criteria
- Task involves breaking changes that need migration paths
- Task requires QA review with formal gate decision process
- Need to document performance baselines, risk assessment, or rollback procedures

**Use cases**:

- ✅ Architecture refactoring (e.g., simplifying cache layers)
- ✅ Infrastructure improvements (e.g., migration to new database)
- ✅ Technical debt reduction (e.g., removing deprecated code)
- ✅ Performance optimization work
- ✅ Security improvements (e.g., upgrading auth system)
- ✅ Developer tooling improvements
- ✅ Build system changes
- ✅ Dependency upgrades with breaking changes

**Related Skills**:

- `qa-story` - For QA assessment after task implementation
- `qa-gate` - For formal quality gate decision on technical tasks
- `documentation-standards-validator` - Validates file naming conventions, YAML frontmatter, and structural standards after document creation
- `mermaid-architect` - Generates a decision flowchart, ER, or class diagram for the task when the data shape or branching logic warrants a visual

### When NOT to Use

**Do NOT use** for:

- ❌ User-facing features → Use `create-prd` or `create-story`
- ❌ Simple changes (< 3 steps) → Use `development-todos.md`
- ❌ Bug fixes → Use GitHub Issues
- ❌ Quick improvements → Add to `development-todos.md`

---

## ⚠️ CRITICAL EXECUTION RULES ⚠️

### Resolve paths first

Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`) and `${ARCH_ROOT}` (default `docs/architecture`). The `sprint-status.yaml` update step below uses `${PRD_ROOT}`; task locations under `docs/tasks/` are fixed.

Also read `sign-off.*` from `skills-config.yaml`: `enabled` (default `false`) decides whether step 4.3 emits the Stakeholder Sign-off section at all, and `task.required` / `task.optional` are the role roster. Spec: [`references/sign-off.md`](references/sign-off.md).

### Scope: Documentation + Opt-in Tracker Sync — Do NOT Implement

This skill produces **task documentation and the co-located plan file**, and then — **only after explicitly asking the user in step 4.5** — may optionally sync the task to an issue tracker (GitHub or Jira). It MUST NOT perform, begin, or scaffold the implementation work that the task describes. Tracker sync is **opt-in**: never create a remote issue without the user's confirmation in this run.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside `docs/tasks/task.[ID].[name]/` (and, only after the user opts in at step 4.5, the tracker issue)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Starting Phase 1 of the Implementation Plan "to get a head start"
- ❌ Auto-invoking `develop-task`, `develop-story`, or any implementation skill on completion
- ❌ Creating Jira or GitHub issues **without first asking the user** — tracker sync is gated behind the step 4.5 prompt and must never run unprompted

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The task directory `docs/tasks/task.[ID].[name]/`
- ✅ `task.[ID].[name].md` (task doc)
- ✅ `task.[ID].plan.[name].md` (plan doc — MUST be co-located in the task directory above)
- ✅ `${PRD_ROOT}/sprint-status.yaml` status field update (step 5)
- ✅ *(only after the user opts in at step 4.5)* Creating the tracker issue via `gh` / Jira API and writing `github_issue` / `jira_key` / `jira_url` back into the task frontmatter

**Forbidden plan locations** (the plan file is part of the repo, not agent scratch):

- ❌ `~/.claude/plans/` (Claude Code plan-mode default — outside repo, not version-controlled)
- ❌ `~/.agents/plans/`, `/tmp/`, repo root, or any non-task directory
- If a source plan exists at `~/.claude/plans/<name>.md`, relocate its content into the co-located plan file. Do not link to the home-directory path.

**If the user asks to "create the task and start implementing"**: create the task documentation, then STOP and explicitly hand off — tell user to invoke `/develop-task` (or similar) as a separate step. Do not chain.

### This is an Interactive Document Creation Workflow

When this skill is activated:

1. **USER COLLABORATION IS MANDATORY** - Full interactive workflow required. In `--from-observation` mode (§ 1.1) the entries are the collaboration source; only the questions they leave open are asked.
2. **STEP-BY-STEP SECTION BUILDING** - Process each of 11 sections sequentially
3. **VALIDATION REQUIRED** - Verify completeness before generating final document
4. **FILE CREATION** - Create proper directory structure with correct naming
5. **NO IMPLEMENTATION** - Stop after document created (and the tracker issue, only if the user opts in at step 4.5) — see "Scope" above

### Mandatory Sections (11)

1. **Overview** - Task title, scope, brief description
2. **Motivation** - Current problems and proposed benefits
3. **Technical Background** - Current and target architecture
4. **Scope** - What's in/out of scope
5. **Breaking Changes** - What changes, migration paths required
6. **Implementation Plan** - Multi-phase approach with detailed changes
7. **Files Summary** - Complete file listing organized by category
8. **Testing Strategy** - Unit, integration, performance testing approach
9. **Success Criteria** - Functional, Performance, Quality, Migration criteria
10. **Risk Assessment** - High/Medium/Low risk areas with mitigations
11. **Rollback Plan** - Immediate, partial, forward fix strategies with triggers

**Unnumbered tail sections** (`Stakeholder Sign-off`, `Progress Tracking`, `References`, `Notes`) sit outside this contract and are never numbered. `Stakeholder Sign-off` is emitted only when `sign-off.enabled: true` in `skills-config.yaml` — see step 4.3 and [`references/sign-off.md`](references/sign-off.md).

### File Naming Convention

**CRITICAL**: Follow exact naming pattern:

```
docs/tasks/task.[ID].[descriptive-name]/
├── task.[ID].[descriptive-name].md                    # Main task
├── task.[ID].plan.[descriptive-name].md               # Implementation plan (created alongside task)
├── task.[ID].qa.[number].[descriptive-name].md        # QA report (created by QA)
├── task.[ID].bug.[N].[bug-name].md                    # Bug reports (created during QA)
└── task.[ID].gate.[number].[descriptive-name].yml     # Quality gate (co-located, created by QA)
```

**Naming Rules**:

- Use dots (`.`) for structural separators: `task.[ID].[name]`
- Use hyphens (`-`) within descriptive names: `cache-lib-simplification`
- Sequential ID numbering starting from 1
- Kebab-case for all descriptive sections

**Examples**:

- ✅ `task.1.cache-lib-simplification.md`
- ✅ `task.2.nestjs-dynamic-module-pattern.md`
- ❌ `task_1_cache_lib_simplification.md` (wrong separators)
- ❌ `task.1.cacheLibSimplification.md` (wrong case)

---

## Workflow Processing

### 1. Initial Information Gathering

Prompt user for:

- **Task Title**: [Clear, specific title]
- **Task Category**: refactoring | infrastructure | documentation | testing | other
- **Priority**: Critical | High | Medium | Low
- **Assignee**: [Developer or team name]
- **Estimated Effort**: [Hours or days estimate]

From this, auto-generate:

- **Task ID**: Read `docs/tasks/task-registry.md` and use the **Next Available Task Number** value. If the registry file does not exist, fall back to scanning `docs/tasks/` for the highest `task.[N]` and incrementing.
- **Directory Path**: `docs/tasks/task.[ID].[kebab-case-name]/`
- **File Path**: `task.[ID].[kebab-case-name].md`
- **Registry update** (after the task doc + plan are written, in Step 5): add a new row to `task-registry.md` and increment **Next Available Task Number**. Commit the registry update in the same commit as the new task files.

### 1.1 Entry from the Observation Log (`--from-observation`)

`/create-task --from-observation 124,127` cuts a task from observation-log entries (obs #147). The
entries already answer most of § 1's prompts, so this entry asks only what they leave open. It cites
the ids, and it **parks the entries itself** once the task exists. Parking was the step a session
could forget: 9 entries had been parked by hand, each by whichever session remembered.

1. **Resolve the workspace and scan.** From the repository root, in one shell. The resolver refuses
   an ephemeral anchor, and a bare `source` would carry on with the variables unset:

   ```bash
   source .agents/skills/create-task/references/resolve-observation-workspace.sh || exit 1
   command node .agents/skills/create-task/references/observation-log.js scan --json
   ```

   The engine is `references/observation-log.js` and the resolver is
   `references/resolve-observation-workspace.sh`, both bundled beside this skill. Read
   `reason`: `scan-broken` is a broken reader, not an empty log. Stop and report it.

2. **Select and refuse.** Take the entries whose **`file`** starts with the id's number (`0124-…` for
   124). The file is the identity `set-status --id` resolves, while the scan's `id` is the frontmatter
   as `parseInt` read it. **Refuse the run** when an id matches no file, or more than one, or when
   the entry's `status` is not `open`, and name the id, the files and the status. A parked or
   actioned entry already has a home, and a second task cut from it is the duplicate this entry
   prevents.
3. **Seed.** For each entry, read `${OBS_LOG_DIR}/<file>` (the `file` the scan returned; `OBS_LOG_DIR`
   is set by the resolver, so source it again in the same shell as this read, or every path loses its
   directory) and pass
   `{ frontmatter: <the scan entry>, body: <the file's text> }` to `seedFromObservations` in
   `scripts/lib.js`. It returns `ids`, `title` (or `null` with `titleReason`), `description`, `tags`,
   `references`, `changeLogDescription` and the `park` vectors. It throws on a non-`open` entry, and on
   an entry whose identity is uncertain. Identity is the scan entry's `file` prefix, which is what
   `set-status --id` resolves, and the frontmatter id must agree with it.
   The Improvement sections seed Target Architecture and the Implementation Plan. The Issue sections
   seed Motivation, **and every current-state name they carry is grepped before it is written**
   (§ 3.5, obs #127). An observation is a memory of a run, not a read of the code.
4. **Ask only what is still open.** Ask for the title only when `title` is `null`: `over-bound`
   (observation titles run long, and a title is a name, obs #128) or `multiple-entries`. Also ask the
   tracker-sync question at 4.5, which stays opt-in. Take the rest as defaults and **report** each one
   in the completion message: priority `Medium`, the template's category, and effort from the rubric
   (§ 4.4). § 3.5 still runs in full. Its Critical items are about the document, not the author, and a
   seeded document needs them more.
5. **Cite.** Put `references` under References, and use `changeLogDescription` as the
   Change Log's first row.
6. **Park** is § 5 step 2b. It runs after both files exist, never before, so a run that stops early
   leaves the entries `open`, which is visible and not lost.

### 1.2 One Task or Several?

The decision tree above answers *whether* a task document is the right artefact. It does not answer
*how many*, and the count is a design decision with the same consequences as the content: it fixes
what can be shipped alone, reverted alone and reviewed alone. Left unstated, the decision does not go
away — it moves into whatever the current session improvises. Three separate authors hand-wrote the
same rule into `docs/tasks/task-registry.md` § Notes (tasks 51–58, 62–64, 93–95), each phrased
differently, because there was nowhere to write it once. Decide the count **here**, before any section
content is gathered, because the answer decides how many documents the content is gathered *into*.

**The splitting test.** A unit is its own task when it is **independently shippable, independently
revertible and independently valuable — all three.** A unit that is shippable but delivers nothing on
its own is a *phase* of one task, not a task. Ask it of every candidate seam.

**The three seams the corpus already uses** (each is a proven cut, not a suggestion):

| Seam | Shape | Why it is a real boundary |
| --- | --- | --- |
| **primitive → migration** | build the mechanism first with no call site touched; move the call sites in a second task | the primitive is revertible without regressing anything that uses it, and the migration can be reviewed as "did every site move?" |
| **per-axis** | the same change on two independent axes — `TRACKER` and `VCS`, Jira and GitHub — is two tasks | they fail independently and are tested against different environments |
| **substantive → cleanup** | the fix, then the guard that stops it recurring | the fix is urgent and small; the guard is a test with an allowlist and a floor, and its review is a different conversation |

**The obligation a split creates.** When the answer is N > 1 documents, write **one note** under
`## Notes` in `docs/tasks/task-registry.md` stating the ordering — which units depend on which, which
are independent of each other, and which (if any) must land first. Copy the shape of the existing
notes for tasks 51–58, 62–64 and 93–95: *"one shippable unit each, in dependency order: A ships the
primitive and is usable before anything calls it; B and C both depend on A and are independent of each
other."* One note per split, not one per task, and written in the same commit as the first document.

**The anti-pattern: splitting by file touched.** "Task 1: edit the engine; task 2: edit the tests" or
"task 1: the `.md` files; task 2: the `.js` files" produces two units neither of which is shippable —
the first is untested and the second tests nothing. Split by **outcome delivered**, never by where the
diff lands. If two candidate tasks would each leave the tree in a state nobody would merge alone, they
are one task.

### 1.5 Analyse Git History for Technical Context

Before building the document, run a git history scan to ground the technical content:

1. Run `git log --oneline -15` to get recent commits
2. Identify commits that touch the same files, modules, or layers as this task
3. For 2-3 most relevant commits, inspect the diff to extract:
   - Patterns already established in this area (naming, structure, abstractions)
   - Libraries or approaches recently adopted that this task should align with
   - Similar refactors or changes that succeeded or were reverted (and why)
   - Existing utilities, services, or helpers that could be reused
4. Use these insights to pre-populate or validate:
   - **Technical Background** — current architecture is accurate, not outdated
   - **Implementation Plan** — phases don't duplicate or conflict with recent changes
   - **Files Summary** — file paths exist and haven't been moved/deleted
   - **Risk Assessment** — recent reverts or fixes flag real-world risk areas

**Anti-Hallucination Rule**: Only use what is confirmed in the commit history. Do NOT infer patterns not present in the diffs.

### 2. Process Each Section

For each of 11 mandatory sections:

**a. Gather Content**

- Present section prompt/guidance
- Ask clarifying questions if needed
- Request code examples where applicable

**b. Validate Content Quality**

- Ensure sufficient detail (min 2-3 sentences per subsection)
- Verify breaking changes have migration paths
- Confirm implementation plan has checkboxes

**c. Save Progressively**

- Build document incrementally
- Allow user to review/edit before moving to next section
- Provide option to skip forward to specific section

**d. Special Handling for Complex Sections**

**Breaking Changes Section**:

```
For each breaking change:
1. Change description
2. Before code example
3. After code example
4. Impact on consumers
5. Migration path required

Ask: "Are there any breaking changes?"
If yes: Prompt for EACH change individually
```

**Implementation Plan Section**:

```
For each phase:
1. Phase name
2. Risk level (Low/Medium/High)
3. File list
4. Changes (with [ ] checkboxes)
5. Dependencies on other phases

Ask: "How many implementation phases?"
Then iterate through each phase
```

**Success Criteria Section**:

```
Validate criteria in 4 categories:
1. Functional (tests passing, regressions, breaking changes)
2. Performance (benchmarks, baselines)
3. Code Quality (coverage, lint, compilation)
4. Migration (docs, consumer updates)

MUST have at least 2-3 criteria per category
```

**Risk Assessment Section**:

```
Categorize risks as:
- HIGH (blocking, breaking, performance)
- MEDIUM (workaround possible, testing)
- LOW (informational, documentation)

For each risk:
- Risk description
- Probability assessment
- Impact assessment
- Mitigation strategy
- Rollback plan if needed
```

### 2.5 Generate Plan File

After collecting all section content (especially the Implementation Plan in Section 6), generate a co-located implementation plan file.

**File**: `task.[ID].plan.[descriptive-name].md` — same directory as the task document.

**CRITICAL — co-location is mandatory. The plan file MUST be written into the task's own directory (`docs/tasks/task.[ID].[descriptive-name]/`) alongside the task doc.**

- ❌ NEVER write the plan to `~/.claude/plans/`, `~/.agents/plans/`, `/tmp/`, the repo root, or any other shared/agent-scratch location.
- ❌ NEVER leave a plan in `~/.claude/plans/` (Claude Code plan-mode default) and link to it from the task — it is outside the repo, invisible to teammates, and not version-controlled.
- ✅ If a source/upstream plan already exists at `~/.claude/plans/<name>.md` (e.g., from Claude Code plan mode or a prior brainstorm), **relocate its content** into the co-located `task.[ID].plan.[descriptive-name].md` file. Do not just reference the original path.
- ✅ Use a relative path (filename only) when cross-referencing from the task doc — both files live in the same directory.

**Purpose**: The plan file contains implementation-level detail that the task document deliberately omits: code snippets, exact file changes, function signatures, and line-by-line guidance. The task doc describes *what* to build; the plan describes *how*.

**Content structure**:

```markdown
---
id: task.[ID].plan
title: "Implementation Plan: [task title]"
type: plan
task-ref: task.[ID].[descriptive-name].md
---

# Implementation Plan: [task title]

> Requirements and success criteria: [task.[ID].[descriptive-name].md](task.[ID].[descriptive-name].md)

## Overview

[1-2 sentence summary of the implementation approach]

## Phase-by-Phase Implementation Guide

### Phase 1: [Phase Name]

**Files to modify:**
- `path/to/file.ts` — [what to change and why]

**Exact changes:**
[Code snippets, function signatures, line references, before/after examples]

### Phase 2: [Phase Name]
[Same structure repeated for each phase]

## Key Patterns and References

[Existing code patterns to follow, utilities to reuse, architectural constraints]

## Testing Approach

[Specific test scenarios, test file locations, mocking strategies]
```

**Content sourcing rules**:
- Extract implementation-level detail from the interactive workflow (code examples, function signatures, file paths discussed during section collection)
- Reference specific lines/functions in existing files discovered during git history analysis (Step 1.5)
- Include before/after code snippets for each phase where applicable
- Do NOT duplicate the task doc's Implementation Plan section verbatim — the plan adds *how*, not restates *what*

**Cross-reference in task doc**: After generating the plan file, add a cross-reference line at the top of the task doc's Implementation Plan section (Section 6):

```markdown
> Detailed implementation guide: [task.[ID].plan.[descriptive-name].md](task.[ID].plan.[descriptive-name].md)
```

### 2.5 Visual Diagram (conditional, via `mermaid-architect`)

After the Implementation Plan and Technical Background are populated, decide whether a Mermaid diagram materially clarifies the task. **Mandatory only if it enhances understanding** — do not pad the task doc with a diagram that just restates Section 3.

**Diagram type by task shape:**

- Task introduces or migrates a data shape → `erDiagram` (entities + relationships) or `classDiagram`
- Task contains non-trivial decision/branching logic → `flowchart` with decision nodes
- Task migrates an architecture from "current" to "target" → side-by-side `flowchart` subgraphs

**Process:**

1. Invoke `mermaid-architect` with: task file path, the section anchor (typically Technical Background or Implementation Plan), and the entity/decision keywords already named in the prose.
2. The skill returns a Mermaid block (with YAML metadata header) and a 2-sentence "Architectural assumptions" summary.
3. Paste the block into Section 3 (Technical Background) under a "Current vs Target Architecture" subheading, OR into Section 6 (Implementation Plan) under a "Decision Flow" subheading — whichever is more relevant.
4. Accept `no diagram justified — {reason}` without pushing back.

### 3. Validation Before File Creation

**Checklist before generating document**:

- ✅ Task title provided and unique
- ✅ All 11 mandatory sections have content
- ✅ Implementation plan has at least 2-3 phases
- ✅ Success criteria specified for all 4 categories
- ✅ Breaking changes include migration paths
- ✅ Risk assessment covers High/Medium/Low
- ✅ Rollback plan includes triggers and steps
- ✅ All file paths use correct naming convention
- ✅ No duplicate task IDs
- ✅ Directory structure valid
- ✅ File naming validated against documentation standards (dots not underscores, kebab-case descriptive names)

**If validation fails**:

- Identify missing sections
- Prompt user to complete them
- Offer guided completion flow

### 3.5 Adversarial Quality Review

**CRITICAL / BLOCKING**: This step is mandatory and must not be skipped. Do not proceed to Section 4 (Document Generation) until this review is complete. Perform an adversarial re-analysis of all collected content as if reviewing someone else's work. Goal: make implementation mistakes **impossible**.

#### 🚨 Critical (fix before document generation; the obs #168 item goes to the author)

- **Wheel reinvention**: Does the implementation plan direct the developer toward existing code, services, or utilities they should extend rather than re-implement? Search the codebase for related functionality.
- **Wrong libraries or versions**: Are all library/framework references consistent with `package.json`? No fabricated or outdated dependencies.
- **Incorrect file paths**: Do all files in the Files Summary actually exist (for modifications) or land in the correct directories (for new files)? Validate against the project's directory structure.
- **Incomplete migration paths**: Every breaking change must have a concrete migration path — not just "update callers". Flag vague migrations.
- **Inadequate rollback plan**: Are rollback triggers specific enough to act on? Are steps actionable in under 1 hour if needed?
- **Risk underestimation**: Does the Risk Assessment account for side effects surfaced by git history (recent reverts, related fixes)?
- **Second mechanism for a job the file already does** (obs #103): when a phase adds a function whose purpose is to dedupe, heal, migrate, retry, normalise or reconcile, grep the target file for existing functions of that kind. The Technical Background must name them and say whether the new one replaces, extends or sits beside each — and "sits beside" needs a sentence.
- **A figure the test will re-measure** (obs #117): a count stated in prose decays within days. Record the **definition** (what is scanned, with which pattern and exclusions) and the **command**, and let the test record the number. Where a guard is scoped over several file classes, name the mechanism that reaches each class — a scan wider than the hazard opens with an allowlist of false positives, and an allowlist nobody believes is a guard nobody reads.
- **A widened check inside a path-filtered workflow** (obs #102): when a phase adds a path or file class to a check that runs in an existing CI workflow, read the workflow's `on.<event>.paths` and list the new path there too — or the widened check never runs on the changes it was widened for.
- **An outcome the named function cannot return** (obs #168): when a success criterion or test case states what a named function returns for a stated input (a verdict, an exit code, a status), walk that input through the function's decision branches as the plan leaves them. That means the branches it has today plus any a planned phase adds or changes. Confirm the stated outcome is the branch that fires on that walk. An outcome a planned phase produces is reachable even though today's code cannot return it. A planned branch counts only when a named phase states it: the condition and the outcome it returns. Name that phase in the criterion as a cross-reference: the phase states the branch, and the criterion only points at it. A phase that only names the function, or a criterion that promises a later phase will add the branch, does not count. An unreachable outcome is one no current or planned branch returns. It is a criterion the developer would have to silently rewrite or silently fail. **Put it to the author, and never auto-fix it** by rewriting the criterion to what today's code returns: that rewrite turns the behaviour the task exists to deliver into the behaviour it exists to change. (task.144 promised `present-but-inert` for an accept-all fixture; `computeVerdict`, which that plan did not change, scores it `absent`.)
- **A property claimed, not run** (obs #161): when the document asserts that an existing function keeps an ordering, a uniqueness, an idempotence or a round-trip under the inputs this task adds, run it on those inputs before writing the claim down — a one-line `command node -e` is enough, and an existence check is no evidence for a behaviour. task.141 claimed zero-padding keeps `listRunFiles`' basename sort chronological; it does not (`["a-lan.md","a-lan-02.md"].sort()` puts `-02` first), and its plan's own test asserted the false claim. A falsified property is Critical: fix the claim before the plan is written on top of it.
- **Compatibility scoped from a finding, not from the release** (obs #170): when the task defines legacy, migration or old-format handling for a shape, derive the legacy shape from the last release tag — `git show <tag>:<path>` on the file that defines or writes it, diffed against the target shape — cover every field the diff shows, and cite the tag in Technical Background. task.143 covered the one field its QA finding named; the released shape at `v0.51.0` lacked three more.
- **A current-state name nobody grepped** (obs #127): every field, function and file location the Technical Background asserts about the current code has a `grep` hit cited as `path:line`, or is marked `(unverified)`. Grep each one now. The author who names a field is the one who greps for it.
- **A categorised population without a witness per member** (obs #124): when the document sorts a measured population into classes (used / dead / prose, real dependency / not), each **member** carries its witness, meaning the `file:line` of its invocation or the grep that returned nothing. A count carries its command (obs #117). A category needs its witness, one per member. Where the classification drives a design (a regex keyed on an invocation spelling), quote at least one real instance of that spelling from the tree. task.122 counted 15 correctly and categorised 7 of them wrongly.
- **A single-statement test keyed on a shared token** (obs #135): for each proposed single-statement, population or allowlist test, (a) grep the key it proposes and list every hit. If any hit belongs to a different rule, the key is shared, and the test needs a positive marker or a compound (verb + discriminator) pattern. (b) Name a restatement that would **not** match the key and say how the test sees it. (c) If the test's population is derived from directories, do not name a site to add. Name the regex change and a non-vacuity assertion instead. task.130 keyed a test on `loop-limit|not-converging`, a token another rule also uses: it would have been red at the wrong site and blind to the token-free restatement behind task.124 bug 13.
- **A call-site list from recall** (obs #120): when the task enumerates call sites of one of this repository's engines (the collector's `--engine` names: `tracker-comment`, `stakeholder-summary-cli`, `gh-stage`, `jira-stage`, `tracker-issue`) — a list, a count, or "all call sites of" — measure the population instead of recalling it: `command node .agents/skills/create-task/references/call-sites.js --engine "{engine}" --json` from the repository root. Paste its count and command into the Files Summary (obs #117) and name every site it returns, each as in scope or as a stated exclusion. A `no-roots` answer (exit 1) means this is not a skills source tree (no `shared/resources/` beside a `skills/*/SKILL.md`): say so in place of a count, never write 0. `review-task` Step 3 check 14 diffs the list against the same collector. task.121 named three sites and one duplicate; the collector found two more in scope, one a consumer a success criterion would have forbidden.

#### ⚡ Should Add (present to user for confirmation)

- **Missing performance baselines**: If the task claims performance improvements, does it document current baselines to measure against?
- **Uncovered test scenarios**: Does the Testing Strategy cover regression risks, not just happy paths?
- **Scope creep risk**: Are any implementation steps implicitly larger than stated?

#### ✨ Nice to Have (present to user for confirmation)

- **Clarity**: Are phase descriptions specific enough that a developer not involved in planning can execute them?
- **Checklist completeness**: Do all checkboxes in the Implementation Plan cover the full scope?

Fix all Critical items in the collected content before proceeding. The one exception is a Critical item that needs the author's decision (the obs #168 item): put it to the author and apply their answer, never a guess. Present Should Add and Nice to Have to the user.

### 4. Document Generation

Once validated:

1. **Create Directory**

   ```bash
   mkdir -p docs/tasks/task.[ID].[name]/
   ```

2. **Generate Markdown File**
   - Populate with all user-provided content
   - Format with proper markdown structure
   - Emit a YAML frontmatter block (per `resources/task-template.md`) with: `id`, `title`, `type: task`, `description` (a one-sentence summary — recommended), optional `tags`, `category`, `status`, `priority`, `created`, `updated`, `assignee`. `type` is OKF's one hard requirement; `description` is OKF-recommended. See [OKF conformance](references/open-knowledge-format.md). **`title` is a name, not a summary**: if step 4.6 reports `title-too-long`, use the H1 as the title and move the extra text into `description`. The bound lives in the preflight, so it is not restated here (obs #128).
   - Set frontmatter `status: planned` (body `**Status:** Planned`) and both `created`/`updated` to today
   - Initialize empty progress tracking checkboxes
   - Seed the unnumbered `## Change Log` section (between `## Stakeholder Sign-off` and
     `## Progress Tracking`, per `resources/task-template.md`) with exactly one row:
     `| {today} | 1.0 | Initial draft | create-task |`. Keep frontmatter `updated:` equal to that
     date. Append-only, newest row last, four columns — canonical format:
     `references/document-change-log.md` (do not restate the column list elsewhere).
     The heading stays **unnumbered**: numbering it would break the 11-section contract that
     `scripts/lib.js` `countMandatorySections()` asserts.

3. **Create Placeholder Notes**
   - Document where QA report will be created
   - Document where bug reports will be created
   - Note quality gate will be co-located in the task directory
   - Provide next steps

4. **Display Success Message**
   - Show file path created
   - Show task ID assigned
   - Provide command to view file
   - Link to related QA skills

5. **Run Documentation Standards Validation**
   - Invoke `documentation-standards-validator` on the created file
   - Confirm: dots used as structural separators, hyphens within names, lowercase, `.md` extension
   - Fix any naming violations before presenting the file to the user

### 4.3 Scaffold Stakeholder Sign-off Section (conditional)

Human approval gate — stakeholders sign the task before development begins. Full spec: [`references/sign-off.md`](references/sign-off.md).

**Skip this step entirely** when `sign-off.enabled` is absent or `false` in `skills-config.yaml`. Emit nothing — no section, no placeholder.

When enabled, insert an **unnumbered** `## Stakeholder Sign-off` section after `## 11. Rollback Plan` and before `## Progress Tracking`. It is deliberately unnumbered: the 11 mandatory sections above remain the contract, and numbering this one would break that count.

Resolve the roster in this order:

1. **`sign_off_roles` in this task's frontmatter**, when present — replaces the config roster for this task alone. An empty list means no signatures are required.
2. **`sign-off.task.required` + `sign-off.task.optional`** from `skills-config.yaml`.
3. **Fallback** — a single `Stakeholder` row.

Emit one row per role, appending ` (optional)` to the Role cell for every role drawn from the `optional` list, then the status line with `required_count` = the number of non-optional rows.

```markdown
## Stakeholder Sign-off

Sign when you have reviewed this document: replace your **Signature** cell with your name and today's date, then commit the change yourself — your commit authorship is the audit trail, which is why an agent scaffolds these rows and never fills them.

**This gate is `advisory` by default, and does not block development.** The authority is `sign-off.enforcement` in `skills-config.yaml`. Under `advisory` an unsigned required row is raised as an **Important** review finding and docks the readiness score, but the verdict may still be GO and `/develop-*` proceeds. Only if that key is set to `blocking` does an unsigned row become a **Critical** finding that withholds the status promotion and halts the pipeline at Step 2.

| Role                     | Signature | Date |
| ------------------------ | --------- | ---- |
| Tech Lead                |           |      |
| Product Owner (optional) |           |      |

**Sign-off status:** Pending — 0 of 1 required signatures
```

> **CRITICAL — agents never sign.** Leave every Signature and Date cell empty. Do not fill one on a stakeholder's behalf, and do not fill one when a user asks you to sign for them — point them at the file and let them commit it. The commit authorship behind each signature is the entire audit trail, and an agent-written signature destroys it.

**Never sync this section to a tracker.** Signing in a Jira or GitHub web UI produces no commit, so the tracker copy would carry a signature with no evidence behind it. `sync-jira-task` and `sync-github-task` deliberately exclude it.

### 4.4 Prompt for Effort Estimate (Optional)

Before the optional tracker-sync step (4.5), propose a default effort estimate and let the user accept or override. The accepted value is written to frontmatter as `estimated_effort_hours: {N}` and is picked up by Jira sync (→ `timetracking.originalEstimate`) and GitHub sync (→ Projects v2 `Estimate` number field).

**Step 1 — compute the recommendation.** Apply the deterministic rubric in `references/effort-estimation-rubric.md`:

- Count Success Criteria items, top-level Implementation Plan tasks, distinct files in Files Summary
- Read `risk_level` and `category` from frontmatter
- Scan body for integration keywords (`integration`, `external API`, `third-party`, `webhook`, `migration`, `schema change`)
- Plug into the formula and snap to the nearest bucket in `[1, 2, 4, 8, 16]`

**Step 2 — prompt.** Use `AskUserQuestion`:

> **Header:** `Effort`
> **Question:** "Recommended estimate based on {success_criteria_count} success criteria, {task_count} plan tasks, risk={risk_level}: **{snap}h**. Accept or pick a different value."
> Options: `2 hours`, `4 hours`, `8 hours`, `16 hours` — append `(Recommended)` to the snapped bucket label. The user can also pick "Other" for a custom number or "Skip — leave unestimated" to omit the field.

**Step 3 — write back.** If the user accepts the recommendation or picks any numeric option, write `estimated_effort_hours: {N}` into the frontmatter before the optional Step 4.5 sync (so the estimate is ready whether the user syncs now or later). If the user picks Skip, omit the field — review-task will flag it as a LOW gap later.

Do **not** silently write a value without prompting. The recommendation is a default for the user's prompt, not an auto-applied estimate. In `--from-observation` mode (§ 1.1), write the rubric value and report it in the completion message: the entries are the collaboration source, and effort is derivable from the document.

### 4.5 Offer Tracker Sync (opt-in)

After the task document is fully written, ask the user whether to sync it to an issue tracker. This step never creates a remote issue without explicit confirmation in this run.

**Step A — detect** the configured platform using the canonical resolver (see `references/platform-detection.md`):

```bash
source references/resolve-platform.sh || exit 1
# TRACKER = jira | github; VCS = github | bitbucket   (TRACKER empty/unknown if neither is configured)
```

**Step B — prompt** the user with `AskUserQuestion`:

> **Header:** `Tracker sync`
> **Question:** "Task doc created. Sync it to an issue tracker now? Detected platform: {TRACKER or 'none detected'}."
> **Options:**
> - **Sync to GitHub** — append `(Recommended)` when `TRACKER=github`. Creates the task issue, adds it to the project board, and writes `github_issue` to frontmatter.
> - **Sync to Jira** — append `(Recommended)` when `TRACKER=jira`. Creates the task issue (standalone — tasks are not linked to a Jira epic), adds it to the backlog, and writes `jira_key`/`jira_url` to frontmatter.
> - **Skip — docs only** — make no remote changes; leave `github_issue`/`jira_key` unwritten. The user can run `/sync-github-task` or `/sync-jira-task` later.
>
> The user may also pick "Other" (auto-provided) to skip or explain.

**Step C — act on the answer:**

- **Skip / no tracker chosen** → make no remote changes, log "Tracker sync skipped by user — run /sync-github-task or /sync-jira-task later." and continue to Step 5. Do NOT halt.
- **Sync to Jira** → run the Jira Path below.
- **Sync to GitHub** → run the GitHub Path below.

> **Note:** If the user picks a platform that isn't actually configured (e.g. Jira while `JIRA_URL` is unset), the corresponding sub-routine logs a warning and returns an empty key — it never halts. Surface the warning and continue to Step 5.

---

#### Jira Path (when the user chose Sync to Jira)

> **Note**: Tasks are NOT linked to a Jira epic — they are standalone work items.
>
> **Priority on Jira**: setting `"priority": {"name": $priority}` on the issue is the canonical mechanism — Jira boards display it directly, so no separate board-field mirror is needed (unlike the GitHub path, which calls `set-github-project-priority.sh`). Ongoing local↔remote priority drift is handled by `/sync-jira-task` via `references/jira-sync.js` (`normalisePriority` + `diffFields`).

Invoke the `ensure-task-jira-issue` sub-routine with `TASK_FILE_PATH={path to the task file just created}`. The sub-routine handles:

- delegation to `sync-jira-task` for idempotent create (label-search dedup),
- priority mapping (Critical/High → High, Medium → Medium, Low → Low) via `references/jira-sync.js`,
- adding the issue to the project backlog (Scrum boards only),
- embedding Bitbucket links via ADF,
- writing `jira_key: {KEY}` and `jira_url: {JIRA_URL}/browse/{KEY}` into the task frontmatter and inserting the body cross-reference link.

On return, `TASK_JIRA_KEY` is set (e.g. `PROJ-15`) or empty (on failure).

**On failure**: the sub-routine logs a warning and returns `TASK_JIRA_KEY=""`. `create-task` leaves `jira_key: null` and continues. Never halt. Users can still run `/sync-jira-task` manually later to retry.

---

#### GitHub Path (when the user chose Sync to GitHub)

Invoke the `ensure-task-github-issue` sub-routine with `TASK_FILE_PATH={path to the task file just created}`. The sub-routine handles:

- milestone resolution (frontmatter `milestone:` → epic-registry lookup via the task's `epic:` field → `"Technical Tasks (standalone)"` default), auto-creating the milestone if needed
- creating the issue with title `[Task {id}] {title}`, body assembled from Overview / Key Deliverables / Success Criteria / Metadata / Document sections, and labels `task` + `priority:{priority}`
- adding the issue to the GitHub Project board
- mirroring the priority label onto the board's Priority single-select field
- writing `github_issue: {N}` into the task's frontmatter and inserting the body cross-reference link

On return, `TASK_ISSUE_NUM` is set (integer) or empty (on failure).

**On failure**: the sub-routine logs a warning and returns empty. `create-task` leaves `github_issue:` unwritten and continues. Never halt.

### 4.6 Card Preflight (offline, advisory)

Run the tracker-card preflight on the document just written, **before** reporting completion:

```bash
node references/card-preflight.js --file "docs/tasks/task.[ID].[name]/task.[ID].[name].md"
```

Offline — no auth, no network, no writes. It reports whether this document will publish a complete
tracker card or a thin one, printing the exact heading to add or rename beside each finding.

- **No findings** → say nothing. A clean preflight is not news — and it is not an all-clear: the
  clean line ends `N card blocks resolve — this checks the card sections only, not template
  completeness`, because it reads the handful of headings the card is built from and nothing else.
  Template completeness is the step above's job, not this call's.
- **Findings** → print the tool's output verbatim and tell the user it is **advisory**: the document
  is not blocked, and `/review-task` is the gate that will block it. A `heading-only` finding means the
  section is present and useless — it resolves to a bold label or sub-heading rather than to content.
  The finding comes in two forms and the tool's `Fix:` line names the remedy for each; print it, do
  not re-derive it.

Do not paraphrase a finding or re-derive its fix, and **never restate the list of required sections
in this skill**. The list lives once, in `CARD_SECTIONS_BY_KIND` in `references/jira-sync.js`;
a second copy here would drift, and it would drift silently in the direction that matters — this
check passing a document the sync then publishes thin. Full contract:
[`references/authoring-card-preflight.md`](references/authoring-card-preflight.md).

---

### 5. Post-Generation Steps — STOP HERE

This is the terminal step of the skill. After completing it, **end the session and return control to the user**. Do not begin implementation, do not auto-invoke `develop-task`, do not start Phase 1 work.

Actions:

1. Task document created at `docs/tasks/task.[ID].[name]/task.[ID].[name].md`
2. Plan file created at `docs/tasks/task.[ID].[name]/task.[ID].plan.[name].md`
2a. Card preflight run (step 4.6) — report any findings verbatim, as advisory
2b. **`--from-observation` only: park the entries.** Run each `park` vector from the § 1.1 seed
    **verbatim**, in the same shell as the resolver, one call per id. The seed has already built the
    arguments, so never retype an id or a task number. `{park-vector}` below is one vector's
    elements, each quoted:

    ```bash
    source .agents/skills/create-task/references/resolve-observation-workspace.sh || exit 1
    command node .agents/skills/create-task/references/observation-log.js {park-vector}
    # e.g. set-status --id 124 --status parked --parked-until "task.150 merged to develop" --expect-status open --json
    ```

    The engine checks each vector at the moment it writes. The vector carries
    `--expect-status open`, so an entry another session parked or actioned since it was selected
    answers `status-changed` and is left alone. An id that two files share answers `ambiguous-id`,
    and neither file is touched. Do not re-check by hand first: a re-scan reads the log by
    frontmatter id, and can clear one file while the vector resolves another.

    Read `reason`. `ok` is success. Report any other value verbatim and continue: parking never
    blocks the document, and an entry left `open` is visible, not lost. Name each parked id in the
    completion message.
3. If `${PRD_ROOT}/sprint-status.yaml` exists, update it:
   - Load the full file, preserving all comments and structure
   - Find the entry matching this task's ID/key
   - Update its status to `ready-for-dev`
   - Save the file

Inform user (and stop):

- Document and plan paths
- Tracker issue URL (from step 4.5) if created
- **Next step is the user's call**: invoke `/develop-task` to implement, or hand off to another developer. This skill does not implement.
- When implementation is complete, QA artifacts will land at:
  - QA report: `task.[ID].qa.[number].[name].md`
  - Bug reports (if issues found): `task.[ID].bug.[N].[name].md`
  - Quality gate: `task.[ID].gate.[number].[name].yml` (co-located in task directory)

---

## Section-by-Section Prompts

### Section 1: Overview

```
Provide:
1. One-sentence task description
2. Scope (what's included)
3. Key deliverables (2-3 items)
4. Expected outcome
```

### Section 2: Motivation

```
Current Problems (list 3-5):
- Problem 1: [specific issue]
- Problem 2: [specific issue]

Benefits of Solution (list 4-6 with metrics if possible):
- Benefit 1: [specific improvement] (20-30% faster)
- Benefit 2: [specific improvement]
```

### Section 3: Technical Background

**Cite by identity, not by coordinate.** A line number decays on every edit above it — on one task
every `file:line` anchor was wrong within seven days while every path stayed right. Prefer a stable
anchor (a heading, a symbol name, a unique string) over a line number; where a line number genuinely
helps, pair it with the identifier so the citation survives the next edit:
`qa-task/SKILL.md:580` *(`- **Security**: Review for security issues`)*. A reader who finds the
coordinate stale can still find the thing. (obs #22)

**Every current-state name carries its grep** (obs #127). A field, function, flag or file location
the document says exists *today* is cited with the `grep -rn` (or `git grep -n`) hit that found it,
as `path:line` paired with the identifier. A name the grep does not find is marked `(unverified)` or
removed. A task cut from an observation inherits the observation's wording, and an observation is a
memory of a run, not a read of the code: task.123 named a `qa_cycles_completed` field that exists
nowhere.

```
Current Architecture:
- [Code block or description]
- Component 1
- Component 2

Target Architecture:
- [Code block or description]
- Component 1 (modified how?)
- Component 2 (modified how?)

Clarifications:
- [Any confusing technical points]
```

### Section 4: Scope

```
In Scope:
✅ [What's included]
✅ [Specific systems/files]

Out of Scope:
❌ [What's explicitly excluded]
❌ [Why not included]
```

### Section 5: Breaking Changes

```
For EACH breaking change:
1. Change Title
2. What changed (Before → After)
3. Code example before
4. Code example after
5. Who/what is affected
6. Migration path for consumers

If NO breaking changes: "None - API stable"
```

### Section 6: Implementation Plan

```
Number of phases: [N]

For EACH phase:
1. Phase Name: [Title]
2. Risk: [Low | Medium | High]
3. Files to modify:
   - file1.ts
   - file2.ts
4. Specific changes (use [ ] checkboxes):
   - [ ] Change 1
   - [ ] Change 2
5. Dependencies: [Other phases or pre-requisites]
```

### Section 7: Files Summary

Where the task's scope is "the call sites of engine X", the list comes from the collector, not from memory — see the call-site item in 3.5 (obs #120).

```
Categorize all files:

Core Implementation:
1. ✅ path/to/file1.ts - [purpose]
2. ✅ path/to/file2.ts - [purpose]

Tests:
14. ✅ path/to/test1.spec.ts

Dependencies:
28. ✅ package.json

Documentation:
30. ✅ CHANGELOG.md

Deleted:
31. ❌ path/to/deprecated.ts
```

### Section 8: Testing Strategy

```
Unit Tests:
- Scope: [what's tested]
- Actions: [specific test tasks]
- Command: npx nx test [project]
- Target: [coverage %]

Integration Tests:
- Scope: [end-to-end flows]
- Actions: [specific flows to test]

Performance Tests:
- Metrics to measure: [list]
- Baseline needed: [yes/no]
- Benchmarks: [tools/approach]

Consumer Tests:
- Scope: [dependent code]
- Risk areas: [specific code]
```

### Section 9: Success Criteria

```
FUNCTIONAL (Example):
- [ ] All [project] tests pass
- [ ] No regressions detected
- [ ] All breaking changes documented
- [ ] Migration paths verified

PERFORMANCE (Example):
- [ ] [Metric] improved [X]%
- [ ] [Metric] maintained or improved
- [ ] No memory leaks

CODE QUALITY:
- [ ] Test coverage maintained 80%+
- [ ] All linting passes
- [ ] No TypeScript errors
- [ ] Every validation command the coding standards name for the files this task touches (e.g. `npm run validate -- skills/<skill>/` when a `SKILL.md` changes)

MIGRATION:
- [ ] CHANGELOG.md updated
- [ ] Migration guide provided
- [ ] Consumer code tested
```

### Section 10: Risk Assessment

```
HIGH RISK (List risks blocking deployment):
1. Risk Title
   - Risk: [description]
   - Probability: High
   - Impact: Critical
   - Mitigation: [strategy]
   - Rollback: [plan]

MEDIUM RISK (List risks requiring monitoring):
[Same structure]

LOW RISK (List risks requiring awareness):
[Same structure]
```

### Section 11: Rollback Plan

```
IMMEDIATE ROLLBACK (< 1 hour):
- Triggers: [conditions requiring rollback]
- Steps: [numbered steps]
- Validation: [how to verify rollback successful]

PARTIAL ROLLBACK (1-2 hours):
- When to use: [specific scenarios]
- Steps: [which phases to revert]

FORWARD FIX:
- When to use: [non-critical issues]
- Approach: [fix forward vs revert]

ROLLBACK TRIGGERS:
- Critical: [blocking issues]
- Non-critical: [issues to fix forward]
```

---

## Integration with QA Workflow

### Developer Workflow

1. **Create** technical task document using this skill
2. **Implement** according to implementation plan
3. **Mark sections complete** as phases finish
4. **Hand off** to QA when implementation done

### QA Workflow (External to this Skill)

1. **Review** task document and implementation
2. **Create QA report** at `task.[ID].qa.[number].[name].md`
3. **Test** all success criteria
4. **Create bug reports** if issues found: `task.[ID].bug.[N].[name].md`
5. **Create quality gate** at `task.[ID].gate.[number].[name].yml` (co-located in task directory)
6. **Make gate decision**: PASS | CONCERNS | FAIL | WAIVED

### Bug Fix Cycle

If QA finds issues:

1. Developer fixes bugs, updates bug report status
2. QA retests and updates gate status
3. Iterate until PASS
4. Final QA report summarizes gate decision and deployment readiness

**Related QA Skills**:

- **qa-planning**: Risk assessment and test design (use during planning phase)
- **qa-story**: Comprehensive review for technical tasks (use when ready for QA)
- **qa-gate**: Create quality gate decision files (use after review)
- **create-bug-report**: Document issues found during QA
- **qa-fix**: Apply fixes for issues found

---

## Common Patterns & Examples

### Technical Debt Refactoring Task

```
Task Title: Cache-lib Architecture Simplification
Category: refactoring
Current: 3-tier cache (L1/L2/L3)
Target: 2-tier cache (L1/L2, remove redundant tier)
Primary Benefit: 20-30% faster write performance
Breaking Changes: CacheStats interface changed
Phases: 9 phases (types → core refactor → exports → tests → deps → consumer → docs → cleanup)
```

### Infrastructure Upgrade Task

```
Task Title: NestJS Dynamic Module Pattern Implementation
Category: infrastructure
Problem: ConfigService timing issues during bootstrap
Solution: Implement forRootAsync() pattern
Breaking Changes: Module initialization order changed
Primary Benefit: Guaranteed initialization ordering
Phases: 5 phases (configs → services → integration → testing)
```

---

## Key Principles

1. **User Collaboration is Mandatory** - Every section requires user input and validation. In `--from-observation` mode (§ 1.1) the entries are the collaboration source; only the questions they leave open are asked.
2. **Transparency in Structure** - Clear 11-section format ensures completeness
3. **Breaking Changes Emphasis** - Migration paths required, not optional
4. **Risk-Aware Documentation** - Risk assessment integrated, not afterthought
5. **QA Integration** - Document prepared for QA handoff workflow
6. **Naming Convention Compliance** - Follows established project patterns

---

## Resources

See `resources/` directory for:

- `sections-guide.md` - Detailed guidance for each section
- `task-template.md` - Empty template for quick reference

---

## Success Criteria for This Skill

A successful create-task execution produces:

1. ✅ **Complete Task Document** - All 11 sections populated
2. ✅ **User-Validated Content** - Every section reviewed with user. In `--from-observation` mode (§ 1.1) the entries are the collaboration source; only the questions they leave open are asked.
3. ✅ **Proper Naming** - Follows convention (dots/hyphens pattern)
4. ✅ **Correct Directory Structure** - `docs/tasks/task.[ID].[name]/`
5. ✅ **Markdown Formatting** - Proper headers, code blocks, lists
6. ✅ **Checklist Ready** - Progress tracking with [ ] boxes
7. ✅ **QA-Ready** - Notes where QA artifacts will be created
8. ✅ **File Created** - Actually written to filesystem
