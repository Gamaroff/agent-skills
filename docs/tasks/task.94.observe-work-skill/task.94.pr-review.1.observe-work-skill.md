# PR Review Report: PR #354 — feat(task.94): add the observe-work meta-skill

**Reviewed:** 2026-09-08
**PR:** [#354](https://github.com/Gamaroff/agent-skills/pull/354) — `feature/task.94.observe-work-skill` → `develop` (OPEN)
**Work item:** [`task.94.observe-work-skill.md`](./task.94.observe-work-skill.md) — resolved via `branch stem`
**Tracker:** [#340](https://github.com/Gamaroff/agent-skills/issues/340) — OPEN
**Verdict:** ⚠️ **CONCERNS** — *both findings closed before Step 7; see Resolution*

---

## Scope of this review

Diff: `origin/develop...origin/feature/task.94.observe-work-skill` — 42 files, +6862/−133.

**Excluded as machine-generated** (7 files, ~2,400 lines): `docs/reference/skill-catalog.md`, `shared/resources/skill-dependencies.json`, and the five bundled copies under `skills/observe-work/references/` that carry an `AUTO-GENERATED` header or are produced by the bundler.

> **The skill's stock exclusion rule (`:(exclude)*/references/*`) is wrong for this PR and was not used.** `observe-work` *authors* five of its references — `signals.md`, `review-cycle.md`, `applying-updates.md`, `environments.md`, `starter-principles.md` — which are the bulk of the real work. Excluding by directory would have dropped ~700 authored lines from the review. Exclusion was done by the `AUTO-GENERATED` marker plus the known generator outputs instead. Worth folding back into the skill: "generated" is a property of the file, not of its directory.

**Both lenses were run inline, not by subagent** — the invoking session's operating instructions bar subagent dispatch. Recorded here rather than left implicit: the code review and the conformance review both happened, over the same scoped diff, by a different mechanism than the skill's default.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.94.implementation.1.observe-work-skill.md` |
| Review report (Step 2) | ✅ | `task.94.review.1.observe-work-skill.md` — READY TO IMPLEMENT, 9/10 |
| QA reports | 5 | `task.94.qa.{1,2,3,4,5}.observe-work-skill.md` |
| Gate | **PASS** | `task.94.gate.5.observe-work-skill.yml` (100/100), `top_issues: []` |
| DoD | ⏳ | Not yet written — **expected**; Step 7 runs after this gate |
| Sprint review | ⏳ | Same |
| Open bugs | 0 of 7 | All seven `Ready for QA`, each with a Developer Fix Cycle and a Status History |
| Handover | n/a | No deferred tracker actions |

**The trail is unusually complete and, more to the point, honest.** Gate progression `FAIL 60 → FAIL 70 → CONCERNS 90 → CONCERNS 90 → PASS 100` with HIGH counts `1 → 1 → 0 → 0 → 0`. Two of the seven findings were **introduced by the fixes for earlier findings** and are recorded as such rather than folded into the originals — which is the property that makes the cycle count mean something.

Spot-checked for the failure this lens exists to catch — a gate that reads PASS with an unclosed `top_issues`, or a cycle count inflated by re-litigating one finding. Neither is present: `gate.5.top_issues` is empty, and each of the seven bugs has a distinct root cause and its own reproduction.

---

## Acceptance Criteria Traceability

Task 94's Success Criteria, traced to evidence in the diff.

### Functional (9)

| Criterion | Evidence | Status |
|---|---|---|
| `quick_validate.py` passes | Run during QA; clean | ✅ |
| `/observe-work` + `--review` documented | `docs/reference/commands.md` +2 rows | ✅ |
| Session Start resolves via the resolver, never cwd | `SKILL.md` — `source … \|\| exit 1` at both sites, guard asserted by test | ✅ |
| Every observation write is one engine call | `SKILL.md`; asserted by "no snippet hand-rolls a log operation" | ✅ |
| Stages updates, never edits a live skill file | `SKILL.md` body + `applying-updates.md`; body-level assertion | ✅ |
| Three scaffold placeholders deleted | Absent from the tree | ✅ |
| `AGENTS.md` demands the protocol **by name** + backstop | `AGENTS.md` §"Observing This Session" — and the engine's own `activation-configured` check independently reports "referenced in AGENTS.md" | ✅ |
| Hook emits valid JSON; date branches proven | Four branches + five degradation paths executed across cycles 1–5 | ✅ |
| Hook counts `status: open`, never a raw count | Now delegates to the engine entirely; agrees on 12 inputs | ✅ |

### Performance (3)

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Body under 500 lines | <500 | **283** | ✅ |
| References over ~300 lines carry a TOC | — | none exceed 300; two carry one anyway | ✅ |
| Bundle materially below ~214 KB | — | **49.1 KB authored** (4.4×) | ✅ |

### Code Quality (5)

| Criterion | Evidence | Status |
|---|---|---|
| `npm test` passes **with the glob**, proven red | Assertion inverted → exit 1; reverted → exit 0. Glob string read out of `package.json` | ✅ |
| `generate-catalog` / `generate-skill-deps` clean | Re-run in QA cycles 1 and 3; no diff | ✅ |
| `npm run bundle` clean | "in sync" | ✅ |
| No hand-edited bundled reference | Verified — the one bundled-file fix (TASK-94-003) was applied to the **source** | ✅ |
| `skill-doc-coverage` without `UNDOCUMENTED_AT_ADOPTION` | Passes | ✅ |

### Migration (4)

| Criterion | Evidence | Status |
|---|---|---|
| `CHANGELOG.md` updated | Entry under `[Unreleased] → Added` | ✅ |
| Catalog row under a real category | *Skill Tooling*, not "Other" | ✅ |
| `shellcheck --severity=warning` clean — **run** | Run after every hook edit; clean across all tracked sources | ✅ |
| Install reported as **activation unverified** | CHANGELOG, `environments.md`, PR body, with the next-session check named | ✅ |

**21 of 21 criteria met.** No unmet or partial.

---

## Conformance Findings

**[PC-1] consistency · low · confidence: high** — `docs/tasks/task.94.observe-work-skill/task.94.observe-work-skill.md` §7

The Files Summary does not list `shared/resources/observation-log-contract.md`, which this PR edits (six relative links demoted, one section added — the fix for TASK-94-003).

That file belongs to task 93. Editing it here was correct: task 94 is the first consumer to bundle it, so task 94 is where its dangling links first ship. But §7 is the task's own statement of which files change, and a reviewer diffing §7 against the branch finds an authored file that section never mentions.

→ Add it to §7 under "Files to Modify", noting it was pulled in by QA finding TASK-94-003.

*(Two further unlisted files — `references/observe-work-session-start.sh` and `references/yaml-subset.js` — are bundler output, not authored, and are correctly absent from a Files Summary that already lists their sources.)*

---

## Code Review Findings

**[CR-1] test-coverage · medium · confidence: high** — `skills/observe-work/tests/observe-work.test.js`

**The suite contains zero assertions about the hook.** `grep -c 'session-start\|hook'` returns **0**.

The hook is shipped inside the skill (bundled to `references/observe-work-session-start.sh`), and it is the highest-churn file in the PR: **four of the seven QA findings were about it** (bugs 2, 5, 6, and half of 7), it was rewritten twice, and its counting mechanism was replaced outright. Its correctness rests entirely on fixtures constructed ad hoc during QA — twelve inputs, four date branches, five degradation paths — none of which exist on disk. Nothing re-runs them.

This is the gap `gate.5` already names in `recommendations.future`, reached independently here and quantifiable: 0 assertions covering the component that produced 4 of 7 findings.

The obstacle is real rather than an oversight, and the QA report says so: the natural guard — "the hook contains no `grep` over the log" — is a *source-text* assertion, which this repo explicitly rejects in favour of behaviour. The right shape is a fixture-driven behavioural test: build a temp log under a durable anchor, run the hook, run `observation-log.js queue --json`, assert the two counts agree.

→ Add `skills/observe-work/tests/observe-work-hook.test.js` asserting hook/engine agreement over the twelve inputs already used in QA, plus silence on each degradation path. **Not a merge blocker** — the behaviour is verified, just not re-verifiable.

### What was reviewed and found sound

- **The hook's final form.** Traced by hand: the `"open"` segment regex cannot match `"reopen"` (the preceding character is `e`, not a quote); `total` is extracted by a `[0-9]+` pattern so the later `-gt` cannot receive a non-numeric; `tr -d '\n'` guarantees a single awk record so the `${var% *}` / `${var#* }` split is safe; awk's `gsub` returning numeric `0` still satisfies `!= ""` under awk's string-comparison rule, which is why an empty `open` array prints "0 open" rather than falling through to silence. That last one is subtle enough to be worth the sentence — it was confirmed by execution, not by reading.
- **`package.json` and `generate_catalog.py`** — one line changed in each, verified by `--numstat`. No collateral churn, and no re-encoding of unrelated non-ASCII (a hazard the implementation report records hitting and reverting).
- **Doc table integrity** — added rows carry 3 and 2 columns respectively, matching their tables.
- **The bundled-file discipline** — the one fix touching a bundled path was applied to `shared/resources/`, and `npm run bundle` reports "in sync". The reverse would have been silently reverted.

---

## Resolution

Both findings were closed rather than carried past the gate. CONCERNS does not block, so this was a
choice: both are additive, neither describes shipped behaviour that is wrong, and leaving a known
test gap on the PR's highest-churn file is the kind of thing that is never come back to.

**[CR-1] closed** — `skills/observe-work/tests/observe-work-hook.test.js` added: 6 tests asserting
hook/engine agreement across all eleven inputs the QA loop raised, the three review-nag branches, the
fully-silent branch, four degradation paths, and JSON well-formedness. Covered by the existing
`skills/observe-work/tests/*.test.js` glob, so no `package.json` change.

**Mutation-proved, twice:**

| Mutation | Result |
|---|---|
| Reinstate the cycle-3 off-by-one (drop the strip-to-bracket) | **3 tests red** — "the engine is the authority on the queue rule; the hook only transcribes it" |
| Make a degradation path emit a guess instead of staying silent | **red** — "unparseable payload: must be silent, emitted output" |

Writing it surfaced one more piece of real behaviour, now asserted: a log containing **only** a
frontmatter-less file makes the engine trip its own `scan-broken` guard and refuse to answer at all —
files present, none parsed. The hook goes silent rather than reporting a partial count. That is the
contract's *"an empty result is a claim about the instrument"* rule reaching all the way out to the
hook, and it was not previously tested anywhere.

**[PC-1] closed** — `shared/resources/observation-log-contract.md` added to §7 as item 8a, recording
that QA finding TASK-94-003 pulled it in and that the fix was applied at the source. The new test file
is recorded as 7a.

---

## Recommended Actions

1. ~~**[CR-1]** Add a fixture-driven hook test~~ — **done**, mutation-proved twice.
2. ~~**[PC-1]** Record the contract file in §7~~ — **done**.
3. **Open, for `review-pr` itself**: exclude generated files by **marker**, not by directory. The stock `:(exclude)*/references/*` rule would have hidden ~700 authored lines on this PR, because `observe-work` authors five of its own references. Not actionable inside task 94 — belongs to whoever next touches that skill.

---

## Verdict

⚠️ **CONCERNS** — one `medium`/`high-confidence` finding, one `low`. No `high`-severity finding at any confidence, so this is not REQUEST CHANGES.

Per the deterministic table, CONCERNS records findings without blocking: the orchestrator proceeds to Step 7. Both findings are additive — a test to write and a line to add — and neither describes shipped behaviour that is wrong.

Advisory only. No gate file written, no formal review submitted, no code edited.
