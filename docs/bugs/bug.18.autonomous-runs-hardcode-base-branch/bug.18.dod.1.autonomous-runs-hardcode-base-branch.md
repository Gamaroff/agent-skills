# Definition of Done Verification

**Bug:** bug.18.autonomous-runs-hardcode-base-branch (general bug — `docs/bugs/bug.18.autonomous-runs-hardcode-base-branch`)
**Verification Started:** 2026-10-10T07:30Z
**PR:** [#625](https://github.com/Gamaroff/agent-skills/pull/625) → `develop`, head `cb3b044461e5`
**Mode:** `/finalise --bug` — fix-evidence DoD for a bug report. A bug has no acceptance criteria, carries no Change Log (`document-change-log.md` §Exclusions), and closes through its own lifecycle in `develop-bug` Step 7 Part B; the story/task-shaped steps are skipped by the mode, not by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited.

---

## Step 1: QA Report Review

**QA Reports:** none. A bug directory carries no gate file (`bug.18.qa.*.md` / `bug.18.gate.*.yml` match nothing), so the develop-bug verify loop is the QA record. That is 1 cycle in `bug.18.implementation.1.autonomous-runs-base-branch.md` §QA Iteration History, with verdict PASS. The bug file's `#### QA Verification` on Iteration 1 reads `✅ Fixed`. The cycle's `/review-code` pass found 0 blocking and 3 non-blocking findings (CR-1, CR-2, CR-3), all applied in `cb3b0444`.

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** ✅ PASS

#### Expected behaviour — "an autonomous run takes Phase 0d's recommended options verbatim … `develop-batch` either supports such items … or excludes them from the frontier with a logged reason."

**Status:** ✅ PASS

- Code evidence: `skills/develop-next/SKILL.md:126` (the directive takes Phase 0d's Recommended option and names no branch). `skills/develop-batch/SKILL.md:296-304` (the directive names `<baseBranch>` only beside an integration-branch HALT). `skills/develop-next/scripts/select-next.mjs:1502` (`storyBranchModel`) and `:1603-1611` (`excluded[]` entry with an `epic-integration:` reason), wired to the CLI at `:1842`.
- Test evidence: `evals/shared/tests/orchestrator-directive-branch-literal.test.mjs:111` and `evals/develop-next/unit/select-next.test.mjs:2905-3018` (6 `bug.18` cases). Both are in `npm test`'s globs (`package.json:26`), which runs on every pull request (`.github/workflows/test.yml`).
- Executed evidence: `npm run ci:fast` 5176 pass / 0 fail on the fix. The guard passed 6/6 and the selector suite 148/148.

#### Regression test fails without the fix, passes with it

**Status:** ✅ PASS

- Recorded in the bug file's Investigation: the guard failed on both pre-fix directives, and 3 selector cases failed (`actual: ['8.1', '9.1'], expected: ['8.1']`). After the review rework the guard was run again against `develop`'s two SKILL.md files and failed both (bug file, QA Verification and Testing). The guard's own mutation case asserts that the verbatim pre-fix clauses are rejected.

#### The guard's stated scope matches its scanned scope

**Status:** ✅ PASS

- `ORCHESTRATORS` (`orchestrator-directive-branch-literal.test.mjs:57`) names exactly the two SKILL.md files scanned, and only their AUTONOMOUS RUN blockquote. The non-vacuity floor (`:98`) requires the directive to be found, to be over 200 chars, and to mention Phase 0d. The extractor boundary is tested.

#### Bundled copies match the source

**Status:** ⚠️ NOT_APPLICABLE

- No `shared/resources/` file changed. `.agents/skills` is a symlink to `skills/`. `npm run bundle:check` is clean (129 skills, 0 problems).

#### Suite + lint green

**Status:** ✅ PASS

- `npm run ci:fast` (prettier check + `npm test`): 5176 pass, 0 fail, 14 skipped.

### Documentation

- **Bug report fix record**: ✅ PASS — Iteration 1 has Investigation, Fix Implementation and QA Verification, with no template placeholders left outside the Resolution Summary stub (develop-bug Part B writes that).
- **Status History**: ✅ PASS — 4 rows: New, In Progress, Ready for QA ×2.
- **Change Log**: ⚠️ NOT_APPLICABLE — bug reports carry `## Status History`, never a Change Log (`document-change-log.md` §Exclusions). Count of `## Change Log` in the bug file = 0. ✅ as required.
- **Review report**: ✅ PASS — `bug.18.review.1.fix-readiness.md` (READY TO FIX 9/10).
- **Implementation report**: ✅ PASS — `bug.18.implementation.1.autonomous-runs-base-branch.md`. Pipeline Progress runs through Step 5–6, and Verify Cycle 1 is recorded.
- **Behaviour docs**: ✅ PASS — `skills/develop-next/references/roadmap-selection.md:161`, the `develop-next` SKILL.md `--batch` line and directive rationale, and `skills/develop-batch/SKILL.md` (§Step 1, worktree, directive, rebase, merge). The fix-evidence agent flagged one gap: `skills/develop-batch/README.md` described `excluded[]` as hard conflicts only. A paragraph was added in this run and rides the acceptance commit; doc-links, prettier and the develop-batch protocol suite (32/32) pass on it.

---

## Step 3: Security Review

**Story Type:** bug — the fix's surface is orchestrator skill prose and a Node selector script (`select-next.mjs`) reading the repository's own roadmap, story and epic frontmatter.
**Overall Security Status:** ✅ PASS

- **No hardcoded secrets introduced**: ✅ PASS — no secret-shaped literal on any added line (`select-next.mjs:1479-1534`).
- **No new unsafe patterns**: ✅ PASS — the only new exec-family call is a test's `execFileSync(process.execPath, [...])` with an argv array and no shell. The new `RegExp` (`select-next.mjs:886`) is built only from four internal constant keys.
- **Paths read from frontmatter do not leak content**: ✅ PASS — `storyBranchModel` only reads one `branch_model` scalar to decide inclusion. Its output is fixed reason strings, and its inputs are the repository's own documents.
- **Security TODOs/FIXMEs**: ✅ PASS — none. **Dependency risk**: ⚠️ NOT_APPLICABLE — no package changes.
- **Boundary decision**: `boundary: false`. The batch exclusion is a scheduling split of the repository's own roadmap rows, not an accept/reject verdict over outside input, so probe mode did not fire (`probes_executed: 0`, a legitimate skip). No cases file or run record was written.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none — no user data, no UI, no persistence, no third-party service. The change is internal developer tooling (GDPR, PCI-DSS, WCAG and HIPAA are all not applicable).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS (see Step 2 → Documentation). `CHANGELOG.md` has an entry under `## [Unreleased]` › Fixed citing bug.18 (`CHANGELOG.md:48`). No README or architecture change was needed beyond the develop-batch README paragraph, and the catalog does not need regenerating because no frontmatter `description` changed. The `docs/bugs/bug-registry.md` row flips to `closed` in Part B.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA record: ✅ verify loop PASS (cycle 1 of 5)
- Fix evidence: ✅ 4/4 applicable criteria (bundled copies N/A)
- PR review: — no human review (autonomous `/develop-next` run; the merge gate is `npm run ci` on the PR branch plus the CI rollup)
- Documentation: ✅
- Security: ✅
- Compliance: ⚠️ N/A
- **CI rollup on `cb3b044461e5`:** test=SUCCESS, validate=SUCCESS, link-check=SUCCESS, shellcheck=SUCCESS, PR-branch check ×2=SUCCESS → `SUCCESS` (6 checks), read on `cb3b044461e5` = the PR head

**Outcome:** the fix meets every applicable Definition of Done criterion on a CI-green head. Accepted.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-10T07:45Z
**CI reading 1:** SUCCESS @ `cb3b044461e5` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ This DoD summary (committed and pushed at 6a)
- ✅ Bug report: Status History row `DoD verified — bug.18.dod.1.autonomous-runs-hardcode-base-branch.md` (6a); Resolution Summary + `status: closed` are written by develop-bug Step 7 Part B, after this skill returns
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report, not here
- — Sprint Review summary: not generated — a bug fix is reported through its Resolution Summary and the registry, not a sprint-review artifact (bug mode skip)
- — Change Log row: not written — forbidden for a bug report (bug mode skip)
- — Task registry tick: `not-a-task` (a bug run; the bug registry / parent Bug Reports table is written in Part B)

**Next Steps:**

- develop-bug Step 7 Part B: Resolution Summary, `status: closed`, final Status History row, parent linkage / registry row
