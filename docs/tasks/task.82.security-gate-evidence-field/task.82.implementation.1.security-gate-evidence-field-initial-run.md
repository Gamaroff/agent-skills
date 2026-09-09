# Implementation Report: Feed the measured security verdict into the QA gate

**Task**: `task.82.security-gate-evidence-field.md`
**Run Number**: 1
**Started**: 2026-09-09 13:55
**Status**: In Progress

---

## Summary

Add `evidence: measured | reasoned | unverified` (plus `probes_executed:`) to `nfr_validation.security`
in the QA gate, after `status:`, and teach the `SAFETY_REPROBE` trigger to read it — so a verdict
reached by executing probes is distinguishable from one reached by reading.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous directive)                       |
| PR target           | `develop` (auto — develop-next autonomous directive)                       |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard (risk_ok=false [medium]; phase_count=4; single_module=false)      |
| Always-load files   | 3 files — docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md |
| Board status        | N/A (no tracker issue linked — no `github_issue:` in frontmatter)          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.82.*` exists in git                               | `feature/task.82.security-gate-evidence-field` created at `511b67f3`, pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.82.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 8/10 — 0 critical, 3 important (all fixed). Report: `task.82.review.1.security-gate-evidence-field.md` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 4 phases; 52 tests (34→52); `npm run ci` exit 0; 3/3 mutations proved | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #362](https://github.com/Gamaroff/agent-skills/pull/362) → `develop`. No tracker issue to comment (none linked) | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.82.qa.{N}.*.md`; `task.82.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.82.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- Dispatched by `/develop-next` (item T82, source: **task-registry** — the roadmap held no actionable
  row; 95 registry rows rejected on document status).
- Feature branch base: `develop` — auto-answered per the develop-next AUTONOMOUS RUN directive
  (recommended option).
- PR target branch: `develop` — auto-answered per the same directive.
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0a fan-out run inline rather than via Explore subagents** — the session's operating
  instructions bar dispatching agents unless the user asks. Every Phase 0 input (file resolution,
  prior-run check, tracker fields, lite-mode booleans, `devLoadAlwaysFiles`) is a local file read, so
  the inputs are identical; only the mechanism differs.
- Pipeline mode computed mechanically: `risk_ok = risk_level("medium") ∈ {low, absent}` → **false**,
  so `standard` regardless of the other two booleans.
- No prior run detected: no `feature/task.82.*` branch, no PR, no implementation report.

### Step 3 — pre-develop (2026-09-09)

- **Pre-develop surface map: 10 files** (mapped inline, not via Explore subagent — same session
  instruction as Phase 0):
  1. `shared/resources/qa-re-review-scope.md:54-60` — clause-1 probe, the canonical copy
  2. `skills/qa-task/SKILL.md` — `:236` mirrored probe, `:580` NFR instruction, `:675` top-level
     `evidence:` block, `:682-685` `nfr_validation.security` schema
  3. `skills/qa-story/SKILL.md` — `:451` mirrored probe, `:1406` top-level `evidence:`,
     `:1413-1416` schema, `:2219-2230` NFR output block
  4. `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — 561 lines; `clause1()` extracts the
     probe from the shared rule, `runClause1(yaml)` executes it against a temp gate,
     `runClause1WithGatePath()` holds stdin open. Phase 1 needs no new harness.
  5. `shared/resources/security-input-corpus.md` — candidate home for the shared `evidence` value
     definitions (task.79)
  6. `shared/resources/security-review-prompt.md:134-135` — the producer's machine block
  7. `skills/review-security/SKILL.md:115` — the `measured ⇒ probes_executed > 0` contract row
  8. `shared/resources/finalise-dod-security-prompt.md:155-157,198` — `probes_executed` precedent
  9. `CHANGELOG.md`
  10. `skills/*/references/` — bundled mirrors, regenerated by `npm run bundle`, never hand-edited
- **Plan file**: none (`task.82.plan.*.md` does not exist) — proceeding on the task's own
  Implementation Plan.
- **Always-load files**: 3 read (`coding-standards.md`, `tech-stack.md`, `source-tree.md`).
  Binding conventions taken from them: edit `shared/resources/` sources never bundled
  `references/`; `npm run bundle` after any shared-resource edit; `npm test`; ShellCheck only if a
  `.sh` changes (none expected here).
- **Planned/Draft gate**: n/a — task is already `Ready for Development`.
- **High-risk gate**: n/a — `risk_level: medium`, so `/develop` does not raise it.
- **Signal Work Started skipped** — no tracker issue linked (`TRACKER_ISSUE` empty), so there is no card to comment on or move.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — the task contradicted itself, and the contradiction was load-bearing

`§9 Regression` asserted *"every existing parity assertion still passes"* and *"identical verdicts
on the two real `task.74` gate fixtures"*. `§9 Functional`, `§5`, Phase 3 and `§8` all assert *"a
gate with no `evidence:` key reads as `unverified` and triggers"*. **Those cannot both hold**:
`task.67.gate.2` and both `task.74` gates are real gates carrying `security: PASS` with no
`evidence:` key, so under fail-open they now fire, and the existing assertions said they must not.

Resolved in favour of fail-open — stated four times, with Phase 3 naming the alternative outright as
"the `\s` bug in a new place". Three assertions were changed **deliberately**, each with the reason
recorded at its own site, and `§9` was rewritten to stop asserting both. Full account: the
correction block now in the task's `§9 Regression`.

Two things fell out of that which were not in the plan:

- **The evidence half masks a hijacked `status:` slot.** The Phase 1 negative control passed for the
  wrong reason once clause 1 widened — the missing key fired, not the hijack. Rewritten with
  `evidence: measured` supplied so it isolates the status slot again. Once gates routinely carry
  evidence, a hijacked slot is silent once more; that is why the control still exists.
- **`CONCERNS on maintainability` stopped testing its own subject.** Its point is *the probe must not
  read another axis's status*. Without an `evidence:` key it fired for an unrelated reason. Fixture
  gained `evidence: reasoned`; the assertion is intact.

### Step 3 — mutation-proving found a real defect

Mutation 2 (*`measured` accepted with a zero count*) initially left the suite **green**. The new
corpus check used `git ls-files`, which lists only **tracked** files — and a QA gate is written and
checked *before* it is committed, so the one moment the check exists for was the moment it saw
nothing. Fixed with `--cached --others --exclude-standard`; the mutation then reddened.

All three mutations proved: missing key → `reasoned` reds 3 tests; `measured` + zero count reds the
corpus check; clause 1 narrowed to `status` only reds 4 tests.

### Step 3 — a repo lint caught two weak assertions

`tests/relationship-assertion-lint.test.js` rule A flagged `t.includes("qa-gate-security-evidence.md")`
— a substring test backing a message claiming the rule *points at* the definition. A filename
appearing in prose or inside another link's text would satisfy it. Both assertions now parse the
markdown **link targets** and check membership. Compared on basename, because the bundler rewrites
`shared/resources/X` → `references/X` in place.

### Step 3 — decisions taken where the task deferred

- **Home for the shared `evidence` definitions**: a new file,
  `shared/resources/qa-gate-security-evidence.md`, not a section of `security-input-corpus.md` as
  §7 tentatively suggested. The corpus is about hostile **inputs** and sinks; these are **gate field**
  semantics, and folding them in would make two unrelated things share a name. It is referenced from
  three places (both QA skills and the re-review rule), which argues for its own file.
- **The `evidence:` key collision** (top-level vs `nfr_validation.security.evidence`): neither key
  renamed. The reader in the test parses the **nesting**, and the shared definition tells prose to
  cite the full path.

### Step 2 — review-task findings (all resolved in-document)

1. **Important** — the gate schema already carries a **top-level** `evidence:` key
   (`qa-task/SKILL.md:675`, `qa-story/SKILL.md:1406`); the task's §3 never mentioned it. Nested
   placement keeps the YAML legal, but the two are indistinguishable by grep. Fixed: §3 now names
   the collision and requires Phase 2's schema docs to cite the full path.
2. **Important** — `task.81` shipped `evidence: measured | reasoned` (two values); this gate
   specifies three. Phase 4's "key names match exactly" was true of keys, false of the value domain.
   Fixed: Phase 4 now states the nesting (skill ⊂ gate; `unverified` is gate-only, the absence case
   Phase 3 fails open on) and forbids adding `unverified` to the skill.
3. **Important** — Change Log stale (`1.0 Initial draft` against `ready-for-development`). Fixed:
   1.1 verdict row appended, `updated:` bumped.
4. **Optional** — five `file:line` citations had drifted (paths all correct, every line number
   wrong). Fixed in-document. Logged as observation #22, since no review skill reads line anchors.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-09

- **Gate**: CONCERNS (90/100) — `task.82.gate.1.security-gate-evidence-field.yml`
- **Report**: `task.82.qa.1.security-gate-evidence-field.md`
- **Findings**: HIGH 1, MEDIUM 1 — **both found and closed within the cycle**
  - TASK82-001 (HIGH): the rewritten awk probe named the whole-record variable 8×; a skill harness
    substitutes that token with the invocation argument. **Observed live in this very cycle** — the
    `/qa-task` invocation rendered `qa-task/SKILL.md` with the task path spliced into `match(...)`.
    The probe it replaced used the token zero times.
  - TASK82-002 (MEDIUM): the comment written to fix the above contained an apostrophe, closing the
    single-quoted program. 18 of 52 tests red at once.
- **What set the gate**: not the findings — both are closed. Deterministic **rule 4**: an NFR at
  CONCERNS forces the gate to CONCERNS as a minimum, and `maintainability` is CONCERNS because the
  probe grew from 5 lines to ~25 and now carries three transit constraints.
- **Security NFR**: PASS, `evidence: measured`, `probes_executed: 15` — the first gate in the repo
  to carry the field this task adds. It reads `OK measured` under its own shipped probe.
- **Mutation proving**: 5/5 red. M2 initially green — the new corpus check used `git ls-files`
  (tracked files only) and so could not see the uncommitted gates it exists to judge.
- **PR Review**: not reached — gate did not exit the loop
- **Loop exit**: n/a — this exit not taken
- **Action**: → 5b `/qa-fix` (cycle 1 of 5)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.82.security-gate-evidence-field`
**PR**: [#362](https://github.com/Gamaroff/agent-skills/pull/362)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
