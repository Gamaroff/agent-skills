# Task Review Report: Task 182 - reenter-qa refusal diagnostics and the qa_reentry reader population

**Reviewed:** 2026-10-13
**reviewed_blob:** 1a6e3a3a04be1e9e45d7d2bcabe3802c1540ed96
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-10-13

---

## Executive Summary

The task is accurate: every line anchor it cites resolves, the three `qa-cycle.sh` messages exist with the stated prefix, and the stderr-capture design holds when run. Three Important findings concern wording that would fail later — the hooks-doc writer list is wrong for `qa_phase` and `extra_cycles_granted`, one performance criterion is false under the plan's own code, and a macOS-only check sits in a plan run on Linux.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked (autonomous run — develop-task Step 2; every decision below is the reviewer's and is recorded)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` Step 2 under `/develop-next` (autonomous). No question was put to a user. Output format: Comprehensive report (pipeline default). Step 8.5: apply all critical + important fixes (pipeline default); the Optional items were applied too, as each is a one-line edit with no judgement to defer.

Pre-pass agents B and C were **not dispatched**: the review ran inline (the Explore subagents have hung in earlier sessions in this repository). The architecture and codebase passes were done by the reviewer directly, so they are not independent of the rest of this review.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. No placeholders.
- OKF: `type: task`, `description` and `tags` present.
- Sign-off: not enabled in `skills-config.yaml` — not checked.
- Change Log: present, current for `planned`.
- Tracker: `github_issue: 565` exists (OPEN), body link `[#565]` matches; board Priority self-heal ran (P2).
- Card preflight: `sync-jira-task.js --check-card` → 3 card blocks resolve (exit 0).
- Relative links: `doc-links.js` → 4 links resolve.

---

## 2. Technical Accuracy

**Status:** ACCURATE (two wording issues)
**Hallucinations Detected:** 0

Verified:

- `reenter-qa-after-finalise.sh:161-162` (the two `qa-cycle.sh` calls with `2>/dev/null`), `:164` (`refuse no-gate`), `:169` (`DIRTY=$(git status …)`), `:121-126` (the `no-snapshot` stderr pattern) — all resolve.
- `qa-cycle.sh:100` (`carry no cycle number`), `:102` (`no gate file in`), `:125` (`claim cycle`) — all resolve; prefix is `⚠️  qa-cycle:` (two spaces), as the plan's `sed` assumes.
- The script runs `set -uo pipefail` (no `-e`), so `DIRTY=$(git status …) || refuse …` behaves as planned.
- No other `git status` call precedes line 169 in the script, `advance-pipeline-lock.sh`, `qa-cycle.sh` or `newest-numbered.sh`, so a stub failing only on `status` reaches line 169 with every earlier check passed.
- Hooks doc `:86` and detector prompt `:115-117` match the description. `git grep -c qa_reentry` → 0 in both.
- `qa_reentry`'s shape, from the writer (`reenter-qa-after-finalise.sh:220`): `{from_step, reason, at, gate_head, report_entries}`.
- Runner reach (check 18): `reenter-qa-after-finalise.test.sh` is listed by name in `package.json`'s `test` script; both parity tests sit under `evals/shared/tests/*.test.mjs`, which the script globs.

**Invariant run (check 11).** The plan's `sort -u` dedupe, run on the three fixtures:

```
no gate      : --path gate → "no gate file in …" (rc 1); plain → same line (rc 1)      → sort -u: 1 line
unnumbered   : --path gate → "1 gate file(s) … carry no cycle number" (rc 1); plain → same (rc 1) → 1 line
two, cycle 3 : --path gate → "2 gate files claim cycle 3 …" (rc 1); plain → "3" (rc 0)    → 1 line
```

The design holds: each cause yields exactly one reason line.

### Important

- **I-1 — The hooks-doc writer list is wrong for two of the three fields.** Phase 3 says "`qa_max_cycles` / `qa_phase` have two writers (`grant-qa-cycles.sh` and `reenter-qa-after-finalise.sh`)". Measured: `qa_phase` has three writers — `set-qa-phase.sh` (every sub-step inside the loop) plus both re-entry scripts. `extra_cycles_granted` has one — `grant-qa-cycles.sh`; `reenter-qa-after-finalise.sh:216-220` writes `current_step`, `qa_phase`, `qa_max_cycles` and `qa_reentry`, never `extra_cycles_granted`. Writing the plan's sentence into the hooks doc would replace one inaccuracy with another. **Fix:** state each field's writers exactly, and pin the hooks doc's naming of `reenter-qa-after-finalise.sh` in the parity test so the success criterion "names both writers" has a test.

### Optional

- **O-1 — Drifted anchor.** §2 cites `develop-pipeline-resume-contract.md:632` for the `no-gate` route; the refusal list now sits at `:693-705`. Corrected.
- **O-2 — Detector line drops two fields.** Target Architecture says the detector reports `{from_step, reason, gate_head}`; Phase 3's concern string carries only `from_step` and `gate_head`, and neither carries `report_entries`, which is the field the resume contract's Second precedence reads. Aligned on all four.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases name files, changes and order (tests first). Same-class inventory (check 6): the new stderr capture reuses the `no-snapshot` pattern rather than adding a mechanism. Population command recorded (check 20). Effort 4h is consistent with the rubric (9 criteria, 3 phases, low risk).

- **O-3 — Population count is stale by design.** §3 records 21 paths for `qa_max_cycles|extra_cycles_granted` on 2026-10-04. The full four-token command returns **32** on 2026-10-13 (task.181 added `shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh`). Phase 3 re-measures, so this is information; noted in §3.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I-2 — A performance criterion is false under the plan's own code (checks 4 and 10).** "The accept path makes no extra calls" — the plan's Phase 2 block creates `GATE_ERR=$(mktemp)` and runs `sort -u` / `rm` unconditionally, so every run that reaches the gate read, the accept path included, gains three calls. And "No measurable change" / "runtime within its current order of magnitude" state no numeric bound and name no test, so finalise has nothing to pass them on. **Fix:** restate as one documentation criterion — the only additions are one `mktemp`, one `sort` and one `rm` at the gate read, and nothing else on the accept path — with the suite runtime recorded as information.
- **I-3 — A criterion needs a platform this host and CI lack (check 4, obs #279).** Consumer Tests asks for a run "under `/bin/bash` 3.2 on macOS". This host is Linux, and CI is `ubuntu-latest`. task.185/186 halted at finalise on exactly this shape. **Fix:** scope it to the constructs bash 3.2 rejects (no unparenthesised `case` pattern inside `$(…)`, no `mapfile`, no `${v,,}`), checked by reading the diff, and record a macOS run as not available.

### Optional

- **O-4 — A consumer test the plan does not name.** `shared/resources/tests/security-probe.test.mjs` (task.181's shell-argv proof run, fixture `shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh`) runs this script end to end under hostile directory names. It is in `npm test`, so `ci:fast` covers it — named under Consumer Tests so a red there is recognised as this change's.

Control case (check 2): the three `no-gate` causes plus the unchanged accept cases form the control the git-unreadable and stderr cases need. Post-merge criteria: none. Behaviour fixes land in a `.sh`, not in prose.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk, refusal-path-only changes; rollback names the merge-commit revert and the task.170 baseline count (53). The new refusal is a fail-closed narrowing, not a guard exemption, so no differential oracle is needed.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues

1. I-1: state each lock field's writers exactly in Phase 3; pin `reenter-qa-after-finalise.sh` in the hooks doc via the parity test.
2. I-2: replace the two Performance criteria with one documentation criterion naming the three added calls.
3. I-3: replace the macOS run with a bash-3.2-construct check by reading the diff.

### Consider (Optional) - 4 items

1. O-1: contract anchor `:632` → `:693-705`.
2. O-2: detector concern carries `from_step`, `reason`, `gate_head`, `report_entries`.
3. O-3: population count noted at 32 (2026-10-13).
4. O-4: name `security-probe.test.mjs` under Consumer Tests.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue; the three Important findings are wording fixes applied in this review, and the design was run and holds.

---

## Next Steps

Task is ready for implementation. Follow the phases in order (tests red first), record each mutation proof in the PR.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2, autonomous)
- **Review Date:** 2026-10-13
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load); shared/resources/qa-cycle.sh, reenter-qa-after-finalise.sh, develop-pipeline-hooks.md, pipeline-resume-detector-prompt.md, develop-pipeline-resume-contract.md, develop-pipeline-pause.md, evals/shared/tests/qa-loop-lock-fields-parity.test.mjs
- **Review Duration:** ~15 minutes
