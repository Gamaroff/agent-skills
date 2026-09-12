---
type: review-report
subject: 'bug.13.change-log-unmigrated-path-drops-prose'
mode: validate-and-apply
recommendation: ready-to-fix
score: 10
reviewed: '2026-09-12'
---

# Bug Review — bug.13.change-log-unmigrated-path-drops-prose

**Mode:** validate-and-apply (invoked by `/develop-bug` Step 2, autonomous run via `/develop-next`)
**Reviewed:** 2026-09-12 on `bugfix/bug.13.change-log-unmigrated-path-drops-prose` (base `develop` @ `f8e12200`)

## Executive Summary

| | |
|---|---|
| **Fix-readiness** | **10/10 — ✅ READY TO FIX** |
| Completeness | 10/10 |
| Reproducibility | 10/10 |
| Classification | 10/10 |
| Linkage | 10/10 |
| Critical / Important / Optional | 0 / 0 / 0 |
| Duplicate | none |
| Reproduces | likely — **confirmed by execution** |

## Pre-pass

The two pre-pass scans were run **in-line** rather than as Explore subagents: the report carries an executable reproduction recipe, and executing it is stronger evidence than a read-only scan of the source.

**Duplicate scan:** `docs/bugs/bug-registry.md` has exactly one row mentioning the change-log engine (row 42 — this bug). No sibling directory under `docs/bugs/` targets `change-log.js`. → `duplicate: none`.

**Already-fixed / stale scan:** ran the report's Step 1–3 recipe verbatim against `shared/resources/change-log.js` at `develop` @ `f8e12200` (engine last touched `99c556b0`):

```
findChangeLog => {"start":72,"end":272,"level":2,"legacyAuthor":"","hasMarkers":false}
```

```diff
14,15d13
< AUTHORING NOTE prose.
<
21,24d20
< ### Nested
<
< Nested body.
<
```

The prose paragraph and the nested `###` block are dropped; the table rows, the appended row and the following `## Next Section` survive. This matches the report's Evidence section line for line. → `reproduces: likely`.

## Findings by Dimension

### Template & Frontmatter Compliance — no findings

All required sections present: Bug Description (Summary / Expected / Actual / Impact), Reproduction Steps, Evidence, **Scope & Impact** (the general-mode violation heading), Developer Fix Cycle (stub), Status History, Resolution Summary (stub). Frontmatter carries `type: bug`, `status: new`, `severity: Major`, `priority: High`, `created`, `updated`, `related`, `description`, and now `github_issue: 389`. Filename ↔ directory ↔ body `Bug ID` ↔ registry row all agree on `bug.13`.

### Reproducibility — no findings

Three numbered steps, each an action a developer can take; the probe document and the engine call are given verbatim. Environment stated (any; `command node` v26; no tracker or network). Expected and Actual are explicit and distinct. `Frequency: Always`, `Reproducible: Yes`. Evidence is the real diff plus the `findChangeLog` span, which is what makes Step 3 root-cause localisation immediate — the report already names the two functions and the approximate lines.

### Severity / Priority — no findings

Silent, unrecoverable-by-the-writer content loss on a documented input, hit exactly once by every legacy document at a moment no one reads the diff. `Major` is correct (not Blocker — table rows and the rest of the document survive, and the loss is recoverable from git). `High` is correct.

### Mode & Linkage — no findings

General bug: registry row 42 exists with `new` / Major / High / 2026-09-12, consistent with the frontmatter. `related` correctly reads cross-cutting. The report's own Related Files section points at the engine, its test file, and the spec.

## Applied Fixes

None required. The bug lifecycle `status` was not touched (stays `new`; develop-bug Step 3 moves it).

## Next Steps

Proceed to develop-bug Step 3. The report's Recommendation section is a sound fix plan: carry every non-row line of the span through verbatim on the `hasMarkers:false` path, add the prose + nested-`###` test for both marker states, mutation-prove it, and confirm the eight `sync-*` suites do not move.
