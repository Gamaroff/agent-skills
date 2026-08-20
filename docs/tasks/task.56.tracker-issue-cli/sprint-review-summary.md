# Sprint Review Summary — One CLI for the GitHub issue lifecycle

**Task ID:** task.56.tracker-issue-cli
**Completed Date:** 2026-08-20
**Pull Request:** [#265](https://github.com/Gamaroff/agent-skills/pull/265)
**Issue:** [#234](https://github.com/Gamaroff/agent-skills/issues/234)

---

## Summary

Sixth of seven in the restricted-tracker-access sequence. Gives the GitHub issue lifecycle its own
CLI, and answers the class the sequence had been deferring: **mutations whose stdout the caller
consumes.**

---

## What Was Delivered

### The problem, stated plainly

`tracker_write` is the right chokepoint for the ~38 `gh` mutations nobody captures — it refuses,
records, warns on stderr, returns 0. For a call whose value the caller *binds*:

```bash
ISSUE_URL=$(gh issue create …)
```

that is exactly wrong. The capture comes back empty and the caller writes nothing, or garbage, into
a document's frontmatter. **A shell function cannot both refuse a call and return the value the call
would have produced.** So these six calls got a CLI rather than another wrapper arm.

### Success criteria met — 10/10

- [x] All in-scope GitHub kinds route through the CLI; 28 bare sites covered
- [x] No placeholder key ever written; frontmatter untouched on defer
- [x] Dependent actions render after their prerequisite, never before
- [x] A second run with the key present converges without creating a duplicate
- [x] Blocking records called out in both the checklist and the inline summary
- [x] The guard fires on a bare verb, and not on bundled copies or the roster's own table
- [x] The two-run convergence documented where a consumer will meet it
- [x] `full` mode unchanged — no behavioural change for an unrestricted consumer
- [x] The three statements of the old gap updated together and agreeing
- [x] Every invariant mutation-proven; suites green; bundle committed

### Key features

- **`shared/resources/tracker-issue.js`** — fourth peer of `jira-stage.js` / `gh-stage.js` /
  `tracker-comment.js`. Same `--json` `{reason}` contract, same exit codes, same gate placement. One
  deliberate divergence: **stdout is the value channel**, so every notice goes to stderr and a
  caller's `$( )` captures the value or nothing — never a sentence.
- **The two-run convergence** — a value-producing kind records `blocking: true` (a new schema
  field), and the checklist opens with a banner naming the three steps. No placeholder is ever
  written, because a wrong key defeats the duplicate guard and turns a recoverable state into a
  permanent one.
- **23rd roster kind** `github.milestone.create` — milestone creation is a *create*, not a case of
  `issue.edit`, because it yields a number a dependant consumes.
- **`tests/mutation-call-site-coverage.test.js`** — five guards that keep the call-site count a
  maintained number rather than a one-off audit. It found two real bare sites on its first run.

---

## Technical Details

### Files created

| File | Purpose |
| ---- | ------- |
| `shared/resources/tracker-issue.js` | the CLI |
| `shared/resources/tracker-issue-cli.md` | its contract |
| `shared/resources/tests/tracker-issue.test.mjs` | 45 tests |
| `tests/mutation-call-site-coverage.test.js` | repo-wide guard, 5 sections |

26 files modified (12 skills, 8 shared resources, 3 docs, 3 test suites) plus 168 generated bundle
copies.

### Design decisions

- **A CLI, not a wrapper arm** — because a wrapper cannot return a value it refused to fetch.
- **`--kind` flag, not subcommands** — no CLI in `shared/resources/` takes a positional verb;
  `tracker-comment.js` names "read one and you have read all three" as a design property.
- **One composite record for the sub-issue link** — its fetch-then-mutate pair would otherwise yield
  two checklist items neither of which a human can perform alone.
- **Two-tier slug resolution** — `gh`'s own resolution on the perform path (it honours
  `set-default` and forks), the local git remote on the gated path (no network). Both anchored to
  the caller's repo root.

### Breaking changes

**None.** Under `full` the CLI issues exactly the `gh issue create` the prose did — verified.

---

## Testing & Quality Assurance

- **1584 tests passing** (1544 on `develop` → **+40**); `validate:all` 115/115; prettier clean
- **CI**: 4/4 jobs green on the branch HEAD
- **QA**: 5 cycles, gate 1 FAIL (70/100) → gate 2 **PASS (94/100)**, 25 defects fixed
- **Every invariant mutation-proven** — reverted individually, suite confirmed red

### What QA actually found

**One hazard, not twenty-five.** The wrong-repo failure re-emerged one layer below each fix:
deferred record → the resolver that replaced it → that resolver's working directory → every exec
beneath it. Cycle 2 caught that the cycle-1 fix was itself a **regression** that would have created
issues in a fork rather than the base repo.

**Four tests were vacuous**, including one guarding the CLI's central contract. Each was caught by
reverting the behaviour and re-running — never by reading.

---

## Security & Compliance

Argv arrays with no shell; bodies on stdin, regression-tested with a `$(danger)` payload; the access
gate provably makes no network call under any restricted mode (192-run sweep); records redacted on
write and on render. One advisory finding — an unchecked slug reaching a recorded `bash -c` string —
was fixed during verification rather than deferred.

156 bundled copies byte-in-sync. Four statutory compliance areas N/A with reasoning.

---

## Impact

Completes the GitHub side of the restricted-access sequence. A consumer running under
`access.tracker: manual | approve | command | read-only` now gets an honest, complete handover for
the issue lifecycle instead of a silent gap. `full` consumers see no change.

**Out of scope, and unchanged:** PR create/merge/comment and `git push` — VCS, governed by
`access.vcs`.

---

## Known Limitations

- No single end-to-end two-run integration test; the convergence is covered by the prose guard plus
  idempotency tests — coverage by composition rather than one test walking the whole path.
- The runbook *prose* for the convergence is not pinned by a test, so it could drift; the banner's
  runtime wording is pinned.
- The credential/repo-root block is now a fourth verbatim copy across the shared CLIs. Worth
  extracting when a fifth arrives.

---

## Follow-up

`task.57` (read-only verification and reconcile) closes the sequence.
