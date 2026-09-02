<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-re-review-scope.md. Regenerate via `npm run bundle`. -->
# QA Re-Review Scope

> **The rule, stated once.** `qa-task` and `qa-story` both scope re-reviews, and both must resolve
> the scope identically. Neither restates the trigger — they reference this file and read the
> decision from it. `evals/shared/tests/qa-re-review-scope-parity.test.mjs` enforces that.

## The two questions

A first review asks **"what is wrong here?"**. A re-review, scoped to what changed since the last
gate, asks **"were those things fixed?"**. Those are different reviews, and the second silently
standing in for the first is the failure this document exists to prevent.

Both questions must be asked on every re-review, and both answered in the report:

| Question | Answered by |
| --- | --- |
| Were the previous findings fixed? | the **Re-Review Context** table |
| What else is there? | the **New Findings This Cycle** section |

## Default scope

The default is unchanged and stays the default. It is a cost control, and a correct one:

| Cycle | `PRIOR_GATES` | Diff scope | `REFUTE_PASS` |
| ----- | ------------- | ---------------------- | ------------- |
| 1     | 0             | whole branch           | `false`       |
| 2     | 1             | whole branch           | `true`        |
| 3+    | ≥2            | since `LAST_GATE_DATE` | `false`       |

## The carve-out: `SAFETY_REPROBE`

**When the prior gate failed on a safety axis, the re-review runs unscoped at any cycle.** After a
safety failure the files changed since the last gate are precisely the *fixes*, so a scoped
re-review inspects the patch and never re-reads the surface the patch was meant to protect — and a
fix cycle changes the behaviour of code its own diff never touched.

### Trigger

`SAFETY_REPROBE=true` when the prior gate has **any** of:

1. `nfr_validation.security.status: FAIL`
2. a `top_issues[]` entry with `severity: high` whose `finding` concerns a **boundary** — a
   classifier, validator, parser, sanitiser, allow-list, deny-list, or authorisation check
3. `gate: FAIL` **and** the work item's own Success Criteria contain any of the words
   `never`, `must not`, `fails closed`, `refused`

### Clause 1 — the mechanical probe

Clauses 2 and 3 are judgement calls. Clause 1 is not, so it is written once, here, and both skills
carry this exact snippet:

```bash
# $LATEST_GATE is the prior gate file.
SAFETY_REPROBE=false
if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
  awk '/^[[:space:]]*security:[[:space:]]*$/{f=1; next}
       f && /^[[:space:]]*status:/ {print; exit}' "$LATEST_GATE" </dev/null \
    | grep -qE '[[:space:]]FAIL[[:space:]]*$' && SAFETY_REPROBE=true
fi
```

> **POSIX character classes only.** `\s` is a GNU extension. BSD awk and mawk do not match it and
> do not error — the probe returns empty, `SAFETY_REPROBE` stays `false`, and the carve-out never
> fires on any platform where the pipeline happens to run. It fails **closed and silently**, which
> is the same failure mode this task exists to prevent, one layer down. The first draft of this
> snippet had exactly that bug; it was caught by replaying it against `task.67.gate.1` rather than
> by reading it.

> **The `[ -r "$LATEST_GATE" ]` guard and the `</dev/null` are both load-bearing, and neither is
> defensive padding.** `LATEST_GATE` is empty by construction on a **first** review — it comes from
> `ls -t … | head -1` with no gates on disk. `awk 'prog' ""` passes no filename, so awk falls back to
> reading **stdin** and blocks **indefinitely**: a hang, not an error, with no diagnostic. Reproduced
> under both bash and zsh. Only the prose heading *"For re-reviews"* keeps the block from running
> then, and a prose guard in front of an indefinite hang is not a guard. The `if` makes the
> precondition explicit and `</dev/null` makes the stdin fallback unreachable even if the `if` is
> ever removed.

### Non-trigger — stated explicitly, because the narrowness is the point

These keep today's scoping. A trigger wide enough to catch them would make every re-review
unscoped, and an always-on carve-out is one nobody can afford to leave on:

- `CONCERNS` on performance, reliability or maintainability
- `FAIL` on documentation or test coverage
- a gate that merely **has issues** — severity and axis both matter, not issue count
- `top_issues[]` entries at `severity: medium` or `low`, whatever they concern

## What the trigger changes

Three things, and all three are required. Widening the diff alone is a half-fix: the re-review then
reads more code while still only asking whether the previous findings were fixed.

**1. Scope — extend the existing conditional, do not add a second one.** `SAFETY_REPROBE` is a
disjunct on the narrowing guard, so the cycle-3+ branch is taken only when the trigger has not
fired. Two independent blocks assigning `DIFF_FILE` is the failure mode to avoid — the second wins
silently and the first looks implemented:

```bash
if [ "$PRIOR_GATES" -ge 2 ] && [ -n "$LAST_GATE_DATE" ] && [ "$SAFETY_REPROBE" != "true" ]; then
  REFUTE_PASS=false
  FILES=$(git log --since="$LAST_GATE_DATE" --name-only --format="" | sort -u)
  [ -n "$FILES" ] && git diff "$BASE...HEAD" -- $FILES > "$DIFF_FILE"
else
  [ "$PRIOR_GATES" = "1" ] && REFUTE_PASS=true || REFUTE_PASS=false
  git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
fi
```

**2. `REFUTE_PASS` when the trigger fires.** It keeps the value the cycle already gives it —
`true` on cycle 2, `false` otherwise. `SAFETY_REPROBE` does **not** set it. The two are separate
instructions with different targets and they **compose**: where both apply, append both directives
to the subagent prompt, refute first. Refuting the fixes and re-probing the surface are complementary,
and collapsing them into one flag would make cycle 3+ silently lose the refute or cycle 2 silently
lose the re-probe.

**3. The instruction.** Append this to the code-review subagent prompt whenever
`SAFETY_REPROBE=true`, verbatim:

```
SAFETY RE-PROBE. The previous gate failed on a safety axis. Do NOT scope your attention to the
fixes: they are handled separately by the Re-Review Context table, and re-confirming them is not
your job. Search the surface again as if for the first time — enumerate the boundary's inputs
yourself and test them, rather than re-testing the inputs the previous cycle happened to name. A
fix cycle changes the behaviour of code its own diff never touched, so a defect of the same class
as the ones just closed is the expected finding, not a surprising one.
```

## Recording the decision

Every re-review records the scope it ran at, in the QA report's **Review Methodology** section, as
one line:

```
Re-review scope: unscoped (prior gate failed on security)
Re-review scope: since 2026-08-31T21:55:00Z (default)
```

Naming the scope is what makes a quiet cycle auditable. Without it, "we found nothing" and "we did
not look" are the same sentence.

## New Findings This Cycle

Every re-review report carries a `## New Findings This Cycle` section, **including when it is
empty**. `None` is an answer; an absent section is not — it is indistinguishable from a cycle that
never asked the second question.

On an **unscoped** re-review reporting zero new findings, the section must state **what was
searched**, so "nothing found" is distinguishable from "nothing looked for":

```markdown
## New Findings This Cycle

None. Searched unscoped (prior gate: security FAIL): full `origin/develop...HEAD` diff, 14 files.
Re-enumerated the classifier's inputs — redirections, quoted `#`, here-strings/here-docs,
unparseable leading tokens, command runners, `awk` programs, process substitution — and tested each
against the current implementation.
```

A bare `None` on an unscoped cycle is a defect in the report, not a clean result.
