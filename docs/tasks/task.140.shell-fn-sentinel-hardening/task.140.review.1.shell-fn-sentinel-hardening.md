# Task Review Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage

**Reviewed:** 2026-09-30
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-09-30

---

## Executive Summary

The task and plan are accurate against the live code: every function, constant, line shape and file they name exists as described, and the plan's core claim — the shadowed-`exit` body with a simple-command source status — was **executed** here under bash 5.3, bash 3.2 and zsh 5.9 and holds. One plan snippet is falsified (the lint-lane shebang test can never match, so the fixture would stay outside both lanes), and three details needed tightening (the source-follow resolution base, a containment check that reintroduces the task.158 bug, and figures that had decayed since authoring).

**Critical Issues:** 1 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 1 question, auto-answered (autonomous develop-next run — recommended option taken and logged)
**Implementation Readiness:** 9/10 (after fixes; 7/10 before)
**Recommendation:** READY TO IMPLEMENT (after the Step 8.5 fixes below; the pre-fix rubric reading was REQUIRES REWORK on the single Critical, which is a one-token plan correction)

---

## User Decisions & Clarifications

This review ran inside an autonomous `/develop-next` → `/develop-task` pipeline. No prompt was shown; each question was answered with the recommended option and recorded here.

### Question Point 2: Technical & Implementation

**Q1: The task says a sourced path is resolved "against the library's directory then the root"; the plan's `namesGh` resolves against the library's directory only. Which rule?**
- **Decision (auto, recommended)**: library's directory first, then the repository root — the task's text.
- **Impact**: the one indirection this repository actually uses is written `source references/gh-labels.sh` in SKILL.md prose (cwd-relative, cwd = a root), not relative to any library file (`git grep -nE '^\s*(source|\.)\s+[^ ]*gh-labels\.sh' -- ':!skills/*/references/*'` → no hit in a tracked shell library). A library-directory-only rule would follow the test's contrived `../../../` path and miss the idiom the task names as its motivation. The plan code and its Phase 1 row are amended to cover both.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Progress Tracking, References, Notes present. No placeholders.
- OKF: `type: task`, `description`, `tags` list present.
- Sign-off: not configured (`sign-off` absent from `skills-config.yaml`) — not checked.
- Change Log (check 4b, default advisory): present, two rows, consistent with `status: planned`.
- Tracker: `github_issue: 464` (OPEN, labels `task`, `priority:high`); body link `[#464](…/issues/464)` matches. Board Priority self-healed: `set-github-project-priority.sh 464` → "Priority set to P1".
- Card preflight: `sync-jira-task.js --check-card` exit 0 — Summary, Success Criteria, Breaking Changes resolve (4 / 2 / 2 omitted behind "+N more").
- Doc links: `doc-links.js` exit 0 on both the task and the plan.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (1 Critical, 2 Important)
**Hallucinations Detected:** 0

Verified against the tree at `1dce6511`: `SHELL_FN_BODY` (`security-probe.mjs:569`), `GH_COMMAND_WORD` (`:540`), the dead `!isShellFn &&` (`:374`), the `kind === "shell-fn" && fakeGhDir === null` gate (`:937`), lexical `resolveEntry` containment via `isWithin` (`:437`), `fakeGhDir` passed to `runShellCase` for both shell forms (`:1008-1013` — so the `shell:` row's "with `--fake-gh` it runs and is scored" is reachable), and the twin lint lanes' `git ls-files '*.sh' | grep -v '^skills/[^/]*/references/'` (`scripts/lint-shell.sh:38`, `shellcheck.yml:85`). `shellcheck.yml` is deliberately not path-filtered (check 8 — no trigger gap).

Architecture pre-pass: run inline (no Explore subagents dispatched — they hung three times in an earlier session in this repo; independence loss recorded). The change stays inside one engine, one test file and two lint lanes; no axis of `tech-stack.md` / `coding-standards.md` is touched.

### Critical

- **C1 — Falsified invariant (check 11): the plan's lint-lane shebang test never matches.** Plan Phase 3 selects `[ "$(head -c 21 "$f")" = "#!/usr/bin/env bash" ]`. The string is 19 bytes; 21 bytes include the newline and the next line's first byte, and command substitution strips only trailing newlines.
  - **Evidence:** `f=tests/fixtures/fake-gh/gh; [ "$(head -c 21 "$f")" = "#!/usr/bin/env bash" ] && echo match || echo NOMATCH` → `NOMATCH`; the same with `head -n 1` → `match`.
  - **Impact:** the lanes would stay blind to the fixture while the count line and the red-lane proof are the only signals — exactly the gap the task exists to close.
  - **Fix (applied):** compare the whole first line, `[ "$(head -n 1 "$f")" = "#!/usr/bin/env bash" ]`; the task's Phase 3 bullet now says so.

### Important

- **I1 — Source-follow resolution base disagrees between task and plan** (Q1 above). **Fix (applied):** plan `namesGh` tries `dirname(entryPath)` then `root`; Phase 1 gains a root-relative sub-assertion (`source shared/resources/gh-labels.sh`).
- **I2 — The plan's containment check reintroduces the task.158 bug.** `namesGh` skips a path with `relative(root, p).startsWith("..")`; `resolveEntry` already replaced that exact test with `isWithin(root, p)` because an in-tree `..name` directory is inside, not an escape (`security-probe.mjs:435-437`). **Fix (applied):** plan uses `isWithin(root, p)` — the file's own helper, imported from `qa-execute-snippets.mjs`.

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fixes)

Four phases, each with files, concrete changes and checkboxes; the plan reproduces the verified bodies verbatim. Mutation proofs named per change.

**Invariant executed (check 11) — the plan's central claim holds.** Harness body OLD (live) vs NEW (plan), each run as `sh -c "$BODY" harness <lib> f`:

| Shell | Body | own EXIT trap + `\|\| exit 1` | `set -e; false` | last cmd non-zero | top-level `exit 3` | clean | `set -e` + `return 97` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bash 5.3.9 | OLD | 1 | 0 | 97 | 97 | 0 | 99 |
| bash 5.3.9 | NEW | **97** | **97** | 97 | 97 | 0 | 99 |
| bash 3.2.57 | OLD | 1 | 97 | 97 | 97 | 0 | 99 |
| bash 3.2.57 | NEW | **97** | 97 | 97 | 97 | 0 | 99 |
| zsh 5.9 | OLD | 1 | 0 | 97 | 97 | 0 | 99 |
| zsh 5.9 | NEW | **97** | **97** | 97 | 97 | 0 | 99 |

Both Phase 1 rows are red today on bash 5 and zsh and green under the new body; the clean and collision cases are unchanged. (bash 3.2 already declines the errexit shape — the row is still red on the other two shells the engine runs.)

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (1 Important)

- **I3 — Figures decayed since authoring (check 7).** "66 existing rows" appears four times, including a success criterion; the tree now holds **100** `test(` calls (`grep -cE '^\s*test\(' shared/resources/tests/security-probe.test.mjs`) — task.131 and others landed since 2026-09-22. The plan's "linting 75 source shell scripts" is now 77 (`git ls-files '*.sh' | grep -v '^skills/[^/]*/references/' | wc -l`). **Fix (applied):** the task and plan now state the definition and command ("every pre-existing row", "the branch point's count plus exactly one") and leave the number to the run.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk 2 (realpath refusing a symlinked install) is the real one and the task already offers the stated-limit alternative with a trigger. In this repository `.agents/skills → ../skills` resolves inside the root, so the realpath option does not refuse any in-tree entry spelled through `.agents/`. Rollback triggers and partial rollback are specific.

---

## Summary of Recommendations

### Must Fix (Critical) — 1 issue

1. C1 — `head -n 1`, not `head -c 21` (applied).

### Should Fix (Important) — 3 issues

1. I1 — library dir, then root (applied).
2. I2 — `isWithin`, not `startsWith("..")` (applied).
3. I3 — definitions and commands, not decayed counts (applied).

### Consider (Optional) — 3 items

1. **O1** — Notes still say task.131 is planned ("land one, rebase the other"); it merged in PR #526 and this branch is cut on top of it. Updated in the Notes (applied — no cost).
2. **O2** — "the two existing `symlink-escape` cases in the QA wrapper corpus flip" refers to hand-probe case files under `.claude/state/` (untracked); no tracked row pins them today, so the new `resolveEntry` row is the only durable pin. Worth one sentence in the implementation report when it lands.
3. **O3** — `realpathSafe` falls back to the lexical path when the leaf does not exist, so `link-to-outside/missing` stays "inside" until the readable-file check refuses it. The task accepts this residual explicitly; realpath'ing the nearest existing ancestor would close it for free if the implementer wants to.

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (one falsified snippet, fixed)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The central behavioural claim was executed and holds on all three shells; the one falsified snippet and the three detail issues are corrected in the documents, so nothing the developer executes is known to be wrong.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase: red rows first, then the body and gates, then the lint lanes, then rule/bundle/CHANGELOG; mutation-prove each change and re-run the task.136 green-path evidence command.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous develop-next run)
- **Review Date:** 2026-09-30
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.shell-fn-sentinel-hardening.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (always-load set)
- **Pre-pass:** inline (Agents B/C not dispatched) — independence loss recorded
