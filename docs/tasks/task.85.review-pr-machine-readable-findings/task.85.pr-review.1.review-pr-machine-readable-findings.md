# PR Review Report: PR #363 — feat(task.85): give /review-pr a machine-readable findings block

**Reviewed:** 2026-09-09
**PR:** [#363](https://github.com/Gamaroff/agent-skills/pull/363) — `feature/task.85.review-pr-machine-readable-findings` → `develop` (OPEN)
**Work item:** [`task.85.review-pr-machine-readable-findings.md`](./task.85.review-pr-machine-readable-findings.md) — resolved via `branch-stem`
**Tracker:** none — the task carries no `github_issue`, flagged Important at Step 2 and deliberately not created (a remote issue is never created unprompted, and an autonomous run cannot prompt)
**Verdict:** ⚠️ **CONCERNS**

---

## Review Scope

Diff: `origin/develop...origin/feature/…` — **11 files, 2130 lines**, after excluding
`*/references/*`. One file was excluded: `skills/qa-fix/references/qa-findings-ingester-prompt.md`,
byte-identical to its `shared/resources/` source modulo the generated header.

**Both lenses were run inline rather than dispatched as Explore subagents.** This session operates
under a standing instruction not to use the Agent tool unless asked. Stated here rather than left
implied, because the review's independence is weaker as a result: the same context that produced the
change also reviewed it. The conformance lens partly compensates by checking claims against artifacts
rather than against memory — every finding below was verified by running a command, and one candidate
finding was dropped when its premise did not survive that check.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.85.implementation.1.review-pr-machine-readable-findings-initial-run.md` |
| Review report | ✅ | `task.85.review.1.review-pr-machine-readable-findings.md` (5/10 → 9/10 after in-place fixes) |
| QA reports | 2 | `task.85.qa.1.*.md` (FAIL 70), `task.85.qa.2.*.md` (PASS 95) |
| Gate | **PASS** | `task.85.gate.2.review-pr-machine-readable-findings.yml` (95/100) |
| DoD | ❌ | Step 7 has not run — expected at this point in the pipeline |
| Sprint review | ❌ | Step 7 has not run — expected |
| Open bugs | 0 | — |
| Handover | ❌ | none — `access.tracker` is `full`, nothing was deferred |

The trail is complete and internally honest for a run sitting at Step 5c, with one exception recorded
as PC-1 below.

---

## Success Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Report carries rendered findings **and** a `yaml` block | `skills/review-pr/SKILL.md` Step 7 template; `pr-review-loop-parity.test.mjs` "carries a machine-readable findings block" | ✅ met |
| 2. Section emitted even when empty (`findings: []`) | `SKILL.md:400` bullet; asserted, mutation M7 | ✅ met |
| 3. `ref` for both lenses, `CR-*` from `file_line` | `SKILL.md` Step 6 normalisation paragraph; asserted (M5) plus a `doesNotMatch(/file_line:/)` on the block (M6) | ✅ met |
| 4. Ingester prefers the block, states precedence, parses legacy | `qa-findings-ingester-prompt.md` — "Preferred" and "Fallback" subsections; asserted, M8/M9 | ✅ met |
| 5. `severity:` warning scoped to the rendered shape | positive assertion on the scoped wording **plus** `doesNotMatch` on the whole-file form (M10) | ✅ met |
| 6. `task.66.pr-review.1` still parses via the fallback, asserted | "a real legacy PR review report still parses via the fallback" — asserts no block **and** the rendered header shape (M12) | ✅ met |
| 7. Each new assertion mutation-proven | 17 mutations across 2 cycles, each with a before/after occurrence count | ✅ met |
| 8. `npm run bundle` run, regenerated copies committed | 1 consumer regenerated; parity verified by `diff`, not by the bundler's own report | ✅ met |
| 9. `/review-pr` advisory contract unchanged | no gate write, no `gh pr review`, no code edits anywhere in the diff | ✅ met |
| 10. Full `npm run ci` green | run at QA cycle 2 — exit 0, including `eval:all` | ✅ met |

**The traceability is unusually strong on criterion 6**, which is worth naming: the fallback arm is
pinned against a *real* pre-block report on disk rather than a synthetic fixture, and the assertion
fails if anyone back-fills a block into it. That closes the usual gap where a fallback path is
described but nothing ever exercises it.

**Criterion 4 is met on its literal wording and was still the site of the cycle-1 HIGH.** The
ingester does prefer the block and does keep the fallback; what it did *not* do was map the fields
unambiguously, which no criterion required. Recorded as a future recommendation on gate 2 rather than
as a finding here — the gap is in the criteria, and it has already been named.

---

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — task.85.implementation.1.review-pr-machine-readable-findings-initial-run.md:39
  The Pipeline Progress row for Steps 5–6 reads `✅ Done`, but that row's own Required Artifacts
  cell names "`**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS`
  (Step 5c)" — and the QA Cycle 2 entry reads `**PR Review**: _Step 5c — see below_`. The step is
  marked complete ahead of the artifact that defines its completion, in the file that is the run's
  audit trail.
  → Write the Step 5c verdict into the QA Cycle 2 entry before the row keeps its ✅; this review
    supplies it. Bounded harm, because the resume contract verifies artifacts rather than trusting
    the tick — but the tick is still false in the diff as it stands.

[PC-2] consistency · low · confidence: high — PR #363 body, Testing section
  The PR body still reads "- [ ] `npm run eval:all` — runs at the merge gate, by design". That was
  true when the PR was opened and stopped being true at QA cycle 2, which ran full `npm run ci`
  green. A reviewer reading the body understates what has actually been verified.
  → Tick it and say the slow tier already ran, so the merge gate re-runs it rather than running it
    first.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — evals/shared/tests/pr-review-loop-parity.test.mjs:592
  `const section = reviewPr;` introduces a second name for one value, and the test then uses both:
  `reviewPr` on three assertions and `section` on two, interleaved. A reader has to check they are
  the same thing before trusting either.
  → Drop the alias and use `reviewPr` throughout, or give `section` a real narrowed value.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.85.review-pr-machine-readable-findings/task.85.implementation.1.review-pr-machine-readable-findings-initial-run.md:39"
    finding: "The Steps 5-6 Pipeline Progress row is marked complete while its own Required Artifacts cell names a Step 5c PR Review verdict that does not yet exist."
    suggested_action: "Write the Step 5c verdict into the QA Cycle 2 entry before the row keeps its tick."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "PR #363 body, Testing section"
    finding: "The PR body still lists npm run eval:all as unrun and deferred to the merge gate; QA cycle 2 ran full npm run ci green."
    suggested_action: "Tick it and note that the slow tier already ran, so the merge gate re-runs rather than first-runs it."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "evals/shared/tests/pr-review-loop-parity.test.mjs:592"
    finding: "`const section = reviewPr` creates a second name for one value and the test then uses both names interleaved."
    suggested_action: "Drop the alias and use reviewPr throughout."
truncated_count: 0
```

## Verdict rationale

Deterministic table, applied in order:

- Any finding with `severity: high` **and** `confidence: high`? **No.**
- Any remaining finding with `severity: high` **or** `severity: medium` at any confidence?
  **Yes — PC-1 is `medium`.** → ⚠️ **CONCERNS**.

CONCERNS records the findings and does **not** block: the orchestrator exits to Step 7. That is the
correct outcome here. PC-1 is a trail tick that this very review supplies the missing evidence for,
PC-2 is a stale sentence in a PR description, and CR-1 is a two-name alias in a test file.

## Candidate findings dropped

Recorded because a review that reports only what survived is indistinguishable from one that did not
look, and each of these cost a command to disprove:

- **"§7 Files Summary omits `skills/review-pr/tests/review-pr.test.js`."** It does not — the row is
  present and explicitly labelled a scope addition made during implementation, with the reason. The
  scope drift was declared, not hidden.
- **"The positive and negative `severity:` assertions could conflict."** They cannot: the positive
  wording ("the rendered shape has no `severity:` key") does not match the forbidden pattern ("no
  `severity:` key anywhere in the file"). Verified by running both regexes against the file.
- **"The rewritten template block is no longer valid YAML."** It parses — the brace placeholders are
  flow mappings. A `yaml`-tagged fence holding unparseable content would have traded one defect for
  another, so this was worth checking rather than assuming.

## Recommended Actions

1. **PC-1** — record this review's verdict in the QA Cycle 2 entry so the Steps 5–6 ✅ is backed by
   the artifact its own row names. (Step 5c does this as it closes.)
2. **PC-2** — correct the PR body's Testing section; `eval:all` has run and passed.
3. **CR-1** — drop the `section` alias, or leave it; a `low` cleanup that need not block Step 7.
