# Implementation Report: finalise bug-mode residuals and the end-to-end run task.125 never had

**Task**: `task.138.finalise-bug-mode-residuals.md`
**Run Number**: 1
**Started**: 2026-09-21 13:30
**Finished**: 2026-09-21 15:05
**Status**: Completed
**Mode**: hand-driven (operator instruction: no QA loop, no pipeline); the acceptance evidence is the end-to-end run recorded below

---

## Summary

Phases 1–3 and 5 landed in PR #456 (2026-09-21): `newest_numbered` hoisted to `shared/resources/newest-numbered.sh`; 6b refuses a verdict remainder that names the other token and HALTs on an unreadable report as such; 7.1 gained a `verification-complete` skip-table row and an executed bug-mode **fill** block; 7.6b asserts `**Final Status:** ✅ ACCEPTED` on the pushed DoD. Phase 4 — one `/finalise --bug` run from Step 0 to Step 8 in a scratch clone — is this report's § End-to-end run. It produced two DoD files (a GAPS run and an ACCEPT run), four findings about the skill's Step 8 bug-mode path, one real gap on bug.14 as merged (closed in this PR), and executed every block task.125 had only ever executed against fixtures.

## Pipeline Progress

| Step | Status | Evidence |
| --- | --- | --- |
| Phase 1 — helper hoisted | ✅ | PR #456; `finalise-bug-mode.test.mjs` "newest_numbered has ONE definition", `.19` > `.9` under both shells |
| Phase 2 — 6b read-before-grep; reworded verdict refused | ✅ | PR #456; 4 reworded-remnant rows + the unreadable-report row |
| Phase 3 — 7.1 fills; 7.6b asserts the written state | ✅ | PR #456; fill ×3 shapes ×2 shells; pattern test; skip-table parity |
| Phase 4 — end-to-end run | ✅ | § End-to-end run below; `bug.14.dod.2` (GAPS) and `bug.14.dod.3` (ACCEPT) in the clone |
| Phase 5 — bundle, CHANGELOG | ✅ | PR #456; `bundle:check` 0 |

## End-to-end run (task.125 § 8, PC-1) — `/finalise --bug` on bug.14, 2026-09-21

**Environment.** A bare mirror of this repository at `09cde9c2` (develop after PR #458) and a working clone of it, both in the session scratchpad; `origin` is the mirror, so every push lands there and `gh` has no GitHub repository to address (`none of the git remotes … point to a known GitHub host`). `access.tracker: read-only` in the clone's `skills-config.yaml` (`access.vcs: read-only` is refused by the resolver — VCS write access is a hard requirement; the key was dropped). Skills linked as `.agents/skills → ../skills`. Subject: `docs/bugs/bug.14.precompact-hook-bare-tracker-comment/…md` — a general bug closed on 2026-09-12 with a hand-written `dod.1`; PR #392, issue #391.

**Run A — Steps 0–6 → GAPS → Step 8.**

| Step | What ran | Outcome |
| --- | --- | --- |
| Document-kind block | verbatim, `BUG_FLAG="--bug"` | `DOC_KIND=bug` |
| 1 | `bug-doc.js --file …` | `mode: general`, `bug_id: bug.14`, `github_issue: 391`, `status: closed`; `PR_NUMBER=392` via the Step 3a derivation (`PR #392` in the body) |
| 0 | `newest_numbered <dir> dod` → `dod.1`; created `bug.14.dod.2.….md` from `assets/bug-dod-template.md` | one `## Verification Complete`, one `**Final Status:** {…}` placeholder |
| 2 | stem-scoped `find … -name "bug.14.qa.*.md"` / `"bug.14.gate.*.yml"` | 0 / 0 — expected; QA record = verify loop FAIL → FAIL → PASS (impl report :90), bug file `✅ Fixed` (:393) |
| 3a | `gh pr diff 392` fails (no remote); **block fallback `git diff HEAD~1 HEAD` is wrong here** (HEAD~1 is the run's config commit) — used the PR's merge-commit range `984ce385^1..984ce385` (83 files) | environment deviation, recorded |
| 3b | four Explore agents in one message: fix-evidence, security, compliance, docs | fix-evidence **PARTIAL** (5/5 code checks PASS with citations; docs: CHANGELOG FAIL; PR `NOT_FOUND` — env); security `overall: PASS`, `boundary: true`, `probes_executed: 9`, 3 legitimate cases overblocked — **engine record `verdict: unverifiable`, `reason: rejects-every-input`** (entry `tracker-comment.js#isKnownStage`, an allow-list of stage names fed the `template-render` corpus; the hook itself is reachable by neither entry form — obs #138); compliance NOT_APPLICABLE; docs **FAIL** (no CHANGELOG entry for the fix; the only `(bug 14)` line, `CHANGELOG.md:678-681`, describes the pre-fix state) |
| 3d | `dod.2` Steps 1–5 filled from the YAML | security carried as 🔍 unverified, not the agent's PASS |
| Suite + lint | `npm run ci:fast` in the clone | first run 9 failures — the Jira-transition tests read the live `skills-config.yaml` and every transition came back `deferred` (the run's read-only key); with the key reverted 3798 / **1** — `observation-log.test.mjs` refuses an ephemeral scratch base because the clone lives under `/private/tmp`. Both environment; the same head read 3851 / 0 on the real checkout |
| 6 | decision | **GAPS** — docs FAIL, security unverified, CI rollup `UNKNOWN` → PENDING. Step 8a: not applicable (two sections not PASS; the docs finding carries no `severity`) |
| 8.1 | "Append `## Verification Complete`" | **E2E-1** — no bug-mode marker: the template already carries the block and 7.1's fill writes only ✅ ACCEPTED; a verbatim append doubles the heading. Filled by hand with the template's own alternative |
| 8.2 | status unchanged | `status: closed` untouched |
| 8.3 | "Append the gaps row to `## Change Log`" | **E2E-2** — no bug-mode marker; a Change Log is forbidden on a bug (7.3 skips it, 8.3 does not). Wrote a Status History row through `status-history.js` instead. **E2E-3** — the engine rejects `--json` (`Unknown option`), unlike every sibling engine. **E2E-4** (cosmetic) — the row reads `closed` where prior rows read `Closed`: 7.3 passes bug-doc.js's lowercase value through |
| 8.4 | gap report in the body | skipped — Step 7's `body-dod-section` reasoning applies, Step 8 carries no marker (E2E-2 class) |
| 8.5 | PR comment | `stakeholder-summary-cli.js --stage dod-gaps --slot count=2` rendered; `gh pr comment` non-blocking ⚠️ (no remote) |
| commit | run A's artefacts committed in the clone | `8d2d4015` |

**Run B — gaps addressed, re-run → ACCEPT path.** The CHANGELOG entry was added in the clone (`a2516a62`; ported to this PR). The security probe was accepted by **operator override**, recorded in `dod.3` Step 3: the boundary is a shell hook the engine cannot reach (obs #138 → task.136 / task.131); its fail-closed and read-only branches are executed by its own suite (scenarios 4, 6, 9, 10) — the same override task.125's `dod.1` records. `dod.3` reuses run A's evidence (the skill's idempotent re-run rule) with the two gaps resolved and the template's final block restored.

| Step | What ran | Outcome |
| --- | --- | --- |
| 0 | `newest_numbered` → `dod.2`; `dod.3` written | one heading, one placeholder |
| 7.1 | the bug-mode **fill block sliced verbatim from SKILL.md**, run under `zsh -f`, twice | `**Final Status:** ✅ ACCEPTED`, `**Completion Time:** 2026-09-21T12:31Z`; exactly one heading and one status line; second run: no change |
| 7.3 | `status-history.js --status Closed …` | row `| 2026-09-21 | Closed | finalise | DoD verified — bug.14.dod.3… |` |
| 7.4 | `registry-tick.js --file <bug>` | `not-a-task` — as designed |
| 7.6a | block sliced verbatim | staged exactly `bug.14.…md` + `dod.3`; message `docs(bug.14): DoD verified — finalise --bug`; pushed to the mirror; `CI_HEAD_2=5bcd47f4` |
| 7.6b | block sliced verbatim | **PASS** — both artefacts tracked and on `origin/<branch>`; `^\*\*Final Status:\*\* ✅ ACCEPTED` found. **Negative:** the same block pointed at run A's `dod.2` (GAPS) → `HALT: the pushed DoD file does not carry **Final Status:** ✅ ACCEPTED — Step 7.1 did not fill it`. Under the old `^## Verification Complete` pattern the GAPS file would have passed (the template ships the heading) — item 1 demonstrated live |
| 7.6c | PR-head check | `HALT: PR head  ≠ pushed acceptance head 5bcd47f48a3f` — the **correct** HALT (`ci-not-green-on-acceptance-head`): no PR exists in the clone. Nothing outward may fire past this point; the remaining blocks were exercised for their mechanics only and are recorded as such |
| 7.7 (6b) | derivation block sliced verbatim | `DOD_PATH` = dod.3, `IMPLEMENTATION_REPORT` = the bug's report, `CYCLES=3`, `FINAL_GATE=PASS` (last `**Verdict**:` line), bug closing line; `stakeholder-summary-cli.js --stage done` rendered |
| 7.8 | `tracker-comment.js --stage done` / `tracker-issue.js --kind close` / `gh-stage.js --stage done` | all three **`deferred`** with record ids (`6e2f0671`, `547ebe0e`, `70e6be67`) — `access.tracker: read-only` working as declared |

**What the run established.** Every fenced block in the bug-mode path executes as written under zsh from the repository root, including the three that source `newest-numbered.sh`; the 7.1 fill and the 7.6b assertion behave as this task specified, including the negative case; the skip table's rows hold for Step 7. **What it found:** Step 8 (the GAPS path) has no bug-mode rows — E2E-1 (append vs fill for the GAPS verdict), E2E-2 (Change Log row on a bug; body gap report), E2E-3 (`status-history.js` rejects `--json`), E2E-4 (Title Case in the Status History row) — logged as obs #148 for a follow-up; one real gap on bug.14 as merged (no CHANGELOG entry for the fix) — closed in this PR; and three environment interactions for the Phase 4 recipe: clone **outside `/tmp`** (the observation-log suite refuses an ephemeral scratch base), run the suite **before** adding the read-only key (the Jira-transition tests read the live config), and Step 3a's `git diff HEAD~1 HEAD` fallback is wrong for a merged PR in a clone with no `gh` remote.

**Artefacts.** Run log: `e2e-138/run.log` (scratchpad); `dod.2` and `dod.3` and the probe record `bug.14.dod.security.run.json` live in the scratch clone's branch `e2e/task.138-finalise-bug-run` (mirror in the scratchpad). They are deliberately **not** committed here: bug.14 is closed on `dod.1`, and a second and third DoD on a closed bug would be the "second verdict" the `body-dod-section` skip exists to prevent. The run log is reproduced in condensed form above.

## Decisions Log

- Security probe accepted by operator override in run B, with the rationale written into `dod.3` — the same decision task.125 recorded. Not a precedent for auto-accepting: Step 8a refused it (fix outside the Files Summary), exactly as the handoff said it would.
- Run B's `dod.3` reuses run A's evidence rather than re-dispatching four agents; the skill's idempotent re-run rule permits reuse of existing sections.
- Step 8's bug-mode gaps are filed as an observation (#148), not fixed here: the task's scope is Step 7's five residuals plus the run; widening it inside the run would make the run's evidence describe a tree that moved under it.

## Issues Log

- `String.replace` with a `$'`-bearing replacement tripled `skills/finalise/SKILL.md` while applying Phase 3 (caught by `git diff --stat`, +3,389 lines; re-applied with split/join). Recorded in project memory.
- `gh pr merge --delete-branch` raced the next commit three times today (index.lock); PR #457 exists because of it. Recorded on obs #142.

**Final Status:** Completed
