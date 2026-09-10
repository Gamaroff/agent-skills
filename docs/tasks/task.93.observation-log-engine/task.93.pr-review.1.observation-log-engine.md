# PR Review Report: PR #353 — feat(task.93): observation-log engine, workspace resolver and contract

**Reviewed:** 2026-09-08
**PR:** [#353](https://github.com/Gamaroff/agent-skills/pull/353) — `feature/task.93.observation-log-engine` → `develop` (OPEN)
**Work item:** [`task.93.observation-log-engine.md`](./task.93.observation-log-engine.md) — resolved via `branch stem`
**Tracker:** [#339](https://github.com/Gamaroff/agent-skills/issues/339) — OPEN, labels `task`, `priority:high`
**Verdict:** ⚠️ **CONCERNS**

> **Scope of the reviewed diff.** 67 files changed (+5,928/−158). The 48 auto-generated
> `skills/*/references/read-config.sh` copies were **excluded** — byte-identical to their
> `shared/resources/` source and headed `AUTO-GENERATED — DO NOT EDIT`. 19 files, ~6,200 diff lines
> reviewed.

> ⚠️ **Both lenses were run by the reviewer directly, not by the dispatched subagents.** Two
> read-only Explore agents were dispatched in parallel per the skill's Step 5; both were still
> running with no output after ~6 minutes and were stopped — the same failure this task saw at QA
> cycle 1. Every finding below was produced by reading the diff and executing against the repository.
> Recorded because "the lens found nothing" and "the lens never reported" are the same sentence from
> outside, which is the confusion this task's own contract exists to prevent.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.93.implementation.1.observation-log-engine.md` |
| Review report | ✅ | `task.93.review.1.observation-log-engine.md` (9/10, READY TO IMPLEMENT) |
| QA reports | 4 | `task.93.qa.1` … `qa.4.observation-log-engine.md` |
| Gate | **PASS** | `task.93.gate.4.observation-log-engine.yml` (96/100), `top_issues: []` |
| DoD | ⏳ | not yet written — Step 7 produces it; expected at this point |
| Sprint review | ⏳ | not yet written — Step 7 |
| Open bugs | 0 | none filed |
| Handover | — | none; `access.tracker` is `full`, nothing deferred |

**Gate progression**: FAIL (70) → FAIL (70) → CONCERNS (90) → **PASS (96)**. HIGH findings by cycle:
`1, 2, 0, 0`.

### Trail honesty — spot-checked, not taken at face value

Two mutation-proof claims were checked against the shipped test file:

- *"`next-id` over a log containing `0108` returns `109`"* — the test really plants `0108-octal-hazard.md`
  and really asserts `r.json.id === 109`. ✅ (one blemish — see CR-1)
- *"`archive` leaves a parked entry regardless of age"* — the test really plants a **second** parked
  entry carrying `resolved: 2020-01-01`, which is what isolates `RESOLVED_SET` membership from the
  date half of the gate. ✅ The QA report's account of *why* the first version of this test was
  insufficient matches the code.

The trail is honest. The reports describe what the diff actually does, including where earlier
attempts were wrong.

---

## Acceptance Criteria Traceability

All 21 criteria in §9 traced to evidence in the shipped files.

| Criterion | Evidence | Status |
|---|---|---|
| Ten subcommands implemented and reachable | `SUBCOMMANDS` set holds exactly 10 | ✅ |
| `doctor --json` returns valid JSON with `reason` on a fresh workspace | verified live: `reason: ok` | ✅ |
| `next-id` over `0108` returns `109` | test *…returns 109 — the octal regression* | ✅ |
| `next-id` sweeps as a side effect, proven without calling `archive` | test *…WITHOUT `archive` being called* | ✅ |
| `write` exposes no way to supply an id | test *never accepts a caller-supplied id*; exit 2 | ✅ |
| `set-status` rejects `parked` without `parked_until` | test *…is rejected*; `reason: parked-without-condition` | ✅ |
| `queue` surfaces statusless as OPEN and names them | test *…counts a statusless file as OPEN and names it* | ✅ |
| Resolver refuses an ephemeral anchor, non-zero exit | test *…refuses an ephemeral anchor*; `/tmp`, `/var/tmp`, `.claude/worktrees`, linked worktree | ✅ |
| Resolver's three-source precedence asserted in order | test *…config over env over default* | ✅ |
| `scan` never reads a body — structurally, not by timing | `readFrontmatterBounded` + `bytesRead` assertion (5,000,029-byte file → 8,192 read) | ✅ |
| `scan --json` over 500 observations through a pipe | test pipes through `cat`, sizes payload from `PIPE_BUF` | ✅ |
| Baseline timings recorded for 1/100/1000 | implementation report: 90.3 / 108.0 / 152.7 ms | ✅ |
| Every guard mutation-proven | 23 proofs recorded across 4 cycles | ✅ |
| `npm test` passes | `ci:fast` EXIT=0, 2863/2864 | ✅ |
| `npm run format` clean | `prettier --check` clean | ✅ |
| `shellcheck` clean — **run**, not assumed unrunnable | run after `brew install`; found a real SC2088; now clean across all 56 tracked scripts | ✅ |
| Engine takes no tracker dependency | sole local require `./yaml-subset.js`, asserted by a test | ✅ |
| No `process.exit()` after an output write | 0 real calls; the 3 grep hits are comment lines 1410/1411/1416 | ✅ |
| `AGENTS.md` carries `## Observation Log` | present; all 3 relative links resolve in the **tracked** tree | ✅ |
| Contract carries CC BY 4.0 + "changes were made" | both present | ✅ |
| `CHANGELOG.md` updated | present (see PC-3) | ✅ |

**Coverage: 21/21 met.** No criterion is unevidenced.

---

## Conformance Findings

### [PC-1] consistency · medium · confidence: high — `task.93.observation-log-engine.md:296`

The task's §7 **Note on bundling** states:

> "no skill references these paths yet, so `npm run bundle` produces no `references/` copies in this task"

The PR ships **48 changed `skills/*/references/read-config.sh` files**. The note's *reasoning* is
still sound about the three new files — nothing references them — but as written it is a check a
reviewer would apply to the PR's file list, and applying it gives the wrong answer about 48 files.
The bundled copies exist because an **existing** shared resource (`read-config.sh`) was edited, a
path the note does not contemplate.

→ Amend the note to say that no `references/` copies are produced *for the new files*, and that the
48 bundled `read-config.sh` copies follow from the `_CONFIG_GUARDED_KEYS` edit.

### [PC-2] scope · low · confidence: high — `task.93.observation-log-engine.md` §7

§7 Files Summary lists 5 files. The PR ships 7 non-artifact files — it adds
`shared/resources/read-config.sh` and `CHANGELOG.md`.

This is **justified drift, not scope creep**: the `read-config.sh` edit registers
`observations.workspace` in `_CONFIG_GUARDED_KEYS`, and without it the key resolves silently empty on
a python-less host, inverting the documented resolver precedence. An existing repo guard
(`tracker-access.test.sh` §44) failed until it was made. The implementation report records the edit
and the reason in full, so the **trail** is honest; only the **work item** is stale.

→ Add both files to §7 with the one-line reason.

### [PC-3] consistency · low · confidence: high — `CHANGELOG.md`

The entry says "**40 tests**, and every guard is mutation-proven". The PR ships **48**. Written before
the four QA cycles and never revised. The mutation-proven claim remains true (and understated).

→ Update the count, or drop the number and keep the claim.

---

## Code Review Findings

### [CR-1] test-quality · low · confidence: high — `observation-log.test.mjs` (octal test)

```js
assert.equal(r.json.id, 109, "0108 must parse as one hundred and eight");
assert.notEqual(r.json.id, 70, "the octal reading of 0105 is 69");
```

The second assertion cannot fail. The test plants `0108`, whose octal reading is an *error*, not 70 —
70 is the artefact of `0105` (octal 69, +1), a different input the test does not use. So
`notEqual(109, 70)` is trivially true regardless of the implementation. The first assertion is sound
and *is* mutation-proven, so no coverage is actually lost; but a vacuous assertion reads as coverage
it does not provide, which is the precise failure mode this task spent four cycles guarding against.

The first message is also slightly off: `0108` parses as 108; 109 is the *next* id.

→ Either plant `0105` as a second case so the `70` assertion becomes live, or drop it and fix the
message.

**No correctness findings.** The recently-changed code was probed rather than read:
`repoWorktrees()` was exercised against five adversarial `.git` shapes (no repo, malformed `.git`
file, gitdir without `/worktrees/`, dangling admin dir, empty `.git` dir) and three real ones (repo
root, subdirectory, inside a linked worktree) — nothing throws, and all three real positions return
the correct worktree pair.

---

## Resolution

All four findings were applied in the same cycle, before Step 7:

| Finding | Action taken |
|---|---|
| **PC-1** | §7's bundling note now says no `references/` copies are produced *for the new files*, and explains that the 48 changed `read-config.sh` copies follow from editing an existing shared resource. |
| **PC-2** | §7 Files Summary now lists 7 files; `read-config.sh` carries its one-line justification. |
| **PC-3** | `CHANGELOG.md` corrected: 40 → 48 tests. |
| **CR-1** | The octal test now plants **`0105` as well as `0108`** — the two prefixes fail differently under shell arithmetic, and only `0105` fails *silently* (valid octal, reads as 69, yields 70). The `notEqual(…, 70)` assertion is now **live**, mutation-proven by restoring an octal parse and watching the test go red. |

CR-1's fix is worth a sentence of its own: the assertion was not merely tidied, it was made
falsifiable. Planting only `0108` meant the number 70 came from an input the test did not use, so the
assertion read as coverage while proving nothing — a small instance of the exact pattern this task
spent four QA cycles on.

---

## Recommended Actions

1. **PC-1** — amend the §7 bundling note; it is the one finding that would actively mislead a reviewer.
2. **PC-3** — correct the CHANGELOG test count (user-facing release note).
3. **PC-2** — add `read-config.sh` and `CHANGELOG.md` to §7 Files Summary.
4. **CR-1** — make the `70` assertion live, or remove it.

None blocked the merge, and all four were applied rather than carried forward — see **Resolution** above.

---

## Verdict rationale

Per the deterministic table: no finding is `severity: high` + `confidence: high`, so not REQUEST
CHANGES; PC-1 is `medium`, so **CONCERNS** rather than APPROVE.

**CONCERNS is non-blocking** — findings are recorded and the run proceeds to Step 7. That is the right
outcome here: the diff delivers all 21 success criteria, the artifact trail is complete and honest
under spot-check, and the four items above are inconsistencies *between the work item and what
shipped*, not defects in what shipped.
