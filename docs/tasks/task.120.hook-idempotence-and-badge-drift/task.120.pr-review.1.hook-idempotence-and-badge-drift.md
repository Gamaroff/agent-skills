# PR Review Report: PR #410 — fix(task.120): the pause hook, the hook installer and the README badge no longer rely on a human remembering (#409)

**Reviewed:** 2026-09-16
**PR:** [#410](https://github.com/Gamaroff/agent-skills/pull/410) — `feature/task.120.hook-idempotence-and-badge-drift` → `develop` (OPEN)
**Work item:** [`task.120.hook-idempotence-and-badge-drift.md`](./task.120.hook-idempotence-and-badge-drift.md) — resolved via `branch-stem`
**Tracker:** [#409](https://github.com/Gamaroff/agent-skills/issues/409) — OPEN (`task`, `priority:medium`)
**Verdict:** ⚠️ CONCERNS

Effort: `medium`. Diff scoped to `origin/develop...origin/feature/task.120.hook-idempotence-and-badge-drift` **excluding** `*/references/*` (bundled copies, `AUTO-GENERATED`) and the task directory itself — 16 files, +1301 −127 of the PR's 58 files / +4508 −467.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.120.implementation.1.hook-idempotence-and-badge-drift-initial-run.md` |
| Review report | ✅ | `task.120.review.1.hook-idempotence-and-badge-drift.md` (9/10, READY TO IMPLEMENT) |
| QA reports | 5 | `task.120.qa.1` … `task.120.qa.5` |
| Gate | PASS | `task.120.gate.5.hook-idempotence-and-badge-drift.yml` (100) — gates 1–4 were CONCERNS 90/80/80/80; QA Cycle 5 entry reads `Proceeding to 5c` |
| DoD | ❌ (expected) | not yet accepted — `/finalise` is Step 7 |
| Sprint review | ❌ (expected) | as above |
| Open bugs | 0 | `bug.1` … `bug.6` all ✅ Closed |
| Handover | ❌ (none) | no `*.handover.*` — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Two concurrent PreCompact invocations → one snapshot, one report block, one PR comment, one issue comment; loser exits 0 empty | `develop-pipeline-on-precompact.sh` claim (`mv "$LOCK" "$CLAIM"`), sweep; test scenario 12 (forced overlap), 13, 15 | ✅ met |
| `install-hooks.sh` on both spellings → one entry per event; no-op on second run | `hook_identity` anchored + namespaced match, `heal_hook`, element-level removal; scenarios 1–10; real `.bak-2026-09-16` file reproduced the hand fix | ✅ met |
| `generate_catalog.py` rewrites the badge; `validate.yml` fails on a stale badge and runs on a README-only PR | `update_readme_badge`, `PROSE_COUNT`, `--readme/--no-readme`; `validate.yml` diff + both trigger lists; `tests/generate-catalog-badge.test.js` (8) | ✅ met |
| README badge reads 128 | `README.md:5` `skills-128-`, `:7` "128 skills covering" | ✅ met |
| Every mechanism has a red-on-revert test | 20 mutation proofs across develop + 5 QA cycles, all `covered` | ✅ met |
| shellcheck / bundle --check / prettier clean; suites in `package.json` | verified each cycle; installer suite in the `bash …` chain | ✅ met |
| CHANGELOG cites `(task 120)` | `CHANGELOG.md` `### Changed` entry | ✅ met |
| `develop-pipeline-pause.md` describes the claim; **the resume contract is unchanged** | pause.md describes the claim — but the resume contract **was extended** (`orphaned_claim`, choose-by-document-then-age) | ⚠️ partial — see PC-3 |
| Local settings hand-fix reproduced by the healer | verified against the pre-fix backup in develop and QA cycle 1 | ✅ met |

## Conformance Findings

```
[PC-3] scope · medium · confidence: high — task.120.hook-idempotence-and-badge-drift.md:123 and :286
  The Out-of-Scope line ("the resume contract in develop-pipeline-pause.md is unchanged") and the
  ticked Migration criterion ("the resume contract is unchanged") are contradicted by the diff, which
  adds an `orphaned_claim` value to the detector's `source` enum and a choose-by-document-then-age
  fallback (QA cycles 2–3, bug.2 / bug.5); the Files Summary lists it as 9a but the exclusion and the
  criterion were never amended.
  → Reword both lines to state that the resume contract was extended, so the document does not
    simultaneously exclude and list the same change.

[PC-1] coverage · low · confidence: medium — skills/develop-task/SKILL.md:273
  The detector now surfaces an orphaned `.pausing.<pid>` as a resume candidate, but the orchestrators'
  "Start fresh (deletes the snapshot)" rule removes only `last-halt.json`, so a declined orphaned claim
  is re-surfaced on every run until the next pause sweeps it.
  → Extend the "Start fresh" rule (develop-story / develop-task / develop-bug) to also remove
    `.claude/state/develop-pipeline.lock.pausing.*`; re-bundle. Same lifecycle gap as CR-1 below.

[PC-2] consistency · low · confidence: low — task.120 frontmatter
  `github_issue: 409` present, no `pr_number: 410` yet — expected before /finalise, which writes it.
  → None before /finalise; confirm `pr_number: 410` lands in the accept commit.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/pipeline-resume-detector-prompt.md:79
  An orphaned claim is swept only by the NEXT successful pause; after the operator resumes from it (or
  starts fresh) and the run completes or terminal-HALTs without another compaction, the claim persists
  and the next /develop-* for the same document is offered "resume from the interrupted pause" from
  stale state.
  → Consume the claim once read (Resume and Start fresh), and have the orchestrator's terminal-HALT /
    completion lock cleanup also `rm -f .claude/state/develop-pipeline.lock.pausing.*`.
```

Both lenses agree on one gap: the change set added a **reader** for orphaned claims without adding the **consumer** — the orchestrators' cleanup and "Start fresh" rules still know only the lock and the snapshot. It is a lifecycle completeness gap in files outside this PR's scope (`develop-story`/`develop-task`/`develop-bug` `SKILL.md`), not a defect in what shipped.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-3
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.120.hook-idempotence-and-badge-drift/task.120.hook-idempotence-and-badge-drift.md:123"
    finding: "Out-of-Scope line 123 and Migration criterion line 286 say the resume contract is unchanged, but the diff extends it (orphaned_claim source, choose-by-document-then-age fallback) and lists that extension as Files Summary item 9a."
    suggested_action: "Reword both lines to state the resume contract was extended (bug.2 / bug.5) so the document does not exclude and list the same change."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "skills/develop-task/SKILL.md:273"
    finding: "The orchestrators' Start-fresh rule deletes only last-halt.json, so a declined orphaned .pausing.<pid> claim is re-surfaced by the new detector fallback on every run until the next pause sweeps it."
    suggested_action: "Extend the Start-fresh rule in develop-story / develop-task / develop-bug to also remove .claude/state/develop-pipeline.lock.pausing.* and re-bundle."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.120.hook-idempotence-and-badge-drift/task.120.hook-idempotence-and-badge-drift.md:15"
    finding: "Frontmatter carries github_issue: 409 but no pr_number: 410 — expected before /finalise, which writes it at acceptance."
    suggested_action: "No action before /finalise; confirm pr_number: 410 lands in the accept commit."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/pipeline-resume-detector-prompt.md:79"
    finding: "An orphaned claim is swept only by the next successful pause, so after a resume or terminal HALT without another compaction it persists and is re-offered as a stale resume point."
    suggested_action: "Consume the claim once read (Resume and Start fresh) and add .pausing.* to the orchestrators' terminal-HALT / completion lock cleanup."
truncated_count: 0
```

## Recommended Actions

1. **Before `/finalise`** — reword task.120 lines 123 and 286: the resume contract was *extended*, not unchanged (PC-3). A two-line document edit; the DoD would otherwise verify a criterion the diff contradicts.
2. **Follow-up task** — orphaned-claim lifecycle in the orchestrators: "Start fresh" and terminal-HALT cleanup remove `.claude/state/develop-pipeline.lock.pausing.*` (PC-1 + CR-1). Outside this PR's file set; record alongside gate.5's `recommendations.future`.
3. `/finalise` writes `pr_number: 410` (PC-2).
