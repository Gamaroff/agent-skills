---
id: bug.10
title: "sed's `w` write flag is only caught when a space follows it, leaving seven glued forms fail-open"
type: bug
description: "The `sed w write` deny pattern added by bug.6 requires whitespace after `w`, so every glued GNU-sed spelling (`s/a/b/wfile`, `wfile`, `Wfile`, `/re/wfile`, alt delimiters, `-e`) still reaches `runnable` and writes a file. `sed -f script.sed` is also accepted although its script cannot be read."
tags: [qa, security, snippet-engine, fail-open, classifier, sed]
status: closed
severity: Major
priority: High
created: 2026-09-05
updated: 2026-09-05
related: 'none — cross-cutting (no single owner)'
found_by: bug.6 verify cycle (adversarial review of the fix)
component: shared/resources/qa-execute-snippets.mjs
---

# Bug Report: sed's `w` flag is caught only when a space follows it

**Bug ID**: bug.10
**Related**: None — cross-cutting (no single owner)
**Status:** ✅ Closed
**Severity:** Major
**Priority:** High
**Created**: 2026-09-05
**Found By**: adversarial review of the bug.6 fix; recorded in bug.6's Resolution Summary as a known gap

---

## Bug Description

**Summary**: `bug.6` closed sed's `w` write flag with the deny pattern
`/\bsed\b[^\n|;&]*\bw\s+\S/`. The `\s+` means it fires only when a space separates `w` from its
filename. GNU sed does not require that space, and neither do several other spellings of the same
write. **Seven inputs that write a file still classify `runnable`** and would therefore be executed
by `/qa-task` and `/qa-story` Step 4b.

**Expected Behavior**: any sed invocation whose script writes a file — through the `s///w` flag, the
`w`/`W` command, an address-prefixed `/re/w`, any delimiter, or via `-e` — classifies `mutating`. A
script that cannot be read at all (`-f file.sed`) also classifies `mutating`, because the classifier
cannot say what it does and "cannot say" must never resolve to "safe".

**Actual Behavior**: only the space-separated spellings are caught. The glued forms are accepted.

**Impact**: identical to bug.6 — `classifyBlock` gates whether a documentation snippet is
**executed** against the developer's working tree. `sed 's/a/b/wpwned.txt' README.md` is a
single-line, entirely ordinary-looking doc snippet that writes a file. Major rather than Critical for
the same reason as bug.6: the input must appear in a repository's own documentation to be reached.

---

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0) / Node 20+, repo `agent-skills` at `develop` (`c1ce3388`,
i.e. immediately after bug.6 merged). `classifyBlock` is a pure exported function.

**Steps to Reproduce**:

1. From the repo root:

   ```bash
   node --input-type=module -e '
     const { classifyBlock } = await import("./shared/resources/qa-execute-snippets.mjs");
     console.log(classifyBlock("sed \x27s/a/b/wpwned.txt\x27 README.md").klass);  // => "runnable"
     console.log(classifyBlock("sed -n \x27s/a/b/w /tmp/x\x27 README.md").klass); // => "mutating"
   '
   ```

2. Observe that the two differ only by the space after `w`.
3. Repeat for each row of the table below.

**Frequency**: Always
**Reproducible**: Yes — deterministic; `classifyBlock` is pure.

---

## Evidence

Probe output at `develop` `c1ce3388`:

```
BAD  glued s/// w flag          got=runnable   want=mutating  :: sed 's/a/b/wpwned.txt' README.md
BAD  glued, alt delimiter       got=runnable   want=mutating  :: sed 's|a|b|wpwned.txt' README.md
BAD  glued via -e               got=runnable   want=mutating  :: sed -e 's/a/b/wpwned.txt' README.md
BAD  glued bare w command       got=runnable   want=mutating  :: sed 'wpwned.txt' README.md
BAD  glued W command            got=runnable   want=mutating  :: sed 's/a/b/Wpwned.txt' README.md
BAD  address + glued w          got=runnable   want=mutating  :: sed '/re/wpwned.txt' README.md
BAD  -f script (unreadable)     got=runnable   want=mutating  :: sed -f evil.sed README.md
OK   SPACED w (closed by b6)    got=mutating   want=mutating  :: sed -n 's/a/b/w /tmp/x' README.md
OK   SPACED bare w              got=mutating   want=mutating  :: sed 'w /tmp/x' README.md
OK   NEG: warning in pattern    got=runnable   want=runnable  :: sed 's/warning/x/' README.md
OK   NEG: w as pattern          got=runnable   want=runnable  :: sed 's/w/x/' README.md
OK   NEG: plain g flag          got=runnable   want=runnable  :: sed 's/a/b/g' README.md
OK   NEG: w arg to echo         got=runnable   want=runnable  :: echo w file | sed 's/a/b/'

fail-open: 7   over-refusal: 0
```

**Related Files**:

- `shared/resources/qa-execute-snippets.mjs` — `DENY_PATTERNS`, the `sed w write` entry
- `shared/resources/tests/qa-execute-snippets.test.mjs` — the bug.6 counterweight tests
- five bundled copies under `skills/{qa-task,qa-story,develop-task,develop-story,double-check}/references/`

---

## Scope & Impact

**Affected area**: `shared/resources/qa-execute-snippets.mjs` and its five bundled copies, consumed by
`/qa-task` and `/qa-story` Step 4b and by `/finalise`'s DoD security probe.

**Why it has no single owner**: the classifier is shared infrastructure — the same reasoning as bug.6.

**How It Failed**: the classifier's contract is that `runnable` means "safe to execute against the
developer's working tree". For the seven inputs above it does not hold.

---

## Root cause — one, not seven

`w` has two meanings in a sed script and a regex cannot tell them apart by shape alone:

- In **flag position** — after the closing delimiter of `s<D>…<D>…<D>` — `w` writes, and everything
  after it up to `;`, newline or `}` is a filename.
- In **pattern text** — `s/warning/x/` — `w` is just a letter.

Anchoring on `/w` matches both (`s/warning` contains `/w`), which is why every pattern attempted
during bug.6 produced false positives on ordinary substitutions and the rule was left requiring a
space. **Position is the whole distinction, so it needs a delimiter-aware walk of the script, not a
match over it.** This is the same shape as bug.6's root cause D — a flag matched without reference to
the command it belongs to — and it wants the same remedy.

## Suggested fix

A `sedWritesFile(segment)` helper:

1. Locate the script — the first non-flag operand, or each `-e`/`--expression` argument. For `-f` /
   `--file`, the script is not readable: return **true** (fail closed).
2. Walk it delimiter-aware. For `s<D>…<D>…<D><flags>`, `<D>` is whatever character follows `s`; the
   flags run to `;`, newline, `}` or end of script. A `w` or `W` among them ⇒ write.
3. A `w`/`W` in **command position** — script start, or after `;`/newline, with an optional address
   (`/re/`, `$`, a line number, or a range) — ⇒ write.

Add all seven inputs and the four negatives above to the regression corpus.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-05

**Reproduction**: all seven inputs run through `classifyBlock()` at `c1ce3388`; all seven returned
`runnable`, with the two space-separated controls correctly `mutating`. See `## Evidence`.

**Root Cause Analysis**: one cause, not seven — `DENY_PATTERNS`' `sed w write` entry matched `w` by
shape (`\bw\s+\S`) rather than by position. `w` writes only in flag position or command position;
inside pattern text it is an ordinary letter, and `s/warning/x/` contains `/w` just as
`s/a/b/wfile` does.

**Proposed Fix**: walk the sed script delimiter-aware instead of matching over it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-05

**Fix Description**:

- `sedWritesFile(segment)` locates **every** `sed` token in a segment (not just the first — `sed 's/a/b/' f | sed 'w /tmp/x'` writes), resolving each through `sedInvocationWrites()`.
- `sedInvocationWrites()` collects that invocation's script: the first non-flag operand, or each `-e` / `--expression` value. `-f` / `--file` names a script the classifier cannot read, so it returns **true** — fail closed.
- `scriptWrites()` walks the script: it skips addresses (`/re/`, line numbers, ranges, `$`), and for `s<D>…<D>…<D>` takes `<D>` from whatever follows `s` — so `|`, `#` and any other delimiter work — then scans the flags up to `;`, newline or `}` for `w`/`W`. A `w`/`W` in command position also counts.
- The write check is deliberately **not** segmented on a single `|`, because `|` is a legal `s///` delimiter and splitting there tore `s|a|b|wfile` apart. Segmentation is unnecessary anyway since `sedWritesFile` finds each `sed` itself.
- The old regex rule is removed.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs` — parser added, `sed w write` regex removed
- `shared/resources/tests/qa-execute-snippets.test.mjs` — 4 tests (10 glued spellings, unreadable script, multi-sed, 12 negatives)
- five bundled copies — regenerated via `npm run bundle`

**Testing**: 93 tests green (89 from bug.6 + 4 new). 25 probe inputs correct: 15 writes refused,
10 read-only accepted, 0 fail-open, 0 over-refusal.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/qa-execute-snippets.test.mjs evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs`
2. Confirm `sed 's/a/b/wpwned.txt' f` is `mutating` and `sed 's/warning/x/' f` is `runnable`.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-05

**Verification Result**: ✅ Fixed

- All 7 reported routes closed; 8 further spellings found while fixing (alt delimiters, `--expression=`, `--file=`, address/range/line-number prefixes, second-sed-in-pipeline) also closed.
- 12 negatives — including the `s/warning/x/` family that defeated every regex — stay `runnable`.
- 93 tests green. Three mutation proofs, each asserting its own anchor: first-sed-only → 1 failure, `-f` fails open → 1, split-on-`|` → 1.

**Decision**: Closed.

---

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-09-05 | New | develop-bug (bug.6 verify cycle) | Filed — the `sed w write` rule added by bug.6 requires whitespace after `w`; seven glued spellings remain fail-open, verified by probe at `c1ce3388` |
| 2026-09-05 | In Progress | develop-bug | Reproduced all 7; root cause localised to matching `w` by shape rather than by position |
| 2026-09-05 | Ready for QA | develop-bug | Replaced the regex with a delimiter-aware script walk; 8 further spellings found and closed while fixing; 93 tests green |
| 2026-09-05 | Closed | develop-bug | Verified — 15 writes refused, 10 read-only accepted, 0 fail-open, 0 over-refusal; 3 mutation proofs |

---

## Resolution Summary

**Final Status**: ✅ Closed — fixed and verified.

**Total Iterations**: 1

**Time to Resolution**: filed and closed 2026-09-05, immediately after bug.6 merged.

### Final Fix Details

The `sed w write` deny pattern is replaced by a three-function delimiter-aware walk —
`sedWritesFile` → `sedInvocationWrites` → `scriptWrites` — in
`shared/resources/qa-execute-snippets.mjs` and its five bundled copies.

**Fixing it surfaced eight more routes than the report named.** The filing listed seven; the walk
also closed alternate `s///` delimiters (`|`, `#`), `--expression=`, `--file=`, address-, range- and
line-number-prefixed writes, and a write by the **second** sed in a pipeline. Two of those were holes
in my own first cut of the fix, caught by probing rather than by review: splitting segments on `|`
tore `s|a|b|wfile` apart, and checking only the first `sed` in a segment missed
`sed 's/a/b/' f | sed 'w /tmp/x'`.

### Lessons Learned

1. **Shape is not position.** Every regex attempted for this rule during bug.6 false-positived on
   `sed 's/warning/x/'`, because `/w` appears identically in pattern text and in flag position. The
   distinction is *where the character sits in the script's grammar*, which a walk can see and a
   match cannot. bug.6's root cause D said the same thing about `-o`; this is the same lesson
   arriving a second time about a second flag.
2. **The fail-closed branch needs a test of its own.** `sed -f evil.sed` is the case where the
   classifier genuinely cannot know, and the only safe answer is to refuse. Left untested it would
   have been easy to "simplify" into returning false.
3. **Deferring a known gap kept it visible.** bug.6 recorded this as an accepted gap in its
   Resolution Summary rather than quietly leaving it. That record is what made it a filed bug rather
   than a forgotten one.
