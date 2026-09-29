# Task Review Report: Task 144 - security-probe: a `cli:` entry form

**Reviewed:** 2026-09-23
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 critical + important recommendations implemented — 2026-09-23

---

## Executive Summary

The task is well-motivated and its shape (a fourth entry form reusing the case loop, `computeVerdict`
and the record writer) matches how `shell:` and `shell-fn:` were added. The review found one factual
error about the record format, and six places where the design was underspecified against the engine
as it stands. One of them — the record's control key — would have made two probes of one CLI silently
overwrite each other. All seven are fixed in the task document and plan; nothing blocks development.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 6 ⚠️ (fixed)
**Optional Improvements:** 2 💡

**User Clarifications:** 5 questions, auto-answered from the codebase (pipeline autonomous mode — develop-next → develop-task Step 2)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run under the develop-task pipeline's autonomous mode. No question was put to a human; each was
answered from the code, and the answer is recorded here so it can be disputed.

### Question Point 1: Structure & Scope

**Q1: Is stdin-reading-CLI detection in scope?** §3 Target Architecture lists it as a decline
"detected by … the engine's stdin-read marker — or stated as out of scope", and §3 Clarifications says
it stays declined because detection "is its own problem".
- **Auto-answer**: Out of scope, and not detected. stdin is empty, as in the shell arm.
- **Impact**: the decline bullet no longer names a detector that does not exist.

### Question Point 2: Technical & Implementation

**Q2: Does the record carry a `kind` field?** §5 says a `cli:` record "carries `kind: "cli"`, a new
value in an existing field".
- **Auto-answer**: No. `toRecordEntry` (`security-probe.mjs`) writes `sink`, `entry`, `name`,
  `call_site`, the verdict and counts, `shells`, `fake_gh` and `ran_at` — no `kind`. `kind` exists only
  on `resolveEntry`'s internal return value. The `entry` string's prefix already names the form, so no
  `kind` is added; the record gains `argv` (template or `null`).
- **Impact**: Breaking Changes and Phase 2 corrected.

**Q3: What keys a `cli:` control in the record?** `controlKey` is `sink + "\0" + entry`, and it names
the entry file and drives the fold's dedupe.
- **Auto-answer**: the template joins the key for `cli:` entries only. Probing `uat-status.mjs` for
  `--env {input}` and again for `--clear-note {input}` under one sink would otherwise produce one
  entry — the second run silently replacing the first. Other forms' keys stay byte-identical, so no
  existing entry file is renamed.
- **Impact**: new Phase 2 checkbox, success criterion and test.

**Q4: Where do the fixture and the env come from?** The plan sketched
`mkdtempSync(join(tmpdir(), "probe-cli-"))` and a bare `sandboxEnv()`.
- **Auto-answer**: the shell arm's. `runShellCase` makes the fixture inside `workDir` (inside the
  sandbox root, so the escape sentinel sees a sibling write), sets `HOME`/`TMPDIR` inside the sandbox
  root and `LC_ALL=C`, and snapshots the script's own directory. A fixture in `tmpdir()` is outside the
  sentinel's view, and a bare env hands a Node CLI the reader's real `os.homedir()` and `os.tmpdir()`.
  `sandboxEnv` also takes `{ cwd }`.
- **Impact**: §3 Run bullet, Phase 2 and the plan snippet rewritten; the env construction joins the
  materialisation in the helpers factored out of `runShellCase`.

### Question Point 3: Completeness & Safety

**Q5: Is every malformed combination exit 2?** §9 said "every malformed `--argv` / entry combination
exits 2 … and writes no record", and §8 listed "a path outside `--repo-root`" among those refusals.
- **Auto-answer**: No. In this engine an entry that fails containment is a **decline**
  (`outside-repo-root`, `unverifiable`, exit 1, and a record is written) for every form, and so is a
  bad `--fake-gh`. `--argv` shape errors are argument errors and exit 2 in `main` before any record
  write; `runProbeSpec`, which `task.81` calls directly, returns the decline `bad-argv` from the same
  validator. Making containment exit 2 for one form only would be a breaking change the task does not
  claim.
- **Impact**: §3, §8, §9 and Phase 1 state the split.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections plus Change Log, Progress Tracking and References are present; no
  placeholders.
- OKF frontmatter: `type: task`, `description`, `tags` present.
- Sign-off: not enabled in `skills-config.yaml` — not checked.
- Change Log present and current; a review row and a status row were added by this review.
- Tracker: `github_issue: 470` exists (OPEN); the body link matches.
- Card preflight: 3 card blocks resolve (Summary +3, Success Criteria +6, Breaking Changes +2 omitted
  behind `+N more` links — information, not a defect).
- `doc-links`: 3 relative links resolve.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed). **Hallucinations Detected:** 1

#### Critical (Hallucination)
- **C1 — Record `kind` field**: §5 claimed an existing `kind` field on record entries. There is none
  (see Q2). Fixed.

#### Important
- **I2 — Fixture/env outside the sandbox** (Q4). Fixed.
- **I4 — Scoring with `expected` underspecified**: "when the case carries `expected`, `compareExpected`
  is applied" did not say how the comparison becomes an outcome. It is now stated: `expectedProblem`
  first (a malformed `expected` is declined, never scored), then the shell arm's `direction` mapping;
  exit status is used only when `expected` is absent. Fixed.

Verified as accurate: `SHELL_PREFIX`, `SHELL_FN_PREFIX`, `resolveEntry`'s containment, the
`--fake-gh` "shell entry forms only" decline, `MATERIALISED_SINKS` (only `filename` is materialised,
which is why Phase 3's `path` run needs `--cases-file`), `probe-boundary-rule.md` §2 / §5 / §5.1
("a multi-argument CLI", line 248), the qa-task (~483) and qa-story (~991) Step 3b anchors, the two
prompts' `shell-fn:` lines, and the `task.80 parity: no interpreter is on the snippet allow-list` test.
`uat-status.mjs` takes `--root`, `--run-path` and `--env`; its refusals go through `die(msg, code)`,
which throws and sets a non-zero `process.exitCode`, so it honours the exit-status contract.

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

- **I1 — Record control key** (Q3). Fixed.
- **I5 — Exit 2 vs decline** (Q5). Fixed.
- **I6 — Phase 3's expected verdict was left open.** Today `runPathFor` refuses only a `-NN` suffix, so
  `x-02` is rejected and `../x`, `a/b` are accepted — the predicted current verdict is
  `present-but-inert`. The task now says so, says to measure it rather than assume it, and says
  `--root` is the prepared registry (not `{fixture}`) because `path` is not materialised. Fixed.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **I3 — stdin contradiction** between Target Architecture and Clarifications (Q1). Fixed.
- Testing Strategy now covers the record key, the template-not-input rule and `expected` scoring.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The high risk — the form as a general Node launcher — is mitigated as stated: `--entry` fixes the
script, containment is checked before spawn, input fills one argv element, no shell. The sandboxing
fix in I2 strengthens that mitigation. Rollback is a revert of an additive arm.

---

## Summary of Recommendations

### Must Fix (Critical) — 1 issue (fixed)
1. C1 — remove the false `kind` claim; add `argv` to record entries.

### Should Fix (Important) — 6 issues (fixed)
1. I1 — `cli:` control key carries the template.
2. I2 — fixture inside `workDir`, sandboxed `HOME`/`TMPDIR`, script-dir snapshot; shared helpers.
3. I3 — stdin-reading CLIs out of scope, not detected.
4. I4 — define scoring with and without `expected`.
5. I5 — `bad-argv` exits 2 in `main`; entry problems stay declines.
6. I6 — Phase 3's predicted verdict and `--root` choice stated.

### Consider (Optional) — 2 items
1. O1 — `uat-status.mjs --run-path` creates `runs/D.1/` under `--root` even on success; the prepared
   registry is test-owned, so this is not an escape, but a comment in the test saying so would stop a
   later reader reading it as one.
2. O2 — the corpus's `path` sink describes filesystem paths, and `--env` takes a label; the Phase 3
   `--cases-file` is the right call, and naming the sink `path` is a label only.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (one false claim, fixed)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — every critical and important finding was a document
fix answerable from the code, and all are applied.

---

## Next Steps

1. Phase 1 → 4 in order; factor the materialisation and env helpers out of `runShellCase` before
   `runCliCase` calls them.
2. Mutation-prove each new test (the plan lists the mutations; add "drop the template from the
   control key" and "fixture in `tmpdir()`").

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2, autonomous)
- **Review Date:** 2026-09-23
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.144.probe-engine-cli-entry-form/task.144.probe-engine-cli-entry-form.md`
- **Architecture Docs Consulted:** `shared/resources/probe-boundary-rule.md`, `shared/resources/security-probe.mjs`, `shared/resources/security-input-corpus.mjs`, `skills/qa-next/scripts/uat-status.mjs`
- **Pre-pass:** run inline — Agents B and C not dispatched (the engine had to be read in full to check the task's claims anyway). **Independence loss recorded**: the architecture-alignment and already-implemented passes were done by the reviewer, not by separate agents. Already-implemented check: no `cli:` / `CLI_PREFIX` / `--argv` exists in the engine.
