# QA Report: Task 56 — One CLI for the GitHub issue lifecycle (cycles 2–5)

**Task**: [task.56.tracker-issue-cli.md](./task.56.tracker-issue-cli.md)
**Gate File**: [task.56.gate.2.tracker-issue-cli.yml](./task.56.gate.2.tracker-issue-cli.yml)
**Previous**: [task.56.qa.1.tracker-issue-cli.md](./task.56.qa.1.tracker-issue-cli.md) — FAIL (70/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-20
**Gate Status**: PASS

---

## Executive Summary

Four fix cycles closed the 11 findings from gate 1 and the 14 raised while verifying
them. The final cycle found no production defect with both a named triggering input and
an observable wrong outcome, and swept 192 runs across every restricted mode, kind and
flag combination: **zero network calls, zero stdout bytes, zero malformed records**.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED
**Quality Score**: 94/100

---

## Re-Review Context

| Gate 1 finding | Status |
| -------------- | ------ |
| BUG-1 finalise unterminated heredoc | FIXED |
| BUG-2 review-task unterminated heredoc | FIXED |
| BUG-3 create-issue dead issue URL | FIXED |
| BUG-4 `$OWNER/$REPO` in deferred records | FIXED |
| BUG-5 jq title interpolation, unpaginated lookup | FIXED |
| BUG-6 missing `mkdir` in three sync skills | FIXED |
| BUG-7 `--reason not_planned` rejected by gh | FIXED |
| BUG-8 prose overclaiming the injection fix | FIXED |
| BUG-9 no test for the two-run convergence | FIXED |
| BUG-10 vacuous stderr test | FIXED |
| BUG-11 `--dry-run` reaching the network | FIXED |

All 14 findings raised during cycles 2–4 are also closed; each is recorded in the commit
that fixed it.

---

## What this review actually found, and it is worth stating plainly

**The same hazard moved downstream of every fix.** Not four unrelated defects — one
defect, re-emerging one layer below wherever it had just been closed:

1. **Cycle 1** fixed the *symptom*: deferred records carried the literal `$OWNER/$REPO`.
2. **Cycle 2** found the fix was a **regression**. Replacing `gh repo view` with a
   git-remote read made the slug local, but lost gh's own resolution — `gh repo
   set-default`, a fork's upstream. In a fork clone every mutation would have been aimed
   at the fork rather than the base repo.
3. **Cycle 3** found the *replacement resolver* ran `gh` against `process.cwd()` — the
   exact hazard the local reader documents and guards against, reintroduced by the
   higher-priority tier.
4. **Cycle 4** found that anchoring the resolvers was still not enough: every
   perform-path exec ran with no `cwd`, and the four issue verbs have no `!slug`
   refusal. So `--kind close --issue 42` with an unresolvable slug ran `gh issue close
   42` with neither `--repo` nor a `cwd`, closing the issue in whatever repository the
   process happened to be in — and reporting `performed`.

Each was demonstrated with a concrete trigger before being accepted, not inferred.

**Four tests were vacuous** — they passed with the behaviour they named reverted. Each
was caught by actually reverting the line and re-running, never by reading:

- `§2 a performed create prints the issue NUMBER` asserted the returned JSON payload
  rather than **stdout**, which is the CLI's entire contract. Deleting
  `output.value(num)` left every caller's `$( )` capture empty with the suite green. Now
  a real subprocess with a fake `gh` on PATH, asserting stdout is exactly `207\n`.
- `§10 --dry-run … NO network call` used a throwing transport, but `ghRepoSlug` catches
  its own errors — so the call happened, the throw was swallowed, and the assertion held.
  Now counts the **attempt**.
- `§10 a milestone title containing a quote` could not see a jq regression, because the
  stub returns its NDJSON whatever `--jq` is passed. Now asserts the filter is the
  constant.
- `§4` (the convergence guard) matched each skill's **YAML frontmatter description**
  rather than its body, so deleting the actual step would still have passed.

**The heredoc defect was repo-wide.** Two were introduced by this task; a sweep found
six more already on `develop` — in the Jira-path comment blocks of `create-pr`,
`finalise`, `review-story`, `review-task` and two pipeline step docs. Every one silently
swallowed a `tracker-comment.js` call: the comment never posted, the run reported
success. All eight are fixed and `§5` now blocks the class. This is beyond the task's
stated scope and is flagged as such rather than folded in quietly.

---

## Release Invariants

Each mutation-proven — the invariant reverted, the violation counted.

| Invariant | Holds | Evidence |
| --------- | ----- | -------- |
| No kind reaches the network under any restricted mode | ✅ | 192 runs (4 modes × 6 kinds × 4 flag combos × 2 transports): 0 calls. Disabling the gate yields 48 violations |
| Stdout is byte-empty under any restricted mode | ✅ | Same sweep with `process.stdout.write` instrumented: 0 bytes. Routing `info` to `console.log` yields 72 violations |
| No deferred record carries a placeholder or an unrunnable command | ✅ | 144 records: no `$OWNER`, `/repos//`, empty argv element or malformed path. 128 carry a command; the 16 without are exactly the slugless milestone / sub-issue cases |

---

## NFR Assessment

**Security — PASS.** The gate holds under proof, not assertion. The prose that once
claimed `--body-file` removed the command-substitution surface now states the residual
risk accurately; the overclaim was the finding, and correcting it is the fix.

**Performance — PASS.** No hot path. The dry-run branch no longer makes a round trip it
never reads.

**Reliability — PASS.** The dominant failure class of this task — a mutation landing
somewhere nobody meant — is now closed at every layer it appeared in.

**Maintainability — PASS.** Every non-obvious choice records the reason, including three
rejected alternatives. Five guards turn invariants that were previously audited once
into invariants that are maintained.

---

## Test Artifacts

```bash
npm test                 # 1583 passed, 0 failed  (1544 on develop → +39)
npm run validate:all     # 115 passed, 0 failed
npx prettier --check .   # clean
```

Coverage of the new CLI: 44 tests across 11 sections. Every invariant individually
mutation-proven, including all 7 perform-path exec sites.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no blocking defect survives; the three release invariants hold under
proof; every fix is watched by a test that goes red without it.
**Quality Score**: 94/100

**Deployment Recommendation**: APPROVED

The six points withheld are for the residual items recorded as `future` in the gate —
a credential block now copied verbatim across four CLIs, and a resolver that can only be
tested by creating repositories on disk. Neither affects correctness; both are worth
doing when the fifth CLI arrives.
