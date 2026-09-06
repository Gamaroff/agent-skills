# Task Review Report: Task 79 — Write down the inputs that defeat each sink, once

**Reviewed:** 2026-09-06
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-09-06

---

## Executive Summary

The task is well-argued, precisely cited, and structurally complete: all 11 mandatory sections are
present, the tracker-card preflight passes clean, and every named prior-art file exists at the line
ranges claimed. Two factual citation errors and one undeclared test constraint were found — none
blocking, all fixed in this pass.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked — invoked by the `develop-task` orchestrator in autonomous
mode; Step 0 output format and Step 8.5 fix application were auto-answered per
`develop-pipeline-autonomous-defaults.md`.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No interactive question points were reached. This review ran inside the `develop-task` pipeline, where:

- **Step 0 (output format)** → auto-answered "Comprehensive report".
- **Step 8.5 (apply fixes)** → auto-answered "Yes, apply all critical + important fixes".
- **Tracker sync (Step 2 check 5)** → declined. This repository's tasks are roadmap-driven, not
  issue-driven: `task.73`–`task.83` all carry no `github_issue`. Creating one unprompted is forbidden
  by the skill contract, and the absence is the local convention rather than a gap.

---

## 1. Template Structure Compliance

**Status:** PASS (with one currency issue)

All 11 mandatory numbered sections present (`## 1. Overview` … `## 11. Rollback Plan`), plus
`## Change Log`, `## Progress Tracking`, `## References`, `## Notes`. No placeholders
(`[TBD]`/`[TODO]`/`???`) anywhere. Filename `task.79.security-input-corpus.md` follows dots-for-structure,
hyphens-within-name.

**OKF conformance**: `type: task` ✅, `description` ✅ (one sentence), `tags` a YAML list ✅,
`updated` present ✅. Conformant.

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as
specified. No finding.

**Tracker card preflight**: `sync-jira-task.js --check-card` exits **0**, `ok: true`, zero findings.
All three blocks resolve — Summary (prose, 362 chars, +3 omitted), Success Criteria (list, 418 chars,
+3 omitted), Breaking Changes (prose, 109 chars, +2 omitted). The `+N more` counts are informational:
a board reader sees roughly the first two-thirds of each block.

### Issues

#### Important

- **Change Log is stale.** Newest row is `1.0 — Initial draft` (2026-09-02), but frontmatter
  `status: ready-for-development` has advanced past `planned` with no row recording the promotion.
  `change-log.enforcement` is unset → defaults to `advisory`, so this deducts from the score but does
  not block development. **Fixed** by the Step 8.5 verdict row.

#### Optional

- **No `github_issue` / `jira_key`.** Under the generic contract this is an Important gap. Here it is
  not: every task from `task.73` to `task.83` in this repo is unlinked, the roadmap
  (`docs/development/project-completion-roadmap.md`) is the tracking surface, and Phase 0 of this
  pipeline already resolved `TRACKER_ISSUE=""` and skipped all tracker signalling accordingly.
  Downgraded to Optional with that evidence recorded.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — but **2 citation errors**

Every technical claim that could be mechanically verified was verified, and the precision is unusually
high. Confirmed accurate:

- `shared/resources/finalise-dod-security-prompt.md:110-118` **is** exactly the axes block — `:110` the
  "Generate candidates across these axes" instruction, `:112-113` the table header/separator, `:114-118`
  the five rows. The cited range is precise.
- `:135-137` **is** exactly the accept-direction paragraph ("5. Probe the other direction too … legitimate
  inputs that must still be accepted"). Precise.
- `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs:52-66` **does** hold 14 verbatim
  hostile shell inputs (`BUG3_ROUTES`, const at `:51`, inputs at `:52-65`). Count and range as claimed.
- All named prior art exists: `qa-runnable-prose-detection.md` (257 lines), `qa-execute-snippets.mjs`
  (1517), `qa-re-review-scope-parity.test.mjs` (561), `finalise-dod-prompt-contract.test.mjs` (513),
  `mutation-proving.md` (220 — and the relative link `../../../shared/resources/mutation-proving.md`
  resolves correctly from `docs/tasks/task.79.*/`).
- The paired `.md`-beside-`.mjs` convention in `shared/resources/` is real and matches the cited
  `task.67` precedent. `AGENTS.md` §Shared Resources and `docs/architecture/concepts/source-tree.md:66,78-79`
  name `shared/resources/` as the single source of truth; `coding-standards.md:21` forbids duplicating it —
  which is the architectural argument for Phase 4.
- `.mjs` for a shared module is established despite `package.json` `"type": "commonjs"` —
  four such modules already exist.
- **The `package.json` test-glob claim is TRUE.** `package.json`'s `test` script already contains the
  literal `'shared/resources/tests/*.test.mjs'` and `'evals/shared/tests/*.test.mjs'`. No edit needed.
  Phase 3's added caution ("Confirm it actually ran in the gate log, which in this repo is distinct from
  being registered") is the correct posture for a hand-maintained glob.
- `npm run bundle` applies, **to exactly one skill**: `skills/finalise` is the sole referrer of
  `finalise-dod-security-prompt.md`. `finalise-dod-prompt-contract.test.mjs:493-513` enforces both the
  bundled copy's existence and its content parity with the source, so skipping the bundle fails CI
  rather than drifting silently. Phase 4's bundle step is non-optional and correctly stated.
- `task.79` is registered at `docs/tasks/task-registry.md:121` as `ready-for-development`, with
  `task.80 → 79`, `task.81 → 79+80`, `task.82 → 81` dependencies matching the scope boundaries drawn.

### Issues

#### Important

- **`bug.3` does not resolve to the fail-open bug.** §2 and Phase 2 cite "`bug.3` documented 14
  fail-open inputs" and "draw from `bug.3` and `bug.6`". Unqualified, `bug.3` is the **general** bug
  `docs/bugs/bug.3.stdout-truncation-on-exit/` — an unrelated stdout-truncation defect. The actual
  source of the fourteen is the **task-scoped** bug
  `docs/tasks/task.67.execute-the-skill-qa-gate/task.67.bug.3.obfuscated-names-and-flag-writes.md`,
  named verbatim at `snippet-classifier-fail-open-replay.test.mjs:50`. An implementer following the
  citation lands on the wrong document.
  - **Recommendation:** qualify as `task.67.bug.3` everywhere, matching the bug-mode naming split in
    `docs/standards/bug-documents.md`, and link it by full path as `bug.6` already is. **Fixed.**

- **`bug.6`'s count is wrong, and the correction is worth free coverage.** §2 says "bug.6 documented
  12 more". bug.6's own Resolution reports **13 fail-open routes plus 2 over-refusals**
  (`bug.6.*.md:148`, `:332`). The "12" is the title-level count (ten mutating + two over-refusals),
  superseded by the investigation.
  - **Recommendation:** say 13 + 2, and note that the **2 over-refusals seed `legitimate` cases** —
    the required accept direction gets real, measured seed data instead of invented examples. **Fixed.**

#### Optional

- The `BUG3_ROUTES` const spans `:51-66` with the inputs themselves at `:52-65`; the task cites
  `:52-66`. Close enough to be useful; left as-is.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Four phases, each with an explicit risk level, file list, checkboxed changes, and a `Dependencies:`
line forming a clean 1→2→3→4 chain. File changes are specific (exact paths, exact exports, exact case
shape). A developer can follow it.

### Issues

#### Important

- **Phase 4 silently collides with an existing test.**
  `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:126-140` already asserts that all five axis
  names — `Alternative spellings`, `Position`, `Composition`, `The unparseable case`, `Flag forms` —
  are present in the prompt source. Phase 4 frames its test work as purely additive ("**Extend** … to
  assert the prompt references the corpus"), never flagging the pre-existing constraint. The phase
  text does say "keeping the axes as a short summary", which — if honoured — keeps the test green; but
  an implementer who reads "replace the restated axes table with a reference" and drops the names turns
  a guard red for reasons the task never warned about. This is precisely the orphaned-guard failure mode
  `task.74` is cited for.
  - **Recommendation:** state the constraint explicitly in Phase 4, naming the test and line range.
    **Fixed.**

- **Test filename breaks the source↔test mapping.** Phase 3 and §8 name
  `shared/resources/tests/security-corpus.test.mjs` for the module `security-input-corpus.mjs`. Every
  other pair in that directory is name-for-name: `qa-execute-snippets.mjs` ↔
  `tests/qa-execute-snippets.test.mjs`, likewise `change-log`, `tracker-workflow`,
  `generate-prd-epic-index`, `yaml-subset`. The proposed name drops `input`.
  - **Recommendation:** rename to `shared/resources/tests/security-input-corpus.test.mjs` in Phase 3,
    §7 Files to Create, §8 Testing Strategy command, and §9. **Fixed.**

- **§7 Files Regenerated is under-stated.** `bundle_skill.py` walks shared references **transitively**
  (`skills/create-skill/scripts/bundle_skill.py:135`). Once `finalise-dod-security-prompt.md` links
  `shared/resources/security-input-corpus.md`, that corpus doc — and the `.mjs` if the doc links it —
  is copied into `skills/finalise/references/` and must be committed. `validate.yml` gates bundle
  freshness. Naming only "`skills/finalise/references/*`" invites a partial commit.
  - **Recommendation:** name `skills/finalise/references/security-input-corpus.md` explicitly.
    **Fixed.**

- **`CHANGELOG.md` is listed in §7 Files to Modify but assigned to no phase.** A developer working
  phase-by-phase never touches it.
  - **Recommendation:** add a `CHANGELOG.md` checkbox to Phase 4 alongside `npm run bundle`. **Fixed.**

#### Optional

- **Effort estimate.** Frontmatter says `estimated_effort_hours: 5`. The rubric
  (`references/effort-estimation-rubric.md`) computes: base 2 + AC 8→+4 + 17 plan tasks→+4 + 7 files→+1,
  `risk_level: low`→+0, no integration → 11h, snapping to the **8h** bucket. Divergence is
  |5−8|/8 = 0.38, under the 0.5 flag threshold. No finding — recorded for information.

- **Prettier covers the new `.mjs`.** `.prettierignore` excludes `*.md`, `*.yml`, `*.json` and
  `skills/*/references/`, but **not** `shared/resources/*.mjs`. `npm run ci:fast` runs
  `prettier --check .` before the tests, so the new module must satisfy `printWidth: 80`,
  `singleQuote: false`, `semi: true`, `trailingComma: "all"`. Worth an implementation note. **Added.**

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- §1 Overview scope ("a new shared resource pair plus its schema test, and one edit folding the
  existing prompt's hand-rolled axes table into a reference") matches §4 In Scope, §6's four phases, and
  §7 exactly.
- §4 Out of Scope draws four boundaries (executor→task.80, skill→task.81, `qa-execute-snippets.mjs`,
  QA wiring→task.82) that match `task-registry.md`'s recorded dependency graph.
- §8 Testing Strategy covers every §9 Functional criterion, and §8's Mutation Proving block gives three
  concrete revert-and-confirm-red procedures — satisfying the repo's mutation-proving requirement rather
  than gesturing at it.
- §9 criteria are all mechanically verifiable (count sinks, assert both directions present, assert throw,
  grep the prompt for a reference).
- §11 Rollback names a trigger, steps, and a verification command that exists.
- **Scope/complexity**: 4 phases, ~17 top-level checkboxes, one module + one doc + one test + one prompt
  edit. Well under the >8-phase split threshold. No split recommended.

No Mermaid diagrams present. None needed — the corpus is a flat keyed table, and the prose conveys the
structure. No diagram recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- The one Medium risk named ("the corpus becomes a third copy of knowledge rather than the single one")
  is the right risk, is drawn from a real prior incident (`task.74` found a third stale copy at its own
  DoD gate), and its mitigation is a **test**, not an instruction — the correct shape.
- The Low risk ("sink taxonomy is wrong or incomplete") is honestly graded and correctly reasoned:
  additive by construction, nothing depends on the set being closed.
- Rollback is genuinely immediate: two new files are inert until `task.80` consumes them, so the only
  real revert is the prompt edit, and the verification command for that revert is named and exists.

### Issues

None.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 6 issues

1. Qualify `bug.3` as `task.67.bug.3` and link it by full path — unqualified it resolves to an
   unrelated general bug. ✅ Fixed
2. Correct bug.6's count to 13 fail-open + 2 over-refusals, and use the 2 over-refusals as
   `legitimate` seed cases. ✅ Fixed
3. Declare in Phase 4 that `finalise-dod-prompt-contract.test.mjs:126-140` pins all five axis names,
   so the summary must keep them. ✅ Fixed
4. Rename the test to `security-input-corpus.test.mjs` to preserve the source↔test mapping. ✅ Fixed
5. Name `skills/finalise/references/security-input-corpus.md` in §7 Files Regenerated — the bundler
   walks transitively. ✅ Fixed
6. Assign `CHANGELOG.md` to Phase 4 so it is not orphaned from every phase. ✅ Fixed

### Consider (Optional) — 3 items

1. `BUG3_ROUTES` inputs are at `:52-65`, const at `:51` — the cited `:52-66` is close enough. Left.
2. `estimated_effort_hours: 5` vs rubric 8 — within tolerance, not flagged. Left.
3. Prettier note for the new `.mjs`. ✅ Added.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — all sections, clean card preflight, no placeholders; −1 stale Change Log
- Technical Accuracy: 7/10 — zero hallucinations and unusually precise line citations, but two wrong
  document references
- Implementation Clarity: 8/10 — specific and ordered; −2 for the undeclared test constraint, the
  test-name mismatch, and the orphaned `CHANGELOG.md`
- Consistency: 9/10 — Overview, Scope, Phases, Files Summary and Success Criteria all agree
- Risk Management: 9/10 — the right risk, mitigated by a test rather than an instruction; concrete
  rollback with a real verification command

**Confidence Level for Successful Implementation:** High

**Recommendation:**

✅ **READY TO IMPLEMENT** — score ≥ 8 with zero critical issues. All six Important issues were
citation, naming, or declaration defects fixable in the document itself, and all six have been applied.

**Justification:** The task's method is sound and its prior-art citations verified precise on every
mechanical check, including the one claim most likely to be wrong in this repository (the hand-maintained
`package.json` test glob), which is TRUE. The defects found were bookkeeping, not design.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the implementation plan phase by phase (1 → 2 → 3 → 4; dependencies are strict).
2. In Phase 2, seed from `snippet-classifier-fail-open-replay.test.mjs:52-65` (14 inputs) **and** from
   bug.6's 13 fail-open routes; use bug.6's **2 over-refusals** as `legitimate` cases.
3. In Phase 4, keep all five axis names in the summary — `finalise-dod-prompt-contract.test.mjs:126-140`
   asserts each one. Run `npm run bundle` and commit `skills/finalise/references/*`.
4. Confirm the new suite **ran** in the gate log, not merely that it is registered.
5. Run the three mutation proofs in §8 before declaring done.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via `/develop-task` Step 2)
- **Review Date:** 2026-09-06
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.79.security-input-corpus/task.79.security-input-corpus.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`,
  `concepts/tech-stack.md`, `concepts/source-tree.md`, `AGENTS.md`,
  `docs/standards/bug-documents.md`, `docs/tasks/task-registry.md`
- **Pre-pass agents:** 2 dispatched (architecture alignment → `aligned`; codebase scan →
  `not-started`), both returned
