# Task Review Report: Task 181 - security-probe: a shell-argv: entry form

**Reviewed:** 2026-10-12
**reviewed_blob:** 9157552f82962677e38874c4e2d4b83f827f038e
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 7 critical + important recommendations implemented — 2026-10-12

---

## Executive Summary

The task is well-scoped and mirrors the `cli:` form sensibly, but it was written before task.180 landed and before its run shape was checked against `shell:`'s. Its zsh arm would have interpreted a bash script under zsh, its engine-site list named two of ~14 form-dispatch sites, and three decisions (`gh`, case `fixture`, `--fixture-setup` on other forms) were left open. All are fixed in the document.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 0 questions asked — autonomous `/develop-task` run (via `/develop-next`); each question point resolved with the option consistent with the document's own stated intent and the engine's existing precedent, recorded below.
**Implementation Readiness:** 8/10 (after fixes)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous run — no operator present. Each decision is the resolution the document or the engine already implied:

- **QP1 (structure/scope):** none needed — template compliant, card preflight clean, links resolve.
- **QP2 (zsh arm):** shell is the caller, bash the interpreter — `shell:`'s documented precedent (`security-probe.mjs:813–816`).
- **QP2 (`gh`):** `shell-argv:` takes the shell forms' `gh` handling — it is a bash script on PATH, the case those guards exist for.
- **QP3 (case `fixture`):** honoured as `fence:` honours it, written before the setup — the document already committed to this "if task.180 lands first", and it has.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; `type: task`, `description`, `tags` present (OKF conformant). No placeholders.
- Change Log present; currency checked (1.0 Initial draft, status `planned` — current). Sign-off not enabled in `skills-config.yaml`.
- Tracker: `github_issue: 564` (OPEN); body link `[#564](…/issues/564)` matches.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve; Breaking Changes `+2 more` (information only).
- `doc-links.js`: 3 relative links resolve.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0 — every named function and constant exists; anchors had drifted.

PREPASS_B / PREPASS_C: not dispatched — review performed inline (the claims are engine-local and were verified by reading `security-probe.mjs` directly). Independence loss recorded.

#### Critical

- **C1 — the zsh arm interprets a bash script under zsh.** Target Architecture said `<shell> <path> ...argv`. `shell:` runs `<shell> -c 'bash "$1" "$2"' …` — the zsh arm is a *caller* of a bash script, because the shebang fixes the interpreter (`probeShells` header, `:813–816`; spawn in `runShellCase`). Run as written, a zsh parse failure on a bash construct would score `rejected` — "could not look" read as "refused", the defect class this engine exists to remove. **Fixed:** `<shell> -c 'bash "$@"' <shell> <path> ...argv`, plus a Phase 1 test with a bash-only construct.

#### Important

- **I1 — engine site list carried no search (check 20).** The document named the two `bad-argv` sites and the case-loop dispatch. `grep -n 'isShellForm\|isCliForm\|isFenceForm\|_PREFIX)' shared/resources/security-probe.mjs` returns 31 hits across ~14 sites. One silent hole: `main()`'s `--args-json` refusal tests `startsWith(SHELL_PREFIX)`, and `"shell-argv:"` does not start with `"shell:"`, so `--args-json` would be accepted with `shell-argv:`. **Fixed:** a form-dispatch table in § 3 with a disposition per site, and the grep that defines it.
- **I2 — `gh` handling undecided.** The shell forms decline a script naming `gh` without `--fake-gh`, install a trip-wire and accept `--fake-gh`; `cli:` refuses `--fake-gh`. The task was silent. **Fixed:** `shell-argv:` joins the shell forms; the `needs-fake-gh` check covers the setup script too.
- **I3 — removed literal pinned by tests (check 15).** The `bad-argv` text changes from "applies to the cli: entry form only"; `git grep -n 'entry form only' -- '*.test.*'` finds three assertions pinning `/cli: entry form only/` (`security-probe.test.mjs:2420`, `:2421`, `:2465`). **Fixed:** listed in Phase 2 and Files Summary.
- **I4 — case `fixture` left conditional on task.180.** task.180 has landed; `fixture` is today read only by `fence:` (`security-input-corpus.mjs:67`). **Fixed:** honoured as `fence:` honours it, written before the setup; the corpus comment joins Files Summary.
- **I5 — `--fixture-setup` on other forms unspecified.** **Fixed:** exit 2 `bad-fixture-setup`, as `--slot` outside `fence:`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

- Phases are concrete; the plan file is detailed. Plan anchors re-measured.
- Effort 8h vs rubric (≈9 criteria, 3 phases, Medium) — within 2×; no finding.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **I6 — a behaviour criterion with no planned per-PR test (Step 6 check 4).** "The recorded run … has `totals.executed > 0`, and no case stops at the usage line" needs code to run; the plan sent the record to scratch and the PR description, so nothing per-PR held it. **Fixed:** an integration test in `security-probe.test.mjs` runs the proof command and asserts the totals; the record is cited in the DoD.

#### Optional

- **O1** — "No change to the run time of existing forms' suites" stated no bound; rephrased as "no existing test changes, except the three pinned-text assertions".
- **O2** — every line anchor had drifted after task.180 (`:371`→`:426`, `:485`→`:563`, `:505`→`:585`, `:738`→`:820`, `:973`→`:1075–1090`, `:2490`→`:3222–3240`, `:1538`→`:1735`, `:1784`→`:1981`, `:1474`→`:1671`, `:1491`→`:1688`, `:2384`→`:3124`; rule `:419`→`:495`; signals `:58`→`:59`). Re-measured in task and plan.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE (after fixes)

- **O3** — Risks 2 (proof target not on develop) and 3 (shared file with task.180) were obsolete — both tasks merged. Replaced with the two live risks: an unextended dispatch site, and the zsh arm.
- **O4** — the setup script runs with the sandbox `HOME` (no git identity); stated: commit with `git -c user.name=… -c user.email=…`.
- **O5** — prefix check order is not load-bearing (`shell-argv:` / `shell:` / `shell-fn:` disjoint at byte 5–6); stated so a reader does not preserve an order for a reason that does not exist.
- Rollback plan unchanged and adequate (revert + bundle).

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue — applied
1. C1 zsh arm caller-only.

### Should Fix (Important) - 6 issues — applied
1. I1 form-dispatch table with its grep. 2. I2 `gh` handling. 3. I3 pinned-text tests. 4. I4 case `fixture`. 5. I5 `--fixture-setup` scoping. 6. I6 proof run held by a test.

### Consider (Optional) - 5 items — applied
O1–O5 above.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No hallucinations; the critical and important findings were design gaps with clear resolutions in the engine's own precedent, and all are applied.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2)
- **Review Date:** 2026-10-12
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.181.probe-engine-shell-argv-entry-form/task.181.probe-engine-shell-argv-entry-form.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load); `shared/resources/security-probe.mjs`, `probe-boundary-signals.mjs`, `security-input-corpus.mjs`, `scripts/lint-shell.sh`
