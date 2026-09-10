# QA Report: Task 84 — Skill install profiles (cycle 3, confirmation pass)

**Task**: [task.84.skill-install-profiles.md](./task.84.skill-install-profiles.md)
**Gate File**: [task.84.gate.3.skill-install-profiles.yml](./task.84.gate.3.skill-install-profiles.yml)
**Prior cycles**: [qa.1](./task.84.qa.1.skill-install-profiles.md) (11 findings) · [qa.2](./task.84.qa.2.skill-install-profiles.md) (5 findings, 2 HIGH)
**Review Date**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

The confirmation pass was supposed to establish convergence. It found **five more defects, two HIGH, three of them introduced by cycle 2's own fixes** — including the most severe defect in the entire task.

**C3-001**: cycle 2 rewrote the resolver call as a bare `_X=$(…); _rc=$?`. Under `set -euo pipefail` that aborts the shell at the assignment, so both rc branches cycle 2 had just added were dead code, and every resolver failure killed the wizard *after* the tarball was extracted and `.agents/skills/` created but *before* any skill was copied. Cycle 1's defect installed too much and was recoverable; this one bricks the install.

Two things make it the defining finding of this task:

1. **The same commit added a comment warning against exactly this.** *"CALL THIS INSIDE A CONDITION … a BARE call would abort the whole wizard … Verified both ways; keep it that way."* It described a call form that no longer existed anywhere in the file.
2. **Its own test could not see it**, because the test ran the call under an explicit `set +e` — precisely the condition that does not hold in production — and offered a grep for the now-unreachable branch as its evidence.

All five are fixed and mutation-proven.

---

## Re-Review Scope

```
Re-review scope: since gate 2 (cycle 2's fixes) — the confirmation-pass default
```

Appropriate here: cycle 2's changes *were* the risk surface, and three of five findings were in them.

---

## New Findings This Cycle

| ID | Sev | Defect |
| --- | --- | --- |
| C3-001 | **HIGH** | Bare command-substitution assignment aborts the wizard under errexit; both rc branches dead code |
| C3-002 | **HIGH** | Block-form `invokes:` guard missed a blank or comment line before the first item — same silent-empty failure, one newline away |
| C3-003 | MED | Flow-list awk parser kept `[[:space:]]+#` while the JS parser widened to `\s*#`; `exclude: [a]# off` mangled the name and the exclusion silently did nothing |
| C3-004 | MED | Dry-run discarded the CLI's stderr and collapsed every non-zero exit into "resolver unavailable" — reproducing on the dry-run path the mis-attribution the same commit removed from the real path |
| C3-005 | LOW | Zero-skill warning blamed `skills.exclude`; the tracker filter can also empty a set |

C3-003 carries a detail worth keeping: the fix widens **one** of three awk parsers. The other two read plain scalars, where YAML treats an unspaced `#` as part of the value — widening those would have been a new bug. The asymmetry is deliberate and commented.

---

## Vacuous Tests Found

**C2-M1 asserted on a code comment.** `match(src, /EVEN IF EMPTY/)` — a comment cannot fail. The test contained no behaviour at all and would have passed with the warning emitted after the install loop, with `_have_set` never set, or with the surrounding dispatch aborting the shell. Replaced with a test that drives the real function under real errexit, plus **C2-M1b**, which asserts the rc branches are reachable — mutation-proven by reintroducing the bare assignment.

**C2-H2 was half vacuous, and the vacuous half hid C3-001.** Its behavioural part is sound, but it ran under `set +e`, and its evidence for the caller was a grep for a dead branch.

**C2-M2's comment overclaimed.** Its behavioural half calls the CLI directly and never touches `setup-consumer.sh`, so it would pass with the forwarding deleted. Assertions kept; comment corrected to state the real scope. An honest scope note beats a false coverage claim.

---

## A Mutation Proof That Did Not Mutate

Mid-cycle, a `perl` substitution meant to revert the block-form guard silently failed to apply. The run reported `0 fail` and I nearly accepted it as proof. **A mutation test that does not mutate is indistinguishable from a passing one** — the same vacuity being found in the tests, one level up. Every mutation in this cycle now asserts the substitution applied before the result is believed.

---

## What Has Actually Caught Defects

Across three cycles and 21 defects:

| Lens | Defects found |
| --- | ---: |
| Independent adversarial review (cycle 1) | 10 |
| Independent refute pass (cycle 2) | 5 |
| Independent confirmation pass (cycle 3) | 5 |
| Pre-existing repo guard (stdout-drain) | 1 |
| Hands-on probing during QA | 2 |
| Self-review of my own change | 1 |
| **Tests asserting on source text** | **0** |

The last row is the finding. Source-text assertions have caught nothing, and twice gave false confidence about the exact line a defect was on.

---

## NFR Assessment

**Security — PASS.** Unchanged across three cycles.
**Performance — PASS.** ~115ms per resolution.
**Reliability — CONCERNS.** Blast radius is converging (installs everything → one skill's edges → an aborted install on a failure path), but three consecutive cycles have each found the previous cycle's repairs defective, and I authored all three.
**Maintainability — CONCERNS.** `install_skills` still has no behavioural coverage. Three cycles have now noted it; the extraction follow-up is overdue rather than optional.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100

**Rationale**: The feature is correct and well covered — 67 tests over the new surface, every load-bearing guarantee mutation-proven, full CI green at 2423 tests. But the confirmation pass that was meant to demonstrate convergence instead found the most severe defect in the task, in a fix, guarded by a test that structurally could not see it.

**Deployment**: staging APPROVED. Production **CONDITIONAL on human review** rather than on another self-certified cycle. The risk is concentrated in `setup-consumer.sh`, which can delete a consumer's installed skills, and the evidence of three cycles is that my judgement on my own repairs to that file has been wrong every time. A fourth cycle of the same author fixing and certifying adds less than one pair of outside eyes.
