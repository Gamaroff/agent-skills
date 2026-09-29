# QA Report: Task 141 - `/qa-next <id>` — cycle 2 (refute pass)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.2.qa-next-targeted-item.yml](./task.141.gate.2.qa-next-targeted-item.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's three fixes are all correct, and each was verified by execution rather than by reading.
Cycle 2 found three new things, and one of them is why this gate is FAIL: **CI's `validate` job is
red** on the frontmatter description, which has contained angle brackets since the argument was first
documented and which no gate the pipeline runs would have caught.

The second finding is the one this cycle exists for. The BUG-1 fix was right, and it made **two
sentences in the same file false** — `SKILL.md` still tells the agent that only a `fail` moves an
accepted row, which is precisely what the fix changed.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Cycle 2, so the diff scope is the **whole branch** (`origin/develop...HEAD`, 4701 lines) reviewed to
**refute**, per the loop's cycle-2 rule — a narrowed cycle-2 review reads only cycle 1's repairs and
never re-reads the original change with what cycle 1 learned.

`SAFETY_REPROBE` evaluated from gate 1's security axis: `OK reasoned` → **not** triggered.

**Re-review scope: unscoped (cycle 2 refute rule).**

> **Correction — the reviewer completed; an earlier draft of this report said it had not.** The
> refute reviewer was dispatched with the full directive and the three cycle-1 fixes named as its
> first targets. While waiting, this step performed its own inline pass. The reviewer then returned
> at **5m56s**, well inside its budget, having run the suite itself (30/30) and read the tool at
> line level. An earlier draft of this report recorded it as *killed at ~12 minutes* with
> independence lost; **that was wrong** — the elapsed time was misjudged from polling, not measured,
> and the reviewer's own duration is the measurement. Independence was **not** lost.
>
> The two passes are reported together below, attributed. That matters, because the independent pass
> found **two MEDIUM defects the inline pass did not** — and one of them, CR2-4, is a defect the
> inline pass had actually *seen* in a cycle-0 smoke test and reasoned away as specification-conformant.
> The value of the independent reviewer is visible precisely in the two findings the author could
> not reach, which is the argument for dispatching it.

---

## Re-Review Context — cycle 1's findings

| Finding | Severity | Status | How verified |
| :--- | :--- | :--- | :--- |
| TASK-141-BUG-1 — `untested` kept on an accepted row | HIGH | **FIXED** | The full **6×5 matrix** — every verdict (`pass`, `fail`, `blocked`, `na`, `untested`) against every prior state (`untested`, `pass`, `fail`, `blocked`, `na`, `accepted`) — executed against a fixture registry. `accepted` keeps `✅` for exactly `pass`/`blocked`/`na` and moves for exactly `fail`/`untested`; every non-accepted prior state moves for every verdict. `--check` green on all thirty. Mutation-proved (M11). |
| TASK-141-BUG-2 — template named the colliding evidence path | MEDIUM | **FIXED** | Both placeholders read `<run-file-basename>`. The new agreement test was checked for the failure mode it could plausibly have — it catches drift in **both** directions: reverting `SKILL.md` (not just the template) turns it red. Mutation-proved (M13). |
| CR-4 — `--env` ending in `-NN` inverted the ordering | LOW | **FIXED** | `runPathFor` throws `UsageError`; `main` catches it; the CLI exits 2 with the message. Verified that the refusal does **not** bypass the throw-never-exit discipline. Mutation-proved (M12). One residue — see CR2-3. |
| CR-3 — `--set` exits 0 whether kept or moved | LOW | **OPEN (advisory)** | Unchanged by design; carried forward in `recommendations.future`. |

---

## New Findings This Cycle

- **[high]** `skills/qa-next/SKILL.md` (frontmatter `description`) — **CI `validate` is red**:
  `✗ qa-next — Description cannot contain angle brackets (< or >)`. The description gained
  `/qa-next <id>` when the positional argument was documented. Reproduced locally:
  `python3 skills/create-skill/scripts/quick_validate.py skills/qa-next/`.
  → Replace `<id>` with a concrete example id. **TASK-141-BUG-3.**

  The reason this reached CI: `npm run validate` is the one of the four commands in
  `docs/architecture/concepts/coding-standards.md` § "Validation before commit" that `npm test` does
  **not** subsume, and no pipeline gate runs it — not this skill's Step 4, and not the task's own
  Code Quality criteria, which list the other three. Logged as an observation against `qa-task` and
  `create-task`.

- **[medium]** `skills/qa-next/SKILL.md:185` and `:243` — two sentences made **false by cycle 1's own
  fix**. Step 4 says *"Only a `fail` moves it, and it moves it from any state"*; the never-does list
  says *"Only a failure moves an accepted row"*. After BUG-1, `untested` moves an accepted row too —
  deliberately, as the documented demotion. `README.md:99` carries the same sentence but follows it
  immediately with *"To demote one deliberately, `--set <id> untested --note "<why>"` first"*, so it
  is incomplete rather than contradictory; `SKILL.md` has no such qualifier and is executed prose.
  → Name the demotion beside the fail in both. **TASK-141-BUG-4.**

  This is the documentation-transition probe the refute pass names: *what did this edit make false
  elsewhere?* The diff does not show the neighbours, which is why they are the blind spot.

- **[medium]** `skills/qa-next/scripts/uat-status.mjs` (`cmdSet`, the kept-`✅` note block) — **the
  sign-off guard is defeated through a different door.** `--clear-note` is refused on a kept `✅`
  because that cell holds `--accept`'s `accepted <date> — <why>` and `--check` would not notice its
  loss. One command later, `--set <id> blocked --note "<why>"` — a verdict that *mandates* `--note`,
  and one of the two the skill's own Step 2 early exits write — **replaces that same cell**, keeps
  `✅`, and leaves `--check` green. Reproduced:

  ```
  --clear-note → uat-status: --clear-note cannot clear an accepted row's sign-off note
  --set blocked --note "flag off in test env" → ✅ accepted (kept)
  notes cell: "accepted 2026-09-22 — the score posts correctly"  →  "flag off in test env"
  ```

  This is the *same failure shape* as the original defect the kept rule was written to avoid:
  guarding one entry point leaves the loss reachable through another. The cycle-1 test loops
  `blocked` and `na` but asserts only the state cell, never the note cell, so the guard is coherent
  for the verdict it tests and defeated for the two it does not.
  → Refuse `--note` on a kept `✅` for the same reason `--clear-note` is refused, and assert the note
  cell in those legs. **TASK-141-BUG-5.** *(Found by the dispatched reviewer. The inline pass saw
  this exact behaviour in a cycle-0 smoke test and reasoned it away as conformant with "updates only
  Last run and Notes / bug" — which it is, and which is what makes the specification itself
  incoherent with its own guard.)*

- **[medium]** `skills/qa-next/scripts/uat-status.mjs` (`updateRow`) — **the case-insensitivity the
  Arguments table promises covers only the two commands this task added.** `normaliseId` is applied
  in `cmdItem` and `cmdRunPath`; `updateRow` still compares `r.id === id` raw, so `--set`,
  `--accept`, `--items` and `--automated` all reject a lowercase id. Reproduced end to end:

  ```
  --item d.1      → D.1                          (resolves)
  --run-path d.1  → runs/D.1/2026-09-22-lan.md   (resolves)
  --set d.1 pass  → uat-status: d.1: no registry row
  --accept d.1    → uat-status: d.1: no registry row
  ```

  A run that carries the owner's spelling through to Step 4 fails at the **recording** step, after
  the function has been exercised and the run file written — the worst moment to fail. `--accept` is
  the owner's own command, typed by a human, where a lowercase id is likeliest of all.

  The finding is the **missing population check**, not the four sites: each is correct in isolation
  and every test passes, because the lowercase assertions were written against exactly the two
  commands that normalise. The population is *every command that takes a row id* — `--item`,
  `--run-path`, `--set`, `--accept`, `--items`, `--automated` — and nothing enumerated it.
  → Normalise once in `updateRow`, the single writer, and add a test that enumerates all six.
  **TASK-141-BUG-6.** *(Found by the dispatched reviewer.)*

- **[low]** `skills/qa-next/scripts/uat-status.mjs` (`cmdItem`) — a bare `--item` (or `--item --json`)
  resolves to an empty or flag-shaped id and reports `uat-status: : no registry row` with **exit 4**,
  so "you named no row" and "you named a row that is not there" collapse to one answer — and Step 1
  maps exit 4 to `STOP unknown-item`, the wrong stop for a malformed call. The cycle-1 contract test
  asserts `run(root, "--item").code === 4`, which **enshrines the conflation**.
  → Exit 2 for a missing or flag-shaped value; keep exit 4 for a well-formed id with no row, and fix
  that assertion. **CR2-5**, non-blocking. *(Found by the dispatched reviewer.)*

- **[low]** `skills/qa-next/scripts/uat-status.mjs` (`cmdRunPath`) — `mkdirSync(dir, …)` runs
  **before** `runPathFor` validates `--env`, so a refused ambiguous label still creates an empty
  `runs/<id>/`. Reproduced: `--run-path D.1 --env ci-02` exits 2 and the directory exists afterwards.
  A refusal that writes is a refusal the caller cannot trust; the skill states elsewhere (exit 4)
  that a refusal writes nothing. → Compute the path first, create the directory on the success path
  only. **CR2-3**, non-blocking.

---

## Refuted — suspicions that did not survive execution

Recorded because a refute pass that reports only what it found, and not what it cleared, invites the
next cycle to re-investigate the same three things.

*(All three refutations below are the inline pass's. The dispatched reviewer independently reported
the same two defects the inline pass found — SKILL.md's false sentences and the `mkdirSync`
ordering — which is convergence, not duplication.)*

1. **"The agreement test can pass vacuously, or only catches drift in one direction."** It does
   neither. Its non-vacuity floor requires ≥1 match in `SKILL.md` and ≥2 in the template before it
   compares anything, and reverting *either* file reds it.
2. **"The kept predicate admits some other state wrongly."** The full 6×5 matrix was executed. It
   does not; the behaviour matches the specification cell for cell.
3. **"`die()` from a pure function bypasses the CLI's error handling, or the refusal is unreachable
   for direct callers."** `runPathFor` throws `UsageError` with `code: 2` for a direct importer, and
   through `main` the CLI exits 2 with the message and stdout drains.

One suspicion was **confirmed** — the refusal's placement relative to `mkdirSync` — and is CR2-3.

---

## Testing

| Check | Result |
| :--- | :--- |
| `npm test` (symlink moved aside) | 3933 tests, 0 fail, 1 skipped |
| `evals/qa-next/unit/uat-status.test.mjs` | 30/30 |
| `npm run check:generated` | clean |
| `npm run bundle -- --check` | 129 skills, 0 problems |
| Prettier | clean |
| **`npm run validate -- skills/qa-next/`** | **FAIL — angle brackets (BUG-3)** |
| CI `test` / `link-check` / `shellcheck` / branch-policy | pass |
| CI `validate` | **fail** |

The dead-link failure seen locally before the cycle-1 commit was the **untracked-target** case, not a
real dead link: the task document linked to the QA report and gate while both were still untracked,
and the corpus check reads the tracked tree. It resolved on commit, and CI's `link-check` is green.

**Step 4b**: not re-run — no fenced ```bash block changed this cycle (the cycle-1 edits touched the
tool, the template's placeholders and the test suite). Cycle 1's result stands:
`no-executable-blocks`, 5 blocks all correctly refused as mutating.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: CI is red on a check no pipeline gate runs, and the skill's executed prose now
contradicts the tool on the exact behaviour cycle 1 corrected. Both are small; both are the kind of
thing that ships if the gate is generous.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CI `validate` green; TASK-141-BUG-4 fixed.

---

**Next Steps**: `/qa-fix` on BUG-3 and BUG-4 (and CR2-3, which is cheap), then cycle 3 — with the
review **dispatched**, not inline.
