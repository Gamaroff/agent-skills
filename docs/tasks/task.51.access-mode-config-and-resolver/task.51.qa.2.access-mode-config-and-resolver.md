# QA Report: Task 51 — cycle 2 (re-review after fixes)

**Task**: [task.51.access-mode-config-and-resolver.md](./task.51.access-mode-config-and-resolver.md)
**Gate File**: [task.51.gate.2.access-mode-config-and-resolver.yml](./task.51.gate.2.access-mode-config-and-resolver.yml)
**Previous**: [gate.1](./task.51.gate.1.access-mode-config-and-resolver.yml) — FAIL 40/100
**PR**: [#246](https://github.com/Gamaroff/agent-skills/pull/246)
**Review Date**: 2026-08-17
**Gate Status**: FAIL (55/100, up from 40)

---

## Executive Summary

All five cycle-1 HIGH defects are genuinely fixed — verified by independent reproduction, not by
reading the fix notes. The suite grew 61 → 90 assertions, performance recovered from ~1140 ms to
~209 ms per source, and the guard assertion that never existed now exists and is negative-controlled.

**But three of the fixes introduced new HIGH defects of the same class they closed**, and all three
pass the 90-assertion suite.

That is the finding. Not the individual bugs — the shape:

| Cycle-1 defect | Fix | What the fix broke |
|---|---|---|
| Ten python spawns per source | Batch six reads into one call | A line-positional protocol that shifts on any multi-line value → **silent escalation** |
| Flow-form `access:` read as empty under awk | Teach awk the flow form | Single-line only; a two-line flow map → **silent escalation** |
| `tracker: null` halts | Normalise nulls in the top-level reader | The nested reader, which needed the same fix, → **hard halt**, plus `ARCH_ROOT=~` |

Each fix was correct for the case it was written for and wrong for the adjacent one. Twice running
now — cycle 1 had the same shape at a larger scale.

**Overall**: FAIL · **Deployment**: BLOCKED · **Quality Score**: 55/100

---

## Re-Review Context — previous issues

| ID | Status | Evidence |
|---|---|---|
| BUG-1 zsh | ✅ **Closed** | Clean config, access block, env override, invalid value — all four identical in bash and zsh. Mutations 12 and 13 both red |
| BUG-2 lint | ✅ **Closed** | Root sequence, quoted key, slash key resolve on awk; broken YAML still fails closed. Mutation 14 red. A further 13 malformed shapes attacked — none produces a silent `full` |
| BUG-3 nulls | ⚠️ **Partial** | Top-level fixed both tiers (mutation 15 red); the nested reader was missed → **BUG-8** |
| BUG-4 call sites | ✅ **Closed** | 18 forms / 16 skills / 0 unguarded; `review-code:96` guarded; retrospective now sources rather than executes; assertion negative-controlled 90 → 89 |
| BUG-5 escalation | ⚠️ **Partial** | Scalar rejected, single-line flow agrees across tiers (mutations 17, 18 red); multi-line flow still escalates → **BUG-7** |
| MED-1 injection | ✅ Closed | Crafted path no longer executes; quoted paths read correctly |
| MED-2 performance | ✅ Closed | 10 spawns → 2; ~1140–1458 ms → ~209 ms |
| MED-3 claims | ✅ Closed | Grep assertion exists; "not yet enforced" notice prints and is asserted, including that `full` stays silent |
| MED-4 forced tiers | ✅ Closed | §16 SKIPs loudly when the named tier is unavailable |

---

## New Issues

### HIGH (3)

| ID | Summary | Bug report |
|---|---|---|
| BUG-6 | Bulk protocol is line-positional; a multi-line value shifts every later answer → silent escalation on the authoritative tier | [bug.6](./task.51.bug.6.bulk-protocol-line-shift.md) |
| BUG-7 | Multi-line flow-mapping `access:` → `manual` under python, `full` under awk | [bug.7](./task.51.bug.7.multiline-flow-map-escalation.md) |
| BUG-8 | Null normalisation applied to the top-level reader only; nested keys halt on awk, and `ARCH_ROOT=~` expands to `$HOME` | [bug.8](./task.51.bug.8.nested-null-not-normalised.md) |

### MEDIUM (2)

- **MED-5 — scratch-var leakage.** `_RP_*` and `_rp_line` are unset only on the success path. After a
  failing source they persist, and `${_RP_ACC_T-…}` (unset-only) means a stale empty string suppresses
  the awk read. Two repos in one shell: expected `rc=0/github/manual`, got `rc=1/jira/full`. The suite
  runs every case in a fresh `bash -c`, so it structurally cannot see this — the same *kind* of blind
  spot as cycle 1's bash-only testing.
- **MED-6 — duplicate `access:` key.** Making tier 1 authoritative turned a realistic copy-paste error
  into a silent escalation: pre-fix `0/manual`, post-fix `0/full`. Last-wins is correct YAML, so the
  remedy is duplicate detection, not restoring the fall-through.

### LOW (3)

`resolve_access` remains callable with arbitrary text that reaches `eval` (no execution achieved);
an unknown `config_bulk` spec returns `__NONE__` and so fails open; and mutation 16 stays green
because the tier-1 short-circuit and the awk null handling cover the same inputs, leaving the
"tier 1 is authoritative" invariant without a witness.

---

## Mutation Battery — 20 mutations against the fixed code

Re-ran all 11 original invariants plus 9 new ones, one per cycle-1 HIGH defect and one per MEDIUM
claim. **18 red, 1 green, 1 harness artifact.**

- The green one is LOW-8 above — a genuine gap in what is asserted, not a defect in what ships.
- The artifact was mutation 19 (a real call site losing its guard): my harness pointed `REPO_ROOT` at
  a temp copy the assertion does not scan. Re-verified directly against the repo — removing the guard
  from `skills/qa-task/SKILL.md` takes the suite 90 → 89. Recorded as a harness bug so the number is
  not read as coverage that does not exist.

Reporting a mutation battery as "N of N red" is exactly the claim that misled cycle 1, so the two
non-red results are named rather than rounded away.

---

## NFR Assessment

**Reliability — FAIL.** Three new ways a legal config misbehaves; two of them silent.

**Security — CONCERNS.** The injection vector is closed. But BUG-6 and BUG-7 are security findings in
substance: both hand an operator more access than they asked for, without a word.

**Performance — PASS.** 2 spawns, ~209 ms. Still 4.5× the pre-task baseline, but that baseline never
executed tier 1 at all — the cost buys a parser that actually runs.

**Maintainability — PASS, with a clear signal.** Three of the four cycle-2 defects live in the awk
tier, and each arrived by teaching it one more YAML shape. The tier is documented as "not a parser".
The lesson is to stop extending it and fail closed on anything it cannot read — which is what BUG-7's
recommendation says, in place of a third parsing feature.

---

## Regression

`npm test` 1287/1287 · `tracker-access.test.sh` 90/90 · `test:platform` 6/6 (the extraction's
regression oracle, unchanged) · retrospective fixture pass · `validate:all` 115/115 · Prettier clean ·
bundle idempotent, 28 bundled copies byte-identical to source modulo the generated header.

CI on PR #246: test, validate and link-check all green; branch MERGEABLE / CLEAN.

**None of that sees any of the three new HIGH defects.** Worth stating plainly, because a green CI
badge on this PR currently means less than it looks like it means.

---

## Recommendations

### Immediate (blocking)

1. Index-address the bulk protocol; escape newlines — `resolve-platform.sh:147-159`, `read-config.sh:107-112`
2. Fail closed on an unclosed flow map rather than extending the awk parser — `read-config.sh:275-293`
3. Normalise nulls once, shared by both readers; extend §15 to nested keys and the path roots
4. Initialise and clean up `_RP_*` on every path, and add a cross-source test not run in a fresh shell
5. Reject duplicate keys in the tier-1 loader

### Short-term

Whitelist the `resolve_access` system argument; return `__ERR__` for an unknown bulk spec.

---

## Final Assessment

**Gate**: FAIL · **Score**: 55/100 (from 40) · **Deployment**: BLOCKED

Real progress: the original five are closed, the verification apparatus is genuinely better, and the
performance regression is gone. The reason this is not a pass is that two of the three new defects
are silent escalations — the single outcome the task's own Motivation names as the one it must never
produce.

The recurring lesson across both cycles is narrow enough to act on: **on this change, a fix is not
done when the reported case passes.** Every fix here has an adjacent case — the other reader, the
multi-line form, the value that is not a short enum — and that adjacent case is where the next defect
has been, twice.

**Next**: `/qa-fix` cycle 2 on BUG-6/7/8 + MED-5/6, then re-review as cycle 3.
