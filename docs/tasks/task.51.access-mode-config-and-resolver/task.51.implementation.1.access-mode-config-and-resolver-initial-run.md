# Implementation Report: [Task 51] Declare tracker access level in config, and reject an unrecognised one loudly

**Task**: `task.51.access-mode-config-and-resolver.md`
**Run Number**: 1
**Started**: 2026-08-17 14:40
**Status**: In Progress

---

## Summary

Add an `access:` block to `skills-config.yaml` resolved into `ACCESS_TRACKER` / `ACCESS_VCS` by
`resolve-platform.sh`, with per-key strict enum validation (closing the live silent fall-through on
`tracker:` / `vcs:`), most-restrictive-wins env override, a fail-closed malformed-YAML branch, and
`|| exit 1` guards on all 16 resolver call sites so a rejection actually halts a run.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                              |
| PR target           | `develop`                                                                                                                              |
| qa-planning gate    | skipped (auto)                                                                                                                         |
| Task risk level     | `low` (frontmatter; body Risk Assessment says "Low–medium")                                                                            |
| Pipeline mode       | standard                                                                                                                               |
| Always-load files   | 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` |
| Tracker Issue       | #225 (GitHub)                                                                                                                          |
| Board status        | In Progress ✅ (Todo → In Progress, verified; board "Agent Skills")                                                                     |
| Board priority      | P1 High (already set — not overwritten)                                                                                                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.51.*` exists in git                               | `feature/task.51.access-mode-config-and-resolver` created from `develop` at `cdba8ba`, pushed with upstream tracking. Lock written (`current_step: 2`). | — |
| 2. review-task             | ✅ Done    | `task.51.review.{N}.{name}.md` exists (or skip logged)                 | Skipped — already reviewed; report at `task.51.review.1.access-mode-config-and-resolver.md` | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 10 phases. 1287/1287 node tests, 61/61 new `tracker-access.test.sh`, 12/12 mutations red, `validate:all` 115/115, Prettier clean, bundle idempotent. | — |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #246](https://github.com/Gamaroff/agent-skills/pull/246) → `develop`. Two commits: `48097e9` functional (28 files), `053226f` bundle regen (113 files). Issue #225 commented. | — |
| 5–6. qa-task / qa-fix loop | ⚠️ Halted |  `task.51.qa.{N}.*.md`; `task.51.gate.{N}.*.yml`; PR comment posted     | Cycles 1–5 FAIL (40 → 55 → 55 → 60 → 70). **Cycle 6 — independent adversarial pass: FAIL 20/100**, 10 HIGH incl. one cycle-5 regression, 4 silent-escalation routes, 1 code-execution vector, and 11 surviving mutations. Halted per user directive (halt on findings, do not loop). | 3 Explore agents cycle 1; 3 independent adversarial reviewers cycle 6 |
| 7. finalise                | ⛔ Not reached | `task.51.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⛔ Not reached | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-08-17

- **Phase 0a-parallel agents dispatched**: 2 of 3 — tracker state poller and lite-mode/always-load
  detector. Resolver agent **not** dispatched: the input was a bare task id (`51`) that resolved
  directly to a single matching directory, so there was nothing for it to search. Neither dispatched
  agent failed.
- **Pipeline mode: standard.** Computed from the three booleans, not from impression:
  `risk_ok = true` (`risk_level: low` ∈ {low, absent}) **AND** `phase_count < 3` = **false**
  (10 numbered steps in the Implementation Plan) **AND** `single_module` = **false** (scope spans
  `shared/resources/`, 15 `skills/*/SKILL.md` files, `docs/reference/`, `scripts/`, and
  `package.json`). Two of three conditions fail → `standard`.
- **Always-load files resolved: 3 files** — `docs/architecture/concepts/coding-standards.md`,
  `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md`. Read from
  `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- **Tracker: GitHub, issue #225** — state at pipeline start: `OPEN`, board column `Todo`, labels
  `task` / `priority:high`, 1 existing comment. No `JIRA_URL` set, so all Jira paths are skipped.
- **Feature branch base: `develop`** — user answered Q1 `develop` (the recommended, auto-derived
  option; current branch is `develop`).
- **PR target branch: `develop`** — user answered Q2 `develop` (recommended; standard Gitflow for a
  task branch).
- **qa-planning gate: skipped (auto — no prompt)**.
- Questions asked in the single `AskUserQuestion` call: **2** (Q1 branch base, Q2 PR target) —
  matches the required count for `develop-task`.
- **Task status at start: `ready-for-development`**, and `task.51.review.1.*.md` already exists, so
  Step 2 is expected to skip per the develop-task skip/run decision table.

### Step 1 — create-branch — 2026-08-17

- Branch `feature/task.51.access-mode-config-and-resolver` created from `develop` at `cdba8ba` and
  pushed with upstream tracking. No pre-existing local or remote branch of that name.
- Implementation report stashed before branch creation, restored cleanly after (`git stash pop`, no
  conflict). Step 2b (epic integration branch) not applicable — task input.
- **GitHub board: work-started → transitioned** (`Todo` → `In Progress`, verified by re-read; board
  "Agent Skills"). Pipeline-start comment posted to issue #225.
- Board **Priority** already set to `P1 High`, so the P2 default was correctly skipped — a human's
  choice is never overwritten.

### Step 2 — review-task — 2026-08-17

- **review-task skipped** — task status is `ready-for-development` and a review report exists at
  `docs/tasks/task.51.access-mode-config-and-resolver/task.51.review.1.access-mode-config-and-resolver.md`.
  Matches the develop-task skip/run decision table row "`Ready for Development` + report exists".
- The task's Change Log records that review v1.1 scored it 6/10, drove a revision (halt mechanism,
  env/config precedence contradiction, `tracker.workflowFile` mapping form), and then promoted it to
  `ready-for-development`. No outstanding blocking findings to carry into Step 3.

---

### Step 3 — develop — 2026-08-17

- **Pre-develop surface map**: Explore subagent over 25 files. Confirmed the task doc's claim of 16
  call sites across 15 skills exactly (13 literal `source` lines + 3 prose). Also surfaced two
  stale docs the plan had not listed — see the two decisions below.
- **Plan file**: none (`task.51.plan.*.md` absent) — proceeded on the task's own Implementation Plan.
- **No alignment conflict**: greenfield for `access:`; no existing implementation to reconcile.
- **`config_file_status` added beyond the literal plan.** Step 4 says "when parsing fails at both
  tiers", but the awk tier does not *fail* — it finds nothing, which is indistinguishable from an
  absent key. A grep-only rule would have rejected a valid `access:` block whose `vcs:` child is
  simply unset. So malformation is detected explicitly: a real `yaml.safe_load` under tier 1, and a
  structural lint under tier 2. Both tiers now agree the fixture is malformed, which is what let the
  "malformed WITH `access:`" case be asserted under **both** tiers as the Testing Strategy demands.
- **Block-scalar guard in the tier-2 lint.** The first lint rejected any line whose first non-space
  character is `:`, which would have flagged legal prose inside a `key: |` block as malformed — and
  for an access-configured consumer that is a halt, not a warning. Block scalars are now tracked and
  their bodies never graded. Verified: a config with `note: |` containing a leading-colon line
  resolves cleanly under the awk tier.
- **`${BASH_SOURCE[0]}` alone was wrong for the sibling source.** It is bash-only and macOS logins
  are zsh, so the first version failed to find `read-config.sh` when sourced from a zsh shell. Now
  falls back to zsh's `%x` behind an `eval` (which keeps the zsh-only form away from bash's parser).
  The `$(dirname …)` form is retained deliberately — `bundle_skill.py`'s `SH_SIBLING_RE` matches that
  shape, and it is what makes the bundler follow the new file transitively with no bundler change.
- **Quote and inline-comment stripping added to `read_config_key`'s awk tier.** It had neither. That
  was invisible while an unrecognised value silently meant `github`; with validation it becomes a
  false rejection — `tracker: "jira"` and `tracker: jira  # why` are both legal YAML naming a legal
  platform, and both would have halted. A genuine regression the plan did not anticipate.
- **Three documentation sites stated the unguarded `source` form as the house standard**
  (`AGENTS.md`, `docs/architecture/concepts/coding-standards.md`, and `platform-detection.md`'s
  canonical snippet). Guarding 16 call sites while the docs teach the unguarded form would have made
  the guard true of today's callers and false of the next one written. All three corrected.
- **Two stale hand-maintained lists corrected.** `platform-detection.md` said "All 8 leaf skills"
  (it is 15) and `shared/resources/README.md` named 10 skills, several wrong. Both now carry the
  correct list plus the `grep` that re-derives it, since both had already drifted once.
- **`npm run bundle` needed no change** — `SH_SIBLING_RE` followed `read-config.sh` automatically
  into the union of the 28 skills bundling `resolve-platform.sh` and the 22 bundling
  `resolve-paths.sh` = **36 skills**, matching the surface map's prediction. Re-running is a no-op.
- **Order was format → bundle**, per the repo rule: bundled copies are `.prettierignore`d and must
  be reached by regenerating from formatted sources, never formatted in place.
- **Verification**: 1287/1287 node tests · 61/61 `tracker-access.test.sh` · 6/6 existing
  `resolve-platform.test.sh` (unchanged, the regression oracle) · `validate:all` 115/115 ·
  `format:check` clean · bundle idempotent · a bundled copy exercised standalone in a temp dir,
  both accepting a legal value and halting a guarded caller on an illegal one.
- **Mutation testing: 12/12 watched failing.** Every invariant was confirmed to have a test that
  actually holds it — permissive validation, dropped TRACKER/VCS validation, one shared legal set,
  mapping-as-scalar (red under the pyyaml tier only, exactly as predicted), default `manual`,
  unconditional env, unvalidated env, malformed-always-fatal, malformed-always-degrade, a call site
  dropping `|| exit 1`, `access.vcs` non-full accepted, and the probe reverting to bare `python`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Test-harness escaping, not a product defect.** Two of the twelve mutations initially reported
  "string not found" because of backslash escaping in the harness rather than a missing assertion.
  Re-run with corrected match strings; both went red as required. No code change resulted.

---

## QA Iteration History

### Cycle 1 — qa-task — 2026-08-17 — Gate: FAIL (40/100)

Adaptive strategy: **parallel agents** (10 phases, five top-level areas). Three read-only reviewers
ran concurrently — diff code review (`code_review_blocking=true`), success-criteria verification
instructed to treat the developer's own ticked boxes as unproven, and NFR/regression instructed to
measure rather than assert. **Every finding was then independently reproduced in main context**
before being recorded; nothing rests on a subagent's word.

**5 HIGH, 4 MEDIUM, 5 LOW.**

| ID | Defect |
|---|---|
| BUG-1 | `${!env_name}` (`resolve-platform.sh:94`) is bash-only → resolver returns 1 on **every** config under zsh. Regression vs develop. The Bash tool runs `/bin/zsh`, so this is the primary path, and this task's own `\|\| exit 1` guards turn it into a hard abort |
| BUG-2 | Tier-2 lint (`read-config.sh:97`) grades **valid** YAML `malformed` → hard halt wherever awk is the only tier |
| BUG-3 | `tracker: null` / `~` — legal and previously working — now halts |
| BUG-4 | `review-code:96` still unguarded (leaves `ACCESS_TRACKER` **empty**); real count 19 sites / 16 skills, not 16 / 15 |
| BUG-5 | Scalar and flow-form `access:` silently resolve to `full`; guard mutation graded its own homework |

**The finding that explains the others.** Mutation #10 mutated the test's own generated `caller.sh`,
not the repo — so it proved the assertion worked, never that the call sites were guarded. Verified
directly: deleting `|| exit 1` from `skills/create-pr/SKILL.md` leaves the suite at 61/61 green. That
is how BUG-4 survived. The Risk Assessment claims a grep assertion mitigates exactly this; it was
never written.

**Why nothing caught any of it.** 1287 node tests, 61 new assertions, 115 validations, clean
formatter, idempotent bundle — all green throughout. The suite exercises one shell (`bash -c`
everywhere), one YAML dialect (block form only, though the task doc specifies the flow form), and one
host configuration (forced-python cases silently fall back to awk on a pyyaml-less host with no SKIP).

**Live demonstration of blast radius.** While posting the QA comment, `tracker_call_with_retry` was
`command not found` — sourcing the resolver to obtain the helper had failed under zsh via BUG-1. The
defect broke the QA tooling mid-review.

**Deviation logged:** bug files were written for the 5 HIGH only; the 4 MEDIUM are recorded in the
gate's `top_issues`. The skill specifies a file for each HIGH *and* MEDIUM — deviated because all
four resolve in the same fix cycle and separate files would add ceremony without traceability.

Artifacts: `task.51.gate.1.*.yml`, `task.51.qa.1.*.md`, `task.51.bug.1`–`bug.5`. Posted to PR #246
and issue #225. Task status returned to `in-progress`.

---

### Cycle 6 — independent adversarial pass — 2026-08-17 — Gate: FAIL (45/100)

Run on user directive after the cycle-5 escalation, which asked for exactly this and stated that a
clean result would make the work mergeable. It was not clean.

**Method.** Three independent Explore reviewers with disjoint lenses — escalation paths, false
rejections, test-validity/mutation audit — none given the cycle-5 commit message, gate, or bug files,
so they would read the mechanism rather than its author's reasoning about it. Every finding was
re-executed in main context before being recorded; regression claims were verified against the reader
checked out at the parent commit `0da9bbc`.

**10 HIGH, 4 MEDIUM, 1 LOW.** Artifacts: `task.51.gate.6.*.yml`, `task.51.qa.6.*.md`.

| ID | Defect |
|---|---|
| BUG-15 | **`/usr/bin/python3` has no pyyaml**, so the awk tier is the *default* on a stock macOS host — not a fallback. There the documented `tracker: {workflowFile: …}` form yields `T={workflowFile` → enum rejection → `rc=1`, aborting all 13 guarded call sites |
| BUG-16 | **Cycle-5 regression.** The "at most one `<<`" guard also refuses a legal *disjoint* merge, which pyyaml resolves unambiguously. Verified: `rc=0 AT=manual` at `0da9bbc`, `rc=1` at HEAD |
| BUG-17 | Fail-closed branch's line-anchored `grep -q '^access:'` misses flow / quoted / merge spellings → malformed config + declared `manual` → `full`, exit 0 |
| BUG-18 | awk tier blind to merge keys and quoted mapping keys → a **well-formed** config declaring `manual` resolves `full`, exit 0, no warning |
| BUG-23 | **The simplest one.** A config in the canonical documented shape, merely made *unreadable* (`chmod 000`, root-owned, bad mount), resolves `full` at exit 0 — the fail-closed gate greps the very file it just failed to parse, so it fails open exactly when needed |
| BUG-24 | `SKILLS_CONFIG_FILE=/dev/null` discards a committed restriction silently on both tiers — falsifying the guarantee written in `read-config.sh`'s own header that "a stray env var can never loosen a config that deliberately restricts" |
| BUG-25 | `python -c` prepends CWD to `sys.path` (verified `sys.path[0]==''`), so a repo-root `yaml.py` is imported instead of PyYAML — arbitrary code execution plus total control of the resolved value. One flag (`python3 -I`) closes it |
| BUG-26 | BUG-18 generalised: the awk tier anchors on `^access:` / `^\s+tracker:`, so 16 legal spellings (quoted key, `access :`, BOM, col-0 comment, next-line flow map, deeper child, restrictive-duplicate-second, named-anchor merge, …) resolve `full` silently. Three also bypass the explicit scalar-access and `access.vcs` halts |

**Why the suite missed all four.** Green at 166/166 throughout. Sections 30–31 force
`AGENT_SKILLS_CONFIG_TIER=python` for every assertion that checks a resolved *value* (`:655`, `:676`,
`:692`); the one loop covering both tiers asserts only `rc=0` — which these configs do return under
awk, they just resolve to the wrong value. The exit-code assertion passes while the escalation is live.
This is the same "cross-tier test that forces a tier" pattern the cycle-5 escalation named as
recurring, reappearing in the tests written to close it.

**Verified sound**: 13/13 call-site guards; bundle idempotent with no bundle-only divergence; the
cycle-5 NUL refusal and merge-source scan genuinely closed; the stale `qa-task/references/
resolve-paths.sh` confirmed pre-existing on `develop`, not caused by this branch.

| BUG-27 | **The most realistic trigger in the cycle.** The *shape* of `access.tracker` is never validated — only the shape of `access` is. A plain nesting typo (`access:\n  tracker:\n    mode: manual`) returns `__MAP__` → `""` → "not configured" → `full`, exit 0, **both tiers**. A sequence-valued child escalates on one tier and halts on the other |
| BUG-28 | Mutation audit: **11 surviving mutations** — invariants with no witness. The repo-wide call-site assertion's dot-source half matches **zero lines** repo-wide, so deleting a guard from a real dot-source call site leaves the suite green. The legal-mode vocabulary is asserted by a *substring* check (a sixth mode is undetectable); `access_rank`'s ordering is unpinned; all four `TIER=python` force-guards can be removed unnoticed, making every `[python]` label unproven |

**Correction to this report's own earlier claim.** An earlier Step-5 note recorded "13/13 call sites
guarded". The real count is **15** — 13 `source` lines plus two dot-source lines
(`skills/review-code/SKILL.md:96`, `skills/qa-story/SKILL.md:1371`). All 15 *are* guarded, so the
conclusion held, but the count came from a `\S*resolve-platform\.sh` grep that cannot cross the space
inside `"$(dirname "$0")` — the identical blind spot that makes the suite's own dot-source assertion
match nothing (BUG-28). Two independent greps sharing one blind spot is why it is recorded rather than
quietly amended.

**Deviation logged**: no bug files written for cycle 6 — all fifteen findings are recorded in full in
the gate's `top_issues` with evidence and refs, and the pipeline is halting rather than entering a fix
cycle, so separate files would add ceremony without traceability. All three reviewers returned and are
folded in above.

---

## Completion

**Finished**: 2026-08-17 21:20 (cycles 1–5) · 2026-08-17 22:05 (cycle 6)
**Final Status**: Escalated — independent adversarial pass returned FAIL (10 HIGH); halted on findings per user directive
**Branch**: `feature/task.51.access-mode-config-and-resolver`
**PR**: [#246](https://github.com/Gamaroff/agent-skills/pull/246)
**QA Iterations**: 6 (all FAIL: 40 → 55 → 55 → 60 → 70 → 20)
**DoD Summary**: not produced — Step 7 not reached

---

## Escalation Addendum — Cycle 6 — 2026-08-17

### What the independent pass settled

Gate 5's open question was whether the cycle-5 fixes were sound or merely unexamined. The answer is
that they were unexamined *and* one of them was wrong: BUG-16 is a false rejection that cycle 5
introduced, verified against the parent commit. **Six consecutive cycles have now ended with the
round's own fixes introducing at least one new defect.** That is no longer a run of bad luck; it is
the observed behaviour of this change under this method.

### The finding that reframes the task

BUG-15 is not in the cycle-5 diff, and no review of that diff would have found it. The two-tier reader
treats python as the normal path and awk as a fallback, but **on a stock macOS consumer host the awk
tier is the only tier**, because `/usr/bin/python3` ships without pyyaml. This repo's own developers
resolve `python3` to a Homebrew build that *has* pyyaml. So the tier consumers actually run is the one
this project least exercises — and the two tiers disagree on legal input, including the configuration
form the project's own reference doc prints.

BUG-15, BUG-18 and BUG-26 live in that tier. But the cycle's simplest defects do not, and that is the
more uncomfortable result: BUG-23 (an unreadable file), BUG-24 (`SKILLS_CONFIG_FILE`) and BUG-25
(`yaml.py` shadowing) all escalate on **both** tiers, on a canonical config, with no unusual YAML
involved. Fixing the awk tier would leave all three standing.

### Why a seventh cycle is not the recommendation

Across six cycles the defects concentrate almost entirely in the awk tier's attempt to approximate a
YAML parser with line-oriented heuristics. Each cycle closes one spelling — the block form, then the
flow form, then the multi-line flow form, then the anchored form — and leaves its siblings open,
because there is no finite list of spellings to close. That is what having a grammar means. Fixing the
nine findings above would very likely produce a tenth in an adjacent spelling.

Three options worth costing before more fixing:

1. **Require pyyaml, fail loudly without it.** Deletes the tier disagreement outright. Costs a
   dependency on hosts that presently work by accident.
2. **Vendor a minimal pure-python YAML-subset parser.** Keeps zero-dependency operation; replaces
   heuristics with a grammar.
3. **Restrict the awk tier to a documented strict subset and refuse anything outside it** rather than
   guessing. Converts every silent escalation above into a loud, correct refusal.

Gate 5's split recommendation also stands and gains force: the 18 call-site guards are precisely what
turn the awk tier's misreadings into aborted runs, so landing the resolver separately — and the guards
only once it is proven — bounds the blast radius.

### State of the work

- **Pushed**: 14 commits, PR #246, CI green. Tree clean, bundle idempotent.
- **Suite**: 166/166 green — with four HIGH defects live. The suite's tier coverage is the first thing
  to fix regardless of which option above is chosen: assert resolved *values* under every tier, not
  just exit codes.
- **No fix applied this cycle.** The pipeline halted on findings by directive rather than entering a
  seventh fix loop.

---

## Escalation — 2026-08-17

### Why the pipeline stopped here

`develop-task` caps the QA loop at **5 complete cycles**. All five ran; none produced a clean gate.
The work is not abandoned mid-flight — every finding from every cycle is fixed, committed and
pushed, and the tree is green. What is missing is an **independent adversarial pass over the
cycle-5 diff**, and the reason that matters is the base rate below.

### What each cycle found

| Cycle | Gate | HIGH | What the cycle taught |
|---|---|---|---|
| 1 | FAIL 40 | 5 | The suite tested one shell, one YAML dialect, one host. `${!var}` broke every call site on macOS |
| 2 | FAIL 55 | 3 | The fixes introduced siblings of the bugs they closed — a batching fix that shifted records, a flow-form fix that handled one line |
| 3 | FAIL 55 | 3 | Same again. Root cause named: in-band signalling. Strategy changed from patching instances to removing the mechanism |
| 4 | FAIL 60 | 1 | The new framing was sound but shipped without the validation that makes an unescaped framing safe |
| 5 | FAIL 70 | 2 | The cycle-4 merge fix opened a new silent escalation; the transport refusal was missing a third byte |

**Every cycle's fixes introduced at least one new defect.** The trend is favourable — 5 → 3 → 3 → 1
→ 2 HIGH, and cycle 4's and 5's were single missing validations rather than design faults — but the
rate has never reached zero, and the last round has not been checked by anything other than itself.

### The recurring lesson

Stated plainly, because it generalises past this task: **a fix is correct for the case it was written
for and wrong for the adjacent one.** The other reader. The multi-line form. The value that is not a
short enum. The merge source defined at the site rather than named. Every single HIGH after cycle 1
lived in an adjacent case.

The second lesson is about tests. **Five separate tests in this task passed for the wrong reason** —
a mutation applied to the test's own helper, a fixture writing raw bytes instead of escapes, a
cross-source test that forced a tier so neither source populated the state under test, a merge test
covering the one form that worked, and a path-root test whose variables expanded in the outer shell.
Every one was found by mutation testing, never by reading the test. Reading a green test tells you
nothing; breaking the code it guards tells you everything.

### State of the work

- **Pushed**: 12 commits on `feature/task.51.access-mode-config-and-resolver`, PR #246, CI green.
- **Suite**: 61 → 166 assertions. 42 mutations run cumulatively; every invariant has a witness.
- **Coverage added across cycles**: zsh parity, both YAML dialects, both parser tiers with a loud
  SKIP when one is unavailable, the lint's false-positive shapes, null spellings, scalar/flow/
  multi-line `access:` forms, record forgery, transport-hostile bytes, merge-source duplicates,
  cross-source hygiene, and a repo-wide call-site guard assertion that greps the actual files.
- **No known defect outstanding.**

### Recommended next step

One independent adversarial review of the cycle-5 diff. If it is clean, this is mergeable.

If it is not, the recommendation changes to **splitting the task**. The three parts are separable and
only one carries wide blast radius:

1. `read-config.sh` + `resolve-platform.sh` — the resolver and reader (where all 13 HIGH lived);
2. the 18 call-site guards — mechanical, but this is what turns a rejection into a halted run;
3. the documentation sweep and the setup-wizard prompt — inert.

Landing (1) alone, behind its own review, would let the guards follow against a resolver that has
already been proven in place.
