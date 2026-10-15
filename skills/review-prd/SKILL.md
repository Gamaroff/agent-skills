---
name: review-prd
description:
  "Deep interactive PRD review that verifies claims against the actual
  codebase, checks requirements traceability to epics/stories, detects staleness,
  and asks clarifying questions. Produces a co-located review report or inline action
  plan. Use to catch inaccuracies, gaps, and inconsistencies before epic/story work
  begins."
invokes: [mermaid-architect]
---

# Review PRD

## When to Use This Skill

Use this skill when:

- A PRD has been created and needs deep validation before epic/story work
- You suspect PRD claims about the codebase are outdated or incorrect
- You need to verify requirements trace through to epics and stories
- You want to check for internal contradictions between PRD sections
- You need to assess whether a PRD written weeks/months ago still reflects the codebase
- You want an interactive review that asks clarifying questions (not just a checklist)

Natural language triggers:

- "Review the PRD"
- "Check this PRD for accuracy"
- "Is this PRD still valid?"
- "Review prd.docker-infrastructure"
- "Deep review of the PRD before we write epics"
- "Validate PRD claims against the codebase"
- "Check PRD for stale requirements"

## When to Use vs /pm-checklist

**Use `/review-prd` (this skill) when**:

- PRD claims need **verification against the actual codebase** (Grep/Glob)
- You need **interactive clarification** of ambiguous requirements
- You want to check if **requirements trace to epics/stories with ACs**
- PRD may be **stale** (written weeks/months ago, codebase changed)
- You need **deep analysis with codebase evidence** for every finding

**Use `/pm-checklist` instead when**:

- You need **automated checklist validation** (60+ checks, no questions)
- PRD just finished and you want a **completeness gate** before architect handoff
- You're doing **batch validation** of PRD quality
- You want a **fast PASS/PARTIAL/FAIL** per category

**Key Difference**: `/review-prd` is **interactive and codebase-aware** (verifies claims with Grep/Glob, asks clarifying questions). `/pm-checklist` is **automated and structural** (checks section presence and quality without codebase verification).

**Complementary use**: review-prd can optionally run pm-checklist as a sub-step during its template compliance phase.

## Purpose

To conduct a comprehensive, **interactive** deep review of a PRD document, detecting:

- **Inaccuracies**: Claims about the codebase/architecture that are wrong (references non-existent services, endpoints, models)
- **Inconsistencies**: Internal contradictions (FR conflicts with NFR, epic descriptions don't match PRD goals, story ACs don't trace to requirements)
- **Gaps**: Missing sections, requirements without story coverage, stories without ACs, missing compatibility requirements
- **Staleness**: PRD written against an older codebase state; requirements already implemented or invalidated
- **Quality Issues**: Vague requirements, untestable ACs, missing metrics on NFRs, implementation leakage in FRs

**CRITICAL - Anti-Hallucination Rules**:

- Every finding MUST reference an actual file path and section
- Never invent codebase violations — cite the specific file and line found via Grep/Glob
- When Glob/Grep finds nothing, explicitly state "No existing implementation found for [X]"
- Requirements traceability MUST quote actual epic/story file paths and AC numbers
- Staleness claims MUST cite the specific code that contradicts the PRD claim

---

## Required Inputs

```yaml
required:
  - prd: Path to PRD file, PRD name (e.g. "docker-infrastructure"), or PRD directory path

optional:
  - output_mode: "report" | "inline"  # if omitted, ask user in Step 0
  - focus_areas: Specific areas to concentrate on (e.g., "technical accuracy only", "requirements traceability")
  - run_pm_checklist: true | false  # whether to run pm-checklist as part of Step 2 (default: false)
```

---

## Input Resolution

Before starting the review, resolve the input to a local file path:

**Step 1 — Detect input type:**

| Pattern                                        | Action                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| Absolute or relative file path ending in `.md` | Use directly                                      |
| Directory path containing `prd.`               | Use the `{dir}/{dir}.md` document inside it       |
| A PRD id or number (`prd.3`, `3`)              | Resolve by number — Step 2                        |
| Name string (e.g. "docker-infrastructure")     | Resolve by slug — Step 2                          |

**Step 2 — Resolve a number, an id or a name to the PRD document:**

Run this block from the repository root. It walks `${PRD_ROOT}` and keeps only files that
`references/doc-id.js` reads as a PRD **document** sitting in its own directory — never an artifact,
so a review report such as `prd.1.onboarding.review.2.pm-check.md` can never resolve as the PRD. A
number is compared as a number, so `1` cannot match `prd.12.*`. A PRD written before numbered PRDs
(`prd.{feature}/prd.{feature}.md`) still resolves by its slug, so Step 2 can report it.

```bash
# review-prd — resolve the PRD (task 204)
# INPUT: PRD_INPUT — a PRD number (3), an id (prd.3), a slug (onboarding) or a path ending in .md.
DOC_ID=.agents/skills/review-prd/references/doc-id.js
source .agents/skills/review-prd/references/resolve-paths.sh || exit 1
: "${PRD_INPUT:?bind PRD_INPUT to the PRD number, id, slug or path}"
MATCHES=$(command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const [root, raw] = process.argv.slice(2);
  if (raw.endsWith(".md")) {
    if (fs.existsSync(raw)) console.log(raw);
    process.exit(0);
  }
  const input = path.basename(raw.replace(/\/+$/, ""));
  // A bare number, or prd.{N} with no slug, selects by number.
  const asId = d.parse(`${input.startsWith("prd.") ? input : `prd.${input}`}.x`);
  const wantN = asId.ok && asId.kind === "prd" && !asId.artifact && asId.slug === "x" ? asId.prd : null;
  const wantSlug = input.replace(/^prd\./, "");
  const out = [];
  const walk = (dir) => {
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith(".md")) continue;
      const stem = e.name.slice(0, -3);
      if (path.basename(dir) !== stem) continue;            // a PRD document owns its directory
      const p = d.parse(e.name);
      const doc = p.ok ? p : d.parseLegacy(e.name);
      if (!doc.ok || doc.kind !== "prd" || doc.artifact) continue;
      const hit = wantN !== null ? p.ok && p.prd === wantN : doc.slug.includes(wantSlug);
      if (hit) out.push(full);
    }
  };
  walk(root);
  out.sort().forEach((f) => console.log(f));
' "$PWD/$DOC_ID" "$PRD_ROOT" "$PRD_INPUT")
COUNT=$(printf '%s' "$MATCHES" | grep -c .)
case "$COUNT" in
  0) echo "❌ No PRD found matching '${PRD_INPUT}'."; exit 1 ;;
  1) PRD_FILE="$MATCHES"; echo "PRD_FILE=${PRD_FILE}" ;;
  *) echo "ASK: ${COUNT} PRDs match '${PRD_INPUT}' — ask the user which, bind PRD_INPUT to its path, and re-run:"
     printf '%s\n' "$MATCHES"; exit 3 ;;
esac
```

Exit 1 → Step 4 below. Exit 3 → ask the user which PRD with `AskUserQuestion`, bind `PRD_INPUT` to
that path, and run the block again. A root-level `docs/prd.md` resolves only when given as a path;
Step 2 reports it as a PRD that predates numbering.

**Step 3 — Handle sharded PRDs:**

If the PRD directory contains multiple `.md` files (sharded via shard-prd), identify all shards and load them as a combined PRD. Look for an `index.md` or the primary `prd.*.md` file as the entry point.

**Step 4 — Verify PRD exists.**

If no match found: HALT with message:

```
"No PRD found matching '[input]'. Available PRDs:"
```

Then list the PRDs under `${PRD_ROOT}` — the rows of `${PRD_ROOT}/prd-registry.md` when it exists, and
the `prd.*/` directories otherwise.

---

## 13-Step Workflow

### Step 0 — Determine Output Mode

**Purpose**: Choose between async review report or immediate action plan.

Use `AskUserQuestion`:

```yaml
question: "How would you like the review output delivered?"
header: "Output Mode"
options:
  - label: "Co-located report"
    description: "Save a prd.{P}.{feature}.review.{N}.{name}.md alongside the PRD file for async review and future reference."
  - label: "Inline action plan"
    description: "Present prioritised recommendations immediately as numbered steps to action now."
```

Store choice as `output_mode` for Step 11.

**Initialize task list** — use `TaskCreate` to register every step as a tracked task. Mark each `in_progress` before starting and `completed` immediately after finishing. This prevents silently skipping steps.

| Task Subject                    | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| Determine output mode           | Capture report vs inline action-plan preference                   |
| Load PRD & references           | Locate PRD file, template, architecture docs, child epics/stories |
| Template/structure compliance   | Verify PRD structure against brownfield template                  |
| Technical accuracy verification | Grep/Glob codebase for claims made in PRD                         |
| Requirements quality            | Measurability, leakage, traceability, SMART NFRs                  |
| QP1: Structure & accuracy       | Ask clarifying questions about structure and accuracy findings    |
| Epic & story alignment          | Check child epics/stories match PRD description                   |
| Requirements traceability       | FR -> epic -> story -> AC mapping                                 |
| Consistency check               | Detect internal contradictions between PRD sections               |
| QP2: Alignment & traceability   | Ask clarifying questions about alignment findings                 |
| Staleness detection             | Compare PRD claims against current code state                     |
| Quality & clarity scoring       | 6-dimension scorecard                                             |
| QP3: Quality & final            | Ask final clarifying questions                                    |
| Recommendations                 | Produce prioritised action list                                   |
| Generate output                 | Produce report file or inline action plan                         |
| Apply findings                  | Offer to fix PRD directly                                         |

---

### Step 1 — Load PRD & Reference Documents

**Purpose**: Establish all context needed for the review.

**Actions** (run in parallel where possible):

1. **Locate and load PRD file** using Input Resolution above

2. **Load brownfield PRD template** for compliance baseline:
   - `brownfield-prd-template` skill's template YAML defines required sections
   - Use these section IDs as the compliance checklist: `intro-analysis`, `requirements`, `ui-enhancement-goals`, `technical-constraints`, `epic-structure`, `epic-details`

3. **Load architecture docs** (all in parallel):
   - `.claude/backend-patterns.md`
   - `.claude/database-redis.md`
   - `.claude/testing.md`
   - `${ARCH_ROOT}/routing-and-file-structure.md`
   - `docs/standards/file-naming.md`
   - `.claude/notifications.md` (if PRD touches notifications)

4. **Scan for child epics** — relative to the resolved PRD's directory:
   - Glob: `{PRD dir}/epics/epic.*/epic.*.md`

5. **Scan for child stories** under each epic found:
   - Glob: `{PRD dir}/epics/epic.*/stories/**/story.*.md`

6. **Load the PRD registry and the PRD's epic index**:
   - `${PRD_ROOT}/prd-registry.md` — the PRD's row, number and status
   - The PRD's `<!-- epics-index-start -->` … `<!-- epics-index-end -->` block, when it has one

**Output**: Full context package ready for analysis.

---

### Step 2 — Template/Structure Compliance

**Purpose**: Verify the PRD contains every required section from the brownfield template.

Score each section: ✅ Complete | ⚠️ Partial | ❌ Missing

**Required sections to check**:

| Section                                 | Checks                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intro Project Analysis & Context**    | Existing Project Overview, Documentation Analysis, Enhancement Scope (type + description + impact), Goals/Background, Change Log — all present                                                                                                                                                |
| **Functional Requirements (FR)**        | Numbered FR list present, each FR has clear description, integration awareness mentioned                                                                                                                                                                                                      |
| **Non-Functional Requirements (NFR)**   | Numbered NFR list present, each NFR has measurable target (not vague adjectives)                                                                                                                                                                                                              |
| **Compatibility Requirements (CR)**     | CR1 (API), CR2 (DB), CR3 (UI), CR4 (Integration) — all four present and specific                                                                                                                                                                                                              |
| **UI Enhancement Goals**                | Present if enhancement includes UI changes; absent is acceptable if no UI impact stated                                                                                                                                                                                                       |
| **Technical Constraints & Integration** | Tech stack, integration approach, code organization, deployment, risk assessment — all subsections present                                                                                                                                                                                    |
| **Epic & Story Structure**              | (1) 6-signal complexity rubric applied and score documented; (2) single-epic choice is justified with explicit rationale if score is 0–2; (3) multiple epics proposed if score is 3+, each named and mapped to a PRD functional area; (4) cross-epic dependency map present if multiple epics |
| **Epic Details**                        | Per-epic: goal stated, stories in user-story format, ACs numbered, IV (Integration Verification) sections present                                                                                                                                                                             |

**Also check**:

- No unfilled placeholders: `{{...}}`, `[TBD]`, `[TODO]`, `YYYY-MM-DD`
- **Numbering (blocking)** — see [§ Numbering check](#numbering-check) below. Every finding is **Critical**.
- **Change Log — presence and currency** (conditional; canonical spec: [`document-change-log.md`](references/document-change-log.md)). Read `change-log.enabled` from `skills-config.yaml`; it defaults to **`true`**, unlike sign-off. Skip entirely when `change-log.enabled: false` or `change-log.enforcement: off`. Otherwise check two things:
  - **Presence** — a Change Log section with at least one row. **PRDs keep `### Change Log` nested under §1** — accept H3 (and optional section numbering, e.g. `### 1.5 Change Log`); do not flag it for not being H2. A PRD predating the four-column table may still have five columns; that is expected and is not a finding.
  - **Currency** — the newest row is consistent with frontmatter `status`. Flag **only** when `status` has advanced past `draft` **and** no row mentions a review or status change. Define this narrowly: a heuristic eager enough to flag legitimately quiet documents trains reviewers to ignore it, and an ignored check is a check that does not exist. A no-findings review still writes a row (Step 12), so the quiet case is covered by a writer rather than exempted here.

  Severity is driven by `change-log.enforcement`:

  | `enforcement`        | Missing or stale                                | Effect                                                        |
  | -------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
  | `advisory` (default) | **Important** issue + readiness-score deduction | None — verdict may still be GO                                |
  | `blocking`           | **Critical** issue → NO-GO                      | Downstream epic/story work should not begin until it is current |
  | `off`                | not checked                                     | None                                                          |

  Reviewer output: `- **[Important]** Change Log is stale — newest row is \`1.0 Initial draft\` (2026-05-11) but status is \`approved\`. Enforcement is \`advisory\`, so this does not block downstream work.`

  **Expect legacy PRDs to report exactly one Important finding.** There is no backfill, and `advisory` is the default precisely so those documents score one point lower while still returning GO.
- YAML frontmatter present with `status`, `version`, `created`, `updated` fields
- **OKF frontmatter conformance** (see [`open-knowledge-format.md`](references/open-knowledge-format.md)): `type: prd` present and non-empty → **Critical** if missing/empty (OKF's one hard requirement); `description` (one-sentence summary) present → **Important** if missing; `tags` is a list / `resource` is a URI when present → **Optional** if malformed

#### Numbering check

Every PRD is `prd.{P}.{feature}`, every epic under it `epic.{P}.{E}`, every story `story.{P}.{E}.{S}`,
and the PRD is registered in `${PRD_ROOT}/prd-registry.md`. Check the PRD and everything under it in
one pass — the engine's corpus check over `${PRD_ROOT}`, kept to the PRD's own directory:

```bash
# review-prd — numbering check (task 204)
# INPUT: PRD_FILE from Input Resolution.
DOC_ID=.agents/skills/review-prd/references/doc-id.js
source .agents/skills/review-prd/references/resolve-paths.sh || exit 1
: "${PRD_FILE:?bind PRD_FILE to the resolved PRD}"
NUMBERING=$(command node -e '
  const d = require(process.argv[1]);
  const path = require("path");
  const [root, file] = process.argv.slice(2);
  const dir = path.resolve(path.dirname(file)) + path.sep;
  const findings = [];
  if (!(dir + "x").startsWith(path.resolve(root) + path.sep)) {
    findings.push({ reason: "bad-shape", path: path.resolve(file),
      detail: `outside ${root} — a PRD written before numbered PRDs` });
  }
  const r = d.runCli(["check", "--corpus", "--prd-root", root, "--json"]).payload;
  if (!["ok", "findings", "empty", "root-missing"].includes(r.reason)) {
    console.log(JSON.stringify({ reason: r.reason, findings, unreadable: r.unreadable || [] }));
    process.exitCode = 2;
  } else {
    for (const f of r.findings || []) if (f.path.startsWith(dir)) findings.push(f);
    console.log(JSON.stringify({ reason: findings.length ? "findings" : "ok", findings }));
    process.exitCode = findings.length ? 1 : 0;
  }
' "$PWD/$DOC_ID" "$PRD_ROOT" "$PRD_FILE")
case $? in
  0) echo "✅ numbering ok under $(dirname "$PRD_FILE")" ;;
  1) printf '%s' "$NUMBERING" | jq -r '.findings[] | "[Critical] numbering \(.reason): \(.path) — \(.detail)"' ;;
  *) echo "❌ numbering check could not run: $(printf '%s' "$NUMBERING" | jq -r '.reason')"; exit 1 ;;
esac
```

Report each line as a **Critical** issue carrying the engine's `reason` — there is no advisory tier,
because a wrong number propagates into every epic and story id below it. The four classes:

| Class | Engine `reason` |
| :-- | :-- |
| No PRD registry | `registry-missing` |
| PRD unnumbered (a legacy `prd.{feature}` name, or a file outside `${PRD_ROOT}`) | `bad-shape` |
| Directory, stem and frontmatter disagree | `dir-stem-mismatch`, `frontmatter-mismatch`, `unregistered` |
| Epic or story unnumbered, or carrying another PRD's `P` | `bad-shape`, `parent-number-mismatch`, `parent-missing` |

**When any fire, plan the migration** — read-only, nothing is written:

```bash
# review-prd — numbering migration plan, read-only (task 204)
# INPUT: MIG_NAME — empty, or `<path>=<slug>` for a PRD the plan cannot name (blocker unplaced-prd).
MIGRATE=.agents/skills/review-prd/references/migrate-doc-numbering.mjs
source .agents/skills/review-prd/references/resolve-paths.sh || exit 1
NAME_ARGS=()
[ -n "${MIG_NAME:-}" ] && NAME_ARGS=(--name "$MIG_NAME")
MIG=$(command node "$MIGRATE" --check --json --root "$PRD_ROOT" "${NAME_ARGS[@]}")
printf '%s' "$MIG" | jq -r '"migration: \(.reason)",
  (.blockers[]? | "  ✖ blocker \(.code): \(.path) — \(.detail)"),
  (.mapping[]? | "  \(.kind) \(.oldId) → \(.newId)   \(.old) → \(.new)")'
```

`--check` answers `needs-migration` **before** it consults its blockers, so read `blockers[]`, never
the `reason` alone:

- **No blockers** → fold the planned renames into QUESTION POINT 1 as an apply/skip question.
- **`unplaced-prd`** on a PRD the plan cannot name (a root-level `docs/prd.md`) → ask the user for its
  slug, bind `MIG_NAME` to `<path>=<slug>`, and run the plan again.
- **Any other blocker** (`dirty-path`, `in-flight`, `target-exists`, …) → report it as Critical with its
  detail and offer no apply. The blocker names what to fix first.
- **`already`** → nothing to migrate; the findings above need a hand fix.

**Optional pm-checklist integration**: If `run_pm_checklist` is true, invoke the pm-checklist skill here and incorporate its 9-category findings into this step. Otherwise, perform the lighter structural check above.

**Collect all issues — do NOT ask questions yet. Proceed to Step 3.**

---

### Step 3 — Technical Accuracy Verification

**Purpose**: Verify that every technical claim in the PRD is accurate against the actual codebase.

This is the **KEY DIFFERENTIATOR** from pm-checklist.

**Actions**:

1. **Extract all technical claims** from the PRD:
   - Services/modules mentioned (e.g., "uses AuthService", "UserModule")
   - Endpoints referenced (e.g., "POST /api/v1/users")
   - Database models/tables referenced (e.g., "User model", "waitlist table")
   - Libraries/frameworks claimed (e.g., "uses NestJS", "Express middleware")
   - File paths mentioned (e.g., "apps/{api-service}/src/auth/")
   - Architecture patterns described (e.g., "modular monolith", "event-driven")

2. **For each service/module claim**:
   - Grep: `export class [ServiceName]` across `**/*.ts`
   - If found: verify it does what the PRD claims
   - If not found: flag as "Referenced service [X] does not exist in codebase"

3. **For each endpoint claim**:
   - Grep: `@Controller`, `@Get`, `@Post`, etc. matching the route
   - Grep controller files for the path pattern
   - If found: verify method/path matches
   - If not found: flag as "Referenced endpoint [X] does not exist"

4. **For each database/model claim**:
   - Grep Prisma schema or entity files for model names
   - Verify fields match what PRD describes

5. **For each library/framework claim**:
   - Check `package.json` files for the dependency
   - Verify version constraints if PRD specifies versions

6. **For each file path claim**:
   - Glob to verify the path exists
   - If not found: flag as "Referenced path [X] does not exist"

**For each codebase search**: State result explicitly — either the file path found, or "No existing implementation found for [X]".

**Collect all issues — do NOT ask questions yet. Proceed to Step 4.**

---

### Step 4 — Requirements Quality

**Purpose**: Assess the quality of FRs, NFRs, and CRs using targeted checks.

**Check 1 — Measurability:**

Scan every FR for vague adjectives: "easy", "fast", "simple", "intuitive", "user-friendly", "seamless", "quick", "efficient" (without accompanying metrics). Scan every NFR for missing numeric criteria (must have a specific metric, e.g. "< 2s" not "fast").

Report: `[PASS] All requirements measurable` or `[FAIL] Found N vague requirements: [list]`

**Check 2 — Implementation Leakage:**

Scan FRs and NFRs for technology names that prescribe implementation rather than capability: framework names (React, Redux, Prisma), library names, data structure names (JSON, array), cloud provider names (AWS, S3). Exception: names that ARE the capability (e.g., "WebSocket", "GraphQL").

Report: `[PASS] No implementation leakage` or `[FAIL] Found leakage in: [list]`

**Check 3 — Traceability to Goals:**

For each FR, verify it can be traced to at least one stated Goal in the Goals section. An FR with no goal justification is a scope risk.

Report: `[PASS] All FRs traceable to goals` or `[WARN] N FRs lack clear goal traceability: [list]`

**Check 4 — NFR SMART Criteria:**

Each NFR must be: Specific (named metric), Measurable (number or threshold), Achievable (grounded in existing system context), Relevant (explains who it affects), Time-bound or Condition-bound (when it applies). Flag NFRs missing two or more of these.

Report: `[PASS] NFRs are SMART` or `[FAIL] N NFRs are not SMART: [list]`

**Check 5 — CR Completeness (brownfield-specific):**

Verify all four compatibility requirements are present and specific:

- CR1 (API compatibility): names specific endpoints that must remain unchanged
- CR2 (DB compatibility): mentions migration strategy
- CR3 (UI consistency): references design system or existing patterns
- CR4 (Integration compatibility): names specific integration points

Report: `[PASS] CRs complete and specific` or `[FAIL] N CRs missing or vague: [list]`

**Report total**: `Quality checks: X/5 passed`.

**Collect all issues — proceed to QUESTION POINT 1.**

---

### QUESTION POINT 1 — Structure & Accuracy Clarifications (batched, max 4 questions)

**Trigger**: After completing Steps 2–4 analysis.

**Ask questions about**:

- Critical missing sections from Step 2 (if multiple, batch into one multi-select)
- Technical claims that could not be verified in Step 3 — intentional (planned/future) vs. error?
- Requirements with implementation leakage from Step 4 — intentional constraint or needs rewording?
- Ambiguous enhancement scope boundaries

**Format**: Use `AskUserQuestion` with max 4 questions in one call. Use `multiSelect: true` for "which of these are intentional?" type questions.

**Numbering migration** — when Step 2's numbering check fired and the migration plan has no
blockers, one of the questions is *"Apply the numbering migration now?"*, showing the planned renames,
with options **Apply** and **Skip**. Apply only on an explicit **Apply**, then run the
[numbering check](#numbering-check) again — its results replace the numbering findings:

```bash
# review-prd — apply the numbering migration (task 204)
# Run ONLY after the user chose Apply. INPUT: MIG_NAME, as the plan used it.
MIGRATE=.agents/skills/review-prd/references/migrate-doc-numbering.mjs
source .agents/skills/review-prd/references/resolve-paths.sh || exit 1
NAME_ARGS=()
[ -n "${MIG_NAME:-}" ] && NAME_ARGS=(--name "$MIG_NAME")
MIG=$(command node "$MIGRATE" --apply --json --root "$PRD_ROOT" "${NAME_ARGS[@]}")
case $? in
  0) echo "migration: $(printf '%s' "$MIG" | jq -r '.reason') — re-run the numbering check" ;;
  *) echo "❌ migration: $(printf '%s' "$MIG" | jq -r '.reason + " " + (.error // "")')"
     printf '%s' "$MIG" | jq -r '.blockers[]? | "  ✖ \(.code): \(.path) — \(.detail)"'
     exit 1 ;;
esac
```

The migration moves files with `git mv` and leaves the changes uncommitted, so the PRD path may have
changed: resolve it again (Input Resolution, by its new number) before the re-check. A failure is
reported with the engine's reason and any revert command it printed; nothing is retried.

**Example question**:

```yaml
question: "The PRD references 'PaymentService' and 'POST /api/v1/payments', but neither exists in the codebase. Are these planned features described in the PRD, or should they reference existing implementations?"
header: "Unverified Claims"
options:
  - label: "Planned — these will be built"
    description: "The PRD correctly describes features to be implemented. No change needed."
  - label: "Error — should reference existing code"
    description: "These are incorrect references. I will flag them for correction."
  - label: "Partially planned"
    description: "Some are planned, some are errors. Let me clarify which is which."
```

**After answers**: Update issue severity based on user's clarifications. Proceed to Step 5.

---

### Step 5 — Epic & Story Alignment

**Purpose**: Verify child epics and stories match the PRD's stated scope.

**Skip this step** if no child epics/stories found in Step 1.

**Actions**:

1. For each child epic:
   - Does the epic's goal align with a PRD deliverable?
   - Does the epic's scope stay within PRD boundaries?
   - Are there epic deliverables not mentioned in the PRD?
   - Does the epic's `prd_source` frontmatter point to this PRD?

2. For each story under each epic:
   - Does the story implement a requirement from the PRD?
   - Do story ACs align with PRD requirements?
   - Are there story features that appear in the PRD's "Out of Scope" section?

3. Build an **Epic Coverage Matrix**:

| PRD Deliverable / Requirement | Covered By Epic | Covered By Story | Gap?           |
| ----------------------------- | --------------- | ---------------- | -------------- |
| [FR1: Feature description]    | epic.P.E.name   | story.P.E.1.name | ✅             |
| [FR2: Feature description]    | —               | —                | ❌ No epic     |
| [Out of Scope item]           | epic.P.E.name   | story.P.E.3.name | ⚠️ Scope creep |

**Collect all issues — do NOT ask questions yet. Proceed to Step 6.**

---

### Step 6 — Requirements Traceability

**Purpose**: Map every FR to its implementing epic, story, AC, and integration verification.

**Build a traceability matrix**:

| Requirement | Epic          | Story           | AC(s)    | IV Present?   | Status          |
| ----------- | ------------- | --------------- | -------- | ------------- | --------------- |
| FR1         | epic.1.3.docker | story.1.3.1.setup | AC1, AC3 | Yes (IV1-IV3) | ✅ Fully traced |
| FR2         | —               | —                 | —        | —             | ❌ NOT TRACED   |
| NFR1        | epic.1.3.docker | story.1.3.2.perf  | AC2      | Yes (IV3)     | ⚠️ Partial      |
| CR1         | —             | —               | —        | —             | ❌ NOT TRACED   |

**Flag**:

- Requirements with no epic coverage
- Requirements with epic but no story
- Requirements with story but no matching AC
- Stories missing Integration Verification (IV) sections (brownfield requirement)
- NFRs/CRs with no verification path

**Collect all issues — do NOT ask questions yet. Proceed to Step 7.**

---

### Step 7 — Consistency Check

**Purpose**: Cross-reference within the PRD for internal contradictions.

**Checks**:

1. **FR vs. NFR conflicts**: e.g., FR says "real-time updates" but NFR says "batch processing acceptable"
2. **FR vs. CR conflicts**: e.g., FR adds new API format but CR1 requires backward API compatibility
3. **Goals vs. Requirements**: do FRs actually implement the stated goals? Are there goals with no supporting FR?
4. **Enhancement Scope vs. Epic scope**: does the epic cover more or less than the PRD describes?
5. **Risk Assessment vs. Requirements**: are high-risk requirements acknowledged in the risk section?
6. **Technical Constraints vs. Requirements**: do requirements exceed stated technical constraints?
7. **Change Log vs. Content**: if change log references changes that don't appear in the document, flag it
8. **Story count vs. scope**: does the number of stories match the complexity implied by the enhancement scope assessment?
9. **Epic structure vs. complexity signals**: Re-score the PRD against the 6-signal rubric (domain breadth, parallelism opportunity, story volume, dependency isolation, risk isolation, timeline variance). If score is 3+ but only one epic is defined without explicit justification, flag as inconsistency. If score is 0–2 but multiple epics are defined, verify each epic is genuinely distinct — flag if they could be consolidated.

**Collect all issues — proceed to QUESTION POINT 2.**

---

### QUESTION POINT 2 — Alignment & Traceability Clarifications (batched, max 4 questions)

**Trigger**: After completing Steps 5–7 analysis.

**Ask questions about**:

- Requirements with no story coverage — intentional deferral or gap?
- Epic scope exceeding PRD scope — intentional growth or scope creep?
- Internal contradictions found — which statement is correct?
- Missing IV sections in stories — acceptable or needs fixing?

**Format**: Use `AskUserQuestion` with max 4 questions. Provide specific examples of the contradictions or gaps found, with file paths and section references.

**After answers**: Update findings. Proceed to Step 8.

---

### Step 7.5 — Mermaid Diagram Validation (via `mermaid-architect`)

**Purpose**: Validate any embedded Mermaid diagrams against syntax, metadata, and architectural-consistency rules. Recommend a diagram if the PRD lacks one and a topology view would materially clarify the spec.

**Actions**:

1. **Detect diagrams**: scan the PRD for fenced ` ```mermaid ` blocks. For each, capture: section anchor, diagram type, and whether a YAML metadata header (`<!-- mermaid-architect: ... -->`) precedes it.
2. **Invoke `mermaid-architect` in review mode** for each block found. Pass: PRD path, the section anchor, and the surrounding prose so the skill can run its consistency check (actor names match prose, diagram type matches the content, no architectural violations such as Client → Database without a Middleware where the project routes through one).
3. **Collect findings** under one of three verdicts per block: `pass`, `pass with notes`, or `fail`. Treat `fail` as a Major Issue; `pass with notes` as a Minor Issue.
4. **If no diagram is present**: assess whether one would materially clarify the PRD using the same justification rule as `create-prd` (4+ external systems, new service boundary, >2 integration alternatives worth contrasting, or sibling PRD precedent). If yes, add a Recommendation: "Add a System Topology / C4 Context diagram via `mermaid-architect`." Do NOT flag the absence as an issue if the prose already conveys the structure clearly.
5. **If a diagram is present but adds no value over the prose**: recommend removing it.

**Output**: append findings to the same Critical/Major/Minor buckets used by Steps 6–7. Carry into QUESTION POINT 2 if any user decisions are needed.

---

### Step 8 — Staleness Detection

**Purpose**: Determine if the PRD reflects the current state of the codebase.

**Actions**:

1. **Check PRD dates**: Read the `created` and `updated` fields from YAML frontmatter. Also check `git log` for the file's last modification date.

2. **Check codebase changes since PRD date**:

   ```bash
   git log --since="[PRD updated date]" --oneline -- [relevant source directories]
   ```

   If significant changes in areas the PRD covers (>10 commits), flag staleness risk.

3. **Check for already-implemented requirements**:
   - For each FR described as "to be built", Grep/Glob for implementations that may already exist
   - If a planned feature already exists in the codebase, flag as "Already Implemented"

4. **Check for invalidated assumptions**:
   - If PRD says "uses library X v2" but `package.json` shows v4, flag
   - If PRD references a file structure that has been reorganised, flag
   - If PRD references a technology that has been replaced, flag

5. **Check epic/story status vs. PRD expectations**:
   - Read status fields in child epic/story frontmatter
   - If stories are marked "accepted"/"done" but PRD presents them as planned, flag
   - If epics show completion percentage >0 but PRD hasn't been updated, flag

---

### Step 9 — Quality & Clarity Scoring

**Purpose**: Score the PRD on 6 dimensions.

Score each dimension 1–5:

| Dimension                | 1 (Poor)                                                                                                                                             | 3 (Adequate)                                                                                 | 5 (Excellent)                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Template Compliance**  | Multiple required sections missing                                                                                                                   | Most sections present, some incomplete                                                       | All sections complete, no placeholders, change log current                                                          |
| **Technical Accuracy**   | Multiple claims contradict codebase                                                                                                                  | Minor inaccuracies, most claims verified                                                     | Every technical claim verified against codebase with evidence                                                       |
| **Requirements Quality** | Vague FRs, no metrics on NFRs, implementation leakage                                                                                                | FRs testable, NFRs have some metrics                                                         | FRs WHAT-focused and testable, NFRs SMART, CRs specific and complete                                                |
| **Epic/Story Coverage**  | Most requirements not traced to stories; epic structure inappropriate for PRD complexity (single epic for high-complexity PRD with no justification) | Partial mapping, some gaps; epic count is plausible but not scored against complexity rubric | All requirements traced: FR -> epic -> story -> AC -> IV; complexity rubric documented and epic count matches score |
| **Internal Consistency** | Multiple contradictions between sections                                                                                                             | Minor inconsistencies                                                                        | No contradictions, all sections align perfectly                                                                     |
| **Staleness/Currency**   | PRD significantly out of date, features already implemented                                                                                          | Some staleness, minor drift from codebase                                                    | PRD reflects current codebase state, all claims current                                                             |

**Overall score**: Average of 6 dimensions. Interpret as:

- 4.5–5.0: Excellent — proceed to epic/story work
- 3.5–4.4: Good — minor fixes recommended
- 2.5–3.4: Fair — significant gaps, fix before proceeding
- 1.0–2.4: Poor — major rework needed

**PRD Split Detection** — flag if ANY of:

- More than 8 epics defined (multiple epics per domain is intentional; excessive epic count signals the PRD has grown into two products)
- Enhancement spans more than 4 distinct product domains (note: multi-domain PRDs are expected — this threshold is for genuinely separate products)
- Estimated total stories exceed 30

**Note**: Multiple epics within a single PRD are intentional by design when the complexity rubric scores 3+. Do NOT flag a PRD as needing splitting purely because it has 3–6 epics — this is the expected outcome for complex features. Only recommend a split when the epics clearly represent independent products with separate users, separate deployment lifecycles, or no shared requirements.

If flagged: recommend splitting into separate PRDs and suggest scope boundaries.

---

### QUESTION POINT 3 — Quality & Final Clarifications (batched, max 4 questions)

**Trigger**: After Step 9 scoring.

**Ask questions about**:

- PRD split recommendation (confirm if scope is intended to be large or should be divided)
- Staleness findings — should PRD be updated now or is a revision already planned?
- Priority/timeline concerns discovered during review
- Whether to update the Change Log and YAML frontmatter with review date

---

### Step 10 — Recommendations

**Purpose**: For every issue found, produce a specific, actionable recommendation.

**Recommendation format**:

```
**Issue**: [Clear description of the problem]
**Location**: [File path + section/line]
**Severity**: Critical | Major | Minor
**Recommendation**: [Specific action to take]
**Reference**: [Exact doc/file that defines the correct approach]
```

**By issue type**:

| Issue Type                | Recommendation Approach                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Missing section           | Quote the template section header and provide example content                                                       |
| Incorrect technical claim | Cite the Grep/Glob result that disproves it, provide correct information                                            |
| Untraceable requirement   | Show the gap in the traceability matrix, suggest epic/story to create                                               |
| Implementation leakage    | Show the FR text, rewrite as WHAT-focused requirement                                                               |
| Vague requirement         | Show the text, provide a measurable alternative                                                                     |
| Internal contradiction    | Show both conflicting statements, propose resolution                                                                |
| Staleness                 | Show the git log evidence or codebase state, suggest updated text                                                   |
| Missing IV section        | Provide IV template (IV1: existing functionality, IV2: integration point, IV3: performance impact)                  |
| Missing CR                | Provide CR template with brownfield-specific prompts                                                                |
| Inappropriate single epic | Score PRD against 6-signal rubric, show the score, propose a named multi-epic breakdown aligned to functional areas |
| Unjustified multi-epic    | Show complexity score, explain why the epics could be consolidated, propose consolidation or explicit rationale     |
| PRD split needed          | Suggest scope boundaries with requirement assignments per new PRD                                                   |

---

### Step 11 — Generate Output

**Option A — Co-located Report**:

Save to: `{PRD dir}/{PRD stem}.review.{N}.{name}.md` — for `prd.1.onboarding.md`,
`prd.1.onboarding.review.{N}.{name}.md` (`docs/standards/file-naming.md`, PRD review report row). It
carries the PRD's full stem, so `doc-id.js` reads it as an artifact of that PRD, never as the PRD.

`{N}` is the highest existing plus 1 — 1 when there is none, never the number of reports plus 1 —
read through `doc-id.js`, which owns the artifact grammar:

```bash
# review-prd — next review report number (task 204)
# INPUT: PRD_FILE from Input Resolution.
DOC_ID=.agents/skills/review-prd/references/doc-id.js
: "${PRD_FILE:?bind PRD_FILE to the resolved PRD}"
REVIEW_N=$(command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const file = process.argv[2];
  const stem = path.basename(file, ".md");
  const own = (n) => (d.parse(n).ok ? d.parse(n) : d.parseLegacy(n));
  const me = own(path.basename(file));
  let high = 0;
  for (const n of fs.readdirSync(path.dirname(file))) {
    if (!n.startsWith(`${stem}.review.`)) continue;     // reports of this PRD only
    const a = own(n);
    if (a.ok && a.kind === "prd" && a.artifact === "review" && a.prd === me.prd && a.seq > high) high = a.seq;
  }
  console.log(high + 1);
' "$PWD/$DOC_ID" "$PRD_FILE") || exit 1
PRD_STEM=$(basename "$PRD_FILE" .md)
echo "REPORT=$(dirname "$PRD_FILE")/${PRD_STEM}.review.${REVIEW_N}.{name}.md"
```

**Report structure**:

```markdown
# PRD Review Report: [PRD Name]

**Review Date**: YYYY-MM-DD
**Reviewer**: Claude (review-prd skill)
**Output Mode**: Report
**PRD File**: [relative path to PRD file]

---

## Executive Summary

**Overall Score**: [X.X / 5.0] — [Excellent | Good | Fair | Poor]
**Critical Issues**: [N]
**Major Issues**: [N]
**Minor Issues**: [N]
**Total Recommendations**: [N]
**Epic/Story Readiness**: ✅ Ready | ⚠️ Fix First | ❌ Major Rework Needed

---

## Score Card

| Dimension            | Score       | Notes        |
| -------------------- | ----------- | ------------ |
| Template Compliance  | [X/5]       | [brief note] |
| Technical Accuracy   | [X/5]       | [brief note] |
| Requirements Quality | [X/5]       | [brief note] |
| Epic/Story Coverage  | [X/5]       | [brief note] |
| Internal Consistency | [X/5]       | [brief note] |
| Staleness/Currency   | [X/5]       | [brief note] |
| **Overall**          | **[X.X/5]** |              |

---

## Critical Issues (Must Fix)

[List each critical issue with file + section reference and recommendation]

---

## Major Issues (High Priority)

[List each major issue]

---

## Minor Issues / Suggestions

[List each minor issue]

---

## Technical Accuracy Audit

| Claim in PRD             | Verification Result              | Status                                  |
| ------------------------ | -------------------------------- | --------------------------------------- |
| [Service/endpoint/model] | [File path found OR "Not found"] | ✅ Verified / ❌ Not Found / ⚠️ Partial |

---

## Requirements Traceability Matrix

| Requirement | Epic       | Story       | AC(s)        | IV?      | Status                     |
| ----------- | ---------- | ----------- | ------------ | -------- | -------------------------- |
| FR1         | [epic ref] | [story ref] | [AC numbers] | [Yes/No] | [Fully/Partial/Not traced] |

---

## Staleness Assessment

| PRD Claim        | Current Codebase State     | Status                             |
| ---------------- | -------------------------- | ---------------------------------- |
| [Claim from PRD] | [What actually exists now] | ✅ Current / ⚠️ Drifted / ❌ Stale |

---

## Requirements Quality Summary

| Check                  | Result                |
| ---------------------- | --------------------- |
| Measurability          | [PASS/FAIL — details] |
| Implementation Leakage | [PASS/FAIL — details] |
| Traceability to Goals  | [PASS/WARN — details] |
| NFR SMART Criteria     | [PASS/FAIL — details] |
| CR Completeness        | [PASS/FAIL — details] |
| **Total**              | **X/5 passed**        |

---

## Recommended Actions (Prioritised)

1. [Action 1 — Critical]
2. [Action 2 — Critical]
3. [Action 3 — Major]
   ...

---

## User Decisions Captured

[Record answers from all 3 question points]

---

## PRD Split Recommendation

[If applicable: proposed split with scope boundaries and requirement assignments]
```

**Option B — Inline Action Plan**:

Present immediately in conversation as:

```
## PRD Review: [PRD Name] — Inline Action Plan

**Score**: [X.X/5.0] | **Ready for epic/story work**: ✅/⚠️/❌

### Fix Structure (do these first)
1. [Specific fix with section reference]
2. ...

### Correct Technical Claims
1. [Specific fix — cite codebase evidence]
2. ...

### Improve Requirements Quality
1. [Specific fix — rewrite vague requirement]
2. ...

### Close Traceability Gaps
1. [Specific fix — missing epic/story/AC]
2. ...

### Update Stale Content
1. [Specific fix — cite git log evidence]
2. ...

### Resolve Contradictions
1. [Specific fix — cite both conflicting statements]
2. ...

### PRD Split Recommendation
[If applicable]
```

---

### Step 12 — Apply Findings

**Purpose**: Offer to apply the findings from the report/plan directly to the PRD file.

Use `AskUserQuestion`:

```yaml
question: "Would you like the findings from the review to be applied to the PRD file now?"
header: "Apply Fixes"
options:
  - label: "Yes — apply all fixes"
    description: "Apply every Critical and Major fix from the report/plan directly to the PRD file now."
  - label: "Yes — apply critical only"
    description: "Apply only Critical fixes now. Leave Major and Minor for a later pass."
  - label: "No — I will apply them manually"
    description: "Leave the PRD file unchanged. Use the report/plan as a reference to apply fixes yourself."
```

**If "Yes — apply all fixes" or "Yes — apply critical only"**:

1. Work through each applicable recommendation from Step 10 in order of severity (Critical first, then Major)
2. For each fix, use the Edit tool to apply the change directly to the PRD file
3. Do NOT rewrite sections that were not flagged — only touch what the recommendation covers
4. After all edits, read back the changed sections to verify correctness
5. Report which fixes were applied and which (if any) were skipped with reason
6. **Mark recommendations as implemented** — update both documents:

   **In the review report** (`{PRD stem}.review.{N}.{name}.md`):
   - Add the following line immediately after the Epic/Story Readiness line in the Executive Summary:
     `> **Implementation Status**: ✅ All [N] recommendations implemented — YYYY-MM-DD`
     (or: `> **Implementation Status**: ✅ Critical/Major recommendations implemented — YYYY-MM-DD` if partial)
   - In the Recommended Actions list, prefix each applied recommendation with `✅ ` and each skipped one with `⏭️ skipped —` followed by the reason

   **In the PRD file** (`prd.{P}.{feature}.md`):
   - Append the following row to the Change Log — four columns, canonical format: [document-change-log.md](references/document-change-log.md). A review verdict bumps the minor version; `Author` is the skill name, not `Claude`:
     `| YYYY-MM-DD | [version] | Applied [N] recommendations from review-prd | review-prd |`
   - Update the `updated` YAML frontmatter field to today's date **in the same edit** — a row that does not move `updated` leaves the PRD claiming it was last touched before its own most recent recorded change
   - Skip both when `change-log.enabled: false` in `skills-config.yaml`

   > **PRDs keep `### Change Log` nested under §1** — do not promote it to `##`. The level found is the level preserved.
   >
   > **A PRD created before the four-column table may still have five columns.** Append four columns anyway and do **not** rewrite the header or any existing row: the log is append-only, and widening a legacy table is a deliberate manual one-time edit. The result renders visibly ragged until someone does that, which is expected and documented — not a defect to fix mid-review.

**If "No — I will apply them manually"**:

- Confirm the report/plan file path for reference and close the skill

---

## Key Anti-Hallucination Rules

1. **Every finding** must reference an actual file path and section header
2. **Never invent codebase violations** — if you cannot verify, say "could not verify against [file]"
3. **Codebase search results**: When Glob/Grep finds nothing, state explicitly: "No existing implementation found for [X]"
4. **Technical accuracy**: Every claim about what exists/doesn't exist in the codebase must be backed by a Grep/Glob result
5. **Requirements traceability**: Must quote the actual epic/story file path and AC number
6. **Staleness claims**: Must cite the specific git log entry or code that contradicts the PRD
7. **Recommendations** must be specific actions, not vague suggestions like "improve this section"
8. **Score justifications**: Every score must reference specific issues or confirm specific compliance

---

## Critical Files Reference

| File                                         | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| Brownfield PRD template YAML                 | Template compliance baseline (section structure)          |
| `${PRD_ROOT}/prd-registry.md`                | PRD number and status; numbering check                    |
| `references/doc-id.js`                       | PRD resolution, numbering check (`check --corpus`)        |
| `references/migrate-doc-numbering.mjs`       | Numbering migration plan (`--check`) and apply            |
| `.claude/backend-patterns.md`                | Architecture source — NestJS, API, DI                     |
| `.claude/database-redis.md`                  | Architecture source — DB, Redis, safety rules             |
| `.claude/testing.md`                         | Architecture source — test standards, co-location         |
| `${ARCH_ROOT}/routing-and-file-structure.md` | Routing and file structure                                |
| `docs/standards/file-naming.md`       | Naming rules (PascalCase, kebab-case, handle)             |
| `skills/pm-checklist/SKILL.md`               | Complementary checklist validation (optional integration) |
| `skills/review-epic/SKILL.md`                | Pattern reference for question batching and scoring       |
