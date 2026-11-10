# Implementation Report: QA snippet classifier refuses indirect evaluation

**Task**: `task.293.qa-snippet-classifier-indirect-evaluation.md`
**Run Number**: 1
**Started**: 2026-11-10 00:00
**Status**: In Progress

---

## Summary

Close the QA snippet classifier's indirect-evaluation holes (T292-CR-1..3) in `qa-execute-snippets.mjs`, with reproduced tests, differential rows and mutation proofs. Run by `/develop-next` (autonomous, `--defaults`).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.293.*` exists in git                             | Branch created at `98774e58` | —                    | 2026-11-10T10:02Z |
| 2. review-task             | ✅ Done | `task.293.review.{N}.{name}.md` exists (or skip logged)               | Review 1: 8/10 READY TO IMPLEMENT; 3 important fixes applied; status promoted | —                    | 2026-11-10T10:20Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 1 iteration; ci:fast green (8346 tests, 0 fail) | —                    | 2026-11-10T10:26Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #870 → develop; no issue linked, no comment | —                    | 2026-11-10T10:28Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.293.qa.{N}.*.md`; `task.293.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.293.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-10

- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (risk absent, 3 phases, so lite is not eligible)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline, no Explore subagents dispatched. The task has no `github_issue`, so tracker steps are skipped.

### Step 2 — Review

- review-task invoked; output format Comprehensive report; Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" (pipeline autonomous). Review report: `task.293.review.1.qa-snippet-classifier-indirect-evaluation.md` (8/10).
- Pre-pass Explore agents (architecture, codebase) not dispatched; done inline. Independent review did not run.

### Step 3 — Develop

- Plan file found: `task.293.plan.qa-snippet-classifier-indirect-evaluation.md` — included as implementation context.
- Pre-develop surface map: 5 files in `shared/resources` and `scripts` (engine, test, differential generator, detection doc, CHANGELOG) — built inline during review.
- Step 3 inline — /develop not invoked: plan names every hunk and the surface map was already walked in the review.
- Planned/Draft gate auto-answered: Yes — review-task validation in Step 2 is sufficient.
- Design decision: the check sits after the helper rule so pinned `helper call with …` reasons stay; arithmetic-use is closed by refusing the assignment of a quoted substitution literal (no value tracking), so the plan's fourth Phase 2 bullet is met by the second.
- First version was quadratic (a per-quote slice/rescan); the existing 20000-deep nesting test went red at 4.6 s under load. Rewritten linear (difference arrays, global scans + binary search); 20000-deep nest 206 ms.
- Mutation proofs: six, one per refusal branch, each red on `task.293 each refusal is held on an input where it alone decides`. The first PS4 table row was *not* red when its rule was removed (the quoted-literal rule also caught it), so decider rows were added where each refusal decides alone.
- Docs scan (`node scripts/qa-snippets-docscan.mjs --time --json`, 5 runs, load 6–8): baseline 257 runnable of 3448 blocks; 2 newly refused, 0 newly runnable. msBase [405,391,381,407,377] median 391; msNow [424,457,392,482,394] median 424 (+8.4%, within 10%; an earlier lighter-load set was +2.8%).
- Differential slice (`--atoms all --seed 1 --count 4000`, 5 runs): 3398–3943 ms, median 3472 ms, 0 writes. `--atoms indirect --seed 1 --count 3000`: 0 writes on the new engine, 10 on the previous one.
- Rule slip: appended the new tests with a quoted heredoc (`cat >> … <<'EOF'`) instead of the Write/Edit tool. It held (delimiter absent from payload), but it is against the standing rule.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 2 high — a value assembled from pieces still evaluates; a quoted substitution as an array subscript inside `${a[...]}` still evaluates (both reproduced by QA under bash 5.3). Advisory: CR-3 (documented unseen shape), CR-4/CR-5 over-refusal.
**HIGH findings**: 2
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

QA Cycle 1 fix summary (qa-fix, inline — the findings ingester and the codebase mapper were not dispatched; the two findings were reproduced in-session):
- T293-QA-1 closed: an assignment whose value holds an expansion inside `name[...]` is refused (`EXPANDED_ASSIGNMENT`). The first version also required an arithmetic read; the random differential then found `read -r "$x"` slipping past it (1 write per 20000), so the read condition was dropped. A broader first version (any expanded assignment + arithmetic read) over-refused the shipped helpers `qa-cycle.sh` and others, which several existing tests pin as runnable, so the rule was narrowed to a `name[` with an expansion inside the brackets.
- T293-QA-2 closed: a quoted literal substitution directly after `[` is refused.
- Not closed, recorded as unseen shapes (docs and CHANGELOG): a value laundered through command output (CR-3), and a `[` or `$` that itself arrives by expansion. CR-4/CR-5 (over-refusal of printed literals, `grep PS1=`) left advisory.
- Evidence: 383/383 in the engine test file; two new mutations (subscript rule, assembled-value rule) each red on the decider test; differential `--atoms indirect` seeds 1-4 at 20000: 0 writes (the cycle-1 engine writes 10 at 6000 once the whole-shape atoms were added, so the instrument is not blind); docs scan still 0 newly runnable / 2 newly refused; `CI=true npm run ci:fast` green (8346 tests, 0 fail).
- Slips: QA's mutation spot check used `sed -i` once, and an earlier scratch probe was written with a quoted heredoc; both against the standing rules, neither left residue.
Narrowing residue: not applicable (first fix cycle).

### QA Cycle 2 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 2 high — a bare word joined to a quoted literal (`x=a'[$(cmd)]'`) and a literal piped into a later `read`; both reproduced by QA under bash 5.3 with clean controls. Cycle 1's two fixes held.
**HIGH findings**: 2
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

QA Cycle 2 fix summary (qa-fix, inline; the findings ingester was not dispatched, both findings were reproduced in-session):
- T293-QA-3 and T293-QA-4 closed together by replacing the per-segment and character-before-the-quote tests with one block-level rule: a quoted substitution in a block that also holds a live evaluating word or an arithmetic read is refused. A subscript directly after `[` keeps its own rule. A quoted-delimiter here-document body counts as a literal (found by my own probe after the reviewer's two: `read x <<'EOF'`); an unquoted one does not, because its `$(…)` is a `subst` token the other rules judge. A first version without that distinction refused six shipped helpers that tests pin as runnable.
- Cost: the first block-level version measured +13% on the docs scan (bound 10%). Each check now runs only when its trigger text is present; final median +0.5% over 7 runs (0.96 to 1.10), with 0 newly runnable and 1 newly refused (this task's own plan document, which quotes the shapes). The earlier cycle-1 count of 2 newly refused is now 1, because the assigned-literal rule was removed.
- Evidence: 383/383 engine tests; mutations: block rule off, arithmetic-read detector off, here-document loop off, each red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, cycle-1 engine writes 10 at 6000 on the same atoms; `--atoms all` 0 writes; `CI=true npm run ci:fast` 8346 tests, 0 fail.
- Not closed (recorded in the docs): a value laundered through `printf` octal escapes (`x=$(printf 'a[\044(cmd)]')`) and a `[` or `$` that itself arrives by expansion. A printed literal next to a test or loop is now over-refused, by design (`echo 'run $(date)'; x=5; echo $((x+1))`).
- Slips: none new this cycle.

### QA Cycle 3 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high, 1 medium — two more arithmetic reads the cycle-2 detector did not list: the offset of a positional expansion (`set -- 'a[ $(cmd)]'; echo ${@:$1}`) and a subscript beginning with a digit (`${v[1+$1]}`); both reproduced by QA under bash 5.3 with clean controls. Advisory: EVALUATING_WORD omits `set`, `mapfile`, `getopts`, `trap` and others, which are refused today by the unrecognised-command rule.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5), third strike

QA Cycle 3 fix summary (qa-fix, inline):
- Third strike on `qa-execute-snippets.mjs` (HIGH in gates 1, 2, 3). Struck mechanism: the enumerated list of arithmetic spellings (`ARITHMETIC_READ`) that decided whether a quoted substitution literal is evaluated. Move: replace. The list is deleted and replaced by a default-deny test (`LIVE_EXPANSION`): any live parameter expansion or `name[` outside inert text (single quotes, comments, quoted here-documents). Other findings in the file: fixed as usual (none open).
- Cost: docs scan median +2.0% over 7 runs (0.99 to 1.14); 0 newly runnable, 1 newly refused (this task's plan document, as before).
- Evidence: 383/383 engine tests; mutation: default-deny test off, red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, the cycle-2 engine writes 10 on the same atoms at 8000; `--atoms all` 0 writes; ten extra routes probed by hand (subscript assignment, `for ((…))`, namerefs, `${!y}`, `wait -p`, a `trap` string, `compgen`, `unset a[x]`, an exported child shell): all refused, and the printed-literal control stays runnable; `CI=true npm run ci:fast` 8346 tests, 0 fail.
- Not done: the advisory cleanup (a test that locks the dependency on the unrecognised-command rule) is in the gate's `recommendations.future`.
- Slips: none new this cycle.

### QA Cycle 4 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high — T293-QA-7: the substitution literal as backslash-escaped text in an unquoted word (`[[ a\[\$\(touch\ W\)\] -eq 1 ]]`, `printf -v`, `test -v`, `read`) was classified runnable and wrote under bash 5.3. Found by the independent reviewer (safety re-probe, unscoped), reproduced by QA; controls clean.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

QA Cycle 4 fix summary (qa-fix, inline):
- `qa-execute-snippets.mjs` has had HIGH findings in four consecutive gates, so no patch to the old mechanism. Struck mechanism: the list of quote kinds that count as literal carriers. Move: replace. Any `$(`, `$\(` or backtick text the tokenizer did not parse as a real substitution (outside comments) is now a literal, whatever carries it (`LOOSE_LITERAL`, decided with the same `blockEvaluates()`). Other findings in the file: fixed as usual (none open).
- Order slip, disclosed in the gate: I applied this fix to the working tree before writing gate 4 (the gate records the head `6cb65697` and the reproduction predates the fix).
- Evidence: 383/383 engine tests; mutation (carrier check off) red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, the cycle-3 engine writes 10 on the same atoms at 8000; `--atoms all` 0 writes; docs scan median +1.3%, 0 newly runnable, 1 newly refused (this task's plan); ten more carriers probed by hand (ANSI-C, double-quoted escape, escaped backtick, mixed join, `unset`, `let`, `declare -i`, `for ((…))`): all refused, comment and `$((x+1))` controls runnable.
- Not done: the same advisory cleanup, still in `recommendations.future`.

### QA Cycle 5 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high — T293-QA-8: a literal split across adjacent quote tokens (`read x <<< "a[$""(touch W)]"; echo $((x))`, the same through `printf -v` and a mixed-quote split) has no `$(` in the source and ran under bash 5.3 while classified runnable. Found by the independent reviewer (about 60 variants; linear to N=32000), reproduced by QA.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached
**Loop exit**: loop limit (5 gates) — HALT, owner decision
**Action**: HALT; owner chose "Narrow T293"

Owner decision (2026-11-10): narrow T293. The split-literal route is recorded as a known residual in `qa-runnable-prose-detection.md` §2a-ii and the CHANGELOG, and the allow-list redesign becomes its own task. `accept-qa-residual.sh` refused to waive the FAIL gate ("a waiver never masks a failure"), so the owner's grant of one extra cycle is used for a sixth gate that judges the diff against the now-documented residuals. No code change between gates 5 and 6.

### QA Cycle 6 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high — T293-QA-9: a quoted substitution inside an indexed-array compound-assignment subscript (`a=([0'$(touch W)']=1); echo hi`, backtick form and a letter for the digit) ran under bash 5.3 while classified runnable. The quote follows the digit, not the bracket, and the bracket follows an open paren, so neither the quote-after-bracket rule nor the live-expansion rule fires. Found by the reviewer (about 100 probes, the three documented residuals excluded), reproduced by QA. One advisory cleanup: a test titled "keeps its pinned reason" asserts only `mutating`.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached
**Loop exit**: extra cycle spent — HALT, owner decision
**Action**: HALT; owner granted one more extra cycle for T293-QA-9 (qa_max_cycles 7)

QA Gate 6 fix summary (qa-fix, inline):
- Struck mechanism: the position-based subscript test (`code[q.start - 1] === "["`), the last remaining "look at one character" rule; move: replace. It is now `inSubscriptWord`: an opening `[` earlier in the same word (bounded 512-character scan, stops at a blank, separator or paren). Other findings in the file: the advisory cleanup (a test that cannot fail on the ordering it names) stays in `recommendations.future`.
- Evidence: 383/383 engine tests; mutation (old one-character rule restored) red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, the gate-5 engine writes 10 on the same atoms at 8000; `--atoms all` 0 writes; docs scan median +1.0% over 9 runs (one earlier 7-run batch read +9.5% under load and was repeated), 0 newly runnable, 1 newly refused (this task's plan); seven neighbours probed by hand (associative array, assignment, spaced, `+`, ANSI-C, append): all refused, controls runnable.
### QA Cycle 7 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high — T293-QA-10: `inSubscriptWord` stops its backward scan at a paren, so `a=([0+(1)'$(touch W)']=1); echo hi` and `a=([(0)+'$(touch W)']=1); echo hi` ran under bash 5.3 while classified runnable. Found by the reviewer (about 20 probes), reproduced by QA.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached
**Loop exit**: second extra cycle spent — HALT, owner decision
**Action**: HALT; owner granted a third extra cycle for T293-QA-10 (qa_max_cycles 8)

QA Gate 7 fix summary (qa-fix, inline):
- Struck mechanism: the same-word backward scan (`inSubscriptWord`), the gate-6 replacement for the one-character test; move: replace. It is now `unclosedBracketMap`: one forward pass counting `[` and `]` depth, reset at `;`, `&`, `|` and newline, so a paren inside the subscript can no longer hide the bracket and the cost is linear with no length cap. It reads brackets in quoted text too, which can only over-refuse.
- Evidence: 383/383 engine tests; mutation (parens reset the depth, the gate-7 behaviour) red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, the gate-6 engine writes 10 on the same atoms at 8000; `--atoms all` 0 writes; docs scan median +2.3% over 9 runs (machine load 8), 0 newly runnable, 1 newly refused (this task's plan); seven neighbours probed by hand (deep parens, `${#x}`, command and arithmetic substitution in the index, a later element, a statement subscript, newline): all refused, controls runnable.

### QA Cycle 8 — 2026-11-10
**Gate Result**: FAIL
**Issues Found**: 1 high — T293-QA-11: `unclosedBracketMap` resets the depth at a separator character even inside a quoted span, so `a=([';'0'$(touch W)']=1); echo hi` and `a=(["0;"'$(touch W)']=1); echo hi` ran under bash 5.3 while classified runnable. Found by the reviewer (about 35 probes), reproduced by QA.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached
**Loop exit**: third extra cycle spent — HALT, owner decision
**Action**: HALT; owner granted a fourth extra cycle for T293-QA-11 (qa_max_cycles 9)

QA Gate 8 fix summary (qa-fix, inline):
- Struck mechanism: the depth reset in `unclosedBracketMap` (reset at `;`, `&`, `|`, newline), the last piece of the subscript scan that could lose the bracket; move: delete. The depth is now never reset. Price: over-refusal when earlier text holds an unbalanced `[`.
- Evidence: 383/383 engine tests; mutation (the reset put back) red on the decider test and the real-bash shape test; differential `--atoms indirect` seeds 1-6 at 20000: 0 writes, the gate-7 engine writes 10 on the same atoms at 8000; `--atoms all` 0 writes; docs scan median +4.5% over 9 runs, 0 newly runnable, 1 newly refused (this task's plan); six neighbours probed by hand (early close, quoted `]`, two closes, newline in a quoted index, an earlier lone `[`): none wrote, controls runnable.
- Slip: I again wrote a safe control that used `[`, an evaluating word, so the block rule refused it; the control was dropped, not the engine changed (same slip as gate 6).

### QA Cycle 9 — 2026-11-10
**Gate Result**: CONCERNS
**Issues Found**: 0 — the independent reviewer (hand-built early-closing bracket shapes, backtick substitutions holding a bracket, builtins outside the evaluating-word list, about 18,000 fuzzed array-subscript blocks) found no block that classifies runnable and runs a command. CONCERNS for the owner-accepted residuals (printf octal launder, a bracket or dollar arriving by expansion, a literal split across quote tokens).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: proceeding to 5c
**Loop exit**: gate CONCERNS with no open finding — proceeding to 5c (PR conformance review)
**Action**: Proceeding to 5c (PR conformance review)

- Test-writing slips fixed before commit (gate 6 fix): two safe controls I assumed runnable were not (a `[` is an evaluating word; an array assignment with a `$(` literal is unparseable), so they were replaced or dropped rather than the engine changed. Probe: the rule is restated in `qa-runnable-prose-detection.md` §2a-ii and the CHANGELOG entry (both updated); no other executed document restates it.

---

## Completion

### Step 5c — PR conformance review (2026-11-10)

`/review-pr 870 --no-code`: one low finding (PC-1, gate 9 said "four residual shapes", the docs say three). Fixed in the gate text. Verdict APPROVE. Report: `task.293.pr-review.1.qa-snippet-classifier-indirect-evaluation.md`.

### Step 7 — Finalise (2026-11-10)

- DoD run 1 accepted: `task.293.dod.1.qa-snippet-classifier-indirect-evaluation.md`. 10/10 criteria, security probe 31 executed / 0 reproduced, compliance not applicable, docs pass.
- The first AC pass failed five measured or process criteria (#3, #4, #5, #8, #10) because their records lived only in this report, which is committed last. They were measured again on head and written into QA report 9 ("Finalise evidence record", `343fec09`), then the AC agent was re-run. Docs scan +2.3%, slice median 6.9 s, `bundle:check` clean, ten mutation proofs tabled.
- The security agent skipped its checklist greps; the main context ran them (no secrets, no `eval`).
- CI reading 1: SUCCESS @ `343fec09`. CI reading 2: SUCCESS @ `cd662005` (acceptance head, 6 checks). Canonical PR comment posted.
- Clean-checkout `ci:fast` on the LAN server: 7763 tests, 7747 pass, 3 fail, 13 skipped. All three failures come from the server lacking `zsh` and `shellcheck`.
- No tracker issue (`github_issue` empty), so no tracker close or board move.

### Slips (disclosed)

- A heredoc and a `sed -i` were used once each early in the run, against the standing rules; neither left residue.
- Three safe controls were wrong when written and were fixed without touching the engine. The cycle-4 fix was applied before gate 4 was written.

## Completion

**Finished**: 2026-11-10
**Final Status**: Completed
**Branch**: feature/task.293.qa-snippet-classifier-indirect-evaluation
**PR**: #870
**QA Iterations**: 9 gates (8 FAIL, then CONCERNS), 8 fix passes; budget extended by the owner at gates 5 to 8
**DoD Summary**: `task.293.dod.1.qa-snippet-classifier-indirect-evaluation.md`
**Tracker debt**: none
