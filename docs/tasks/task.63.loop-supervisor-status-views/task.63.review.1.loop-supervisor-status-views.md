# Task Review Report: Task 63 — Make an unattended run watchable from a second terminal, and audible when it stops

**Reviewed:** 2026-08-28
**Review Depth:** Standard
**Task Status:** Draft (at review time)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 10 recommendations implemented — 2026-08-28. Task promoted to `Ready for Development`.

---

## Executive Summary

The task is well-structured and unusually well-motivated — every one of the eleven mandatory sections
is present and filled, the decisions table records real trade-offs with rationale, and the risk table
anticipates the failure modes that actually matter for a terminal view. The problems are all in one
place: the **Technical Background's model of what task 62 writes is not quite what task 62 writes**, and
because both subcommands are specified as pure readers over exactly those artifacts, an inaccuracy there
propagates straight into the renderer.

One field name is wrong, one artifact has an undescribed second shape, and three code/doc surfaces the
implementation must touch are not named anywhere in the plan. All are cheap to correct in the document
and expensive to discover mid-implementation.

**Critical Issues:** 1 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 0 questions asked — invoked by the `develop-task` pipeline in autonomous mode;
every finding below was resolved against the source of truth (`skills/loop-supervisor/scripts/run-loop.mjs`)
rather than by asking.

**Implementation Readiness:** 8/10
**Recommendation:** NEEDS REVISION → **READY TO IMPLEMENT** after the Step 8.5 fixes below

---

## User Decisions & Clarifications

Autonomous pipeline run — no interactive question points were raised. Each finding was verified against
the code rather than referred to the user; the evidence is cited inline with file and line references so
the determination is checkable.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven mandatory numbered sections present: Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan — plus Progress Tracking, Change Log and References.

- **OKF frontmatter**: `type: task` present ✅; `description` present and substantive ✅; `tags` is a
  YAML list ✅; `updated` present ✅.
- **File naming**: `task.63.loop-supervisor-status-views.md` — dots as structural separators, hyphens
  within the descriptive name ✅.
- **Placeholders**: none found ✅.
- **Change Log**: present with the four canonical columns and one row (`1.0 Initial draft`). Currency
  check does not fire — `status` has not advanced past `planned`, so the log is not stale.
- **Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped
  entirely, as specified. Not a finding.
- **Tracker linkage**: no `github_issue` in frontmatter. This repo does not link technical tasks to
  GitHub issues — task 62 shipped the same way — so the Important gap is **not** raised and no tracker
  sync is offered.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

### Critical

- **[Critical] `runs.jsonl` has no `numTurns` field — the field is `turns`.**
  - **Location:** § Technical Background, the `runs.jsonl` bullet.
  - **Issue:** The document lists the ledger's per-iteration fields as
    `outcome, reason, exitCode, subtype, durationMs, costUsd, numTurns, sessionId, logPath, transcriptPath`.
    Nine of those ten are correct. `numTurns` is not written anywhere.
  - **Evidence:** `skills/loop-supervisor/scripts/run-loop.mjs:833` — the ledger row is built with
    `turns: typeof env.num_turns === "number" ? env.num_turns : null`. The key is `turns`. `num_turns`
    is the *stream-json envelope's* field name, which is presumably where the hybrid came from.
  - **Why it matters here specifically:** both subcommands are defined as pure readers over this exact
    record. A renderer written from this list emits `undefined` in the turns column, and because the
    Testing Strategy correctly says to *assert content, not exact spacing*, a content assertion written
    from the same list would assert `undefined` and pass.
  - **Recommendation:** correct the field name to `turns`.

### Important

- **[Important] The ledger has a second, thinner row shape that the document does not describe.**
  - **Location:** § Technical Background, "`runs.jsonl` — append-only, one line per finished iteration".
  - **Issue:** `appendLedger` is called from **two** sites, writing two different shapes. The document
    describes only the post-spawn one.
  - **Evidence:** `run-loop.mjs:826` writes the full row the document lists. But `run-loop.mjs:711`
    writes a **probe-stop row** — `{ runId, iteration, sessionId, outcome, reason, probe, spawned: false, at }`
    — with **no** `exitCode`, `subtype`, `durationMs`, `costUsd`, `turns`, `logPath` or `transcriptPath`.
    That row is appended whenever the probe returns anything other than `selected`, which is the normal
    way a healthy roadmap run ends (empty frontier).
  - **Recommendation:** describe both shapes, keyed on `spawned`, and add a `spawned: false` row to the
    Phase 1 fixture set. Otherwise the most common final line in any real ledger is the one line the
    renderer was never tested against, and it renders as a row of `undefined`/`NaN`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **[Important] `parseArgs` is a closed allowlist in two places, and the plan names neither.**
  - **Location:** § Implementation Plan, Phases 2–4; § Files Summary.
  - **Evidence:**
    - `run-loop.mjs:165` — `if (!["run", "dry-run"].includes(out.subcommand)) throw new Error(...)`.
      `status` and `watch` are rejected before any of the new code runs.
    - `run-loop.mjs:250` — the flag switch ends in `default: throw new Error(\`unknown option ...\`)`.
      `--notify` and `--webhook` die at parse unless registered in the `KEY_OF` map **and** given
      switch cases.
  - **Recommendation:** name the three registration points explicitly in Phases 2 and 4 (subcommand
    allowlist, `KEY_OF`, switch). This is the difference between "obvious once you hit it" and "found by
    a failing test on the first invocation".
  - **Note (no change needed):** the `--command is required for the generic adapter` guard at
    `run-loop.mjs:260` is already scoped `&& out.subcommand === "run"`, so it correctly does not fire for
    the two new read-only subcommands.

- **[Important] Two documentation statements become false on merge, and neither is scoped.**
  - **Location:** § Files Summary — `README.md` and `SKILL.md` are listed for additive edits only.
  - **Evidence:**
    - `skills/loop-supervisor/README.md:189` — "**No `status` or `watch` subcommand yet**, and no
      notifications or dashboard push — separate work."
    - `skills/loop-supervisor/SKILL.md:135` — "**Layers 1–2 only.** `status` / `watch` views,
      notifications and dashboard push are separate work."
  - **Recommendation:** scope both retractions as part of Phase 5. README's Limits bullet narrows to
    dashboard push; SKILL.md's becomes the Layer 3 terminal half only. Shipping a feature while two
    shipped docs still deny it exists is precisely the drift this repo's doc-sweep convention exists to
    catch.
  - **Related, same phase:** README § "Reading a run" currently answers "how do I see what it's doing"
    with `cat current.json` and a `jq` one-liner. Those become the *fallback*, not the answer. Reframe
    rather than append, or the README gives two answers to one question.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **[Important] Success criterion 5 is not decidable for the double-SIGINT path.**
  - **Location:** § Success Criteria #5 — "Notification fires exactly once per run, on terminal stop,
    naming the reason."
  - **Evidence:** `run-loop.mjs:611–629` — the second SIGINT kills the child, calls `cleanup()` and
    `process.exit(130)` **from inside the signal handler**. It never reaches the summary write at
    `run-loop.mjs:869`, which is the natural place to hang a terminal-stop notifier.
  - **Recommendation:** state the decision in the Decisions table. Recommended answer: **excluded** — a
    double Ctrl-C means the operator is at the keyboard and does not need to be told. Then criterion 5
    reads "on terminal stop other than an operator-forced SIGINT kill", and it is testable.

### Internal consistency checks that passed

- Overview, Scope and Implementation Plan agree; the Files Summary matches the phases.
- Success Criteria 1–7 map one-to-one onto Phases 1–4; criterion 8 covers Phase 5.
- Rollback Plan covers every phase and is accurate — nothing in task 62's runner reads anything this
  task adds.
- Scope is right-sized: five phases, one module, no dependencies. Not a split candidate.
- `estimated_effort_hours: 6` is consistent with 8 success criteria and 5 short phases.
- All three referenced paths exist: `docs/reference/commands.md`, `skills/develop-batch/scripts/schedule.mjs`,
  `.agents/plans/loop-supervisor.md`.
- The eval suite is already wired into `npm test` (`evals/loop-supervisor/unit/*.test.mjs` appears in the
  `package.json` glob list), so new tests there will actually run — worth confirming because this repo
  has previously orphaned whole suites by forgetting that glob.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The five-row risk table is genuinely good — "formatting tests break on whitespace and get deleted" is a
real failure mode named with its real likelihood, and "renderer needs a field the ledger lacks" correctly
routes to a task 62 change rather than a workaround. Finding C1 above is that risk materialising during
review rather than during implementation, which is the cheapest possible place for it to happen.

Rollback is accurate and verifiable. No gaps.

---

## Optional Improvements

1. **[Optional] `current.json`'s field list omits `updatedAt`.** `run-loop.mjs:646–668` also writes
   `schemaVersion`, `adapter` and `updatedAt`. The last is the one worth having in the document — it is
   the natural "last seen" value for the status display.
2. **[Optional] `isPidAlive(pid)` already exists and is already exported** (`run-loop.mjs:422`). Reuse
   it; do not reimplement `process.kill(pid, 0)`.
3. **[Optional] Do not add a time-based staleness rule.** The heartbeat's `setInterval` is cleared when
   the child exits (`run-loop.mjs:783`), so `current.json` legitimately goes untouched across the probe
   and the `--cooldown` window — 10s by default, longer than the 5s heartbeat. A "stale if older than N
   seconds" heuristic would report a healthy loop as crashed between iterations. Pid-liveness, as the
   task already specifies, is the correct and only reliable signal.
4. **[Optional] Keep fixtures inline.** The Testing Strategy says "fixture `current.json` / `runs.jsonl`
   pairs". All three existing suites (`classify`, `adapters`, `run-loop`) use inline objects and touch no
   files. Match them — an on-disk fixtures directory would diverge from the house pattern for no gain,
   and the renderer is a pure function precisely so it never needs one.
5. **[Optional] If `render.js` is extracted, it must be skill-owned.** Put it in
   `skills/loop-supervisor/references/` beside `classify.js` and `adapters.js` — **not** in
   `shared/resources/`. Note that `references/yaml-subset.js` in that same directory *is* bundled from
   `shared/resources/`, so the directory is a mix and the distinction is easy to lose: anything bundled
   is overwritten by `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. Correct `numTurns` → `turns` in the `runs.jsonl` field list.

### Should Fix (Important) — 4

1. Document the second (probe-stop, `spawned: false`) ledger row shape and add it to the fixture set.
2. Name the `parseArgs` registration points — subcommand allowlist, `KEY_OF`, switch cases.
3. Scope the README and SKILL.md Limits retractions into Phase 5.
4. Record the double-SIGINT notification decision and qualify success criterion 5.

### Consider (Optional) — 5

As listed above.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10
- Technical Accuracy: 6/10
- Implementation Clarity: 7/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High (after the Critical and Important fixes)

**Recommendation:** ⚠️ **NEEDS REVISION** as written — one Critical hallucinated field name in the
document that both deliverables read from. **READY TO IMPLEMENT** once the five corrections above are
applied, which is what the pipeline does next.

**Justification:** The document's structure, reasoning and risk analysis are strong enough that nothing
needs rethinking; every finding is a factual correction to the description of an artifact that already
exists and can be read.

---

## Next Steps

1. Apply the Critical and Important fixes (Step 8.5 — pipeline auto-applies).
2. Promote status `Draft → Ready for Development` (Step 9).
3. Implement Phases 1–5; the renderer's three-state test set becomes four with the `spawned: false` row.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous pipeline mode)
- **Review Date:** 2026-08-28
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.63.loop-supervisor-status-views/task.63.loop-supervisor-status-views.md`
- **Sources consulted:** `skills/loop-supervisor/scripts/run-loop.mjs`, `references/classify.js`,
  `references/adapters.js`, `skills/loop-supervisor/README.md`, `skills/loop-supervisor/SKILL.md`,
  `evals/loop-supervisor/unit/*.test.mjs`, `package.json`, `skills-config.yaml`, `.gitignore`,
  `docs/reference/commands.md`
