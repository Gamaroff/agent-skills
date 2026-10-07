---
id: task.194.plan
title: "Implementation Plan: Code-review findings anchor to source lines"
type: plan
task-ref: task.194.code-review-anchors-name-source-lines.md
---

# Implementation Plan: Code-review findings anchor to source lines

> Requirements and success criteria: [task.194.code-review-anchors-name-source-lines.md](task.194.code-review-anchors-name-source-lines.md)

## Overview

Fix the coordinate at its source (the prompt), then verify it in one engine that all four dispatchers
call. The engine reports and never repairs. A malformed anchor stays visible and is marked; it is
never dropped and never posted as fact.

## Phase-by-Phase Implementation Guide

### Phase 1: Prompt contract

**`shared/resources/code-review-prompt.md`**

Schema example (§ Output contract, the line `file_line: "src/x/y.ts:42"`). Add `line_text` after it:

```yaml
      file_line: "src/x/y.ts:42"
      line_text: "if (user.id = target.id) {"   # the trimmed source text of that line
```

The `Rules:` bullet that reads ``- `finding`/`suggested_action` are single sentences. `file_line` is
`path:line` from the diff.`` becomes:

```
- `finding`/`suggested_action` are single sentences.
- `file_line` is `path:line` where line is the line number IN THE PR-HEAD VERSION OF THE FILE — the
  `+` side of the hunk header (`@@ -a,b +c,d @@` counts from `c`). It is NEVER a line number in the
  patch file at <DIFF_FILE>. Read the file at that line before you report it.
- `line_text` is that line's source text, trimmed. A caller checks it against the file; a finding
  whose text does not match is shown to the user as an unverified location.
```

Name the patch path in the rule (`<DIFF_FILE>`). The defect came from the reviewer not knowing which
of the two artefacts the number refers to.

**`shared/resources/pr-conformance-prompt.md`**: next to the `ref:` example (`ref: "AC-3"  # criterion
id, …, or path:line`), add one rule line: when `ref` is `path:line`, the line follows the same
definition as `code-review-prompt.md`'s `file_line`, and an optional `line_text` may accompany it.
**Cite the sibling by bare filename.** Inside `shared/resources/`, a `shared/resources/` literal is a
bundling instruction (AGENTS.md § Shared Resources).

### Phase 2: Checker engine

**`shared/resources/finding-anchors.js`**: follow the header-comment and exit-code conventions of
`registry-tick.js` and `pr-inline-comment.js` (`makeOutput`, `process.exitCode`, never
`process.exit()` after an async write; see the memory note on the select-next pipe truncation).

```js
// Pure core: no fs, no git. Callers inject readFile(path) -> string | null.
function anchorOf(f) {           // code_review uses file_line; pr_conformance uses ref
  const raw = f.file_line ?? f.ref ?? "";
  const m = /^(.+?):(-?\d+)$/.exec(String(raw).trim());
  return m ? { path: m[1], line: Number(m[2]) } : null;
}
const norm = (s) => String(s).replace(/\s+/g, " ").trim();

function checkAnchors(findings, { readFile }) {
  const cache = new Map();                    // SC-7: one read per distinct path
  return findings.map((f) => {
    const a = anchorOf(f);
    if (!a) return { id: f.id, verdict: "no-line" };
    if (!cache.has(a.path)) cache.set(a.path, readFile(a.path));
    const text = cache.get(a.path);
    if (text == null) return { id: f.id, verdict: "no-such-file", ...a };
    const lines = text.split("\n");
    if (text.endsWith("\n")) lines.pop();     // the trailing newline is not a line
    if (a.line < 1 || a.line > lines.length)
      return { id: f.id, verdict: "out-of-range", ...a, lineCount: lines.length };
    if (f.line_text == null || f.line_text === "")
      return { id: f.id, verdict: "unchecked-text", ...a };
    const actual = norm(lines[a.line - 1]);
    return norm(actual).includes(norm(f.line_text))
      ? { id: f.id, verdict: "ok", ...a }
      : { id: f.id, verdict: "text-mismatch", ...a, expected: f.line_text, actual };
  });
}
```

`ref` values such as `"AC-3 / scripts/smoke/slugify.js:8"` (what the conformance lens actually
emitted on PR #594) do not match the anchored regex and become `no-line`. That is deliberate: a
compound ref is not an anchor. Assert it in a test so the behaviour is chosen, not accidental.

CLI:

```
node finding-anchors.js --findings-file <json> [--root <dir>] [--rev <git-rev>] [--json]
```

- The input JSON is either `{code_review:{findings:[…]}}`, `{pr_conformance:{findings:[…]}}`, both
  together, or a bare array. Accept all four; that is the shape the callers already hold.
- `readFile`: with `--rev`, use `execFileSync("git", ["show", `${rev}:${path}`], {cwd: root})` and
  return `null` on a non-zero exit. Without it, use `fs.readFileSync(path.join(root, p))` and return
  `null` on `ENOENT`. Refuse a `path` that resolves outside `root` (`..`) as `no-such-file`.
- Output `{ reason: "ok" | "malformed-anchors", results: [...], exitCode }`. Exit 1 iff any result is
  `no-such-file`, `out-of-range` or `text-mismatch`. A usage error exits 2 with `reason: "usage"`.

### Phase 3: Wire the four dispatchers

The same three moves at every site: **check → mark → filter**. Each call sits in the **same fenced
block** as the variables it reads (code-review-prompt check E: every block is its own shell).

**`skills/review-pr/SKILL.md` Step 6**, before "Render findings":

```bash
command node .agents/skills/review-pr/references/finding-anchors.js \
  --findings-file "$FINDINGS_JSON" --root "$(git rev-parse --show-toplevel)" \
  --rev "origin/$HEAD_BRANCH" --json > "$ANCHORS_JSON"
# exit 1 = malformed anchors exist: NOT a halt. Read results[], mark, continue.
```

`$FINDINGS_JSON`, `$HEAD_BRANCH` and `$ANCHORS_JSON` must be bound in that block, or replaced by
`{placeholders}`. On the API-diff fallback route (cross-fork or merged), `--rev` takes the PR head SHA
from `gh pr view --json headRefOid` instead.

- Rendering: after `— {ref}`, append ` ⚠️ unverified anchor ({verdict})` for the three malformed
  verdicts.
- Machine-readable block: add `anchor: {verdict}` to each entry. Update the template, and update the
  "four rules" paragraph so it names the new key.
- `--inline` jq: add `select(.anchor == "ok" or .anchor == "unchecked-text")` before the shape filter.
  Malformed findings fall through to the summary comment, which is already posted regardless.

**`skills/review-code/SKILL.md`**: the same check before the render step. The `--inline` jq at the
`select((.file_line? // "") | test("^.+:[0-9]+$"))` line gains the anchor filter. In `--fix`, skip a
malformed finding and list it as "skipped — unverified anchor". Editing a line the reviewer
mislocated is the one outcome worse than not fixing it.

**`skills/qa-task/SKILL.md` Step 3b and `skills/qa-story/SKILL.md` Phase 1.6**: the check comes right
after the subagent returns and before the "Gate mapping" item. A malformed finding still renders in
`## Code Review`, with the marker. In the `top_issues[]` mapping, its `finding` text gains
`(location unverified: {file_line})`, so `/qa-fix` is not sent to a line as though it were verified.
The gate rules are not otherwise changed: a high-confidence bug is still a bug.

Then run `npm run bundle` and `npm run bundle:check`. Each of the four skills gains
`references/finding-anchors.js`, because a bare mention in `SKILL.md` is a dependency.

### Phase 4: Population guard

**`evals/shared/tests/finding-anchors-callers.test.mjs`**:

```js
// Population: every skills/*/SKILL.md whose text dispatches the code reviewer.
// Key on a compound pattern, not the bare filename: `code-review-prompt.md` alone
// also appears in skills that only cite it (obs #135, shared-token keys).
// Real spellings (2026-10-07): qa-task:559 / qa-story:1026 "with the prompt from `references/…`",
// review-code:73 "with the prompt from [`references/…`](…)" (a link), review-pr:571
// "pass the **Prompt Template** from [`references/…`](…)".
const DISPATCH = /(prompt|Prompt Template\*\*) from \[?`references\/code-review-prompt\.md`/;
```

Measured on 2026-10-07:
`git grep -nE '(prompt|Prompt Template\*\*) from \[?`references/code-review-prompt\.md`' -- 'skills/*/SKILL.md'`
returns exactly `qa-story/SKILL.md:1026`, `qa-task/SKILL.md:559`, `review-code/SKILL.md:73` and
`review-pr/SKILL.md:571`. A first draft without the `\[?` missed review-code, which spells the
reference as a link. Re-measure before freezing the regex. Then assert each file contains
`finding-anchors.js`, and assert `population.length >= 4` (the non-vacuity floor).

Mutation proof (SC-11): delete the call from `skills/qa-story/SKILL.md` and run the test (it must go
red); restore it. Delete the `includes(norm(f.line_text))` comparison and run the unit tests (the
long-file control must go red); restore it. Use a scratch copy or `git stash` on a clean tree only;
see observation #225 on stash pops.

## Key Patterns and References

- Engine conventions: `registry-tick.js` (header comment that explains the *why*, `--json` `reason`,
  `process.exitCode`), and `pr-inline-comment.js` (`makeOutput`, injectable exec for tests).
- Run engines with `command node`, never bare `node`: `node` is an nvm shell function on this machine.
- Do not hand-edit any `skills/*/references/` copy. Edit `shared/resources/` and bundle.
- `evals/shared/tests/pr-review-loop-parity.test.mjs:1125-1142` asserts the `ref` ← `file_line`
  normalisation sentence. Keep that sentence verbatim when editing Step 6.

## Testing Approach

- Unit: `shared/resources/tests/finding-anchors.test.mjs`, with an injected `readFile`. Fixtures are
  inline strings: an 11-line file (the PR #594 shape) and a 120-line file (the long-file control).
- `--rev`: create a temporary git repo in `os.tmpdir()`, commit a file, then change it in the working
  tree, and assert that the checker reads the committed version.
- Integration: `/review-pr 594`, with the result recorded in the QA report.
