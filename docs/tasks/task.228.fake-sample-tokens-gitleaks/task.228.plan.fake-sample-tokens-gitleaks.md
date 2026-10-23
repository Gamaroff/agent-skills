---
id: task.228.plan
title: "Implementation Plan: Replace the sample tokens gitleaks flags in tracked files"
type: plan
task-ref: task.228.fake-sample-tokens-gitleaks.md
---

# Implementation Plan: Replace the sample tokens gitleaks flags in tracked files

> Requirements and success criteria: [task.228.fake-sample-tokens-gitleaks.md](task.228.fake-sample-tokens-gitleaks.md)

## Overview

Four one-line text edits and a CHANGELOG entry. Each edit is proven with a gitleaks probe that
first reproduces the hit on the old text, then shows the new text is clean.

## Ground rule

Every scan uses `--redact`. Refer to a hit by file, line and rule ID only. Never paste the guide's
diff into a report, commit or PR: the old line is the value.

## Phase-by-Phase Implementation Guide

### Phase 1: Guide samples

**File:** `skills/test-co-location-enforcer/references/testing-framework-guide.md`

Find the lines by anchor, not number:

```bash
grep -n "const token = " skills/test-co-location-enforcer/references/testing-framework-guide.md
```

Expect exactly two hits: one under `it('should decode JWT tokens client-side'` (single quotes) and
one under `it("should decode token for display"` (double quotes). Before editing, save the two
original lines to a scratch file for the calibration step:

```bash
grep -n "const token = " <guide> | cut -d: -f2- > "$SCRATCH/before.ts"
gitleaks dir "$SCRATCH/before.ts" --no-banner --redact --exit-code 0   # expect: leaks found: 2
```

Edit each value so the lines read:

```ts
    const token = '<header>.<payload>.<signature>';
```
```ts
    const token = "<header>.<payload>.<signature>";
```

Keep the indentation and the following lines (`decodeToken(token)`, `expect(...)`) unchanged. Do
the edit with the Edit tool, not `sed`: the old string must not appear in a shell command line.

### Phase 2: Prose rewords

`scripts/setup-consumer.sh`, in the header comment block (step 3):

```
#   3. Credential collection      (gh auth check; Bitbucket and Jira API tokens)
```

`docs/tasks/task.60.config-reader-strict-subset/task.60.review.1.config-reader-strict-subset.md`,
the line beginning `  resolves to — anchors, aliases, merge keys,`:

```
  resolves to — anchors, aliases, merge keys, quoted or explicit keys; multi-line flow mappings, tags,
```

Rewords already shown **not** to work (2026-10-22): `check` → `status` alone, and inserting `and`
after `keys,`. Both still match.

### Phase 3: CHANGELOG

Under `## [Unreleased]` → `### Fixed` (the first `### Fixed` heading in the file), add:

```markdown
- **test-co-location-enforcer: the testing guide's sample tokens no longer trip a secret scan
  (task 228).** The two `const token = …` examples in
  `references/testing-framework-guide.md` now use `<header>.<payload>.<signature>`, so a project
  that vendors the skill passes `gitleaks` without a path allowlist for that file. Two prose
  lines that gitleaks misread as key assignments (`scripts/setup-consumer.sh`, a task.60 review)
  are reworded. Text only; no behaviour changes.
```

## Verification commands

```bash
gitleaks dir skills/test-co-location-enforcer/references/testing-framework-guide.md --no-banner --redact --exit-code 1
gitleaks dir . --no-banner --redact --exit-code 0 --report-format json --report-path "$SCRATCH/repo.json"
command node -e 'const r=require(process.argv[1]);const t=r.filter(f=>!f.File.startsWith(".claude/"));console.log(t.length?t.map(f=>f.RuleID+" "+f.File+":"+f.StartLine).join("\n"):"tracked: clean")' "$SCRATCH/repo.json"
npm test
npm run bundle:check
```

Record the gitleaks version in the implementation report. On Arch, `gitleaks version` prints
"Version is set by build process", so use `pacman -Q gitleaks` there instead.

## Testing Approach

No unit test is added here. The guard that holds this fix is task.229's CI lane, which needs this
task's clean baseline first. The calibration above (old lines → 2 leaks) is the known failure that
makes the green scan meaningful.
