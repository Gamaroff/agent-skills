# Task Review Report: Task 41 — New moments, scaffolding, and the `develop-bug` gap

**Reviewed:** 2026-08-12
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development (updated in Step 9)
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-08-12

---

## Executive Summary

Task 41 is a well-structured capstone with a strong risk section, per-phase rollback, and correctly-scoped opt-in defaults. Its weakness is **reference accuracy**: five of its citations point at the wrong place, one named file does not exist at the given path, one scope item is already complete in `develop`, and an existing CLI flag that overlaps the proposed one is never mentioned. Every finding is a document-level correction — none change the task's intent or design.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 asked — autonomous pipeline run; all ambiguities resolved against the codebase and recorded as findings below.
**Implementation Readiness:** 7.4/10 before fixes → **9.1/10 after fixes**
**Recommendation:** ✅ **READY TO IMPLEMENT** (post-fix)

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline under an autonomous directive: no questions were put to the user. Every point that would normally have become a clarifying question was instead resolved by reading the codebase, and is recorded below as a finding with its evidence. Two items that would have been genuine judgement calls are flagged in *Residual Judgement Calls* at the end — both were resolved conservatively (keep the task's intent, correct only the facts).

---

## 1. Template Structure Compliance

**Status:** PASS (with gaps)

All 11 mandatory numbered sections are present (Overview → Rollback Plan), plus Progress Tracking, References, and Notes. File naming follows `task.{n}.{descriptive-name}.md`. No unfilled placeholders (`TBD`/`TODO`/`???`) found.

**OKF frontmatter**: `type: task` ✅ present and non-empty; `description` ✅ present; `tags` ✅ valid YAML list; `github_issue: 189` ✅ resolves (issue exists, open).

**Tracker card preflight** (`sync-jira-task.js --check-card`): **exit 0 — no problems**. All three card blocks resolve:
- Summary — 58 chars, 2 sentences omitted → `+N more` link
- Success Criteria — 337 chars, 9 omitted → `+N more` link
- Breaking Changes — 121 chars, 5 omitted → `+N more` link

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as specified.

### Issues

#### Important
- **§7 Files Summary has no "Files to Add" subsection.** It carries "Files to Modify (Core Implementation)", "(Tests)", "(Documentation)", and "Files to Delete: None" — but the template requires Modify/Delete/**Add**, and Phase 3 does create at least one new artefact. The omission is what let finding 🚨1 hide: a file that does not exist was filed under "Modify".

#### Optional
- **No `risk_level:` in frontmatter.** Per-phase risk levels are given inline and §10 is thorough, but the frontmatter field the pipeline's lite-mode detector reads is absent. It defaulted to `absent` → `standard` mode, which is the correct outcome here (5 phases, multi-module), so nothing broke. Setting it explicitly removes the inference.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 non-existent path, 3 wrong line citations, 1 stale scope claim

### Issues

#### 🚨 Critical

- **`assets/tracker-workflow.default.yaml` does not exist, and the path is unreachable from a consumer install.**
  - **Location:** §6 Phase 3 (Files), §7 Files Summary item 10
  - **Evidence:** There is no `assets/` directory at the repo root (`find . -type d -name assets` returns only `skills/develop-next/assets`, `skills/create-bug-report/assets`, `skills/finalise/assets`). The annotated starter template already exists at **`docs/examples/tracker-workflow.default.yaml`**, and the repo's own `tracker-workflow.yaml` header points readers at exactly that path.
  - **Compounding problem:** `scripts/setup-consumer.sh` writes every file it scaffolds via an **inline heredoc** — it sources no external template anywhere (`grep -nE "docs/examples|assets/|TEMPLATE" scripts/setup-consumer.sh` returns nothing). The wizard also runs *in the consumer repo*, where this repo's `docs/examples/` is not present; only the installed `.agents/skills/` tree is. So a template file at any repo-root path is not reachable by the scaffolder at all.
  - **Why Critical:** a developer following §7 literally creates a **second, competing** default template while the real one sits in `docs/examples/`, and then wires the scaffolder to a path that does not resolve on a consumer machine.
  - **Fix applied:** Phase 3 and §7 now name `docs/examples/tracker-workflow.default.yaml` as the existing annotated reference (kept in sync, not recreated), and state that `setup-consumer.sh` emits the file via an inline heredoc consistent with `.env` and `skills-config.yaml`.

- **The `configuration.md` → `project.yml` scope item is already complete on `develop`.**
  - **Location:** §4 In Scope (last bullet), §6 Phase 5, §7 item 11, §9 Migration criterion ("documents `project.yml` for the first time"), §2 Current Problems
  - **Evidence:** `docs/reference/configuration.md:586` already contains `## `project.yml` — board identity`, running to L608, with the full key table (`github.owner`, `github.repo`, `github.project_board_number`, `github.project_board_name`), the consolidation rationale, and the `skills-config.yaml` precedence note. It landed before this task was picked up.
  - **Why Critical:** it is a success criterion the task would score itself against and find already met — and a developer implementing it verbatim would append a duplicate section.
  - **Fix applied:** the scope item is now "verify and correct", not "create", and the stale in-section sentence to fix is named explicitly (see 💡 below).

#### ⚠️ Important

- **Three cited line numbers are wrong.** All three anchors exist — they have simply moved.

  | Citation in §References / §3 | Claimed | Actual | Evidence |
  | --- | --- | --- | --- |
  | `jira-sync.js` — "meant to be `--check`ed in CI" | `:1812` | **`:2433`** | L1812 is inside the `MERGE_CANDIDATES` / "Pipeline stages" comment block. The `--check` claim is at L2433: `` // `--probe-workflow --write` and `--check`ed in CI. JSON round-trips with zero `` |
  | `jira-sync.js` — `buildWorkflowRecord` (preserve-intent precedent) | `:2731` | **`:3744`** (def; called at `:3725`, exported at `:4118`) | L2731 is `resolveTransition`, an unrelated function |
  | `setup-consumer.sh` — "already exists → `kept (existing)`" pattern | `:307-317` | **`:322-331`** (skills-config) and **`:261-266`** (`.env`) | L307-317 is `_read_config_path`, a YAML value extractor |

  - **Why Important:** these are the task's *precedent* citations — the whole point is "do it the way that code already does it". A developer landing on `resolveTransition` instead of `buildWorkflowRecord` gets no signal about preserve-intent semantics.
  - **Fix applied:** all three corrected.

- **`--init-workflow` overlaps an existing flag the task never mentions.** `gh-stage.js` already ships `--probe-board [--write-ladder]`, documented in its own usage string at L652-653 as *"read-only; `--write-ladder` writes `tracker-workflow.yaml` **only when absent**"*, implemented by `writeLadder()` at L1226 (emitting a `# Generated by ...` header at L1240). That is the never-overwrite half of the proposed `--init-workflow` on the GitHub side, already built and already tested (`shared/resources/tests/gh-stage.test.mjs`).
  - **Why Important:** Phase 3 as written reads as greenfield and would produce a second flag with near-identical semantics on the same CLI — precisely the duplication §9 Code Quality warns against.
  - **Fix applied:** Phase 3 now states that GitHub's `--init-workflow` extends `--write-ladder` (adding `--force` and JSON-record conversion) rather than replacing it, and keeps `--write-ladder` working.

- **The Jira probe lives in a different module than Phase 3 implies.** Phase 3's dependency note says "tasks 38 and 39 (both probes must exist)". The GitHub probe is on the stage CLI (`gh-stage.js --probe-board`), but the Jira probe is **not** on `jira-stage.js` — that CLI's full flag set is `--allow-regress --dry-run --from --help --issue --issue-type --json --print-plan --quiet --show-toplevel --stage --strict --worklog`. `probeWorkflow()` is defined in `jira-sync.js:3522` and exported at `:4112`.
  - **Why Important:** `--init-workflow` on `jira-stage.js` must import from `jira-sync.js`; the two CLIs are not symmetric, and assuming they are costs an hour of hunting for a flag that isn't there.
  - **Fix applied:** noted inline in Phase 3.

- **`tracker-workflow.js`'s "three moments" comment goes stale the moment Phase 1 lands.** L125-127 reads *"The three moments absent here are absent on purpose: `in-qa`, `ready-for-merge` and `blocked`"* — but `DEFAULT_PIPELINE` (L128-132) omits **five** of the eight moments; `changes-requested` and `pr-merged` are absent too and go unmentioned. The parallel comment at L52-54 does name them ("declared here but not wired until task.41").
  - **Why Important:** this task is the one that makes that comment actively wrong, and §7 lists `tracker-workflow.js` only for `--check` validation, so nothing directs the developer to it.
  - **Fix applied:** added to Phase 1's change list.

- **§2 problem 5 frames the `develop-bug` gap misleadingly.** It says develop-bug *"has no `develop-pipeline-step-5-6-qa-loop.md` in its references"* — literally true, but `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` **does** exist; it is simply the bug-flavoured equivalent under a different name. §7 item 6 names the right file, so the plan is correct; only the diagnosis is phrased as a missing file rather than a missing signal.
  - **Evidence:** `grep -nE 'stage|in-qa|ready-for-merge|gh-stage|jira-stage'` over that file returns **zero matches**, while the story/task loop signals three stages (`in-qa` L32, `in-review` L45, `ready-for-merge` L201). The gap is real; the wording is not.
  - **Fix applied:** reworded to "signals no stage".

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with a risk level, explicit file list, checkbox changes, and dependencies. Changes are specific enough to action (`§5b, on entry, before /qa-fix`), and the co-located plan file carries the actual command invocations. Phase ordering is sound: `changes-requested` (1) → `pr-merged` (2) → scaffolding (3) → `--check` (4, depends on 3) → parity/docs (5).

The `estimated_effort_hours: 16` is consistent with the rubric for 5 phases across ~13 files with 3 test files — no divergence finding.

No issues beyond the "Files to Add" gap recorded in §1.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

§7 Files Summary reconciles against the per-phase file lists with the two corrections above applied. Testing Strategy covers all four test axes the changes need — unit (`--check` rules, never-overwrite guard), integration (moments fire where they should *and nowhere else*), contract (the inverted exit code), and consumer (end-to-end wizard run). Success Criteria are measurable and map to the stated benefits.

Three details worth calling out as **good**, not defects:
- The "neither is in the default `pipeline:` map" assertion is **verified correct** — `DEFAULT_PIPELINE` (L128-132) contains only `work-started`, `in-review`, `done`, and `DEFAULT_RUNG_FOR_MOMENT` (L147-153) has no rung for either new moment.
- The performance section quantifies the chattiness risk (≤5 extra calls/run) with a stated baseline of zero and a "measure before deciding" mitigation.
- §10's High Risk entry correctly identifies that `develop-batch` must fire `pr-merged` *inside* the per-item merge block, with an explicit test to assert it.

**Scope/complexity check:** 5 phases, ~13 files, 16h — under the >8-phase / >1-sprint split threshold. The phases are independently revertible (§11 says so explicitly). **No split recommended.**

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — the strongest section of the document

Risk identification is proportionate: the one Critical-impact risk (`pr-merged` moving the wrong card on a shared board) is correctly rated, has a concrete mitigation (fire inside the loop body, keyed on that item's `TRACKER_ISSUE`) and a test to enforce it. The `--check` inverted-exit-code risk is unusual and well-reasoned — it names the specific failure mode (a future contributor "harmonising" it) and mitigates with a comment plus a test.

Rollback is complete: per-phase independence stated, triggers separated into Critical vs Non-Critical, verification steps given, and a three-tier time budget.

No issues.

---

## Summary of Recommendations

### Must Fix (Critical) — 2

1. ✅ Correct `assets/tracker-workflow.default.yaml` → `docs/examples/tracker-workflow.default.yaml`, and state that `setup-consumer.sh` scaffolds via inline heredoc (no external template read).
2. ✅ Rescope the `configuration.md` → `project.yml` item from "create" to "verify/correct" — the section already exists at L586-608.

### Should Fix (Important) — 5

3. ✅ Correct `jira-sync.js:1812` → `:2433`.
4. ✅ Correct `jira-sync.js:2731` → `:3744`.
5. ✅ Correct `setup-consumer.sh:307-317` → `:322-331` / `:261-266`.
6. ✅ Acknowledge `gh-stage.js --write-ladder` and scope `--init-workflow` as an extension of it; note `probeWorkflow` lives in `jira-sync.js:3522`, not `jira-stage.js`.
7. ✅ Add the `tracker-workflow.js:125-127` "three moments" comment to Phase 1; reword the §2 `develop-bug` diagnosis.

### Consider (Optional) — 3

8. ✅ Add a "Files to Add" subsection to §7.
9. ✅ Add `risk_level: medium` to frontmatter.
10. 💡 *Not applied (in-scope for implementation, not for the task doc):* `configuration.md:589` still reads "It has never been documented here" **inside the section that documents it**. Phase 5 should delete that clause.

---

## Implementation Readiness Assessment

**Score:** 9.1/10 (post-fix; 7.4/10 pre-fix)

| Dimension | Pre-fix | Post-fix |
| --- | --- | --- |
| Template Compliance | 8/10 | 9/10 |
| Technical Accuracy | 5/10 | 9/10 |
| Implementation Clarity | 8/10 | 9/10 |
| Consistency | 7/10 | 9/10 |
| Risk Management | 9/10 | 9/10 |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every finding was a factual correction to references and scope, not a design flaw — the phase structure, opt-in defaults, risk analysis, and rollback plan all held up under verification. With the two Critical items fixed, no scope item is already-done or points at a non-existent path, and the developer can follow §6 and §7 literally without producing duplicate artefacts.

---

## Residual Judgement Calls

Recorded for transparency — both resolved conservatively, neither blocking:

1. **Should the default template move from `docs/examples/` to a skill's `assets/`?** The task wanted a template at a repo-root path; the reachability problem (consumer installs see only `.agents/skills/`) means an inline heredoc in `setup-consumer.sh` is the only approach consistent with how that script already works. Fixes preserve `docs/examples/` as the annotated human reference and put the emitted content in the heredoc. If the implementer prefers bundling a real file into each skill's `references/`, that is a defensible alternative — it just needs `bundle_skill.py` wiring the task does not currently mention.
2. **Should `--init-workflow` replace `--write-ladder` outright?** Replacing would be cleaner but is a breaking CLI change on a shipped flag, which §5 promises there are none of. Fixes take the additive route: `--init-workflow` extends, `--write-ladder` keeps working.

---

## Review Metadata

- **Reviewer:** Claude (autonomous — `/develop-task` pipeline Step 2)
- **Review Date:** 2026-08-12
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.41.pipeline-moments-and-scaffolding/task.41.pipeline-moments-and-scaffolding.md`
- **Verification performed:** 17 file-existence checks; 6 line-number verifications; CLI flag inventory on both stage CLIs; `DEFAULT_PIPELINE` / `DEFAULT_RUNG_FOR_MOMENT` / `MOMENTS` inspection; `develop-bug` verify-loop stage grep; tracker-card preflight; `configuration.md` section scan
- **Docs consulted:** `docs/reference/configuration.md`, `docs/reference/tracker-workflow.md`, `docs/examples/tracker-workflow.default.yaml`, `tracker-workflow.yaml` (repo root), `skills-config.yaml`
