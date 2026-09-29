# PR Review Report: PR #468 — feat(qa-next): /qa-next <id> — target a specific registry item (#466)

**Reviewed:** 2026-09-23
**PR:** [#468](https://github.com/Gamaroff/agent-skills/pull/468) — `feature/task.141.qa-next-targeted-item` → `develop` (OPEN)
**Work item:** [`task.141.qa-next-targeted-item.md`](./task.141.qa-next-targeted-item.md) — resolved via `branch-stem`
**Tracker:** [#466](https://github.com/Gamaroff/agent-skills/issues/466) — OPEN
**Verdict:** ⚠️ CONCERNS

Effort `medium`, both lenses, dispatched in parallel (read-only Explore). Diff:
`origin/develop...origin/feature/task.141.qa-next-targeted-item`, 41 files, +7701/−67. No paths
were excluded: the branch changes no generated `references/` copies.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.141.implementation.1.qa-next-targeted-item-initial-run.md` (Step-8-deferred; the working-tree copy carries QA Cycle 10) |
| Review report | ✅ | `task.141.review.1.qa-next-targeted-item.md` |
| QA reports | 10 | `task.141.qa.{1..10}.qa-next-targeted-item.md` (matches 10 gates) |
| Gate | PASS | `task.141.gate.10.qa-next-targeted-item.yml` (100); reached 5c by the Cosmetic-residue exit (route 2b) |
| DoD | — | not yet expected: the document is `ready-for-review`, before `/finalise` |
| Sprint review | — | not yet expected, same reason |
| Open bugs | 4 | `task.141.bug.{1..4}.*.md` all read `Ready for QA` (PC-1) |
| Handover | — | none |

## Acceptance Criteria Traceability

The conformance lens found **no coverage or scope gap**. Every success criterion in § 9 has a hunk
and a test in `evals/qa-next/unit/uat-status.test.mjs` (44 tests in that suite). The two
task-creation commits (task.141, task.142) ride on this PR by the agreement recorded in the
implementation report's Decisions Log (Step 4).

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.141.qa-next-targeted-item/task.141.bug.{1,2,3,4}.*.md — `**Status**: Ready for QA`
  All four co-located bug reports still read Ready for QA with no closing Status History row, although qa.2 and qa.3 record them verified FIXED.
  → Close each bug report (Status History row citing the verifying QA cycle) before /finalise.

[PC-2] trail · low · confidence: high — task.141.implementation.1.qa-next-targeted-item-initial-run.md:6 `**Status**: Escalated`
  The report header still reads Escalated while its own QA Cycle 10 entry records a PASS gate proceeding to 5c.
  → Update the header status when the report is next committed (Step 8).
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — skills/qa-next/scripts/uat-status.mjs:885
  --run-path prints a path relative to the registry directory (runs/<id>/<name>.md), and this PR
  dropped "beside the registry" from SKILL.md Step 4, so an agent at the repo root writes <repo>/runs/….
  → Print a repo-relative path (as `bug` now does; --set --run already accepts one), or restore the
    "relative to the registry" wording in Steps 3 and 4.

[CR-2] bug · medium · confidence: medium — skills/qa-next/SKILL.md:76
  Steps 4–5 depend on `priorRuns` and `bug`, but the state file does not keep them, so a resume at
  `recorded` re-queries --item, whose priorRuns now includes the run just written, and commits a first
  run as a "re-run".
  → Store `priorRuns` and `bug` in the state file at `selected` and have the resume path read them.

[CR-3] bug · medium · confidence: medium — skills/qa-next/SKILL.md:105
  Step 1's targeted command block hard-codes `--item D.2 --json` instead of the `<id>` placeholder
  every other block uses.
  → Replace the literal `D.2` with `<id>`.

[CR-4] bug · low · confidence: medium — skills/qa-next/scripts/uat-status.mjs:534
  BUG_LINK_RE counts any link whose text contains `bug.` (e.g. `[debug.log](…)`), and this PR widened
  that match from fail rows to every row and to the published `bug`.
  → Anchor the link-text match to a bug-report name (e.g. `\bbug\.`).
```

Verified here. PC-1 and CR-3 were confirmed by reading the files. CR-1 was confirmed in the code
(`console.log(join("runs", id, name))`) and against `origin/develop`'s SKILL.md, which said "beside
the registry". CR-4 was confirmed by running the regex on `[debug.log](../logs/debug.log)`. CR-2 is
accepted at the lens's medium confidence.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.141.qa-next-targeted-item/task.141.bug.{1,2,3,4}.*.md — **Status**: Ready for QA"
    finding: "All four co-located bug reports still read Ready for QA with no closing Status History row, although QA reports record them verified fixed."
    suggested_action: "Close each bug report with a Status History row citing the verifying QA cycle before /finalise."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "task.141.implementation.1.qa-next-targeted-item-initial-run.md:6"
    finding: "The implementation report header reads Escalated while its QA Cycle 10 entry records a PASS gate proceeding to 5c."
    suggested_action: "Update the header status in the Step 8 commit."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "skills/qa-next/scripts/uat-status.mjs:885"
    finding: "--run-path prints a registry-relative path while SKILL.md no longer says the run file is beside the registry."
    suggested_action: "Print a repo-relative path, or restore the registry-relative wording in Steps 3 and 4."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/qa-next/SKILL.md:76"
    finding: "The state file does not persist priorRuns or bug, so a resume at recorded recomputes priorRuns including the run just written."
    suggested_action: "Persist priorRuns and bug at phase selected and read them on resume."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/qa-next/SKILL.md:105"
    finding: "Step 1's targeted command block hard-codes --item D.2 instead of the <id> placeholder."
    suggested_action: "Replace D.2 with <id>."
  - id: CR-4
    category: bug
    severity: low
    confidence: medium
    ref: "skills/qa-next/scripts/uat-status.mjs:534"
    finding: "BUG_LINK_RE treats any link text containing bug. (e.g. debug.log) as a bug link, now on every row."
    suggested_action: "Anchor the link-text match to a bug-report name."
truncated_count: 0
```

## Recommended Actions

1. **CR-3** and **CR-1**: the two cheapest and most user-facing fixes. The skill as shipped tells an
   agent to resolve `D.2` whatever id it was given, and to write its run file at a path that is only
   correct from the registry directory.
2. **PC-1**: close the four bug reports before `/finalise` reads the trail.
3. **CR-2** and **CR-4**: fix now or file as follow-ups. Both are narrow (a resume at `recorded`; a
   link text containing `debug.`).
4. **PC-2**: correct the report header in the Step 8 commit.
