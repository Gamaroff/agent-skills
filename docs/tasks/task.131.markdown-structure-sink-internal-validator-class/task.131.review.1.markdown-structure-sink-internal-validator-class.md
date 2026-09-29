# Task Review Report: Task 131 - A markdown-structure sink and an internal-artefact decision for the security probe

**Reviewed:** 2026-09-30
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 6 important recommendations implemented — 2026-09-30 (optional items O1, O2, O4 also applied; O3, O5 left as developer checks)

---

## Executive Summary

The task is well-scoped and its motivation is sound, but two of its success criteria could not be met by the plan as written — confirmed by running the code, not by reading it. The probe engine scores any returned object as "accepted", so `lintReport`'s `{ ok: false }` would make every corrupt report read as *reproduced* (verdict `absent`); and the proposed mutant cannot be caught by the one corrupt fixture that exists, because that fixture trips five problem codes, not one. Both are fixed in the plan below, along with four accuracy/design fixes.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 0 questions asked — run autonomously under `/develop-next` → `/develop-task`; each decision below is the evidence-backed recommendation, recorded as such.
**Implementation Readiness:** 7/10 before fixes → 9/10 after
**Recommendation:** READY TO IMPLEMENT (after the Step 8.5 fixes; pre-fix it was NEEDS REVISION)

---

## User Decisions & Clarifications

No `AskUserQuestion` was issued (autonomous pipeline run). Each question the review would have asked is recorded with the answer it took and the evidence behind it.

### Question Point 1: Structure & Scope

**Q1: The corpus is "pure data — no filesystem" and is bundled into skills. Should fixture-backed cases be referenced by path (as the task says) or inlined?**
- **Decision**: Inline strings in the corpus; the report-lint fixtures are referenced by the **engine test**, not by the corpus.
- **Evidence**: `security-input-corpus.mjs` header: "Pure data plus two accessors. No filesystem"; a `shared/resources/…` literal inside a shared resource is a bundling instruction (AGENTS.md § Shared Resources); fixtures under `shared/resources/tests/` never reach a consumer install, so a path-backed case would decline there.
- **Impact**: Phase 1 no longer adds an `inputFile` field; the "one definition of a corrupt report" stays in `report-lint.test.mjs` + its fixture, and the corpus holds minimal isolated shapes.

### Question Point 2: Technical & Implementation

**Q2: How should the engine read a validator that answers with a result object rather than throwing/returning false?**
- **Decision**: Phase 2 adds one rejection rule to the JS runner: a returned plain object whose own `ok` property is `false` is a rejection. Everything else is unchanged.
- **Evidence**: `security-probe.mjs:270-277` rejects only on throw / `null` / `undefined` / `false`. Executed: `lintReport(corrupt-task117.md, {sections: loadTemplate()})` → `{ ok: false, … }`, and the runner's rule scores that `accepted`. Every hostile case would reproduce → `computeVerdict` → `absent`.
- **Impact**: SC "corrupt refused" becomes reachable; a named test pins the rule both ways (`{ok:false}` rejected, `{ok:true}` accepted).

**Q3: Can the mutant ("drop the header-block-duplicated check") be caught by the corrupt fixture?**
- **Decision**: No — add an isolated hostile case per problem code; the mutant is caught by the isolated `header-block-duplicated` case.
- **Evidence**: executed `lintReport` on `corrupt-task117.md` → codes `header-block-duplicated, trailing-duplicate-body, section-duplicated, section-out-of-order, qa-cycle-duplicated`. Removing one check leaves `ok: false`, so the fixture case stays `rejected` and the mutant survives.
- **Impact**: Phase 1 hostile cases each trip exactly one code (asserted by the engine test); Phase 2 mutation target is the isolated case.

### Question Point 3: Completeness & Safety

**Q4: Is `grep -rn 'boundary:'` a sound enumeration of `boundary` consumers?**
- **Decision**: No — use a compound key.
- **Evidence**: the grep matches 16 files; most are unrelated (`loop-supervisor` "both sides of their boundary:", `develop-pipeline-on-precompact.sh` "Last step boundary:", `double-check` prose, four green report fixtures). A test keyed on it is red at the wrong sites (review check 13).
- **Impact**: the enumeration test keys on the schema literal `boundary: true | false` / `boundary: internal` and `security_result.boundary`.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; `type: task`, `description`, `tags` present (OKF conformant).
- Card preflight: 3 card blocks resolve (Summary 4 omitted, Success Criteria 1 omitted, Breaking Changes 5 omitted → "+N more").
- Tracker: `github_issue: 438` exists (OPEN); body link `[#438](…/issues/438)` matches; board Priority self-heal ran (P2).
- Change Log present and current for `planned`. Sign-off not configured (skipped).
- Relative links: 1, resolves (`doc-links.js`).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Pre-pass B (architecture, `prepass-axes.js` source: `architecture`): `drift` — axes checked: What this repo produces, Cross-skill resources, File naming, Validation before commit, Do not. Findings: fixture paths in the corpus would vendor fixtures into skills (medium — see I3); third `boundary` value affects boolean consumers (medium — see I4); `internal` bypasses the zero-guard on a precondition only (low — the task's own Medium risk 1 covers it; I6 tightens the precondition); touched `SKILL.md` files need validate (low — O5).

Pre-pass C (codebase): `not-implemented`. Task.128's `filename` sink has already landed (`security-input-corpus.mjs:35`), so the "land 128 first or rebase" dependency is already satisfied. The existing `--argv` flag is the `cli:` form's template, not an extra-args mechanism.

### Important
- **I1 — Outcome unreachable (check 10):** SC "green accepted, corrupt refused" — the JS runner scores `{ok:false}` as `accepted` (`security-probe.mjs:270-277`). No phase changed it. → Phase 2 adds the `ok === false` rejection rule.
- **I2 — Invariant falsified (check 11, reported Important because the plan can absorb it):** the mutant is not catchable by `corrupt-task117.md` (5 codes). → isolated per-code hostile cases.
- **I3 — Inaccurate + bundling hazard:** "four [hostile cases] by fixture path" — only one corrupt fixture exists (`corrupt-task117.md`, carrying all four shapes); the others are inline strings in `report-lint.test.mjs`. And path-backed cases break the corpus's no-filesystem contract and the bundle. → inline cases.
- **I5 — Generated document:** `security-input-corpus.md`'s case tables are the output of `renderCorpusTables()` (parity-tested), and each sink's prose is `SINK_BLURB` in the `.mjs`. The task said "prose paragraph in the `.md` peer". → blurb goes in `SINK_BLURB`, doc regenerated.

### Optional
- **O1:** the `--args-json` example used `loadTemplate("task")`; `loadTemplate()` returns `{ story, task, bug }` and `lintReport` indexes `sections[variant]`, so the argument is the whole object (902 bytes of JSON — fine as a flag).
- **O2:** Current Problems said the engine records `entry-not-probeable`, `executed: 0` for `lintReport`. Executed: without `opts`, `lintReport` throws `TypeError: opts.sections is required`, the runner scores a throw as `rejected`, so every case is rejected → `unverifiable` / `rejects-every-input` with `executed > 0`. Same conclusion (not probeable), different mechanism — corrected.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

- **I6 — `internal` disqualification scope:** the `markdown-structure` sink's legitimate cases are implementation-report shaped. Probing a validator of a *different* document through it would report its legitimate cases as `overblocked`. So "a `markdown-structure` sink disqualifies document validators" is too broad. → the rule: a sink disqualifies `internal` only when its legitimate cases are documents the predicate is meant to accept; the sink blurb states the shape it models.
- **O4:** `estimated_effort_hours: 4` — three engine/doc surfaces, a runner rule, a generated doc, three SKILL.md edits and a mutation proof; 6h is more realistic. Updated.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **I4 — Shared test key (check 13):** see Q4. Also `probe-boundary-signals.mjs` returns `{ boundary: boolean }`: that is the *signal detector* (does Step 1b fire?), not the recorded decision, and stays boolean — the plan now says so, so the enumeration test does not "update" it.
- **O3:** Breaking Change 1 names `review-security`'s liftable block as a consumer; `skills/review-security/SKILL.md` contains no `boundary` field. Left for the developer to confirm in Phase 3 (drop it from the list if it is not a consumer).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks are additive and the rollback is a revert + bundle. The new runner rule (I1) is the one behaviour change to existing probes: a JS export that already returns `{ ok: false }` for a hostile input would move from `accepted` to `rejected`. Added to Medium risks with its mitigation (the rule reads only an own `ok === false`; a test pins both directions; existing corpus sinks' fixtures are re-run by `npm test`).

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 6 (all applied)

1. I1 — `ok === false` rejection rule in the JS runner (Phase 2), with a both-ways test.
2. I2 — isolated per-code hostile cases; mutant targets the isolated `header-block-duplicated` case.
3. I3 — inline corpus cases; fixtures referenced from the engine test only.
4. I4 — compound enumeration key; signal detector stays boolean.
5. I5 — `SINK_BLURB` + regenerate `security-input-corpus.md`.
6. I6 — scope the `internal` disqualification to sinks whose legitimate cases the predicate should accept.

### Consider (Optional) - 5

1. O1 — `--args-json '[{"sections": <loadTemplate()>}]'` (applied).
2. O2 — correct the "records entry-not-probeable" wording (applied).
3. O3 — confirm `review-security` is a consumer (developer check).
4. O4 — effort 4h → 6h (applied).
5. O5 — `quick_validate.py` on the three touched skills; `npm run generate-catalog` only if a description changes (developer check).

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 7/10 before)

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the six important issues were plan defects with clear, evidence-backed fixes, all applied to the task and plan documents in Step 8.5.

---

## Next Steps

1. Phase 1 → 2 → 3 in order (Phase 2's runner rule is what makes Phase 1's cases score correctly).
2. Mutation-prove the runner rule and the isolated header-block case.
3. `npm run bundle`, CHANGELOG, `npm run ci:fast`.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous under develop-task Step 2)
- **Review Date:** 2026-09-30
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.131.markdown-structure-sink-internal-validator-class/task.131.markdown-structure-sink-internal-validator-class.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{tech-stack,coding-standards}.md` (via pre-pass B)
- **Executed evidence:** `lintReport` with and without `sections` on `corrupt-task117.md`, `green/task.118.md` and `""`; the runner's rejection predicate replicated inline.
