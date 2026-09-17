# PR Review Report: PR #418 — feat(security-probe): probes_executed and evidence come from the engine's run record (task.118)

**Reviewed:** 2026-09-17
**PR:** [#418](https://github.com/Gamaroff/agent-skills/pull/418) — `feature/task.118.probes-executed-from-engine` → `develop` (OPEN)
**Work item:** [`task.118.probes-executed-from-engine.md`](./task.118.probes-executed-from-engine.md) — resolved via `branch-stem`
**Tracker:** [#417](https://github.com/Gamaroff/agent-skills/issues/417) — OPEN
**Verdict:** ⚠️ CONCERNS

Effort `medium`, both lenses. Diff scoped to `origin/develop...origin/feature/task.118.probes-executed-from-engine` with `*/references/*` excluded (35 files, +4,276/−76; the 12 bundled copies are byte-identical to their `shared/resources/` sources per `bundle:check`).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.118.implementation.1.probes-executed-from-engine-initial-run.md` (working tree; committed at Step 8) |
| Review report | ✅ | `task.118.review.1.probes-executed-from-engine.md` (8/10, READY TO IMPLEMENT) |
| QA reports | 10 | `task.118.qa.1` … `task.118.qa.10` |
| Gate | PASS | `task.118.gate.10.probes-executed-from-engine.yml` (100) — QA Cycle 10 entry reads `Proceeding to 5c` |
| DoD | ❌ | expected — Step 7 has not run |
| Sprint review | ❌ | expected — Step 7 has not run |
| Open bugs | 0 | `task.118.bug.1` (Closed), `task.118.bug.2` (Closed) |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 `probes_executed` / `evidence:` copied from an engine-written record | `security-probe.mjs` `--record` / `--emit-block`; `security-review-prompt.md` §4 "pasted, never typed"; `review-security/SKILL.md` steps 5–6 | ✅ met |
| SC2 `measured` cannot appear without a record; the contract test fails if it does | `evidenceOf` recomputes from entries; tests `MUTATION — delete the record…`, `measured is unrepresentable…`, forged-snapshot test | ✅ met at the `--emit-block` boundary — see PC-1 for the paste step |
| SC3 finalise's DoD security step reads the same record | `finalise-dod-security-prompt.md` steps 2–5 run the engine with `--record`; 32/32 contract assertions | ✅ met |
| SC4 population test ≥ 2 sites, every one reads an artefact or is allowlisted | `evals/shared/tests/probes-executed-population.test.mjs` (6 tests; 5 producer files; `--repo-root` guard) | ✅ met |
| SC5 Observation #10 closes naming this PR | — | ⏳ `/finalise` |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: medium — SC-2 / §6.5 (task.118.probes-executed-from-engine.md:107)
  The plan's second mutation ("type `measured` → the contract test reds") is not evidenced: the tests assert the engine-emitted block, so a `measured` hand-typed into a pasted report is caught by prose ("pasted, never typed") and by the population test's paste requirement, not by a test on the report.
  → Reword SC2 and §6.5 to state the guarantee holds at the `--emit-block` boundary and the paste step is prose-enforced (population-checked); or add a report-corpus check once `*.security.*.md` reports exist (none do today).

[PC-2] consistency · low · confidence: low — frontmatter (no `pr_number:`) — task.118.probes-executed-from-engine.md:1-16
  The document carries `github_issue: 417` but no `pr_number:` yet; by repo convention `/finalise` writes it at Step 7.
  → No action before Step 7; confirm `/finalise` writes `pr_number: 418`.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: high — shared/resources/security-probe.mjs:648
  The orphaned-snapshot error says "re-run the probes with --record", but that re-run throws the same error (preflight reads first); the real remedy — remove or restore the stale snapshot — is never stated.
  → Name the actual remedy in the message.

[CR-2] bug · low · confidence: high — shared/resources/security-probe.mjs:855
  With --cases-file and no --sink the recorded sink is null, so the default control name renders `null:export`.
  → Build the default from `[sink, export].filter(Boolean).join(":")`.

[CR-3] cleanup · low · confidence: medium — shared/resources/security-probe.mjs:843
  evidenceOf tolerates a record without `controls` but emitBlock on the same object throws a TypeError for a library caller passing a bare `{version: 1}`.
  → Normalise `controls` once at the top of emitBlock, or drop the guard from evidenceOf.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "SC-2 / §6.5 (task.118.probes-executed-from-engine.md:107)"
    finding: "The plan's typed-measured mutation is not evidenced by a test; the guarantee holds at the --emit-block boundary and the paste step is prose-enforced."
    suggested_action: "Reword SC2/§6.5 to state the boundary, or add a report-corpus check once security reports exist."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "frontmatter (no pr_number:) — task.118.probes-executed-from-engine.md:1-16"
    finding: "No pr_number: yet; /finalise writes it at Step 7."
    suggested_action: "No action before Step 7."
  - id: CR-1
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/security-probe.mjs:648"
    finding: "The orphaned-snapshot error's remedy (re-run with --record) is circular; the real remedy is not stated."
    suggested_action: "Name the actual remedy in the message."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/security-probe.mjs:855"
    finding: "A control recorded with sink null renders a default name of null:export."
    suggested_action: "Build the default name from the non-null parts."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/security-probe.mjs:843"
    finding: "evidenceOf and emitBlock disagree on a record without controls."
    suggested_action: "Normalise controls once in emitBlock."
truncated_count: 0
```

## Recommended Actions

1. Reword SC2 / §6.5 in the task document so the claim matches what the tests hold (PC-1) — a documentation edit, applied before `/finalise` reads the criteria.
2. CR-1, CR-2, CR-3 — three low code findings in the same file; take them as a follow-up cleanup (they do not block: the message wording, a null-sink default name, and a library-only TypeError on a malformed argument).
3. Let `/finalise` write `pr_number: 418` (PC-2).
