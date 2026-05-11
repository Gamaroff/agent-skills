---
id: task.1.plan
title: "Implementation Plan: Extract shared develop-pipeline body into shared/resources (Option C)"
type: plan
task-ref: task.1.extract-shared-develop-pipeline-body.md
---

# Implementation Plan: Extract shared develop-pipeline body into shared/resources (Option C)

> Requirements and success criteria: [task.1.extract-shared-develop-pipeline-body.md](task.1.extract-shared-develop-pipeline-body.md)

## Overview

Move five logical contract blocks out of `skills/develop-story/SKILL.md` and `skills/develop-task/SKILL.md` into `shared/resources/develop-pipeline-*.md`. The packager (`package_skill.py`) already auto-bundles and rewrites such references — no tooling change needed. Each phase commits independently so any single extraction can be reverted without unwinding the others.

## Working Setup

```bash
# 1. Branch
git checkout -b chore/develop-skill-extract

# 2. Generate the canonical diff once at the start
diff -u skills/develop-story/SKILL.md skills/develop-task/SKILL.md > /tmp/develop-diff.patch

# 3. Reference snapshot of current line counts (use to track shrinkage per phase)
wc -l skills/develop-story/SKILL.md skills/develop-task/SKILL.md
# expected: ~1192 develop-story, ~1153 develop-task
```

## Phase-by-Phase Implementation Guide

### Phase 1: Variance Audit

**Files to inspect** (read-only):
- `/tmp/develop-diff.patch` — generated above
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`

**Procedure**:

For each diff hunk in `/tmp/develop-diff.patch`, classify as one of:

| Class | Meaning | Action |
|-------|---------|--------|
| **TS** (token swap) | Differs only by `story↔task`, `Ready for Review↔accepted`, `story-file↔task-file`, `jira_key required↔optional` | Extractable — uses placeholder in shared doc |
| **TV** (true variance) | Differs in structure, semantics, or required vs optional flow | Stays per-skill |
| **AD** (accidental drift) | Looks like it should be identical but isn't (likely a missed dual-edit from #1-#13 batch) | Reconcile to canonical version BEFORE extraction starts |

**Audit deliverable**: a quick categorization table appended to task doc section 10. Example shape:

```
| Block                          | Class | Notes                              |
|--------------------------------|-------|------------------------------------|
| Autonomous defaults table      | TS    | only token = artifact name         |
| Lite-mode contract             | TS    | identical post-#9 fix              |
| Resume verification table      | TS    | placeholder for status string      |
| Plan freshness check           | TS    | identical                          |
| Stall semantics                | TS    | identical post-#11 fix             |
| Hook contract block            | TS?   | check vs pause-doc duplication     |
| File naming patterns           | TV    | story.{epic}.{story} vs task.{n}   |
| Tracker frontmatter handling   | TV    | jira required vs silent skip       |
| Status state machine           | TV    | Draft→Ready vs Planned→accepted    |
```

If any block lands as **AD**, fix to canonical version on `chore/develop-skill-extract` as Phase 1.5 before any extraction starts. Use whichever copy is correct (usually the more recent fix wins — check `git log -p -- skills/develop-story/SKILL.md skills/develop-task/SKILL.md` for the relevant block).

**Why this phase exists**: extraction without audit risks flattening intentional variance.

---

### Phase 2: Extract autonomous-defaults table

**Why first**: lowest blast radius. Pure table, no procedural logic, no recent fixes.

**File create**: `shared/resources/develop-pipeline-autonomous-defaults.md`

Template structure:

```markdown
# Develop Pipeline — Autonomous Defaults

When `/develop-story` or `/develop-task` runs in autonomous mode, the following decisions are taken automatically without prompting the user.

| Decision point | Default behavior | Rationale |
|----------------|------------------|-----------|
| Final commit push (Step 8) | Always push after Step 8 commit | Aligns with one-click pipeline expectation |
| ... (rest of table from canonical SKILL) ... | | |

**Override**: A `--no-autonomous` flag passed at invocation reverts to interactive mode for all rows above.
```

**Edit develop-story SKILL.md**:

Locate current autonomous-defaults table (search `## Autonomous Mode` or `Autonomous defaults`). Replace the table block with:

```markdown
## Autonomous Mode

See `shared/resources/develop-pipeline-autonomous-defaults.md` for the canonical autonomous-mode default-behavior table.

[any story-specific autonomous override notes stay here, post-reference]
```

**Edit develop-task SKILL.md**: same surgery.

**Validate**:

```bash
python3 skills/create-skill/scripts/quick_validate.py skills/develop-story
python3 skills/create-skill/scripts/quick_validate.py skills/develop-task

python3 skills/create-skill/scripts/package_skill.py skills/develop-story skills/develop-story
unzip -l skills/develop-story/develop-story.zip | grep develop-pipeline-autonomous-defaults
# expected: references/develop-pipeline-autonomous-defaults.md present

unzip -p skills/develop-story/develop-story.zip develop-story/SKILL.md | grep -c "shared/resources/develop-pipeline-autonomous-defaults"
# expected: 0  (path got rewritten)

unzip -p skills/develop-story/develop-story.zip develop-story/SKILL.md | grep -c "references/develop-pipeline-autonomous-defaults"
# expected: 1  (rewritten reference present)
```

Repeat package + verify for develop-task.

**Commit**:

```bash
git add shared/resources/develop-pipeline-autonomous-defaults.md \
        skills/develop-story/SKILL.md \
        skills/develop-task/SKILL.md
git commit -m "refactor(develop-pipeline): extract autonomous defaults table to shared resource"
```

(Defer zip recommit to Phase 6 batch repackage — saves repeated bulk diffs.)

---

### Phase 3: Extract lite-mode + bypass contract

**Why second**: recently changed (#9, #6) but logic is self-contained. Best to lock the just-fixed canonical form into a shared file before further edits accumulate.

**Granularity decision** (make at start of phase):

- If the lite-mode block + the bypass-contract block together stay under ~300 lines and read cohesively, combine into one file: `develop-pipeline-lite-mode.md`.
- Otherwise split into `develop-pipeline-lite-mode.md` + `develop-pipeline-bypass-contract.md`.

Default: combined.

**File create**: `shared/resources/develop-pipeline-lite-mode.md` (covers bypass too unless split)

Content sources:
- Orchestrator directive format (from develop-story `## Lite Mode (Pipeline Contract)` subsection added in commit `4dcedeb` to qa-story; cross-check develop-story has the canonical version)
- PIPELINE_MODE=lite trigger conditions
- Override on Adaptive Review Strategy
- Expected log line
- Pipeline bypass note (from develop SKILL.md line ~180 — check if duplicated in develop-story/develop-task; if so, this is the source for the bypass section)

**Edit develop-story, develop-task SKILL.mds**: replace lite-mode + bypass blocks with reference line(s).

**Edit qa-story, qa-task SKILL.mds**: re-point the lite-mode subsection (added in `4dcedeb`) to reference the new shared file rather than duplicating the contract. Keep the QA-side override on Adaptive Review Strategy locally — that's the QA-specific application of the contract, not the contract itself.

**Validate**:

```bash
for s in develop-story develop-task qa-story qa-task; do
  python3 skills/create-skill/scripts/quick_validate.py "skills/$s"
  python3 skills/create-skill/scripts/package_skill.py "skills/$s" "skills/$s"
  unzip -l "skills/$s/$s.zip" | grep develop-pipeline-lite-mode || echo "MISSING in $s"
done
```

**Commit**:

```bash
git commit -m "refactor(develop-pipeline): extract lite-mode and bypass contract to shared resource"
```

---

### Phase 4: Extract resume verification + plan freshness + stall semantics

**Why third**: most recently and subtly changed (#11, #13). Highest extraction risk — mishandling here regresses two recent hardening fixes.

**File create**: `shared/resources/develop-pipeline-resume-contract.md`

Required content (verify each section is preserved verbatim from the canonical SKILL):

1. **Resume verification table** — every step row including:
   - Step 3 row: `Status==Ready for Review` (story) / `Status==accepted` (task) — placeholder this!
   - Step 7 row: `grep -iE "^status:\s*accepted"`
2. **Plan freshness check**:
   ```bash
   [ "$(stat -f %m {story-directory}/story.{epic}.{story}.plan.*.md)" \
     -ge "$(stat -f %m {story-file})" ]
   ```
   Note `stat -f %m` is macOS-specific — preserve that exact form.
3. **Step 3 develop loop bound**: `MAX_ITER=5`
4. **Loosened stall logic**:
   ```
   Before iter 1: count any [x] regardless of indent. Capture LAST_COMMIT_HASH.
   Progress made if EITHER CURRENT_COMPLETED > LAST_COMPLETED OR CURRENT_COMMIT_HASH != LAST_COMMIT_HASH
   ```
5. **Step 8 commit push**: `git push origin HEAD`

**Placeholder strategy**:

The resume table's status string differs (`Ready for Review` vs `accepted`). Two options:

- **Option A (preferred)**: Use placeholder `{ready-status}` in the shared doc. Each SKILL defines `{ready-status}` near the top of its file. Cleaner, but adds a small substitution rule.
- **Option B**: Have the shared doc list both: "Status is `Ready for Review` for stories or `accepted` for tasks." Slightly noisier but no substitution.

Default: Option B (zero indirection wins for skill bodies that humans also read).

**Edit develop-story, develop-task**: replace the resume verification table + plan freshness + stall logic with single reference line:

```markdown
## Resume Verification

For the full resume verification contract — verification table, plan-freshness check, MAX_ITER bound, stall semantics, Step 7 status grep, and Step 8 push — see `shared/resources/develop-pipeline-resume-contract.md`.
```

**Mental dry-run before commit**:

Pretend a paused develop-story session resumes mid-Step 3. Walk through:
1. Is the verification table reachable from the slimmed SKILL? ✓ via reference
2. Does the agent know to check plan freshness? ✓ in shared doc
3. Does the loop bound apply? ✓ in shared doc
4. Step 7 status check unambiguous? ✓ shared doc says `accepted`, story SKILL says `Ready for Review` → using Option B, both surface

If any answer is "no", revise before committing.

**Validate + commit**:

```bash
for s in develop-story develop-task; do
  python3 skills/create-skill/scripts/quick_validate.py "skills/$s"
  python3 skills/create-skill/scripts/package_skill.py "skills/$s" "skills/$s"
done

git commit -m "refactor(develop-pipeline): extract resume + stall contract to shared resource"
```

---

### Phase 5: Hook contract decision

**Decision first**:

```bash
# Read pause doc end-to-end
less shared/resources/develop-pipeline-pause.md

# Read current hook block in develop-story
grep -n "PreCompact\|hook" skills/develop-story/SKILL.md | head -20
```

If pause doc already covers hook setup → just update the SKILL block to be a reference to pause doc, skip new file creation. **Likely outcome.**

If pause doc only covers pause/resume but NOT hook *setup* (registration in `.claude/hooks`, .json schema, etc.) → create `shared/resources/develop-pipeline-hook-contract.md` with the setup steps.

**Edit + validate + commit** as in earlier phases.

Commit message:
- If consolidated into pause doc: `refactor(develop-pipeline): consolidate hook setup into pause doc reference`
- If new file: `refactor(develop-pipeline): extract hook setup contract to shared resource`

---

### Phase 6: Final validation, repackage all, merge readiness gate

```bash
# Validate all five
for s in develop-story develop-task develop qa-story qa-task; do
  python3 skills/create-skill/scripts/quick_validate.py "skills/$s" || echo "FAIL: $s"
done

# Repackage all five
for s in develop-story develop-task develop qa-story qa-task; do
  python3 skills/create-skill/scripts/package_skill.py "skills/$s" "skills/$s"
done

# Inspect: every zip has the expected references
for s in develop-story develop-task develop qa-story qa-task; do
  echo "=== $s ==="
  unzip -l "skills/$s/$s.zip" | grep "references/develop-pipeline-"
done

# Final drift sanity check: no zipped SKILL.md still has `shared/resources/`
for s in develop-story develop-task develop qa-story qa-task; do
  echo "=== $s ==="
  unzip -p "skills/$s/$s.zip" "$s/SKILL.md" | grep -c "shared/resources/" || true
done
# expected: every skill prints 0

# Line count comparison
wc -l skills/develop-story/SKILL.md skills/develop-task/SKILL.md
# target: each ~400-500 lines
```

**Drift Resistance Validation** (proves the refactor's value):

```bash
# Edit one shared file
echo "<!-- canary -->" >> shared/resources/develop-pipeline-resume-contract.md

# Repackage both consumers
python3 skills/create-skill/scripts/package_skill.py skills/develop-story skills/develop-story
python3 skills/create-skill/scripts/package_skill.py skills/develop-task skills/develop-task

# Confirm canary appears in BOTH zips
unzip -p skills/develop-story/develop-story.zip develop-story/references/develop-pipeline-resume-contract.md | grep canary
unzip -p skills/develop-task/develop-task.zip develop-task/references/develop-pipeline-resume-contract.md | grep canary

# Revert canary
git checkout shared/resources/develop-pipeline-resume-contract.md
# Repackage to clean zips
for s in develop-story develop-task; do
  python3 skills/create-skill/scripts/package_skill.py "skills/$s" "skills/$s"
done
```

**Commit final repackage**:

```bash
git add skills/*/develop-story.zip skills/*/develop-task.zip skills/*/develop.zip skills/*/qa-story.zip skills/*/qa-task.zip
# (adjust paths to actual zip locations)
git commit -m "chore(skills): repackage develop-pipeline family after shared extraction"
```

**MERGE GATE — DO NOT MERGE UNTIL**:

At least one full real `/develop-story` or `/develop-task` invocation completes against the new docs end-to-end (Step 1 through Step 9, or finalise). This is the original deferral gate from the cleanup brief and supersedes all green-validator signals.

## Key Patterns and References

- **Packager regex**: `skills/create-skill/scripts/package_skill.py` lines 84-132. Scans every `.md` for `shared/resources/X` and rewrites to `references/X` in the zipped copy.
- **Existing example**: `shared/resources/develop-pipeline-pause.md` is referenced from `skills/develop-story/SKILL.md` (lines 31, 594) and `skills/develop-task/SKILL.md` (lines 31, 584) and `skills/develop/SKILL.md` (line 160). Package + unzip those today to see the rewritten reference pattern in action.
- **Variance vs duplication boundary**: documented in task doc section 3 ("Truly-Variant Content"). Phase 1 audit produces the authoritative classification.
- **Don't symlink**: per repository CLAUDE.md, shared resources are referenced by path only. Packager rewrites at zip time. Symlinks are forbidden.

## Testing Approach

This is a doc refactor. Tests are structural (validator), behavioral (mental dry-run), and behavioral-real (one full pipeline run before merge — see Phase 6 merge gate).

No automated test suite exists for skill bodies. The validator catches structural issues (missing frontmatter, broken structure). Content correctness is human-verified per phase via the mental dry-run procedure described in Phase 4.

The Drift Resistance Validation in Phase 6 is the closest thing to an automated regression test for this refactor: it exercises the propagation property that motivates the work in the first place.
