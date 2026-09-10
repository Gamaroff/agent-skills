# PR Review Report: PR #377 — feat(tracker-comment): render a plain-language lead the caller cannot forget

**Reviewed:** 2026-09-10
**PR:** [#377](https://github.com/Gamaroff/agent-skills/pull/377) — `feature/task.104.tracker-comment-plain-language-lead` → `develop` (OPEN)
**Work item:** [`task.104.tracker-comment-plain-language-lead.md`](./task.104.tracker-comment-plain-language-lead.md) — resolved via `branch stem`
**Tracker:** [#376](https://github.com/Gamaroff/agent-skills/issues/376) — OPEN
**Verdict:** ⚠️ **CONCERNS** — all findings resolved during the review; see *Resolution*

Scope note: `*/references/*` excluded from the reviewed diff — 13 skills × 4 files of byte-identical bundled copies of sources already present. Their fidelity is checked separately (`bundle:check`, 126 skills, 0 problems).

---

## The finding that justified this step

**PC-1 (high/high) — the PR did not contain a full cycle of the work its own gate certified.**

Gate 2 recorded all six cycle-2 findings `status: closed` and marked production APPROVED. The PR's head commit contained none of: the `jira-sync.js` `desired` fix (C2-003), the `isVisiblyNonEmpty` split that stops the emptiness check rewriting posted text (C2-004), or the slot-classification guard (C2-006). A `git commit` had been rejected by the repo's pre-commit hook, its output suppressed by a `>/dev/null 2>&1` in the invoking command, and the *following* commands' success read as the commit's.

Merging on gate 2's PASS would have shipped both the ZWJ-emoji-stripping bug and the Jira-arm `desired` regression that the gate said were fixed.

This is precisely what Step 5c exists for. A QA gate is a statement about a working tree; **a PR is a statement about a branch**, and nothing before this step compares the two.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.104.implementation.1.*.md` |
| Review report | ✅ | `task.104.review.1.*.md` (pre-implementation, READY TO IMPLEMENT 9/10) |
| QA reports | 2 | `task.104.qa.1.*.md` (FAIL), `task.104.qa.2.*.md` (PASS) |
| Gate | **PASS** | `task.104.gate.2.*.yml` (92/100); gate 1 FAIL (30/100) |
| DoD | ⏳ | Step 7 has not run yet — expected |
| Sprint review | ⏳ | Step 7 has not run yet — expected |
| Open bugs | 0 | — |
| Handover | — | none required (`access.tracker` full) |

---

## Acceptance Criteria Traceability

| Criterion | Evidence | Status |
|---|---|---|
| `renderLead()` non-empty for all 11 stages with `{}` | `tests/stakeholder-summary.test.mjs` — stage list **imported** from the engine, non-vacuity floor | ✅ met |
| Known `--stage`, no new flags → lead is first after the marker | `tracker-comment.js` composition; test driven through `cli.run`; mutation-proven | ✅ met |
| Neither stage nor `--summary-file` → exit 2, posts nothing | guard + test asserting **zero transport calls**, not just the exit code | ✅ met |
| No call site changes | independently re-derived: the non-`references/` diff is exactly the §9 allow-list; zero `SKILL.md`, zero shell script, zero `pr-inline-comment.js` | ✅ met |
| `renderLead()` pure, no I/O, no new dependency | no `require`, no `process.exit` in the module | ✅ met |
| No additional network call | lead merged into `body` before the gate; one existing post path | ✅ met |
| Prettier/lint clean, tests green | `ci:fast` 3127 pass / 0 fail; `eval:all` exit 0; CI green on all five checks | ✅ met |
| Three §8 mutations each turn a named test red | recorded in the implementation report; independently re-run by QA | ✅ met |
| Contract documents the lead, guard and record-hash note | contract's new sections | ✅ met *(after PC-2)* |
| `AGENTS.md` carries the Stakeholder Summaries section | `AGENTS.md` | ✅ met |
| `npm run bundle` run, copies committed, none hand-edited | `bundle:check` 126 skills / 0 problems | ✅ met *(after PC-1)* |

---

## Conformance Findings

```
[PC-1] trail · high · confidence: high — gate.2 vs PR head f5492dce
  Gate 2 certifies six findings closed; three were closed only in staged,
  uncommitted work absent from the PR's head commit.
  → Commit and push the cycle-2 fixes before gate 2's PASS can be read as a
    statement about PR #377.

[PC-2] consistency · medium · confidence: high — tracker-comment-contract.md:110
  The contract states a `desired:` line "now shows the lead's first sentence
  rather than the body's" — behaviour T104-004 deliberately reverted and C2-003
  extended to the Jira arm. Shipped in 12 bundled copies.
  → Rewrite to say the label still names the caller's first line while
    command.stdin carries the composed body.

[PC-3] trail · medium · confidence: high — implementation report
  Pipeline Progress still read "Cycle 1 FAIL" after a passing cycle 2, and the
  cycle-2 narrative recorded two findings where the gate records six, presenting
  the SUPERSEDED C2-002 fix as final — the very thing C2-004 was filed against.
  → Refresh the row and extend the narrative to all six.

[PC-4] consistency · low · confidence: high — §7 Files Summary
  handover-verify.test.mjs and handover-render.test.mjs listed as modified; §5.1's
  predicted breakage never materialised and neither file is touched.
  → Drop both rows and record why the prediction did not hold.

[PC-5] consistency · low · confidence: high — §7 Files Summary
  The jira-sync.js row describes an ADF change; the actual change is an optional
  `desired` parameter, and the ADF property came free.
  → Rewrite the row.

[PC-6] consistency · low · confidence: high — §Progress Tracking
  "QA review" and "Quality gate" unticked while the section above records two
  completed cycles and a PASS gate.
  → Tick both.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: high — shared/resources/stakeholder-summary.js:219
  The numeric branch validated with Number() then stored the RAW value, so the
  coercion was discarded: count=0x10 rendered "(0x10 separate pieces of work)".
  → Store the coerced number; reject non-positive and fractional values.

[CR-2] bug · low · confidence: medium — shared/resources/stakeholder-summary.js:200
  A non-scalar slot interpolated verbatim ("[object Object]"), and `[]` being
  truthy fired a boolean slot's affirmative branch.
  → Accept only string, number and boolean.

[CR-6] bug · low · confidence: medium — shared/resources/stakeholder-summary.js:231
  CYCLE_SUFFIX stripped a numeric suffix from EVERY stage, so hasTemplate("done-3")
  was true while isKnownStage("done-3") is false — two enumerations of one rule,
  disagreeing, kept apart only by call order.
  → Scope the strip to the cycle-scoped stages.

[CR-3] cleanup · low · confidence: high — shared/resources/tracker-comment.js:132
  The "A file, never an inline string" rationale ended up under --summary-file,
  documenting the wrong flag; the synopsis listed neither new flag.
  → Restore it to --body-file; complete both synopsis lines.

[CR-4] cleanup · low · confidence: high — shared/resources/tracker-comment.js:46
  Header comments still said --stage "is only the comment's IDENTITY", and the
  exit-2 list omitted the two new causes.
  → Update both.

[CR-5] bug · low · confidence: medium — the `---` is dropped on Jira
  NOT A DEFECT: already documented as GitHub-only in stakeholder-summary.md and
  the contract, with the reasoning. No action.
```

---

## Resolution

All eleven findings were resolved during this review; the three new code fixes are mutation-proven against named tests.

| Finding | Resolution |
|---|---|
| PC-1 | Committed as `e56100b0` and pushed; verified against the **pushed branch**, not the working tree — all four probes present. CI re-ran green on the new tip |
| PC-2 | Contract rewritten; the `desired:` label now documented as deliberately *not* the lead, on both arms. Re-bundled |
| PC-3 | Pipeline Progress row corrected; cycle-2 narrative extended to all six findings, superseded C2-002 description replaced |
| PC-4, PC-5, PC-6 | §7 rows corrected, §5.1 outcome recorded, checkboxes ticked |
| CR-1 | Coerced value stored; non-positive and fractional rejected. `count=0x10` → "16" |
| CR-2 | Scalars only. `{a:1}` dropped; `blocking: []` no longer fires the affirmative branch |
| CR-6 | `stripCycleSuffix()` honours the cycle-scoped list; catalogue and engine now agree on all six probed inputs |
| CR-3, CR-4 | Usage rationale restored to `--body-file`; synopsis and both header comments updated |
| CR-5 | No action — already documented |

**Verification after resolution**: `ci:fast` **3127 pass / 0 fail**, `eval:all` exit 0, `bundle:check` 126 skills / 0 problems.

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: high
    confidence: high
    ref: "docs/tasks/task.104.tracker-comment-plain-language-lead/task.104.gate.2.tracker-comment-plain-language-lead.yml"
    finding: "Gate 2 certifies six findings closed, but three were closed only in staged uncommitted work absent from the PR head commit."
    suggested_action: "Commit and push the cycle-2 fixes so the gate's PASS is a statement about the branch."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "shared/resources/tracker-comment-contract.md:110"
    finding: "The contract documents a `desired:` label behaviour that T104-004 deliberately reverted."
    suggested_action: "Rewrite the record-hash note to describe the label as the caller's first line."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.104.tracker-comment-plain-language-lead/task.104.implementation.1.tracker-comment-plain-language-lead-initial-run.md"
    finding: "Pipeline Progress and the cycle-2 narrative lag the gate, presenting a superseded fix as final."
    suggested_action: "Refresh the row and extend the narrative to all six cycle-2 findings."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md"
    finding: "Files Summary lists two handover test files as modified; neither is touched."
    suggested_action: "Drop both rows and record that the predicted breakage did not materialise."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md"
    finding: "The jira-sync.js Files Summary row describes an ADF change rather than the `desired` parameter actually added."
    suggested_action: "Rewrite the row."
  - id: PC-6
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.104.tracker-comment-plain-language-lead/task.104.tracker-comment-plain-language-lead.md"
    finding: "Progress Tracking leaves QA review and Quality gate unticked while the section above records both complete."
    suggested_action: "Tick both boxes."
  - id: CR-1
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/stakeholder-summary.js:219"
    finding: "The numeric slot branch validated with Number() but stored the raw value, so 0x10 and 1e3 rendered in source form."
    suggested_action: "Store the coerced number and reject non-positive or fractional values."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/stakeholder-summary.js:200"
    finding: "A non-scalar slot value interpolated as [object Object], and an empty array fired a boolean slot's affirmative branch."
    suggested_action: "Accept only string, number and boolean slot values."
  - id: CR-6
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/stakeholder-summary.js:231"
    finding: "The cycle-suffix strip applied to every stage, so the catalogue and isKnownStage disagreed on done-3."
    suggested_action: "Scope the strip to the cycle-scoped stages."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/tracker-comment.js:132"
    finding: "The --body-file rationale was relocated under --summary-file, and the synopsis omitted both new flags."
    suggested_action: "Restore the paragraph and complete both synopsis lines."
  - id: CR-4
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/tracker-comment.js:46"
    finding: "Header comments describe --stage as identity-only and omit the two new exit-2 causes."
    suggested_action: "Update both comments."
truncated_count: 0
```

---

## Recommended Actions

1. **Done** — commit the cycle-2 work so the gate describes the branch (PC-1). This was the review's reason for existing.
2. **Done** — correct the contract, the implementation report and the task document (PC-2 … PC-6).
3. **Done** — the three code fixes, each mutation-proven (CR-1, CR-2, CR-6) and the two prose cleanups (CR-3, CR-4).
4. Proceed to Step 7 `/finalise`. `CONCERNS` records findings without blocking, and every finding is resolved.
