# Implementation Report: Platform-aware skill exclusion in setup-consumer.sh

**Task**: `task.83.platform-aware-skill-exclusion.md`
**Run Number**: 1
**Started**: 2026-09-04 18:41
**Status**: Complete

---

## Summary

Teach `install_skills()` in `scripts/setup-consumer.sh` to resolve the consumer's tracker and skip the tracker-specific skills that can never fire on it, with a grandfather rule so no existing install loses a skill on `--update`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (absent)                                                           |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.83.*` exists in git                             | Branch created at `698af9d`, pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.83.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT, 9/10. 1 Critical + 4 Important fixed in-place; 1 Important skipped (no tracker linkage) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                    | 1 loop iteration. 4 phases, 6 files. Fast gate green (2343 tests, 0 fail). 7 mutations proven | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #315: https://github.com/Gamaroff/agent-skills/pull/315 — base `develop`. Issue comment skipped (no linked issue) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.83.qa.{N}.*.md`; `task.83.gate.{N}.*.yml`; Step 5c verdict; PR comment posted | 3 cycles: FAIL 70 → CONCERNS 80 → PASS 95. 4 findings, 3 promoted, all closed. Step 5c `/review-pr` → CONCERNS (no high-severity), report `task.83.pr-review.1.*.md`, all 3 findings actioned | —                    |
| 7. finalise                | ✅ Done    | `task.83.dod.{N}.*.md`; task `status: accepted`                    | DoD PASSED. CI SUCCESS on `6d2e644`. Security probe mode: 14 candidates executed, 0 reproduced. `shellcheck` closed at 0 new warnings via container. Sprint review written | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final `docs(task.83)` commit — implementation report, DoD, sprint review, PR review report | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-04

- Invoked by `/develop-next` (roadmap item T83, source: roadmap, PHASE 5 — Current frontier). **AUTONOMOUS RUN** directive applied: Phase 0d questions auto-answered with the recommended option, no prompting.
- Feature branch base: `develop` — auto-answered (recommended; current branch is `develop`)
- PR target branch: `develop` — auto-answered (recommended)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel: resolver agent not dispatched (path supplied by the selector, already resolved). Tracker poll and lite-mode inputs gathered deterministically in-process rather than via subagents.
- Pipeline mode: **standard** — risk_ok = true (risk_level absent) AND phase_count = 4 (**not** < 3) AND single_module = true. The phase count fails the AND, so lite mode does not apply.
- Tracker: github; no `github_issue` in frontmatter → all tracker signalling skipped this run.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`.
- review-task output: Comprehensive report — required for pipeline audit trail (auto-answered).
- review-task Step 0a branch setup: auto-skipped — already on `feature/task.83.*`.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status promoted `planned` → `ready-for-development`.
- Review report: `docs/tasks/task.83.platform-aware-skill-exclusion/task.83.review.1.platform-aware-skill-exclusion.md` (9/10, READY TO IMPLEMENT).
- review-task Step 8.6 (Jira body push) skipped — TRACKER=github. Step 10 (tracker comment) skipped — no linked issue.
- Pre-develop surface map: 6 files identified — `scripts/setup-consumer.sh` (usage header, flag parser
  :41, `SKILLS_REPO` :729, `install_skills` :755, `write_skills_config` :455-500, call sites :1115/:1126,
  sourcing hook :1136), `shared/resources/tests/setup-consumer-config.test.mjs` (harness pattern +
  asserts config output), `package.json:26` (test globs), `docs/concepts/getting-started.md` (wizard
  table step 8), `CHANGELOG.md`, `shared/resources/resolve-platform.sh` (canonical resolver order, read
  only). Map built in-process during Step 2 verification rather than by a subagent.
- Plan file found: `task.83.plan.platform-aware-skill-exclusion.md` — used as implementation context,
  and amended in place where the review's corrections superseded it (resolver fallback, package.json
  registration, dry-run parity).
- Develop loop: 1 iteration, exited on `Ready for Review`. No stall, no MAX_ITER pressure.
- Step 4 SCOPE_PATHS: `docs/tasks/task.83.platform-aware-skill-exclusion`, `scripts`,
  `shared/resources/tests`, `docs/concepts`, `CHANGELOG.md`. Pre-flight guard held nothing — every
  untracked file was already in scope. Leak check after commit: clean.
- Step 4 commit `9edb699` — 9 files, +1277/-94. The implementation report and review report are
  committed here (first commit), per the Step 4 contract, so the audit trail is readable during QA.
- Fast gate (`npm run ci:fast`): first run RED on `prettier --check` for the new test file — the exact
  failure mode the fast gate was added to catch. Formatted and re-run: green, 2343 tests, 0 failures,
  1 skipped.
- Mutation proving: 7 mutations, each turned the intended test red. M7 (`grep -qxF` → `-qF`) initially
  stayed green and exposed a defect in my own test, not the code — I had asserted a *longer* name
  (`sync-jira-epic-v2`), which `-F` does not match either. Corrected to assert a *substring* name
  (`sync-jira`, which `-F` matches against the line `sync-jira-epic`); M7 then went red.
- Success criteria: all ticked except `shellcheck` — **not installed on this machine**, so that
  criterion is left unticked and flagged rather than claimed. `bash -n` parses clean.
- Step 1: branch `feature/task.83.platform-aware-skill-exclusion` created from `develop` at `698af9d` and pushed. Implementation report stashed before branch creation, restored after (clean pop).
- Step 1 Signal Work Started: skipped — no `github_issue` linked to this task.

- Step 5 re-entered on resume (`/develop-next` found lock at `current_step: 5`). Steps 1–4 artifacts
  re-verified: branch present, review report on disk, task `status: ready-for-review`, PR #315 OPEN.
- Step 5 QA-start board re-assert: skipped — `TRACKER=github` but no `github_issue` linked.
- Step 5 traceability mapper: **skipped** — subagent dispatch is not authorised in this session; the
  reference permits proceeding without the matrix and `/qa-task` falls back to its internal mapping.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 2 (review-task) — Critical, resolved.** The task's specified resolution order for
  `_resolve_install_tracker` could never return `github`: `write_skills_config` writes a `tracker:` key
  only for Jira consumers, so a GitHub consumer on `--update` fell through every branch to `""` and
  excluded nothing — inert on the exact path the task exists to fix. Fixed in the task document by
  mirroring `resolve-platform.sh`'s order including its `github` default, plus a companion change making
  the wizard write `tracker: github` explicitly.
- **Step 2 — Important, resolved.** Phase 3 instructed registering the new test suite in `package.json`'s
  glob; `package.json:26` already globs `shared/resources/tests/*.test.mjs`. Replaced with a verification
  step; `package.json` moved to "Unchanged by design".
- **Step 2 — Important, resolved.** §10 Risk 3 called the classification-parity test mandatory but no
  Phase 3 checkbox implemented it. Added to Phase 3 and to Success Criteria.
- **Step 2 — Important, resolved.** The `--dry-run` "same counts as the real run" criterion was
  unachievable — that branch returns before the tarball is downloaded. Relaxed to reporting the resolved
  tracker and applicable exclusion set.
- **Step 2 — Important, resolved.** Skill counts (119/108/113) were already stale (tree holds 120).
  Restated relatively as `total − 11` / `total − 6`.
- **Step 2 — Important, OUTSTANDING.** Task has no `github_issue` frontmatter linkage (64 of 90 task docs
  in this repo carry one). Not auto-fixed: creating a remote issue is an outward-facing side effect and
  the review skill permits leaving it unlinked. Run `/sync-github-task` on this file to link it. All
  tracker signalling in this pipeline run is skipped as a result.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-04

**5a `/qa-task` — Gate: FAIL (70/100).** Artifacts: `task.83.qa.1.*.md`, `task.83.gate.1.*.yml`,
`task.83.bug.1.tracker-resolution-divergence.md`, `task.83.bug.2.env-probe-asymmetry.md`.
`code_review_blocking=true` (pipeline override; task carries no opt-out), so the two `category: bug`
findings with high confidence were promoted to `top_issues[]` and gate rule 1 applied.

- Traceability mapper and the Step 3b review subagent were **not** dispatched — subagent dispatch is
  unavailable in this session. The diff review was performed directly over the whole
  `origin/develop...HEAD` diff, which is the first-review scope anyway; the reference explicitly
  permits proceeding without the matrix.
- Step 4b (execute documented commands): **not applicable** — no `SKILL.md` and no
  `shared/resources/*.md` in the change set.
- Full suite at cycle start: `npm run ci:fast` exit 0, 2343 tests, 0 fail, 1 skipped, prettier clean.
- **CR-001 (HIGH)** — `_resolve_install_tracker` re-derived the config parse instead of mirroring
  `resolve-platform.sh`. Found by *executing* both resolvers over a table of legal config spellings
  rather than reading the code: `tracker: "jira"`, `tracker: 'jira'` and a CRLF line all resolved
  `jira` at runtime and `github` at install. Reproduced end-to-end against a fixture tarball — the
  Jira skills were pruned from a Jira repo and the GitHub-only ones installed.
- **CR-002 (MEDIUM)** — the same divergence in reverse: the installer probes `.env` for `JIRA_URL`,
  `resolve-platform.sh` does not.
- Verified rather than assumed: the grandfather rule and the classification drift guard were each
  mutation-proven by QA (M1, M2, M3), and the CHANGELOG's token claim was recomputed independently
  (1,505 / 11,702 = 12.9% against the documented ~13%).

**5b `/qa-fix` — both findings addressed, 1 iteration.**

- CR-001: widened the awk pattern from `[a-z]` to `[^[:space:]]` (a quoted value starts with a quote,
  so the line had not been matching *at all*), took the rest of the line instead of `$2`, and added a
  bash normalisation step stripping a trailing CR and a **matched** quote pair. A lone unmatched
  quote deliberately falls through to the default rather than being repaired.
- CR-002: chose the gate's second option — **keep** the `.env` probe, correct the over-claiming
  comment and the CHANGELOG, pin the asymmetry with a test. Dropping the probe was listed first in
  the QA report as "simplest" and is wrong: the installer runs once in a plain shell while the skills
  run later in a shell that has `JIRA_URL`, so deleting it would trade a rare disagreement for a
  common one. Reasoning recorded in `task.83.bug.2.*`. Auto-answered per the develop-next directive
  (recommended option, logged) rather than prompting.
- Tests: suite 22 → 34. The new §4b block asserts the two resolvers **agree** across ten spellings by
  sourcing the real `resolve-platform.sh`, so they cannot drift together and still pass.
- Mutation proofs: M4 (revert the whole read → 3 parity tests red), M5 (remove only the bash
  normalisation → 2 red, CRLF still passes, showing the two halves cover different cases and neither
  is dead code), M6 (remove the `.env` probe → asymmetry test red). Each mutation applied to a backup
  copy and restored immediately.
- Step 3.5 adversarial pass: no lifecycle surface in this change (a pure shell parser), so the four
  transition probes do not apply. Re-read the combined diff for parser edge cases instead — nested
  `access.tracker` is not matched (anchored `^`), the map form still does not match, an empty value
  is safe, and the awk is POSIX-portable across BSD and GNU.

### QA Cycle 2 — 2026-09-04 (refute pass)

**5a `/qa-task` — Gate: CONCERNS (80/100).** Artifacts: `task.83.qa.2.*.md`, `task.83.gate.2.*.yml`.
Cycle 2 is the refute pass, so the scope was the whole `origin/develop...HEAD` diff rather than the
files changed since gate 1, and the target was cycle 1's own fixes.

- **Both cycle-1 findings closed, verified by re-running the checks that found them** — not by
  re-reading the fix. The resolver differential now agrees on every previously-diverging shape, and
  the end-to-end repro inverted: `tracker: "jira"` installs `sync-jira-story` +
  `jira-sprint-manager` and prunes `sync-github-story`.
- **RF-001 (MEDIUM), new** — and it is in cycle 1's fix, not the original change. The new
  `runtimeTracker()` helper scrubbed `JIRA_URL` and `TRACKER` from the test environment but not
  `SKILLS_CONFIG_FILE`, which `resolve-platform.sh` honours as an override of *which config file to
  read*. An ambient value redirects all ten parity cases away from their fixture. `callFn()` names
  this exact hazard in its own comment — the list was copied and not extended.
- **RF-002 (LOW)** — `tracker:<TAB>jira` diverges, but the pre-fix script at `9edb699` behaves
  identically, so it is pre-existing, and the value is malformed YAML that `yaml.safe_load` itself
  rejects. Filed with CR-003 under `future`, not in `top_issues`.
- Probes run and clean: `tracker:` under `access:`, the flow form `tracker: {workflowFile: …}`,
  duplicate keys, a comment-only value, mismatched quote pairs, and CR-strip ordering.

**5b `/qa-fix` — RF-001 fixed.**

- Consolidated **three** copies of the environment scrub list into one `hermeticEnv()` helper. There
  were three, not two: `runInstall` had its own. Three copies of a list whose failure mode is "copied
  and not extended" is the rot itself, so the fix is the consolidation rather than a third patch.
- The list now also covers `AGENT_SKILLS_ACCESS_*`, which can make the resolver `return 1` and leave
  `TRACKER` stale — the same class of hole, found while enumerating what either resolver reads.
- Took the gate's `future` item for `runtimeTracker()` as well, because it is what makes RF-001's
  failure legible: the helper now captures the resolver's exit status and asserts 0, so a future
  refusal reports "it refused to resolve" rather than "the two resolvers disagree".
- New test: an ambient `SKILLS_CONFIG_FILE` pointed at the **opposite** tracker cannot redirect the
  fixture — opposite so a scrub that stops working cannot pass by coincidence.
- Mutation proofs: M7 (drop `SKILLS_CONFIG_FILE` from the list → decoy test red), M8 (point
  `RESOLVER` at a script that returns 1 → the new assertion fires with its intended message rather
  than a bogus disagreement).

### QA Cycle 3 — 2026-09-04

**5a `/qa-task` — Gate: PASS (95/100).** Artifacts: `task.83.qa.3.*.md`, `task.83.gate.3.*.yml`.
Scope narrowed per the default rule (not the refute pass, `SAFETY_REPROBE` false): the only file
changed since gate 2 is the test file — `scripts/setup-consumer.sh` was untouched this cycle, which
is itself the point, since RF-001 was a defect in the guard rather than in shipped behaviour.

- **RF-001 closed, verified under real pollution.** The decoy test asserts the scrub works, but a test
  that sets the variable inside itself can pass while the helper is still reachable another way. So
  the suite was re-run with `SKILLS_CONFIG_FILE` and `AGENT_SKILLS_ACCESS_TRACKER` genuinely exported
  into the runner: 2 pass / 1 pass, both of which would have failed before the consolidation.
- **No new findings.** Probes on the cycle-2 diff all clean — `hermeticEnv`'s merge order still lets an
  explicitly-passed variable win, `runInstall`'s switch breaks no integration test, the exit-status
  transport is safe, and the decoy's `process.env` mutation cannot leak given per-file isolation.
- **Corrected a defect in QA's own gate 2.** It carried cycle 1's *closed* HIGH entry forward "so the
  gate carries the history". The pipeline's third-strike rule reads `file:` on every HIGH entry across
  the last three gates and deliberately ignores `status: closed`, so that made one finding look like
  `scripts/setup-consumer.sh` struck twice — a third would have tripped "replace, do not patch again"
  on a file with nothing wrong with it, in a loop that was converging. Removed, with a comment
  recording why. Convergence on the corrected gates: HIGH 1 → 0 → 0.
- **`shellcheck` escalated rather than looped on.** Not installed on this host *and* not run by any CI
  workflow (`.github/workflows/` checked), so no fix cycle can tick it. Carried to Step 7 as a named
  decision — run it before merge, or file the CI lane as its own task. It is the five points held back
  from 100.
- The `.env` residual is recorded as a known limitation with a named follow-up, not as a defect:
  bounded (the wizard now always writes `tracker:`), grandfathered, escapable via `--all-skills`, and
  tested. Holding the gate on it would have created a loop that could not converge.

**QA loop summary: 3 cycles, FAIL (70) → CONCERNS (80) → PASS (95). 8 QA mutation proofs (M1–M8).**

---

## Completion

**Finished**: 2026-09-04 22:45
**Final Status**: Completed
**Branch**: `feature/task.83.platform-aware-skill-exclusion`
**PR**: [#315](https://github.com/Gamaroff/agent-skills/pull/315) — OPEN, CI SUCCESS on `6d2e644`
**QA Iterations**: 3 (FAIL 70 → CONCERNS 80 → PASS 95)
**DoD Summary**: `task.83.dod.1.platform-aware-skill-exclusion.md` — ACCEPTED
**Tracker debt**: **Yes, one item.** This task carries no `github_issue`, so *every* tracker signal in
this run was skipped: work-started, in-review, in-qa, changes-requested, done and pr-merged all fired
nowhere, and no board card exists. `/review-task` flagged the missing linkage as an Important finding
in Step 2 and deliberately did not auto-fix it, since creating a remote issue is an outward-facing side
effect. Run `/sync-github-task` on the task file to link it retrospectively.

### What the QA loop actually bought

Worth recording, because the loop's value is not obvious from a green gate. The change passed the
developer's own fast gate, 2343 tests and seven mutation proofs — and still shipped a defect that
inverted the feature for Jira consumers. It was found by **executing both resolvers over a table of
legal config spellings** rather than by reading the code, and confirmed by reproducing the install
end-to-end against a fixture tarball. The reading-based reviews before it, including a 9/10 review
report, had not caught it.

Cycle 2's refute pass then found a second defect *in cycle 1's fix* — the pattern the refute directive
exists for. Cycle 3 found nothing, which is the signal the loop had converged rather than stalled.

One process defect was found in QA's own output: gate 2 carried a closed HIGH entry forward "so the
gate carries the history", which would have fed the third-strike detector a false second strike on
`scripts/setup-consumer.sh`. Corrected in cycle 3 with a comment recording why.

### Outstanding after merge

1. **File the `resolve-platform.sh` `.env` follow-up.** The one residual that ships: a repo with no
   `tracker:` key whose `JIRA_URL` is in `.env` and never exported resolves differently at install and
   run time. Bounded, tested, documented — but un-owned.
2. **Link this task to a tracker issue** (`/sync-github-task`).
3. Optional, recorded in `gate.3` under `future`: a `shellcheck` CI lane, and deciding whether the
   installer should refuse malformed `tracker:` input rather than defaulting.
