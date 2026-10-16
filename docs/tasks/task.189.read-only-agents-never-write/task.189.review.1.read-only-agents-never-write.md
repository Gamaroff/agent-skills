# Task Review Report: Task 189 - Read-only agents never write

**Reviewed:** 2026-10-16
**reviewed_blob:** ac38f5b9ff5321a0c4c71aed7caac68a4dc9de59
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 7 recommendations implemented — 2026-10-16

---

## Executive Summary

The task's diagnosis holds and its two-sided fix (agents return, the dispatching step writes) is
sound, but it was written against `47da7406` and `develop` moved under it: the DoD security prompt
already returns `probe_command:` / `probe_cases:`, and `/finalise` already runs that command itself
when the record is absent (obs #10, landed after this task was cut). Phase 2 has to fold that
fallback into an always-run step rather than add a second one beside it, and two contract tests pin
the literals it removes. The guard test's matcher also misses two write shapes the population
actually contains.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — develop-task Step 2; every
finding below was resolved from the code, not by a decision)
**Implementation Readiness:** 7/10 before fixes → 9/10 after
**Recommendation:** READY TO IMPLEMENT (after the fixes applied in Step 8.5)

---

## User Decisions & Clarifications

None asked. Invoked by `/develop-task` Step 2 in autonomous mode (output format: comprehensive
report; Step 8.5: apply all critical + important fixes; Step 9: promote on READY). Each finding is
resolved by measurement against `develop` at `b996b1de`; none needed an intent decision.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Progress Tracking and References are present. Frontmatter carries
`type: task` and `description`. No placeholders. Card preflight: 3 card blocks resolve.
`doc-links.js`: 1 relative link resolves. Sign-off and change-log enforcement are not configured
(`skills-config.yaml` has neither key), so 4a is skipped and 4b is advisory; the Change Log is
present and current for `planned`. Tracker: `github_issue: 588` exists, body link matches.

### Optional

- **O1. Line anchors drifted.** `skills/finalise/SKILL.md:441` is now `:446`, `:470` is `:487`, the
  render `:610` / zero-guard `:618` are now near `:660` / `:668`; the security prompt's `--record`
  blocks moved (now `:201`, `:211`, `:220`, `:235`, `:251`, `:268`, `:284` — seven, not five). The
  claims are true, the coordinates moved. The task already pins `47da7406`; add a note that Phase 2
  re-measures them with the grep it records.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): **aligned**, axes
checked: What this repo produces; Cross-skill resources; File naming; Validation before commit; Do
not. Its two low notes (catalog regeneration) are about this task's own DoD, not its design — covered
by Code Quality below.

Pre-pass C (codebase scan): **partial** — the guard test, the matrix markers and `probe_plan` are
absent, but finalise already re-runs `probe_command` as a fallback (`skills/finalise/SKILL.md:513`).

Verified as stated: the mapper dispatch sites (`develop-pipeline-step-5-6-qa-loop.md:192`, `:248`),
the mapper prompt's `:46`, `:54`, `### Step 6` (`:143`, `mkdir` at `:146`) and `### Step 7`
(`:151`); the docs prompt `:55`; `generate_catalog.py` reads SKILL.md frontmatter only, so the
diff-based catalog rule is the right test; the 24-hit Explore population; qa-task Step 3b
(`skills/qa-task/SKILL.md:662`) and qa-story (`skills/qa-story/SKILL.md:1152`) cite Step 1b by name.

### Important

- **I1. Phase 2 does not know the obs #10 fallback exists (check 16 — another writer in the region
  it replaces).** Since `47da7406` the security prompt returns `probe_command:` and `probe_cases:`
  ("Return the command whether or not you ran it.", `finalise-dod-security-prompt.md:184`), and
  finalise has a block "**When the record is still absent, `/finalise` runs the probe itself (obs
  #10)**" (`skills/finalise/SKILL.md:513–537`) that writes the cases, corrects the `--record` path,
  runs the command, rebuilds `probes_executed` / `probes[]` from the record and drops the agent's
  `probe mode executed no candidates` check. The task's "new Step 3c" would sit beside it as a second
  mechanism for the same job (check 6, same-class inventory). **Fix:** Phase 2 *replaces* the obs #10
  block: `probe_command` / `probe_cases` become `probe_plan[]`, and the conditional "when the record
  is absent" run becomes the unconditional run. The fallback's four rules carry over (record path
  forced into the work-item directory; count from `totals.executed`; rebuilt probes carry no
  `severity`; a zero from finalise's own run still takes the zero-guard).
- **I2. "A new finalise Step 3c" collides with the existing `#### Step 3c: Aggregate Results`
  (`:562`).** The obs #10 block runs "Before Step 3c" for exactly this reason. **Fix:** the new run is
  the replacement of the obs #10 block, kept between Step 3b and Step 3c (heading `#### Step 3b.1:
  Run the security probe plan`); Step 3c keeps its name.
- **I3. Record and cases paths ignore obs #299 and obs #302.** The record is
  `<stem>.dod.<DOD_N>.security.run.json` (numbered per DoD run, obs #302) and the cases file
  `<stem>.dod.<DOD_N>.security.cases.json`, **beside the record, never a temp file** (obs #299 —
  "A verdict whose inputs were never saved cannot be re-run"). The task writes
  `<STORY_DIR>/<stem>.dod.security.run.json` with no `<DOD_N>`, and the plan writes cases under
  `.claude/state/probe-plan/<i>/`, which the 6a acceptance commit does not carry. **Fix:** entry `i`
  of `n > 1` records to `<stem>.dod.<DOD_N>.security.run.<i>.json` with cases at
  `<stem>.dod.<DOD_N>.security.cases.<i>.json`; a single entry keeps today's two names. Both under the
  work-item directory.
- **I4. The plan's runner splits argv on whitespace (check 11).** `$(cat …/argv)` unquoted
  word-splits the argument list. Two forms the prompt ships carry spaces inside one argument: `fence:<doc>#<heading
  text>` and an `--argv` JSON template. `command node -e 'console.log("fence:a.md#My Heading".split(/\s+/))'`
  → `[ 'fence:a.md#My', 'Heading' ]`. **Fix:** a plan entry is a JSON object; the runner builds the
  argument array from it (`jq -r '.[]'` into a bash array, or a `node` spawn with an argv array),
  never through an unquoted expansion.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important

- **I5. The security prompt keeps other write instructions the plan does not remove.** Step 4.2
  (`finalise-dod-security-prompt.md:167–177`) says "write it to
  `<STORY_DIR>/<stem>.dod.<DOD_N>.security.cases.json`" and "write both the cases file and the
  record to `$TMPDIR`". Phase 2 removes `--record` and Step 3's run but names neither sentence; the
  plan's matcher (`/\bwrite (the|a|an) [\w .-]*file\b/i`) matches neither ("write it to", "write both
  the cases file"). **Fix:** Phase 2 rewrites Step 4.2 so the agent returns cases inline in the plan
  entry and finalise writes them; the guard's matcher covers "write it to" / "write both" shapes.
- **I6. The guard's population omits the inline dispatch text the success criteria hold it to, and
  its redirect pattern misses `<placeholder>` targets (checks 13, 20).** Success criterion 1 says
  both mapper dispatch sites "say to return the matrix — held by the guard test", but the population
  is prompt *files*; the inline `Agent(subagent_type="Explore", prompt="… Write the matrix file …")`
  bodies in the step doc (`:192`, `:248`) are not files. And `code-review-prompt.md:213–218`, a
  self-declared Explore prompt, carries `git diff HEAD > <DIFF_FILE>` in a section headed "Scoping
  (caller responsibility …)": the plan's redirect regex `/>>? *["{$]/` does not see `> <`, which is
  the token-free restatement that would pass the guard over a real write if the section's heading
  ever lost its caller-run meaning. **Fix:** population gains (C) the quoted `prompt="…"` body of
  each inline `Agent(subagent_type="Explore", prompt="…")` dispatch; the redirect matcher covers
  `> <`; the code-review Scoping section is wrapped in the caller-runs marker (it *is* caller-run,
  per its own heading) so the marker, not a gap in the regex, is what passes it.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Important

- **I7. Two contract tests pin literals Phase 2 removes, and neither is listed (check 15).**
  `git grep -nE 'probe_command|probe_cases' -- evals/` → `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:533–575`
  asserts the prompt's YAML carries `probe_command:` / `probe_cases:`, the sentences "Return the
  command whether or not you ran it." and "`probes_executed:` is required whenever `boundary: true`,
  and so is `probe_command:`", and that finalise's "`/finalise` runs the probe itself" block names
  `probe_command`, `probe_cases`, `totals.executed`, "Before Step 3c", "no `severity`" and "still
  takes the zero-guard". `evals/shared/tests/probes-executed-population.test.mjs` requires every
  `probes_executed` site to name `--record` / `totals.executed` / `*.run.json` within ±5 lines, so a
  prompt sentence "`probes_executed` is filled by finalise" with `--record` removed must keep
  `totals.executed` nearby. **Fix:** Phase 2 lists both tests; the obs #10 test is rewritten to the
  new contract (agent returns `probe_plan:`; finalise's Step 3b.1 runs it unconditionally) and keeps
  its four carried rules as assertions.

Testing strategy otherwise covers each criterion with a named test and a control case (§ 8), the
mutation proofs are concrete, and every criterion is pre-merge. `tests/*.test.js` is reached by
`npm test` (`package.json`), so the new test runs (check 18).

### Optional

- **O2. The "confirmation" wording at both mapper sites.** Each site marks the wait and clears it
  "once its confirmation is read"; after the change it is the matrix reply. One word, both sites.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The medium risk (zero-guard input moves) is named with a mitigation and fixture cases. I1 lowers it:
the replacement keeps the obs #10 block's four rules rather than re-deriving them. Rollback is a
single revert plus `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 7 issues

1. I1 — Phase 2 replaces the obs #10 fallback; carry its four rules.
2. I2 — new step is `Step 3b.1`, not a second `Step 3c`.
3. I3 — keep `<DOD_N>` and the work-item directory for record and cases; per-entry suffix for `n > 1`.
4. I4 — argv from a JSON entry into an array, never an unquoted expansion.
5. I5 — remove Step 4.2's cases-file write instructions; widen the matcher to them.
6. I6 — population (C) inline dispatch bodies; `> <` redirects; caller-runs marker on code-review Scoping.
7. I7 — list and rewrite `finalise-dod-prompt-contract.test.mjs` (obs #10 test) and keep
   `probes-executed-population.test.mjs` green.

### Consider (Optional) - 2 items

1. O1 — note the anchor drift; re-measure in Phase 2.
2. O2 — "confirmation" → "reply" at both mapper sites.

---

## Implementation Readiness Assessment

**Score:** 9/10 (after fixes; 7/10 as written)

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (stale against `develop`; no hallucination)
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — every Important finding is a document fix applied in
Step 8.5; none needed a decision.

---

## Next Steps

Task is ready for implementation. Follow the phases in order; Phase 2 starts by reading the obs #10
block and its contract test, then replaces both.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2 autonomous)
- **Review Date:** 2026-10-16
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.189.read-only-agents-never-write/task.189.read-only-agents-never-write.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Review Duration:** ~20 minutes
