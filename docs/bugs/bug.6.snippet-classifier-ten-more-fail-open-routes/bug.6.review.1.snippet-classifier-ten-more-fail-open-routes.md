---
type: review-report
status: accepted
description: 'Fix-readiness review of bug.6 (snippet classifier fail-open routes) — validate-and-apply mode, run as develop-bug Step 2.'
created: '2026-09-05'
updated: '2026-09-05'
reviews: 'bug.6.snippet-classifier-ten-more-fail-open-routes'
mode: 'validate-and-apply'
---

# Bug Review — bug.6.snippet-classifier-ten-more-fail-open-routes

## Executive Summary

```
Bug: bug.6.snippet-classifier-ten-more-fail-open-routes (general)
Fix-readiness: 10/10 — ✅ READY TO FIX   (was 6/10 before fixes were applied)
Critical: 4  Important: 9  Optional: 1   (all applied)
Duplicate: none          Reproduces: likely (confirmed — executed, not inferred)
Top blockers: none
```

**Score breakdown (post-apply):** Completeness 10 · Reproducibility 10 · Classification 10 · Linkage 9 → **10**.
Pre-apply the same axes scored 5 · 9 · 10 · 8 → **8** on the raw average but gated to 6 by four Critical
template gaps.

## Pre-pass results

**Duplicate scan — `duplicate: none`.** bug.6 is the only open bug touching `classifyBlock()`. The two
predecessors it cites are `task.67.bug.1` (13 inputs) and `task.67.bug.3` (14 inputs), both closed, and
both input sets are **disjoint** from bug.6's. The general `docs/bugs/bug.1` and `docs/bugs/bug.3` are
unrelated subjects (Jira status mapping; `process.exit()` stdout truncation) — the citation in the
original filing was ambiguous and has been corrected. `bug.7` is the nearest open neighbour and is
complementary, not overlapping: it concerns the `zero-blocks-executed` finding firing on *correct*
refusals, and disputes no classification verdict.

**Already-fixed / stale scan — `reproduces: likely`, upgraded to *confirmed* by execution.** All
thirteen claimed inputs were run through `classifyBlock` directly at HEAD `c9a6be3d`; all thirteen
misclassify. The source read independently confirms each with a deciding line. No route is closed by an
existing passing test.

## Findings

### Critical (4) — all applied

| # | Finding | Resolution |
|---|---------|------------|
| C1 | No `## Developer Fix Cycle` section — the section Step 3 writes into did not exist | Stub added |
| C2 | No `## Status History` table | Added, seeded with the filing row and this review's row |
| C3 | No `## Resolution Summary` section — the section that closes the bug | Stub added |
| C4 | No explicit Expected vs Actual behaviour. The tables implied both but neither was stated | Both added under `## Bug Description` |

### Important (9) — all applied

| # | Finding | Resolution |
|---|---------|------------|
| I1 | Frontmatter missing `related` | `related: 'none — cross-cutting (no single owner)'` |
| I2 | Body missing the `**Bug ID**` / `**Related**` / `**Created**` header block | Added |
| I3 | Reproduction had no **Environment** | macOS/Node 20+, repo at `c9a6be3d`; noted `classifyBlock` is pure |
| I4 | No **Frequency** / **Reproducible** fields | Always / Yes — deterministic, no I/O, clock or randomness |
| I5 | No `## Evidence` section and no **Related Files** | Added: full probe output for 13 claims + 7 controls, plus the six affected files |
| I6 | General-bug mode requires a `## Scope & Impact` heading; the report had a bare `## Impact` | `## Scope & Impact` added with affected area, why it is cross-cutting, and how the contract failed. The `## Impact` prose moved into `## Bug Description` as **Impact** |
| I7 | Reproduction steps were a single unnumbered code block against a historical commit, not numbered steps against HEAD | Rewritten as 5 numbered steps, HEAD first, historical commit retained as step 5 |
| I8 | **Accuracy — the report's `elif` claim is wrong.** It stated "`elif` and `!` are **not** vulnerable — both probed and correctly refused". `elif touch /tmp/x; then echo hi; fi` classifies `runnable` | Claim removed; Root cause A now carries the empirically verified swallowing-keyword set (see below) |
| I9 | **Accuracy — ambiguous citation.** "bug-1 found 13 routes, bug.3 found 14 more" reads as the general bugs of those numbers, which are unrelated | Disambiguated to `task.67.bug.1` / `task.67.bug.3` with an explicit note |

### Optional (1) — applied

| # | Finding | Resolution |
|---|---------|------------|
| O1 | The report says "twelve" but claims thirteen inputs (10 numbered fail-open + 1 unnumbered heredoc + 2 over-refusals) | Count note added. Title kept — the registry, roadmap and `task.73` record all use "twelve" |

## The `elif` correction (I8), in full

The original filing named three swallowing keywords (`if`, `while`, `until`) and explicitly exempted
`elif`. Re-probing the whole keyword family against HEAD shows the exemption is wrong and the set is
larger. The rule is mechanical: a keyword the segment splitter **splits on** correctly exposes the
command after it; a keyword in `SHELL_KEYWORDS` that is **not** a split point swallows its segment.

| Swallows (→ `runnable`, wrong) | Correctly refuses (→ `mutating`) |
|---|---|
| `if`, `elif`, `while`, `until`, `for`, `case`, `esac`, `done`, `fi`, `function` | `then`, `else`, `do`, `time`, `coproc`, `!`, `{`, `(` |

Confirming constructs: `case x in a) touch /tmp/x;; esac` → `runnable`; `for f in a b; do touch /tmp/x; done`
→ `mutating` (the `do` splits it); multi-line `if true; then\n  touch /tmp/x\nfi` → `mutating` (the
newline after `then` splits it).

**Consequence for the fix:** adding `if`/`while`/`until` to the splitter — which is what the report's
own "Suggested fix" step 1 says — would leave `elif`, `for` and `case` open. The fix must scan every
command in a segment, not extend a name list. This is the single most important correction in this
review.

## Constraints the fix must respect (carried into Step 3)

1. **`qa-execute-snippets.test.mjs:498` currently asserts `if command -v zsh >/dev/null 2>&1; then echo yes; fi`
   is `runnable` — and it passes only because of claim #1's mechanism.** That input is genuinely
   read-only, so the assertion is right and must stay green; after the fix it must pass for the right
   reason (the segment is scanned and found safe, `/dev/null` exempted), not because `if` cleared it.
2. **Widening `WRITE_REDIRECT`'s pre-context must not break `2>&1` or `>/dev/null`.** The existing
   spaced-redirect assertions at `:385–388` are the counterweight.
3. **Narrowing the generic `-o` rule must not un-refuse `sort -o` / `git ... --output=`.** Assertions at
   `:586` and `:600`, and the `BUG3_ROUTES` corpus entry `sort --output=/tmp/x file.txt`, are the
   counterweight.
4. **`BUG3_ROUTES` in `evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` is
   shrinkage-guarded (14 entries, guard at `:75–87`).** New inputs must be added without disturbing
   that guard.
5. **Five bundled copies must be regenerated** via `npm run bundle` — never edited directly.
6. **`task.79` (security-input-corpus, `ready-for-development`) plans a shared adversarial corpus seeded
   from these very inputs.** Add the regression cases to the existing corpus rather than building a new
   one, so task.79 has something to consolidate rather than a competing fixture set.

## Next Steps

Proceed to `develop-bug` Step 3 (investigate & fix). Address root causes A–D as four changes, not
thirteen patches, and add every claimed input plus the `elif`/`for`/`case` variants to the existing
attack corpus.
