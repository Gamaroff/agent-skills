# QA Report: Task 141 - cycle 3

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.3.qa-next-targeted-item.yml](./task.141.gate.3.qa-next-targeted-item.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Gate Status**: FAIL

---

## Executive Summary

Four of cycle 2's six fixes hold. The two that do not are both in the **sign-off guard**, and the
finding this cycle is not either defect individually — it is that the guard's *shape* is wrong.

Cycle 1 found that guarding `pass` alone left the loss reachable through `blocked` and `na`. Cycle 2
fixed that by enumerating `clear || note`. Cycle 3 finds that the enumeration **missed `--bug`**, and
that closing `--note` also closed the only route `blocked` and `na` have — which SKILL.md and the
README both still say is open. Three cycles, one defect class: *each fix enumerated the doors it knew
about.*

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Cycle 3, so the diff is scoped to the three files cycle 2 changed, shown against the PR base
(`origin/develop...HEAD`, 1143 lines) — the whole of each file's change, not only the fix hunk.

**Re-review scope: scoped to the cycle-2 commit (1dc85de3), 3 files.** The gate-2 `updated:`
timestamp was hand-written and `git log --since` against it returned zero files; an empty pathspec
array then expands to *no* pathspec and silently diffs everything, which is the non-vacuity trap the
scoping rule names. Scoped against the commit instead, which is exact. Recorded because "the scope
was wrong and the diff was right anyway" is not a thing a later reader should have to reconstruct.

`SAFETY_REPROBE`: gate 2's security axis read `OK reasoned` → not triggered.

**The review was dispatched**, as cycle 2's report required, and returned in 2m31s. It confirmed the
finding the QA step had reached independently (BUG-7) and found one the QA step had **not** (BUG-8) —
the second cycle running in which the dispatched reviewer found a defect the inline reasoning missed.

---

## Re-Review Context — cycle 2's findings

| Finding | Severity | Status | How verified |
| :--- | :--- | :--- | :--- |
| TASK-141-BUG-3 — angle brackets fail `validate` | HIGH | **FIXED** | `quick_validate.py` green locally **and the CI `validate` job is green on the pushed branch** — the source of truth, not a local proxy |
| TASK-141-BUG-4 — SKILL.md said only a fail moves `✅` | MEDIUM | **FIXED** | Both sentences name the demotion; re-read against the code |
| TASK-141-BUG-5 — sign-off overwritable via `--note` | MEDIUM | **PARTIAL** | The `--note` door is closed, but the fix closed a legitimate path with it (BUG-7) and left `--bug` open (BUG-8) |
| TASK-141-BUG-6 — lowercase id rejected by four commands | MEDIUM | **FIXED** | The population test executes all six id-taking commands; mutation-proved |
| CR2-3 — refused `--run-path` created a directory | LOW | **FIXED** | The refusal test asserts `!existsSync(runs/D.2)`; mutation-proved |
| CR2-5 — bare `--item` exited 4 | LOW | **FIXED** | Contract test asserts exit 2 for missing and flag-shaped values |

---

## New Findings This Cycle

- **[high] TASK-141-BUG-7** — `blocked` and `na` are now **impossible** against an accepted row. They
  require `--note` (the pre-existing guard), and `--note` is refused on a kept `✅` (cycle 2's guard).
  Reproduced:

  ```
  --set D.1 blocked --note "flag off in test env"
  → uat-status: an accepted row's sign-off note cannot be cleared or overwritten
  ```

  Meanwhile `SKILL.md:181` lists their *Row before* as `any`, `SKILL.md:185` says "A `pass`,
  `blocked` or `na` against an `✅` row **leaves `✅`** and updates only `Last run` and `Notes / bug`",
  and `README.md:99` says the same. Step 2's two documented early exits are dead ends on an accepted
  row, and no stop condition covers the refusal.

- **[medium] TASK-141-BUG-8** *(found by the dispatched reviewer)* — the guard enumerates
  `clear || note` and **omits `bug`**. Reproduced:

  ```
  before: accepted 2026-09-22 — the score posts correctly
  --set D.1 pass --run runs/D.1/r.md --bug docs/bugs/bug.9.x.md   → ✅ accepted (kept)
  after:  [bug.9.x](../bugs/bug.9.x.md)
  --check: 0 errors
  ```

  The owner's sign-off is gone and nothing notices. This is the **same class the guard's own comment
  claims to have eliminated** — "one entry point closed, the other open" — committed inside the fix
  for it.

- **[low] CR3-3** — `README.md:99` carries the same now-false sentence, and `cmdSet`'s comment cites
  that very section as the authority for the demotion rule.

- **[low] CR3-4** — `requireIdValue` was applied to the two readers only, so `--accept` with no id
  gives the subjectless `uat-status: : no registry row`, and `--accept --force` reports
  `--FORCE: no registry row`.

---

## The finding behind the findings

Three cycles have now produced the same shape:

| Cycle | Guard | Door left open |
| :--- | :--- | :--- |
| 1 | `state === "pass" && accepted` | `blocked`, `na` |
| 2 | `kept && (clear \|\| note)` | `bug` |
| 3 | — | *(would be the next flag added)* |

Each fix was correct about the door it had been shown and silent about the ones it had not.
Enumerating the ways into a cell cannot be finished, because the enumeration has to be re-checked
every time a flag is added — and nothing forces that re-check.

**The repair is structural.** The invariant is *the owner's sign-off is never lost*, and the way to
hold it is for the kept path to **append to the note cell rather than replace it** — by construction,
for every flag, present and future. `--clear-note` stays refused, because clearing is not appending.
That also makes `SKILL.md:181/185` and `README:99` true exactly as they are already written: a
`pass`, `blocked` or `na` leaves `✅` and updates `Last run` and `Notes / bug`.

A fourth enumeration of the flags would be the third patch to a mechanism that has now failed twice.

---

## Testing

| Check | Result |
| :--- | :--- |
| `npm test` (symlink aside) | 3934 tests, 0 fail, 1 skipped |
| qa-next suite | 31/31 |
| `npm run validate -- skills/qa-next/` | pass |
| `check:generated`, `bundle --check`, Prettier | clean |
| **CI, all five checks on the pushed branch** | **validate ✅ test ✅ link-check ✅ shellcheck ✅ branch-policy ✅** |

The local `doc-links` failure seen before each cycle's commit is the untracked-target case, twice
confirmed to resolve on commit; CI's `link-check` is green.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two defects in cycle 2's sign-off guard — one closing a documented path, one leaving a
third door open — and the pattern across three cycles says the guard should stop enumerating.
**Quality Score**: 65/100

**Deployment Recommendation**: BLOCKED
**Conditions**: the append rule implemented and covered; README aligned.

---

**Next Steps**: `/qa-fix` — implement the structural append rule rather than a fourth enumeration.
