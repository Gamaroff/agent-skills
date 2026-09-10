# PR Review Report: PR #375 — feat(task-registry): give the registry tick an owner, and a check that makes its absence loud

**Reviewed:** 2026-09-10
**PR:** [#375](https://github.com/Gamaroff/agent-skills/pull/375) — `feature/task.103.pipeline-owns-the-registry-tick` → `develop` (OPEN)
**Work item:** [`task.103.pipeline-owns-the-registry-tick.md`](./task.103.pipeline-owns-the-registry-tick.md) — resolved via `branch stem`
**Tracker:** [#374](https://github.com/Gamaroff/agent-skills/issues/374) — OPEN
**Verdict:** 🚨 REQUEST CHANGES

> **Scope of the diff reviewed:** 15 files, ~147KB, `origin/develop...origin/feature/...` with
> `:(exclude)*/references/*` — the bundled `skills/finalise/references/registry-tick.js` is a
> byte-copy of its source and reviewing it is noise.
>
> **Lens dispatch deviation, recorded for the third time in this run rather than assumed carried:**
> both lenses were run inline instead of as parallel read-only Explore subagents (session
> constraint). This is the same reviewer that wrote the code, which is a real reduction in
> independence — and it matters more here than at Steps 3b/5a, because Step 5c exists precisely to be
> the lens the rest of the pipeline does not provide. Mitigation is the same and is the best
> available: **every finding below was established by executing a probe**, and each probe and its
> output is recorded.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.103.implementation.1.pipeline-owns-the-registry-tick-initial-run.md` |
| Review report | ✅ | `task.103.review.1.pipeline-owns-the-registry-tick.md` (READY TO IMPLEMENT, 9/10) |
| QA reports | 2 | `task.103.qa.1.*.md` (FAIL 80), `task.103.qa.2.*.md` (PASS 95) |
| Gate | **PASS** | `task.103.gate.2.pipeline-owns-the-registry-tick.yml` (95/100, `top_issues: []`) |
| DoD | ❌ | Not yet written — Step 7 produces it. Correct for this point in the run |
| Sprint review | ❌ | Same |
| Open bugs | 0 | — |
| Handover | ✅ | No deferred tracker actions — `access.tracker` is `full` |

The trail is complete and internally consistent for a run at Step 5c. Gate 1's four `top_issues` all
carry `status: open` and gate 2 carries an empty list, which is the correct shape: `top_issues[]`
holds *this cycle's* findings only, and the closure history lives in `bug_resolution` and the
Re-Review Context table — exactly as the gate schema requires, and not the copied-forward form that
breaks the third-strike rule.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1. Check fails both directions, and on absence | `task-registry-drift.test.mjs` — agreement test (both branches) + document-driven test | ✅ met |
| 2. Mutation-proven | Implementation report + both QA reports; 12 mutations recorded across the loop | ✅ met (evidence is the report, which is where a mutation proof can live) |
| 3. Non-vacuity floor | `MIN_ROWS`, `MIN_DOCS`, and the agreement test's own `compared >= MIN_ROWS` | ✅ met |
| 4. `cancelled` and in-flight do not trip it | **No committed assertion.** Comments only (lines 50, 133) | ❌ **unmet — see PC-1** |
| 5. § 3 decision recorded with reasoning | Implementation report, "Registry-tick ownership decision" — four numbered reasons, both rejections | ✅ met |
| 6. Lite mode ticks; story run does not | `registry-tick.test.mjs` — story-guard test asserts byte-identity; argument-surface test pins the absence of a mode flag | ✅ met |
| 7. Standard names the real owner | `docs/standards/task-registry.md` rewritten | ✅ met |
| 8. Sibling registries measured and reported | Implementation report table; epic 3 corrected | ✅ met |
| 9. Check is in a suite `npm test` executes | Pass-count delta 261 → 264 recorded | ✅ met |

## Conformance Findings

```
[PC-1] coverage · high · confidence: high — task.103…md § 9 criterion 4
  Success criterion 4 — "`cancelled` and in-flight tasks do not trip it" — has NO committed
  assertion. `task-registry-drift.test.mjs` mentions both states only in comments. The task's own
  § 8 Testing Strategy names this as a required test ("Cancelled and in-flight rows must not trip
  it"), and the QA reports record it as verified — but the verification was three ad-hoc mutations
  during development, none of which was committed.

  It is protected today only by INCIDENTAL CORPUS STATE, and that protection expires during this
  very pipeline run. Probe: replacing the `accepted` predicate with full-string equality
  (`docAccepted = docStatus`) currently reds the suite 3 pass / 1 fail — but only because task 103's
  own row (`draft`) disagrees with its own document (`ready-for-review`). Simulating the post-Step-7
  state (document `accepted`, row ticked) leaves the corpus at
  {accepted/accepted: 102, cancelled/cancelled: 1, planned/planned: 3} — entirely self-consistent on
  full strings — and the same mutation then passes 4 pass / 0 fail.

  So Step 7 of this run silently removes the only thing standing between the corpus and an
  undetected regression to full-string comparison. That regression is not benign: it would make the
  check fire on every legitimately mid-flight task, which is the "cries wolf, gets muted" failure
  the design explicitly argues against in its own comment.
  → Add a test using a SYNTHETIC fixture registry rather than the live corpus: a cancelled document
    against a `planned` row, and an in-flight document against a `ready-for-development` row, both
    asserted green. Corpus-dependent coverage is not coverage.

[PC-2] scope · low · confidence: high — docs/development/epic-registry.md
  § 3 Scope lists the epic registry as explicitly out of scope. The diff edits it (epic 3
  `📋 Planned` → `✅ Accepted`).
  → No action. § 3's own "Measure first — Scope stays as § 4 says unless the numbers say otherwise"
    admits exactly this, the measurement is recorded, the correction is verified against all three
    of epic 3's stories, and both the commit message and the implementation report disclose it.
    Flagged for the record, not as a defect.

[PC-3] trail · low · confidence: high — task.103…md § 7 Files Summary
  § 7 lists every changed file except `CHANGELOG.md`, which the diff modifies (+44 lines).
  → Add the row. A Files Summary that is complete except for one file is worse than one that is
    obviously partial, because it reads as authoritative.
```

## Code Review Findings

```
None.
```

The code lens over the cycle-2 diff found nothing not already closed. Specifically re-probed, since
these are the newest and least-reviewed lines:

- `split(/(\r?\n)/)` separator handling — round-trip verified byte-for-byte on LF, CRLF and mixed
  fixtures; `parts[i*2]` indexing is correct for a capture-group split.
- Width preservation at both boundaries — asserted by committed tests, not by comment.
- The `unparseable` collection — verified to red on a real mis-named directory.
- Naive `split("|")` versus escaped pipes in titles — checked: zero registry rows contain `\|`, and
  the tick reads its cell index from the same parser that produced `registryStatus`, so a shifted
  split would shift both consistently. Not a defect.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: high
    confidence: high
    ref: "docs/tasks/task.103.pipeline-owns-the-registry-tick/task.103.pipeline-owns-the-registry-tick.md"
    finding: Success criterion 4 (cancelled and in-flight must not trip the check) has no committed assertion; it is protected only by incidental corpus state that this run's own Step 7 removes.
    suggested_action: Add a synthetic-fixture test asserting a cancelled document against a non-cancelled row and an in-flight document against a disagreeing row both stay green.
  - id: PC-2
    category: scope
    severity: low
    confidence: high
    ref: "docs/development/epic-registry.md"
    finding: The diff edits the epic registry, which § 3 Scope lists as out of scope.
    suggested_action: No change — § 3's measure-first clause admits it, and the correction is disclosed and verified. Recorded for the audit trail.
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.103.pipeline-owns-the-registry-tick/task.103.pipeline-owns-the-registry-tick.md"
    finding: § 7 Files Summary omits CHANGELOG.md, which the diff modifies.
    suggested_action: Add the CHANGELOG.md row to § 7.
truncated_count: 0
```

## Recommended Actions

1. **PC-1 — add the synthetic-fixture test for criterion 4.** This is the one blocking finding, and
   it is squarely on this task's own thesis: a criterion asserted in prose and evidenced by
   coincidence is the third instance in this single task of "a guarantee that does not hold". The
   first was the standard naming a non-existent owner; the second was the check being blind to
   absence; this is the third. It deserves a committed test rather than a note.
2. **PC-3 — add the `CHANGELOG.md` row to § 7.** One line.
3. PC-2 — no action.
