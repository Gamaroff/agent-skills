# Task Review Report: Task 94 — Add the observe-work meta-skill

**Reviewed:** 2026-09-08
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development (promoted by this review)
**Overall Assessment:** EXCELLENT

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-09-08

---

## Executive Summary

Task 94 is an unusually well-specified document: six phases with explicit risk levels and dependencies, a 22-entry Files Summary split by create/modify/generated/delete, a testing strategy across five levels, and a risk assessment that names the failure mode most likely to sink the work (the skill installs but never activates) and turns it into scoped Phase 6 work rather than advice. Every technical claim was verified against the repository; one path was wrong, one count was stale, and one duplicated `**Status:**` line would have drifted. All three were corrected.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️ (both fixed)
**Optional Improvements:** 1 💡 (fixed)

**User Clarifications:** 0 questions asked — autonomous pipeline run; no ambiguity required user input, because every finding had a single verifiable correct answer in the repo.
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline under an autonomous directive. No `AskUserQuestion` was issued. Three pipeline auto-answers were applied:

| Question point | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 8.5 — apply fixes | Yes, all critical + important | Pipeline needs the task corrected before Step 3 `/develop` |
| Step 9 — update status | Yes, fixes complete | Outcome is READY TO IMPLEMENT; promote `planned → ready-for-development` |

No question point produced an ambiguity that needed a human: each finding was a factual claim checkable against the tree, with exactly one correct value.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes.

- **File naming**: `task.94.observe-work-skill.md` — dots as structural separators, hyphens within the descriptive name. ✅
- **Metadata**: `status`, `priority: High`, `estimated_effort_hours: 16`, `category: infrastructure`, `github_issue: 340` all present. ✅
- **Placeholders**: no `[TBD]`, `[TODO]`, `[PLACEHOLDER]` or `???` anywhere. ✅
- **OKF conformance** (`references/open-knowledge-format.md`): `type: task` present and non-empty ✅; `description` present ✅; `tags` is a YAML list ✅; `updated` ≡ OKF timestamp ✅; tracker URL derived from `github_issue` ≡ OKF resource ✅.
- **Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` — check skipped entirely, as specified. Not a finding.
- **Change Log** (check 4b, `change-log.enabled` defaults true, enforcement advisory): section present with the four canonical columns and two rows. Currency check passes — `status` had not advanced past `planned`, and the newest row (1.1) records a substantive revision. ✅

### Issues

#### Important
- **[FIXED] Duplicate `**Status:**` line.** The document carried `**Status:** Ready for Development` in the header and a second `**Status:** Planned` in the footer boilerplate (line ~676). Two status fields in one document is a drift generator: `/develop` and `/finalise` both read `**Status:**`, and whichever they match first decides. Corrected — both now read `Ready for Development`.

#### Optional
- **[FIXED] Stale skill count.** §2 Motivation stated "This repository has 124 skills"; `ls -d skills/*/ | wc -l` returns 125. Corrected to 125.

### Tracker Card Preflight

`sync-jira-task.js --check-card` returns `ok: true`, zero findings, three resolved blocks:

| Heading | Status | Kind | Chars | Omitted |
|---|---|---|---|---|
| Summary | ok | prose | 285 | 6 |
| Success Criteria | ok | list | 477 | 16 |
| Breaking Changes | ok | prose | 149 | 8 |

Informational, not a defect: a board reader sees 3 of 19 success criteria and 1 of 9 breaking-change sentences, each with a `+N more` link back to this document. That is the builder's cap working as designed.

**Score: 9/10** — one point for the duplicate status line, which template compliance is exactly what should catch.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1, fixed)
**Hallucinations Detected:** 0

Every technology, script, path and npm target named in the document was checked against the tree. The anti-hallucination pass found **no invented library, script or command** — which is worth stating plainly, because a task authored largely from a plan file is where invented paths normally appear.

Verified present and correct:

| Claim | Verified |
|---|---|
| `shared/resources/observation-log.js` (task 93 dependency) | ✅ 47,863 bytes |
| `shared/resources/resolve-observation-workspace.sh` | ✅ sets `OBS_WORKSPACE`, `OBS_LOG_DIR`, `OBS_STAGING_DIR` exactly as documented |
| `shared/resources/observation-log-contract.md` | ✅ |
| `shared/resources/tests/observation-log.test.mjs` | ✅ |
| `skills/create-skill/scripts/init_skill.py` | ✅ |
| `skills/create-skill/scripts/quick_validate.py` | ✅ — and line 110 is literally `if '<' in description or '>' in description:`, confirming the hard-failure claim |
| `skills/create-skill/scripts/generate_catalog.py` `CATEGORIES` | ✅ list of `(name, [skills])` tuples at line 31; `"Other"` fallback at line 140 confirms the risk-assessment claim |
| `npm run generate-catalog` / `generate-skill-deps` / `bundle` / `format` / `test` | ✅ all four defined in `package.json` |
| `tests/skill-frontmatter.test.js` | ✅ |
| `tests/skill-doc-coverage.test.js` | ✅ — `UNDOCUMENTED_AT_ADOPTION` set at line 65, as the Success Criteria assume |
| `tests/executable-instructions.test.js` | ✅ |
| `docs/reference/commands.md`, `activation-phrases.md`, `skill-catalog.md` | ✅ |
| `shared/resources/skill-dependencies.json`, `CHANGELOG.md`, `AGENTS.md` | ✅ |
| `docs/contributing/authoring-skills.md` | ✅ |
| `skills/review-code/tests/review-code.test.js`, `skills/explain-simply/tests/template.test.js` (cited test style) | ✅ |
| `skills/autoskill/`, `remember-insight/`, `double-check/`, `loop-supervisor/` | ✅ all four exist |
| `skill-profiles.json` `full.seeds: "*"` | ✅ confirms the Out-of-Scope claim that no profile edit is needed |
| `invokes:` block form is rejected | ✅ `scripts/generate-skill-dependencies.mjs` line 106: "BLOCK FORM. … IS rejected loudly" |
| `skills/observe-work/` does not yet exist | ✅ absent — no partial implementation to reconcile |

### Issues

#### Important
- **[FIXED] Wrong path for the dependency-drift test.** §8 Integration Tests named `evals/shared/tests/skill-dependencies-drift.test.mjs`. That file does not exist; the real one is **`shared/resources/tests/skill-dependencies-drift.test.mjs`**. `evals/shared/tests/` exists and holds 17 other suites, which is precisely what makes the wrong path plausible enough to be copied into a Phase 5 verification step and then reported as "no such test". Corrected.

**Score: 9/10** — one wrong path out of ~25 verifiable claims, in a document whose failure mode is exactly this.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Six phases, each with a risk level, an explicit file list, checkbox-level changes and a stated dependency on its predecessor. Phase ordering is a genuine dependency chain (scaffold → body → references → tests → registration → activation), not a narrative one.

Specificity is above the bar the review criteria set. The plan does not say "update the catalog"; it says add `observe-work` to the appropriate `CATEGORIES` tuple in `generate_catalog.py`, then run `npm run generate-catalog` and commit. Phase 6 is the strongest section: it converts "the skill might not activate" from a risk note into six checkable actions, including two that are easy to omit and produce no error —

- **prove the hook's branches fire** against `never` / 30-day / 2-day fixtures, *"and confirm the third stays silent. A nag that never fires and a nag that is correctly silent look identical from a passing run"*;
- **count only `status: open` files**, never a raw directory count.

Both are the kind of instruction that exists because someone got it wrong before.

Phase 4 similarly requires proving the new `package.json` glob runs by making an assertion fail and watching `npm test` go red — the mutation-proof discipline this repo already treats as mandatory, applied to the one trap (`skills/*/tests/` is not auto-discovered) that has previously cost it 232 silently unrun tests.

**Effort estimate**: `estimated_effort_hours: 16`, revised from 8 in Change Log 1.1 when Phase 6 was added. Consistent with 6 phases, 22 files and a registration surface of 11 CI-enforced steps. No divergence flag.

**Score: 10/10.**

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- **Overview ↔ Implementation Plan**: the three "key deliverables" (lean SKILL.md, five references, full registration) map onto Phases 2, 3 and 5 respectively. ✅
- **Files Summary ↔ phases**: all 22 entries trace to a phase. The five references in item 2–6 match Phase 3's file list exactly; the three deletions match Phase 1's placeholder removal. ✅
- **Testing Strategy ↔ changes**: unit (prose invariants), integration (the four repo-level suites), contract (engine boundary), performance (line count and bundle size), consumer (`create-skill` unaffected by the new inbound edge). The contract-test level is the right call for a prose-driven skill — it asserts that every `reason` value the prose branches on is in the engine's vocabulary, which is the only thing that keeps a documentation skill honest against a code dependency. ✅
- **Success Criteria measurability**: 19 criteria, each verifiable by running something. "Bundle size recorded and materially below upstream's ~214KB total" is the softest ("materially"), but it is paired with a hard one (`SKILL.md` body under 500 lines) that is directly asserted. Acceptable. ✅
- **Scope/complexity**: 6 phases, well under the >8 threshold that suggests splitting. The 93/94/95 sequence has already done the splitting — 93 shipped the engine, 95 takes the config schema and reciprocal boundary notes. Out of Scope names both explicitly. ✅

No contradictions found between sections.

**Score: 10/10.**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

One High risk, three Medium, two Low — each with probability, impact, mitigation and rollback. The High-risk entry is the notable one: it identifies that the skill's characteristic failure is *self-concealing* ("a loaded-but-inert skill is indistinguishable from an active one from the user's side"), states the residual risk rather than claiming closure ("even a hook can only inject a prompt"), and supplies an external diagnostic for the case where every layer is skipped ("if the observation-log directory does not exist after a few sessions of real work, activation never happened"). That is a risk entry that survives contact with the failure.

Rollback plan has three tiers with explicit triggers, steps and verification. The Immediate tier's verification — clean `git diff` on all generated files, `npm test` green, no `observe-work` reference outside `docs/tasks/task.94.*` — is checkable rather than aspirational. The Forward Fix tier correctly observes that the observation log is append-only and format-stable, so no prose change can invalidate existing entries; there is no data migration to undo.

**Score: 10/10.**

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 2 issues — both applied

1. ✅ **Corrected the dependency-drift test path** — `evals/shared/tests/skill-dependencies-drift.test.mjs` → `shared/resources/tests/skill-dependencies-drift.test.mjs` (§8 Integration Tests).
2. ✅ **Removed the duplicate footer `**Status:** Planned`** — the document now carries one status value in both places.

### Consider (Optional) — 1 item — applied

1. ✅ **Skill count 124 → 125** (§2 Motivation).

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 10/10
- Consistency: 10/10
- Risk Management: 10/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Zero critical issues; both important findings were factual slips with a single correct value each, and both are now fixed. The plan is executable step by step without guesswork, and its two hardest-to-verify success criteria (the test glob actually running, the hook's silent branch actually being silent) already carry mutation-proof instructions rather than assertions of intent.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the implementation plan phase by phase — the dependency chain is real; Phase 5 regeneration will fail if Phase 4's `package.json` edit is missing.
2. Check off Progress Tracking boxes as each phase completes.
3. Run `npm run ci:fast` after each phase; `npm run ci` before the PR.
4. Treat the two "prove it fires" steps (Phase 4 glob, Phase 6 hook branches) as gates, not as documentation — both failure modes are green-passing.
5. Refer to the Rollback Plan if the catalog or dependency-drift checks cannot be made green by regeneration alone.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, via `/develop-task` Step 2, dispatched by `/develop-next`)
- **Review Date:** 2026-09-08
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.94.observe-work-skill/task.94.observe-work-skill.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (devLoadAlwaysFiles); `AGENTS.md`; `skills-config.yaml`
- **Verification performed:** 25 technical claims checked directly against the working tree (scripts, npm targets, test files, docs pages, neighbouring skills, validator source, dependency-generator source, skill-profiles seeds); tracker-card preflight executed
- **Pre-pass agents:** not dispatched — session operating instructions bar subagent dispatch unless requested; all verification was performed inline and is enumerated above
