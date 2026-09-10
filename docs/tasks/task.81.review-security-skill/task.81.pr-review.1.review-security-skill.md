# PR Review Report: PR #347 — feat(task.81): ship /review-security

**Reviewed:** 2026-09-07
**PR:** [#347](https://github.com/Gamaroff/agent-skills/pull/347) — `feature/task.81.review-security-skill` → `develop` (OPEN)
**Work item:** [`task.81.review-security-skill.md`](./task.81.review-security-skill.md) — resolved via `branch stem`
**Tracker:** none — the task carries neither `github_issue` nor `jira_key`, so there was nothing for the tracker lens to pull. Not a gap: the task was authored without a tracker card and the pipeline correctly skipped every tracker signal rather than inventing one.
**Verdict:** ⚠️ **CONCERNS**

**Scope reviewed:** 30 files. 7 auto-generated `skills/review-security/references/*` files were excluded — they are byte-identical bundler output carrying an `AUTO-GENERATED — DO NOT EDIT` header.

**Both lenses ran directly in the main context**, not as Explore subagents: subagent dispatch is barred in this session by operator constraint, recorded at every prior pipeline step. Neither lens was skipped. This is stated because a silently-dropped lens and a lens that found nothing are indistinguishable in a report.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.81.implementation.1.review-security-skill-initial-run.md` |
| Review report | ✅ | `task.81.review.1.review-security-skill.md` (pre-implementation, 9/10 GO) |
| QA reports | 3 | `task.81.qa.{1,2,3}.review-security-skill.md` |
| Gate | **PASS** | `task.81.gate.3.review-security-skill.yml` (100/100) |
| DoD | ❌ | Expected — Step 7 has not run yet; 5c precedes it |
| Sprint review | ❌ | Expected — written by `/finalise` at Step 7 |
| Open bugs | 0 | 3 filed, all **Closed** (`task.81.bug.{1,2,3}.*.md`) |
| Handover | ❌ | Correct — no tracker, so no mutation was ever deferred |

**CI: 5/5 green** — `test`, `validate`, `link-check`, `shellcheck`, branch-policy.

---

## Success Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Inert Redis fixture reports `present-but-inert`, citing the dependency condition | `fixtures/redis-tls/inert.mjs`; asserted in `review-security.test.js` ("redis-tls/inert → present-but-inert") | ✅ met |
| Inert DB-URL fixture reports high, with a hostile input demonstrating the parse | `fixtures/db-url/inert.mjs`; same assertion pair | ✅ met |
| Engaged variants report no findings **and state what they probed** | `fixtures/*/engaged.mjs`; verdict + boundary assertions | ✅ met |
| Emits a gate-consumable block with `evidence:` and `probes_executed` | `security-review-prompt.md` §4 | ✅ met — with the caveat below |
| `full` mode reviews the surface regardless of what changed | `SKILL.md` Arguments/Workflow; prompt §5 | ✅ met |
| No existing gate, schema or pipeline step changes | Diff touches no gate, schema or step file | ✅ met |
| `npm run ci` green, new suite confirmed to have **run** | Gate-log delta 2701 → 2726 with the glob | ✅ met |
| Cannot emit a bare PASS — no PASS token in the schema | `VERDICTS` frozen to four; asserted | ✅ met |
| Zero executed probes → `unverifiable` | Asserted behaviourally against the engine | ✅ met |
| A verdict resting on reading is `reasoned`, never `measured` | Prompt §2; asserted | ✅ met |

**Caveat on row 4, already disclosed rather than found here**: the `evidence: measured ⇒
probes_executed > 0` invariant is enforced against the prompt's **documented example**, not an emitted
report, because v1 ships no emitter. `qa.3`'s Residual section says so, and `gate.3` carries it in
`recommendations.future`. Recorded as covered-with-caveat, not re-raised as a finding.

---

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — the whole review chain
  No independent review of this change exists. `reviewDecision` is empty; the same agent
  authored the code and wrote all three QA cycles; and because subagent dispatch was barred
  in this session, even the pipeline's own independent-lens mechanism (Explore subagents for
  the code review, the traceability mapper, the findings ingester) did not run. Every
  assurance here is self-assurance.
  → Record it in the DoD as an explicit limit rather than letting a PASS gate and green CI
    imply an independent read that did not happen. Precedent: task.96 stated exactly this.

[PC-2] scope · low · confidence: high — shared/resources/security-probe.mjs
  The PR edits a file owned by task.80 and absent from this task's declared Files Summary.
  It is a comment-only change fixing a bundler warning that this PR itself surfaced, it sits
  in its own commit, and it is disclosed in both the commit message and the implementation
  report.
  → No action. Noted so the scope delta is visible rather than discovered later.

[PC-3] consistency · low · confidence: high — fixtures/db-url/engaged.mjs
  `redis-tls/engaged.mjs` refuses loopback and RFC1918 addresses; `db-url/engaged.mjs`, over
  the same `url-authority` sink, has no such guard. Defensible — the two fixtures model
  different defects, and db-url's subject is percent-encoding and parameter smuggling rather
  than destination control — but a reader comparing two "engaged" fixtures may read the
  asymmetry as an oversight.
  → Optional: one line in db-url/engaged.mjs saying destination control is out of its scope.
```

**What the conformance lens checked and found sound**: every item in the task's Files Summary is
present in the diff; the Change Log carries a row per pipeline event (review, develop, three QA
cycles, two fix loops) with `Version` correctly blank on the machine-written rows; frontmatter
`status: ready-for-review` matches the pipeline position; all three bug reports use `## Status
History` and none carries a Change Log, per the bug-document rule; and the registration sweep reaches
every target the task named plus `skill-dependencies.json`, which it did not.

---

## Code Review Findings

```
None.
```

Three cycles of the shared adversarial reviewer ran with `code_review_blocking=true`, producing four
findings — all fixed, all verified, all mutation-proven. This pass re-read the reviewable diff and
found no new correctness bug.

**One candidate was investigated and discarded rather than reported.** `db-url/engaged.mjs` applies
`encodeURIComponent` before assigning `url.username`, which looks like double-encoding since the
WHATWG setter percent-encodes too. Measured: `encodeURIComponent('p@ss')` → `p%40ss`, and the setter
leaves `%40` alone, so the composition is idempotent. Not a bug. Recorded because a plausible-sounding
finding that survives to a report is exactly the failure mode this task exists to name.

**Carried-forward advisory cleanups** (already in `gate.3` `recommendations.future`, not re-raised as
findings): `encodeURIComponent` on compile-time constants; the loopback regression test hardcoding the
fixture path a second time; the suite reading the `shared/resources/` source rather than the bundled
copy.

---

## Assessment of the evidence, given the author is the reviewer

The orchestrator asked for this plainly, so plainly:

**What compensates.** Every one of the four findings was *mechanically demonstrable* rather than a
matter of judgement — a fence scan, a `grep` for importers, a direct call with 15 inputs, a word
count. Each is reproducible by a third party in one command. Every behavioural fix is mutation-proven
with the red count recorded, and the mutations red only their own assertions. The cycle-2 refute pass
found a defect that embarrassed the author's own earlier fix and reported it at MEDIUM rather than
burying it. One further defect — a guard asserting on `resolveEntry(...).ok`, which validates shape
rather than existence — was caught and disclosed rather than silently corrected. That is the
behaviour one wants from a self-review, and it is visible in the trail.

**What does not.** None of it is independent. A self-review cannot find the defect whose blind spot
it shares, and the one mechanism the pipeline has for supplying an outside view — subagent dispatch —
was unavailable throughout. A reader should treat this trail as thorough self-assurance, which is not
the same thing as review, and the DoD should say so in those words.

That asymmetry is why the verdict is CONCERNS rather than APPROVE, and why CONCERNS is nonetheless
the right call: the finding is about the *provenance* of the assurance, not about a defect in the
change. Sending the run back to `/qa-fix` would produce another self-review, which is the one thing
that cannot fix it.

---

## Recommended Actions

1. **Carry PC-1 into the DoD verbatim** — "no independent code review; author and reviewer are the
   same agent, and subagent dispatch was unavailable" — rather than allowing PASS + green CI to imply
   otherwise.
2. No code change required. PC-2 needs nothing; PC-3 is a one-line comment if wanted.
3. Proceed to Step 7 (`/finalise`). CONCERNS records findings and does not block.
