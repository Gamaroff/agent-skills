# Task Review Report: Task 246 - Wireframe mapping setup offer and first-run candidates

**Reviewed:** 2026-10-29
**reviewed_blob:** 9f35afdbc39333ec4f3497dfae135dfcf4a49e7a
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-10-29

---

## Executive Summary

A well-sourced task: every `file:line` anchor in the engine resolves, both relative links resolve,
the card preflight passes, and the pre-pass found nothing already built. Six Important gaps remain,
all in the same family: a state the plan does not model (a partial `ui:` block, which loops), a gate
phrase whose meaning the task changes at 12 sites it does not name, a test that pins the old wording,
and three success criteria that finalise could not pass as written.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 7/10 before fixes, 9/10 after
**Recommendation:** NEEDS REVISION → READY TO IMPLEMENT once the fixes below are applied

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.246.wireframe-mapping-setup-offer
  - Base:       develop
  - Epic branch:N/A
  - Auto-skip:  false
```

Pre-pass:

- **Agent B** (architecture): `aligned`, `prepass-axes.js` source `architecture`. Axes checked: What
  this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Validation before
  commit, Do not. Four low notes; one kept as O3 below.
- **Agent C** (codebase): `not-implemented`. No `detect`, `configure`, `declined`,
  `catalogueEntries` or candidate `source` exists. The task enumerates no engine call sites, so
  check 14 does not apply.

---

## User Decisions & Clarifications

**Q1: A `ui:` block without `wireframeMap` reads as `unset`, the offer fires, `configure` refuses
`exists`, and "re-run detect" returns `unset` again. How should that state be handled?**
- **User Decision**: a new `partial` state. `detect` reports the keys present; `configure` inserts
  only the missing keys under the existing block, with the same read-back and restore.
- **Impact**: I1 below; Phase 1, § 3, the diagram, § 8 and § 9 change.

**Q2: 12 sites gate on "sets `ui.wireframeMap`", and `wireframeMap: off` is set but means off. How
should the plan cover them?**
- **User Decision**: define it once. The procedure's three-state paragraph says what "sets" means,
  its reason line names `declined` beside `unset`, and `configuration.md`'s key row changes. The 12
  sites stay; the plan records the grep that found them.
- **Impact**: I2 below; Phase 3 and Phase 4 gain one checkbox each.

**Q3: The create-* offer criterion names no test, and "detect under one second" has no measuring
command. How should they be held?**
- **User Decision**: the offer criterion becomes a documentation criterion held by
  `wireframe-mapping-hooks.test.mjs`; the time bound becomes a bound on what `detect` reads, asserted
  in a test.
- **Impact**: I4 and I5 below.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. No placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Sign-off: `sign-off.enabled` absent from `skills-config.yaml`, not checked.
- Change Log present, one row; current for `planned`.
- GitHub issue #792 exists (OPEN); body link matches frontmatter.
- Card preflight: exit 0. Summary, Success Criteria and Breaking Changes resolve; the card omits 4,
  11 and 5 items behind `+N more` links (information, not a defect).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every engine anchor resolves to the named symbol (`sed -n` on `:70 :101 :107 :293 :367 :458 :494
:557 :606 :619 :622 :653 :712 :714 :768 :791 :886 :925 :956`). The Allowed writes anchors
(`create-story:50`, `create-task:88`) land on the heading two lines above the list, which is close
enough. Test count 29 confirmed (`grep -c 'test(' …`).

Invariants run (check 11):

- `parseYamlSubset("ui:\n  wireframeMap: false")` → `false` (boolean); `off` and `OFF` → strings.
  The plan's `off()` helper covers all three.
- Quoted values `"@acme/ui"`, `"## Components"` and `"a: b # c"` read back verbatim. **Backslash
  escapes do not**: `"a\\b"` reads back as `a\\b`. That is the concrete input for the read-back
  restore test (O1).
- The segment rule `/[A-Z][a-z0-9]*/g`: `IconButton` and `ButtonGroup` match `button`; `Rebutton`
  and `Card` do not. The control holds.

### Important

- **I1 — A partial `ui:` block loops (check 10, outcome reachability).** `detect` returns `unset`
  for a `ui:` block that lacks `wireframeMap`, and the plan says so on purpose (plan Phase 1, "`ui`
  holding only other keys … is `unset`"). The skill then offers setup, `configure` refuses with
  `exists` because `/^ui\s*:/m` matches, and the skill's rule for `exists` is "re-run `detect`",
  which answers `unset` again. An empty `ui:` (which `readUiConfig` reads as `null`) takes the same
  path. No current or planned branch lets this project finish setup. *Fix per Q1.*
- **I2 — 12 sites gate on "sets `ui.wireframeMap`" (check 20).**
  `grep -rn 'ui.wireframeMap\` is set\|sets \`ui.wireframeMap\`' shared/resources/*.md skills/*/SKILL.md | grep -v /references/`
  → 12 lines: develop-pipeline step 0 (`:634`), step 2 (`:16`), step 3 (`:16`, `:76`),
  `develop-story:54`, `develop-task:52`, `create-story:762`, `create-task:511`, `review-story:1405`,
  `review-task:1348`, `qa-story:1517`, `qa-task:1060`. After this task `wireframeMap: off` is set
  and means off. The procedure's reason line (`wireframe-component-mapping.md:43`) names only `unset`
  as the stop, and `configuration.md:335` says "Setting it turns the feature on". *Fix per Q2.*

### Optional

- **O1** — Name the read-back mismatch input in § 8: a value holding a backslash (verified above).
- **O2** — The `text` primitive name-matches `TextField` and `TextArea` by segment. They are
  proposals only, but the guide should say a name match is a hint, not a role.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I3 — A test pins the wording the plan replaces (check 15).**
  `evals/shared/tests/wireframe-mapping-hooks.test.mjs` "the hooks are off unless ui.wireframeMap is
  set" asserts that each of the eight skills' `SKILL.md` mentions `ui.wireframeMap`. The plan's new
  step 3 for `create-story` and `create-task` gates on `detect`'s `state` instead, and for those two
  skills the premise ("off unless set") is no longer true. The file is not in the Files Summary.
  Fix: list it, and change the test so create-* assert the `detect` gate while the other six keep
  theirs. The same file holds the offer criterion (I4) and the develop-pipeline grep criterion.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I4 — The offer criterion names no test (check 4, behaviour criterion).** "`create-story` 5.4.6
  and `create-task` 2.6 offer setup on `unset` …" is prose in a `SKILL.md` that no test runs. *Fix
  per Q3*: restate it as a documentation criterion ("step 3 of each runs `detect --json` and names
  the four states") held by `wireframe-mapping-hooks.test.mjs`.
- **I5 — "`detect` completes in under one second" has no measuring command (check 4,
  non-functional).** A per-PR test can bound the work instead. *Fix per Q3*: "`detect` reads only
  the fixed barrel list, one level of `packages/*` and `libs/*`, and `docs/` to depth 4", asserted by
  a test that places a barrel two levels deep and expects it not found.
- **I6 — "`resolve`'s output for a node with near-miss rows is unchanged apart from `source: map`"
  has no planned test.** § 8's "near-miss candidates come first and are not duplicated" does not
  assert "unchanged". Fix: one test that runs the existing near-miss fixture and asserts the
  candidates deep-equal the pre-change shape once `source` is removed; move the criterion to
  Functional.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The high risk (`configure` damaging `skills-config.yaml`) has append-only writes, read-back and
restore. The `partial` insert path from Q1 is a new write *inside* an existing block, which is a
larger risk than appending; it is added as a High risk with the same read-back and a byte check on
everything outside the block.

### Optional

- **O3** — `MAP_HEADER`'s pointer to the guide must name the path a consumer has
  (`.agents/skills/create-story/references/wireframe-component-mapping.md`), never a
  `shared/resources/` literal: the bundler rewrites that literal in `.js` files (pre-pass B).

Mermaid (Step 6.5): the flowchart's syntax is valid; it gains the `partial` branch with I1.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 6 issues

1. Add the `partial` state to `detect` and an insert mode to `configure` (I1).
2. Define "sets `ui.wireframeMap`" once in the procedure, name `declined` in its reason line, change
   the configuration key row, and record the 12-site grep (I2).
3. List and update `wireframe-mapping-hooks.test.mjs` (I3).
4. Hold the offer criterion with that test (I4).
5. Replace the one-second bound with a bound on what `detect` reads (I5).
6. Add a test for "near-miss output unchanged" (I6).

### Consider (Optional) - 3 items

1. Name the backslash input for the restore test (O1).
2. Say in the guide that a name match is a hint (O2).
3. Name the consumer path in `MAP_HEADER` (O3).

---

## Implementation Readiness Assessment

**Score:** 7/10 before fixes, 9/10 after

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 6/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High once the fixes are in.

**Recommendation:** ✅ READY TO IMPLEMENT after the fixes, all of which were applied in this review.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-10-29
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.wireframe-mapping-setup-offer.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`,
  `docs/architecture/concepts/coding-standards.md` (via pre-pass B)
