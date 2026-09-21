# Task Review Report: Task 136 - A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Reviewed:** 2026-09-21
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 critical + important recommendations implemented — 2026-09-21 (optional items O1–O3 also applied; they were one-line edits)

---

## Executive Summary

The task is well-grounded: every cited symbol (`resolveEntry`, `SHELL_PREFIX`, `runProbeSpec`, `MATERIALISED_SINKS`, `probeShells`, `compareExpected`, `computeVerdict`, the `shell:`-with-`#` error at `security-probe.mjs:261`) exists as described, the pre-pass found no architecture drift, and nothing of the deliverable is implemented yet. Three things were wrong in ways that would have reproduced the very failure the task exists to fix: the documented finalise command runs the stock `filename` corpus whose `expected.stdout` is `"12\n"` (the `qa-cycle.sh` shape), so `gh_labels_filter` would mismatch on every case and score `absent`; the fake `gh` is specified to print JSON, but the function calls `gh label list … -q '.[].name'`, which prints one name per line, so a JSON-printing fake drops every label; and the risk-1 mitigation cites `--noprofile --norc` / `-f` as "already how the `shell:` arm spawns", which it is not. All three are corrected in the task document (see User Decisions).

**Critical Issues:** 1 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (pipeline autonomous run — decisions taken from the engine's own contract and recorded below)
**Implementation Readiness:** 9/10 (after fixes; 6/10 as submitted)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` under the `/develop-next` autonomous directive, so no `AskUserQuestion` was issued. Each decision below is the one the engine's existing contract forces; none is a design preference.

### Question Point 1: Structure & Scope

No structural questions — template compliant, no placeholders, card preflight clean.

### Question Point 2: Technical & Implementation

**Q1: How does a `shell-fn:` run of `gh_labels_filter` get an `expected` it can match, given the `filename` corpus expects `"12\n"`?**
- **Decision**: Use the engine's existing `--cases-file` (`runProbeSpec({ cases })`) with a committed, label-shaped cases file `tests/fixtures/shell-fn/gh-labels.cases.json`. The test's green row and the documented finalise command both read that one file, so the CLI evidence and the CI row are the same run.
- **Impact**: Success criterion 1 becomes achievable as written; the Integration Tests command and Phase 4 evidence step name the cases file; `--sink filename` stays (it selects the materialised fixture directory the runner needs).

**Q2: What must the fake `gh` print for `label list`?**
- **Decision**: Honour `-q`/`--jq` — one name per line when present (that is what `gh-labels.sh` calls), JSON array otherwise.
- **Impact**: Phase 1 bullet corrected; the test asserts both shapes.

### Question Point 3: Completeness & Safety

**Q3: Is the rc-file isolation claimed in Risk 1 real today?**
- **Decision**: No — the `shell:` arm spawns `<shell> -c 'bash "$1" "$2"'` with `HOME=<sandbox>/home` and `sandboxEnv()`; that sandbox `HOME` is the actual isolation. The new arm inherits it **and** adds `--noprofile --norc` (bash) / `-f` (zsh) as a Phase 2 deliverable.
- **Impact**: Risk 1 mitigation restated truthfully; Phase 2 gains the explicit no-rc bullet.

---

## 1. Template Structure Compliance

**Status:** PASS

### Issues

#### Critical
- None.

#### Important
- None.

#### Optional
- **O2** Phase 1 `**Files**` line omitted `tests/fixtures/shell-fn/syntax-error.sh`, which its own bullets and § 7 both name. Added.

Checks run: all 11 mandatory sections present; filename `task.136.shell-fn-probe-entry-form.md` ✓; frontmatter `type: task`, `description`, `tags` (list), `updated` ✓; no placeholders; Change Log present with one row, consistent with `planned`; `github_issue: 448` exists (OPEN), body link `[#448](…/issues/448)` matches; board Priority self-heal → P1 (already set); card preflight `--check-card` exit 0 (Summary +6, Success Criteria +2, Breaking Changes +2 omitted → `+N more` links). `sign-off` not configured — not checked.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (two inaccurate claims about existing code, no invented symbols)

### Issues

#### Critical (Hallucinations)
- None.

#### Important
- **I1 — Fake `gh` output shape**: Phase 1 said `label list` "prints the fixture label set as JSON when `--json name` is passed". `gh_labels_filter` (`shared/resources/gh-labels.sh:60`) calls `gh label list --json name -L "$GH_LABELS_LIST_LIMIT" -q '.[].name'`; with `-q`, real `gh` prints one name per line. A JSON-printing fake gives `grep -qxF` lines like `"priority:high",` — no exact match — so every candidate is dropped and the green row scores `absent`.
  - **Location:** § 6 Phase 1, first bullet
  - **Recommendation:** fake honours `-q`/`--jq` (one per line), JSON otherwise — applied.
- **I2 — Risk 1 mitigation misstates the existing arm**: "`--noprofile --norc` (bash) and `-f` (zsh) are already how the `shell:` arm spawns" is false. `runShellCase` (`security-probe.mjs:~905`) spawns `<shell> -c 'bash "$1" "$2"'`; rc isolation comes from `HOME: sandboxHome` + `sandboxEnv()`.
  - **Location:** § 10 Medium Risk 1; § 6 Phase 2
  - **Recommendation:** state the true mechanism; make the no-rc flags an explicit Phase 2 deliverable of the new arm — applied.

#### Optional
- **O1** Phase 3 named `evals/shared/tests/transition-protocol-parity.test.mjs` as the test pinning the entry-form sentence. The pins are in `shared/resources/tests/probe-boundary-signals.test.mjs` ("every site that names the JS entry form also names the shell entry form"; "route non-JS to `shell:`"). Corrected.

Verified as accurate: `resolveEntry` two-branch shape and the `shell:`+`#` error text; `SHELL_PREFIX` export; `runProbeSpec` third-arm dispatch point (`resolved.kind === "shell"` at :562); `probeShells()` memoised bash/zsh; `LC_ALL: "C"`, per-case `timeout`, `maxBuffer`; `MATERIALISED_SINKS.filename` controls; `--cases-file` exists on `main`; `gh-labels.sh` declares bash-3.2/zsh portability and uses nothing zsh-hostile (`local`, `case`, `printf`, `tr`, `grep -qxF`); `qa-gate-security-evidence.md` — the § 5 `grep` guidance stands. No `file:line` anchors in the document to drift.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

### Issues

#### Critical
- None.

#### Important
- None.

Four phases, each with risk, files and checkboxed deliverables; dependencies implicit but linear (fixtures → engine → prose → bundle). `estimated_effort_hours: 8` against 8 success criteria, ~16 plan items, medium risk — within rubric range. The co-located plan file `task.136.plan.shell-fn-probe-entry-form.md` exists.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Critical
- **C1 — The documented evidence command cannot produce `engages`**: § 8 Integration Tests and § 6 Phase 4 run `--sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --fake-gh tests/fixtures/fake-gh` and expect `engages`. Without `--cases-file`, `runProbeSpec` takes `corpusFor("filename")`, whose every `expected` is `{ stdout: "12\n", exit: 0, stderr: "" }` — the print-the-highest-gate shape. A label filter never prints `12`, so all cases mismatch and the verdict is `absent` with `escaped 0`: the task.125 result, reproduced by the fix. § 10 Risk 2 already says the test derives `expected` from the label set, but the CLI command and Success Criterion 1 did not carry that.
  - **Recommendation:** one committed cases file, read by both the test and the command — applied (see Q1).

#### Important
- None.

#### Optional
- **O3** § 7 Files Summary gains `tests/fixtures/shell-fn/gh-labels.cases.json`. Applied.

Testing Strategy covers every new branch; rollback covers all phases; success criteria measurable. Scope is one task (4 phases, one engine file, one test file, three fixtures, four prose files).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after I2)

### Issues

#### Critical
- None.

#### Important
- I2 (above) — the Risk 1 mitigation was the one inaccurate claim; corrected.

Rollback triggers and per-phase steps are specific and testable; the additive design makes the immediate rollback a single-commit revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue

1. **C1** — Add `tests/fixtures/shell-fn/gh-labels.cases.json`; the green row, the Integration Tests command, Phase 4 evidence and Success Criterion 1 all name it. ✅ applied

### Should Fix (Important) - 2 issues

1. **I1** — Fake `gh label list` honours `-q`/`--jq` (one name per line), JSON otherwise. ✅ applied
2. **I2** — Risk 1 restated: sandbox `HOME` is today's isolation; no-rc flags are a Phase 2 deliverable. ✅ applied

### Consider (Optional) - 3 items

1. **O1** — Pin lives in `probe-boundary-signals.test.mjs`. ✅ applied
2. **O2** — Phase 1 Files names `syntax-error.sh`. ✅ applied
3. **O3** — Files Summary names the cases file. ✅ applied

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes)

**Scoring Breakdown (as submitted → after fixes):**

- Template Compliance: 10/10 → 10/10
- Technical Accuracy: 7/10 → 9/10
- Implementation Clarity: 8/10 → 9/10
- Consistency: 5/10 → 9/10
- Risk Management: 8/10 → 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** With the cases file the green row and the evidence command are one run and `engages` is reachable; the two inaccurate claims are corrected at their source; nothing else in the document diverges from the engine it extends.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the implementation plan phase by phase (fixtures and red rows first — every new row must be red before Phase 2)
2. Check off progress tracking checkboxes
3. Run `command node --test shared/resources/tests/security-probe.test.mjs` and `npm run ci:fast` after each phase
4. Record both mutation proofs and the live `gh-labels.sh` probe record in the implementation report

---

## Review Metadata

- **Reviewer:** Claude (review-task, invoked by develop-task under develop-next)
- **Review Date:** 2026-09-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.136.shell-fn-probe-entry-form/task.136.shell-fn-probe-entry-form.md
- **Architecture Docs Consulted:** docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md (pre-pass B: aligned)
- **Pre-pass:** Agent B `alignment: aligned`; Agent C `implementation_status: not-implemented` (SHELL_FN_PREFIX, --fake-gh, fixtures, exit 97 all absent)
- **Review Duration:** ~10 minutes
