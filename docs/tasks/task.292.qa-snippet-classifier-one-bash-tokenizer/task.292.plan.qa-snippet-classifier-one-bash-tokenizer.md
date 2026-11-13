---
id: task.292.plan
title: "Implementation Plan: One bash tokenizer for the QA snippet classifier"
type: plan
task-ref: task.292.qa-snippet-classifier-one-bash-tokenizer.md
---

# Implementation Plan: One bash tokenizer for the QA snippet classifier

> Requirements and success criteria: [task.292.qa-snippet-classifier-one-bash-tokenizer.md](task.292.qa-snippet-classifier-one-bash-tokenizer.md)

## Overview

Commit the two instruments first and make them find the open bug. Then build `tokenize` beside the existing scans, move the scans onto it one at a time with the instruments run after each, and delete what each move leaves dead.

## Phase-by-Phase Implementation Guide

### Phase 1: Instruments

**`scripts/qa-snippets-differential.mjs`** (new). Taken from the task.290 session probes (`probe4.mjs`, `probe8.mjs`), which were never committed. Shape:

```js
// usage: node scripts/qa-snippets-differential.mjs [--engine <path>] [--seed N] [--count N] [--json]
import { classifyBlock } from <engine path, default shared/resources/qa-execute-snippets.mjs>;
const ATOM_SETS = {
  escapes: ["\\'", "\\\"", "'", "\"", "\\", "\\\n", "#", " ", "a", "$(", ")", "`", ";", "\\ ", "\n", "$'", "\\\\"],
  blanks:  ["\t", "\r", "\f", "\v", " ", " ", " ", "#", "a", "\\", "\\\\", "\n", ";"],
  nesting: ["$(", ")", "`", "\"", "'", "<<E\nx\nE\n", "{ ", "; }", "(", "|", "&", "a", "#", " "],
};
// seeded LCG (seed = (seed * 1103515245 + 12345) & 0x7fffffff), 2..8 atoms after "echo ",
// writer appended: " ; touch out" and "\ntouch out" alternately.
// For each runnable block: d = mkdtempSync(join(tmpdir(), "qa-diff-"));
//   try { execFileSync("timeout", ["2", "bash", "-c", code], { cwd: d, stdio: "ignore" }) } catch {}
//   finally { if (readdirSync(d).length) record(code); rmSync(d, { recursive: true, force: true }) }
// Exit 1 when any block wrote; print { total, runnable, writes, first: [...] }.
```

Export the generator as a function so the test can run a fixed-seed slice without spawning the script. Check `scripts/test-tmpdir.mjs`'s ratchet accepts the `qa-diff-` prefix (it is removed in a `finally`, so it should leave nothing).

**`scripts/qa-snippets-docscan.mjs`** (new). From the session's `docscan.mjs`: `git show develop:shared/resources/qa-execute-snippets.mjs` into a temp `.mjs`, import both engines, `extractBlocks` over every `git ls-files '*.md'`, count newly runnable and newly refused, print each with its file. Exit 1 on any newly runnable. Accept `--base <ref>` (default `develop`) and `--time` (wall-clock per engine).

**Calibration** (record in the implementation report and the QA report):
- `node scripts/qa-snippets-differential.mjs --count 80000` on the unchanged engine reports writes, and the first one is a CR/FF/VT/NBSP/U+2028-before-`#` block (task.290 cycle 3 saw 2 in 80000).
- `docscan` against a copy with a deliberately widened rule reports at least one newly runnable block. The task.290 precedent: skipping the character after every backslash outside quotes made `task.83.bug.1…md:102` newly runnable. Record the widening used and the block it reported.

**Suite slice.** In `shared/resources/tests/qa-execute-snippets.test.mjs`, beside the existing differential (`:4681`): run the exported generator with a fixed seed and a count sized to the 10-second bound, and assert 0 writes and at least one runnable block executed (non-vacuity). Add `T292_GAPS` (CR, FF, VT, U+00A0, U+2028 between `echo a` and `# ; touch out`) asserting `mutating`; red until Phase 3.

### Phase 2: `tokenize`

Place it near `closingParen` (`:1479`), which it absorbs. Single pass over the code with an explicit state stack:

```js
const BLANK = new Set([" ", "\t", "\n"]);          // bash's blanks; nothing else
const OPERATOR_START = new Set([";", "&", "|", "(", ")", "<", ">"]);
// frames: { kind: "top" | "dq" | "sq" | "subst" | "backtick", start }
// tokens: { kind: "word" | "op" | "comment" | "newline" | "heredoc" | "subst-open" | "subst-close",
//           start, end, text, quoted }
export function tokenize(code) { ... }             // throws Error("tokenize: <reason>") on refusal
```

Rules to encode (each with a unit test and a control):
- Outside quotes: `\` + newline with an odd run is a join (emit nothing); `\` + any other char makes that char part of the word.
- `"…"`: `\` escapes only `$ \` " \\` and newline; `$(` and `` ` `` push a frame.
- `'…'`: no escapes; ends at the next `'`.
- `#` opens a comment only when the previous token boundary was a blank, an operator or start of input, and the `#` is not inside a word. CR, FF, VT, NBSP and U+2028 are word characters, so `a<CR>#` is one word.
- Heredocs: reuse the heredoc reading `stripNonCode` (`:2236`) does today; refuse forms it does not model.
- Depth over a bound (keep task.290's) throws.

The iterative-scan test: build a 20000-deep well-formed nest and assert `tokenize` returns within the time bound and does not throw `RangeError`. A recursive version overflows the stack there; task.290 found the catch alone hides that, so assert on `tokenize` directly, not through `classifyBlock`.

**`\s` classification.** Run `grep -n '\\s' shared/resources/qa-execute-snippets.mjs`; for each hit record bash-input or not (prose detection, Markdown table cells and `SAFE_FLAGS` text are not). Replace the bash-input ones. Add the guard test: read the engine source, find every `\s`, and fail on any line not in an allowlist `{ line-substring: reason }`. A source scan is acceptable here because what it guards is the absence of a construct; the behaviour is held by the gap rows.

### Phase 3: Migrate

Order, each its own commit, each followed by the suite, the fixed-seed slice and `docscan`:

1. `startsComment` (`:1520`): becomes a lookup on the token list. T292_GAPS go green here; mutation: put `\s` back, name the red rows.
2. `closingParen` / `maskSubstitutions` (`:1479`, `:1529`): use `subst-open`/`subst-close` spans.
3. `stripCommentQuoteAware` (`:1970`) and `blankQuotedSpans` (`:2027`): drop `comment` tokens, blank `quoted` spans. Remove the cycle-1 escaped-quote throw once its gap rows stay green without it.
4. `stripProse` (`:2156`) and `stripNonCode` (`:2236`): same. Remove the cycle-1 backslash-newline-before-`#` throw once covered.
5. `commandInvocations` (`:2327`, join at `:2335`) and the prose pass join (`:2915`): read joins from the tokenizer; both regexes go.

Keep each scan's decision logic. If a migration changes a doc block's verdict, stop and explain it in the implementation report before continuing.

### Phase 4: Prove

- `node scripts/qa-snippets-differential.mjs --count 70000` per atom set (≥ 200000 total), seeds recorded.
- `node scripts/qa-snippets-docscan.mjs --time` five alternating runs with `uptime`.
- Mutation list from task section 8, each with its red test.
- `qa-runnable-prose-detection.md`: replace the lexical sentences added by tasks 289 and 290 with one paragraph on the tokenizer; `CHANGELOG.md`; `npm run bundle`; `CI=true npm run ci:fast`.

## Key Patterns and References

- `classifyFailClosed` (`:2815`): the catch that turns a refusal into `mutating`. The tokenizer's refusals rely on it.
- task.290's three fixes (`e750f678`, `fce7a9bd`, `4223cfac`) are the shapes the tokenizer must cover; their gap rows are the regression set.
- `scripts/test-tmpdir.mjs`: every temp prefix the new code creates must pass its ratchet.

## Testing Approach

Gap rows and controls in `shared/resources/tests/qa-execute-snippets.test.mjs`; tokenizer unit tests in the same file under a `tokenize` heading; the fixed-seed differential slice; the `\s` guard; the iterative-scan test. The full differential and docs scan are scripts, not tests, and their results go in the QA report.
