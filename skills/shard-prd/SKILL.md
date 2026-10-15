---
name: shard-prd
description: Split large PRDs into smaller, manageable markdown files by level 2 sections. Use when PRD becomes large (more than 5 epics, more than 30 stories) to improve navigation and epic creation workflow.
---

# Document Sharding

## When to Use This Skill

Activate this skill when:

- PRD is large and difficult to navigate (>5 epics, >30 stories, >500 lines)
- User wants to split document into smaller files
- Preparing for `create-epics-from-shards` workflow
- Large document needs organization by major sections

**Natural activation triggers:**

- "Split my PRD into smaller files"
- "Shard the PRD document"
- "Break down prd.3.shop.md"
- "Organize PRD by sections"

**Do NOT use for:**

- Small documents (<3 sections)
- Documents that don't have clear level 2 section boundaries
- Non-markdown documents

## Purpose

Split large markdown documents into multiple smaller files:

- Creates folder structure to organize sharded documents
- Splits by level 2 sections (`## Heading`)
- Maintains all content integrity (code blocks, diagrams, markdown formatting)
- Generates index file with links to all shards

## Which PRD, and Where Its Shards Go

A PRD lives in its own directory, `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md`,
where `{P}` is its number from the PRD registry (`/create-prd` allocates it). **Shard it in place**:
the section files and `index.md` go into that same directory, beside the PRD, and the numbered PRD
file stays where it is as the entry point the registry and every `epic.{P}.{E}` point to.
`create-epics-from-shards` reads the shards from that directory.

**Refuse a PRD that predates numbering.** If the source is a root-level `docs/prd.md`, or any PRD
file whose name has no number after `prd.` (`prd.{feature}.md`), **stop** and do not shard it:

```
"{path} predates numbered PRDs, so it has no number and no place under ${PRD_ROOT} to be
sharded into. Run /review-prd on it — it reports the PRD and offers the numbering migration,
which moves it to ${PRD_ROOT}/{domain}/prd.{P}.{feature}/. Then shard the numbered file."
```

Never explode such a file into `${PRD_ROOT}` itself: shards written flat there belong to no PRD, and
no epic can be numbered from them.

**Refuse a numbered PRD reached through a symlink out of `${PRD_ROOT}`** too: the shards would be
written through the link. No migration fixes this — replace the link with the real directory.

## Execution Approach

### Method 1: Automatic (Preferred)

**Check for markdown-tree-parser:**

**Configuration File**: `skills-config.yaml` (in project root)

1. Attempt to load `skills-config.yaml` from project root
2. If file does not exist, **notify user**:

   > "`skills-config.yaml` not found. Create this file to customize settings, or continue with default settings."

3. Check `markdownExploder` setting (default: `true` if config missing)
4. If `true`, attempt command: `md-tree explode {input file} {output path}`
5. If succeeds → DONE (inform user, stop)
6. If fails (command not found):

   ```
   "The markdownExploder setting is enabled but md-tree command
   is not available. Please either:

   1. Install @kayvan/markdown-tree-parser globally:
      npm install -g @kayvan/markdown-tree-parser
   2. Or set markdownExploder to false in skills-config.yaml

   STOP HERE - do not proceed with manual sharding until one of
   the above actions is taken."
   ```

**Default Configuration Values** (used if `skills-config.yaml` not found):

```yaml
markdownExploder: true
```

**Installation:**

```bash
npm install -g @kayvan/markdown-tree-parser
```

**Usage:**

For a PRD, run this block from the repository root. It refuses anything that is not a numbered PRD
owning its directory under `${PRD_ROOT}` — the refusal described in
[§ Which PRD, and Where Its Shards Go](#which-prd-and-where-its-shards-go) — and only then explodes it
in place:

```bash
# shard-prd — explode a numbered PRD in place (task 204)
# INPUT: PRD_FILE, the numbered PRD (e.g. docs/prd/shop/prd.3.shop/prd.3.shop.md). PRD_ROOT is resolved HERE.
DOC_ID=.agents/skills/shard-prd/references/doc-id.js
source .agents/skills/shard-prd/references/resolve-paths.sh || exit 1
: "${PRD_FILE:?bind PRD_FILE to the numbered PRD}"
command node -e '
  const d = require(process.argv[1]);
  const fs = require("fs");
  const path = require("path");
  const [root, file] = process.argv.slice(2);
  const p = d.parse(path.basename(file));
  const dir = path.basename(path.dirname(path.resolve(file)));
  const inside = fs.existsSync(file)
    && fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep);
  if (!p.ok || p.kind !== "prd" || p.artifact || dir !== path.basename(file, ".md")) {
    console.log(`❌ ${file} is not a numbered PRD in its own directory under ${root} — run /review-prd on it, which reports it and offers the numbering migration`);
    process.exit(1);
  }
  if (!inside) {
    console.log(`❌ ${file} is missing or resolves outside ${root} through a symlink — replace the link with the real directory under the root (no migration can fix this)`);
    process.exit(1);
  }
' "$PWD/$DOC_ID" "$PRD_ROOT" "$PRD_FILE" || exit 1
md-tree explode "$PRD_FILE" "$(dirname "$PRD_FILE")"
```

The other uses, for reference:

```bash
# For Architecture
md-tree explode docs/architecture.md "$ARCH_ROOT"

# General
md-tree explode [source-document] [destination-folder]
```

**What it does:**

- Automatically splits by level 2 sections
- Creates properly named files
- Adjusts heading levels
- Handles edge cases (code blocks, special markdown)

### Method 2: Manual (Only if markdownExploder: false)

**If markdownExploder is false:**

```
"The markdownExploder setting is currently false. For better
performance and reliability, you should:

1. Set markdownExploder to true in skills-config.yaml
2. Install @kayvan/markdown-tree-parser globally

I will now proceed with the manual sharding process."
```

**Manual Process:**

#### Step 1: Identify Document and Target Location

- Determine document path (user-provided)
- **A PRD** (`prd.{P}.{feature}.md`): the target folder is the PRD's own directory — no new folder.
  Example: `docs/prd/shop/prd.3.shop/prd.3.shop.md` → shards go into `docs/prd/shop/prd.3.shop/`, and
  the PRD file stays as the entry point
- **Any other document**: create folder `docs/{document-name}/` (without extension).
  Example: `docs/architecture.md` → create `docs/architecture/`

#### Step 2: Parse and Extract Sections

**CRITICAL PARSING RULES:**

1. Read entire document content
2. Identify all level 2 sections (`## Heading`)
3. For each level 2 section:
   - Extract heading and ALL content until next level 2 section
   - Include all subsections, code blocks, diagrams, lists, tables
   - Be careful with fenced code blocks (```) - capture full block including closing backticks
   - Handle mermaid diagrams - preserve complete syntax
   - Understand markdown context: `##` inside code block is NOT a section header

#### Step 3: Create Individual Files

For each extracted section:

1. **Generate filename:**
   - Convert heading to lowercase-dash-case
   - Remove special characters
   - Replace spaces with dashes
   - Example: `## Tech Stack` → `tech-stack.md`

2. **Adjust heading levels:**
   - Level 2 (`##`) becomes level 1 (`#`) in new file
   - All subsection levels decrease by 1:
     - `###` → `##`
     - `####` → `###`
     - `#####` → `####`

3. **Write content:** Save adjusted content to new file

#### Step 4: Create Index File

Create `index.md` in sharded folder:

```markdown
# Original Document Title

[Original introduction content before first level 2 section]

## Sections

- [Section Name 1](./section-name-1.md)
- [Section Name 2](./section-name-2.md)
- [Section Name 3](./section-name-3.md)

## Change Log

| Date       | Version | Description                                | Author    |
| ---------- | ------- | ------------------------------------------ | --------- |
| 2026-08-12 | 1.0     | Sharded from `prd.checkout.md` — 7 sections | shard-prd |
```

**The index carries the Change Log; the shards do not.** Sharding destroys the source document's structure, so the index is the only place a reader can learn where these files came from. Canonical format: [document-change-log.md](references/document-change-log.md).

Give each shard a one-line provenance note instead, immediately under its title:

```markdown
> Sharded from [`prd.checkout.md`](./index.md) on 2026-08-12.
```

> **Do not copy the source PRD's Change Log into every shard.** That multiplies one history into N copies, none of which is authoritative, and every future edit to any shard makes the other N−1 wrong. One log on the index, provenance notes on the shards.

#### Step 5: Preserve Special Content

**Must preserve:**

- **Code blocks:** Complete blocks with language tags
- **Mermaid diagrams:** Complete diagram syntax
- **Tables:** Proper markdown table formatting
- **Lists:** Indentation and nesting
- **Inline code:** Backticks intact
- **Links and references:** All markdown links
- **Template markup:** `{{placeholders}}` preserved exactly

#### Step 6: Validation

After sharding:

- Verify all sections extracted
- Check no content lost
- Ensure heading levels adjusted properly
- Confirm all files created successfully

#### Step 7: Report Results

```
Document sharded successfully:
- Source: [original document path]
- Destination: docs/[folder-name]/
- Files created: [count]
- Sections:
  - section-name-1.md: "Section Title 1"
  - section-name-2.md: "Section Title 2"
  ...
```

## Output Structure

**Example sharded PRD:**

```
docs/prd/
├── index.md                          # Overview with links to shards
├── goals-and-background-context.md   # Shard 1
├── requirements.md                   # Shard 2
├── ui-design-goals.md               # Shard 3
├── technical-assumptions.md         # Shard 4
├── epic-list.md                     # Shard 5
├── epic-1-foundation.md             # Shard 6
├── epic-2-core-features.md          # Shard 7
└── checklist-results.md             # Shard 8
```

## Important Notes

- **Never modify content** - Only adjust heading levels
- **Preserve ALL formatting** - Including whitespace where significant
- **Handle edge cases** - Like `##` inside code blocks
- **Reversible** - Could reconstruct original from shards
- **Automatic preferred** - Use markdown-tree-parser when available

## Integration with Other Skills

**Called by:**

- `new-product-prd` - After PRD completion if large
- `create-prd` - After PRD completion if large
- User request - Direct activation

**Leads to:**

- `create-epics-from-shards` - Generate epic files from shards

## Success Criteria

Successful sharding produces:

1. **Folder created** - `docs/{document-name}/`
2. **All sections extracted** - One file per level 2 section
3. **Index file** - With links to all shards
4. **Heading levels adjusted** - Level 2 becomes level 1 in shards
5. **Content preserved** - No data loss, formatting intact
6. **Edge cases handled** - Code blocks, diagrams, tables preserved

## Example Activation

**Automatic Method:**

```
User: "Split docs/prd/shop/prd.3.shop/prd.3.shop.md into smaller files"

→ shard-prd activates
→ Checks skills-config.yaml for markdownExploder setting (default: true)
→ Runs: md-tree explode docs/prd/shop/prd.3.shop/prd.3.shop.md docs/prd/shop/prd.3.shop
→ Success - 8 files created
→ Reports results
```

**Manual Method:**

```
User: "Shard my PRD"

→ shard-prd activates
→ Checks skills-config.yaml for markdownExploder setting (false, uses default)
→ Warns about automatic method benefits
→ Proceeds with manual parsing
→ Extracts all level 2 sections
→ Creates individual files with adjusted headings
→ Generates index.md
→ Reports results
```

## Common Pitfalls to Avoid

❌ **Modifying content** - Only adjust heading levels
❌ **Losing content** - Must preserve everything (code blocks, diagrams)
❌ **Incorrect heading adjustment** - Level 2 must become level 1
❌ **Not handling code blocks** - `##` inside code is not a section
❌ **Skipping index file** - Navigation requires index

✅ **Use automatic method** when possible
✅ **Preserve all content** exactly
✅ **Adjust headings** correctly
✅ **Handle edge cases** (code blocks, diagrams)
✅ **Create index file** with links

## Notes

- Automatic method (markdown-tree-parser) is strongly preferred
- Manual method is fallback for when automatic unavailable
- Large PRDs (>5 epics) benefit significantly from sharding
- Sharding improves navigation and workflow for epic creation
- Reversible process - could reconstruct original
