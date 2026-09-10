---
type: dod-verification
status: complete
bug: 'bug.7.zero-blocks-executed-fires-on-correct-refusal'
verified: '2026-09-06'
description: 'Definition of Done verification for bug.7 — bug-shaped DoD run inline, every criterion evidenced by a reproducible command.'
---

# Definition of Done Verification — bug.7

**Bug:** bug.7.zero-blocks-executed-fires-on-correct-refusal
**Verified:** 2026-09-06
**Status:** COMPLETED — SATISFIED
**PR:** [#331](https://github.com/Gamaroff/agent-skills/pull/331)

## Method note (read this first)

`/finalise` was invoked and its **inline fallback** was taken deliberately, as the skill sanctions
for a document type it cannot process. Its four parallel DoD agents are built around story/task
documents: the AC-traceability agent needs acceptance criteria and the compliance agent needs a
parent story, and a **general** bug has neither. Running them would have produced four
`NOT_APPLICABLE` sections and no evidence.

So this is a bug-shaped DoD — fix present, regression test fails-without/passes-with, suite + lint
green, no new security surface — run inline and recorded here, which is the condition the fallback
carries. Same approach as `bug.11.dod.1` and `bug.12.dod.1`.

Every criterion below cites a command that reproduces its evidence.

---

## 1. The fix is present, and the reported failure no longer reproduces ✅

The bug's own Reproduction Steps, run against the fixed tree:

```bash
node shared/resources/qa-execute-snippets.mjs --file skills/commit-changes/SKILL.md --json
```

Before: `findings[0].kind == "zero-blocks-executed"`, `detail` ending after the counts with no
remedy, exit `1`.
After: `findings: []`, one `notes[0].kind == "no-executable-blocks"` carrying the refusal breakdown,
exit **`0`**.

The discriminator is present at the guard:

```bash
grep -n 'counts.placeholder > 0' shared/resources/qa-execute-snippets.mjs
grep -n 'no-executable-blocks' shared/resources/qa-execute-snippets.mjs
```

**And the branch that must keep firing still does.** A file with an unbound variable or a `{slot}`
still raises `zero-blocks-executed` at `confidence: medium`, now always carrying the `--bind` remedy
(the conditional suffix is gone, because in that branch it always applies):

```bash
printf '# x\n\n```bash\ngh pr view {id}\n```\n\n```bash\necho "$UNBOUND"\n```\n' > /tmp/case-a.md
node shared/resources/qa-execute-snippets.mjs --file /tmp/case-a.md --no-zsh   # finding + --bind, exit 1
```

## 2. A regression test fails without the fix and passes with it ✅

```bash
node --test shared/resources/tests/qa-execute-snippets.test.mjs   # 89 pass, 0 fail
```

Four tests, each named for this bug:

1. `bug.7: all-mutating with zero placeholders is information, not a finding`
2. `bug.7: the informational record names each refusal reason and its count`
3. `bug.7: a placeholder present keeps it a finding, with the --bind remedy`
4. `bug.7: the split reaches the exit code — refused-only is clean, unbound is not`

**Mutation-proved — the fails-without property was established by execution, not assertion:**

| Mutation | Result |
|---|---|
| `if (counts.placeholder > 0)` → `if (true)` (restores the pre-fix single signal) | **3 fail** (1, 2, 4), 86 pass |
| restored | **89 pass**, 0 fail |

Test 3 stays green under both **by design**. It is the over-correction guard: it pins that the
under-configured case is still a finding, so "delete the guard" cannot pass in place of "split the
guard". A test that went red under every mutation would not distinguish those two.

The prose half is separately mutation-proved:

| Mutation | Result |
|---|---|
| `no-executable-blocks` → `zero-blocks-executed` in `skills/qa-task/SKILL.md`, plus the old §4 heading restored in the rule doc | **2 fail** of 11 parity tests |
| restored | **11 pass**, 0 fail |

```bash
node --test evals/shared/tests/qa-execution-step-parity.test.mjs   # 11 pass, 0 fail
```

## 3. Suite and lint are green ✅

```bash
npm run ci:fast   # exit 0
```

Prettier clean across the tree; **2511 tests, 2510 pass, 0 fail, 1 skipped**. Both suites this
change touches ran inside it — `npm test`'s globs already cover `shared/resources/tests/*.test.mjs`
and `evals/shared/tests/*.test.mjs`, so neither new test set is orphaned.

Two edited test files initially failed `prettier --check`; fixed with `--write` and both suites
re-run green afterwards (100/100 across the two files).

## 4. CI is green on the final commit — waited for, not assumed ✅

```bash
gh pr checks 331          # 5/5 pass
gh pr view 331 --json headRefOid -q .headRefOid   # 2d9e1418642482b6baeed6abf6d2370343fe4897
git rev-parse HEAD                                # 2d9e1418642482b6baeed6abf6d2370343fe4897
```

`test`, `validate`, `link-check`, `shellcheck` and the branch-policy check all pass. The rollup was
**polled to completion** rather than sampled once, and the PR head matches local `HEAD`, so the green
is on the final commit and not on an ancestor.

## 5. Bundled copies carry the change, and the bundler is idempotent ✅

```bash
npm run bundle && git status --short   # no drift after the commit
for f in qa-task qa-story develop-task develop-story double-check; do
  grep -c 'no-executable-blocks' "skills/$f/references/qa-execute-snippets.mjs"
done                                    # 1 1 1 1 1
```

Five engine copies and five rule-doc copies regenerated. The repo's pre-commit hook re-ran the
bundler at commit time and reported every skill in sync. This matters here specifically: the
documented invocations name the bundled paths (`.agents/skills/qa-task/references/…`), so a
source-only fix would leave every real caller on the old behaviour.

## 6. No new security surface ⚠️ N/A — with one thing worth stating ✅

The change adds no command execution, no new allow-list or deny-list entry, no network call, no
filesystem write, and no new input path. It changes **how an existing result is reported**, not what
gets executed: the classifier, the safety boundary and the sandbox sentinel are untouched.

```bash
git diff develop...HEAD -- shared/resources/qa-execute-snippets.mjs \
  | grep -E '^\+' | grep -cE 'SAFE_COMMANDS|DENY_|spawnSync|classifyBlock|COMMAND_RUNNERS|child_process'   # 0

git diff develop...HEAD -- shared/resources/qa-execute-snippets.mjs | grep -E '^@@'
# all four hunks are inside executeFile() and render() — no hunk touches the
# classifier, the allow/deny lists, or the runner
```

> The first draft of this check used a looser `…|exec|…` alternation and returned **7**. Every hit
> was the substring `exec` inside the words *executed* / *execute* in added prose and in the
> `no-executable-blocks` kind name — not a call site. The pattern above names the real symbols
> instead. Recorded because a security criterion that passes on a mis-specified grep is worth less
> than no criterion at all.

**The one security-adjacent point is a positive.** The informational record carries a per-reason
refusal breakdown rather than a summary, so an `unrecognised-command (fail-closed)` refusal stays
distinguishable from a deny-listed one. Collapsing the two into "correctly refused" would have hidden
exactly the over-refusal signal that `bug.6` and `bug.10` were about. The reproducing
`commit-changes` file turns out to be *entirely* fail-closed (`git add ×4`, `git restore ×1`,
`bash ×1`) — visible now, invisible under the old bare finding.

## 7. The behavioural change is documented where a reader will meet it ✅

```bash
grep -n 'no-executable-blocks' shared/resources/qa-runnable-prose-detection.md skills/qa-task/SKILL.md skills/qa-story/SKILL.md
```

- `qa-runnable-prose-detection.md` §4 rewritten around the two-state contract with a
  condition/kind/gate table; §5 requires `notes[]` in the QA report; §6 states the exit-code
  consequence.
- `qa-task` Step 4b and `qa-story` Phase 1.7 both state both halves, the discriminator, and why the
  refused case has no remedy — enforced by the new parity test, so neither can drift out silently.
- The exit-code change (`1` → `0` for a correctly-refused file) is called out as a **Breaking
  Changes** entry on PR #331 rather than left for a caller to discover.

---

## Residual gaps

**One, recorded rather than smoothed over.** `/review-code` was not run on the fix diff. Step 5a's
standard-vs-lite rule runs signals 1 and 2 only in lite mode (`Minor`/`Trivial` + `Low`/`Medium`),
and this bug is `Minor`/`Medium`. That is the configured behaviour, not an omission — but it means
no adversarial read of the diff took place, and the record should say so rather than imply a review
that did not happen.

Mitigating: the engine diff is 72 insertions / 20 deletions across four hunks, all inside
`executeFile()` and `render()`, and the great majority of the insertions are comment prose. It is
covered by four mutation-proved tests plus the pre-existing 85, and it adds no execution path.

## Verdict

**DoD SATISFIED** — 6 criteria met, 1 not applicable (security surface), 1 residual gap recorded.
Proceeding to close.
