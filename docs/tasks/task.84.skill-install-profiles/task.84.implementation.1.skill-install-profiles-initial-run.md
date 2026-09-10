# Implementation Report: Skill install profiles with dependency closure

**Task**: `task.84.skill-install-profiles.md`
**Run Number**: 1
**Started**: 2026-09-04 22:05
**Status**: In Progress

---

## Summary

Add install profiles (minimal/pipeline/full) plus per-skill add-ons to `setup-consumer.sh`, resolve the dependency closure over a generated skill call graph, apply the task-83 tracker filter after closure, and persist the choice in `skills-config.yaml` so `--update` is reproducible.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous run)                             |
| PR target           | `develop` (auto — develop-next autonomous run)                             |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (frontmatter has no `risk_level:`)                                 |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (issue #317 created during Step 2)                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.84.*` exists in git                               | `feature/task.84.skill-install-profiles` created from `develop` at `a0ac4b8`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.84.review.{N}.{name}.md` exists (or skip logged)                 | `task.84.review.1.skill-install-profiles.md` — READY TO IMPLEMENT, 9/10; 0 critical / 8 important / 3 optional, all important applied. Status Planned → Ready for Development | 2 Explore pre-pass agents (architecture alignment → `drift`; codebase scan → `not-started`) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 5 phases; 12 files + 20 SKILL.md `invokes:` declarations; 30 new tests; `npm run ci:fast` green (2398 tests, 0 fail); 6 guarantees mutation-proven. **Graph design changed** from prose-scrape to declared frontmatter — see Issues Log | 2 Explore pre-pass agents (Step 2); no third dispatched — their output was a superset of the pre-develop surface map |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #318](https://github.com/Gamaroff/agent-skills/pull/318) → `develop`; 5 conventional commits; issue #317 commented (`in-review`) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.84.qa.{N}.*.md`; `task.84.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⚠️ HALT    | `task.84.dod.{N}.*.md`; task `status: accepted`                        | DoD **NOT met** — `task.84.dod.1.*.md` written; status deliberately left at `ready-for-review`. Blocked 5 ways (CI pending, no approving review, 3 CONCERNS gates, 2 criteria unmet, 5c REQUEST CHANGES) | — |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-04

- Invoked by `/develop-next` (roadmap item **T84**, PHASE 5 — Current frontier; deps satisfied: T83).
- Feature branch base: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q1).
- PR target branch: `develop` — auto-answered with the recommended option per the develop-next autonomous directive (Q2).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0b: no prior run detected (no `feature/task.84.*` branch, no PR, no implementation report) — starting fresh, resume prompt not reached.
- Phase 0c status handling: task status is `planned` → proceed; Step 2 (`/review-task`) promotes it to `Ready for Development`.
- Phase 0a-parallel: resolver agent not dispatched (file path supplied inline). Tracker poller not dispatched (no `github_issue:`/`jira_key:` in frontmatter — nothing to poll). Lite-mode inputs read directly from the document rather than via a subagent; note that `references/develop-pipeline-step-0-resolve-and-prepare.md` refers to a "production lite-mode CLI" that does not exist in this repo.
- Pipeline mode `standard`, computed from: `risk_ok = true` (risk_level absent), `phase_count = 5` (**not** < 3), `single_module = false` (touches `scripts/`, `shared/resources/`, `docs/`, `package.json`). Two of three booleans false → standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`.
- Platform resolved: `VCS=github`, `TRACKER=github`.
- Step 1: branch base `develop` used without prompting (autonomous). Implementation report stashed before branch creation, restored after — clean pop.
- Step 1 tracker signal skipped: `TRACKER_ISSUE` empty (task frontmatter has no `github_issue:`). Step 2 `/review-task` created it; the work-started signal fired then.

### Step 2 — review-task — 2026-09-04

- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a branch setup auto-skipped: already on `feature/task.84.*`.
- review-task Step 2 check 5 tracker-sync question auto-answered: **Sync to GitHub** (the recommended option). Dedup search (`in:title "[Task 84]"`, `--state all`) returned zero matches → created issue **#317**, labels `task` + `priority:medium`, milestone `Technical Tasks (standalone)`, matching the convention of task 83 (#316). `github_issue: 317` and a body cross-reference link written to the task frontmatter.
- Deferred Step 1 signal then fired against #317: `work-started` comment posted (`reason: posted`), board moved to **In Progress**.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. 8 important fixes applied to the task document and plan, 0 skipped.
- review-task Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT (9/10), so `planned` → `ready-for-development` in frontmatter and `**Status:** Planned` → `Ready for Development` in the body; two Change Log rows written (verdict row bumps to 1.1; status-transition row leaves Version blank) and `updated:` bumped to 2026-09-04.
- Sign-off check skipped — `sign-off` absent from `skills-config.yaml`.
- Change Log currency check did not fire — status had not advanced past `planned` at review time.
- Tracker-card preflight (`sync-jira-task.js --check-card`): exit 0, zero findings; three blocks resolve.
- **develop-task Step 2's own `--stage review` tracker comment was deliberately not posted.** `/review-task` Step 10 had just posted a strictly richer comment (`--stage review-task`) covering the same outcome, findings counts, review-artifact path and the full list of applied fixes. The two stages carry different idempotency markers, so both would have posted — two near-identical comments on the same issue minutes apart. Skipped as redundant, not as failed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — 2026-09-04

- **The task's specified dependency-graph design does not work, and was replaced.** §3 specified
  scraping `/slash-command` tokens from `SKILL.md` (+ `references/`). Built first, measured, and it
  fails in both directions — every variant either explodes the graph (`minimal` and `pipeline` both
  closing to ~34 of 120 skills, making the profiles indistinguishable and the feature worthless while
  reporting success) or drops real pipeline steps (`develop-story` 9 → 3). Root cause: a
  `/slash-command` token carries no direction, and prose is full of reverse references, including
  `skills/review-code/SKILL.md:180`'s literal "`/develop-story` and `/develop-task` do **not** call
  `/review-code`", which the scrape reads as two edges. Replaced with a declarative
  `invokes: [...]` frontmatter key on 20 skills; the generator, the committed JSON, the CI drift
  check and every §9 criterion are preserved. The scrape survives as an advisory report
  (`npm run skill-deps:candidates`) serving Risk 1's "catch a missed edge" intent. Full measurement
  table recorded in the task doc §3. **Flagged for the user — this changes a documented design
  decision.**
- **macOS symlink bug found and fixed.** `resolve-skill-set-cli.mjs`'s main-guard compared
  `process.argv[1]` to `fileURLToPath(import.meta.url)`. Node resolves an ESM module's URL through
  symlinks; `mktemp -d` on macOS returns `/var/...`, a symlink to `/private/var/...`. The compare
  failed, `main()` never ran, the CLI exited 0 with empty stdout, and the installer read that as
  "resolve produced nothing". Both scripts now compare real paths. Found by running the installer
  against a real temp dir rather than from the repo root.
- **`node` can be shadowed by a shell function.** nvm defines one. During testing it printed ~100
  lines of help text and exited 0, which `_resolve_skill_set` captured as "skill names"; every real
  skill then looked outside the profile and the install would have been near-empty *and reported as
  success*. Hardened: the resolved output is shape-checked (`^[a-z0-9][a-z0-9-]*$` per line, non-empty)
  and a failure falls back to the **unfiltered** install, never the empty one. Regression test added.
- Closure reporting bug fixed: seeds were counted as dependency-pulled, so `full` reported "15 pulled
  in by dependency" when everything was chosen.
- Measured context saving (GitHub consumer, post task-83 filter): `full` 109 skills / 35,425 desc
  bytes; `pipeline` 35 / 13,894 (−61%); `minimal` 5 / 1,893 (−95%). No literal is hardcoded in any
  assertion — the test measures both sides in the same run.
- **`--update` verified against a real invocation, not just a unit test** (§9 Migration criterion).
  Scratch repo with 6 skills pre-installed and `skills.profile: pipeline` in config, then
  `setup-consumer.sh --update --dry-run`: resolved the profile from the config file with no wizard
  (35 skills), reported the task-83 tracker filter (11 Jira-only) alongside it, wrote nothing, and
  left all 6 installed skills in place — including `use-railway`, `docker` and `jira-sprint-manager`,
  which are all outside the `pipeline` profile.
- `npx prettier --check` clean on every file touched. `shellcheck` **not run** — it is not installed
  on this machine and there is no CI lane for it yet (that lane is task 92's scope). The §9
  code-quality criterion "no new shellcheck warnings" is therefore **unverified**, not met or unmet.
- Mutation-proving: all six guarantees reverted and confirmed red — tracker-filter ordering (3 fail),
  visited set (hang/timeout), silent re-add of excluded skill (2 fail), config-first profile
  resolution (1 fail), profile grandfather `continue` (1 fail), stale committed graph (2 fail).

### Step 2 — 2026-09-04

- **Board `Estimate` field absent.** `set-github-project-estimate.sh` reported `'Estimate' number field not found` on the `Agent Skills` board, so `estimated_effort_hours: 8` was not mirrored. Non-blocking; Priority (P2) was set successfully.
- **`references/develop-pipeline-step-0-resolve-and-prepare.md` cites a "production lite-mode CLI" that does not exist.** No such script is present in `shared/resources/` or any skill's `scripts/`. Lite-mode inputs were read from the document directly instead, and `PIPELINE_MODE` computed from the three booleans as the Aggregation block specifies. Worth filing separately — the step doc instructs an agent to run something unavailable.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-04

**Gate**: CONCERNS (80/100) — 0 HIGH, 7 MEDIUM, 3 LOW.

**The finding that matters most is about the review itself.** The first pass, run by the same
pipeline that wrote the code, verified the headline guarantees and the happy paths and found
**one** issue. An independent adversarial Explore subagent — given a refute-shaped brief and no
sight of the implementer's reasoning — found **ten**. Every one was then reproduced directly
before being accepted. A self-review of one's own change converges on confirming it; the
independent lens is what made this cycle worth running.

The defects shared a shape: the mechanism was right, the input handling around it was not. Four
reachable configurations **silently installed every skill** — the exact outcome the feature
exists to prevent.

| ID | Severity | Defect | Fix |
|---|---|---|---|
| 001 | MEDIUM | `include` echoed unvalidated → bash shape guard rejected the whole batch → full install | CLI validates against `allSkills`, exits 2 naming the entry |
| 002 | MEDIUM | Empty resolved set indistinguishable from failure → excluding every seed installed everything | Discriminate on the CLI's exit code, not on emptiness |
| 003 | MEDIUM | `skills:  # comment` voided the whole block, silently, with no warning | Header rule accepts a comment; close rule excludes the header line |
| 004 | MEDIUM | `parseInvokes` threw on a legal trailing comment → both CI drift checks failed | Strip a trailing `#…` before the bracket checks |
| 005 | MEDIUM | Profile branch preceded tracker branch → `_kept` always 0, tracker warning unreachable | Tracker test first |
| 006 | MEDIUM | Profile skips counted into `_skipped`, rendered as `skipped (github)` | Separate `_not_in_profile` counter and phrasing |
| 007 | MEDIUM | Plan documented wizard counts the code does not print | **Plan corrected** — the resolver does not exist at prompt time (tarball arrives six steps later), so the counts are printed by `install_skills` where the data exists |
| 008 | LOW | `graph[name] ?? []` prototype lookup; `--include toString` threw uncaught | `Object.hasOwn` + `Array.isArray` guard |
| 009 | LOW | `$comment` accepted as a profile name → empty set → read as failure → full install | Reject `$`-prefixed names in the lookup |
| 010 | LOW | Dry-run count ignored include/exclude; `_dry_n` leaked to global scope | Pass both; declare `local` |

Plus four cleanups: conflict dedupe (one warning per skill naming every requirer, replacing dead
`.some()` code and four duplicate warnings), quote stripping in list values, explicit `include: []`
now beats a stale env var, and two inaccurate `validate.yml` comments corrected.

**011 — found by a pre-existing repo guard, after the ten above were fixed.** The full gate went
red on `stdout-drain-on-exit.test.mjs`'s *"no NEW file adopts exit-after-write"* check:
`resolve-skill-set-cli.mjs` called `process.exit(2)` at four sites. This repo already carries a bug
and a standing guard for that pattern (`bug.3.stdout-truncation-on-exit`) — `process.exit()` after a
write truncates at the pipe buffer (~64KB), and `setup-consumer.sh` consumes this CLI's stdout
*through a pipe*. 120 skill names sit well under 64KB today, which is precisely why it would have
gone unnoticed until the library grew past it. Replaced with `process.exitCode` + `return`; all four
exit codes re-verified (2 / 2 / 2 / 0). A repo-wide guard catching a brand-new file adopting a
known-bad pattern is the cheapest possible place to catch this.

**16 regression tests added** (14 + 2), one per defect. Five fixes mutation-proven — 001, 002, 003,
004 and 009 each reverted and confirmed red. Suite: 42 → 57 tests.

007 is worth singling out: it was resolved by correcting the **plan**, not the code. The plan
claimed the menu could call the resolver for a count "because both JSON files are committed" — they
are committed in *agent-skills*, not in the consumer repo the wizard runs against, where the
resolver arrives with the tarball six steps after the prompt. Implementing it would have required
adding a download to the prompt, breaking the installer's one-request property for a cosmetic gain.

---

### QA Cycle 2 — refute pass — 2026-09-04

**Gate**: CONCERNS (80/100) — 5 findings, **2 HIGH**, plus 4 vacuous tests from cycle 1.

**Both HIGH findings were introduced by cycle 1's own fixes.** That is the entire justification for
running cycle 2 unscoped: the narrowing rule would have pointed it at cycle 1's repairs, which is
where the defects were — but C2-003 lives in a *comment block the fix never touched*, and only an
unscoped read surfaces a claim that has quietly become false.

| ID | Sev | Defect | Fix |
|---|---|---|---|
| C2-001 | HIGH | Block-form `invokes:` returned `[]` **silently**; the header claimed it was "rejected loudly". Cycle 1's fix rewrote that very line and left the false claim | Detect the block form explicitly and throw |
| C2-002 | HIGH | `_resolve_skill_set` collapsed exit 2 → `return 1`, so a config typo was reported as a node/PATH problem — the exact mis-blaming the exit-2 validation was added to stop | `return $_rc`; `install_skills` branches on 2 |
| C2-003 | MED | Cycle 1's fix #2 made an empty install reachable while the surrounding comments still said it could not happen | Honour it, but warn loudly; contract corrected |
| C2-004 | MED | Dry-run forwarded include/exclude but not `--all-skills` — previewed 35 where the real run installs 41 | Forward it |
| C2-005 | LOW | An explicitly-included, tracker-excluded skill was dropped as if it were a closure by-product | Distinct warning naming `--all-skills` |

Also: two cycle-1 fixes were **incomplete** — `\s+#` missed `[a]# note` (no space), and the dry-run
flag forwarding missed `--all-skills`. Three cleanups: exclude list hoisted, comment regex widened,
call-contract note added (verified: a bare `_resolve_skill_set` call under `set -e` aborts the
wizard; the real call site is inside an `if`, so it is safe).

**Four of cycle 1's tests were vacuous.** The worst asserted `doesNotThrow` while its comment claimed
it guarded against "a block list parsing as empty" — the block form returned `[]` *without* throwing,
so it passed for exactly the input it named. Replaced with a mutation-proven throw assertion. Two
others were strengthened with behavioural companions. The fourth — the grandfather guarantee — is an
**accepted, argued limitation**: testing it behaviourally means restructuring the only code here that
can delete a user's skills, late in a QA loop, on code already verified across all eight cases. Filed
as follow-up rather than done under time pressure.

Suite: 57 → 66 tests.

---

### QA Cycle 3 — confirmation pass — 2026-09-04

**Five findings, two HIGH, three of them introduced by cycle 2's own fixes.** (An earlier revision of
this section said "one finding" and reported convergence as 11 → 5 → 1. That was written before the
confirmation pass reported and never updated — a materially inaccurate audit trail, caught by
`/review-pr` at Step 5c as PC-3. Corrected here; the authoritative record is `task.84.qa.3` and
`gate.3`.)

The worst, **C3-001**, is the most severe defect in this task: cycle 2 rewrote the resolver call as a
bare `_RESOLVED_SET=$(…); _resolve_rc=$?`. Under `set -euo pipefail` that aborts the shell at the
assignment, so both rc branches cycle 2 had just added were dead code, and every resolver failure
killed the wizard *after* the tarball was extracted and `.agents/skills/` created but *before* any
skill was copied. **The same commit added a comment warning against exactly that**, and its test could
not see it because the test ran under `set +e`. Cycle 1's defect over-installed and was recoverable;
this one bricked the install.

Also: the block-form guard missed a blank or comment line before the first item (same silent-empty
failure, one newline away); the flow-list awk parser kept `[[:space:]]+#` while the JS parser widened;
the dry-run path discarded stderr, re-hiding config errors the real path now names; and the zero-skill
warning blamed `exclude` when the tracker filter can also empty a set.

**Three consecutive cycles have now caught an incomplete fix**, which is the durable finding of this
task:

| Cycle | Fix | What the next cycle found |
|---|---|---|
| 1 | `\s+#` comment strip | Missed `[a]# note` (no space) |
| 1 | dry-run flag forwarding | Missed `--all-skills` |
| 2 | block-form detection | Missed a blank line before the first item |

**A mutation proof that did not mutate.** The first attempt to prove the widened guard reported
`0 fail` — because the `perl` substitution silently failed to apply, so the "mutation" run tested
unmodified code. That is the same vacuity being found in the tests themselves, one level up: a
mutation test that does not mutate proves nothing and looks identical to a passing one. Re-run with
an asserted substitution; narrowing the regex now fails with `block list (blank line first) must be
rejected loudly`. **Always assert that the mutation applied before believing the result.**

Convergence by count: 11 → 5 → 5 → 10 (Step 5c). It did **not** converge. What did narrow is blast
radius — installs everything, then one skill's edges, then an aborted install on a failure path — but
the *class* recurred every single cycle.

---

### Step 5c — /review-pr — 2026-09-05

**Verdict: REQUEST CHANGES.** Ten findings, four HIGH, from two independent lenses.

The code lens found `parseInvokes` wrong for the **fourth consecutive cycle** — it classified the
value before stripping the trailing comment, so `invokes:  # note` plus a block list still returned
`[]`, as did zero-indent sequences. Restructured (strip, then classify) rather than patched a fourth
time, with an exhaustive 20-shape matrix now in the drift suite. Also: `minimal ⊄ pipeline`, the
dry-run swallowing conflict warnings, `BASH_SOURCE` making the preview unreachable for real
consumers, a bare `mktemp` under errexit, and an unactionable conflict message.

The conformance lens found **the artifacts were dishonest**:

- `shellcheck` was ticked `[x]` and never run.
- "A real `--update` … verified to remove nothing" was ticked; the evidence is a **dry run** against
  6 skills, which by construction writes nothing and cannot exercise the destructive path.
- This report claimed cycle 3 found one finding when the artifacts recorded five.

All 21 criteria had been ticked by a blanket regex rather than assessed. That is the single most
important process failure of this task: **a criteria table that disagrees with its own trail is worse
than one with unticked boxes**, because it converts "we did not check" into "we checked and it
passed" without anyone deciding to lie.

One finding withdrawn: I flagged trailing `[[ -n "$x" ]] && cmd` as an errexit hazard, tested it, and
it is not one — bash exempts a failing command inside an `&&` list. Asserting a defect that does not
exist is its own failure mode.

---

## Completion

**Finished**: 2026-09-05
**Final Status**: **Escalated** — DoD gaps; halted at Step 7 rather than accepting on evidence that does not support it
**Branch**: `feature/task.84.skill-install-profiles`
**PR**: https://github.com/Gamaroff/agent-skills/pull/318
**QA Iterations**: 3 cycles + Step 5c `/review-pr` — 27 defects found and fixed
**DoD Summary**: `task.84.dod.1.skill-install-profiles.md` — NOT ACCEPTED, 5 blocking gaps
**Tracker debt**: none — issue #317 left open and commented, board not moved to Done (correct: the task is not done)
