---
id: task.247.plan
title: "Implementation Plan: Wireframe Mapping Pipeline Test Scope to Skill-Local Step Docs"
type: plan
task-ref: task.247.wireframe-mapping-follow-ups.md
---

# Implementation Plan: Wireframe Mapping Pipeline Test Scope to Skill-Local Step Docs

> Requirements and success criteria: [task.247.wireframe-mapping-follow-ups.md](task.247.wireframe-mapping-follow-ups.md)

## Overview

This plan provides technical, step-by-step guidance for resolving the carried advisory finding **TASK-246-CR5-1** from task.246:
- Widen the develop pipeline ban test in `evals/shared/tests/wireframe-mapping-hooks.test.mjs` to scan skill-local step documents under `skills/develop-*/references/` (excluding auto-generated bundled copies) and update task.246's success criterion.

*(Note: TASK-246-CR4-1 was evaluated during review and determined to be a byte-level no-op due to string concatenation equivalence; it was retired with no code changes needed).*

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

### Phase 2: Verification and Changelog

1. Update `CHANGELOG.md` under `[Unreleased]`:
   - Under `Added` / `Testing`: note develop pipeline ban test widened to skill-local step docs (TASK-246-CR5-1, task 247).
2. Run `npx prettier --check evals/shared/tests/wireframe-mapping-hooks.test.mjs docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md CHANGELOG.md`.
3. Run `npm run ci:fast` and verify all tests pass.

---

## Key Patterns and References

- **Auto-generated file indicator**: `<!-- AUTO-GENERATED`
- **Develop skills list pattern**: `readdirSync(join(ROOT, "skills")).filter(s => /^develop-/.test(s))`
- **Hooks test**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs`
