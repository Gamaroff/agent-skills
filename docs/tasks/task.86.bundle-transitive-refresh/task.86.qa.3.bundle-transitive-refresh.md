# QA Report (Cycle 3): Task 86

**Task**: [task.86.bundle-transitive-refresh.md](./task.86.bundle-transitive-refresh.md)
**Gate File**: [task.86.gate.3.bundle-transitive-refresh.yml](./task.86.gate.3.bundle-transitive-refresh.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: CONCERNS

---

## Executive Summary

All ten cycle-2 findings are confirmed fixed **by execution**. Cycle 3 found thirteen more — one HIGH
scope gap, three MEDIUM correctness bugs, **two MEDIUM test gaps**, and seven LOW cleanups. All are
fixed; the six behavioural ones are mutation-proven.

The HIGH is the one that matters: **`--check` never asserted pass 3.** It looked only inside
`references/`, so a skill source still carrying `shared/resources/X` passed while `npm run bundle`
would rewrite it. That is this task's own subject — a gate reporting green over work the bundler
would do — surviving in the one dimension the new check had dropped. It is not a regression (the
`git diff -- 'skills/*/references/*'` form it replaced was equally blind, because pass 3 edits files
outside that pathspec), but `validate.yml` is now the *sole* bundle gate, and its comment claimed
per-file equality "reusing the bundler's own rewrite".

**Gate is CONCERNS, not PASS.** Each cycle has found real defects, and this one found two behaviours
pinned by no assertion at all. The work is materially better than at cycle 1 and every criterion
holds — but the honest reading is that this file rewards more scrutiny than one more pass can give it,
so three residuals are recorded as limitations rather than quietly closed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: APPROVED for staging, CONDITIONAL for production

---

## Review Methodology

Direct tools plus an independent Explore agent. **Re-review scope: since gate 2** (`ab36f88d..HEAD`),
per the default scoping rule — cycle 2 was the unscoped refute pass.

---

## Re-Review Context — every cycle-2 finding, re-verified by running it

| ID | Status | Evidence |
| --- | --- | --- |
| TASK86-008 gate on discovery path | **FIXED** | authored file preserved for all three SKILL.md seeds (was False/False/True) |
| TASK86-009 single-dash typo | **FIXED** | `-check <path>` → exit 2, nothing written |
| TASK86-010 non-`.sh` mode | **FIXED** | 0755 `.js` source with 0644 copy → exit 1 |
| TASK86-011 header-less suffix | **FIXED** | authored `.ts` preserved |
| TASK86-012 MISDECLARED | **FIXED** | reported with the parsed path |
| TASK86-013 remedy by class | **FIXED** | manual classes separated from regenerable |
| TASK86-014 undiscovered symlink | **FIXED** | reported; source untouched |
| OSError hardening | **FIXED** | a directory named like a reference → exit 1, no traceback |
| TASK86-006/007 structured banner | **FIXED** | prose quote neither overwritten nor called ORPHANED |
| TASK86-005-TEST split | **FIXED** | reporting half now individually provable |

---

## New Findings This Cycle

**[HIGH] F-001 — `--check` did not assert pass 3.** Reproduced: with `references/` fresh and a skill
source still naming `shared/resources/`, `--check` exited 0 and `bundle` then printed
`rewrote guide.md`. Now reports `UNREWRITTEN`, in the regenerable bucket.

**[MEDIUM] F-002 — mode drift was one-directional.** Both writer and checker were gated on *is the
source executable*, so a 0644 source with a 0755 copy passed both. Git ships the bit to consumers.
Now compared and mirrored unconditionally.

**[MEDIUM] F-003 — `.json` bypassed the evidence check, and the remedy was the destroyer.** The early
return meant an authored `.json` was silently overwritten, and `--check` then classed it STALE — into
the *regenerable* bucket, telling the operator to run the bundler that would destroy it. Every other
suffix was protected by four earlier findings; this was a hole in the headline guarantee with no test
over it.

**[MEDIUM] F-004 — a dangling symlink was invisible.** A link with no same-named source reached
neither the expected set nor `source_backed_on_disk`. TASK86-014 fixed this conflation for the
source-backed half only — and this is the more dangerous half, since the link is *already* dangling.

**[MEDIUM] F-005 — TEST GAP.** The cycle-2 decision that a mode repair returns True (so the bundler
and `--check` cannot disagree) was held by nothing: reverting it reds no test, because the chmod
happens either way and no assertion read the bundler's stdout after a mode-only drift.

**[MEDIUM] F-006 — TEST GAP.** The line-based banner window is load-bearing — a byte-bounded window
misclassified a real file here — but no fixture had frontmatter long enough to exercise it. The suite
stayed green with the regression restored.

**[LOW] F-007…F-013** — the skip message said "not bundler output" for a file refused merely for being
a symlink; AMBIGUOUS swallowed MISDECLARED then advised "add the banner" to a file that has one; a bad
path exited 1 (drift) rather than 2 (usage), contradicting the docstring; the manual list reprinted
every line; the test helper's `check()` lacked the signal-kill guard its twin `run()` carries;
TASK86-011 asserted survival but not reporting; `symlinkRef` could not create a nested link.

> **Two of these are about tests, and that is the cycle's real result.** A behaviour pinned by no
> assertion is one the next change can delete in silence. Both are now mutation-proven: MUT-22
> (`return False`) and MUT-23 (`text[:512]`) each red exactly their new test.

---

## Probes That Came Back Clean

| Probe | Result |
| --- | --- |
| Write-gate completeness | `write_bytes`/`chmod` occur only in `write_if_changed`; both call sites and `check_skill` are gated by `writable_copy`. No ungated path |
| Classification order / double-report | Seven classes, all reachable, exactly one per file. AMBIGUOUS pre-empting STALE is correct — a byte diff against a file that is not our output means nothing |
| Counting / status honesty | `protected` initialised before both loops; no path prints `in sync` while something was skipped |
| Idempotence / convergence | 3 runs on a mixed fixture (discovered, transitive-through-shell, reconcilable, ambiguous, symlink, header-less, misdeclared): converged after run 1, byte-identical after |
| Regression on the 858 real files | `--check --all` exit 0; `npm run bundle` a genuine no-op — 0 writes, 0 skips, 0 mode discrepancies in either direction, 0 pass-3 rewrites |

---

## Residuals — recorded as limitations, not closed

1. **Evidence 2 cannot distinguish** a pre-header bundled copy from an authored file byte-identical to
   the rewritten source. They are the same bytes. Bounded: the file is adopted and gains a banner, but
   no content is lost, because it already matched what the bundler would write.
2. **A header-less file whose source was deleted cannot be reported ORPHANED** — it carries no banner
   to read. Inherent to the discriminator.
3. **The symlink write-through outcome is reachable through two independent guards**, so neither is
   individually provable; only removing both reds the test. `write_if_changed`'s unlink is unreachable
   via current call sites and is kept as *documented* defence-in-depth rather than counted as covered.

---

## NFR Assessment

**Security — PASS.** No auth, network, secrets or user data. The file-integrity risks are the subject
of the fixes and are now gated at every write site.

**Performance — PASS.** `--check --all` ~2s over 125 skills; bundle idempotent.

**Reliability — PASS.** Convergence verified; `OSError` paths no longer abort `--all`.

**Maintainability — CONCERNS.** The module has grown from 258 to ~700 lines and now carries seven
problem classes, two kinds of evidence and three passes. Every review cycle has found real defects in
it. That is a signal about the file's complexity, not only about the reviews — and it is the reason
this gate is CONCERNS rather than PASS.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All 13 findings fixed and the behavioural ones mutation-proven; all §9 criteria hold;
CI green. But findings are still arriving each cycle, two of this cycle's were behaviours nothing
asserted, and three residuals are genuine limitations rather than resolved defects. Recording that is
more useful than a PASS that implies the file has been exhausted.
**Quality Score**: 78/100

**Deployment Recommendation**: APPROVED (staging) / CONDITIONAL (production)

---

**Next Steps**: Step 5c `/review-pr` — the QA loop's exit gate.
