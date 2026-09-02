# `/develop-story` Pipeline Audit — 2026-08-20

> **Audience:** maintainers of this repo fixing documentation drift in the story pipeline.

An audit of `/develop-story` **as implemented**, followed by a check of every document that
restates its behaviour. Findings are grouped so they can be closed one batch at a time.

**Audited at:** `85403aa` (v0.44.0). **Nothing was changed by this audit** — this file is the only
addition.

---

## 1. Scope and method

**Authoritative source (the "implementation").** `/develop-story` is prose-driven, so its
implementation is:

- `skills/develop-story/SKILL.md` — the orchestrator skeleton
- `shared/resources/develop-pipeline-*.md` — the step bodies, contracts and prompts
- `shared/resources/*.sh` / `*.js` — the executable parts (`advance-pipeline-lock.sh`,
  `develop-pipeline-on-stop.sh`, `verify-push-state.sh`, the stage/comment engines)

Everything else — runbooks, concepts, reference pages, the skill's own `README.md`, contributor
eval docs — is **documentation about** that implementation, and is what was audited against it.

**Method.** Three parallel read-only sweeps (implementation map; external documentation surface;
sub-skill and eval contracts), then **independent re-verification of every finding against both
sides**. Nothing below rests on a summary alone; two candidate findings were discarded during
verification (see §5).

**In scope:** documentation that contradicts the implementation.
**Out of scope but recorded:** defects inside the implementation itself — see Appendix A.

---

## 2. Verified pipeline baseline

The facts each finding is measured against. Cite this section rather than re-deriving.

| Property | Actual behaviour | Source |
| --- | --- | --- |
| Steps | 8, fixed. 1 `create-branch`, 2 `review-story`, 3 `develop`, 4 `create-pr`, 5 `qa-story`, 6 `qa-fix`, 7 `finalise`, 8 `commit-changes` | `SKILL.md:163-193` |
| Branch model | Story branches cut from `develop`, PR back to `develop`. Epic integration branches are a **per-epic opt-in** via `branch_model: epic-integration` | `SKILL.md:3`; `develop-pipeline-step-0-resolve-and-prepare.md:537-580` |
| Phase 0 questions | Exactly **2** — Q1 base branch, Q2 PR target. **No Q3.** qa-planning is skipped silently; lite mode is auto-detected, never prompted | `develop-pipeline-step-0-resolve-and-prepare.md:613-627` |
| Lite mode trigger | `risk_level ∈ {low, absent}` **and** `phase_count < 3` **and** single module. Computed by the orchestrator, not returned by the detector agent | `develop-pipeline-step-0-resolve-and-prepare.md:194-208` |
| Lite mode effect | **Step 5 only** — `qa-story` uses direct tools, traceability mapper skipped. Steps 4, 7, 8 never skipped; every Step 7 side-effect runs in full | `SKILL.md:189`; `develop-pipeline-lite-mode.md:20-40` |
| Lite mode invocation | Auto-detected in Phase 0a. **There is no `--lite` flag** | `develop-pipeline-lite-mode.md:11-18` |
| Bounded loops | Two independent caps, both 5: Step 3 `MAX_ITER=5`; Steps 5–6 up to 5 QA cycles | `develop-pipeline-resume-contract.md:156-161`; `develop-pipeline-step-5-6-qa-loop.md:17` |
| Run state | `.claude/state/develop-pipeline.lock`, written at the **end of Step 1** with `current_step: 2` — the field names the **pending** step | `develop-pipeline-step-1-create-branch.md:128-155` |
| Stop hook range | Guards `current_step` **1 through 8 inclusive** (`-gt 8` / `-lt 1` are the escape valves) | `develop-pipeline-on-stop.sh:83-88` |
| Hooks | **Two** — `PreCompact` and `Stop` | `develop-pipeline-hooks.md:39,77`; `.claude/settings.json` |
| Sub-skill lock self-advance | Six of eight sub-skills. `qa-story` / `qa-fix` deliberately do not — the advancer no-ops for them | `advance-pipeline-lock.sh:80` |

---

## 3. Findings

Severity: **High** = the doc states something the code contradicts and acting on it causes harm.
**Medium** = stale or self-contradictory; misleads but is recoverable. **Low** = imprecision.

### Theme A — The pre-v0.24.0 epic-branch model is still asserted as *the* model — High

v0.24.0 (`CHANGELOG.md:1180`) made story branches flat Gitflow and reduced epic integration branches
to a per-epic opt-in. The standards and reference pages were updated. Nine narrative documents were
not, and still describe the two-level model as unconditional.

| ID | Claim (`file:line`) | Contradicted by |
| --- | --- | --- |
| A1 | `docs/reference/faq.md:27-29` — an entire Q&A titled *"Why is the develop-story branch model two levels deep (epic → story)?"*, answering that "the epic branch is a long-lived integration point" and "the epic PR to `develop` is the big merge" | §2 branch model |
| A2 | `docs/concepts/architecture.md:129` — `CB-->>DS: epic + story branches ready`; `:133` — `Step 4 — create PR (--base epic branch)` | `develop-pipeline-step-4-create-pr.md:14-24` (`--base {Q2_answer}`, default `develop`) |
| A3 | `docs/runbooks/create-parallel-stories.md:41,53,61` — "Merge in any order to epic branch"; "Merge each story PR to the epic branch"; "**PRs target the epic branch**, not `develop`" | §2 |
| A4 | `docs/runbooks/story-development.md:43` — "story PRs target an epic branch cut from `develop`"; `:319` — "merge the epic branch to `develop`", unconditional | **The same file at 189-226**, which states the current model correctly |
| A5 | `docs/runbooks/first-week/day-4-parallel.md:91` — "Two PRs open against the epic branch"; `:101` — "PRs target the epic branch regardless" | **The same file at 64**, which is correct |
| A6 | `docs/runbooks/first-week.md:36` — "1 story PR merged to the epic branch" | §2 |
| A7 | `docs/contributing/evals/live-github-test.md:5` — pipeline described as "`create-epic-branch` → `commit-changes`"; `:62`, `:259` — "PR targets the epic branch (not develop)" | **The same file at 286-288**, which is correct |
| A8 | `docs/contributing/evals/live-github-task-test.md:12,187` — contrast claims that a PR to an epic branch "would be `/develop-story`" | §2 |

**Why it matters.** A1 and A2 are the two pages a newcomer reads to learn the model, and both teach
the superseded one. A4, A5 and A7 contradict themselves within a single file, so a reader cannot
resolve it locally.

**Fix.** Copy the wording already correct in `docs/standards/story-documents.md:123-145` — the
cleanest existing statement. A1 should be rewritten as *"Why are epic integration branches opt-in?"*
rather than deleted; the rationale is still worth having, attached to the right premise.

### Theme B — Lite mode: wrong mechanism, and a flag that does not exist — High

Two separate errors, both widespread.

**B1 — the `--lite` flag is fabricated.** `grep -rn -- "--lite"` across `skills/develop-story/` and
`shared/resources/develop-pipeline-lite-mode.md` returns **zero hits**. Lite mode is auto-detected in
Phase 0a. Four documents instruct the reader to pass it:

- `docs/runbooks/story-development.md:249` — "Add `--lite` to skip pre-develop codebase mapping"
- `docs/runbooks/task-development.md:128` — "`--lite` skips context-gathering steps"
- `docs/reference/troubleshooting.md:168` — "You expected `--lite` to skip the PR comment"
- `docs/reference/anti-patterns.md:63,69` — "even in `--lite` mode"; "The lite flag is not the right tool"

`story-development.md:249` contradicts itself in the same sentence, adding "Lite mode is otherwise
auto-detected in Phase 0a — it is not a prompt."

**B2 — the mechanism is wrong.** Docs say lite mode "skips pre-develop codebase mapping and other
context-gathering". `SKILL.md:189` says **"Lite mode applies to Step 5 only"**, and
`develop-pipeline-lite-mode.md:20-22` scopes it to `qa-story` direct-tools plus skipping the
traceability mapper. The pre-develop surface map (`develop-pipeline-step-3-develop-loop.md:21-34`)
runs in **both** modes. Affected: `story-development.md:249`, `task-development.md:97,128`,
`troubleshooting.md:170`, `anti-patterns.md:65`, `glossary.md:29`, and `faq.md:19-21` — which builds
its whole rationale on the wrong mechanism ("skipping work that's *recoverable* — re-reading the
codebase, regenerating context").

**Why it matters.** A user follows an instruction that cannot work, then reasons about lite mode's
risk from a description of the wrong subsystem. This is the same class of defect as the fabricated
lite-mode CLI recorded at `CHANGELOG.md:1190` — a fabricated surface that survived one cleanup.

**Fix.** `docs/concepts/quickstart-story.md:129` already describes it correctly — *"It skips the
parallel QA agents and the traceability matrix step, but still runs every Step 7 side-effect"*.
Propagate that wording; delete the four `--lite` references. Note that `quickstart-story.md:129`
itself ends with a stale leftover, *"Pick `No` for anything with cross-file impact"*, from when lite
mode was prompted — it contradicts line 127 two lines above and should go.

### Theme C — The skill's own README contradicts its SKILL.md — High

| ID | Claim (`skills/develop-story/README.md`) | Contradicted by |
| --- | --- | --- |
| C1 | `:16` — "there is no epic integration branch, and a story branch is never cut from one" | `SKILL.md:3`; `develop-pipeline-step-0-resolve-and-prepare.md:537-580` |
| C2 | `:53` — "No epic branch is created — story branches are cut from `develop` (Q1) and PR to `develop` (Q2)" | same |
| C3 | `:87` — mermaid node `write lock current_step=1` | `develop-pipeline-step-1-create-branch.md:138` writes `2` |
| C4 | `:414` — Agent 3's return schema includes `pipeline_mode: lite\|standard` | `develop-pipeline-step-0-resolve-and-prepare.md:198-208`: the agent does **not** return it; the orchestrator computes it |
| C5 | `:442` — review report named `story.{epic}.{story}.review.{YYYY-MM-DD}.md` | `SKILL.md:288`, `develop-pipeline-step-2-review.md:98` — `review.{N}.{name}.md` |
| C6 | `:287,450` — latest gate found via `sort -t. -k5 -n` | `develop-pipeline-step-5-6-qa-loop.md:65-79` uses a dot-safe awk sort |

**Why it matters.** The README is the deepest reference for anyone modifying the orchestrator, and
C1/C2 flatly deny a feature the skill ships. C5 would send a reader looking for a file that is never
written under that name.

### Theme D — Hook docs describe a fixed bug as current behaviour — High

`shared/resources/develop-pipeline-hooks.md` states in four places that the `Stop` hook is active for
`current_step` in `[1, 7]`, and that `current_step >= 8` is an escape valve:

- `:82` — "**Trigger condition**: … `current_step` is in `[1, 7]`"
- `:98` — escape-valve table row `| current_step >= 8 | Pipeline is finishing on step 8; end of run |`
- `:105` — "while `current_step` is still in `[1, 7]`"
- `:146` — diagram `current_step = N (1 ≤ N ≤ 7)`

`shared/resources/develop-pipeline-on-stop.sh:83` guards `-gt 8`, under a comment (`:74-82`) stating
that `-ge 8` **was the defect**: it stopped guarding Step 8, "the one whose omission leaves work
uncommitted".

**Why it matters.** The doc documents the pre-fix code. Anyone debugging a Stop-hook problem from it
concludes the hook is correctly inactive at Step 8, which is the exact wrong conclusion, and is one
edit away from reintroducing the regression.

### Theme E — Contributor eval docs describe scenarios and an assertion that do not exist — Medium

On disk: `evals/develop-story/step-isolation/` contains exactly `01-create-story-branch` through
`08-commit-changes`. There is no `00-*`, and `prTargetsEpicBranch` exists nowhere in the codebase
(`evals/develop-story/step-isolation/04-create-pr/scenario.json` calls
`prTargetsBranch(receipt, "develop")`).

| ID | Claim (`docs/contributing/evals/reference.md`) | Reality |
| --- | --- | --- |
| E1 | `:48` — scenario `00-create-epic-branch-fresh` | Directory does not exist |
| E2 | `:49` — scenario `00-create-epic-branch-exists` | Directory does not exist |
| E3 | `:50` — "Story branch created from epic branch, not develop" | Asserts `^feature/story\.5\.1` cut from `develop` |
| E4 | `:53` — "PR targets epic branch (`prTargetsEpicBranch` regression guard)" | Assertion does not exist; the real guard asserts the **opposite** |
| E5 | `:58` — smoke described as "epic branch + PR-base assertions" | No epic-branch assertion exists |
| E6 | `docs/contributing/evals/recipes.md:152` — "all **10** step-isolation scenarios" | There are 8 |

**Why it matters.** `CHANGELOG.md:790` records this exact defect being found and fixed in
`recipes.md` and `live-github-test.md` — and notes that the recipe "asserts the exact opposite of
what the recipe claimed, and a contributor debugging a failure would have been reading the inverse of
the truth." `reference.md` was missed by that sweep and still carries the inverted text.

### Theme F — Seven dangling links ship inside the skill — Medium

This is one class bug, not seven typos. `bundle_skill.py` rewrites the explicit `shared/resources/X`
path form, but two link shapes are invisible to it:

1. **Bare same-directory links** inside a shared resource —
   `[document-change-log.md](document-change-log.md)` — so the target is never bundled.
2. **`../../docs/...` relative links**, which resolve correctly from `shared/resources/` but point at
   the non-existent `skills/docs/...` once bundled into `skills/develop-story/references/`.

Missing targets under `skills/develop-story/references/`:

| Target | Referenced from |
| --- | --- |
| `pipeline-lock-cooperation.md` | `develop-pipeline-hooks.md:34,105` |
| `document-change-log.md` | step-3, step-5-6, step-7 |
| `tracker-issue-cli.md` | `platform-detection.md` |
| `../../docs/reference/anti-patterns.md` | step docs |
| `../../docs/reference/configuration.md` | step docs |
| `../../docs/reference/tracker-workflow.md` | step docs |
| `../../docs/tasks/task.57.readonly-verification-and-reconcile/…` | step docs |

**`skills/develop-task/` has the identical gap.** There is no link-check over `skills/**`, so this is
invisible to CI — the task.58 link-check covers `docs/`.

**Fix.** Either teach `bundle_skill.py` to follow bare same-directory links (and rewrite `../../docs/`
to absolute repo URLs), or make the shared sources use the explicit `shared/resources/X` form the
bundler already understands. The second is smaller and matches the documented convention in
`AGENTS.md`.

### Theme G — Question-count and Q3 drift — Medium

| ID | Claim | Contradicted by |
| --- | --- | --- |
| G1 | `shared/resources/develop-pipeline-autonomous-defaults.md:20` — `\| High-risk gate (story / task) \| User-selected in Upfront Setup (Q3) \|` | `develop-pipeline-step-0-resolve-and-prepare.md:613` ("**No Q3**") and `:616-627` (count pinned at 2). Step 3 auto-answers the gate (`develop-pipeline-step-3-develop-loop.md:78`) |
| G2 | `docs/reference/glossary.md:25` — Phase 0 "Prompts for story/task path, base branch, **lite mode**" | Lite mode is auto-detected; there is no such prompt |
| G3 | `docs/runbooks/task-development.md:97` — lists "**Lite mode** for low-risk tasks" as a Phase 0 prompt | Same shared step-0; count is 2 for `develop-task` too |

**Why it matters.** G1 sits in the file both orchestrators load to decide autonomous behaviour, and
`develop-pipeline-step-0-resolve-and-prepare.md:625` explicitly warns that inventing extra questions
"may suppress the documented ones (observed regression in live-github-test)". A defaults table naming
a Q3 invites exactly that.

### Theme H — `current_step` initial value — Medium

| ID | Claim | Reality |
| --- | --- | --- |
| H1 | `shared/resources/develop-pipeline-pause.md:108` — "`current_step` \| 1–8. Set to **1** at end of Step 1" | `develop-pipeline-step-1-create-branch.md:138` writes **2** |
| H2 | `skills/develop-story/README.md:87` — mermaid `write lock current_step=1` | same |

`develop-pipeline-step-1-create-branch.md:148-155` spells out why: the field names the **pending**
step, and the "last completed step" reading made the Stop hook skip a step every time it fired
mid-step — "observed four times on one story before it was found". Documenting the old value invites
the regression back.

### Theme I — Step order transposed — Low

- `README.md:11` — "the agent runs the full **review → branch** → implement → PR → QA loop". Step 1 is
  branch, Step 2 is review.
- `docs/standards/architecture-docs.md:15` — "The pipeline (story → **develop → review** → QA →
  finalise)". Review precedes develop.

### Theme J — Hook count — Low

`docs/concepts/getting-started.md:133` ("the three pipeline hooks") and `:187` ("three Claude Code
hooks") vs `docs/reference/configuration.md:763` ("**two** hooks") and `.claude/settings.json`, which
registers `PreCompact` and `Stop`. Two is correct; `getting-started.md:187` then lists only the ones
that exist, so the count is the only error.

### Theme K — `create-story-branch` is a step label, not a skill — Low

`skills/develop-story/SKILL.md:3` renders the chain as
`create-story-branch → review-story → develop → …`. Every other element is a real skill name;
`create-story-branch` is a Pipeline Progress **row label** (`develop-pipeline-step-0-resolve-and-prepare.md:672`).
The skill is `create-branch`, which `SKILL.md:294` names correctly — so the file disagrees with
itself, and `generate_catalog.py` propagates the description verbatim to
`docs/reference/skill-catalog.md:38`.

> **Before fixing:** `evals/develop-story/protocol/pipeline-shape.test.mjs:104-111` *requires* the
> literal string `create-story-branch` in `SKILL.md`, and `:30` includes it in the ordered
> sub-skill list. The test currently pins the wrong name in place, so this fix requires a
> coordinated test edit and will otherwise look like a test failure.

### Theme L — "each pipeline sub-skill" self-advances the lock — Low

`SKILL.md:140` states that "each pipeline sub-skill calls `advance-pipeline-lock.sh --skill <own-name>`
as the last inline action of its body." Six do (`create-branch`, `review-story`, `develop`,
`create-pr`, `finalise`, `commit-changes`). `qa-story` and `qa-fix` do not, and neither ships the
script.

**This is correct behaviour, not a code defect.** `advance-pipeline-lock.sh:80` maps
`qa-story|qa-task|qa-fix` to `exit 0` — the QA loop is orchestrator-managed, so a self-advance would
be meaningless. **Fix the wording** ("each non-loop sub-skill"), not the skills. Recorded explicitly
so nobody closes it in the wrong direction.

---

## 4. Fix batches

Ordered so each batch is one reviewable commit and no batch depends on a later one.

| # | Batch | Files | Severity |
| --- | --- | --- | --- |
| 1 | Lite mode: delete the `--lite` flag, correct the mechanism (Theme B) | `story-development.md`, `task-development.md`, `troubleshooting.md`, `anti-patterns.md`, `glossary.md`, `faq.md`, `quickstart-story.md` | High |
| 2 | Epic-branch model sweep (Theme A) | `faq.md`, `architecture.md`, `create-parallel-stories.md`, `story-development.md`, `day-4-parallel.md`, `first-week.md`, `live-github-test.md`, `live-github-task-test.md` | High |
| 3 | Skill README realignment (Theme C) + `current_step` (Theme H) | `skills/develop-story/README.md`, `shared/resources/develop-pipeline-pause.md` | High |
| 4 | Stop-hook range (Theme D) | `shared/resources/develop-pipeline-hooks.md` | High |
| 5 | Eval contributor docs (Theme E) | `docs/contributing/evals/reference.md`, `recipes.md` | Medium |
| 6 | Bundler link handling + re-bundle (Theme F) | `skills/create-skill/scripts/bundle_skill.py` or the shared sources; affects `develop-story` **and** `develop-task` | Medium |
| 7 | Q3 / question-count (Theme G) | `develop-pipeline-autonomous-defaults.md`, `glossary.md`, `task-development.md` | Medium |
| 8 | Wording cleanups (Themes I, J, L) | `README.md`, `architecture-docs.md`, `getting-started.md`, `SKILL.md:140` | Low |
| 9 | `create-story-branch` naming + coordinated test edit (Theme K) | `SKILL.md:3`, `pipeline-shape.test.mjs`, regenerate catalog | Low |

Batches 1, 2, 5, 7 and 8 are documentation-only. Batch 6 touches the bundler and requires
`npm run bundle` plus a re-check that no step doc changed semantically. Batch 9 touches a test.
Batch 3 requires `npm run generate-catalog` only if the SKILL description changes (it does not).

---

## 5. Checked and clean

Recorded so this ground is not re-audited.

- **Bundled step docs are not drifted.** All 14 `develop-pipeline-*.md` under
  `skills/develop-story/references/` differ from `shared/resources/` **only** by the expected
  `shared/resources/` → `references/` rewrite. Verified by normalising the rewrite and re-diffing
  every pair. Worth stating because in-tree bundle drift has bitten this repo before.
- **`docs/standards/story-documents.md:123-145`, `docs/standards/epic-documents.md:11`,
  `docs/reference/configuration.md:161-165`, `docs/reference/pipeline-artifacts.md`,
  `docs/reference/tracker-workflow.md:133-161` and `evals/develop-story/README.md` are accurate.**
  These are the healthy statements of the branch model, artifact contract and stage moments — the
  right sources to copy from when fixing Themes A and E.
- **`docs/concepts/getting-started.md:289` is accurate** on the branch model, despite the same file
  being wrong on hook count (Theme J).
- **Two candidate findings were discarded during verification.** A suspected vacuous `assert.ok(...)`
  in `develop-branch-flow-rules.test.mjs` was an artifact of a concatenated `sed` range — the
  assertion is well-formed. And the protocol tests that forbid "epic-branch machinery"
  (`develop-branch-flow-rules.test.mjs:77,141`) forbid only the *mandatory* pre-v0.24.0 step, so they
  do not contradict the opt-in.

---

## 6. Systemic causes

Four recurring mechanisms produced most of the above. Worth addressing directly, or the next
behaviour change regenerates the same report.

1. **Narrative docs independently restate behaviour that reference docs already own.** Themes A and B
   are one behaviour change each, multiplied across 8–9 files. The reference and standards pages were
   updated; runbooks, concepts and contributor guides were not. Nothing links them, so nothing fails
   when they diverge. Candidate mitigation: have narrative docs link to the canonical statement rather
   than restate it.
2. **The bundler has a link blind spot** (Theme F), and no link-check covers `skills/**` — so broken
   links ship to consumers while CI stays green.
3. **A test pins a wrong name in place** (Theme K). `pipeline-shape.test.mjs` asserts on the SKILL
   description's prose rather than on a resolvable skill reference, so the error is now load-bearing.
4. **Fabricated surfaces survive cleanups.** `CHANGELOG.md:790` and `:1190` record two prior
   fabrications (`prTargetsEpicBranch`, `npm run lite-mode`). Theme B's `--lite` flag and Theme E's
   `reference.md` rows are residue of exactly those two — each cleanup fixed the files it looked at
   and missed a sibling. A grep for the fabricated token across the whole repo would have caught both.

---

## Appendix A — Out of scope, recorded

Defects **inside** the implementation, found while establishing the baseline. These are not
documentation drift and were not part of the agreed scope; they are recorded so they are not lost.
None has been verified as causing a live failure.

| ID | Issue |
| --- | --- |
| A-1 | `develop-pipeline-step-8-commit.md:93` calls `verify-push-state.sh --base "${BASE_BRANCH:?}"`, but `BASE_BRANCH` is never assigned anywhere in the pipeline (`grep` finds only the two Step-8 use sites). `PR_NUMBER` is initialised empty in Step 0 and never set. `${…:?}` aborts the shell, so the blocking post-condition whose rationale is "a summary of a verification is not a verification" can fail on an unset variable. |
| A-2 | `develop-pipeline-step-4-create-pr.md:38` builds `SCOPE_PATHS` from `git diff --name-only "{Q2_answer}...HEAD"` — the **PR target**, not the branch base `{Q1_answer}`. Phase 0d explicitly offers combinations where they differ (e.g. Q1 `feature/{current}`, Q2 `develop`), producing an over-broad staging scope. Impact is limited because the extra paths are already committed. `docs/reference/troubleshooting.md:121` describes the user-visible symptom of the same Q1/Q2 divergence. |
| A-3 | `skills/finalise/SKILL.md:924` reads the report path from an `IMPLEMENTATION_REPORT` env var "passed by develop-task/develop-story", and `develop-pipeline-step-8-commit.md:84` uses `${IMPLEMENTATION_REPORT:?}`. No step document exports it; the lock field is named `report_path`. |
| A-4 | `develop-pipeline-step-5-6-qa-loop.md:309` passes `exclude=story.…implementation.*.md` to `/commit-changes`, which documents `--exclude <path>` (`commit-changes/SKILL.md:26`) and expands each value into a literal `:(exclude)` pathspec — so both the argument form and the glob are wrong. The step hedges by pre-running `git reset HEAD -- '**/story.*.implementation.*.md'`, suggesting the flag path was never trusted. |
| A-5 | Step 1 must supply the Q1 answer to `/create-branch` non-interactively, but `create-branch` has **no `--base` flag** — the base is reachable only via `AskUserQuestion`. The hand-off is prose-only, unlike `create-pr`, which has a real `--base`. The same applies to `review-story`'s `APPLY=true`, which has no invocation surface and depends on the sub-skill recognising its caller. |
| A-6 | Both develop-story smoke scenarios are dead under the default driver: neither `smoke/01-end-to-end-dry/` nor `smoke/02-resume-mid-loop/` has a `replay/` directory, and neither sets `requiresLiveDriver: true`, so `npm run eval:develop-story:smoke` fails rather than skipping. This is likely why neither is in `eval:all`. |
| A-7 | `EVAL_MODE` mismatch: `develop-pipeline-step-5-6-qa-loop.md:372` guards on `= "1"`, but `smoke/01-end-to-end-dry/env.json` sets `"smoke"` and `smoke/02-resume-mid-loop/` has no `env.json`, so the `qa-fix-iter-{N}.marker` the resume scenario keys on is never written. |
| A-8 | `develop-pipeline-step-4-create-pr.md:75-76` contains `| tee -a Issues Log` — a filename with a space; not executable as written. |
| A-9 | `evals/develop-story/` has no `unit/` directory (unlike `develop-next` and `develop-batch`), and the step-isolation scenarios are replay fixtures that assert the runner copied a hand-authored file. No test resolves `${BASE_BRANCH}`, checks lock self-advance, or verifies that a flag a caller passes exists in the callee's documented flag table — a cross-skill flag check would catch A-4 and A-5 mechanically. |
