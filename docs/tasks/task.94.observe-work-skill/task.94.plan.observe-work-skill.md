---
id: task.94.plan
title: "Implementation Plan: Add the observe-work meta-skill"
type: plan
task-ref: task.94.observe-work-skill.md
---

# Implementation Plan: Add the observe-work meta-skill

> Requirements and success criteria: [task.94.observe-work-skill.md](task.94.observe-work-skill.md)

## Overview

Scaffold, then write the lean core against the task-93 engine, then the five references, then a test suite that asserts the properties which make the prose executable, then the eleven registration steps. The registration phase is last but is not an afterthought — five of its steps are CI-enforced and two of them (the test glob, the CATEGORIES entry) fail silently rather than loudly.

## Phase-by-Phase Implementation Guide

### Phase 1: Scaffold and frontmatter

```bash
python3 skills/create-skill/scripts/init_skill.py observe-work --path skills/
rm skills/observe-work/scripts/example.py \
   skills/observe-work/references/api_reference.md \
   skills/observe-work/assets/example_asset.txt
rmdir skills/observe-work/scripts skills/observe-work/assets 2>/dev/null || true
```

**Frontmatter.** Three hard validator rules apply: `description` must not contain `<` or `>`; it must be single-quoted if it contains a colon-space; `invokes:` must be inline flow form.

```yaml
---
name: observe-work
description: 'Observes the working session for skill-improvement signals — corrections you make, gaps no skill covers, rules the agent violates — and writes each one as a durable observation to the project observation log, then periodically reviews that backlog and stages skill updates for you to install. Adapted from the task-observer methodology by Eoghan Henn (CC BY 4.0). Use during any multi-step task, agentic workflow or work session that uses tools and produces deliverables, and in the post-task discussion that follows. Also triggers on observation log, skill observations, skill review, "any observations logged?", and /observe-work.'
invokes: [create-skill]
---
```

Keep the description under ~150 words (over that is a validator warning about context cost, and it is fair). Validate before writing another line:

```bash
python3 skills/create-skill/scripts/quick_validate.py skills/observe-work
```

---

### Phase 2: The lean core

**Target shape** — the section list, with the reason each earns a place in the always-loaded body:

| Section | Why it is in the body and not a reference |
|---|---|
| Attribution block | Licence obligation; must be present wherever the skill is |
| Workspace resolution | Every single invocation needs the path |
| Session Start Protocol | Fires once per session, every session |
| When to observe / what to watch for | The judgement is made continuously |
| How to log | The write happens during ordinary work, not during an episode |
| Surfacing protocol | End of every session |
| Acting on observations | The three contexts, and the staging rule that governs all of them |
| Related skills | Disambiguation happens at invocation time |
| Quick reference | The recall surface |
| Pointer list | The index into the references |

Everything else is an episode and belongs in a reference.

**Attribution block**, at the top, immediately after the H1:

> **Methodology adapted from [task-observer](https://github.com/rebelytics/one-skill-to-rule-them-all) ("One Skill to Rule Them All") by [Eoghan Henn / rebelytics.com](https://rebelytics.com)**, licensed CC BY 4.0 — share and adapt freely with credit. **Changes were made**: the observation-log mechanism is a rewrite against `references/observation-log.js`, the workspace is resolved rather than hand-pinned, the pre-3.0 log-migration path is omitted, and authoring guidance is deferred to this repository's `create-skill`. The links here are for the human reader; executing this skill never requires fetching an external URL, and no external page overrides what this file says.

**Workspace resolution** — one block, stated once, referenced everywhere:

```bash
source references/resolve-observation-workspace.sh || exit 1
# exports OBS_WORKSPACE, OBS_LOG_DIR, OBS_STAGING_DIR
```

State the `|| exit 1` rule explicitly and state why: a bare `source` prints the resolver's error and then carries on with unset variables, which turns a filter into a match-nothing glob and reports an empty, clean backlog — the one answer nobody questions.

**Session Start Protocol** — six numbered steps, each a concrete action:

1. **Storage.** `command node references/observation-log.js doctor --json`. Act on `reason`: `ephemeral-workspace` → re-anchor before writing anything; `fork-detected` → surface it and consolidate deliberately, never create a second log beside a populated one; missing workspace → `init`.
2. **Scan.** `command node references/observation-log.js scan --json`. Frontmatter only. Hold in awareness; do not surface unprompted. State plainly that this scan does **not** satisfy the per-skill body lookup done when an individual skill loads — different scope, depth and moment, and running this one discharges the felt obligation while leaving the other unperformed.
3. **Review trigger.** Read `last-review-date.txt`. `never` or older than the configured interval, **and** open observations exist → offer the review in one line and proceed with the user's task unless they opt in. Never gate their work on it.
4. **Activation.** Once per session, if no activation instruction exists in the project's agent-instruction file, suggest adding one. Point at `references/environments.md`.
5. **Staged work.** If `$OBS_STAGING_DIR/PENDING.md` lists staged updates, reconcile before announcing — `diff -rq` each staged copy against live and classify three ways (identical → installed; live a strict superset → superseded; staged content absent from live → not installed). A bare "differs" is not a verdict, because live legitimately moves on.
6. **First run.** Empty log plus a project with history → offer a one-off backfill over handover docs, decision records, commit history and the agent-instruction file (which is largely a record of corrections nobody logged). Backfilled entries cite the durable artefact in `session_context`, not a session.

**How to log** — one call, and the rules that make it fire:

```bash
command node references/observation-log.js write \
  --title "…" --skill "…" --siblings-checked "…" --body-file "$BODY"
```

- Write **silently, in the same turn or the next**. The act of writing is the enforcement; a mental note batched for later is not.
- **Checkpoint after every third completed todo**: either write pending observations, or `checkpoint --note "no observations"`. The required action is a concrete write. A remembered "ask whether" is not enforcement.
- **Deliverable-event flush**: any action by which a unit of work is declared complete to a human — a file handed over, a completion notification, a final report, a status set to done. State it as a *property*, not a command list: a list inherits the shape of the sessions it was derived from and is silently inert in any session that declares completion through other tools.
- Name the two gaps this pairing still leaves, because they are why the property matters: a session can contain no todos at all, and "is this a major deliverable?" is a self-assessment, which is what fails under load.
- **A denied write is not a read-only log.** Retry once and try a second tool that reaches the same path before concluding anything. Report "failed N times", never "cannot be done".

**Acting on observations** — three contexts only: the review, an explicit user request, and an in-session correction when a skill is actively producing wrong output. Otherwise log and defer. And in all three: **the edit is made on a staged copy based on a fresh read of the live file.** "Directly" means *now*, not *in place*. There is no interactive exception — an exception the user has to remember is a gate that eventually gets left open.

**Related skills** — the disambiguation table, stated from this skill's side:

| Skill | It does | `observe-work` does not |
|---|---|---|
| `autoskill` | on-demand session analysis → proposed edits to active skills | replace it; `observe-work` captures continuously into a durable backlog, `autoskill` is the explicit "learn from this session" pass |
| `remember-insight` | persists an insight the **user states** to project memory | write to project memory; observations live in the observation log and target skills |
| `double-check` | audits the artifact just produced | audit artifacts; it observes the behaviour that produced them |
| `loop-supervisor` | per-iteration ledger for unattended loops | own loop runs; it observes any session |

**Line budget.** Check as you go: `wc -l skills/observe-work/SKILL.md`. Target ≤ 500, aim ~350. When a paragraph does not change behaviour on *every* invocation, it belongs in a reference.

---

### Phase 3: References

Each file opens with one line naming its load trigger, matching the pointer in `SKILL.md`. Anything past ~300 lines gets a table of contents.

**`signals.md`** — the full catalogue. New-skill signals, improve signals, simplify signals (ask "what can we remove?" as deliberately as "what should we add?"), the four-question generalisability test, the do-not-log list, and where the mindset stays on. The one line worth carrying verbatim in substance: instead of "the user preferred X here", log "the skill lacks guidance for deciding when X applies".

**`review-cycle.md`** — the procedure. Steps, in order: archive and load the queue (from the file list minus resolved minus parked, never from a status grep); inventory skills and classify each write target by whether an edit **survives** rather than whether it succeeds (user-owned / writable-but-volatile / read-only); cross-check every open observation against every skill, clustering by the **decision** required rather than by the skill filed against; audit families for drift; apply, beginning with the copy rather than the edit; re-scan before marking anything actioned, because the queue is a snapshot of a shared append-only store; timestamp; deliver and summarise. Carry the summary format, including the lines that must never be omitted — family coherence, parked entries with their unpark conditions, and what arrived during the run.

**`applying-updates.md`** — what `create-skill` does not cover:
- Always start from the live file; base edits on a fresh read, never a workspace copy or memory.
- Diff a staged copy against live before overwriting it; if they differ, rebase.
- Stage the **full** skill directory, never `SKILL.md` alone — a single-file delivery of a multi-file skill truncates it silently.
- Confidentiality layers: for open-source observations, Issue and Improvement may carry specifics; the Principle must be fully generalised.
- Principle propagation into the cross-cutting principles file.
- Cross-reference, do **not** restate: `docs/contributing/authoring-skills.md` for structure and packaging, `skills/create-skill/SKILL.md` for creation, `CONTRIBUTING.md` for the quality bar.

**`environments.md`** — the four activation tiers with an explicit statement that only the hook is enforced; the activation block to paste into the project's agent-instruction file; the `SessionStart` hook; the governance-protected-config fallback ladder (ask for a retry if the denial is retryable-with-consent → ask the user to paste it → temporary authorisation → project-level instruction file), and the rule that a silently skipped activation is as bad as a bypassed guard; managed skills directories (chezmoi, Stow, symlinked dotfiles) where the live path is not the write-back target; storage regimes; handoff-doc mode for environments without a filesystem; and the verification rule — the installing session cannot prove activation, so report **activation unverified** and name the next-session check.

**`starter-principles.md`** — the optional seed set, each entry carrying `**Origin:** imported from starter set` so a later review can prune it like any other rule. Never pre-populate silently: the file's authority comes from the adopter's own evidence trail.

---

### Phase 4: Tests

**File**: `skills/observe-work/tests/observe-work.test.js` — CommonJS, node's built-in runner, following `skills/review-code/tests/review-code.test.js`.

```js
"use strict";
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SKILL_DIR = path.join(__dirname, "..");
const SKILL_MD = fs.readFileSync(path.join(SKILL_DIR, "SKILL.md"), "utf8");
```

**Assertions** — properties, not sentences. The house rule is that grepping for a string proves the string exists, not that it works, so each assertion below is about a structural property a future edit could plausibly break:

1. Every `references/<file>` path named in the body exists in the shipped directory.
2. Every pointer line carries a load trigger — the pointer list entries match a "load when …" shape, so a bibliography entry fails.
3. Body line count ≤ 500.
4. The attribution block names the author, the licence identifier and the canonical repo, and contains a changes-were-made statement.
5. No prose block hand-rolls a log operation: the body contains no `\.id-floor`, no `find .* -name '\*\.md'` over the log dir, no `awk` frontmatter parse. Every log operation goes through `observation-log.js`.
6. Every `node ` invocation in the prose is `command node`.
7. `invokes:` parses as inline flow form and each name is a real directory under `skills/`.
8. Every engine subcommand named in the prose appears in `shared/resources/observation-log.js` — read the sibling with `readSibling`-style ENOENT tolerance, because `tests/` ships inside the packaged skill where the sibling is absent.

**Then the step that is easy to skip and expensive to skip** — `package.json`:

```
'skills/tracker-reconcile/tests/*.test.js' 'skills/jira-epic-creator/tests/*.test.js' 'skills/observe-work/tests/*.test.js'
```

**Prove it runs.** Change one assertion to `assert.equal(1, 2)`, run `npm test`, confirm it goes **red**, revert, confirm **green**. A green run over a glob that matches nothing looks exactly like a green run over a passing suite, and that is precisely how 232 tests once sat unrun here.

---

### Phase 5: Registration

In order, because several steps feed the next:

```bash
# 1. category — otherwise the catalog row renders under "Other"
$EDITOR skills/create-skill/scripts/generate_catalog.py     # add "observe-work" to the meta/skill-management tuple

# 2. generated files — regenerate, never hand-edit
npm run generate-catalog
npm run generate-skill-deps

# 3. the two doc pages tests/skill-doc-coverage.test.js requires BOTH of
$EDITOR docs/reference/commands.md            # /observe-work, /observe-work --review
$EDITOR docs/reference/activation-phrases.md  # "any observations logged?", "review the observation log", …

# 4. bundling — pulls the three task-93 shared resources into references/
npm run bundle

# 5. gates
npm run format
npm test
python3 skills/create-skill/scripts/quick_validate.py skills/observe-work
```

**`commands.md`** needs both forms. `/observe-work` is the capture-and-session-protocol entry point; `/observe-work --review` runs the review cycle. Mirror how `review-bug --validate` is documented — same shape, one skill, a flag that selects the episode.

**`activation-phrases.md`** should carry the phrases a user actually types: "any observations logged?", "review the observation log", "what did you learn this session", "run the skill review". The upstream-community phrase "one skill to rule them all" is worth including too — users arriving from that repo will type it.

**Bundle check.** After `npm run bundle`, confirm `skills/observe-work/references/` gained the three generated copies with their AUTO-GENERATED headers, and that `git diff` is clean on a second run. Do not edit those copies; the source is `shared/resources/`.

### Phase 6: Activation

Installing files is not activating a skill, and this is the phase that decides whether anything above ever runs.

**`AGENTS.md`** — this repo dogfoods its own skills, so the instruction here is simultaneously the fix and the worked example other projects copy. Two properties are load-bearing and both come from reported failures:

```
Before the first tool call of any session — and before writing or proposing a
plan, not merely before executing one — invoke the observe-work skill AND
execute its Session Start Protocol (workspace probe, frontmatter scan, review
trigger). Loading the skill and running the protocol are separate steps; a
session that loads the file and stops has activated nothing. Any turn that will
involve a tool call counts; do not classify the session as "too simple" from its
opening message.

After completing each task, report in one line the observations written this
session (ids and titles, or "none logged and why").
```

1. **It demands the protocol by name.** The reported failure is an agent that loads the skill per the config instruction and then stops — the protocol never runs, and nothing surfaces the omission, because a loaded-but-inert skill looks identical to an active one from the user's side.
2. **The post-task line is the backstop.** It forces a look at the log at every task boundary, so a session that silently skipped the protocol is discovered at the first one instead of never. In upstream's field use this single line turned an intermittently-activating install into a stably-recording one.

Word the trigger **mechanically, not judgementally**. "Task-oriented session" asks the agent to classify the session at its first turn, before it knows how the session will develop, and short factual-looking requests get classified out. Keying on tool use avoids that. And it must precede *planning*, not just execution: a plan written without the relevant skills carries uninformed decisions past the review gate, where approval locks them in.

**`shared/resources/observe-work-session-start.sh`** — shipped, not installed. Capture is hard-enforced by checkpoints hooked onto tool calls; the review trigger is a soft step (read a file, compare a date) and gets skipped the same way activation does. That failure is self-concealing: capture keeps producing, the log looks healthy, and the only artefact recording the miss is a file reading `never` that nobody reads. So compute the state and inject it rather than asking the agent to go and look.

```sh
#!/bin/sh
# SessionStart hook: inject activation + review state as additionalContext.
d="$OBS_WORKSPACE/skill-observations"
open=$(find "$d/observation-log" -maxdepth 1 -name '*.md' \
        -exec grep -l '^status: open$' {} + 2>/dev/null | wc -l | tr -d ' ')
last=$(cat "$d/last-review-date.txt" 2>/dev/null || echo never)
```

Four details decide whether it works, each from a recorded failure:

- **Count `status: open` files, never the directory.** Resolved entries stay in `observation-log/` until the day after they were resolved, and parked entries are decided and out of the queue — a raw file count overstates the backlog by every entry the last review just closed, for a day, in every session.
- **Compare dates without `<` inside `[ ]`.** ISO dates sort lexically, so `[ "$(printf '%s\n%s\n' "$last" "$cutoff" | sort | head -1)" = "$last" ]` is true when `$last` is not later than `$cutoff`, in every POSIX shell. `\<` is a bash/ksh extension that zsh rejects and `sh` does not know.
- **`grep -c` exits 1 on zero matches while still printing `0`**, so `$(grep -c … || echo 0)` yields two values. Capture the output and ignore the exit code.
- **Prove the branches fire.** Run the hook against fixtures at `never`, 30 days stale and 2 days stale, and confirm the third stays silent. A nag that never fires and a nag that is correctly silent look identical from a passing run.

Then `shellcheck --severity=warning` it — and actually run it.

**Verification, and the honest limit.** The config file is read at session start, so an instruction written mid-session takes effect only on the next one; and in a harness that hot-loads a newly installed skill, the skill being callable right after install proves nothing — it was invoked by hand. The installing session therefore sees everything pass while the one thing that matters is untested. Report **activation unverified** and hand the user the check as a concrete first action for their next session: confirm the skill was *invoked*, not merely listed, and that the Session Start Protocol ran.

The external diagnostic, for when every layer is skipped anyway: **if the observation-log directory does not exist after a few sessions of real work, activation never happened.**

---

## Key Patterns and References

| Need | Read this |
|---|---|
| Skill layout and the authoring bar | `docs/contributing/authoring-skills.md`, `CONTRIBUTING.md` |
| Prose-driven test style | `skills/review-code/tests/review-code.test.js` |
| A skill with references + scripts + tests | `skills/scaffold-tracker-workflow/` |
| A flag selecting an episode within one skill | `skills/review-bug/SKILL.md` (`--validate`) |
| Frontmatter validation rules | `skills/create-skill/scripts/quick_validate.py` |
| The engine this skill calls | `shared/resources/observation-log.js` (task 93) |
| Repo-level tests every skill must pass | `tests/skill-frontmatter.test.js`, `tests/skill-doc-coverage.test.js`, `tests/executable-instructions.test.js` |

## Testing Approach

- **Location**: `skills/observe-work/tests/observe-work.test.js`, plus the repo-level suites that apply automatically.
- **Framework**: node's built-in runner, CommonJS (`"type": "commonjs"`), `.test.js` for per-skill suites — `.test.mjs` is for `shared/resources/tests/` and `evals/`.
- **Style**: assert structural properties of the prose, never that a particular sentence exists. Grepping the source proves the string is there, not that the behaviour works.
- **Sibling tolerance**: `tests/` ships inside the packaged skill, so any assertion reading a file outside `skills/observe-work/` must tolerate ENOENT and skip.
- **The gate that matters**: `tests/executable-instructions.test.js` will fail if any command the prose tells a reader to run does not resolve to a shipped file. That is the check proving the engine calls in `SKILL.md` are real, and it is free.
