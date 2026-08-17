# Restricted tracker access — manual, command, read-only and approval modes

## Context

`agent-skills` assumes the locally-running agent holds write credentials for the tracker. Every
pipeline moment — status transitions, issue comments, board field updates, issue creation and
closure — is a direct API call made by the agent.

A growing class of consumer cannot grant that. Security teams take central control of token
issuance, and some will not issue a write token to a local agent at all. Today those consumers have
exactly one option: leave `github_issue` / `jira_key` unwritten, after which every tracker moment
silently no-ops (`develop-pipeline-step-0-resolve-and-prepare.md:265-281`, and the ten `skip if
TRACKER_ISSUE is empty` guards downstream). The pipeline runs, the docs are written, and **nothing
tells anyone the tracker was never updated.** The work looks done and the board says otherwise.

This adds a supported path: the pipeline still runs unattended end to end, and instead of silently
skipping remote actions it **records each one it could not perform and hands the human everything
needed to perform it** — deep link, exact field and value, paste-ready comment body, and the exact
command to run.

Intended outcome: a consumer with no tracker write access gets the same local artefacts as everyone
else, plus one ordered checklist, and the outstanding debt is visible in the implementation report,
on the PR, and in a committed file rather than invisible.

### Decisions taken with the user

| Decision | Choice |
| -------- | ------ |
| Access models | All five, per system: `full` (default) · `read-only` · `approve` · `command` · `manual` |
| Config surface | A **new `access:` block** in `skills-config.yaml`. Identity (`tracker: jira`) stays separate from access |
| Timing | **Batched** — the run completes unattended, then hands over one ordered checklist |
| Deliverables | All four — committed markdown checklist · reviewable shell script · inline summary · JSON sidecar |
| The accept gap | `finalise` still writes `status: accepted` locally; the tracker debt is recorded **loudly** |
| Scope | **Tracker only.** VCS write (git push, PR create/merge/comment) remains a hard requirement |
| Delivery | A sequence of task documents, one per shippable unit |

## Scope

Measured surface: **31 distinct mutation kinds across 105 call sites.**

**In scope — 20 tracker mutation kinds**

- **Jira (9)** — create issue · update issue fields · set Team custom field · transition status
  (single and multi-hop ladder walk) · worklog attached to a transition · add comment · add to board
  backlog · add/remove sprint issues · start/close sprint
- **GitHub tracker (11)** — create issue · edit issue · close · reopen · comment on issue · create
  milestone · add to Projects v2 board · set board Status · set board Priority · set board Estimate ·
  link sub-issue

**Out of scope — VCS write stays a hard requirement:** create PR, comment on PR, edit PR comment,
merge PR, `git push`, push tag, create Bitbucket issue.

Why this line: every *blocking* mutation is VCS. `create-pr` returns the PR URL each later step
consumes; `gh pr merge` gates `develop-next`. A batched handover cannot supply a return value
mid-run, so covering them would force the pipeline back into stop-start — the opposite of the
batched model chosen. It is also the realistic line: the common lockdown is a **tracker** credential
(`tracker: jira` + `vcs: bitbucket` is already a first-class combo here) while git over SSH keeps
working.

## What already exists — reuse, do not reinvent

This is less new machinery than it looks. Six existing pieces are load-bearing.

| Existing thing | Where | Why it matters |
| -------------- | ----- | -------------- |
| `jira-stage.js --print-plan` | `shared/resources/jira-stage.js:344-392` | Already a **credential-free, network-free planned-mutation emitter**, deliberately running *before* the auth check. Emits `{stage, reason:"plan", targets, hops, from, terminal, source}`. The seed of the whole feature. |
| `jira-transition-protocol.md` | `shared/resources/` | Already a prose protocol that **consumes that payload and tells a different actor how to execute it by hand**, with binding MUST-NOT clauses and a parity test (`evals/shared/tests/transition-protocol-parity.test.mjs`). The template for every instruction this feature emits. |
| `stage-disabled` | `skills/finalise/SKILL.md:1176` | Already classified *"Success, not a warning — a human moves this card by design."* The precedent that a non-executed transition is a legitimate outcome, not a failure. |
| `not-on-board` escalation | `skills/finalise/SKILL.md:1193-1214` | Already posts a PR comment ending `**Action required:** manually move the card to Done`. The escalation format already exists; this feature generalises it. |
| `correct-course` proposal | `skills/correct-course/SKILL.md:247-264` | Already the "emit a proposal a human applies by hand, including paste-ready rows" idiom, written to a committed document. |
| Exit-code / `reason` convention | `jira-stage.js:21-29`, `gh-stage.js:23` | Stage CLIs exit 0 for every outcome and communicate via a `reason` string, enumerated in `finalise/SKILL.md:1176-1192`. A new `deferred` reason is the idiomatic signal. |

## Architecture

### The organising idea

**One planned-mutation record. The access mode decides only who executes it and how it is
rendered.** `manual`, `command`, `read-only` and `approve` are four renderings of the same record,
not four features. This is what keeps a 20-kind surface tractable.

### Three corrections found while designing the interception

1. **`jira-sync.js` has no comment endpoint at all.** There is a deliberate refusal at `:3073`
   (`// No 'comment' (API v3 wants ADF there…)`). Every Jira comment in the repo is an MCP call
   *because there is no code path to intercept*. `tracker-comment.js` is therefore not consolidation
   of existing code — it is **building a missing function**, which is why it moves from a
   nice-to-have to the load-bearing task in the sequence.
2. **`gh-stage.js` has no `--print-plan`, and its `--dry-run` requires `gh` auth** — the
   `ghAvailable` gate at `:811` runs before the `args.dryRun` branch at `:1068`. It is asymmetric
   with `jira-stage.js`, whose `--print-plan` deliberately runs *before* its auth check. Closing that
   asymmetry is a prerequisite of the GitHub path, not a nice-to-have.
3. **A single `http()` hook is not enough.** It sees only a URL and a JSON blob, so `manual` mode
   would render `PUT /rest/api/3/issue/PROJ-1 {…}` — the exact opposite of "exact field names and
   values". Two layers are needed (below).

### Interception — chokepoints, not 105 rewrites

Five real chokepoints already exist because of dependency injection already in the code:

| Chokepoint | File | Covers | Mechanism |
| ---------- | ---- | ------ | --------- |
| `makeHttp({fetchImpl})` → `http()` | `shared/resources/jira-sync.js` (factory ~`:1888` region; POST/PUT sites at `:1888`, `:3303`, `:4147`, `:4188`) | **6 Jira kinds** — create, update fields, Team field, transitions incl. `walkLadder`, worklog, backlog | Intercept any non-GET. `fetchImpl` is already injectable, so a recording implementation needs no signature change. |
| `makeExec(execImpl)` | `shared/resources/gh-stage.js:263`, consumed by `ensureOnBoard:526` and `setOption:572` | **2 GitHub kinds** — add to board, set board Status | Inject a recording `exec`. The test suite already stubs `gh` and fails on any write verb (`tests/gh-stage.test.mjs:9`), so the seam is proven. |
| `jsm_curl` | `shared/resources/jira-sprint-lib.sh:43` | **2 Jira kinds** — sprint add/remove, sprint start/close | Single bash function behind both sprint scripts. **Zero call-site edits.** |
| `tracker_call_with_retry` | `shared/resources/resolve-platform.sh:69` | The 15 `gh` mutations already wrapped | Prepend a mode check; keep the old name as an alias. **Zero call-site edits** — the variadic-argv/passthrough contract is already exactly right. ~20 further `gh` sites become covered by wrapping them, a mechanical prose edit. |
| `bitbucket-auth.sh` | `shared/resources/` | ~10 Bitbucket curl sites (out of scope now; the seam exists) | Sourced at every Bitbucket site as of v0.41.0. |

Coverage: **≈73 of 105 sites mechanically**, of which ~53 need *zero* call-site edits.

**Two-layer interception inside `jira-sync.js`** — both, not either:

- **Layer 1, `http()` — a fail-closed safety net.** Any non-GET under a deferring mode is journalled
  as `jira.unknown-mutation` with the raw URL and payload, and returns a synthetic `202` response. A
  mutation nobody annotated is refused and *loud*, never silently executed. (Exclude the
  POST-as-search at `:4147`.)
- **Layer 2, the six semantic mutators** — `putIssueAtomic`, `transitionToStatus`'s inner `post()`,
  `walkLadder`, `moveToBacklog`, and the create-POSTs — each record a proper kind, target, deep link
  and human-readable field list. This is what makes `manual` mode say "set **Team** to **Platform**"
  instead of printing JSON.

Layer 2 is per-kind work. Ship the ~12 kinds the develop pipelines actually fire; the rest fall
through to layer 1 and render generically but correctly. A bounded, stated gap — not a silent one.

**Deferral reuses the `--dry-run` null path rather than inventing one.** `sync-jira-story.js:819`
already sets `result = { issueKey: null, issueUrl: null, updated: null }` and the rest of the script
copes. The existing `--dry-run` tests already cover that shape.

That leaves **10 kinds with no chokepoint**, all of them prose-driven — an LLM following SKILL.md
instructions that invoke `gh issue …` or an Atlassian MCP tool directly:

- Jira comments (~20 call sites, MCP `addCommentToJiraIssue`, plus one stray `curl` at
  `skills/review-task/SKILL.md:1652`)
- GitHub issue create / edit / close / reopen / comment / milestone / sub-issue link
- GitHub board Priority and Estimate (`set-github-project-{priority,estimate}.sh` call
  `gh api graphql` directly rather than through `gh-stage.js`)

**A prose rule is the wrong mechanism for these.** The repo has learned this once already: the
`jira-transition-protocol.md` header says the matching loop *"is delegated to an LLM… Without
explicit guard rails the model has been observed picking a non-matching transition… Moving the
primary path into `jira-stage.js` is the more durable fix — the guard rails below only bind a model
that reads them."* An access mode enforced only by prose fails exactly the same way, and it fails
**silently**, which is the specific harm this feature exists to remove.

So the mechanism is the one the repo already chose for transitions: **move the mutation behind a
deterministic CLI, and have the prose call the CLI.** Two new CLIs, mirroring `jira-stage.js` /
`gh-stage.js` in shape, exit-code discipline and `reason` vocabulary:

- `shared/resources/tracker-comment.js` — `--issue <key|number> --body-file <path>`; posts a comment
  via Jira REST or `gh issue comment`, or records a deferred record. Replaces ~20 prose MCP calls
  with one call site each.
- `shared/resources/tracker-issue.js` — create / edit / close / reopen / milestone / link-sub-issue /
  set board Priority / set board Estimate.

This is a continuation of the repo's existing direction of travel, not a new pattern — and it is
independently valuable even for consumers with full access, because it removes ~30 hand-written
prose mutation sites and the drift between them, and lets the comment call be retried by code rather
than by the model (the gap `resolve-platform.sh:64-68` currently apologises for).

The move is not "govern the LLM's choice" but **delete the choice**: once the primary path is a CLI,
the MCP call becomes the same documented `no-credentials` fallback `jira-stage.js` already
established — a compliance pattern the step docs already use in six places.

### Enforcement, stated honestly

One residual case cannot be closed by design: a consumer holding the Atlassian MCP connector but no
API token, under `access.tracker: manual`. (It is close to incoherent — holding the connector *is*
write access — but it is expressible.) Three layers, and the plan must not overstate them:

| Layer | Strength |
| ----- | -------- |
| A Step 0 banner listing the forbidden MCP write tools | **Mitigation.** Prose does not bind a model reliably — this repo has said so twice, in `jira-transition-protocol.md` and `verify-push-state.sh` |
| A post-hoc detector: the renderer flags any expected moment with no journal record as `⚠️ UNRECORDED` in the **committed** handover | **Visibility.** Converts an invisible failure into a reviewable diff |
| A harness-level permission deny-list on the MCP write tools | **Actual enforcement** — the only layer that cannot be disobeyed |

Only the third is enforcement. `manual` mode must be documented as **advisory** without it, and the
setup wizard should offer to write it rather than assuming it. Saying otherwise would sell a
guarantee the library cannot make.

### Access resolution

`resolve-platform.sh` already sets `TRACKER` and `VCS` by sourcing. It gains `ACCESS_TRACKER` from
the new config block, with the same three-tier resolve (config → env `AGENT_SKILLS_ACCESS_TRACKER` →
default `full`). Node scripts read the same config directly.

**One hazard to design against, found during exploration:** `read_config_key` returns any
unrecognised value verbatim, and every downstream branch is `if jira / else github` — so a typo
today silently means *github*, not an error. The new key must **validate against the five known
values and fail loudly on anything else.** A silent fall-through to `full` would hand credentials to
a run the operator meant to lock down, which is the one failure this feature must never produce.

```yaml
access:                 # optional — MAP ONLY, never a scalar. Default: full for both
  tracker: manual       # full | read-only | approve | command | manual
  vcs: full             # accepted and validated; only `full` is supported today (see Scope)
```

Map-only is deliberate: `tracker:` is already dual-shaped (scalar platform override *or* a map with
`workflowFile`), a wart `docs/reference/configuration.md:33-35` has to warn humans about because
YAML cannot hold both. Do not repeat it.

Accepting `access.vcs` now while supporting only `full` keeps the schema stable when VCS coverage is
reconsidered, and gives a clear error instead of silent ignoring.

**A second fail-open hazard, specific to the nested read.** `read_config_key`'s awk tier matches
`/^${key}:/` — top-level only. `read_config_key access` would match the `access:` line and print
empty, and the whole block would silently resolve to `full`. On a security-shaped feature that is
the worst possible default, so both tiers need a nested-aware reader and a regression test pinning
exactly this case.

**`develop-next` and `develop-batch` must refuse below `access.vcs: approve`.** A batched handover
cannot merge a PR, and leaving `merged: false, ticked: false` in the run-state file for a human to
finish later is a resumability trap — the Step 4 roadmap tick would run against an unverified
assumption about what landed. Both orchestrators HALT at their Step 0 state check with a message
pointing at `/develop-story` and `/develop-task`, which *do* complete under restricted access. This
is a capability restriction, not a bug, and it must be documented as one.

### The journal, and where output lands

Runtime journal (append-only JSONL, gitignored, alongside the existing state files):
`.claude/state/tracker-actions.jsonl`. Every intercepted mutation appends one record. Append-only
JSONL survives a crash mid-run and needs no read-modify-write, matching how the pipeline lock is
handled.

At handover, one renderer pass reads the journal and writes four outputs:

| Output | Path | Committed? | For |
| ------ | ---- | ---------- | --- |
| Markdown checklist | `{work-item-dir}/task.{N}.tracker-actions.{n}.{name}.md` (story form mirrors it) | **Yes** | The durable record and the `manual` model. New artifact kind alongside `implementation`, `qa`, `gate`, `dod` — see `docs/standards/file-naming.md:33-50` |
| Shell script | `{work-item-dir}/.tracker-actions/apply-{n}.sh` | No (gitignored) | The `command` model |
| JSON sidecar | `{work-item-dir}/.tracker-actions/actions-{n}.json` | No | A consumer's own CI/bridge |
| Inline summary | chat output at end of run | — | Immediate awareness; points at the committed file |

The script and JSON are gitignored deliberately: the script may embed issue keys and full comment
bodies and is regenerable, while the checklist is the artefact a reviewer and a future reader need.

### The four renderings

- **`manual`** — checkbox per action: system, deep link to the exact issue/board, the field and its
  target value by name (resolved from `tracker-workflow.yaml`, so it names the consumer's real
  column), and the comment body in a fenced block for verbatim paste.
- **`command`** — the same records as `set -euo pipefail` shell, one `echo` of intent per command,
  credentials referenced by env var and **never inlined**. Re-runnable: each command is the
  idempotent form the pipeline itself would use.
- **`read-only`** — a verification pass runs first: read current state, drop actions already
  satisfied, annotate the rest with observed-vs-desired. Turns "do these six things" into "these two
  are still outstanding", which is the difference between a checklist people use and one they skip.
- **`approve`** — the same records presented once via `AskUserQuestion` at handover; approved
  records execute immediately with the credentials the agent already holds.

### The accept gap

In `manual`/`command` mode `finalise` still writes `status: accepted` locally — local documents are
the source of truth and the DoD verification genuinely passed. The debt is recorded in three places
so it cannot be missed: a `## Tracker Actions Required` section in the implementation report (next
to the existing Issues Log), a PR comment reusing the existing `not-on-board` escalation format, and
the committed checklist.

This respects the rule behind *"never skip Step 7 side-effects"* (`docs/reference/anti-patterns.md:61`).
The rule's stated harm is **silent drift** — *"tracker boards drift from reality"*. Deferring with a
loud, committed, reviewable record is not the skip that rule prohibits. The anti-patterns entry and
the FAQ both need a short amendment saying so explicitly, or the next reader will read the new mode
as a violation.

## Task sequence

Seven shippable units. Next available task number is **51**.

| # | Task | Delivers | Independently useful because |
| - | ---- | -------- | ---------------------------- |
| 51 | Access model: config, resolver, validation | The `access:` block, `ACCESS_TRACKER` in `resolve-platform.sh`, strict validation with a loud failure on an unknown value, docs | Closes the silent-fall-through hazard on `tracker:`/`vcs:` too, which is a live bug today |
| 52 | Record schema + journal + renderers | The record schema, `.claude/state/tracker-actions.jsonl`, and all four renderers driven by a fixture journal | Testable end-to-end with no interception at all; fixes the output contract before anything writes to it |
| 53 | Jira REST interception | Recording `fetchImpl` in `jira-sync.js` — **6 of 9 Jira kinds** | Makes `manual` mode genuinely work for the sync-jira-* skills and all pipeline transitions |
| 54 | GitHub board interception | Recording `execImpl` in `gh-stage.js` + the two `.sh` board helpers — **4 GitHub kinds** | Board moves are the most visible drift; covering them alone is worth shipping |
| 55 | `tracker-comment.js` | One CLI replacing ~20 prose MCP/`gh`/`curl` comment sites | Removes drift between 20 hand-written comment sites for **every** consumer, not just restricted ones |
| 56 | `tracker-issue.js` | Issue create/edit/close/reopen/milestone/sub-issue — the remaining GitHub kinds, plus Jira sprint via `jsm_curl` | Same argument: consolidates the last prose mutation sites |
| 57 | `read-only` verification + `/tracker-reconcile` | The verification pass, and a skill that re-reads a committed checklist later and reports or applies what is outstanding | Only worth building once records exist and are trustworthy; turns a one-shot handover into a loop that converges |

Ship 51 → 52 first: after those two, a fixture-driven demo exists and the output contract is fixed
before any call site depends on it. 53 and 54 are independent of each other. 55 and 56 are the large
ones and are valuable on their own merits.

## Critical files

- `shared/resources/resolve-platform.sh` — access resolution and validation (task 51)
- `docs/reference/configuration.md:29-111` — the canonical `skills-config.yaml` schema block
- `shared/resources/jira-sync.js` — the `makeHttp`/`http()` factory; non-GET interception (task 53)
- `shared/resources/gh-stage.js:263` (`makeExec`), `:526` (`ensureOnBoard`), `:572` (`setOption`) (task 54)
- `shared/resources/set-github-project-{priority,estimate}.sh`, `shared/resources/jira-sprint-lib.sh:43`
- `shared/resources/jira-stage.js:344-392` — copy `--print-plan`'s credential-free discipline
- `shared/resources/jira-transition-protocol.md` — the model for instruction prose and its guard rails
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — Step 0 resolution, the
  implementation-report template (§0e), and the ~20 MCP comment call sites across step docs
- `skills/finalise/SKILL.md:1176-1214` — the `reason` table and the escalation format to extend
- `docs/standards/file-naming.md:33-50` — register the new `tracker-actions` artifact kind
- `docs/reference/anti-patterns.md:61`, `docs/reference/faq.md:19` — amend the "never skip Step 7" rule
- `scripts/setup-consumer.sh` — offer the access mode at setup; `.env.example` and getting-started docs

Bundling: `shared/resources/` changes require `npm run bundle` and committing the regenerated
`skills/*/references/` copies. New `.test.sh` suites must be added by hand to the `test` script in
`package.json` — the glob list is hand-maintained and a suite absent from it runs nowhere.

## Verification

Per the repo's standard, every invariant must be **watched failing**, not merely watched passing.

**Invariants worth pinning:**

1. An unknown `access.tracker` value **fails loudly** — never silently resolves to `full`. (Mutate:
   make the default permissive → must go red.)
2. In `manual` mode, **no write reaches the network.** Assert on a stubbed transport that no non-GET
   Jira call and no `gh` write verb is issued — the same technique `tests/gh-stage.test.mjs:9`
   already uses. (Mutate: let one POST through → red.)
3. Every intercepted mutation produces **exactly one** journal record — no drops, no duplicates on
   retry. (Mutate: record inside the retry closure → duplicates → red.)
4. The renderers are **total**: every record kind renders in all four outputs, with no silent
   `default:` swallow. (Mutate: add a kind without a renderer → red.)
5. No credential value appears in any rendered output. Assert on scheme/env-var-name only. (Mutate:
   inline a token in the script renderer → red.)
6. In `full` mode the journal stays **empty** and behaviour is byte-identical to today. The
   regression guard for every existing consumer.
7. `finalise` in `manual` mode still writes `accepted` **and** emits the debt record — both, or red.

**Test files:** `shared/resources/tracker-access.test.sh` (resolution + validation, modelled on
`resolve-platform.test.sh`), `shared/resources/tests/tracker-actions-render.test.mjs` (fixture
journal → four outputs), plus additions to the existing `gh-stage.test.mjs` and the `jira-sync`
suites for the interception seams.

**End-to-end:** run `/develop-task` against a scratch task with `access: {tracker: manual}` and a
real `tracker-workflow.yaml`; confirm the run completes unattended, the checklist is committed and
lists the right target columns by their real names, the PR comment appears, and the board is
provably untouched. Then set `access: {tracker: command}`, run the generated script against a real
board, and confirm the resulting state matches what `full` mode would have produced.
