# Sprint Review Summary - QA tracker comments are keyed per cycle

**Story/Task ID:** task.121
**Epic:** _(standalone task)_
**Completed Date:** 2026-09-18
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#430](https://github.com/Gamaroff/agent-skills/pull/430)

---

## Summary

`tracker-comment.js` keyed its idempotency marker on `--stage` alone, so a tracker issue carried QA cycle 1's gate and fix comments and reported success for every later cycle. `qa-gate` is now cycle-scoped, the three QA skills suffix `qa-gate-{N}` / `qa-fix-{N}` at every site, the cycle comes from one refusing helper, and two guards fail on a bare or hand-derived cycle.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every QA cycle's gate and fix comment reaches the tracker issue with a distinct marker — met live on #421 (`qa-gate-1..5`, `qa-fix-1..4`, in order)
- [x] A resumed cycle still returns `already` for its own suffixed stage
- [x] The orchestrator's duplicate `qa-cycle-{N}` / `qa-fix-{N}` blocks are gone; `develop-bug`'s verify-loop call is unchanged and still passes the guard
- [x] No change to comment latency; one extra list member in the validator
- [x] `npm test` green; the guard has a non-vacuity floor and recorded mutation proofs
- [x] `CYCLE_SCOPED_STAGES` remains the single definition; the contract table cross-references it
- [x] Contract documents the stage classes; observation #75 marked `actioned` with PR #430

### Key Features Implemented

- **`qa-gate` joins `CYCLE_SCOPED_STAGES` / `CYCLE_SCOPED_LEAD_STAGES`**: one array member each, held in parity by the existing test (now four members).
- **`shared/resources/qa-cycle.sh`** (bundled as `references/qa-cycle.sh` into qa-task, qa-story, qa-fix): prints the **highest-numbered** gate's cycle — not the newest by mtime — and **refuses** (exit 1, empty stdout, one warning) when no gate is numbered, because a guessed `1` would reproduce the bug it replaces. Called in every fenced block that uses the cycle, from the repo root, rc-checked.
- **Six call sites suffixed**: tracker and PR-lead calls in the three QA skills pass `--stage "qa-gate-${QA_CYCLE}"` / `"qa-fix-${FIX_CYCLE}"`; the precompact hook's lead passes `pipeline-paused-${CURRENT_STEP}`.
- **Contract table** "Once per issue, or once per cycle" in `tracker-comment-contract.md`, cross-referencing the engine list rather than restating it.
- **Guards**: `comment-slot-coverage.test.mjs` fails on a bare or literal-numbered cycle-scoped stage at any tracker or PR-lead site (floor ≥4 per population); `tests/qa-cycle.test.js` (25 tests, bash + zsh) proves the helper, the same-block and root-form call shape, and that no SKILL.md derives the cycle inline — including the two-line continued form.

---

## Technical Details

### Files Modified/Created

- `shared/resources/tracker-comment.js` — `qa-gate` in `CYCLE_SCOPED_STAGES`; `isKnownStage` rejects a suffix that normalises to 0
- `shared/resources/stakeholder-summary.js` / `.md` — `qa-gate` cycle-scoped lead; catalogue note
- `shared/resources/qa-cycle.sh` — new helper (refuses rather than guesses; digits-only guard before arithmetic)
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md` — six blocks call the helper and pass suffixed stages; qa-story naming section and tree examples numbered
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — orchestrator `qa-cycle-{N}` / `qa-fix-{N}` blocks replaced with pointers
- `shared/resources/develop-pipeline-on-precompact.sh` — lead stage `pipeline-paused-${CURRENT_STEP}`
- `shared/resources/tracker-comment-contract.md` — stage-class table, helper description
- `tests/qa-cycle.test.js` (new; replaces `tests/qa-cycle-derivation.test.js`), `shared/resources/tests/tracker-comment.test.mjs`, `stakeholder-summary.test.mjs`, `comment-slot-coverage.test.mjs`, `evals/shared/tests/transition-protocol-parity.test.mjs`
- `CHANGELOG.md` — `(task 121)` entry under `[Unreleased]` → `### Fixed`
- Bundled `references/` copies regenerated across the consuming skills

### Architecture/Design Decisions

- **The cycle is derived where it is used, from one definition.** Each fenced block in a skill runs in its own shell, so a value derived in one block does not exist in the next; a helper called per block is what makes "derive once" mean "one definition" rather than "one block" (QA cycle 2, BUG-2).
- **Refuse, never guess.** A helper that fell back to `1` would key every cycle to cycle 1's marker and reproduce the original defect wearing a suffix. Refusal is loud: the block skips the tracker post with a warning and the engine returns exit 2 on an empty suffix.
- **The rule is mechanical.** The guard derives its expectations from the engine's list and from the shipped prose, so a new cycle-scoped stage or a new call site cannot ship bare.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — `qa-gate` markers on issues written before this change stay as they are; new cycles post beside them

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 25 in `tests/qa-cycle.test.js` (bash + zsh); extended cases in `shared/resources/tests/tracker-comment.test.mjs` (74), `stakeholder-summary.test.mjs`, `comment-slot-coverage.test.mjs`; `evals/shared/tests/transition-protocol-parity.test.mjs` floors 259/6 measured
- **Integration Tests:** live consumer criterion on issue #421 across five QA cycles
- **Test Coverage:** `npm run ci:fast` 3440/3441 (1 skipped); every fix mutation-proved (revert → red)

### Code Review

- **Reviewers:** Step 5c `/review-pr` (code + conformance lenses) — advisory CONCERNS; documentation findings applied in `41964e2b`, behaviour follow-ups recorded
- **Approval Status:** ✅ Accepted by `/finalise` DoD verification (no formal GitHub review decision)
- **Review Comments Addressed:** all documentation findings; two follow-ups recorded (develop-bug's `/qa-fix` cycle source; a qa-fix-specific body file)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — boundary deliverable, probed by execution

- [x] No hardcoded secrets across 96 changed files
- [x] No `eval`/`exec`; every shell expansion in `qa-cycle.sh` quoted; hostile filenames (`$(…)`, backticks, `;|`, `--`, `-n`, `g[1]`) executed — nothing ran
- [x] `isKnownStage` refused all 12 hostile stage strings, accepted the 5 legitimate ones
- [x] Two low-severity fail-closed defects found by the finalise probe and **fixed in `a412f59a`**: a newline-bearing gate filename aborted the helper's loop (exit 0 with a lower cycle) — now pattern-checked before arithmetic; `qa-gate-0` was admitted — now `> 0`. Both tested, both mutation-proved, both re-probed

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR / PCI-DSS / WCAG / HIPAA — not applicable: skill Markdown, a bash helper, engine allow-lists and tests; no personal data, payments, UI or health data

---

## Documentation

### Updated Documentation

- [x] `tracker-comment-contract.md` — "Once per issue, or once per cycle" table
- [x] `stakeholder-summary.md` — `qa-gate` cycle scope
- [x] `develop-pipeline-step-5-6-qa-loop.md` — why the orchestrator no longer posts the cycle comments
- [x] `CHANGELOG.md` — `(task 121)` entry
- [x] Skill catalog — unchanged (no `name`/`description` frontmatter changed)

### Documentation Links

- `docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.dod.1.cycle-scoped-qa-tracker-comments.md` — DoD verification log
- `docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.gate.5.cycle-scoped-qa-tracker-comments.yml` — final gate (PASS 100/100)
- `docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.pr-review.1.cycle-scoped-qa-tracker-comments.md` — Step 5c review

---

## Demo Notes

### How to Verify

1. Open issue #421 and count the hidden markers: `gh api repos/Gamaroff/agent-skills/issues/421/comments --paginate -q '.[].body' | grep -o 'agent-skills-comment:qa-[a-z]*-[0-9]*' | sort -u`
2. Expected: `qa-gate-1` … `qa-gate-5` and `qa-fix-1` … `qa-fix-4`, one each — a tracker issue that carries every cycle.
3. Run the helper against the task directory: `bash skills/qa-task/references/qa-cycle.sh docs/tasks/task.121.cycle-scoped-qa-tracker-comments` → prints `5`.
4. Run it against an empty directory → prints nothing, one warning on stderr, exit 1.

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

A stakeholder reading the tracker issue sees the outcome of every QA cycle, not only the first — the plain-language lead on each cycle's comment is now actually delivered, which is what the stakeholder-summary standard promised.

### Technical Impact

Removes a silent-success failure mode that three consecutive tasks (110, 113, 119) hit without noticing, closes observation #75 and the seven observations it consolidates, and leaves a guard that makes the class of defect unshippable rather than merely fixed.

---

## Known Limitations & Future Work

### Current Limitations

- `develop-bug`'s `/qa-fix` invocation has no gate files to derive a cycle from (general bugs carry no gate), so the helper refuses there and the tracker fix comment is skipped with a warning — a follow-up named by the Step 5c review.
- Advisory follow-ups from gate 5: qa-fix's shared body-file path (F1), the helper's header usage example (F2), zero-padded gate names in prose (F3), stale test comments (F4).

### Future Work

- Give `develop-bug`'s fix loop its own cycle source (or a bug-specific stage) so its fix comments post per cycle too.
- A qa-fix-specific body file, or a warn-and-skip on an empty body, at the qa-fix tracker call.
