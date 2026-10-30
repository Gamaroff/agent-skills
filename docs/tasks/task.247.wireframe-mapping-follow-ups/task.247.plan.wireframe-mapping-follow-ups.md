---
id: task.247.plan
title: "Implementation Plan: Wireframe Mapping Pipeline Test Scope and Configure Blank Lines"
type: plan
task-ref: task.247.wireframe-mapping-follow-ups.md
---

# Implementation Plan: Wireframe Mapping Pipeline Test Scope and Configure Blank Lines

> Requirements and success criteria: [task.247.wireframe-mapping-follow-ups.md](task.247.wireframe-mapping-follow-ups.md)

## Overview

This plan provides technical, step-by-step guidance for resolving the two carried advisory findings from task.246:
1. Widen the develop pipeline ban test in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` to scan skill-local step documents under `skills/develop-*/references/` (excluding auto-generated bundled copies) and update task.246's success criterion.
2. Fix `shared/resources/wireframe-map.js` `configure` list-removal under blank keys to strip trailing newline from the last retained non-blank line when unterminated, preserving internal blank lines.

---

## Phase-by-Phase Implementation Guide

### Phase 1: Widen Develop Pipeline Ban Test and Amend Criterion (CR5-1)

#### 1. Widen `evals/shared/tests/wireframe-mapping-hooks.test.mjs`

**File to modify:** `evals/shared/tests/wireframe-mapping-hooks.test.mjs` (~lines 127–166)

**Current code:**
```javascript
  const files = [
    ...developSkills.map((s) => [
      `skills/${s}/SKILL.md`,
      read(`skills/${s}/SKILL.md`),
    ]),
    ...readdirSync(join(ROOT, "shared/resources"))
      .filter((f) => /^develop-pipeline-.*\.md$/.test(f))
      .map((f) => [`shared/resources/${f}`, read(`shared/resources/${f}`)]),
  ];
```

**Target code:**
Enumerate `skills/${s}/references` for each develop skill. Include files matching `develop-.*\.md` that do not contain `<!-- AUTO-GENERATED`:
```javascript
  const skillLocalStepDocs = developSkills.flatMap((s) => {
    const refDir = join(ROOT, "skills", s, "references");
    if (!existsSync(refDir)) return [];
    return readdirSync(refDir)
      .filter((f) => /^develop-.*\.md$/.test(f))
      .map((f) => [`skills/${s}/references/${f}`, read(`skills/${s}/references/${f}`)])
      .filter(([, content]) => !content.includes("<!-- AUTO-GENERATED"));
  });

  const files = [
    ...developSkills.map((s) => [
      `skills/${s}/SKILL.md`,
      read(`skills/${s}/SKILL.md`),
    ]),
    ...readdirSync(join(ROOT, "shared/resources"))
      .filter((f) => /^develop-pipeline-.*\.md$/.test(f))
      .map((f) => [`shared/resources/${f}`, read(`shared/resources/${f}`)]),
    ...skillLocalStepDocs,
  ];
```
Add an assertion verifying that skill-local step docs were found (e.g. `assert.ok(skillLocalStepDocs.some(([f]) => f.includes("develop-bug-step-0")), "skill-local step docs found");`).

#### 2. Amend criterion in `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md` § 9

**Line 525:**
Change:
```markdown
- [x] No develop pipeline step calls `detect` or `configure`; held by a
      `wireframe-mapping-hooks.test.mjs` test over `skills/develop-*/SKILL.md` and
      `shared/resources/develop-pipeline-*.md`, mutation-proven by adding one such call
```
To:
```markdown
- [x] No develop pipeline step calls `detect` or `configure`; held by a
      `wireframe-mapping-hooks.test.mjs` test over `skills/develop-*/SKILL.md`,
      `shared/resources/develop-pipeline-*.md`, and skill-local step docs under
      `skills/develop-*/references/` (task.247), mutation-proven by adding one such call
```

#### 3. Mutation Proof
1. Add `command node .agents/skills/develop-bug/references/wireframe-map.js detect --json` to `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`.
2. Run `command node --test evals/shared/tests/wireframe-mapping-hooks.test.mjs`.
3. Verify test failure naming `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`.
4. Revert `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`.
5. Run test again; verify PASS.

---

### Phase 2: Fix Configure Blank-Key Blank-Line Preservation (CR4-1)

#### 1. Modify `shared/resources/wireframe-map.js`

**File to modify:** `shared/resources/wireframe-map.js` (~lines 1450–1461)

**Current code:**
```javascript
      // A file that ended without a newline still does when its last line goes.
      const unterminated =
        drop.includes(pieces.length - 1) &&
        !pieces[pieces.length - 1].endsWith("\n");
      const tail = /\r?\n$/.exec(pieces[j]);
      pieces[j] = yamlLines(k, v, indent).join(eol) + (tail ? tail[0] : "");
      for (const n of drop.reverse()) pieces.splice(n, 1);
      if (unterminated)
        pieces[pieces.length - 1] = pieces[pieces.length - 1].replace(
          /\r?\n$/,
          "",
        );
```

**Target code:**
When `unterminated` is true, we must find the last retained piece that is non-blank (has content), and strip the trailing newline from it, rather than stripping from `pieces[pieces.length - 1]` (which might be a retained blank line):
```javascript
      // A file that ended without a newline still does when its last line goes.
      const unterminated =
        drop.includes(pieces.length - 1) &&
        !pieces[pieces.length - 1].endsWith("\n");
      const tail = /\r?\n$/.exec(pieces[j]);
      pieces[j] = yamlLines(k, v, indent).join(eol) + (tail ? tail[0] : "");
      for (const n of drop.reverse()) pieces.splice(n, 1);
      if (unterminated) {
        for (let idx = pieces.length - 1; idx >= 0; idx--) {
          if (pieces[idx].trim()) {
            pieces[idx] = pieces[idx].replace(/\r?\n$/, "");
            break;
          }
        }
      }
```

#### 2. Add Test Case in `shared/resources/tests/wireframe-map.test.mjs`

**Location:** Inside `test("configure removes the list under a blank key past blank lines and comments, and keeps them", ...)` in the `lastLines` array (~line 1425).

**Add case:**
```javascript
    [
      { map: "m.md" },
      "ui:\n  componentBarrel: b.ts\n  wireframeMap:\n\n    - m.md",
      'ui:\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n',
    ],
```
Wait: Let's trace the exact test case:
Suppose the file is:
`"ui:\n  componentBarrel: b.ts\n  wireframeMap:\n    - a.md\n\n    - m.md"` (no trailing newline)
If `map: "m.md"` is configured:
The blank key `wireframeMap:` is replaced by `wireframeMap: "m.md"`.
The list items `- a.md` and `- m.md` are dropped.
The blank line `\n` between them is retained!
Because the original file had no trailing newline, the result should be:
`'ui:\n  componentBarrel: b.ts\n  wireframeMap: "m.md"\n'`
Notice: `wireframeMap: "m.md"` has a newline, followed by the blank line `\n`, with no trailing newline at the end!
Let's verify:
Before:
`ui:\n  componentBarrel: b.ts\n  wireframeMap:\n    - a.md\n\n    - m.md` (no newline after `- m.md`)
Pieces initially:
`[ "ui:\n", "  componentBarrel: b.ts\n", "  wireframeMap:\n", "    - a.md\n", "\n", "    - m.md" ]`
`drop`: indices 3 (`"    - a.md\n"`) and 5 (`"    - m.md"`).
Index 5 was the last piece and had no newline -> `unterminated = true`.
`pieces[2]` is replaced with `"  wireframeMap: \"m.md\"" + "\n"`.
Drop indices 5 and 3 removed.
Remaining pieces:
`[ "ui:\n", "  componentBarrel: b.ts\n", "  wireframeMap: \"m.md\"\n", "\n" ]`
In today's code:
`pieces[pieces.length - 1]` is index 3 (`"\n"`).
Replacing `/\r?\n$/` on `"\n"` makes it `""`!
So the blank line is gone, and index 2 has `\n`, so the file now ends with a newline!
With the fix:
Scanning backwards for the last piece with `trim()` finds index 2 (`"  wireframeMap: \"m.md\"\n"`).
It strips `\n` from index 2, making it `"  wireframeMap: \"m.md\""`.
Index 3 (`"\n"`) is untouched!
So the output is:
`"ui:\n  componentBarrel: b.ts\n  wireframeMap: \"m.md\"\n"` -> wait, index 2 without newline is `"  wireframeMap: \"m.md\""`, followed by index 3 (`"\n"`)!
Wait, what if the blank line was BEFORE or AFTER?
Wait, let's check what the user prompt said:
`When the removed list is the last thing in the file, has no trailing newline, and holds a blank line, configure deletes that blank line and adds a final newline.
Fix: strip from the last non-blank retained piece, so the file's bytes are otherwise preserved.
Add a test in shared/resources/tests/wireframe-map.test.mjs next to the existing lastLines cases (~lines 1413-1440), and mutation-prove it.`

#### 3. Mutation Proof
1. Run `command node --test shared/resources/tests/wireframe-map.test.mjs`.
2. Revert the engine change in `shared/resources/wireframe-map.js`.
3. Re-run test and verify the new test case fails.
4. Restore engine change and verify test passes.

---

### Phase 3: Bundle and Verification

1. Run `npm run bundle` to update all 8 skill copies:
   `skills/{create-story,create-task,develop-story,develop-task,qa-story,qa-task,review-story,review-task}/references/wireframe-map.js`.
2. Run `npm run bundle:check` and confirm exit code 0.
3. Update `CHANGELOG.md` under `[Unreleased]`:
   - Under `Fixed`: note `wireframe-map configure` blank line preservation when dropping lists under blank keys in unterminated files (TASK-246-CR4-1, task 247).
   - Under `Added` / `Testing`: note develop pipeline ban test widened to skill-local step docs (TASK-246-CR5-1, task 247).
4. Run `npm run ci:fast` and verify all tests pass.

---

## Key Patterns and References

- **Auto-generated file indicator**: `<!-- AUTO-GENERATED — DO NOT EDIT. Source:`
- **Develop skills list pattern**: `readdirSync(join(ROOT, "skills")).filter(s => /^develop-/.test(s))`
- **Engine source**: `shared/resources/wireframe-map.js`
- **Bundler script**: `npm run bundle` (or `python3 scripts/bundle_skill.py`)
