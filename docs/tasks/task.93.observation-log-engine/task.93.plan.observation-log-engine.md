---
id: task.93.plan
title: "Implementation Plan: Observation-log engine, workspace resolver and contract"
type: plan
task-ref: task.93.observation-log-engine.md
---

# Implementation Plan: Observation-log engine, workspace resolver and contract

> Requirements and success criteria: [task.93.observation-log-engine.md](task.93.observation-log-engine.md)

## Overview

Write the contract first, then the resolver, then the engine reads, then the engine writes, then the proofs. The ordering is deliberate: the contract is what task 94's prose will be written against, and the write path is the one whose guards matter, so it goes last when the read path already exists to verify it.

## Phase-by-Phase Implementation Guide

### Phase 1: Contract first

**Files to create:**
- `shared/resources/observation-log-contract.md` — the canonical spec

**Shape to follow:** `shared/resources/tracker-comment-contract.md`. Same register: what the thing is, the one-call rule, the vocabulary, the rules that are absolute and why.

**Required content, in order:**

1. **Attribution block, at the top.** CC BY 4.0 obliges credit and a statement that changes were made:

   > The methodology in this document is adapted from **task-observer** ("One Skill to Rule Them All") by **Eoghan Henn / [rebelytics.com](https://rebelytics.com)**, licensed CC BY 4.0. Canonical source: <https://github.com/rebelytics/one-skill-to-rule-them-all>. **Changes were made**: the storage mechanism is a rewrite — the shell snippets that upstream embeds in prose are replaced by `observation-log.js`, path pinning is replaced by `resolve-observation-workspace.sh`, and the pre-3.0 log-migration path is omitted.

2. **Layout** — the directory tree from the task doc's Target Architecture.

3. **Frontmatter field table** — one row per field:

   | Field | Meaning |
   |---|---|
   | `id` | Integer; matches the `NNNN-` filename prefix. Never reused. |
   | `title` | Short descriptive title. |
   | `status` | `open` \| `actioned` \| `declined` \| `superseded` \| `parked`. **Missing is read as `open`, never as nonexistent.** |
   | `parked_until` | Mandatory when `status: parked`, empty otherwise. One line naming the condition, phrased so a later review can answer yes or no. |
   | `type` | `open-source` \| `internal`. |
   | `skill` | **Always a list**, even with one entry. First entry is primary. May be empty. |
   | `proposes_skill` | List of new-skill candidates by working name. Independent of `skill`. |
   | `siblings_checked` | **Mandatory, never blank.** Family name, members evaluated, verdict. The literal `none` only where the target belongs to no family. |
   | `area`, `date`, `session_context` | Context fields. |
   | `resolved` | Resolution date. **Archival is gated on it.** |
   | `resolution` | What was done, or why declined. |
   | `reference` | Optional path to durable saved evidence — must outlive the session and be resolvable by a different one. |

4. **The id rule.** Highest of three values plus one: highest prefix in `observation-log/`, highest in `archive/`, and the number in `archive/.id-floor`. The floor exists so the counter cannot restart at 1 when every entry has been archived.

5. **The archival gate.** A resolved status (`actioned`/`declined`/`superseded`) **and** a `resolved:` date strictly before today. The grace period lives in the file, never in session memory, which is what makes it hold across parallel sessions. **`parked` is exempt** — it satisfies neither half of the gate and must never be stamped with a `resolved:` date to tidy it away.

6. **Skill families and `siblings_checked`.** Why the field exists, stated plainly: the two states of a one-entry `skill:` list — siblings evaluated and correctly excluded, versus siblings never considered — are byte-identical, so nothing downstream can distinguish them. Recording the judgement does not improve it; it makes its *absence* visible, which is the only property that lets anything enforce it.

7. **The carrier pattern.** When one session acts on a subset of a multi-skill observation's `skill:` list, both plain moves lie. Mark the original `actioned` with a `resolution:` naming which portions were applied, and log a carrier observation holding the remainder with only the outstanding skills in its `skill:` list and enough substance to stand alone — the original is about to archive, so a bare pointer is not enough.

8. **Version-control hazards.** `git checkout --`, `git stash`, `git reset --hard`, and above all `git clean -fd` destroy observation files. A just-written observation is *untracked*, and `git clean` exists to delete exactly those. Prefer committing pending observations over reverting them; scope any dirty-tree guard to exclude the workspace.

**Cross-reference to add later:** `AGENTS.md` gets its `## Observation Log` section in Phase 5, not here — the section should describe what shipped.

---

### Phase 2: The resolver

**Files to create:**
- `shared/resources/resolve-observation-workspace.sh`

**Pattern to copy:** `shared/resources/resolve-platform.sh` — read it first for the house style of `read-config.sh` usage, variable export, and the non-zero-on-unrecognised contract.

**Resolver order, implemented in this precedence:**

```sh
# 1. explicit config
#    skills-config.yaml → observations.workspace
# 2. environment
#    $OBS_WORKSPACE
# 3. project identity (default)
#    the derivation skills/remember-insight already uses
```

**Author the project-identity derivation here — there is nothing to reuse.** `skills/remember-insight/SKILL.md` *documents* the pattern `<backup-root>/.claude/projects/<encoded-project-path>/memory/` and says the directory "is defined in your system context (auto-memory section)". That skill directory holds one file and no code; nothing in this repo computes `<encoded-project-path>`. So this resolver is the **first** implementation of the convention in this repo, not the second: encode by replacing path separators with hyphens and preserving the leading separator as a leading hyphen (`/Users/x/Projects/agent-skills` → `-Users-x-Projects-agent-skills`).

Write it once, in this file, and assert it in Phase 5 against a **literal** expected string. A test that recomputes the expectation the way the resolver does proves nothing — it is two derivations that drift, which is the silent-fork failure `doctor` exists to catch, wearing a test's clothes.

**Exports:**

```sh
export OBS_WORKSPACE      # the root
export OBS_LOG_DIR        # $OBS_WORKSPACE/skill-observations/observation-log
export OBS_STAGING_DIR    # $OBS_WORKSPACE/skill-updates
```

Export the derived paths, not just the root. Upstream records the failure directly: pinning only the log directory left the staging root and manifest to be re-derived per session, and parallel sessions resolved them plausibly and differently — three writers, two staging roots, one manifest that saw half the work.

**Ephemeral refusal.** Before exporting, reject a resolved path under `.claude/worktrees/`, under `/tmp`, or inside a `git rev-parse --git-common-dir` worktree that differs from the main checkout. Print the reason and return non-zero. State written to an ephemeral checkout is torn down with it.

**Call-site contract, to be stated in the file's header comment:**

```sh
source shared/resources/resolve-observation-workspace.sh || exit 1
```

The `|| exit 1` is not decoration: a bare `source` prints the error and then carries on with unset variables, which is the failure mode this repo already documents for `resolve-platform.sh`.

**Then run it:** `shellcheck --severity=warning shared/resources/resolve-observation-workspace.sh`.

---

### Phase 3: Engine — reads

**Files to create:**
- `shared/resources/observation-log.js`

**Header comment**: transcribe the structure of `tracker-comment.js`'s header — what the file is, why it is a peer, usage, exit codes, `reason` vocabulary, and what is deliberately *not* in the vocabulary.

**Exit codes** (transcribed so the `|| echo "⚠️ …"` subshell idiom keeps working):

```
0  ok, already, empty, dry-run — and any unhandled throw
1  a guard tripped: scan-broken, id-broken, collision, ephemeral-workspace, fork-detected
2  usage error (unknown subcommand, unknown flag, missing required argument)
```

**`reason` vocabulary** — every value reachable from at least one test:

```
ok                    the operation completed
already               nothing to do; the state was already correct
empty                 the log is genuinely empty (distinct from scan-broken)
scan-broken           files present, zero headers parsed
id-broken             log non-empty, no ids extracted
collision             the target path already exists
ephemeral-workspace   the resolved anchor is torn down with its checkout
fork-detected         a second skill-observations/ exists at another plausible anchor
invalid-frontmatter   a file's header could not be parsed
parked-without-condition   status: parked with no parked_until
dry-run               --dry-run; nothing read, nothing written
```

**The output discipline, at every exit point:**

```js
// process.exitCode + return, never process.exit(): stdio is ASYNCHRONOUS on a
// pipe and process.exit() tears the process down before the buffer drains,
// truncating output at ~64KB. See bug.3.stdout-truncation-on-exit and
// skills/develop-next/scripts/select-next.mjs:1629.
process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
process.exitCode = code;
return;
```

Note that `tracker-comment.js:831` ends on `process.exit(r.exitCode)`. Do **not** transcribe that line.

**`init`** — create `observation-log/`, `observation-log/archive/`, `cross-cutting-principles.md`, `skill-families.md`, `checkpoints.log`, and `last-review-date.txt` containing the literal string `never`. Never write a date at setup: a date means a review actually ran, and seeding one suppresses the first review forever.

**`scan`** — read only the block between the first two `---` lines of each file. The guard, expressed as two counts derived by different means:

```js
const files   = listMarkdown(logDir);              // the enumeration
const parsed  = files.filter(hasFrontmatterHeader); // the parse
if (files.length > 0 && parsed.length === 0) {
  return emit({ reason: "scan-broken", files: files.length, parsed: 0 }, 1);
}
```

Keep the count out of the stream it guards — upstream records a real failure where a counter incremented inside the printing loop lived in a subshell once the loop was piped, and the guard then reported "0 parsed" directly under a screen of correct output.

**`queue`** — the work queue is `files − resolved − parked`, derived from the directory listing, never from a `grep 'status: open'`. A grep on an optional field silently drops every file missing that field. Emit the reconciliation assertion in the payload:

```js
{ reason: "ok", total: N, open: [...], parked: [...], resolved: [...],
  statusless: [...],           // named explicitly, and counted as OPEN
  reconciled: total === open.length + parked.length + resolved.length }
```

**`doctor`** — four checks, each with its own `reason` when it fails: workspace exists; anchor is not ephemeral; no second `skill-observations/` at another plausible anchor; an activation instruction is present in the project's agent-instruction file.

---

### Phase 4: Engine — writes

**`next-id`** — the archival sweep runs *first, inside this function*, so it cannot be skipped by any write path:

```js
function nextId(logDir) {
  sweepResolved(logDir);                        // archival rides inside id derivation
  const ids = [
    ...prefixes(logDir),                        // active
    ...prefixes(path.join(logDir, "archive")),  // archived
    readIdFloor(logDir),                        // the floor
  ];
  const hi = Math.max(0, ...ids);               // parseInt(s, 10) upstream — no octal
  if (hi === 0 && listMarkdown(logDir).length > 0) {
    return { reason: "id-broken" };             // empty result over a populated log
  }
  writeIdFloor(logDir, hi + 1);
  return { id: hi + 1 };
}
```

`parseInt(prefix, 10)` is the whole octal fix. Do not add a zero-stripping step; it is unnecessary in JavaScript and its presence would imply the hazard still exists.

**`write`** — the single call that makes every guard unskippable:

```js
// 1. sweep + derive (above)     2. build the path from the id just derived
// 3. create with `wx` — fails if the path exists, never truncates
try { fd = fs.openSync(target, "wx"); }
catch (e) {
  if (e.code === "EEXIST") { /* re-derive ONCE, then emit reason: "collision" */ }
}
// 4. write frontmatter + body only after the create succeeds
```

**Deliberately omit a `--id` flag.** A batch that pre-computes a base and hardcodes sequential numbers collapses N independent max-checks into one stale read; upstream records a hardcoded id colliding with one a parallel review issued between the check and the write. The absence of the flag is the enforcement — prose asking the author to re-derive per file is not.

Required arguments: `--title`, `--skill` (repeatable, always serialised as a list), `--siblings-checked`, `--body-file`. Reject an empty `--siblings-checked` at the CLI boundary rather than defaulting it to `none`; the field's entire value is that its absence is visible.

`--body-file`, never an inline `--body`: bodies carry backticks, `$(…)` and newlines, exactly as `tracker-comment.js` requires for the same reason.

**`set-status`** — re-read the single file immediately before editing it; a parallel review may have resolved it. Mutate only `status`, `parked_until`, `resolved`, `resolution`. Validation:

```js
if (status === "parked" && !parkedUntil)  return emit({ reason: "parked-without-condition" }, 1);
if (RESOLVED_SET.has(status) && !resolved) resolved = today();   // gate archival correctly
```

**`archive`** — the standalone sweep, same predicate as the embedded one:

```js
const isStale = RESOLVED_SET.has(fm.status)
             && ISO_DATE.test(fm.resolved)
             && fm.resolved < today();      // ISO dates compare lexically; strictly before
```

`parked` is not in `RESOLVED_SET`, which is what exempts it. A resolved file with an unreadable `resolved:` date is **skipped**, not archived — the date is repaired separately and deliberately.

**`checkpoint`** — append one line to `checkpoints.log`. Append-only; never rewrite the file.

**`families [--audit]`** — parse `skill-families.md` into `{ name, members, coherence, shared, memberSpecific }`. `--audit` greps each member for each shared rule and reports gaps, judged against `memberSpecific` before being called drift.

---

### Phase 5: Tests and registration

**Files to create:**
- `shared/resources/tests/observation-log.test.mjs`

The `shared/resources/tests/*.test.mjs` glob already exists in `package.json`, so no `package.json` edit is needed in this task. (Task 94's `skills/observe-work/tests/*.test.js` **does** need one — that trap has cost this repo 232 silently unrun tests before.)

**Test helper**: build each temp workspace under the OS temp dir, and always invoke the engine as `command node` if a test shells out.

**The mutation proof, per guard.** For each of the guards below, the procedure is: revert the guard in the source, run the named test, confirm it goes **red**, restore the guard, confirm **green**. Record the result in the implementation report. A guard whose test stays green when the guard is removed is not testing the guard.

| Guard | Mutation | Test that must go red |
|---|---|---|
| scan independent count | delete the `files.length > 0 && parsed.length === 0` branch | `scan reports scan-broken when headers are unparseable` |
| base-10 id parse | change `parseInt(p, 10)` to `parseInt(p)` | `next-id over a log containing 0108 returns 109` |
| `.id-floor` as third input | drop the floor from the `ids` array | `id counter does not restart at 1 when the active dir is empty` |
| folded archival sweep | remove `sweepResolved()` from `nextId` | `next-id archives a stale resolved file without archive being called` |
| `wx` create | change `"wx"` to `"w"` | `write refuses an existing path rather than truncating it` |
| parked validation | drop the `parked-without-condition` branch | `set-status parked without parked_until is rejected` |
| parked archival exemption | add `parked` to `RESOLVED_SET` | `archive leaves a parked entry regardless of age` |
| queue statusless handling | derive the queue from a `status: open` filter | `queue counts a statusless file as OPEN and names it in the delta` |
| ephemeral refusal | remove the worktree check from the resolver | `resolver refuses an anchor under .claude/worktrees` |

**The pipe-truncation test** — the one that must not be a fixed-size payload:

```js
// Size the payload from the pipe buffer, not a constant. A fixed 64KB assumption
// is what made an earlier premise test in this repo load-flaky; the payload must
// be a large multiple of the actual buffer so the assertion is about draining,
// not about timing.
```

Generate ~500 synthetic observations, run `scan --json` through a real pipe (not a file redirect — a redirect hides the bug), and assert `JSON.parse` succeeds on the whole output.

**`AGENTS.md`** — add the section in the shape of the existing contract sections:

```markdown
## Observation Log

Canonical spec: [`shared/resources/observation-log-contract.md`](./shared/resources/observation-log-contract.md).
Engine: [`shared/resources/observation-log.js`](./shared/resources/observation-log.js) (pure, tracker-agnostic,
same exit codes and `--json` `reason` contract as `tracker-comment.js`). TL;DR: the observation log is a
**directory** — one Markdown file per observation, YAML frontmatter plus an Issue → Improvement → Principle
body — and every read and write of it is one CLI call. Never hand-roll the id: `write` folds the archival
sweep and the collision check into the same call, and there is deliberately no `--id` flag. `parked` means
decided-but-blocked: it leaves the work queue, requires `parked_until:`, and **never archives**. The workspace
is resolved once by [`shared/resources/resolve-observation-workspace.sh`](./shared/resources/resolve-observation-workspace.sh),
sourced as `source … || exit 1` — never derived from the cwd.
```

**Final gate:** `npm run format`, `npm test`, `shellcheck --severity=warning`.

## Key Patterns and References

| Need | Read this |
|---|---|
| CLI header, exit codes, `reason` contract | `shared/resources/tracker-comment.js` (lines 1–60) |
| What *not* to copy from it | its line 831 — `process.exit()` after output |
| Correct exit discipline | `skills/develop-next/scripts/select-next.mjs:1629` |
| Resolver order and guard idiom | `shared/resources/resolve-platform.sh`, `shared/resources/platform-detection.md` |
| Contract-doc register | `shared/resources/tracker-comment-contract.md` |
| Project-identity path **convention** (documented, not implemented — author it here) | `skills/remember-insight/SKILL.md` |
| Node test-runner conventions | `shared/resources/tests/*.test.mjs` |

## Testing Approach

- **Location**: `shared/resources/tests/observation-log.test.mjs` — already globbed by `npm test`.
- **Framework**: node's built-in runner (`node:test`, `node:assert/strict`), no dependency.
- **Isolation**: one temp workspace per test; never touch the developer's real workspace.
- **Fixtures**: build the log programmatically inside each test rather than committing fixture directories — the entries under test are one-line frontmatter blocks, and a committed fixture tree would need `.gitignore` negation to survive, which this repo has been bitten by before.
- **The standard**: a guard without a recorded mutation proof is not done.
