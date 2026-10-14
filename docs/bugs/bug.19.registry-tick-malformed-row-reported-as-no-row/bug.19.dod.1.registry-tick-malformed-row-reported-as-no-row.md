# Definition of Done Verification

**Bug:** bug.19.registry-tick-malformed-row-reported-as-no-row (general bug — `docs/bugs/bug.19.registry-tick-malformed-row-reported-as-no-row/`)
**Verification Started:** 2026-10-14
**PR:** [#651](https://github.com/Gamaroff/agent-skills/pull/651) → `develop`, head `f81d9642` — **merged** as `97e56a7a` before this run (PR resolved via `--pr 651`, source `explicit`: on `develop` post-merge the branch, lock, frontmatter and body rungs find nothing)
**Mode:** `/finalise --bug` — fix-evidence DoD for a bug report. A bug has no acceptance criteria, carries no Change Log (`document-change-log.md` §Exclusions), and closes through its own lifecycle in `develop-bug` Step 7 Part B; the story/task-shaped steps are skipped by the mode, not by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited.

---

## Step 1: QA Report Review

**QA Reports:** none — no `bug.19.qa.*.md` or `bug.19.gate.*.yml` exists, and no implementation report: the fix was made directly on a branch, not through `/develop-bug`, so there is no verify loop. The QA record is the bug file's `#### QA Verification` (Iteration 1), written this run against the merge commit `97e56a7a`: `**Verification Result**: ✅ Fixed` — repro snippet, end-to-end consumer-shape tick (`ticked`), suites 155/40/34 green, `bundle --check` clean, and a mutation red on the merged code. The verifier is the session that wrote the fix; no independent reviewer ran.

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** ⚠️ PARTIAL — every fix check passes; the documentation list carries the CHANGELOG gap

#### Expected behaviour — "A row the parser rejects is reported as a rejected row … never as `no-row`. A registry whose title cell is plain text and whose document path sits in a named column … parses"

**Status:** ✅ PASS
- Code evidence: `shared/resources/registry-tick.js:324-336` (`row-malformed` with `line` + `parserReason`); `skills/develop-next/scripts/select-next.mjs:941` (`DOC_COLUMN_NAMES`), `:957` (`docCellPath`), `:1179`/`:1201` (document column read when the title has no link); annotate guard `registry-tick.js:590`
- Test evidence: `shared/resources/tests/registry-tick.test.mjs:1124,1149,1177,1191`; `evals/develop-next/unit/select-next.test.mjs:3077-3171` (7 tests). Both globs are in `package.json` `test`; `.github/workflows/test.yml` runs `npm test` on every pull request, no paths filter
- Executed evidence: this run, on merge commit `97e56a7a` — repro returns the row; end-to-end tick on the consumer shape answers `ticked`; suites 155/40/34 green

#### Regression test fails without the fix, passes with it

**Status:** ✅ PASS
- Four mutations recorded in the bug file's Fix Implementation → Testing; the `row-malformed` one re-run on `97e56a7a` this run (0 pass, 1 fail), restored. The verifier is the session that wrote the fix

#### The guard's stated scope matches its scanned scope

**Status:** ⚠️ NOT_APPLICABLE
- No corpus or call-site guard added; `skill-shape.test.mjs` gained one string in an enumerated list for one SKILL.md arm

#### Bundled copies match the source

**Status:** ✅ PASS
- `bundle_skill.py --check` on `97e56a7a`: 129 skills, 0 problems; the three `references/registry-tick.js` copies are in the PR diff

#### Suite + lint green

**Status:** ✅ PASS
- PR #651 CI: 5/5 SUCCESS (`test` 2m59s, which runs `format:check` + `npm test`); merge commit `97e56a7a`: 4/4 check-runs SUCCESS

### Documentation

- **Bug report fix record**: ✅ PASS — Investigation, Fix Implementation and QA Verification for Iteration 1. The Resolution Summary placeholder and `status: ready-for-qa` are expected at this point: develop-bug Part B writes both after this skill (the agent read them as gaps; they are ordering, not defects)
- **Status History**: ✅ PASS — 2 rows (New, Ready for QA); the second row's note "bundle pending" is stale (the pre-commit hook bundled)
- **Change Log**: ⚠️ NOT_APPLICABLE — bug reports carry `## Status History`, never a Change Log; count of `## Change Log` in the bug file = 0. ✅ as required.
- **Review report**: ⚠️ NOT_APPLICABLE — no `/review-bug` run; the bug was filed and fixed in one session
- **Implementation report**: ⚠️ NOT_APPLICABLE — the fix was not made through `/develop-bug`; there is no verify loop to report
- **Behaviour docs**: ✅ PASS — `skills/finalise/SKILL.md:1253,2332`, `skills/develop-next/SKILL.md:629`, `skills/develop-batch/SKILL.md:615`, `skills/develop-next/references/roadmap-selection.md:115-117`
- **CHANGELOG.md**: ❌ FAIL — no `(bug 19)` entry under `## [Unreleased]`; PR #651 does not touch `CHANGELOG.md`

---

## Step 3: Security Review

**Story Type:** bug — Node CLI (`registry-tick.js`) + parser module (`select-next.mjs`)
**Overall Security Status:** ❌ FAIL

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: added lines of `97e56a7a^1..97e56a7a` grepped for secret assignments; none

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: no `eval(`/`exec`/`spawn` in added lines; neither file imports `child_process`

### probe mode executed no candidates

**Status:** ❌ FAIL (severity: medium, per the agent)
- Evidence: `skills/develop-next/scripts/select-next.mjs:1173-1201`
- Note: the boundary rule fired (`parseRegistry` sorts rows into `rows`/`malformed`; `docCellPath` decides which path is read; `DOC_COLUMN_NAMES` is a deny-list for `--annotate`). No engine form can score it: the JS form reads any object without `ok` as accepted, `docCellPath` is not exported, and the `cli:` form writes no fixture registry. The agent's `probe_command` would score every case accepted, so `/finalise` did not run it: that result would not be evidence either way

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in added lines
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

**Candidates executed:** 0 — **reproduced:** 0

❌ **Probe mode executed no candidates.** A boundary was identified but nothing was run — this is a
finding, not a pass. When the engine cannot reach the entry, only two remedies clear this guard:
make the entry reachable (export a verdict-returning `docCellPath` or add an engine form) and
re-probe, or a recorded human override.

**By-hand probe (evidence for an override, not a closure).** The agent and `/finalise` both ran
`parseRegistry` in memory on escape-shaped paths:

| Input | Resolved path |
|---|---|
| Document column `` `/etc/task.1.x.md` `` | `/etc/task.1.x.md` — **new: an absolute path survives** |
| Document column `` `../../../etc/task.2.x.md` `` | `../etc/task.2.x.md` |
| Title link `[T](/etc/task.4.x.md)` | `docs/tasks/etc/task.4.x.md` — coerced under the registry |
| Title link `[T](../../../etc/task.5.x.md)` | `../etc/task.5.x.md` — escape predates bug 19 |

The selector then reads that file's frontmatter. Exposure is low: the registry is a tracked file in
the same repository. But the document column is laxer than the title link it mirrors, which the fix
did not intend.

**Agent summary:** static checks pass; boundary identified, zero candidates executed (zero-guard
FAIL); by-hand probe shows the document column accepts an absolute path.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none — internal registry tooling; no personal data, payments, UI or health data

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ❌ FAIL — skill docs updated (finalise reason table + DoD line, develop-next/develop-batch exit-0 lists, `roadmap-selection.md` document-column rule); README / architecture N/A. **`CHANGELOG.md` `[Unreleased]` has no `(bug 19)` entry**, though bug fixes are cited there (`docs/contributing/releases.md`; bug.18 at `CHANGELOG.md:219`). The bug registry row stays `ready-for-qa` until Part B.

---

## Step 5: Acceptance Decision

**Decision:** ❌ GAPS IDENTIFIED

- QA record: ✅ `#### QA Verification` Iteration 1, `✅ Fixed`, verified on `97e56a7a` (same session as the fix; no independent reviewer)
- Fix evidence: ⚠️ 4/4 applicable checks PASS; documentation list FAIL on CHANGELOG
- PR review: — no human review (`reviewDecision` null; no `*.pr-review.*.md`)
- Documentation: ❌ CHANGELOG
- Security: ❌ probe zero-guard; absolute path in the document column
- Compliance: ⚠️ N/A
- **CI rollup on `f81d96420c1f` (PR head):** validate, link-check, shellcheck, test, branch-guard — all SUCCESS → `SUCCESS` over 5 checks; merge commit `97e56a7a`: 4/4 check-runs SUCCESS

Fix-and-recheck (Step 8a) does not apply: two sections (Docs, Security) are FAIL.

**Outcome:**

- [ ] `CHANGELOG.md` `[Unreleased]` → `### Fixed`: add an entry citing `(bug 19)` for the `row-malformed` reason and the document-column registry shape
- [ ] `docCellPath` (`select-next.mjs:957`): refuse an absolute path, so the document column is no laxer than a title link (low severity; the registry is a tracked file), with a test and a mutation proof
- [ ] Security probe zero-guard: export a verdict-returning `docCellPath` (or add an engine form) and probe it, or record a human override citing the by-hand probe above
- [ ] PR review: no reviewer and no `/review-pr` report on #651. Run `/review-pr`, or have a human record a decision

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-10-14T05:10Z
**CI reading 1:** SUCCESS @ `f81d96420c1f` (PR head, 5 checks); merge commit `97e56a7a` 4/4 check-runs SUCCESS
**CI reading 2:** not taken — gaps path; no acceptance commit

**Blocking Issues Summary:** the four `- [ ]` lines under Step 5 → Outcome.

**Estimated Effort to Close Gaps:** Small — one CHANGELOG entry, a one-line refusal plus a test in `docCellPath`, and a probe or a recorded override.

**Artifacts Generated:**

- ✅ This DoD summary
- ✅ Bug report: `#### QA Verification` filled (`✅ Fixed`), Status History row `DoD incomplete — 4 gap(s) — bug.19.dod.1.registry-tick-malformed-row-reported-as-no-row.md`
- ✅ Gaps PR comment on #651 (Step 8.5)
- — Sprint Review summary, Change Log row, DoD body section: not written (bug mode skips)
- — Bug status unchanged (`ready-for-qa`); bug registry row unchanged; not closed

**Next Steps:**

- Close the four gaps on a bugfix branch (the code gap needs a PR), then re-run `/finalise --bug`. That run writes `dod.2`
- After an ACCEPTED DoD: develop-bug Step 7 Part B — Resolution Summary, `status: closed`, final Status History row, registry row `closed`
