# Task Review Report: Task 174 - Publish the docs-only CI classifier as an optional consumer template

**Reviewed:** 2026-11-02
**reviewed_blob:** 40dbf1362b03a8fc21aaebb69d84be8d843d4b2c
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** NEEDS IMPROVEMENT (as found) → GOOD (after fixes)

> **Implementation Status**: ✅ All 9 critical + important recommendations implemented — 2026-11-02

---

## Executive Summary

The task was written on 2026-10-01 against tinker-city task.127's *planned* design. The code that
merged (PR #984) uses a different evidence lookup: a workflow-runs query keyed by workflow path,
not a `ci-ok` check-runs query. So the task's `AGGREGATE_CHECK` parameter, its permissions, its
tests and one success criterion described a mechanism that does not exist. The structure, scope,
risk and rollback are sound. All critical and important fixes were applied to the task and plan.

**Critical Issues:** 1 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked. Run inside `/develop-task` (autonomous `/develop-next`, `--defaults`); every decision below took the recommended option and is logged.
**Implementation Readiness:** 7/10 as found; 9/10 after fixes
**Recommendation:** NEEDS REVISION as found → **READY TO IMPLEMENT** after the Step 8.5 fixes

---

## User Decisions & Clarifications

No questions were asked: the pipeline runs autonomously. Decisions taken on the recommended option:

- **D1 — Config option (a), env + parity test.** A consumer runner need not have `node`; option (b) would be a second YAML parser. Recorded in task § 3.
- **D2 — Phase 3 ships in this PR.** The success criteria require `code=true` on lookup failure "on both platforms"; splitting Phase 3 out would fail that criterion at finalise. It stays separable for rollback.
- **D3 — Drop the `engine` output.** It is tinker-city task.128's per-lane gate, which § 4 already put out of scope.
- **D4 — Bitbucket `BEFORE` is `HEAD^`.** Bitbucket Pipelines exposes no push `before` SHA. First parent is fail-safe: a multi-commit push whose `HEAD^` never ran finds no evidence and runs in full.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Change Log, Progress Tracking and References present. No placeholders.
- OKF: `type: task`, `description`, `tags` present.
- Sign-off: `sign-off` not configured — not checked. Change Log: enabled (default, advisory) — present and current.
- Tracker: `github_issue: 541` exists (`OPEN`), body link matches; board Priority self-heal ran (P3).
- Card preflight (`sync-jira-task.js --check-card`): exit 0; 3 blocks resolve. `+N more`: Summary 5, Success Criteria 4, Breaking Changes 1 (information, not a defect).

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0 (the inaccuracy below is drift from a design that changed, not invention)

Pre-pass B (`prepass-axes.js` source: `architecture`): `alignment: drift`, axes checked: What this repo produces; File naming; Status lifecycle; Plan files; Registries; Validation before commit; Do not. Its medium finding (the shellcheck lane) is I4 below; its low findings are O1–O3.

### Critical

- **C1 — Evidence lookup and parameter do not match the merged code.** Task § 3, § 8, § 9 and the plan named `GET …/commits/{BEFORE}/check-runs?check_name=ci-ok`, an `AGGREGATE_CHECK` input and `permissions: checks: read`.
  - **Evidence:** tinker-city `origin/develop:scripts/ci/classify-changes.sh` (`88f98a27`) reads `…/actions/runs?head_sha={BEFORE}&event=pull_request…` and matches `CI_WORKFLOW_PATH=".github/workflows/ci.yml"`; its comment states the evidence is "a workflow run, not the `ci-ok` check run" (task.127 BUG-2). `ci.yml`'s `changes` job declares `contents: read, actions: read`.
  - **Fix applied:** § 3 Current/Target Architecture rewritten to the merged behaviour; the input is `CI_WORKFLOW_PATH`; tests, criteria and plan updated.

### Important

- **I1 — Stale state of tinker-city task.127.** § 2 called it `planned` with issue `OPEN`; § 3 described it "as designed". Fixed to merged (PR #984, 2026-10-02, `accepted`).
- **I2 — An unset parameter's outcome was unreachable (check 10).** The plan used `${AGGREGATE_CHECK:?}`, which aborts with no output; § 8 promised `code=true`. The merged script has no `-e`, and only `emit` writes the output. Fixed: unset/empty `CI_WORKFLOW_PATH` emits `code=true` with a warning, and a spec case pins it.
- **I3 — The spec would not be reached (check 18).** `tests/test-runner-reach.test.js` counts only `*.test.(js|mjs|sh)` and recognises quoted globs with single-segment `*`; the plan's `'docs/examples/ci/**/*.spec.js'` matched neither. Fixed: spec renamed `classify-changes.test.js` (also the repository's naming convention — pre-pass B), glob `'docs/examples/ci/*/*.test.js'` in `scripts["test:suite"]`.
- **I4 — Shellcheck lane (pre-pass B, medium).** `.github/workflows/shellcheck.yml` lints every tracked `*.sh` outside `skills/*/references/`, so the new scripts are in scope. Fixed: Phase 1 step `npm run lint:shell` clean; criterion notes `npm run ci` includes it.
- **I5 — Tinker-city-specific behaviour not stripped.** The merged script also writes `engine` (task.128) and its docs list carries `.agents/*|scripts/server-dashboard/*|scripts/server/*`. Fixed: `engine` removed (D3), `DOCS_PATTERNS` default `*.md docs/*`.
- **I6 — Bitbucket `BEFORE` undefined.** The plan queried `?target.commit.hash={BEFORE}` with no source for `BEFORE`. Fixed (D4), plus a guard that each returned pipeline's own `target.commit.hash` equals `BEFORE`, because the API honouring that filter is unverified.

### Invariant verified (check 11)

The parity claim was run, not read. Task.172's `matchesAnyGlob(p, DEFAULT_PATTERNS)` and a shell `case` over `*.md|docs/*` on the § 8 list:

```
skills/x/SKILL.md true / docs     docs/a/b.yml true / docs     README.md true / docs
.github/workflows/ci.yml false / code                          src/a.ts false / code
```

No divergence.

### Checks not applicable

12 (no compatibility handling), 14 (no engine call-site list; pre-pass C ran no collector), 15 (nothing removed), 16 (no region replaced), 17 (no identity key), 19 (no resume rule), 21 (consumes the GitHub/Bitbucket APIs, not another skill's output). Check 8: `test.yml` and `shellcheck.yml` are unfiltered; `docs-link-check.yml`'s `docs/**/*.md` filter covers the new runbook.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

- **I7 — Plan Phase 0 path is the old Mac's.** `TC=~/Development/Projects/tinker-city` does not exist on this machine. Fixed: `${TINKER_CITY:-$HOME/Development/tinker-city}`.
- Effort `8h`: plausible for three phases of lift plus the Bitbucket variant. No change.

Pre-pass C: `implementation_status: not-implemented` — `docs/examples/ci/` and the runbook are absent; `ci.docsOnly.patterns` and `ci-tree-equivalence.js` exist (the parity reference).

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

- **I8 — Criteria that demand a record named no location (check 22).** "Phase 0 evidence recorded" and "mutation proofs go red" named no file. Fixed: Phase 0 evidence → the guide's "Measured" section; mutation proofs → the QA report.
- **I9 — Scope vs criteria.** Phase 3 was "shippable separately" while a criterion required both platforms. Fixed (D2).
- Criteria classified the way finalise will: behaviour criteria name their tests (the two `classify-changes.test.js`, `docs-set-parity.test.js`); the guide criteria are documentation criteria; `npm run ci` is CI-state; mutation proofs are a process criterion with a committed record.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Added Risk 4: the lift drops a fail-safe exit while removing `engine`. Mitigated by keeping every non-`engine` lifted case.
- No guard exemption is widened in this repository (the template is not installed here), so no differential oracle is required. Rollback covers both platforms separately.

---

## Summary of Recommendations

### Must Fix (Critical) — 1 — applied

1. Re-describe the evidence lookup and its parameter from the merged code (C1).

### Should Fix (Important) — 8 — applied

1. Merged state of task.127 (I1). 2. Unset parameter emits `code=true` (I2). 3. `*.test.js` and a reachable glob (I3). 4. `lint:shell` (I4). 5. Strip `engine` and tinker-city's docs entries (I5). 6. Define Bitbucket `BEFORE` and verify the returned commit (I6). 7. Plan path (I7). 8. Record locations (I8). (I9 is covered by decision D2.)

### Consider (Optional) — 3

1. **O1** — The guide lists host requirements (`bash`, `git`, `jq`, `curl`); `tech-stack.md` need not, as these are consumer-runner tools. (Folded into § 3's guide bullet.)
2. **O2** — `ci.docsOnly.patterns` is undocumented in the architecture docs (pre-pass B). Outside this task's scope.
3. **O3** — The task's Notes still describe the `blocked_on_external` mechanism; it is history now. Harmless.

---

## Implementation Readiness Assessment

**Score:** 9/10 after fixes (7/10 as found)

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (Bitbucket filter behaviour unverified, guarded)
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** (after fixes)

**Justification:** The one critical finding was a stale description of code that has since merged; it is corrected from the merged source, and every other gap now has a concrete fix and a named test.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Run Phase 0 and record the measured runs in the guide.
2. Lift from `git show origin/develop:` in tinker-city, not from task.127's document.
3. Run the lifted spec before parameterising, to have a green baseline.

---

## Review Metadata

- **Reviewer:** review-task (Claude, inside `/develop-task` Step 2)
- **Review Date:** 2026-11-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.174.ci-docs-only-classifier-template/task.174.ci-docs-only-classifier-template.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (pre-pass B)
- **Sources checked:** tinker-city `origin/develop` `scripts/ci/classify-changes.sh`, `.spec.js`, `.github/workflows/ci.yml`; run 41445192250; this repo's `ci-tree-equivalence.js`, `glob-match.js`, `package.json`, `tests/test-runner-reach.test.js`, `.github/workflows/*.yml`
