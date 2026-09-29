# QA Report: Task 141 - cycle 9 (granted 2 of 2, second grant — the last budgeted cycle)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.9.qa-next-targeted-item.yml](./task.141.gate.9.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH, fifth gate running

---

## Executive Summary

Cycle 8's fix holds on the axis it was written for. Wherever `--check` exits 0, the published `bug`
is now the exact string `exists` was called on. There are two new findings, and one of them is not
from the previous fix.

- **BUG-21** was introduced by the **original feature commit** and missed by all eight earlier
  gates. The payload's `bug` is relative to the registry, but `--bug` takes a repo-relative path.
  SKILL.md Step 4's repeat-failure flow (read `bug`, then link the same bug again) therefore writes
  `../../../bugs/…` and turns `--check` red. The published value was checked against the validated
  value on four different axes, but never against the value the skill feeds it back into.
- **BUG-20** comes from cycle 8's fix. `BUG_LINK_RULE` says the target is "repo-relative", but the
  checker resolves it against the registry's own directory, so a link written the way the rule
  describes fails. The test written to hold the rule pins that wrong word.

---

## Review Methodology

Direct tools plus **one dispatched read-only reviewer** (Explore, the shared code-review prompt
verbatim, with a cycle-specific refute focus appended). It returned in 2m25s and ran the real script
on 13 fixture rows. Each bug finding was then reproduced here by execution, on HEAD and on earlier
commits for provenance.

```
Re-review scope: since 2026-09-23T04:28:04Z (default) — 4 code files; focus commit d3620877
```

The default scoping worked this cycle because gate 8's `updated:` came from `date -u` (compare
cycle 8 and obs #165).

**Step 4b** ran: `skills/qa-next/SKILL.md` changed. Result: `no-executable-blocks` (information).
All 5 bash blocks are correctly refused as side-effecting (3 write redirections, 2 `node` calls),
and none of them is in this cycle's diff. bash and zsh are both available.

---

## Re-Review Context — cycle 8's fixes

| Fix | Verdict |
| :--- | :--- |
| BUG-18: `bugLinkPaths` is the one value both sides consume | **HOLDS.** No path reads, publishes or validates a Notes bug link outside it. Wherever `--check` exits 0, the published path is the verified path. **But** the value is in the registry's coordinate system, and the flag it is fed back into uses the repo's (BUG-21, pre-existing) |
| BUG-19: one `BUG_LINK_RULE`, quoted verbatim | **PARTIAL.** There is now one wording, enforced, and the warnings sentence is back. The wording says "repo-relative", which is wrong about the resolving base (BUG-20) |
| CR8-3: `#` is a fragment, by decision | **Not overturned.** The rule states it, and the error names the path it checked |

---

## New Findings This Cycle

- **[medium] BUG-20** `skills/qa-next/scripts/uat-status.mjs:543`: the rule says "repo-relative",
  but resolution is relative to the registry. Measured: `[bug.1.real](docs/bugs/bug.1.real.md)`
  gives `--check` rc 1. The rule-once test asserts `/repo-relative/`. → Say "relative to the
  registry file", and hold each clause to `--check` behaviour with a table-driven test.
- **[medium] BUG-21** `skills/qa-next/scripts/uat-status.mjs` (payload) / `SKILL.md:169`:
  `bug` does not round-trip through `--bug`. Measured at HEAD, `c5efbe9b` and `9efe0d22` alike:
  `--set D.1 fail --bug ../bugs/bug.1.real.md` writes `../../../bugs/bug.1.real.md`, and `--check`
  rc is 1. → Publish `bug` in the coordinate system `--bug` accepts, and test the round trip.
  *Rated MEDIUM, not HIGH*: it fails loudly, since `--check` catches it before commit, and only the
  repeat-failure path is affected.

**Pre-existing, routed to `recommendations.future`** (identical on `origin/develop`): **CR9-3**. A
bug link to a **directory** passes `--check` (`existsSync`) and is published as `bug`.

**Advisory** (not gated): **CR9-4**. The rule-once test ties the constant to behaviour only through
keywords, so the fix for BUG-20 should replace them. **CR9-5**. The CR7-3 test hard-codes
`docs/qa` instead of deriving the registry directory.

---

## Code Review

**Correctness bugs (4):**
- [medium/high] `uat-status.mjs:543`: the rule names the wrong base → **TASK-141-BUG-20**
- [medium/medium] `SKILL.md:169`: `bug` does not round-trip through `--bug` → reproduced, **raised by
  QA as TASK-141-BUG-21**
- [low/medium] `uat-status.mjs:478`: a directory passes `exists` → pre-existing, future (CR9-3)
- [low/medium] `uat-status.test.mjs:1844`: the rule-once test pins keywords, not behaviour →
  advisory, folded into BUG-20's action

**Cleanups (1):** `uat-status.test.mjs:1830`: derive the registry directory from `REG(root)`.

Mutation spot check: cycle 8's six fixes were proved in 5b (M35–M40, 6 of 6 red). This cycle
re-uses that record. BUG-20's finding means that one of those proofs (M39) pinned a word the rule
should not have used, so the "covered" it recorded was coverage of the wrong claim.

---

## Test Artifacts

```bash
ci:fast (at d3620877)          # 3945 tests, 3944 pass, 0 fail, 1 skipped
qa-execute-snippets --file skills/qa-next/SKILL.md --json   # no-executable-blocks, 5 refused
```

---

## NFR Assessment

- **Security — PASS** · Evidence: reasoned · Probes executed: 0 (probe engine).
- **Performance — PASS**.
- **Reliability — CONCERNS** — BUG-21.
- **Maintainability — CONCERNS** — BUG-20.

---

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 80/100 · **HIGH**: 0 · **MEDIUM**: 2

This is the last budgeted cycle. The loop goes on to 5b to fix both findings. After that the budget
is spent, and the fixes will have no gate.

---

## Bug Resolution Summary — fixed in-cycle (5b)

| Finding | Fix | Proof |
| :--- | :--- | :--- |
| **BUG-21** | `repoPathOf(opts, p)` is **one** registry→repo conversion, used by `--check`'s `exists` and by `describeRow`. `bug` is now repo-relative (`docs/bugs/bug.1.real.md`): it opens from the repo root and round-trips through `--bug`. A new test follows SKILL.md Step 4 literally (read `bug`, `--set fail --bug <bug>`) and requires `--check` to stay green. SKILL.md Steps 3 and 4 describe `bug` as the repo-relative path in the form `--bug` takes, and no longer claim it was "verified" | M41 (publish registry-relative again) → 7 tests red, the round trip among them; M42 (`exists` resolves from the repo root) → 12 red, the clause test among them |
| **BUG-20** | `BUG_LINK_RULE` now says "a path relative to the registry file", identically in the README. The keyword regexes are replaced by a **table-driven clause test**: one registry row per clause, run through `--check`, and for each prose clause the published `bug` must be `null`. The README check is anchored to the `--check enforces` paragraph. The CR7-3 test and two test titles no longer say "repo-relative" about a registry link | M43 (`//host` not skipped) → red; M45 (only fail rows validated) → red; M46 (rule says "repo-relative" again) → red; **M44** (anchor-only skip removed) at first **survived**: `#nine` resolved to `""`, the registry directory, which exists (CR9-3). Closed by asserting the published `bug` per clause, and now red |

The M44 survival is itself evidence for CR9-3 (a directory passes `exists`). It stays pre-existing and
routed to future, but it is no longer only theoretical.

Probe matrices re-run. The cycle-8 matrix is unchanged apart from `bug` now being repo-relative. The
cycle-9 round trip `--set D.1 fail --bug docs/bugs/bug.1.real.md` writes `../bugs/bug.1.real.md`,
and `--check` returns 0. qa-next suite 44/44.
