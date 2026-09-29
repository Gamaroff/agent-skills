# QA Report: Task 141 - cycle 10 (third grant, one cycle — gate the cycle-9 fix)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.10.qa-next-targeted-item.yml](./task.141.gate.10.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: PASS — no HIGH, no MEDIUM; three LOW carried to future (route 2b)

---

## Executive Summary

This is the first cycle on this branch whose review found **no defect** in the previous fix. The
dispatched reviewer ran the real tool against **seven `--registry` layouts**: the default,
`qa/reg.md`, a root-level `uat-registry.md`, two `./`-prefixed forms, a `..`-normalised path and a
deep subdirectory. It also ran with `--root` away from the cwd and with cwd `/`. In every case the
payload's `bug` was `docs/bugs/bug.1.real.md`, it opened from the repo root, the `--set … fail
--bug` round trip exited 0, and `--check` was green before and after. It also confirmed
`join(root, registryDir, rel) === join(root, repoPathOf(rel))` for `../../../x`, `/x`, `.`, `''`
and a `.` registry directory.

It returned three LOW cleanups, all about test strength and comment accuracy, and no runtime
defect. The route classifier took the **Cosmetic-residue exit** (route 2b), so the loop hands to 5c
`/review-pr`.

---

## Review Methodology

Direct tools plus one dispatched read-only reviewer (Explore, the shared code-review prompt
verbatim, with a cycle-specific refute focus appended). It returned in 2m45s after 15 tool calls,
exercising 7 registry layouts. Each LOW claim was verified here against the code.

```
Re-review scope: commit a6b9b94b (operator-granted cycle) — uat-status.mjs, README.md, SKILL.md, uat-status.test.mjs
```

**Step 4b** ran: `skills/qa-next/SKILL.md` changed. Result: `no-executable-blocks`, with 5 blocks
correctly refused (unchanged from cycle 9).

---

## Re-Review Context — cycle 9's fixes

| Fix | Verdict |
| :--- | :--- |
| BUG-21: `repoPathOf`, one registry→repo conversion for `--check` and the payload | **HOLDS** across 7 registry layouts and an away-from-cwd `--root`. `printRow` never prints `bug`; `--next` and `--item` share `describeRow`; no instruction copies `bug` into a run-file-relative `Filed as` cell |
| BUG-20: the rule names its real base, held clause by clause | **HOLDS.** The clause table exercises every clause through `--check`. One weakness (CR10-2): the prose `null` column runs only on `⏸` rows |

---

## New Findings This Cycle

- **[low] CR10-1** `evals/qa-next/unit/uat-status.test.mjs`: the round-trip test's seed row is
  byte-identical to what `--set` writes back, so its "written back" regex cannot fail. Its value and
  `--check` assertions do hold the defect (M41 reds it).
- **[low] CR10-2** same file: the prose `bug: null` column runs only on `⏸` rows, so it cannot tell
  a skip apart from a row-state gate.
- **[low] CR10-3** `skills/qa-next/scripts/uat-status.mjs`: two comments still claim the published
  path *is* the checked path; it is now `repoPathOf` of it. One header line was also not reflowed.

All three were carried to `recommendations.future` by id (route 2b) and closed in `top_issues`.

---

## Test Artifacts

```bash
ci:fast (at a6b9b94b)     # 3947 tests, 3946 pass, 0 fail, 1 skipped; CI 5/5 green on 33766f11
qa-execute-snippets --file skills/qa-next/SKILL.md --json   # no-executable-blocks
```

---

## NFR Assessment

- **Security — PASS** · Evidence: reasoned · Probes executed: 0 (probe engine).
- **Performance — PASS**.
- **Reliability — PASS**: BUG-21 verified closed.
- **Maintainability — PASS**: BUG-20 verified closed; three LOW cleanups deferred.

---

## Final Assessment

**Gate**: PASS · **Quality Score**: 100/100 · **HIGH**: 0 · **MEDIUM**: 0 · **LOW**: 3 (carried)

`describeLoopRoute`: Cosmetic-residue exit taken. PASS gate at cycle 10 with HIGH 0 for cycles 9
and 10; all 3 open findings are LOW and are carried to the gate's recommendations.future by id.
