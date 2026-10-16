---
name: create-prd
description: Create Product Requirements Documents. Default mode is brownfield (enhancements to existing projects with 4+ stories or architectural changes). Greenfield mode is invoked indirectly via the new-product-prd skill. Orchestrates create-doc, the appropriate PRD template, and pm-checklist.
invokes: [create-doc, prd-template, brownfield-prd-template, pm-checklist, mermaid-architect]
---

# PRD Creation

## When to Use This Skill

Activate this skill directly for **brownfield enhancements** to existing projects:

- Add **significant enhancements** to existing codebase (4+ stories, architectural changes)
- Integrate new **major features** into established systems
- Perform **substantial modifications** requiring comprehensive planning
- Add features that require **deep understanding** of existing architecture

**Natural activation triggers (brownfield):**

- "Add [major feature] to existing app"
- "Enhance [existing system] with..."
- "Integrate [new capability] into our..."
- "Modify [existing product] to support..."

**Decision Tree (brownfield):**

- **Large enhancement** (4+ stories, architectural changes) → Use THIS skill
- **Medium enhancement** (1-3 stories, follows existing patterns) → Use `create-epic`
- **Small change** (single session, isolated) → Use `brownfield-story`

**Do NOT use directly for:**

- Greenfield projects → activate `new-product-prd` (which delegates here with `mode=greenfield`)
- Small enhancements (use `create-epic` or `brownfield-story`)
- Bug fixes (use GitHub issues)

## Mode Parameter

This skill supports two modes. The mode determines pre-flight checks, template selection, validation depth, and which PRD sections are emitted.

**Resolve paths first.** Source `references/resolve-paths.sh` to populate `${PRD_ROOT}` (default `docs/prd`). Output paths below use this env var.

| Mode         | Default | Set by                           | Template                  | Output path                                                   |
| ------------ | ------- | -------------------------------- | ------------------------- | ------------------------------------------------------------- |
| `brownfield` | yes     | direct activation                | `brownfield-prd-template` | `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md`  |
| `greenfield` | no      | delegated from `new-product-prd` | `prd-template`            | `${PRD_ROOT}/{product}/prd.{P}.{product}/prd.{P}.{product}.md` |

`{P}` is the PRD number. It is allocated in [Step 1.5](#step-15-allocate-the-prd-number-both-modes)
from the PRD registry (`${PRD_ROOT}/prd-registry.md`) and never typed by hand. Both modes use the same
layout, so one checker rule covers every PRD; a greenfield PRD's `{domain}` defaults to the product
slug.

Throughout this skill, sections marked **(brownfield only)** or **(greenfield only)** apply to the respective mode. Sections without a mode tag run in both.

## ⚠️ Documentation-Only Scope — Do NOT Implement

This skill produces **the PRD document and its associated planning artifacts only** (epic files via subsequent skills, tracker issues, handoff prompts). It MUST NOT begin implementing any feature the PRD describes, nor scaffold any source code.

**Forbidden during this skill** (regardless of how compelling it seems):

- ❌ Editing, creating, or deleting any source file outside `${PRD_ROOT}/` (and the tracker-issue side effect)
- ❌ Running migrations, codegen, build, lint-fix, or refactor commands
- ❌ Creating branches, committing, or pushing code changes
- ❌ Installing/removing dependencies or modifying `package.json`
- ❌ Auto-invoking `create-epic`, `create-story`, `develop-story`, or any implementation skill on completion
- ❌ Starting "phase 1" of any epic or story to "get a head start"

**Allowed writes** (the only filesystem changes this skill may make):

- ✅ The PRD file (`${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md`, both modes) and its directory
- ✅ The PRD registry, `${PRD_ROOT}/prd-registry.md` — one row for a new PRD (Step 2), created when absent
- ✅ Tracker issue creation if the workflow includes it
- ✅ Handoff prompt files (Architect/UX Expert) emitted as part of Step 4

**If the user asks to "create the PRD and start the first epic"**: complete the PRD (including Step 4 handoff prompts), then STOP and explicitly hand off — tell user to invoke `/create-epic` or `/create-epics-from-shards` as a separate step. Do not chain.

## Step 0: Scope Assessment (brownfield only)

Skip for `mode=greenfield` — a new product already implies large scope.

**BEFORE proceeding (brownfield only), assess enhancement complexity:**

1. **Can this be completed in 1-2 focused development sessions?**
   - YES → Recommend `brownfield-story` instead
   - NO → Continue with this skill

2. **Does this require architectural changes or 4+ stories?**
   - NO → Recommend `create-epic` instead
   - YES → Continue with this skill

3. **Is comprehensive planning required?**
   - NO → Recommend simpler approach
   - YES → Continue with this skill

**Communicate assessment:**

```
"Based on the complexity you've described, this appears to be a
[large/medium/small] enhancement. For this scope, I recommend using
[create-prd/create-epic/brownfield-story] because [rationale]."
```

## Prerequisites

### Brownfield mode

1. **Existing Project Analysis** (CRITICAL):
   - Check if `document-existing-project` was already run
   - If YES → Use existing analysis
   - If NO → Strongly recommend running `document-existing-project` first
   - Benefits: Tech stack documentation, architecture overview, technical debt assessment, API docs

2. **Project Context** (ESSENTIAL):
   - IDE with project already loaded (preferred), OR
   - User-provided project information
   - Existing documentation in `docs/` folder

3. **Deep Understanding Requirement**:
   - MUST thoroughly analyze existing project structure, patterns, constraints
   - Every recommendation MUST be grounded in actual project analysis (not assumptions)
   - Confirm understanding with user before ANY suggestions

### Greenfield mode

1. **Project Brief** (strongly recommended) — problem statement, target users, success metrics, MVP scope, constraints
2. **Market Research** (optional) — competitive analysis, user research, market context
3. **Business Goals** (essential) — why building, what success looks like, timeline

If Project Brief is missing, the template will guide gathering this during the Goals section, but creating a brief first is more efficient.

## Workflow Overview

```
1. Pre-Flight Check & Analysis
   ├─ (brownfield) Continuation detection, document discovery,
   │   document-existing-project check, scope, project analysis
   └─ (greenfield) Project Brief check, optional deep-research-prompt

1.5 Allocate the PRD Number (both modes)
   └─ doc-id.js: a new number from the PRD registry, or the found PRD's own

2. Interactive PRD Creation
   ├─ Activate create-doc with template (mode-selected)
   ├─ Process sections (mode-conditional subsections)
   ├─ Save to ${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md
   └─ Register a new PRD (appendPrdRow)

2.5 Visual Architecture Diagram (conditional, via mermaid-architect)

3. Quality Validation
   ├─ pm-checklist (both modes)
   └─ (brownfield) 4 targeted requirement-quality checks

3.5 Numbering Check — doc-id check, blocking

4. Next Steps & Handoff
   ├─ UX Expert prompt (if UI)
   ├─ Architect prompt
   └─ (brownfield) Integration testing & rollback guidance
```

## PRD Frontmatter (OKF conformance)

The PRD's YAML frontmatter (written during "Interactive PRD Creation") must include OKF v0.1 fields: a non-empty `type: prd` (OKF's one hard requirement), a one-sentence `description` (OKF-recommended), and optional `tags`. These sit alongside the existing `name`, `title`, `mode`, `status`, `version`, `created` fields. Two of those carry the PRD number from [Step 1.5](#step-15-allocate-the-prd-number-both-modes): `name: prd.{P}.{feature}`, and `prd_number: {P}` (an integer, required — `doc-id check` compares it with the file name). See [prd-documents.md](../../docs/standards/prd-documents.md) and [OKF conformance](references/open-knowledge-format.md).

## Detailed Execution Steps

### Step 1: Pre-Flight Check & Analysis

#### Greenfield branch (mode=greenfield)

**1a. Project Brief check:**

1. Ask if Project Brief exists
2. If NO:
   - **Strongly recommend** creating Project Brief first (essential foundation, clearer scope, better PRD)
   - If user insists on PRD without brief, proceed but note this in the PRD
3. If brief exists:
   - Request brief location/content and review

**1b. Market validation:**

- If uncertain about market fit → recommend `deep-research-prompt`
- If confident → proceed to PRD creation

**Example dialog:**

```
"Do you have a Project Brief for this product? It provides essential
foundation (problem statement, target users, success metrics, MVP scope,
constraints). Creating a brief first will make the PRD process much smoother.

If no brief exists, I can still create the PRD, but we'll need to gather
that foundational information as we go."
```

Skip to Step 1.5 once pre-flight complete.

#### Brownfield branch (mode=brownfield, default)

**1a. Continuation Detection (check FIRST):**

Before anything else, scan for an existing in-progress PRD for this feature:

- Check `${PRD_ROOT}/` and subdirectories for any PRD file related to the enhancement being discussed
- If found, read it and check its `stepsCompleted` frontmatter field (or infer completion from section headings)
- If a PRD is found, determine whether it is incomplete or complete, then report to the user:

**If incomplete:**

```
"I found an existing PRD at [path] that appears to cover [topic].
It looks like [sections X, Y were completed / it was started but not finished].

Options:
[R] Resume — Continue from where it left off
[S] Start fresh — Rewrite this PRD from the beginning (existing file will be overwritten; it keeps its number)
[V] View — Show me the existing PRD first

What would you like to do?"
```

**If complete (all sections present):**

```
"I found a completed PRD at [path] covering [topic].

Options:
[E] Extend — Add a new epic area to this PRD
[R] Revise — Edit or update an existing section
[N] New PRD — Create a new, separate PRD (new number; this one is untouched)
[V] View — Show me the existing PRD first

What would you like to do?"
```

Wait for user selection before proceeding.

**Every option but *New PRD* keeps the found PRD's number.** Resume, Start fresh, Extend and Revise
all work on the same document, so they reuse its `P` — run [§ Keep the found PRD's number](#keep-the-found-prds-number)
in Step 1.5 and allocate nothing. Only *New PRD* allocates. A found PRD whose name carries no number
(`prd.{feature}.md`, written before numbered PRDs) is **not** continued: that block halts and points
at `/review-prd`, which reports it and offers the migration.

**1b. Active Input Document Discovery:**

Scan the project for existing reference documents before asking the user for anything:

- `*brief*.md` — Product or feature briefs
- `*research*.md` — Research or analysis documents
- `${PRD_ROOT}/**` — Prior PRD artefacts
- `docs/project-context.md` — Project context (loaded automatically)
- `${ARCH_ROOT}/**` — Architecture documentation

Report findings:

```
"I found the following reference documents:
- Product briefs: [list or 'none found']
- Research docs: [list or 'none found']
- Project context: [list or 'none found']
- Architecture docs: [list or 'none found']

I'll use these to inform the PRD. Are there any other documents
you'd like me to include before we begin?"
```

Load all confirmed documents before proceeding.

**1c. Check for document-existing-project Output:**

```
"Have you run document-existing-project on this codebase? It provides:
- Complete tech stack documentation
- Architecture overview
- API documentation
- Technical debt assessment
- Coding standards

If not available, I STRONGLY recommend running it first for better
enhancement planning."
```

**1d. Analyze Existing Project:**

**If document-existing-project available:**

- Extract from "High Level Architecture" section
- Review "Technical Summary"
- Note "Technical Debt and Known Issues"
- Reference "Workarounds and Gotchas"

**Otherwise:**

- Explore project structure (directories, key files)
- Identify tech stack (languages, frameworks, database)
- Understand architecture patterns
- Note integration points
- Identify technical debt

**1e. Confirm Understanding (CRITICAL):**

For every assumption made about existing project:

```
"Based on my analysis, I understand that [assumption].
Is this correct?"
```

**Examples:**

- "I see you're using NestJS with PostgreSQL and Prisma"
- "Your authentication uses JWT with Passport.js"
- "The codebase follows a modular monolith architecture"

**Do NOT proceed until user validates understanding.**

### Step 1.5: Allocate the PRD Number (both modes)

Every PRD is `prd.{P}.{feature}`, and `P` comes from the PRD registry through `references/doc-id.js` —
never from counting directories and never from a number typed by hand. Run exactly one of the two
blocks below from the repository root. The resulting paths feed Step 2.

Resolve `{domain}` and `{feature}` first. Brownfield: the domain directory under `${PRD_ROOT}` and the
feature slug. Greenfield: ask for `{domain}` once, recommending the product slug, and use the product
slug as `{feature}`. Both are lowercase kebab-case beginning with a letter; the block refuses anything
`doc-id.js` cannot format.

#### Allocate a new PRD number

For a new PRD — no PRD was found, the user chose *New PRD* in continuation detection, or greenfield:

```bash
# create-prd — allocate a new PRD number (task 204)
# INPUTS: DOMAIN and FEATURE (kebab-case, starting with a letter). PRD_ROOT is resolved HERE.
DOC_ID=.agents/skills/create-prd/references/doc-id.js
source .agents/skills/create-prd/references/resolve-paths.sh || exit 1
: "${DOMAIN:?bind DOMAIN to the domain directory of the PRD}" "${FEATURE:?bind FEATURE to the feature slug}"
# One node process: `next prd` through the engine's own CLI, and — only when the registry does not
# exist yet — the bootstrap decision and the stem, from the same module.
ALLOC=$(command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const [root, slug, domain] = process.argv.slice(2);
  // The domain is a path segment under the PRD root: the slug grammar doc-id.js applies to a
  // feature (lowercase kebab-case from a letter) is the rule for it too, so a value such as
  // ../.. or a/b can never place a PRD outside the root.
  try { d.format({ kind: "prd", prd: 1, slug: domain }); }
  catch {
    console.log(JSON.stringify({ ok: false, reason: "bad-domain",
      detail: `domain ${JSON.stringify(domain)} is not lowercase kebab-case starting with a letter` }));
    process.exit(1);
  }
  // An existing domain directory must really be under the root: a symlink out of it passes the
  // text check above and would carry the PRD with it.
  const domDir = path.join(root, domain);
  if (fs.existsSync(domDir) && fs.existsSync(root)
      && !fs.realpathSync(domDir).startsWith(fs.realpathSync(root) + path.sep)) {
    console.log(JSON.stringify({ ok: false, reason: "bad-domain",
      detail: `${domDir} resolves outside ${root}` }));
    process.exit(1);
  }
  let r = d.runCli(["next", "prd", "--prd-root", root, "--json"]).payload;
  if (r.reason === "registry-missing") {
    // No registry: number 1 is free only when no numbered PRD exists anywhere under the root.
    const numbered = [];
    const walk = (dir) => {
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        if (!e.isDirectory()) continue;
        const p = d.parse(e.name);
        if (p.ok && p.kind === "prd" && !p.artifact) numbered.push(path.join(dir, e.name));
        walk(path.join(dir, e.name));
      }
    };
    walk(root);
    r = numbered.length
      ? { ok: false, reason: "registry-missing",
          detail: `no PRD registry, but numbered PRDs exist: ${numbered.join(", ")}` }
      : { ok: true, reason: "bootstrap", next: 1 };
  }
  if (r.ok) {
    try { r.stem = d.format({ kind: "prd", prd: r.next, slug }); }
    catch (e) { r = { ok: false, reason: "bad-slug", detail: e.message }; }
  }
  console.log(JSON.stringify(r));
  process.exitCode = r.ok ? 0 : 1;
' "$PWD/$DOC_ID" "$PRD_ROOT" "$FEATURE" "$DOMAIN") \
  || { echo "❌ PRD number not allocated: $(printf '%s' "$ALLOC" | jq -r '.reason + " — " + (.detail // "")')"; exit 1; }
P=$(printf '%s' "$ALLOC" | jq -r '.next')
PRD_STEM=$(printf '%s' "$ALLOC" | jq -r '.stem')
PRD_DIR="${PRD_ROOT}/${DOMAIN}/${PRD_STEM}"
PRD_FILE="${PRD_DIR}/${PRD_STEM}.md"
[ ! -e "$PRD_DIR" ] || { echo "❌ ${PRD_DIR} already exists — the registry is behind the tree; run /review-prd"; exit 1; }
echo "P=${P} PRD_FILE=${PRD_FILE} ($(printf '%s' "$ALLOC" | jq -r '.reason'))"
```

| `reason` | Meaning | Action |
| :-- | :-- | :-- |
| `ok` | The registry's **Next Available PRD Number** | Use `P` |
| `bootstrap` | No registry and no numbered PRD under `${PRD_ROOT}` | Use `P = 1`; the registry is created when Step 2 writes the row |
| `registry-missing` | No registry, but numbered PRDs exist | **HALT** — the registry was lost; `/review-prd` reports it. Never restart at 1 over existing numbers |
| `registry-invalid`, `registry-behind`, `unreadable` | The engine refused the registry | **HALT** with the engine's reason verbatim |
| `bad-slug` | `{feature}` cannot form a PRD name | Ask for a slug that starts with a letter, then re-run |
| `bad-domain` | `{domain}` is not a lowercase kebab-case segment (a `..`, a `/`, upper case) | Ask for a domain that is, then re-run — the PRD must land under `${PRD_ROOT}` |

A number is allocated, not reserved: nothing is written here, so a run abandoned now leaves no trace.
The registry row is written in Step 2, beside the file.

#### Keep the found PRD's number

For Resume, Start fresh, Extend and Revise — the found PRD keeps its `P`:

```bash
# create-prd — keep the found PRD's number (task 204)
# INPUT: FOUND_PRD, the PRD file continuation detection found. PRD_ROOT is resolved HERE.
DOC_ID=.agents/skills/create-prd/references/doc-id.js
source .agents/skills/create-prd/references/resolve-paths.sh || exit 1
: "${FOUND_PRD:?bind FOUND_PRD to the PRD file continuation detection found}"
KEEP=$(command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const [root, file] = process.argv.slice(2);
  const p = d.parse(path.basename(file));
  // The same layout the register block requires: {domain}/prd.{P}.{feature}/prd.{P}.{feature}.md
  // under the PRD root, so a kept file can never be one outside it.
  const parts = path.relative(path.resolve(root), path.resolve(file)).split(path.sep);
  let folderOk = false;
  try { d.format({ kind: "prd", prd: 1, slug: parts[0] }); folderOk = true; } catch {}
  let r;
  if (!p.ok || p.kind !== "prd" || p.artifact) {
    r = { ok: false, reason: "unnumbered", detail: `${file} predates numbered PRDs` };
  } else if (parts.length !== 3 || !folderOk || parts[1] !== path.basename(file, ".md")) {
    r = { ok: false, reason: "off-layout", detail: `${file} is not at ${root}/{domain}/prd.{P}.{feature}/` };
  } else if (fs.existsSync(file)
      && !fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)) {
    // The same realpath containment the allocate and register blocks apply: a domain directory
    // that symlinks out of the root must not carry a kept PRD with it.
    r = { ok: false, reason: "outside-root", detail: `${file} resolves outside ${root}` };
  } else {
    let text = null;
    try { text = fs.readFileSync(file, "utf8"); } catch (e) {
      r = { ok: false, reason: "unreadable", detail: `${file} cannot be read (${e.code || e.message})` };
    }
    if (text !== null) {
      const fm = d.frontmatterField(text, "prd_number");
      r = fm && fm !== String(p.prd)
        ? { ok: false, reason: "frontmatter-mismatch", detail: `prd_number: ${fm}, file name says ${p.prd}` }
        : { ok: true, reason: "ok", next: p.prd };
    }
  }
  console.log(JSON.stringify(r));
  process.exitCode = r.ok ? 0 : 1;
' "$PWD/$DOC_ID" "$PRD_ROOT" "$FOUND_PRD")
KEEP_RC=$?
KEEP_REASON=$(printf '%s' "$KEEP" | jq -r '.reason // empty' 2>/dev/null)
case "${KEEP_RC}:${KEEP_REASON}" in
  0:ok) ;;
  1:unnumbered|1:off-layout|1:frontmatter-mismatch)
    echo "❌ $(printf '%s' "$KEEP" | jq -r '.detail') — run /review-prd, which reports it and offers the numbering migration"; exit 1 ;;
  1:outside-root)
    echo "❌ $(printf '%s' "$KEEP" | jq -r '.detail') — a symlink leads out of ${PRD_ROOT}; replace it with the real directory under the root (no migration can fix this)"; exit 1 ;;
  1:unreadable)
    echo "❌ $(printf '%s' "$KEEP" | jq -r '.detail') — check the FOUND_PRD binding"; exit 1 ;;
  *) echo "❌ the keep-number check could not run (exit ${KEEP_RC}) — check the bundled ${DOC_ID}"; exit 1 ;;
esac
P=$(printf '%s' "$KEEP" | jq -r '.next')
PRD_FILE="$FOUND_PRD"
echo "P=${P} PRD_FILE=${PRD_FILE} (kept)"
```

No row is written on this path: the found PRD is already registered, and the Step 3.5 check
confirms it.

### Step 2: Interactive PRD Creation

#### Greenfield invocation (mode=greenfield)

```
Use create-doc skill with:
- Template: prd-template (resources/prd-tmpl.yaml)
- Output: ${PRD_ROOT}/{product}/prd.{P}.{product}/prd.{P}.{product}.md   (PRD_FILE from Step 1.5)
- Frontmatter: name: prd.{P}.{product}, prd_number: {P}
- Mode: Interactive (default)
```

#### Brownfield invocation (mode=brownfield)

```
Use create-doc skill with:
- Template: brownfield-prd-template (resources/brownfield-prd-tmpl.yaml)
- Output: ${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md   (PRD_FILE from Step 1.5)
- Frontmatter: name: prd.{P}.{feature}, prd_number: {P}
- Mode: Interactive (mandatory for brownfield)
```

#### Register a new PRD

For a PRD allocated by [§ Allocate a new PRD number](#allocate-a-new-prd-number) — never for a kept
one — write its registry row as soon as the file first exists, in the same step:

```bash
# create-prd — write the PRD registry row (task 204)
# INPUTS: PRD_FILE from Step 1.5, and TITLE, the title of the PRD (no | and no newline).
# Number, folder and href are all read from PRD_FILE itself — nothing is carried from another shell,
# and a file that is not at ${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md is refused.
DOC_ID=.agents/skills/create-prd/references/doc-id.js
source .agents/skills/create-prd/references/resolve-paths.sh || exit 1
: "${PRD_FILE:?bind PRD_FILE}" "${TITLE:?bind TITLE to the PRD title}"
[ -f "$PRD_FILE" ] || { echo "❌ ${PRD_FILE} does not exist yet — write the PRD first"; exit 1; }
REG="${PRD_ROOT}/prd-registry.md"
# appendPrdRow is the engine's one row writer: it starts from the empty registry when there is none,
# appends the row and moves the counter forward. It throws with .reason on a duplicate or a bad cell.
command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const [reg, root, file, title, created] = process.argv.slice(2);
  const p = d.parse(path.basename(file));
  const parts = path.relative(path.resolve(root), path.resolve(file)).split(path.sep);
  const [folder, dir] = parts;
  let folderOk = false;
  try { d.format({ kind: "prd", prd: 1, slug: folder }); folderOk = true; } catch {}
  if (!p.ok || p.kind !== "prd" || p.artifact || parts.length !== 3 || !folderOk
      || dir !== path.basename(file, ".md")) {
    console.log(`❌ registry row not written: ${file} is not a numbered PRD document at ${root}/{domain}/prd.{P}.{feature}/`);
    process.exit(1);
  }
  if (!fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep)) {
    console.log(`❌ registry row not written: ${file} resolves outside ${root}`);
    process.exit(1);
  }
  const n = p.prd;
  const href = parts.join("/");
  // The registry is written as well as read: a symlink, live or dangling, would carry the write
  // outside the root, so the registry must be a plain file (or absent).
  let isLink = false;
  try { isLink = fs.lstatSync(reg).isSymbolicLink(); } catch {}
  if (isLink) {
    console.log(`❌ registry row not written: ${reg} is a symlink — the registry must be a plain file under ${root}`);
    process.exit(1);
  }
  const text = fs.existsSync(reg) ? fs.readFileSync(reg, "utf8") : null;
  try {
    const out = d.appendPrdRow(text, { n, title, href, folder, status: "draft", created });
    fs.writeFileSync(reg, out);
    console.log(`registered PRD ${n} in ${reg}${text === null ? " (registry created)" : ""}`);
  } catch (e) {
    console.log(`❌ registry row not written (${e.reason || "error"}): ${e.message}`);
    process.exitCode = 1;
  }
' "$PWD/$DOC_ID" "$REG" "$PRD_ROOT" "$PRD_FILE" "$TITLE" "$(date +%Y-%m-%d)" || exit 1
```

A refusal is a **HALT** with the reason printed: `duplicate-row` means `P` is already registered (the
registry moved since Step 1.5 — another run took `P`). Re-run Step 1.5 for a new number, **move the
file you already wrote** to the new `PRD_FILE` (directory and file name both change) and set its
`name:` and `prd_number:` to match, then run this block again; the old `prd.{P}.{feature}/` directory
must not be left behind, or it is a second PRD claiming `P`. `bad-row` means the title carries a `|` or a newline,
`registry-invalid` / `no-table` mean the registry is malformed. The PRD file and this row are
committed together, by the user — see Step 4.

**Section-by-Section Process:**

#### Section 1: Goals, Background, and Project Analysis

**Greenfield (mode=greenfield):**

- **Goals:** Bullet list of desired outcomes
- **Background:** 1-2 paragraphs on what this solves and why
- **Change Log:** Version tracking table
- **Source:** Project Brief if available, otherwise elicit from user
- **No mandatory elicitation** (but can ask clarifying questions)

**Brownfield (mode=brownfield) — Intro Project Analysis and Context:**

**1a. Existing Project Overview:**

- Analysis Source (document-existing-project output | IDE analysis | user-provided)
- Current Project State (what it does, primary purpose)

**1b. Available Documentation Analysis:**

- If document-existing-project run → Reference existing docs
- Otherwise → Check for: Tech stack, architecture, API docs, UI guidelines, technical debt

**1c. Enhancement Scope Definition:**

- Enhancement Type (New Feature | Major Modification | Integration | Performance | UI/UX Overhaul | Stack Upgrade | Bug Fix)
- Enhancement Description (2-3 sentences)
- Impact Assessment (Minimal | Moderate | Significant | Major)

**1d. Goals and Background Context:**

- Goals (bullet list of desired outcomes)
- Background (why needed, what problem solved, how fits with existing project)
- Change Log (version tracking)

**No mandatory elicitation** (but confirm understanding)

#### Section 2: Requirements (MANDATORY ELICITATION)

**Both modes — Functional and Non-Functional Requirements:**

**Functional Requirements (FR):**

- What the product/enhancement must do
- Testable, WHAT not HOW, MVP-scoped
- **Brownfield emphasis:** integration with existing functionality

**Non-Functional Requirements (NFR):**

- Specific metrics ("< 200ms response time" not "fast response")
- **Brownfield emphasis:** must respect existing system performance characteristics

**Compatibility Requirements (CR) — (brownfield only) CRITICAL:**

- CR1: Existing API compatibility
- CR2: Database schema compatibility
- CR3: UI/UX consistency
- CR4: Integration compatibility

**Process:**

1. Draft requirements based on validated understanding (brownfield) or goals (greenfield)
2. Present with detailed rationale (trade-offs, assumptions)
3. **STOP — Present 1-9 elicitation options**
4. Wait for user response
5. Iterate based on feedback

**❌ Do NOT proceed if:**

- Any FR uses vague language without measurable criteria (e.g., "fast", "easy", "intuitive")
- Any FR prescribes implementation technology (e.g., "use React component X") instead of capability
- NFRs lack specific metrics
- **(brownfield)** Compatibility Requirements (CR) section is absent or incomplete

#### Section 3: UI Design / UI Enhancement Goals (conditional)

**Condition:** Only if PRD has UX/UI requirements.

**Greenfield — UI Design Goals (MANDATORY ELICITATION):**

- Overall UX Vision
- Key Interaction Paradigms
- Core Screens and Views (conceptual)
- Accessibility (None|WCAG AA|WCAG AAA)
- Branding
- Target Platforms

Pre-fill with educated guesses, clearly indicate assumptions, STOP for 1-9 elicitation.

**Brownfield — UI Enhancement Goals (no mandatory elicitation):**

- Integration with existing UI patterns
- Design system consistency
- Modified/new screens only (not complete redesign)
- UI consistency requirements

#### Section 4: Technical Constraints / Technical Assumptions

**Greenfield — Technical Assumptions (MANDATORY ELICITATION):**

- Repository Structure (Monorepo|Polyrepo)
- Service Architecture (Monolith|Microservices|Serverless)
- Testing Requirements (Unit|Integration|Full Pyramid)
- Additional Technical Assumptions (languages, frameworks, libraries, deployment)

Present with rationale, STOP for 1-9 elicitation. Document ALL choices with rationale — these become constraints for the Architect.

**Brownfield — Technical Constraints and Integration Requirements** (replaces separate architecture documentation):

- **Existing Technology Stack** — extract from document-existing-project, include versions
- **Integration Approach** — database, API, frontend, testing strategies
- **Code Organization and Standards** — patterns, file structure, naming, conventions
- **Deployment and Operations** — build, deployment, monitoring, configuration
- **Risk Assessment and Mitigation** — technical debt, integration risks, deployment risks, mitigations

#### Section 5: Epic List / Epic and Story Structure (MANDATORY ELICITATION)

**Principle:** PRDs are living documents. Assess complexity honestly — multiple epics improve parallelism, reduce coupling, and make delivery more manageable. Do not default to a single epic.

**Step 1 — Complexity Assessment:**

Score the PRD against these 6 signals. Each signal present = 1 point:

| Signal                      | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Domain breadth**          | PRD spans 2+ distinct functional areas (e.g. auth + notifications + data sync) |
| **Parallelism opportunity** | Areas can be worked simultaneously by independent streams                      |
| **Story volume**            | Likely 8+ stories total (target 3–6 stories per epic)                          |
| **Dependency isolation**    | Areas have minimal cross-dependencies and can ship independently               |
| **Risk isolation**          | One area is high-risk and should be isolated to contain impact                 |
| **Timeline variance**       | Different areas have different urgency or delivery milestones                  |

**Scoring:**

- **0–2 signals** → Single epic is appropriate; document rationale
- **3+ signals** → Propose multiple epics, one per functional area

**Step 2 — For multiple epics:**

1. Propose a named epic breakdown mapping each epic to a PRD functional area
2. Show which stories belong to each epic
3. Identify cross-epic dependencies (if any) and sequencing constraints
4. Present as: _"I recommend [N] epics because [signal list]. Here is the proposed breakdown: [epic list with rationale]."_

> **Do not artificially collapse into 3 epics if 4+ functional areas exist.** Merging distinct functional areas inflates story count beyond the 3–6 target, increases coupling, and eliminates parallelism opportunities.

**Example — 4-epic breakdown:**

A PRD covering authentication, notifications, data sync, and reporting spans 4 distinct functional areas. Collapsing "data sync" and "reporting" into one epic just to stay at 3 epics defeats the purpose of the breakdown. Correct split:

| Epic | Functional Area | Rationale |
|------|-----------------|-----------|
| Epic 1 | Authentication & Identity | Foundation; other epics depend on it |
| Epic 2 | Notifications | Isolated delivery channel; parallel-workable after Epic 1 |
| Epic 3 | Data Sync | Backend-heavy; independent of notification UI |
| Epic 4 | Reporting & Analytics | Read-only layer; depends on Epic 3 data model |

Each epic is independent enough for a separate stream, targets 3–6 stories, and delivers testable value on its own.

**Step 3 — For single epic (must justify):**

If 0–2 signals, document explicitly: _"This PRD scores [N]/6 on the complexity rubric. A single epic is appropriate because [reason]."_

**Greenfield Epic 1 rule:** Epic 1 = Foundation + initial functionality. Subsequent epics build incrementally. Cross-cutting concerns flow through epics. Epics deliver deployable, testable value.

**Step 4 — Elicitation:**

5. **STOP — Present 1-9 elicitation options**
6. Wait for user response before proceeding

**Epic Approach Documentation:**

- Epic breakdown with named epics and their scope
- Complexity signal score and rationale
- Cross-epic dependency map (if multiple epics)

**PRD Extensibility (brownfield):**

PRDs grow over time — it is expected and normal to add new epics as scope evolves. When working with an existing PRD:

- Check if the user's intent is to **extend** an existing PRD (add a new epic area) rather than create from scratch
- If extending: append the new epic to the existing PRD's Epic and Story Structure section; do not re-create the whole PRD
- The continuation detection step (1a) must offer an **Extend** option for completed PRDs
- **Record the extension in the PRD's `### Change Log`** — appending an epic changes the PRD's scope,
  so it must leave a trace. Append one row (never edit an existing one) and bump the PRD's frontmatter
  `updated:` in the same edit. Canonical format: `references/document-change-log.md` —
  append-only, newest last, four columns. Leave `Version` blank for this machine-written row:

  ```markdown
  | {today} |  | Epic {P}.{E} appended | create-prd |
  ```

  PRDs keep the log nested as `### Change Log` under §1 — do not promote it to `## `.

**IMPORTANT — Epic Numbering:**
Epic files created from this PRD are named `epic.{P}.{E}.{name}`, where `P` is this PRD's number and
`E` counts within this PRD. So "Epic 1" in this document **is** `epic.{P}.1` — refer to epics as
"Epic 1", "Epic 2", etc., and those are the numbers the epic files will carry. There is no separate
global epic number; `/create-epic` allocates `E` with `doc-id.js`.

#### Section 6: Epic Details (MANDATORY ELICITATION per epic, REPEATABLE)

**Both modes — Story structure:**

```
As a [user type],
I want [action],
So that [benefit].
```

- **Acceptance Criteria:** testable, comprehensive
- **Logical sequencing** within epic
- **AI-agent-sized** (2-4 hours)
- **Vertical slices** delivering clear value

**Brownfield — Story sequencing rules (additional):**

- Stories MUST ensure existing functionality remains intact
- Each story MUST include verification that existing features still work
- Stories sequenced to minimize risk to existing system
- Include rollback considerations for each story
- Focus on incremental integration (not big-bang changes)
- Size for AI agent execution in existing codebase context

**Confirmation Required (brownfield):**
"This story sequence is designed to minimize risk to your existing system. Does this order make sense given your project's architecture and constraints?"

**Integration Verification (IV) — (brownfield only):**

- IV1: Existing functionality verification
- IV2: Integration point verification
- IV3: Performance impact verification

**Process:**

1. Draft complete epic with all stories
2. Present with rationale (greenfield: vertical-slice / value; brownfield: risk minimization)
3. **STOP — Present 1-9 elicitation options**
4. Wait for user response
5. Refine based on feedback

**❌ Do NOT proceed if:**

- Acceptance criteria are not independently testable
- **(brownfield)** Any story lacks Integration Verification (IV) criteria
- **(brownfield)** Story sequence has a step that modifies existing behaviour before verifying current behaviour still works
- **(brownfield)** No rollback consideration is documented for any story that modifies shared infrastructure (DB schema, APIs, auth)

### Step 2.5: Visual Architecture Diagram (conditional, via `mermaid-architect`)

**When to invoke:** if the PRD describes a new system topology, multi-actor flow, or non-trivial integration that would be clearer as a picture than as prose.

**Rule:** a Mermaid diagram is **mandatory only if it enhances understanding** of the spec. Do not pad the PRD with diagrams. If the prose already conveys the structure clearly, skip this step and note "no diagram justified" in the rationale.

**Process:**

1. Invoke `mermaid-architect` with: PRD path, the section being diagrammed (typically "Technical Constraints and Integration Requirements" or a new System Topology subsection), and a list of known integrations / external systems.
2. The skill will run its Discovery & Inquiry Protocol and may halt to ask clarifying questions about error states, actor ambiguity, or missing triggers — answer these inside this step before continuing.
3. The skill returns a Mermaid block (with YAML metadata header) plus a 2-sentence "Architectural assumptions" summary. Paste both into the PRD section.
4. For PRDs, the diagram type is normally **C4 Context / System Topology** (`flowchart` with subgraphs by C4 layer). Do not silently substitute another type.

**Diagram is justified when** any of these are true: 4+ external systems are involved, the PRD introduces a new service boundary, the integration approach has >2 alternatives worth contrasting, or a sibling PRD already uses a topology diagram and consistency matters.

### Step 3: Quality Validation

**Both modes:**

1. Offer to output full PRD
2. Run `pm-checklist` validation
3. Address blockers
4. Insert results into Checklist Results section

**Brownfield-only additional validation:**

- Verify compatibility requirements comprehensive
- Ensure integration approach sound
- Validate risk assessment includes technical debt
- Confirm story sequencing minimizes existing system risk

**Targeted requirement quality checks (brownfield only — run after pm-checklist):**

Run each check sequentially and report findings before proceeding:

**Check 1 — Measurability:**
Scan every FR for vague adjectives: "easy", "fast", "simple", "intuitive", "user-friendly", "seamless", "quick", "efficient" (without accompanying metrics). Flag each occurrence. Scan every NFR for missing numeric criteria (must have a specific metric, e.g. "< 2s" not "fast"). Report: `[PASS] All requirements measurable` or `[FAIL] Found N vague requirements: [list]`

**Check 2 — Implementation Leakage:**
Scan FRs and NFRs for technology names that prescribe implementation rather than capability: framework names (React, Redux, Prisma), library names, data structure names (JSON, array), cloud provider names (AWS, S3). Exception: names that ARE the capability (e.g. "WebSocket", "GraphQL"). Report: `[PASS] No implementation leakage` or `[FAIL] Found leakage in: [list]`

**Check 3 — Traceability:**
For each FR, verify it can be traced to at least one stated Goal in Section 1d. An FR with no goal justification is a scope risk. Report: `[PASS] All FRs traceable to goals` or `[WARN] N FRs lack clear goal traceability: [list]`

**Check 4 — NFR SMART Criteria:**
Each NFR must be: Specific (named metric), Measurable (number or threshold), Achievable (grounded in existing system context), Relevant (explains who it affects), Time-bound or Condition-bound (when it applies). Flag NFRs missing two or more of these. Report: `[PASS] NFRs are SMART` or `[FAIL] N NFRs are not SMART: [list]`

Report total: `Quality checks: X/4 passed`. Address any FAILs before proceeding to next steps.

### Step 3.5: Numbering Check (blocking)

Run the shared checker on the PRD this skill wrote:

```bash
# create-prd — numbering check, blocking (task 204)
# INPUT: PRD_FILE from Step 1.5.
DOC_ID=.agents/skills/create-prd/references/doc-id.js
source .agents/skills/create-prd/references/resolve-paths.sh || exit 1
: "${PRD_FILE:?bind PRD_FILE to the PRD file}"
CHECK=$(command node "$DOC_ID" check "$PRD_FILE" --prd-root "$PRD_ROOT" --json)
case $? in
  0) echo "✅ numbering ok: ${PRD_FILE}" ;;
  1) echo "❌ HALT: ${PRD_FILE} fails the numbering check:"
     printf '%s' "$CHECK" | jq -r '.findings[] | "  ✖ \(.reason)  \(.detail)"'
     exit 1 ;;
  *) echo "❌ HALT: doc-id check could not run: $(printf '%s' "$CHECK" | jq -r '.error // .reason')"
     exit 1 ;;
esac
```

Any finding is a **HALT** with the engine's `reason` and detail printed verbatim — `dir-stem-mismatch`,
`frontmatter-mismatch` (a missing or wrong `prd_number`), `unregistered` (Step 2's row was not
written), `registry-missing`. **This check blocks, unlike the card preflight, which is advisory**: the
card preflight judges what an author wrote, where a gate would push them toward filler, but here the
skill chose the name, the directory and the number itself, so a failure is this skill's own defect and
the PRD must not be handed over with it.

### Step 4: Next Steps — CRITICAL / BLOCKING

**Always execute this step.** Do not end the skill after Step 3 validation. The handoff prompts are a required output — the PRD is not complete until they are generated.

**Generate handoff prompts (both modes):**

- UX Expert Prompt (if UI)
- Architect Prompt

**Brownfield-specific guidance:**

- Architect prompt emphasizes integration with existing architecture
- Integration testing strategy
- Rollback procedures
- Monitoring for existing functionality
- Gradual rollout approach

**Close with the commit instruction (both modes).** This skill does not commit. Tell the user, naming
both paths: commit the PRD file and `${PRD_ROOT}/prd-registry.md` **together, in one commit** — a PRD
without its row fails `doc-id check` (`unregistered`), and a row without its PRD names a document that
does not exist. A kept number wrote no row, so only the PRD file is named then.

## Key Principles

### Both modes

- **MVP-first** — scope to deliverable value, not exhaustive feature list
- **Logical sequencing** — Epic 1 establishes foundation, subsequent epics build incrementally
- **AI-agent-sized stories** — 2-4 hours each, vertical slices with clear acceptance criteria

### Greenfield-specific

- **Collaborative Creation** — section-by-section elicitation; user owns scope decisions
- **Documented assumptions** — every technical choice carries rationale for the Architect

### Brownfield-specific

- **Deep Understanding Required** — analyze, don't assume; confirm every assumption with user; respect existing patterns
- **Compatibility First** — backward compatibility mandatory; integration verification explicit; sequence stories for lowest risk
- **Incremental Integration** — no big-bang changes; rollback considerations; each story validates existing system integrity
- **Technical Debt Awareness** — acknowledge existing debt; plan mitigation; don't make debt worse

## Integration with Other Skills

**This skill orchestrates:**

- `create-doc` — Document creation engine
- `prd-template` — Greenfield PRD structure (mode=greenfield)
- `brownfield-prd-template` — Brownfield PRD structure (mode=brownfield)
- `pm-checklist` — Quality validation
- `mermaid-architect` — System Topology / C4 Context diagram when justified

**This skill may recommend:**

- `deep-research-prompt` — Before greenfield PRD if market validation needed
- `document-existing-project` — Before brownfield PRD if existing project analysis missing
- `shard-prd` — If PRD becomes large
- `create-epics-from-shards` — After sharding

**Wrapper / entry-point skills:**

- `new-product-prd` — Greenfield entry point; delegates here with `mode=greenfield`

## Success Criteria

**Both modes:**

1. **Comprehensive Requirements** — FRs (capability-focused), NFRs (with metrics)
2. **Appropriate Epic Structure** — 6-signal complexity assessment completed; multiple epics proposed when 3+ signals present
3. **Quality Validated** — pm-checklist passed; Checklist Results inserted
4. **Clear Handoffs** — Architect prompt; UX Expert prompt if applicable

**Brownfield additional:**

5. **Deep Project Understanding** — existing architecture analyzed; tech stack documented; technical debt assessed; integration points identified
6. **Compatibility Requirements** — backward compatibility ensured (CR1–CR4)
7. **Risk-Aware Planning** — technical debt incorporated; integration/deployment risks identified; mitigations defined; rollback procedures planned
8. **Incremental Story Sequencing** — stories minimize risk; Integration Verification (IV1–IV3) explicit; gradual rollout; existing functionality protected
9. **Brownfield Quality Checks** — 4 targeted checks passed (measurability, leakage, traceability, SMART NFRs)
10. **Brownfield Handoff** — Architect prompt is integration-focused; integration testing guidance included

## Example Activations

**Brownfield (direct activation):**

```
User: "Add biometric authentication to our existing mobile banking app"

→ create-prd activates (mode=brownfield, default)
→ Continuation detection, document discovery, document-existing-project check
→ Analyzes existing authentication system
→ Confirms understanding with user
→ Uses create-doc + brownfield-prd-template
→ Emphasizes compatibility requirements
→ Sequences stories for minimal risk
→ Validates with pm-checklist + 4 targeted checks
→ Returns complete brownfield PRD
```

**Greenfield (delegated via new-product-prd):**

```
User: "Create a PRD for a new mobile app"

→ new-product-prd activates
→ Delegates to create-prd with mode=greenfield
→ Project Brief check + optional deep-research-prompt
→ Uses create-doc + prd-template
→ No brownfield-only sections emitted
→ Validates with pm-checklist
→ Allocates P (Step 1.5) and registers the PRD
→ Returns complete greenfield PRD at ${PRD_ROOT}/{product}/prd.{P}.{product}/prd.{P}.{product}.md
```

## Common Pitfalls to Avoid

❌ **Vague requirements** — "Fast", "easy", "intuitive" are not requirements; replace with measurable criteria
❌ **Implementation leakage** — FRs describe capability, not implementation; no technology names in requirements
❌ **Defaulting to a single epic** — Always run the complexity assessment; complex PRDs warrant multiple epics
❌ **Artificially collapsing epics** — If 4+ functional areas exist, do not merge them into 3 epics to appear concise; each distinct functional area warrants its own epic

**Brownfield additional:**

❌ **Assuming project structure** — Must analyze, not guess
❌ **Ignoring technical debt** — Known issues impact enhancement planning
❌ **Big-bang integration** — Incremental approach reduces risk
❌ **Skipping compatibility requirements** — Backward compatibility critical
❌ **Not validating understanding** — Confirm assumptions before proceeding
❌ **Recommending full PRD for small changes** — Use create-epic or brownfield-story for simpler enhancements
❌ **Starting fresh without checking for existing PRD** — Always check for incomplete in-progress work first
❌ **Ignoring existing reference documents** — Scan for briefs, research, context docs before asking the user
❌ **Forcing all epics upfront** — PRDs are living documents; epics can be added as scope evolves

✅ **Run the 6-signal complexity assessment before proposing epic structure**
✅ **Propose multiple epics when 3+ complexity signals are present**
✅ **Validate quality with pm-checklist (both modes) AND the 4 targeted checks (brownfield)**

**Brownfield additional:**
✅ **Check for existing PRD before starting (offer Extend for completed PRDs)**
✅ **Scan and load all discoverable reference documents first**
✅ **Analyze existing project thoroughly**
✅ **Confirm understanding at every step**
✅ **Emphasize compatibility and integration**
✅ **Sequence stories for risk minimization**

## Notes

- Brownfield PRDs require more upfront analysis than greenfield
- For brownfield, always recommend `document-existing-project` if not already run
- Compatibility Requirements and Integration Verification sections are brownfield-only
- Story sequencing for risk minimization is brownfield-critical
- Technical debt must be incorporated into brownfield planning
- Greenfield delegation source is always `new-product-prd` — users should not be told to invoke this skill directly with `mode=greenfield`
