# PR Review Report: PR #652 — fix(select-next): document column must name a work item inside the repo (bug.19 DoD gaps)

**Reviewed:** 2026-10-14
**PR:** [#652](https://github.com/Gamaroff/agent-skills/pull/652) — `bugfix/bug.19.registry-tick-malformed-row-reported-as-no-row` → `develop` (OPEN)
**Work item:** [`bug.19.registry-tick-malformed-row-reported-as-no-row.md`](bug.19.registry-tick-malformed-row-reported-as-no-row.md) — resolved via `branch stem`
**Tracker:** [#643](https://github.com/Gamaroff/agent-skills/issues/643) — CLOSED (by PR #651)
**Verdict:** ⚠️ CONCERNS

**Scope:** the full diff, 7 files. The default `*/references/*` exclusion was not applied: the only
`references/` file in the diff, `skills/develop-next/references/roadmap-selection.md`, is authored,
not a bundled copy, and the PR body names it.

---

## Artifact Trail

| Artifact              | Status | Detail                                                                                                                                         |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation report | ❌     | none — a general bug fixed on a plain branch, not through `/develop-bug`; the fix record is in the bug file (Iterations 1–2)                    |
| Review report         | ❌     | none — no `/review-bug` run                                                                                                                    |
| QA reports            | 0      | the QA record is the bug file's `#### QA Verification`; Iteration 2's is pending DoD run 2                                                     |
| Gate                  | —      | none — bugs carry no gate file                                                                                                                 |
| DoD                   | ✅     | `bug.19.dod.1.registry-tick-malformed-row-reported-as-no-row.md` (❌ GAPS, 4) — this PR addresses gaps 1–3; this review is gap 4                |
| Sprint review         | —      | not applicable to a bug                                                                                                                        |
| Open bugs             | 0      | —                                                                                                                                              |
| Handover              | —      | none                                                                                                                                           |

## Acceptance Criteria Traceability

| Criterion (DoD run 1 gap)                                    | Evidence in diff                                                                                                 | Status     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| 1. CHANGELOG `[Unreleased]` cites `(bug 19)`                 | `CHANGELOG.md` — new `### Fixed` entry                                                                           | ✅ met     |
| 2. Document column refuses an absolute path                  | `select-next.mjs` `resolveDocCell`; `select-next.test.mjs` refusal test (absolute, drive letter)                 | ✅ met     |
| 3. Probe zero-guard — an entry the engine can score          | exported `resolveDocCell` returns `{ok, …}`; `bug.19.dod.2.security.cases.json` (18 cases)                       | ✅ met     |
| 4. PR review                                                 | this report                                                                                                      | ✅ met     |
| Containment holds for every caller of the parser             | an absolute `--task-registry` path skips it (CR-2)                                                               | ⚠️ partial |

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — github_issue
  The bug's frontmatter (status: ready-for-qa) and its bug-registry row say it is open, but
  github_issue 643 is CLOSED (closed by PR #651), and PR #652 only says "Refs #643".
  → Reopen #643 until DoD run 2 accepts the bug, or have PR #652 close it.

[PC-2] consistency · low · confidence: medium — docs/bugs/bug.19.registry-tick-malformed-row-reported-as-no-row/bug.19.registry-tick-malformed-row-reported-as-no-row.md:198
  Iteration 1's QA Verification Decision reads "Closed" while the frontmatter, the Status History
  and the same sentence keep the bug Ready for QA.
  → Change the Decision to "Reopened — DoD run 1 found 4 gaps; see Iteration 2".
```

## Code Review Findings

```
[CR-2] bug · medium · confidence: medium — skills/develop-next/scripts/select-next.mjs:992
  With an absolute --task-registry path, dir is absolute, and a ./-, ../- or link-form cell joins
  to an absolute path that never starts with ../, so the containment refusal is silently skipped.
  → Normalise registryPath to repo-root-relative before resolving, or check containment against
    the repo root.

[CR-1] bug · medium · confidence: high — skills/develop-next/scripts/select-next.mjs:1243 · pre-existing
  A title link such as [t](../../../../etc/task.1.x.md) still normalises outside the repo and
  readStatus opens it; the containment check covers only the document column.
  → Route the title-link href through the same containment check.
  Provenance: the same registry on 97e56a7a~1 (before #651) resolves the title link to
  ../../etc/task.1.x.md, identical to the PR head. Not introduced here; outside the verdict.
```

**Anchors:** 4 checked against `b42d9b53c89b79b3051cf75468ffdd7f39a05649` (via `head-branch`) — all verified (3 `ok`, 1 `no-line` for a frontmatter-field ref)

## Machine-Readable Findings

```yaml
reviewed_gate: none
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "github_issue"
    anchor_check: no-line
    finding: "The bug's frontmatter and registry row say it is open, but github_issue 643 is CLOSED by PR #651 and PR #652 only says Refs #643."
    suggested_action: "Reopen #643 until DoD run 2 accepts the bug, or have PR #652 close it."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/bugs/bug.19.registry-tick-malformed-row-reported-as-no-row/bug.19.registry-tick-malformed-row-reported-as-no-row.md:198"
    anchor_check: ok
    finding: "Iteration 1's QA Verification Decision reads Closed while the bug is Ready for QA."
    suggested_action: "Change the Decision to Reopened and point at Iteration 2."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/develop-next/scripts/select-next.mjs:992"
    anchor_check: ok
    finding: "An absolute --task-registry path makes the containment refusal pass silently for ./-, ../- and link-form cells."
    suggested_action: "Normalise registryPath to repo-root-relative before resolving, or check containment against the repo root."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "skills/develop-next/scripts/select-next.mjs:1243"
    anchor_check: ok
    provenance: pre-existing
    finding: "A title link that normalises outside the repo is still opened; containment covers only the document column."
    suggested_action: "Route the title-link href through the same containment check."
truncated_count: 0
```

## Recommended Actions

1. CR-2: make containment independent of how `registryPath` was spelled, with a test that passes an absolute registry path.
2. PC-1: bring the tracker in line with the document. Reopen #643 until DoD run 2 accepts the bug, then close it there.
3. PC-2: reword Iteration 1's Decision to `Reopened`.
4. CR-1 (pre-existing): putting the title link through the same check would make the parser consistent. It is in scope only if the fix for CR-2 already routes both forms through one helper.
