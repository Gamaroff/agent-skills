---
name: qa-traceability-mapper-prompt
description: Read-only Explore subagent prompt for building an AC→spec→src traceability matrix before /qa-story runs. Reads the story file, extracts ACs, greps for related spec and source files, and writes a markdown table to <story-dir>/.summaries/qa-traceability-matrix.md. Dispatched by the develop-story orchestrator in Step 5 so mapping greps never run in main context.
---

# QA Traceability Mapper — Explore Subagent

## Purpose

Read-only pre-QA mapping pass. Runs in an Explore subagent so grep output and file reads never land in main context. Produces a markdown table written to `<story-dir>/.summaries/qa-traceability-matrix.md`. **Never mutates source files or QA artifacts.**

## Output

**File written**: `<story-dir>/.summaries/qa-traceability-matrix.md`

**Format**:

```markdown
# QA Traceability Matrix

**Story**: story.{epic}.{story}.{name}.md
**Generated**: {YYYY-MM-DD}

| AC | Spec files | Src files | Coverage | Uncertainty |
|----|-----------|-----------|----------|-------------|
| AC1: {short description} | `path/to/foo.spec.ts` | `path/to/foo.ts` | full | — |
| AC2: {short description} | `path/to/bar.spec.ts` | — | partial | No spec found for bar module |
| AC3: {short description} | — | — | none | No matching spec or src found |
```

**Constraints**:
- Maximum 30 rows (one per AC + edge cases; truncate with note if more)
- `Uncertainty` column: populate when grep yields ambiguous or zero matches; use `—` when confident
- `Coverage` values: `full` | `partial` | `none` | `integration` | `unit`
- Spec files: any file matching `*.spec.*` or `*.test.*` whose name or directory relates to the AC
- Src files: implementation files that the spec imports or that the AC description implies

## How to Invoke (from pipeline orchestrators)

Pass the following prompt to an Explore subagent via the `Agent` tool with `subagent_type="Explore"`. Substitute `{STORY_FILE}` and `{STORY_DIR}` before sending.

```
Run the QA traceability mapper (shared/resources/qa-traceability-mapper-prompt.md).
Inputs:
  STORY_FILE={STORY_FILE}    # absolute path to the story markdown file
  STORY_DIR={STORY_DIR}      # absolute path to the story directory

Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation: "Matrix written to {STORY_DIR}/.summaries/qa-traceability-matrix.md — {N} ACs mapped."
```

### Extracting results

After the subagent returns, the matrix is at `{STORY_DIR}/.summaries/qa-traceability-matrix.md`. Pass the path to `/qa-story` via Skill args:

```
args="traceability_matrix={STORY_DIR}/.summaries/qa-traceability-matrix.md"
```

Write a subagent summary JSON artifact to `{STORY_DIR}/.summaries/step-5-traceability-mapper.json` using the schema from `shared/resources/subagent-summary-artifact.md`:

```json
{
  "schema_version": 1,
  "step": 5,
  "agent": "qa-traceability-mapper",
  "dispatched_at": "{ISO-8601}",
  "completed_at": "{ISO-8601}",
  "summary": {
    "ac_count": {N},
    "full": {N},
    "partial": {N},
    "none": {N},
    "uncertainty_flags": {N},
    "matrix_path": "{STORY_DIR}/.summaries/qa-traceability-matrix.md"
  },
  "raw_artifact_paths": [
    "{STORY_DIR}/.summaries/qa-traceability-matrix.md"
  ]
}
```

## Execution Protocol (run inside the Explore subagent)

### Step 1 — Read the story file

Read `{STORY_FILE}`. Extract:
- Story title and epic/story numbers
- All Acceptance Criteria (look for `## Acceptance Criteria`, `### AC`, or numbered list items under "Acceptance Criteria")
- File List section if present (pre-populated spec/src hints)

### Step 2 — Derive search keywords per AC

For each AC, extract 2–4 distinctive keywords:
- Function names, entity names, route paths, or behaviour nouns from the AC text
- Avoid generic words like "user", "data", "should", "must"

### Step 3 — Grep for spec files

For each AC, run:

```bash
grep -rl "{keyword1}\|{keyword2}" . \
  --include="*.spec.ts" --include="*.spec.tsx" \
  --include="*.test.ts" --include="*.test.tsx" \
  --include="*.spec.js" --include="*.test.js" \
  2>/dev/null | head -5
```

If the story's File List names spec files explicitly, include those without grepping.

If grep yields zero results for an AC: note `none` coverage + populate `Uncertainty` column.

If grep yields more than 5 files for a keyword: narrow with a second keyword; if still >5, pick the 3 most relevant by path proximity and note count in `Uncertainty`.

### Step 4 — Grep for src files

For each AC, run:

```bash
grep -rl "{keyword1}\|{keyword2}" . \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" \
  --exclude="*.spec.*" --exclude="*.test.*" \
  2>/dev/null | head -5
```

Apply same narrowing logic as Step 3.

### Step 5 — Assess coverage

For each AC:
- Spec files found AND src files found → `full` (or `partial` if spec only covers one code path)
- Spec files found, src files uncertain → `partial`; note in `Uncertainty`
- Spec files found, no src files → `unit` (covered in isolation)
- No spec, but integration test dir has related file → `integration`; note path
- Nothing found → `none`; note in `Uncertainty`

### Step 6 — Ensure output directory exists and write matrix

```bash
mkdir -p {STORY_DIR}/.summaries
```

Write the markdown table to `{STORY_DIR}/.summaries/qa-traceability-matrix.md` following the Output format above.

### Step 7 — Return confirmation

Output a single line:

```
Matrix written to {STORY_DIR}/.summaries/qa-traceability-matrix.md — {N} ACs mapped.
```

No other prose. The pipeline orchestrator reads the matrix from disk.
