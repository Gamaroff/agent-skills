# PR Review Report: PR #369 — docs(task.100): the false-RED mirror in mutation-proving

**Reviewed:** 2026-09-10
**PR:** [#369](https://github.com/Gamaroff/agent-skills/pull/369) — `feature/task.100.mutation-proving-false-red` → `develop` (OPEN)
**Work item:** [`task.100.mutation-proving-false-red.md`](./task.100.mutation-proving-false-red.md) — resolved via `branch stem`
**Tracker:** [#368](https://github.com/Gamaroff/agent-skills/issues/368) — OPEN
**Verdict:** ⚠️ CONCERNS

**Scope reviewed:** 11 files, +1253/−24. Six auto-generated files excluded — `skills/*/references/mutation-proving.md`, each headed `AUTO-GENERATED — DO NOT EDIT` and verified to differ from the source by exactly one line (the banner). Excluding them removes 654 lines of byte-identical noise; their fidelity was checked mechanically rather than read.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.100.implementation.1.mutation-proving-false-red-initial-run.md` |
| Review report | ✅ | `task.100.review.1.mutation-proving-false-red.md` (READY TO IMPLEMENT, 9/10) |
| QA reports | 3 | `task.100.qa.{1,2,3}.mutation-proving-false-red.md` |
| Gate | **PASS** | `task.100.gate.3.mutation-proving-false-red.yml` (95/100, `top_issues: []`) |
| DoD | ❌ | Not yet written — Step 7 `/finalise` has not run. Expected at 5c, not a gap. |
| Sprint review | ❌ | Same — `/finalise` writes it. |
| Open bugs | 0 | No `task.100.bug.*.md` |
| Handover | ✅ | 0 outstanding — `access.tracker` is `full`, nothing was deferred |

Gate progression: `CONCERNS 80 → CONCERNS 85 → PASS 95`, all three parse and all three carry a `file:` on every `top_issues[]` entry.

---

## Success Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — classify a red run from the table alone | `shared/resources/mutation-proving.md` — four-row table, signals *a real kill* / *environmental refusal* / *invocation error* / *wrong thing mutated* | ✅ met |
| SC2 — all four checks + "proves nothing in either direction" | Same file, `### Validate the probe before you trust the matrix` — checks 1–3 then judgement 4; the "either direction" sentence opens the block | ✅ met |
| SC3 — false RED worse than false GREEN, and why | Same file — "certifies coverage that was never exercised, while looking exactly like diligence" | ✅ met |
| SC4 — row 5 explicit **and** stated to pass the applied-check | Same file — the mangled-shell-variable diff plus **"That edit passes the applied-check."** | ✅ met |
| SC5 — existing false-GREEN material unchanged | `git diff origin/develop...HEAD` on the source: **109 insertions, 1 deletion**; the sole deletion is the frontmatter `description`, extended not truncated | ✅ met |

SC4 is the one that mattered: the task nominated row 5 as its own falsification test, and the section handles it as a distinct shape rather than folding it into "confirm it applied".

---

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — docs/tasks/task.100.mutation-proving-false-red/task.100.mutation-proving-false-red.md:136
  §7 Files Summary does not describe what shipped. It omits CHANGELOG.md, which the
  PR modifies (+29 lines), and its per-file figures are the develop-time numbers,
  never refreshed across two QA fix cycles: it states "+98 lines, −1" where the diff
  shows +109/−1, and "220 → 317 lines" where the file is now 328.
  → Refresh §7 against the final diff: add CHANGELOG.md to Modified, correct the
    insertion count and the final line count.

[PC-2] trail · low · confidence: high — docs/tasks/task.100.mutation-proving-false-red/task.100.qa.1.mutation-proving-false-red.md
  The cycle-1 QA report cites absolute line numbers that the cycle-2 fix invalidated —
  e.g. it anchors "That edit passes the applied-check." at L171, now L182. The cycle-3
  report deliberately cites no line numbers, so the drift is confined to qa.1 and qa.2.
  → No edit needed; these are dated snapshots of the state they reviewed. Worth stating
    in the report header convention that citations are as-of the review date, since a
    reader following them today lands ten lines short.
```

**On PC-1, plainly:** this is the same defect the task exists to document, one level up. Three QA cycles removed two unverified numbers from the *deliverable*; the *task document describing that deliverable* still carries three of its own. It does not affect what ships to consumers — `shared/resources/mutation-proving.md` and its six copies are correct — which is why it is medium rather than high.

---

## Code Review Findings

```
None.
```

The reviewable surface is prose and YAML. What was checked mechanically rather than read:

- All three gate files parse as YAML; each carries `file:` on every `top_issues[]` entry, which the pipeline's third-strike rule depends on.
- All six regenerated copies differ from source by exactly one line (the `AUTO-GENERATED` banner) — no copy was hand-edited during either fix cycle.
- The snippet gate over the changed in-scope file: 3 bash blocks, all classified `mutating` and refused, 0 findings. `placeholder` count is 0, so the `zero-blocks-executed` finding correctly does not fire.
- The four quantitative claims in the final text were re-derived from source during QA cycle 3 rather than accepted.

---

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: 'docs/tasks/task.100.mutation-proving-false-red/task.100.mutation-proving-false-red.md:136'
    finding: '§7 Files Summary omits CHANGELOG.md and carries develop-time line figures (+98/−1, 220→317) that two QA fix cycles invalidated; the diff shows +109/−1 and 328 lines.'
    suggested_action: 'Refresh §7 against the final diff — add CHANGELOG.md to Modified and correct both figures.'
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: 'docs/tasks/task.100.mutation-proving-false-red/task.100.qa.1.mutation-proving-false-red.md'
    finding: 'Cycle-1 QA report cites absolute line numbers invalidated by the cycle-2 fix (L171 is now L182).'
    suggested_action: 'Leave the dated snapshots as they are; treat report line citations as as-of the review date.'
truncated_count: 0
```

---

## Recommended Actions

1. **PC-1** — refresh §7 Files Summary before `/finalise`. It is a two-line edit and the document is about to be marked `accepted`, which is the point at which its self-description stops being provisional.
2. **PC-2** — no action.

---

## Verdict Rationale

⚠️ **CONCERNS** by the deterministic table: one `severity: medium` finding, no high-severity finding at any confidence.

The change itself is sound — five of five success criteria met, the discriminating row-5 case handled, the false-GREEN material untouched across three cycles, and a full test plus eval tier green. What CONCERNS records is that the task document's own §7 no longer describes what the PR contains. Under the pipeline's 5c routing this records findings without blocking and exits to Step 7.
