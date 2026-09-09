# PR Review Report: PR #362 — feat(qa-gate): the security verdict now states how it was reached (task.82)

**Reviewed:** 2026-09-09
**PR:** [#362](https://github.com/Gamaroff/agent-skills/pull/362) — `feature/task.82.security-gate-evidence-field` → `develop` (OPEN)
**Work item:** [`task.82.security-gate-evidence-field.md`](./task.82.security-gate-evidence-field.md) — resolved via `branch stem`
**Tracker:** none — tasks in this repo are tracked in `docs/tasks/task-registry.md`, not as issues
**Verdict:** ⚠️ **CONCERNS**

**Scope reviewed:** 15 files, 2,388 insertions. **11 auto-generated files excluded** (`*/references/*`
— bundler output, byte-identical to `shared/resources/` and headed `AUTO-GENERATED — DO NOT EDIT`).
Both lenses run inline rather than via Explore subagents (session constraint); scope and depth
unchanged.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.82.implementation.1.security-gate-evidence-field-initial-run.md` |
| Review report | ✅ | `task.82.review.1.security-gate-evidence-field.md` (READY TO IMPLEMENT, 8/10) |
| QA reports | 2 | `task.82.qa.1.*.md` (CONCERNS 90), `task.82.qa.2.*.md` (PASS 100) |
| Gate | **PASS** | `task.82.gate.2.security-gate-evidence-field.yml` (100/100) |
| DoD | ❌ | Not yet written — Step 7 has not run. **Expected at 5c**, not a gap |
| Sprint review | ❌ | Same — Step 7 artifact |
| Open bugs | 0 | — |
| Handover | ✅ | No outstanding tracker actions |

The trail is complete for this point in the pipeline. Both QA cycles are present with their gates,
and the cycle-1 → cycle-2 transition is legible: gate 1 names two findings and an NFR CONCERNS, gate
2 verifies all three closed and records a third found by the refute pass.

**CI at review time:** `validate`, `link-check`, `shellcheck` and the branch-policy check are green;
`test` is IN_PROGRESS. Not a finding — the merge gate re-checks.

---

## Acceptance Criteria Traceability

| Criterion (§9) | Evidence in diff | Status |
|---|---|---|
| `nfr_validation.security` carries `evidence:` and `probes_executed:` | `skills/qa-task/SKILL.md` gate schema; `skills/qa-story/SKILL.md` same block | ✅ met |
| `SAFETY_REPROBE` fires on `status: FAIL` **or** unverified evidence | `shared/resources/qa-re-review-scope.md` clause 1; tests `evidence: unverified fires…`, `…NO evidence: key fires` | ✅ met |
| A gate with no `evidence:` key reads `unverified` and triggers | test `a security block with NO evidence: key fires — the fail-open half`; mutation M1 reds it | ✅ met |
| `review-security`'s block liftable without renaming | `shared/resources/security-review-prompt.md` §"Lifting the block into a QA gate"; `skills/review-security/SKILL.md:116` | ✅ met |
| Every existing parity assertion still passes | 3 changed **deliberately**, each annotated at its site; §9 rewritten to stop asserting the contradiction | ✅ met, with documented deviation |
| Identical verdicts on the two `task.74` gates | status half identical; both now additionally fire on absence | ✅ met, with documented deviation |
| Gate rules and quality-score formula unchanged | no diff in either | ✅ met |
| `npm run ci` green | exit 0, recorded in both QA reports | ✅ met |
| `evidence:` never between `security:` and `status:` | negative control with evidence supplied so the fail-open half cannot mask it | ✅ met |
| `measured` cannot be claimed with zero probes | documented-schema test + on-disk corpus test incl. **uncommitted** gates | ✅ met |
| Addition is additive | the one mechanical reader is clause 1; nothing else changed | ✅ met |

**Coverage: 11/11.** The two "documented deviation" rows are the §9 contradiction the run found and
corrected; the correction is in the task document, both QA reports, the CHANGELOG and the PR body.

---

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — skills/qa-task/SKILL.md:920
  §4 puts "both QA skills' gate schema and NFR sections" in scope, and the GATE SCHEMA is
  symmetric — both carry `evidence:` and `probes_executed:`. The QA REPORT templates are not.
  qa-story's NFR section gained an explicit `- Evidence:` / `- Probes executed:` structure
  (SKILL.md:1338-1349); qa-task's Security section is still free-text
  `{Criteria evaluated, findings, recommendations}` with no cue for either field. A QA engineer
  following qa-task's template is instructed to record evidence in Step 7 but never prompted for
  it where the report is actually written — which is how a required field quietly stops being
  filled in on one half of a deliberately symmetric pair.
  → Give qa-task's report template the same explicit Evidence / Probes-executed lines qa-story
    now has.

[PC-2] consistency · low · confidence: high — task.82…md frontmatter
  `estimated_effort_hours: 4` was flagged as likely low in the pre-implementation review
  (rubric ≈ 8) and not revised. The run took two QA cycles across four phases plus a third
  defect found at the refute pass. Non-blocking; noted so the estimate corpus is not silently
  skewed.
  → Update to the actual, or leave and accept the drift knowingly.
```

**No scope drift.** Every file touched is named in the task's §7 Files Summary (create: the shared
definition; modify: both QA skills, the shared rule, the parity suite, `review-security` + its
prompt, CHANGELOG; regenerated: the bundled mirrors). The QA/review artifacts are pipeline output.
Nothing outside.

**No trail dishonesty.** Spot-checked the three claims most worth doubting:

- gate 2's `probes_executed: 24` — the report enumerates them (15 re-run + 9 new), and the 9 are
  identifiable in the diff and the session record.
- "7/7 mutations red" — each mutation names the exact edit and the resulting red count; M7
  reproduces the bad first fix, which is the one a reader would most suspect of being invented.
- "all four guards re-proved **after** the shortening" — the ordering matters and is the specific
  thing a shortcut would skip; the qa-fix commit records it.

---

## Code Review Findings

```
[CR-1] test-quality · low · confidence: high — evals/shared/tests/qa-re-review-scope-parity.test.mjs:1197
  In `a broken reader fires the trigger`, the FAIL-gate assertion is VACUOUS IN ISOLATION: if the
  PATH shadow ever fails to take effect, awk works, and a `security: FAIL` gate returns "true"
  either way — the assertion passes without testing anything. What actually discriminates is the
  companion test on a CLEAN gate, which returns "false" with a working awk and "true" only with a
  broken one.
  → Keep both. Add a line to the first test's comment saying the clean-gate test is what proves
    the shadow took effect, so a future reader does not delete it as redundant.

[CR-2] dead-code · low · confidence: high — evals/shared/tests/qa-re-review-scope-parity.test.mjs:1078
  `assert.ok(checked >= 0)` is a tautology. It is deliberate and the comment above it explains why
  (adoption is going-forward, so a non-zero floor would be a false failure today), and the real
  non-vacuity check is asserted separately on the corpus size. Recorded so it is not mistaken for
  an oversight.
  → No change; the reasoning is already written down.
```

Nothing found in the shipped `awk`/`bash`. The three transit constraints, the block bounding, the
exhaustive `case` and the fail-open catch-all were each executed against adversarial input during QA
cycles 1–2 rather than read, and each carries a mutation proof.

---

## Recommended Actions

1. **PC-1** — give qa-task's QA report template the Evidence / Probes-executed lines. Small, and it
   closes the last asymmetry in a change whose entire point is that both QA skills resolve the same
   gate identically.
2. **CR-1** — one comment line, so the discriminating half of the broken-reader pair is not deleted
   later as redundant.
3. **PC-2** — optional; revise the effort estimate or accept the drift knowingly.

None of these blocks the merge. The verdict is CONCERNS rather than APPROVE because PC-1 is a
`medium`, and the deterministic table maps any medium to CONCERNS regardless of confidence.

---

## Disposition — what the orchestrator did with this verdict

`CONCERNS` from 5c *records findings without blocking* and exits to Step 7. The orchestrator acted on
two of the three anyway, before finalising, because they are small and PC-1 is the last asymmetry in
a change whose whole purpose is that both QA skills resolve the same gate identically.

| Finding | Disposition |
|---|---|
| **PC-1** | **Fixed.** `skills/qa-task/SKILL.md` QA report template now carries the same explicit **Status / Evidence / Probes executed** lines as `qa-story`, with the same pointer to the shared definition. 58/58 green after the change |
| **CR-1** | **Fixed.** The first broken-reader test's comment now states that the clean-gate companion is what proves the PATH shadow took effect, and must not be deleted as redundant |
| **PC-2** | **Accepted knowingly.** `estimated_effort_hours` left at 4. Revising it after the fact turns an estimate into a record of the outcome, which is what makes an estimate corpus useless. The drift is recorded here instead |

**This report is not re-verdicted after those fixes.** It is the record of what 5c found on the
commit it reviewed (`eb753e85`), and rewriting the verdict to APPROVE would erase the finding rather
than resolve it. The fixes are their own commit and are visible in the diff.
