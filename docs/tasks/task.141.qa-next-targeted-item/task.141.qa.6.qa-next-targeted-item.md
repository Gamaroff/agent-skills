# QA Report: Task 141 - cycle 6 (granted cycle 1 of 2)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.6.qa-next-targeted-item.yml](./task.141.gate.6.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH

---

## Executive Summary

**Cycle 5's HIGH is genuinely closed.** The render/parse round trip was driven through the real CLI
against a literal backslash, an escaped backslash before a pipe, a cell ending in a backslash, and a
note containing both `\|` and a bare `|` — six rewrites each, every byte identical between write 1
and write 6, `cellCount` unaffected, `--check` at 0, and `--item --json` unescaping correctly. That
is the first time in this loop a fix has been verified adversarially rather than by its own test.

Two MEDIUMs, both in cycle 5's *other* fix, and both closed by **one** correction — which is the
first time the cycle's findings have collapsed into a single change rather than a list.

**Gate: CONCERNS.** No HIGH for the second time in three cycles.

---

## Review Methodology

Cycle 6 of 7 (two cycles granted by the operator after the loop-limit escalation). Scoped to the
three files the cycle-5 commit changed. The remit was **bounded** — the four cycle-5 fixes — rather
than open, and the review was dispatched; it returned in 10m32s having driven the CLI over
throwaway corpora and run 13 one-value mutations of the population test.

---

## Re-Review Context — cycle 5's four fixes

| Fix | Verdict | How verified |
| :--- | :--- | :--- |
| **1. `splitCells` unescapes what `renderRow` escapes** | **CLEAN** | Adversarial round-trip through the CLI, six rewrites, four hostile values. The reviewer also established *why* it is a true inverse: only a backslash adjacent to a pipe is ever followed by one, and `renderRow`'s ` \| ` join always puts a space before the delimiter, so a trailing-backslash cell cannot defeat the lookbehind. |
| **2. `checkRegistry` validates every bug link** | **Two defects** | BUG-14 and BUG-15 below |
| **3. `appendNote` is a plain append** | **CLEAN**, but its header comment was not — CR6-3 |
| **4. STATES population test** | **CLEAN**, floor imprecise — CR6-4 |

---

## New Findings — all fixed in-cycle

- **[medium] BUG-14** — validating *every* bug-shaped link on a `fail` row made a **prose URL** a
  hard error: `[bug.1.real](…md) — see [bug.99 discussion](https://example.com/issues/99)` gave
  `bug file not found: https://example.com/issues/99`, exit 1 — a `registry-invalid` HALT on a legal
  registry. The same fixture is exit 0 on `origin/develop`, so it is a regression, not pre-existing.

- **[medium] BUG-15** — `describeRow` publishes `bug` for a row in **any** state, but validation ran
  only on `fail`. A `⏸ blocked` row's stale link passed `--check` at exit 0 while `--item --json`
  handed the skill `../bugs/bug.7.gone.md`, which Step 4 opens. Four of six states unguarded — the
  same class cycle 5's fix claimed to close.

  **One correction closes both**: validate every bug-shaped **repo-relative** link on **every** row;
  keep "a bug link is required" as the `fail`-only extra. `linkTo` only ever emits repo-relative
  paths, so a scheme-qualified or anchor link is a human's prose and must not be a check error.

- **[low] CR6-3** — `appendNote`'s *header* comment still described the suppression cycle 5 removed,
  contradicting the body comment three lines below it. The fifth cycle in which a rule was stated
  twice and one statement updated — this time both inside the same function. Deleted.

- **[low] CR6-4** — the population test's non-vacuity floor was the literal `10`. It does catch a
  skipped state (verified by mutation), but a sixth state added correctly to both `STATES` and
  `RULES` would red on the floor with a message pointing at the wrong thing. Derived from the table.

---

## Pre-existing, filed separately — and it explains two earlier confusions

The `main` guard compares `resolve(process.argv[1])` against `fileURLToPath(import.meta.url)`, so
invoking the script through a **symlinked path** — which includes every macOS `mktemp -d` copy, since
`/var` → `/private/var` — makes the whole CLI a **silent no-op at exit 0**. Reproduces identically on
`origin/develop`; untouched by this branch, so it is in `recommendations.future` and not in
`top_issues[]`, per the provenance rule.

It is worth recording because it cost this review two confusing probes — and, earlier in this loop,
it is why a cycle-4 provenance check against the base tool appeared to "do nothing": the base tool
was running from `/tmp`. A silent no-op and a clean pass are byte-identical from the caller's side,
which is the same confusion the `empty` / `scan-broken` split exists to prevent elsewhere in this
repository.

---

## Verification

| Mutation | Test that went red | Outcome |
| :--- | :--- | :--- |
| M30 the prose-URL skip removed | every-bug-link | `covered` |
| M31 validation back to `fail` rows only | every-bug-link | `covered` |
| M32 a state skipped by the population loop | STATES population | `covered` |

32 mutations across six cycles; none survived. 39 tests, `npm test` 3942 green, `validate` green,
`check:generated` / `bundle --check` / Prettier clean.

---

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 80/100 · **Deployment**: CONDITIONAL, cleared by the
in-cycle fixes.

**Next**: cycle 7 — the last granted cycle — to gate this cycle's three fixes. The trend is the
right way: cycle 5 found five defects, cycle 6 found four, two of which collapsed into one
correction, and no HIGH.
