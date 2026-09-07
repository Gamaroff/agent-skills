# PR Review Report: PR #346 — fix(sync-jira): story, task and epic now converge on a second sync

**Reviewed:** 2026-09-07
**PR:** [#346](https://github.com/Gamaroff/agent-skills/pull/346) — `feature/task.96.sync-jira-sibling-convergence` → `develop` (OPEN)
**Work item:** [`task.96.sync-jira-sibling-convergence.md`](./task.96.sync-jira-sibling-convergence.md) — resolved via `branch-stem`
**Tracker:** [#343](https://github.com/Gamaroff/agent-skills/issues/343) — OPEN
**Effort:** medium
**Scope:** 48 files (+5564/−547); 26 auto-generated `*/references/*` files excluded → 22 files / 3893 diff lines reviewed
**Verdict:** 🚨 **REQUEST CHANGES**

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.96.implementation.1.…md` — but its Pipeline Progress table is stale (PC-3) |
| Review report | ✅ | `task.96.review.1.…md` |
| QA reports | 2 | `task.96.qa.1.…md` (FAIL 50), `task.96.qa.2.…md` (PASS 95) |
| Gate | PASS | `task.96.gate.2.…yml` (95/100), `top_issues: []` |
| DoD | ❌ | absent — expected, `/finalise` is Step 7 and has not run |
| Sprint review | ❌ | absent — same reason |
| Open bugs | 0 | — |
| Handover | ❌ | none needed (`access.tracker` full) |

---

## Verdict rationale

Two findings are `severity: high` + `confidence: high`, which the deterministic table maps to REQUEST CHANGES. Both were **verified empirically by the reviewer**, not accepted on the lens's word.

The irony is worth naming: this is a task about tests that pass for the wrong reason, and it reaches its exit gate with a silent regression that two QA cycles and a green 2675-test suite did not see.

---

## Conformance Findings

```
[PC-10] scope · medium · confidence: high — sync-jira-story.js:987
  The cycle-2 `args.force` term is a NEW capability, not a restoration. On
  origin/develop an unchanged forced sync also computed includeDescription =
  false (changedFields was always exactly ['labels'], which contains neither
  "description" nor "metadata"), so --force never carried the description
  there either. VERIFIED against a develop worktree: forced PUT fields were
  `summary, labels, priority`. Five places call this "restoring the documented
  repair path for a card blanked in the Jira UI" — a path that never worked.
  §5 still says "None to any interface" while story's SKILL.md now documents
  new --force semantics, and the CHANGELOG never mentions the change.
  → Reframe as deliberate new behaviour in §5 and CHANGELOG; correct the
    "restored" wording in qa.1, qa.2, gate.2, the code comment and the test.

[PC-1] coverage · medium · confidence: high — SC9 / qa.2:67
  qa.2 claims "every behavioural fix in this cycle was reverted and its named
  test confirmed red", but two cycle-2 fixes have no test at all: epic's skip
  path --json timestamp, and story's empty-changedFields ternary. Neither is
  mutation-provable, so SC9's tick overclaims.
  → Add a test per fix, or amend qa.2 and SC9 to say two were verified by
    inspection only.

[PC-2] coverage · medium · confidence: high — §8 Unit Tests
  All three Unit Tests boxes are ticked, but nothing calls diffAgainstPayload
  directly, there is no standing counter-example test feeding the frontmatter
  rebuild (the defect is proven only by transient mutation), and the promised
  "each of the three conditions gets its own negative case" is one deferred-run
  test whose !deferred term qa.2 itself concedes is redundant.
  → Add the unit cases, or untick §8 and record that coverage is end-to-end only.

[PC-3] trail · medium · confidence: high — implementation report:38-40
  The committed Pipeline Progress table still shows Steps 4, 5–6 and 7 as
  ⏳ Pending with an empty QA Iteration History, while the PR exists, two QA
  cycles ran and gate 2 is committed beside it.
  → Update the table and QA Iteration History and commit them with the trail.

[PC-6] consistency · medium · confidence: high — task doc §7:289-298
  "Files Actually Changed" omits sync-jira-story/SKILL.md and
  deferred-no-network.test.js (the whole of SC8's evidence), says the three new
  suites hold 12 tests when they hold 14, and the Change Log says 17.
  → Regenerate §7 from the final diff; reconcile the counts.

[PC-4] trail · low · confidence: high — .summaries/ is gitignored
  The only artifact naming which criteria are partial and why is untracked, so
  it is absent from the PR, while the task doc ticks all 17 §9 boxes unqualified.
  → Restate the three partials inline in §9 or the QA report.

[PC-5] trail · low · confidence: medium — qa.2:47 vs :89 vs gate.2:48
  Counts do not reconcile: qa.2 says "eight findings, all closed" but describes
  a ninth in its adversarial-pass section; gate 2 says bugs_fixed: 12; the task
  doc says 16.
  → Reconcile to one number and say what it counts.

[PC-7] consistency · low · confidence: high — task doc:268
  Line references drifted with this diff: epic's update-path re-read is :1442
  not :1428, its --json emit :1473 not :1460, its PUT gate :975 not :948 (:948
  is now the diffAgainstPayload call), its skip re-read :1017 not :990. The
  stale numbers are baked into test comments too.
  → Re-anchor to symbol names rather than line numbers.

[PC-8] consistency · low · confidence: high — task doc frontmatter
  No pr_number, though PR #346 is open and 69 other task docs carry the key.
  → Add pr_number: 346.

[PC-9] consistency · low · confidence: medium — task doc:255,:269,:581
  Three places say jira-sync.js has "23 bundled copies"; the repo has 22.
  → Correct to 22, plus the 4 new fake-jira.js copies.
```

## Code Review Findings

```
[CR-1] bug · HIGH · confidence: high — skills/sync-jira-story/scripts/sync-jira-story.js:954
  ** SILENT DATA LOSS — regression introduced by this PR. **
  The now-reachable skip gate suppresses the PUT whenever changedFields is
  empty, but collectIssueFields sends `assignee`, `duedate`, `components` and
  `fixVersions` (:320-337) and neither diffFields nor hashMeta (:165 — only
  story_type / estimated_effort_hours / jira_epic / status) compares them. So a
  documented frontmatter edit to any of those four is now silently dropped.
  Before the label fix the gate was unreachable and the PUT always carried them.
  VERIFIED: adding `due_date: 2026-12-01` to an unchanged story produced
  "Sync (no field changes detected)", 0 PUTs, and no duedate on the card.
  → Fold the payload-only fields into hashMeta (or into the diff) so an edit to
    them marks the sync changed instead of being swallowed.

[CR-2] bug · HIGH · confidence: high — skills/sync-jira-epic/scripts/sync-jira-epic.js:975
  The same defect at epic's newly reachable fast path: collectCommonFields
  sends the same four fields while hashMeta (:277) covers only epic_type /
  prd_source / estimated_sprints / status.
  VERIFIED identically — the run reported skipped: true and no duedate reached
  the card. sync-jira-task and sync-jira-bug are UNAFFECTED (no skip gate).
  → Same fix.

[CR-3] cleanup · low · confidence: medium — shared/resources/fake-jira.js:196
  Both the transition handler and the PUT handler stamp `updated` as
  Date.now() + 1000, so a PUT immediately followed by a transition yields
  identical millisecond strings — meaning a regression that dropped the
  post-transition re-read on the update-then-transition path would still pass.
  The one test that discriminates exercises create-then-transition only.
  → Stamp from a monotonic counter in `state` instead of the wall clock.

[CR-4] cleanup · low · confidence: high — shared/resources/jira-sync.js:2112
  The @param says `null ⇒ creating`, but the reachable null-current state in
  all four callers is a --dry-run UPDATE (each fetches current only under
  `if (!args.dryRun)`).
  → Reword to "null ⇒ creating, or a dry-run update where current was never
    fetched".
```

---

## Acceptance Criteria Traceability

Spot-check of the criteria most at risk, rather than all 17 (the full matrix is at `.summaries/qa-traceability-matrix.md`, which PC-4 notes is untracked):

| Criterion | Evidence in diff | Status |
|---|---|---|
| Unchanged doc synced twice reports no field changes | all four e2e suites | ✅ met |
| Second run issues no PUT (story + epic) | `putCount` assertions | ✅ met — **but see CR-1/CR-2: it skips too much** |
| Transitioned card syncs again without `--force` | all three suites | ✅ met |
| Epic fixed on update path as well as skip path | epic e2e `:196`, asserts `transitioned === true` | ✅ met |
| Genuine remote edit still trips the guard | three counterweight tests | ✅ met |
| Every fix mutation-proven (SC9) | implementation report + qa.2 | ⚠️ partial — PC-1 |
| Unit-test bullets (§8) | — | ❌ unmet — PC-2 |
| No frontmatter backfill needed (SC17) | task e2e self-heal test | ✅ met |

---

## Recommended Actions

1. **CR-1 / CR-2 — fix the silent field drop before merge.** This is the blocking pair. The skip gate must not swallow `assignee`, `duedate`, `components` or `fixVersions`.
2. **PC-10 — correct the `--force` framing.** It is a new capability; five artifacts call it a restoration of something that never worked. Declare it in §5 and the CHANGELOG.
3. **PC-1 / PC-2 — stop overclaiming coverage.** Either add the tests or untick the boxes.
4. **PC-3 / PC-6 — bring the trail up to date** with what actually happened.
5. PC-4, PC-5, PC-7, PC-8, PC-9 and CR-3, CR-4 — tidy-ups, none blocking.
