# QA Report: Task 91 — cycle 3

**Task**: [task.91.reconcile-tracker-resolution.md](./task.91.reconcile-tracker-resolution.md)
**Gate File**: [task.91.gate.3.reconcile-tracker-resolution.yml](./task.91.gate.3.reconcile-tracker-resolution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-05
**Gate Status**: CONCERNS — 80/100

> **Written late, and saying so.** Gate 3 was authored and acted on during the cycle; this companion
> report was not, and the omission was caught by the Step 5c PR review rather than by the cycle itself.
> Every other gate in this task has a paired report, so a lone gate is a trail defect regardless of how
> complete the gate is. The content below is the cycle-3 record, reconstructed from the gate, the
> commit (`d71586c3`) and the probes run at the time — not re-derived after the fact.

---

## Executive Summary

Every cycle-2 finding is fixed and re-verified. **The HIGH count reaches zero**, so the loop is
converging. Two residuals remain, both reachable only through a corrupt or partially-written resolver
copy rather than through anything a user can put in a config.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Re-review scope: since gate 2 (default narrowing).** `SAFETY_REPROBE` was false — gate 2's
`nfr_validation.security.status` was `PASS`, so the safety carve-out did not apply. Scope was the
cycle-2 diff: the tab-separator payload, the `.env` last-match change, the COVERED/NOT-COVERED comment
split, and the fixture-tarball resolver.

Direct tools, focused on the cycle-2 fixes. No subagent this cycle — cycle 2's refute pass had just
swept the whole diff, and the changes under review were four small, well-bounded edits.

---

## Re-Review Context

| ID | Cycle-2 finding | Status | Evidence |
| --- | --- | --- | --- |
| TASK-91-006 | rc/`TRACKER` payload collapse → literal `"0"` | **FIXED** | truncated resolver → `rc=2 []`; mutation-proven by reverting to the newline payload |
| TASK-91-007 | cycle-1 fixes had no coverage | **FIXED** | fixture now ships the real resolver; `release` origin pinned by its own test; 59 tests, up from 52 |
| TASK-91-008 | `.env` first-match vs last-match | **FIXED** | set-then-emptied → github; emptied-then-set → jira |
| BUG-6 | pre-identity refusal blamed the wrong file | **FIXED** | stderr names `SKILLS_CONFIG_FILE=/tmp/nope.yaml`; COVERED/NOT-COVERED split documented |

---

## New Findings This Cycle

- **[MEDIUM] TASK-91-009** — `scripts/setup-consumer.sh`. The installer accepts whatever string the
  located resolver prints, unvalidated. `_locate_resolver` selects a file on **readability alone** and
  never establishes that it is a resolver, so a stale or partially-written copy under
  `.agents/skills/*/references/` is trusted verbatim.

  Verified: a planted resolver setting `TRACKER=bitbucket` and returning 0 gave `rc=0 tracker=[bitbucket]`,
  and `_skill_excluded_for_tracker` then **KEPT both** `sync-jira-epic` and `sync-github-epic` — the
  filter silently inert. Same outcome as TASK-91-006 through a different door, with the same realistic
  trigger: a partial write from an interrupted install.

  The real resolver cannot produce this — `validate_enum` refuses anything outside
  `{jira, github, auto}` — so the entire exposure is in trusting the located file. `bitbucket` is the
  right probe because it is a legal `vcs` value, i.e. the shape a plausible corruption takes.

- **[LOW] TASK-91-010** — the rc-non-zero twin of TASK-91-005. A resolver returning non-zero **without**
  writing to stderr left the caller printing "see the resolver's message above" with nothing above it.
  Verified with a planted `return 1`: `rc=2`, no message. Cycle 2 fixed exactly this shape for the
  `rc=0` case and left this one standing.

---

## Convergence Check (active from cycle 3)

| Gate | HIGH | Same file? |
| --- | --- | --- |
| 1 | 1 | `scripts/setup-consumer.sh` |
| 2 | 1 | `scripts/setup-consumer.sh` |
| 3 | **0** | — |

HIGH is **reducing** (1 → 1 → 0), so the convergence check does not fire. The two consecutive HIGHs
were on the same file, but a third would have been needed to trigger the third-strike rule, and gate 3
has none. Worth recording precisely: the gate-2 HIGH was **not** the gate-1 HIGH left unresolved — it
was a new defect introduced by the gate-1 fix. Those are different situations and only the first is a
loop failing to converge.

---

## NFR Assessment

**Security — PASS.** Unchanged. TASK-91-009 is a trust boundary rather than a vulnerability: the file
being trusted is one a previous run of this same installer wrote.

**Performance — PASS.** Unchanged. The double-source on the failure path remains, install-time only.

**Reliability — CONCERNS.** TASK-91-009 reproduces the inert-filter outcome, but only via a corrupt
resolver copy rather than any config a user can write. Materially narrower than the cycle-1 and cycle-2
HIGHs, both of which were reachable from ordinary inputs — downgraded on that basis, not waved through.

**Maintainability — PASS.** The coverage gap that let cycles 1 and 2 through is closed: the fixture
tarball now ships the real resolver, so the `release` origin and the `_tmpdir` argument are exercised at
all. Two comments that overstated what tests prove were corrected rather than left standing, and the
false COVERED enumeration is now accurate.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — TASK-91-009 is a one-line validation and closes the last
route to a silently inert filter.

**Next Steps**: `/qa-fix` on TASK-91-009 and -010, then cycle 4 confirmation.
