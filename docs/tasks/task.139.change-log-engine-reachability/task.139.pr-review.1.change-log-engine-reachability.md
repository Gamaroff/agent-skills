# PR Review Report: PR #465 — fix(change-log): ship change-log.js with every skill whose prose runs it (#463)

**Reviewed:** 2026-09-22
**PR:** [#465](https://github.com/Gamaroff/agent-skills/pull/465) — `feature/task.139.change-log-engine-reachability` → `develop` (OPEN)
**Work item:** [`task.139.change-log-engine-reachability.md`](./task.139.change-log-engine-reachability.md) — resolved via `branch-stem`
**Tracker:** [#463](https://github.com/Gamaroff/agent-skills/issues/463) — OPEN (board: In Progress)
**Verdict:** ✅ APPROVE

Scope: whole-branch diff `origin/develop...ea74e809`, 11 files / 2,225 lines; **excluded** the 42 byte-identical bundle re-renders of `skills/*/references/document-change-log.md` (each the same two hunks as the shared source). `skills/develop/references/change-log.js` is generated but was **reviewed** — it is named in the task's Files Summary and the fix commit subject (the authorial-intent exception). Effort: medium, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.139.implementation.1.change-log-engine-reachability-initial-run.md` (branch copy through Step 3; final state lands at Step 8 by design) |
| Review report | ✅ | `task.139.review.1.change-log-engine-reachability.md` — READY TO IMPLEMENT 9/10 |
| QA reports | 2 | `task.139.qa.1.*` (CONCERNS 80), `task.139.qa.2.*` (PASS 100, refute pass) |
| Gate | PASS | `task.139.gate.2.change-log-engine-reachability.yml` (100); gate.1 CONCERNS 80, both findings closed by `9f928818` |
| DoD | ❌ | not yet — `/finalise` runs at Step 7 |
| Sprint review | ❌ | not yet |
| Open bugs | 0 | — |
| Handover | ❌ | none (no deferred tracker actions) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 `skills/develop/references/change-log.js` exists after bundle, equals shared source header-stripped | `skills/develop/references/change-log.js` (A); test "every skill whose prose runs the engine ships it, byte-identical" | ✅ met |
| SC2 `require` line names develop and finalise; no skill outside gained a copy | `shared/resources/document-change-log.md:192`; diff has exactly one `A …/change-log.js`; parity test | ✅ met |
| SC3 one-liner verbatim with the develop path appends a row | Implementation Record (pre-fix `Cannot find module`, post-fix exit 0); QA re-ran | ✅ met (recorded evidence, not CI-asserted — per § 8) |
| SC4 `npm run bundle` wall-clock unchanged | no figure recorded; one 37 KB file | ✅ met (qualitative) |
| SC5 test red pre-fix naming develop, green after; mutants red their own assertion | implementation report + qa.1/qa.2 mutation proofs (`covered` ×3) | ✅ met |
| SC6 `ci:fast`, `bundle:check` (0, no UNREACHED), Prettier green | qa.2: 3891/3891, 129 skills 0 problems | ✅ met |
| SC7 CHANGELOG; obs #152 actioned; § Notes names the hand-appending writers | `CHANGELOG.md` [Unreleased] › Fixed; obs #152 set actioned (log outside the tree); § Notes eight writers | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.139.change-log-engine-reachability.md:84,173,252
  Three mentions still say the contract is bundled into "41" skills; the document's own Change Log
  row, Implementation Record and the diff (42 re-rendered copies) say 42.
  → Change the three "41" mentions to 42.
```

## Code Review Findings

```
[CR-2] cleanup · low · confidence: high — tests/change-log-engine-reachability.test.js (ALTERNATION_RE)
  ALTERNATION_RE anchors on `require("./.agents/skills/…` while the bundler's INVOKE_REF_RE
  matches the `.agents/skills/(group)/references/X` core under any prefix or quoting, so a contract
  rewritten with single quotes or without `./` is still followed by the bundler yet fails the test
  with the wrong diagnosis.
  → Anchor on the same core as INVOKE_REF_RE and drop the `require("./` prefix.

[CR-1] cleanup · low · confidence: medium — tests/change-log-engine-reachability.test.js (identity assertion)
  The identity check compares the header-stripped copy to the raw shared source, but the bundler
  also applies rewrite_text (JS_SHARED_RE) — the day change-log.js gains a `shared/resources/X`
  reference, a fresh bundle fails this test with a message telling the reader to regenerate.
  → Assert the precondition (source contains no `shared/resources/` reference) explicitly, or compare
  against the bundler's own output.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md:84,173,252"
    finding: "Three mentions say the contract is bundled into 41 skills while the document's own record and the diff say 42."
    suggested_action: "Change the three '41' mentions to 42."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "tests/change-log-engine-reachability.test.js:70"
    finding: "ALTERNATION_RE is narrower than the bundler's INVOKE_REF_RE (prefix and quoting), so a contract the bundler follows can fail the test with the wrong diagnosis."
    suggested_action: "Anchor on the same `.agents/skills/(group)/references/change-log.js` core as INVOKE_REF_RE and drop the require prefix."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: medium
    ref: "tests/change-log-engine-reachability.test.js:100"
    finding: "Identity assertion ignores the bundler's rewrite_text step; a future shared/resources reference in change-log.js would fail it with a misleading message."
    suggested_action: "Assert the no-shared-reference precondition explicitly, or compare against the bundler's own output."
truncated_count: 0
```

## Recommended Actions

1. PC-1 — fix the three "41" → 42 mentions (one-line doc edit; can ride with the Step 8 report commit or the next touch).
2. CR-2 — widen `ALTERNATION_RE` to the bundler's core so the test's diagnosis stays true under any quoting.
3. CR-1 — state the no-`shared/resources/`-reference precondition in the test.
4. Carry cycle-2's four advisories (gate.2 `recommendations.future`) with these into a follow-up.
