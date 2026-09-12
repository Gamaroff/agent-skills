---
type: review-report
status: complete
bug: 'bug.15.doctor-activation-check-cwd-relative'
mode: 'validate-and-apply'
created: '2026-09-12'
updated: '2026-09-12'
description: "Fix-readiness review of bug.15 — READY TO FIX, 10/10; reproduces from the report, no duplicate, no already-fixed evidence."
---

# Bug Review — bug.15.doctor-activation-check-cwd-relative

**Mode**: validate-and-apply (invoked by `/develop-bug` Step 2, autonomous run from `/develop-next`)
**Reviewed**: 2026-09-12
**Bug mode**: general

## Executive Summary

| Metric | Value |
|--------|-------|
| Fix-readiness score | **10/10** |
| Recommendation | ✅ **READY TO FIX** |
| Critical | 0 |
| Important | 0 |
| Optional | 0 |
| Duplicate | none |
| Reproduces | likely |

Score breakdown: Completeness 10 · Reproducibility 10 · Classification 9 · Linkage 10 (avg 9.75 → 10).

## Pre-pass Results

Both scans were run inline by the orchestrator rather than as parallel Explore subagents (the checks are two greps and one command; a subagent round-trip would add nothing but latency).

- **Duplicate scan** — `docs/bugs/bug-registry.md` and `docs/bugs/*/` searched for `cwd`, `activation`, `doctor`: only row 15 matches. Bug 8 (`bug-status-outside-lifecycle-is-invisible`) is the nearest neighbour by theme (a silent false answer from an engine) but concerns a different engine and a different check. → `duplicate: none`.
- **Already-fixed scan** — `shared/resources/observation-log.js` still carries both cwd anchors named in the report (`const root = args.auditRoot || process.cwd()` at line 957 for `families --audit`; `const cwd = args.auditRoot || process.cwd()` at line 1119 with the `["AGENTS.md","CLAUDE.md"].map(f => path.join(cwd, f))` lookup at line 1149 for `doctor`). Re-running the report's reproduction from `skills/observe-work/` on `develop` @ `ce472992` reproduces it exactly: `activation-configured` → `ok: false, "no agent-instruction file mentions the observation log"`, and `families --audit` reports the meta-skills family members as not found. → `reproduces: likely`, `found_at: shared/resources/observation-log.js:957,1119,1149`.

## Findings

### Step 2 — Template & Frontmatter Compliance

No findings. All required sections present (Bug Description with Summary/Expected/Actual/Impact, Reproduction Steps, Evidence, Scope & Impact, Developer Fix Cycle stub, Status History, Resolution Summary stub). Frontmatter carries `type: bug`, a lifecycle `status`, valid `severity`/`priority`, `created`, `related`, `description`, and — as of Step 1 — `github_issue: 393`. Filename stem ↔ directory stem ↔ body Bug ID agree.

### Step 3 — Reproducibility Clarity

No findings. Five numbered, self-contained steps; environment pinned (`develop` @ `6ce3280e`, `command node` v26); expected and actual both explicit with verbatim transcripts; Frequency `Always`, Reproducible `Yes`. Evidence names a second site (`families --audit`) with the `grep` that enumerates the population, which makes the fix's scope checkable.

### Step 4 — Severity / Priority Correctness

`Minor` / `Medium` is consistent with the impact: a silent false negative in a health check that misleads the Session Start Protocol every session but blocks nothing and loses no data. No correction.

### Step 5 — Mode & Linkage Correctness

Registry row 15 exists with status `new`, matching frontmatter. General-mode `related` is `none — cross-cutting`, as required. No findings.

## Applied Fixes

None required — no Critical or Important issues.

## Next Steps

Proceed to `develop-bug` Step 3. The report's Recommendation section is a sound plan: anchor every `process.cwd()` lookup at the repo root (with `--audit-root` as the override), emit a `state` field so `SKILL.md` can branch on it, and add a subdirectory-invocation test for both `doctor` and `families --audit`, mutation-proved by reverting the anchor.
