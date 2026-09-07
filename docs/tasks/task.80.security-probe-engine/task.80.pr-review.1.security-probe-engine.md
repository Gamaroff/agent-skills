# PR Review Report: PR #337 — feat(task.80): security probe engine that computes its own verdict

**Reviewed:** 2026-09-07
**PR:** [#337](https://github.com/Gamaroff/agent-skills/pull/337) — `feature/task.80.security-probe-engine` → `develop` (OPEN)
**Work item:** [`task.80.security-probe-engine.md`](./task.80.security-probe-engine.md) — resolved via `branch stem`
**Tracker:** none linked — `github_issue`/`jira_key` absent from frontmatter (a consent-gated gap carried from the Step 2 review, not a resolution failure)
**Verdict:** ⚠️ **CONCERNS**

**Diff reviewed:** 30 files, +3445/−86, excluding 5 auto-generated `skills/*/references/qa-execute-snippets.mjs` copies (bundler output; ~180 lines of pure duplication).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.80.implementation.1.security-probe-engine-initial-run.md` |
| Review report | ✅ | `task.80.review.1.security-probe-engine.md` — 8/10, READY TO IMPLEMENT |
| QA reports | 3 | `task.80.qa.{1,2,3}.security-probe-engine.md` |
| Gate | **PASS** | `task.80.gate.3.security-probe-engine.yml` (100/100, `top_issues: []`) |
| DoD | ⏳ | Not yet written — Step 7 `/finalise` produces it after this review. Correct for this point in the pipeline. |
| Sprint review | ⏳ | Same — Step 7. |
| Open bugs | 0 | No finding reached HIGH, so no bug file was warranted. |
| Handover | — | None; `access.tracker` is `full`, nothing deferred. |

The trail is complete for **Step 5c**. The two absences are the two artifacts Step 7 writes.

---

## Success Criteria Traceability

Verified by execution against the branch, not by reading the document.

| Criterion (§4 / §9) | Evidence | Status |
|---|---|---|
| Extract `sandboxEnv()` / `snapshotTree()`, behaviour-preserving | Both exported from `qa-execute-snippets.mjs`; 98/98 snippet suite + 8/8 `bug.3` replay eval | ✅ met |
| `security-probe.mjs` with `runProbeSpec({sink, entry, cases})` | Exported and callable | ✅ met |
| Engine computes the verdict, not a caller | `computeVerdict` exported; reads only per-case outcomes; no caller-supplied verdict field exists on the input shape | ✅ met |
| Four verdicts | `VERDICTS = engages, present-but-inert, absent, unverifiable` | ✅ met |
| Zero cases → `unverifiable`, never a pass | Verdict **and** exit code 1 | ✅ met |
| `declined` distinguishable from a zero count | Populated on all four decline paths while `executed` stays 0 | ✅ met |
| `probe-boundary-rule.md` records the `SAFE_COMMANDS` refusal | §2 "The refusal: `node` must never join `SAFE_COMMANDS`" | ✅ met |
| Parity tests prove the extraction changed nothing | 8 added; `QA-1…QA-17` pinned; mutation-proved | ✅ met |
| No interpreter added to `SAFE_COMMANDS` | Asserted for 10 names against both sets | ✅ met |
| Entry outside repo root rejected before import | Verified with a top-level-sentinel fixture — the sentinel file was never created | ✅ met |
| Inputs never reach a shell | 0 network calls; injection input yields a clean rejection | ✅ met |
| Timeout from the shared budget, not a literal | `spawnBudget("PROBE")`; concurrency guard green | ✅ met |

**Out-of-scope items — none violated.** No network probe, no gate-schema change, no interpreter added, non-importable sinks correctly `unverifiable`.

> One judgement call, stated rather than assumed: §4 excludes *"❌ **Any skill** — that is `task.81`"*, and this PR does modify `skills/create-skill/scripts/bundle_skill.py`. I read that exclusion as *"do not build the skill that consumes the engine"* — it names `task.81`, which is the consumer skill — rather than *"do not touch anything under `skills/`"*. `bundle_skill.py` is packaging tooling, not a skill definition, and no `SKILL.md` was touched. Not a violation. It is still scope drift; see PC-3.

---

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — PR #337 description
  The PR description is stale. It was written at Step 4, before two QA fix cycles,
  and contains ZERO mentions of the two largest changes made since: the
  spawn-budget.mjs move (7 import sites across 4 directories) and the
  bundle_skill.py fix plus its regression test. A reviewer who reads the
  description and then opens the diff meets a file move and ~44 lines of
  packaging-tooling change they were not told to expect, in a 3445-line diff.
  The PR body is the first artifact a human reviewer opens; the running QA
  comments below it carry the detail, but nobody reads six comments before the
  description.
  → Update the description to name both. `/finalise` posts a canonical summary
    comment, which is not the same thing as the description being accurate.

[PC-2] consistency · medium · confidence: high — task.80.security-probe-engine.md:247
  The "Files Actually Landed" table is stale in both membership and every count.
  It records the state at develop-time and was never updated by the QA cycles,
  yet its heading is a claim about what shipped.
    Omitted entirely: shared/resources/spawn-budget.mjs (moved),
    skills/create-skill/scripts/bundle_skill.py, tests/bundle-mjs.test.js,
    tests/test-harness-concurrency.test.js,
    evals/shared/tests/qa-re-review-scope-parity.test.mjs, and three
    shared/resources/tests/*.test.mjs import updates.
    Counts wrong: security-probe.mjs 430 → 593 lines; probe-boundary-rule.md
    208 → 222; security-probe tests 18 → 22; fixtures 6 → 7; snippet suite
    97 → 98.
  → Refresh the table. This is the section a future maintainer reads to learn
    what task.80 touched, and right now it would send them to the wrong files.

[PC-3] scope · low · confidence: high — skills/create-skill/scripts/bundle_skill.py
  Scope drift, defensible but unannounced. The bundler fix (one line plus a
  regression test) repairs a latent defect this PR EXPOSED but did not create:
  any nested transitive dep would have hit it. Keeping it here is the better
  call — it is `mkdir(parents=True, exist_ok=True)`, it carries a mutation-proved
  test, and splitting it out means knowingly leaving a crash for the next module
  to find. But it is unrelated to security probes and belongs in the description.
  → Fold into PC-1 rather than splitting the PR.
```

**On the spawn-budget move specifically, since the question was asked:** it *belongs in this PR* and is not drift in the same sense. This PR introduced the import that made a production module depend on a test helper; removing it is repairing this change, not an unrelated improvement. Shipping without it would leave the inverted dependency and a bundler that crashes on the consumer's first integration.

---

## Trail Honesty

Both claims flagged for scepticism were checked mechanically and **both hold**:

- **Cycle 1's finding graded PARTIAL rather than FIXED.** Gate 2 and `qa.2` do say PARTIAL, and the justification is sound and load-bearing: `:460` *was* fixed, but the finding's impact statement remained reachable through the API. The report states the reasoning explicitly — *"grading the wording rather than the mechanism is how a loop closes findings while the defect stays"* — and cycle 3 then confirmed the residual closed. This is the opposite of self-congratulation: the cycle declined to claim a win it had not earned.
- **Cycle 3's convergence-check note.** Verified: HIGH counts are `0, 0, 0` across gates 1–3, so `HIGH_3 >= HIGH_2 && HIGH_2 >= HIGH_1` is satisfied and the guard *would* have tripped had the gate not been PASS. Recording a rule that nearly fired against your own run, when it did not have to be mentioned at all, is a trail behaving honestly.

Gate verdicts match what the reports establish. Scores move `60 → 80 → 100` with the finding counts that justify them (`4 → 2 → 0` MEDIUM), and no finding was carried forward, waived, or quietly dropped.

**On the §9 verifications:** I checked the two strongest claims independently rather than taking them. The out-of-root rejection genuinely precedes `import()` — the fixture writes a sentinel at module top level and the file is never created, which is the only construction that proves ordering rather than mere presence of a guard. The no-shell property produces a clean rejection with no artifact. Neither proves less than claimed. The one claim I would soften is *"inputs never reach a shell"*: what is demonstrated is that they are not interpolated into a shell string by this engine on the tested paths, which is the right property and is what the code does — but it is a property of the engine's construction, not a proof over all inputs. The rule doc already states the honest limits, so this is a nuance rather than a finding.

---

## Code Review Findings

**None.**

The code lens is deliberately light here: `/qa-task` dispatched the same reviewer with `code_review_blocking=true` on all three cycles, and six findings were raised and closed through it. A targeted pass over the newest code confirmed every import in `security-probe.mjs` is used and found nothing further. The conformance lens above is where this step's value is.

---

## Recommended Actions

1. **PC-1** — update the PR description to name the `spawn-budget.mjs` move and the `bundle_skill.py` fix. Highest value: it is what a reviewer reads first.
2. **PC-2** — refresh the "Files Actually Landed" table with the files and counts as shipped.
3. **PC-3** — no split; covered by 1.
4. Carried, non-blocking: link the task to a tracker issue (`/sync-github-task`) — consent-gated throughout this run.

Neither finding is a correctness defect, and neither blocks the merge. Both are currency defects in the artifacts a human uses to *understand* the merge, which is the failure mode this review step exists to catch.
