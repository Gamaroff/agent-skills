# PR Review Report: PR #462 — feat(task.136): shell-fn: probe entry form and --fake-gh for sourced-library boundaries

**Reviewed:** 2026-09-21
**PR:** [#462](https://github.com/Gamaroff/agent-skills/pull/462) — `feature/task.136.shell-fn-probe-entry-form` → `develop` (OPEN, head `56b5ec1d`)
**Work item:** [`task.136.shell-fn-probe-entry-form.md`](./task.136.shell-fn-probe-entry-form.md) — resolved via `branch-stem`
**Tracker:** [#448](https://github.com/Gamaroff/agent-skills/issues/448) — OPEN (board: In Progress)
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.136.shell-fn-probe-entry-form` with `*/references/*` (bundled, auto-generated) excluded — 33 files, +2677/−79 of the PR's 43 files. No excluded path is named in the Files Summary, PR body or a commit subject, so the default exclusion stands. Effort: medium, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.136.implementation.1.shell-fn-probe-entry-form-initial-run.md` |
| Review report | ✅ | `task.136.review.1.shell-fn-probe-entry-form.md` (READY TO IMPLEMENT 9/10) |
| QA reports | 3 | `task.136.qa.{1,2,3}.shell-fn-probe-entry-form.md` |
| Gate | CONCERNS (no open finding) | `task.136.gate.3.shell-fn-probe-entry-form.yml` (90) — reached 5c by route 3 |
| DoD | ❌ (expected) | pipeline at Step 5c; `/finalise` writes it |
| Sprint review | ❌ (expected) | same |
| Open bugs | 0 | bug 1, bug 2 both Closed (verified by execution) |
| Handover | ❌ | none — no deferred tracker actions |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `shell-fn:…#gh_labels_filter` + cases file + `--fake-gh` → `engages`; without `--fake-gh` no hang | `security-probe.mjs` shell-fn arm; row "gh_labels_filter engages…"; row "needs-fake-gh" | ✅ met — but the criterion's *wording* still describes the pre-cycle-2 scored-mismatch behaviour (PC-2) |
| echo library → `absent`; syntax-error library → `unverifiable`, exit 97 every case | rows "echoes every argument unfiltered", "fails to source" | ✅ met |
| every existing row unchanged and green | 50 pre-existing rows, 66/66 | ✅ met |
| shell-fn run inside the default timeout | ~1 s / 10 × 2 | ✅ met |
| mutation proofs recorded; ci:fast, bundle:check, prettier, shellcheck green | implementation report; gates 1–3 | ✅ met |
| header signal stated once; prompts + Step 3b cite it; CHANGELOG | `probe-boundary-rule.md` §5; 4 citing sites under `probe-boundary-signals.test.mjs`; CHANGELOG | ✅ met |
| Obs #138 set `actioned` with the PR as resolution; task.125 DoD override cited | obs #138 reads `status: parked`, `parked_until: task.136 merged to develop`, empty `resolution:` | ❌ unmet as ticked (PC-1) — a post-merge action ticked pre-merge |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — §9 Migration › "Obs #138 set `actioned`…" vs observation-log/0138 (status: parked, resolution: empty)
  The ticked criterion claims obs #138 is actioned with the PR as resolution; the record is still parked with no PR reference.
  → Untick and defer explicitly to the post-merge step named in `parked_until`, or set #138 actioned with PR #462 now.

[PC-2] consistency · low · confidence: high — §9 Functional bullet 1 vs gate.3 security.notes / §Notes
  The criterion still describes a scored verdict whose `cases[].detail` names the mismatch; the shipped behaviour is a pre-spawn `needs-fake-gh` decline (`executed 0`), reconciled only in §Notes.
  → Reword the criterion to the delivered contract.

[PC-3] consistency · low · confidence: high — §Progress Tracking QA / Gate rows unticked vs qa.{1,2,3} + gate.{1,2,3} on disk
  → Tick them (or let finalise).

[PC-4] scope · low · confidence: high — skills/qa-next/assets/run.template.md (one cell), commit ce45625e
  A change no phase calls for, made to unblock bundled-links.test.js which was already red on develop.
  → Accepted: documented in the Files Summary as incidental and committed separately.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/security-probe.mjs:413
  `source "$1" || exit 97` puts the source on the left of `||`, so errexit is ignored for the library's top-level commands under both shells: `set -e; false; f(){…}` is sourced to completion and scored (rc 0), where a consumer's own `source` would have aborted.
  → `source "$1"; src=$?; trap - EXIT; [ "$src" -eq 0 ] || exit 97` (verified by the reviewer under bash and zsh), plus a row for a set -e library whose top-level command fails.

[CR-2] cleanup · low · confidence: high — shared/resources/finalise-dod-security-prompt.md:163
  One 127-character comment line lost its wrap inside the fenced command block.
  → Re-wrap at the surrounding width.

[CR-3] cleanup · low · confidence: high — shared/resources/security-probe.mjs:291
  `const isShell = !isShellFn && entry.startsWith(SHELL_PREFIX)` — the `!isShellFn &&` clause is dead ("shell-fn:" never starts with "shell:").
  → Drop it, or comment that the prefixes are disjoint.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "docs/tasks/task.136.shell-fn-probe-entry-form/task.136.shell-fn-probe-entry-form.md §9 Migration (obs #138 actioned) vs observation-log 0138 status: parked"
    finding: "The ticked Migration criterion says obs #138 is set actioned with the PR as resolution, but the record still reads status: parked with an empty resolution and no PR #462 reference."
    suggested_action: "Untick and defer explicitly to the post-merge step named in parked_until, or set #138 actioned with PR #462 as resolution now."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "task.136.shell-fn-probe-entry-form.md §9 Functional bullet 1 vs gate.3 nfr_validation.security.notes"
    finding: "The ticked functional criterion describes the pre-cycle-2 scored-mismatch behaviour while the shipped behaviour is a pre-spawn needs-fake-gh decline reconciled only in §Notes."
    suggested_action: "Reword the criterion to state the delivered contract."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "task.136.shell-fn-probe-entry-form.md §Progress Tracking QA/Gate rows"
    finding: "The QA and Gate rows are unticked although three QA reports and three gates exist beside the document."
    suggested_action: "Tick the QA and Gate rows."
  - id: PC-4
    category: scope
    severity: low
    confidence: high
    ref: "skills/qa-next/assets/run.template.md:41"
    finding: "The PR carries a one-cell change no phase calls for, made to unblock bundled-links.test.js which was already red on develop."
    suggested_action: "Accept as a documented, separately-committed incidental fix (ce45625e)."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/security-probe.mjs:413"
    finding: "source on the left of || makes both shells ignore errexit for the library's top-level commands, so a set -e library whose top-level precondition fails is sourced to completion and scored where a consumer's source would have aborted."
    suggested_action: "Take the source's status as a simple command (source; src=$?; trap - EXIT; [ $src -eq 0 ] || exit 97) and add a row for a set -e library whose top-level command fails."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/finalise-dod-security-prompt.md:163"
    finding: "One 127-character comment line lost its wrap inside the fenced command block."
    suggested_action: "Re-wrap at the surrounding width."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/security-probe.mjs:291"
    finding: "The !isShellFn && clause in isShell is dead since the two prefixes are disjoint."
    suggested_action: "Drop the clause or comment that the prefixes are disjoint."
truncated_count: 0
```

## Recommended Actions

1. PC-1: untick the obs #138 criterion and defer it explicitly to the post-merge step (`parked_until: task.136 merged to develop`) — the action belongs to `/develop-next` Step 5, after the merge.
2. PC-2 / PC-3: reword the "without `--fake-gh`" criterion to the delivered contract; tick the QA and Gate tracking rows.
3. CR-2: re-wrap the finalise-prompt comment line.
4. Follow-up task (with QA cycle 3's three advisories): CR-1 source-status capture, CR-3 dead clause.
