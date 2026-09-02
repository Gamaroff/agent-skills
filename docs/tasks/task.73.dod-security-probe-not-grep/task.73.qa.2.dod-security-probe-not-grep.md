# QA Report: Task 73 — cycles 2–4

**Task**: [task.73.dod-security-probe-not-grep.md](./task.73.dod-security-probe-not-grep.md)
**Gate File**: [task.73.gate.3.dod-security-probe-not-grep.yml](./task.73.gate.3.dod-security-probe-not-grep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Gate Status**: PASS (supersedes gate 1 FAIL and gate 2 FAIL)

---

## Executive Summary

Three further QA cycles. Each one found the same defect one level further up, which is the pattern
worth recording: the fix for a conflation kept *relocating* it rather than removing it.

- **Cycle 1** — `probes: []` meant three things. Split into `boundary:` + `probes_executed:` + a
  filtered `probes[]`.
- **Cycle 2 (refute pass)** — the conflation had simply moved up to `boundary`, where *absent* was
  being rendered as the confident claim "not a boundary". Gave every absence its own branch.
- **Cycle 3** — the cycle-2 fix made the two verdict lines independent `{if}` blocks, so a boundary
  that ran nothing rendered "❌ executed no candidates" **and** "✅ the boundary held" together.
  Made them an if/else-if pair.
- **Cycle 4** — enumerated every input state and confirmed exactly one verdict per state. No bugs.

**Overall Assessment**: PASS · **Deployment**: APPROVED · **Quality Score**: 95/100

---

## Re-Review Context — every prior finding

| ID | Sev | Status |
|---|---|---|
| TASK73-001 replay test untracked | high | FIXED — committed |
| TASK73-002 `probes: []` tri-state | high | FIXED — `boundary:` + `probes_executed:` |
| TASK73-003 render branched on emptiness | high | FIXED — branches on `boundary` |
| TASK73-004 candidate count was the reproduced count | high | FIXED — renders `probes_executed` |
| TASK73-005 temp-dir leak in `classifierAt` | medium | FIXED — cleanup on the failure path |
| TASK73-006 vacuous `existsSync` test | medium | FIXED — lazy reads |
| TASK73-007 wrap-brittle assertions | medium | FIXED — whitespace-collapsed matching |
| TASK73-008 null-verdict vacuity | low | FIXED — `klassOf()` insists on a verdict |
| TASK73-009 depth-1 CI skipped the corpus | low | FIXED — `fetch-depth: 0` |
| TASK73-010 over-broad probe-field matching | low | FIXED — scoped to the yaml block |
| TASK73-011 held branch vs `reproduced` filter | high | FIXED — keys on "no probe reproduced" |
| TASK73-012 absent `boundary` read as `false` | high | FIXED — own ⚠️ unverified branch |
| TASK73-013 absent `probes_executed` → good verdict | medium | FIXED — counts as zero |
| TASK73-014 findings suppressed by the zero callout | medium | FIXED — findings render unconditionally |
| TASK73-015 stale Breaking Changes claim | low | FIXED |
| TASK73-016 yaml slice applied to half the keys | low | FIXED — hoisted helper |
| TASK73-017 `probes` a prefix of `probes_executed` | low | FIXED — anchored |
| CR-1 (cycle 3) double verdict render | high | FIXED — if/else-if pair |
| CR-2 (cycle 3) presence-only assertions | medium | FIXED — token-shape test |
| CR-1 (cycle 4) comment misdescribed layering | low | FIXED |
| CR-2 (cycle 4) `indexOf` bypass | low | FIXED — occurrence count |

**Convergence**: HIGH findings **4 → 2 → 1 → 0**.

---

## Cycle 4 — state enumeration

| `boundary` | `probes_executed` | `probes` | Renders |
|---|---|---|---|
| absent / non-boolean | any | any | ⚠️ unverified — one verdict |
| `false` | any | any | "did not fire" — one verdict |
| `true` | absent | none reproduced | ❌ zero-executed (`Candidates executed: not reported`) |
| `true` | `0` | none reproduced | ❌ zero-executed |
| `true` | `>0` | none reproduced | ✅ held |
| `true` | `>0` | ≥1 reproduced | findings list, no verdict line — the findings *are* the verdict |
| `true` | absent / `0` | ≥1 reproduced | findings list **+** ❌ callout (layered, per TASK73-014) |

Exactly one verdict outcome per state, and findings render in every state where anything reproduced.

---

## Code Review

Cycle 2: 7 findings (2 high). Cycle 3: 3 findings (1 high). Cycle 4: **0 bugs**, 2 low cleanups, both
closed. All promoted findings under `code_review_blocking=true`; the cycle-4 cleanups are
`category: cleanup` and did not gate.

### Mutation-Proof Spot Check (Step 3c) — 23 proofs across four cycles

Every invariant asserted in both suites has been proved by reverting the behaviour it names. The ones
that earned their keep:

- **M20** — reintroducing the cycle-3 double-render (independent `{if}` for the held verdict) turns
  the suite red. Before the cycle-3 test it passed green, which is why the bug shipped past cycle 2.
- **M23** — appending a *duplicate* held-verdict block after the pair, the bypass cycle 4 described:
  red, because the test now counts occurrences rather than locating the first.
- **M2** (cycle 1) — an emptied replay corpus **passed**, a real hole in a test written to prevent
  exactly that. Closed with an explicit length guard, then re-proved red.
- **M8** first reported green and had **not landed** — the literal `\n` in the match string did not
  correspond to the file's wrap, so the edit was a no-op. Re-run against both guard sites, red.
  Recorded because a mutation that silently fails to apply is indistinguishable from a passing proof.

`mutation-proven: yes` for every invariant in both suites.

---

## Step 4b — Execute the Documented Commands

Unchanged from cycle 1: 18 blocks in `skills/finalise/SKILL.md`, 0 runnable, 17 mutating, 1
placeholder — `zero-blocks-executed`, confidence medium. Recorded, not suppressed. **Not attributable
to this change set**: the diff adds no bash blocks, and every mutating classification is a correct
refusal of a genuinely side-effecting command.

---

## NFR Assessment

**Security PASS** — the read-only contract is tightened, not loosened; the absence rules make the
artifact harder to fake. **Performance PASS** — gated; 2169 tests, 0 fail. **Reliability PASS** —
one verdict per state, held by a shape test. **Maintainability PASS** — every vacuity finding closed,
including three found by mutating the tests against themselves.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 95/100 · **Deployment**: APPROVED

**Rationale**: All 21 findings across four cycles are closed and mutation-proved. The remaining
deduction is for the route the work took rather than where it ended: the same conflation had to be
chased up three levels, and twice a test that claimed to protect an invariant could not observe its
violation. Both are now held by structural assertions rather than substring presence.

**Follow-up (not blocking)**: `bug.6` — the twelve open classifier routes this task's deliverable
found on its first run.
