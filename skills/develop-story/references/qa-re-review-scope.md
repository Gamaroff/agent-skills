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

| Cycle | `PRIOR_GATES` | Diff scope                                             | `REFUTE_PASS` |
| ----- | ------------- | ------------------------------------------------------ | ------------- |
| 1     | 0             | whole branch                                           | `false`       |
| 2     | 1             | whole branch                                           | `true`        |
| 3+    | ≥2            | since gate N's `head:` (`git diff --name-only <head>..HEAD`) | `false`       |

### The cycle-3+ scope comes from the gate's `head:`, not its `updated:`

Every gate records `head:` — the commit the review was performed against, from `git rev-parse HEAD`
at gate-write time — and the next cycle's file list is `git diff --name-only <head>..HEAD`. It used
to be `git log --since=<updated:>`, and `updated:` was typed by the agent writing the gate. On
task.130 four gates carried local time with a `Z` suffix, up to three hours in the future: cycle
4's `--since` matched nothing, and the scope had to be rebuilt by hand from the fix commit's hash.
A timestamp in the past widens the scope instead, and neither error shows in the output. Two
commits cannot be typed wrong in a way `git` accepts silently (task.135).

- **A gate with no `head:`** (every `schema: 1` gate) runs the cycle **unscoped**, and prints
  `Re-review scope: unscoped — prior gate carries no head: (schema 1)`. It never falls back to
  `--since`. Old gates are not backfilled: a head cannot be given to one honestly.
- **A head this checkout does not have**, or **one that is not an ancestor of `HEAD`** (the branch
  was rewritten), is a HALT that names the cause. Nothing rewrites a branch inside the QA loop, so
  this should not fire there; it can fire afterwards — `develop-batch` rebases each item onto the
  new tip before merging it, and `developNext.mergeStrategy` accepts `squash` and `rebase`. If it
  fires mid-loop, re-record the gate's `head:` or run the cycle unscoped deliberately. (The same
  fact is why the gate-head freshness test judges a gate against history only while its own branch
  is under review.)
- **The block reads `$LATEST_GATE`, and binds it itself.** Each skill's Step 3b preamble sets it
  with `qa-cycle.sh --path gate` in the same shell — Phase 0 binds it too, but every fenced block
  is its own shell. With two or more gates and no readable file bound, the block HALTs rather than
  report "schema 1" (task.135 QA cycle 1, CR-2).
- **Nothing changed since the head** is a HALT too: on cycle 3+ it means no fix landed after the
  gate, which is a sequencing error. In practice the list always holds the gate and QA report
  themselves, which land in a commit after the head they record.
- The **patch** is still `git diff <base>...HEAD -- <files>` — the branch's cumulative change on
  those files, so the reviewer has context. Only the *file list* comes from `<head>..HEAD`.

## The carve-out: `SAFETY_REPROBE`

**When the prior gate failed on a safety axis, the re-review runs unscoped at any cycle.** After a
safety failure the files changed since the last gate are precisely the *fixes*, so a scoped
re-review inspects the patch and never re-reads the surface the patch was meant to protect — and a
fix cycle changes the behaviour of code its own diff never touched.

### Trigger

`SAFETY_REPROBE=true` when the prior gate has **any** of:

1. `nfr_validation.security.status: FAIL`, **or** `nfr_validation.security.evidence` that is
   `unverified` — including a gate whose `security:` block carries **no** `evidence:` key at all.
   Values: [`qa-gate-security-evidence.md`](https://github.com/Gamaroff/agent-skills/blob/develop/shared/resources/qa-gate-security-evidence.md)
2. a `top_issues[]` entry with `severity: high` whose `finding` concerns a **boundary** — a
   classifier, validator, parser, sanitiser, allow-list, deny-list, or authorisation check
3. `gate: FAIL` **and** the work item's own Success Criteria contain any of the words
   `never`, `must not`, `fails closed`, `refused`

> **Clause 1's two halves fail in opposite directions, and that asymmetry is the point.** The
> `status` half fails **closed**: an unreadable or absent gate yields `false`, because a gate that
> cannot be read is not evidence of a failure. The `evidence` half fails **open**: an absent key
> yields `unverified`, which fires.
>
> Written the other way — a missing key read as `reasoned` — every gate produced before this field
> existed would report "no trigger", and the widening would accomplish nothing while appearing to
> work. That is the `\s`-vs-POSIX bug one section down, in a new place.
>
> **A gate with no `security:` block at all is still a non-trigger.** Absence of the key inside a
> security block means *this verdict does not say how it was reached*; absence of the block means
> *this gate makes no security claim*. Only the first is a gap in evidence.

### Clause 1 — the mechanical probe

Clauses 2 and 3 are judgement calls. Clause 1 is not, so it is written once, here, and both skills
carry this exact snippet:

```bash
# $LATEST_GATE is the prior gate file. Reads the nfr_validation.security block
# once and reports "<status> <evidence>", or "absent" when there is no such
# block. Both of clause 1's halves are decided from that one scan.
SAFETY_REPROBE=false
if [ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]; then
  SECURITY_AXIS=$(awk '
    # Three transit constraints govern every line below — no whole-record
    # variable, no apostrophe, no GNU-only escape. See "Transit constraints"
    # in the shared rule for why each one fails silently. Each has a test.
    !f && /^[[:space:]]*security:[[:space:]]*$/ {
      n = length; sub(/^[[:space:]]*/, ""); ind = n - length; f = 1; next
    }
    f {
      # A key at or left of the indent of security: ends the block, so keys
      # belonging to a later NFR axis can never be read as this one.
      n = length; sub(/^[[:space:]]*/, ""); lead = n - length
      if (length > 0 && lead <= ind) exit
      if (st == "" && /^status:/) {
        st = (/[[:space:]]FAIL[[:space:]]*$/) ? "FAIL" : "OK"
      }
      if (ev == "" && /^evidence:/) {
        ev = "unverified"
        if (/evidence:[^[:alpha:]]*measured/) ev = "measured"
        else if (/evidence:[^[:alpha:]]*reasoned/) ev = "reasoned"
      }
    }
    END {
      if (!f) { print "absent"; exit }
      printf "%s %s\n", (st == "" ? "OK" : st), (ev == "" ? "unverified" : ev)
    }
  ' "$LATEST_GATE" </dev/null)
  case "$SECURITY_AXIS" in
    absent)                     : ;;
    *FAIL*)                     SAFETY_REPROBE=true ;;
    *unverified*)               SAFETY_REPROBE=true ;;
    "OK measured"|"OK reasoned") : ;;
    # The branches above are EXHAUSTIVE over what the program can emit, so
    # reaching here means the reader produced something it cannot produce —
    # in practice the EMPTY string, from an awk that died, is missing, or had
    # its program corrupted in transit. That is a claim about the instrument,
    # not about the gate, so it fires: nothing has established the axis is
    # fine. `absent` is a deliberate answer; empty is not an answer at all.
    #
    # The clean readings must be listed BEFORE this. Leaving them to the
    # catch-all makes every passing gate fire — which is what happened when
    # this branch was first added.
    *)                          SAFETY_REPROBE=true ;;
  esac
fi
```

### Transit constraints — three characters that break this snippet silently

This probe is not stored as a script and executed. It ships as **prose an agent copies and runs**,
and it is triplicated: once here, once in each QA skill. Three characters cannot appear in it, each
for a different reason, and **all three fail quietly rather than loudly**. Each has its own test in
`evals/shared/tests/qa-re-review-scope-parity.test.mjs`, because the two that were introduced during
task.82 were both introduced by someone who had just read a comment warning against them.

| Must not appear | Why | Use instead |
| --- | --- | --- |
| The whole-record variable (dollar-zero) | A harness loading a `SKILL.md` **with arguments** substitutes the token with the invocation argument, so `match(<record>, …)` arrives as `match(docs/tasks/task.82…md, …)`. The indent arithmetic then reads garbage and the block boundary is wrong — with no error. Observed live | a bare `/regex/` tests the whole record; `length` with no argument is its length; two-argument `sub()` edits it in place |
| An apostrophe — **including inside a comment** | The program is single-quoted by its caller, so one apostrophe closes the quote early and every fixture fails at once | reword. This is the one that fails loudly, and it is still cheaper to prevent |
| `\s`, `\d`, `\w` | GNU extensions. BSD awk and mawk neither match nor error on them, so the probe returns empty and the carve-out never fires on any platform where the pipeline happens to run | POSIX classes — `[[:space:]]`, `[[:digit:]]`, `[[:alpha:]]` |

**If a fourth constraint appears, stop copying this and extract it to a script both skills invoke.**
Three is the agreed limit. The reason it is prose at all is that the parity test can then assert
both skills carry it *verbatim*, which is what keeps two separately-maintained QA skills resolving
the same gate identically — but that argument gets weaker with every line added.

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
# The commit the prior gate judged, read from its `head:` field ($LATEST_GATE set in Phase 0) —
# never from its `updated:`. A typed timestamp in the future made `git log --since` match nothing,
# one in the past widened the scope, and neither shows in the output (task.135). A schema-1 gate
# has no head, and reads as empty here. $LATEST_GATE is bound by the caller's own preamble in THIS
# shell — Phase 0 binds it too, but in another shell (task.135 QA cycle 1, CR-2).
LAST_GATE_HEAD=$(grep -E '^head:' "$LATEST_GATE" 2>/dev/null | head -1 | sed -E "s/^head:[[:space:]]*//; s/[[:space:]]+#.*$//; s/['\"]//g; s/[[:space:]]*$//")
# $SAFETY_REPROBE was resolved in Phase 0 step 5 from the prior gate. It is a DISJUNCT on this
# guard, not a second block in front of it — two places assigning $DIFF_FILE is how one of them
# silently stops mattering.
if [ "$PRIOR_GATES" -ge 2 ] && [ "$SAFETY_REPROBE" != "true" ]; then   # cycle 3+ — scope to files changed since the last gate's head
  REFUTE_PASS=false
  if [ ! -f "$LATEST_GATE" ] || [ ! -r "$LATEST_GATE" ]; then
    # Two or more gates exist, so an empty or unreadable $LATEST_GATE is a binding failure, not a
    # schema-1 gate. Saying "schema 1" here would record a false cause on every cycle 3+.
    echo "HALT: $PRIOR_GATES gates exist but LATEST_GATE ('$LATEST_GATE') is not a readable file — bind it with qa-cycle.sh --path gate in this shell"; exit 1
  elif [ -z "$LAST_GATE_HEAD" ]; then
    # No head (a schema-1 gate): scoping needs the commit the gate judged, and a timestamp is not
    # one. Run unscoped and say so — never fall back to `--since`.
    echo "Re-review scope: unscoped — prior gate carries no head: (schema 1)"
    git diff "$BASE...HEAD" > "$DIFF_FILE" 2>/dev/null || git diff "origin/develop...HEAD" > "$DIFF_FILE"
  else
    git cat-file -e "${LAST_GATE_HEAD}^{commit}" 2>/dev/null \
      || { echo "HALT: gate $PRIOR_GATES names head $LAST_GATE_HEAD, which this checkout does not have — fetch it, or run this cycle unscoped deliberately"; exit 1; }
    git merge-base --is-ancestor "$LAST_GATE_HEAD" HEAD \
      || { echo "HALT: the head of gate $PRIOR_GATES ($LAST_GATE_HEAD) is not an ancestor of HEAD — the branch was rewritten; re-record the gate's head: or run this cycle unscoped deliberately"; exit 1; }
    # An ARRAY, read line by line, and expanded as "${FILES[@]}". A scalar $FILES expanded bare
    # word-splits under bash and does NOT under zsh: there the whole newline-joined list is one
    # pathspec that matches nothing, git diff writes an empty patch, and the reviewer reviews
    # nothing while reporting clean (obs #76, #110 — task.110 cycle 3). The array form splits
    # the same way in both shells.
    FILES=()
    while IFS= read -r f; do [ -n "$f" ] && FILES+=("$f"); done \
      < <(git diff --name-only "$LAST_GATE_HEAD"..HEAD)
    if [ "${#FILES[@]}" -eq 0 ]; then
      echo "HALT: nothing changed since the head of gate $PRIOR_GATES (${LAST_GATE_HEAD:0:12}) — there is no fix to review; check the cycle order"; exit 1
    fi
    git diff "$BASE...HEAD" -- "${FILES[@]}" > "$DIFF_FILE"
    # Non-vacuity: files changed but the scoped patch is empty ⇒ the scoping is wrong, not the
    # code clean. Refuse to dispatch on nothing.
    if [ ! -s "$DIFF_FILE" ]; then
      echo "HALT: ${#FILES[@]} files changed since ${LAST_GATE_HEAD:0:12} but the scoped diff is empty — the pathspec matched nothing, or every one of those files is back to its base content; check before reviewing nothing"; exit 1
    fi
    echo "Re-review scope: files changed since gate $PRIOR_GATES (head ${LAST_GATE_HEAD:0:12}; ${#FILES[@]} files) — default"
  fi
else                                                             # first review, cycle 2, or safety re-probe — whole branch diff
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

**4. A carried-forward trust boundary is in scope, not exempt.** A prior gate may carry an
advisory of the form *"X is admitted because Y is trusted"* — an accepted trust boundary. It was
reasoned, not measured: nothing executed the admitted shape. Under `SAFETY_REPROBE=true` every such
boundary is **executed** in this cycle — run the admitted shape at least once, record the result
beside the advisory — before it may be carried forward again; a cycle that re-copies the advisory
without executing it records `evidence: reasoned` for that finding, and `reasoned` is not
`measured`. On task.111 an accepted boundary was carried through four cycles on the strength of the
first cycle's sentence, and the shape it admitted was the one that escaped (obs #99). The
re-probe's job is to disbelieve the previous cycle's reasoning; a boundary that was never run is the
first thing to disbelieve.

## Recording the decision

Every re-review records the scope it ran at, in the QA report's **Review Methodology** section, as
one line:

```
Re-review scope: unscoped (prior gate failed on security)
Re-review scope: files changed since gate 3 (head 3479b14a0c1d; 7 files) — default
Re-review scope: unscoped — prior gate carries no head: (schema 1)
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
