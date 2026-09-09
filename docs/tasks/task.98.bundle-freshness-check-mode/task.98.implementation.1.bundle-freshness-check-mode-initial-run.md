# Implementation Report: A per-file bundle-freshness assertion

**Task**: `task.98.bundle-freshness-check-mode.md`
**Run Number**: 1
**Started**: 2026-09-09 21:10
**Status**: In Progress

---

## Summary

Carry forward the `--check` mode split out of task 86 unmerged: a per-file bundle-freshness assertion that catches the four classes regenerate-and-diff cannot see (deleted source, symlinked reference, non-bundler-output collision, banner/path mismatch), starting from task 86's five-cycle QA findings as the backlog.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (issue #366, board `Agent Skills`, verified `Todo → In Progress`) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.98.*` exists in git                               | `feature/task.98.bundle-freshness-check-mode` created from `develop` at `48cfae98`; pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.98.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 9/10 — 0 Critical / 3 Important / 1 Optional, all fixed in Step 8.5; status promoted draft → ready-for-development; issue #366 created and linked | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 7-class `--check` mode + 20 tests + 11 mutation proofs; `validate.yml` wired; `ci:fast` green (3013 pass / 0 fail); found+fixed a live stale bundled copy | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #367](https://github.com/Gamaroff/agent-skills/pull/367) → `develop`; comment posted to #366 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.98.qa.{N}.*.md`; `task.98.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.98.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- Invoked by `/develop-next` (autonomous run). Item T98 selected by `select-next.mjs`; `item.source = task-registry` (no roadmap phase held an actionable row).
- Feature branch base: `develop` — auto-answered (develop-next AUTONOMOUS directive; recommended option, current branch is `develop`).
- PR target branch: `develop` — auto-answered (develop-next AUTONOMOUS directive; recommended option).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 fan-out run **inline rather than via Explore subagents**: the file path was supplied directly (resolver unnecessary), no tracker issue exists to poll, and lite-mode inputs were read straight from frontmatter. Session policy also bars unrequested subagent dispatch.
- Pipeline mode: **standard** — computed from `risk_ok = (risk_level "medium" ∈ {low, absent}) = false`; the AND short-circuits regardless of phase count / single-module.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` absent (`github_issue:` not in frontmatter). Step 1 §"Signal Work Started" skipped per 0c-reg (no issue to signal); `/review-task` check 5 created it.

### Step 2 — review-task — 2026-09-09

- Step 0 output format auto-answered: **Comprehensive report** — pipeline audit trail.
- Gate check: status `draft`, no review report present -> ran the review (a `draft` task proceeds per Phase 0c; Step 2 validates and promotes it).
- Pre-pass Explore subagents **not dispatched**; both axes verified inline instead — architecture alignment by reading `bundle_skill.py` / `validate.yml` directly, already-implemented status by grepping for `--check` and the seven class names (zero hits, confirming the task-86 split removed it). Session policy bars unrequested subagent dispatch.
- Tracker sync auto-answered: **Sync to GitHub**. Dedup search `in:title "[Task 98]" --state all` -> 0 matches -> created issue **#366** (`task`, `priority:medium`, milestone `Technical Tasks (standalone)`), added to board, Priority P2 set. Board Estimate field does not exist on this project — warned, non-blocking.
- Card preflight (`sync-jira-task.js --check-card`): `ok: true`, 0 findings; three blocks resolve.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes**. 4 applied, 0 skipped.
- Step 9 auto-answered: **Yes, fixes complete** -> `draft` -> `ready-for-development`.
- Review report: `task.98.review.1.bundle-freshness-check-mode.md`. Outcome comment posted to #366 (`reason: posted`).
- `work-started` signalled after the issue existed: board `Todo -> In Progress`, verified.

---

### Step 3 — develop — 2026-09-09

- Pre-develop surface map built **inline**, not via an Explore subagent (session policy bars unrequested dispatch). Surface: `skills/create-skill/scripts/bundle_skill.py` (672 lines, the whole implementation — `expected_bytes`:156, `_within`:171, `discover_needed`:179, `source_backed_on_disk`:264, `banner`/`declared_source`:311-343, `_looks_bundled`:343, `writable_copy`:395, `write_if_changed`:409, `bundle_skill`:517, `main`:633), `.github/workflows/validate.yml` (the regenerate-and-diff step), `tests/bundle-transitive.test.js` (the fixture harness this task's tests are modelled on), `package.json` (test globs), `evals/shared/tests/ci-gate-parity.test.mjs` (the CI-wiring constraint).
- No plan file exists for this task — proceeded without one.
- Internal gates: none fired (`risk_level: medium`, status already `ready-for-development` after Step 2).
- **Implementation**: added `check_skill` / `check_all` / `banner_declaration` / `REGENERABLE` / `REMEDIES` to `bundle_skill.py`, plus `--check` CLI dispatch (implies `--all` when given no target). Seven classes: STALE, MISSING, WRONG MODE (regenerable) and ORPHANED, SYMLINK, AMBIGUOUS, MISDECLARED (not). Every comparison goes through `expected_bytes`, so the check cannot drift from the writer.
- **20 tests** in `tests/bundle-check-mode.test.js`, collected by the existing `'tests/*.test.js'` glob (verified — no `package.json` test-glob edit needed).
- **11 mutation proofs**, each reverting one behaviour and confirming a test goes red; control restores 20/20. One mutation (M3, byte-bounding the banner window) initially **reded nothing** — a statement about the tests, not the code: the orphan fixtures were all short enough that any window found the banner, and the existing long-frontmatter test routes through `_looks_bundled` rather than the new `banner_declaration`. A late-banner orphan test was added to close that, after which M3 reds.
- CI wiring: one new **`validate.yml`** step, placed *before* regenerate-and-diff because the check is read-only and must speak about the tree as committed. `test.yml` untouched → `ci-gate-parity.test.mjs` unaffected (re-run, green). `npm run bundle:check` added for local use.

### Findings this task produced — 2026-09-09

1. **A live instance of the gap, found on the check's first run.** `skills/create-skill/references/skill-dependencies.json` was 44 bytes behind its source and had been for some time. Because `.json` carries no provenance banner and the copy was not byte-identical to the source, `_looks_bundled` could not prove it was bundler output, so the bundler printed `SKIPPED — not bundler output, left alone` and regenerate-and-diff saw no diff. The stale content was not cosmetic: the copy was missing the `observe-work → create-skill` dependency edge. Fixed by the remedy the check prints (delete + re-bundle), and verified by measurement — check → fix → check clears it, and the file is now byte-identical to its source. The task document said "none has a live instance in the tree today"; that was true for the four classes it enumerated and false for this one.
2. **Residual 4 from task 86 is fixed, not inherited.** A directory sitting at a needed reference name was previously reported MISSING and bucketed regenerable, under a remedy the write gate refuses forever. It now classifies AMBIGUOUS. Mutation-proved.
3. **Pre-existing, out of scope, recorded:** `shared/resources/observation-log-contract.md` contains the literal `shared/resources/<name>` in prose, so discovery emits `⚠️ shared/resources/<name> not found` on every run. Confirmed pre-existing — a plain `npm run bundle` prints it too. It is discovery noise, not a freshness class, and fixing it would mean teaching discovery about placeholders. Left alone.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Fast gate caught a formatting failure the test run could not** (2026-09-09). `npm run ci:fast` failed on `prettier --check` for the new test file while every test passed. This is precisely the task-67 failure mode the fast gate was widened to catch — `npm test` alone would have gone green locally and red in CI. Fixed with `prettier --write` and the gate re-run.

- **The repo's own relationship-assertion lint caught an unbounded assertion in a qa-fix test** (2026-09-09, QA cycle 1 fixes). `tests/relationship-assertion-lint.test.js` flagged `assert.match(detail, /delete it and re-bundle/)` under rule B: the pattern ends on a renameable token with no boundary, so a rename that *appended* a suffix would keep the test green while the message it guards had changed. Both occurrences anchored with `$`. Worth recording for two reasons: the finding is exactly the vacuity class this task's own §8 warns about, and it was caught by a repo-wide check rather than by the author — a second instance in this run of the fast gate finding what the targeted suite could not.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-09

| Field | Value |
|---|---|
| **Gate** | CONCERNS — 90/100 |
| **Artifacts** | `task.98.qa.1.bundle-freshness-check-mode.md`, `task.98.gate.1.bundle-freshness-check-mode.yml` |
| **Success criteria** | 7/7 met |
| **Phases** | 4/4 verified |
| **Issues** | HIGH 0 · MEDIUM 1 · LOW 1 |
| **NFR** | Security PASS (*measured*, 3 hostile probes) · Performance PASS · Reliability PASS · Maintainability PASS |
| **PR Review** | ✅ **APPROVE** — `task.98.pr-review.1.bundle-freshness-check-mode.md`, 4 findings all `severity: low`; PC-1 applied inline |

**Findings** — both in how the check *reports*, not in what it detects:

- **T98-QA-001 (medium)** — a stale copy of a **headerless** suffix (`.json`) always lands in `AMBIGUOUS`: no banner is possible, so evidence 1 is unavailable by construction and evidence 2 fails the moment the copy drifts. The classification is defensible; the remedy was not — it led with "rename the authored file" when the right action is delete-and-re-bundle. Not hypothetical: the live defect this check found in the tree was exactly this shape, and the generic remedy would have sent the reader the wrong way.
- **T98-QA-002 (low)** — an unreadable file (mode 000) was reported as "carries no provenance banner and is not byte-identical", asserting two facts about content the check never read. `_looks_bundled` returns the same `False` for "read it and neither test passed" and "could not open it", and the message took the first reading.

**Methodology caveat, recorded rather than glossed**: Step 3b's diff review ran **inline**, not via an independent read-only subagent (session policy bars unrequested dispatch). The same context that wrote the code reviewed it, which is a genuine weakening. Every finding was therefore reached by *executing a probe* rather than by reading and reasoning.

**Fixes (cycle 1)** — both applied, both re-probed, all three behaviours mutation-proved:

- `_ambiguity_detail()` gives a headerless suffix its own detail naming why it can never prove itself, and pointing at delete-and-re-bundle. The `.md` case keeps the generic text — a test pins that, because telling the owner of an authored file to delete it would be worse than the original bug.
- `_read_text_or_error()` + a new **`UNREADABLE`** class, with a `_is_binary()` carve-out so a non-UTF-8 file (which opens fine as bytes, and for which `_looks_bundled` has a deliberate answer) still falls through to the byte comparison instead of being reported as a broken instrument.
- 4 new tests (24 total), 3 new mutation proofs (M12–M14), all red; control 24/24.

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.98.bundle-freshness-check-mode`
**PR**: [#367](https://github.com/Gamaroff/agent-skills/pull/367)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
