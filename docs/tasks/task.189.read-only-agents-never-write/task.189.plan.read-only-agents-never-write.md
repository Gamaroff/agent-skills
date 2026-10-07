---
id: task.189.plan
title: "Implementation Plan: Read-only agents never write"
type: plan
task-ref: task.189.read-only-agents-never-write.md
---

# Implementation Plan: Read-only agents never write

> Requirements and success criteria: [task.189.read-only-agents-never-write.md](task.189.read-only-agents-never-write.md)

## Overview

Move every write out of Explore-dispatched prompts and into the step that dispatches them. The mapper
returns a marked block; the security agent returns argv; the orchestrator writes and runs. A guard
test holds the property.

## Phase 1: Mapper

**`qa-traceability-mapper-prompt.md`**

- `:54` dispatch text → "Follow the Execution Protocol exactly. Return the matrix between the
  markers in Step 7; do not write any file."
- `### Step 6` → "Build the matrix" (no `mkdir`, no write).
- `### Step 7 — Return the matrix`:

  ````markdown
  Output exactly:

  ```
  <!-- matrix-start -->
  {the markdown table}
  <!-- matrix-end -->
  {N} ACs mapped.
  ```
  ````

- `:65` (orchestrator writes the summary JSON) stays; it is the orchestrator side.

**`develop-pipeline-step-5-6-qa-loop.md`** (both sites, `:192` story and `:248` task): dispatch text
"Return the matrix." After the dispatch, a fenced block. The orchestrator saves the reply to a file
first, because the reply is not a shell variable:

```bash
REPLY_FILE="{story-directory}/.summaries/.mapper-reply.txt"   # the orchestrator writes the reply here
mkdir -p "{story-directory}/.summaries"
if grep -q '<!-- matrix-start -->' "$REPLY_FILE"; then
  awk '/<!-- matrix-start -->/{f=1;next} /<!-- matrix-end -->/{f=0} f' "$REPLY_FILE" \
    > "{story-directory}/.summaries/qa-traceability-matrix.md"
else
  echo "⚠️ mapper returned no matrix — proceeding without it"
fi
rm -f "$REPLY_FILE"
```

Check the existing tests that lift Step 5 blocks before editing
(`git grep -ln 'traceability' tests shared/resources/tests evals`).

## Phase 2: Security agent and Step 3c

**`finalise-dod-security-prompt.md`**

- Step 3 "Execute them" → "**3. Plan the run.** For each boundary, emit one `probe_plan` entry: the
  engine argv you would run, without `--record` and without `--repo-root`. finalise runs it." Keep
  the entry-form guidance (`#`, `cli:`, `shell-fn:`, `--argv`, `--cases-file`). A cases file the
  agent would write becomes `cases:` inline in the plan entry; finalise writes it to a temp file.
- Replace the five `--record` command blocks with one argv example.
- Output schema: add

  ```yaml
  probe_plan:
    - sink: path
      entry: "shared/resources/x.js#isSafe"
      argv: null        # or the --argv JSON string
      cases: null       # or an inline list; finalise writes it to a --cases-file
  ```

  and mark `probes_executed` / `probes` as "filled by finalise Step 3c — do not emit".

**`skills/finalise/SKILL.md`** — new `#### Step 3c: Run the security probe plan` after Step 3b:

```bash
# For each entry i in SECURITY_RESULT.probe_plan (the orchestrator writes each entry's argv and,
# when present, its cases to files under .claude/state/probe-plan/<i>/):
command node .agents/skills/finalise/references/security-probe.mjs \
  $(cat .claude/state/probe-plan/$i/argv) \
  --repo-root "$(git rev-parse --show-toplevel)" \
  --record "{story-directory}/{stem}.dod.security.run.$i.json" --json \
  > .claude/state/probe-plan/$i/out.json
echo "exit=$?" >> .claude/state/probe-plan/$i/out.json
```

Then: `probes_executed` = Σ `totals.executed` over records that exist; `probes[]` = reproduced
cases; an exit-2 entry → a `checks` entry naming the engine `reason`, not counted. When
`boundary: true` and no entry ran, `probes_executed: 0`, and the existing zero-guard fires.
Confirm `security-probe.mjs` is bundled into finalise (`ls skills/finalise/references/`).

Read `shared/resources/security-probe.mjs` `recordRun` and the record shape before writing the
summing code. The record's field names are the contract, not this plan.

## Phase 3: Docs agent

`finalise-dod-docs-prompt.md:55` →
"If a skill's `SKILL.md` frontmatter changed in the diff, `docs/reference/skill-catalog.md` must
change in the same diff; if it did not, that is the gap. **Never run `npm run generate-catalog` or any
other command that writes** — you are read-only, and a generator run is a write."

## Phase 4: Guard test

`tests/explore-prompts-no-write.test.js`:

- Population A: `git grep -nE 'subagent_type[=:] *"?Explore' -- 'shared/resources/*.md'
  'skills/*/SKILL.md'`; for each hit, the prompt file named on the line or in the surrounding
  dispatch table (finalise's table names four).
- Population B: `shared/resources/*prompt*.md` whose text matches `/Explore subagent/`.
- Write matcher: `/\bwrite (the|a|an) [\w .-]*file\b/i`, `/--record\b/`, `/\bmkdir\b/`,
  `/>>? *["{$]/`, evaluated outside fenced blocks preceded by `<!-- caller-runs -->`.
- Floors: mapper prompt, the four `finalise-dod-*-prompt.md`, both `review-*-prepass-prompts.md`
  present in the population.
- Control fixtures as in the task's § 8.

## Key Patterns and References

- Lifting a fenced block from a step doc and running it: `shared/resources/tests/merge-delete-branch-guard.test.mjs`,
  `tests/qa-read-back-block.test.js`.
- Engine record contract: `shared/resources/security-probe.mjs` (`runProbeSpec`, `recordRun`).

## Testing Approach

Guard test, the two lifted-block fixture tests, then `npm test` and `npm run bundle:check`. Record
both mutation proofs' red output in the implementation report.
