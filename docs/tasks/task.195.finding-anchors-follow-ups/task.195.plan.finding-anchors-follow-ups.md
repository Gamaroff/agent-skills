---
id: task.195.plan
title: "Implementation Plan: Finding-anchors follow-ups"
type: plan
task-ref: task.195.finding-anchors-follow-ups.md
---

# Implementation Plan: Finding-anchors follow-ups

> Requirements and success criteria: [task.195.finding-anchors-follow-ups.md](task.195.finding-anchors-follow-ups.md)

## Overview

Engine first (three additive changes), then the dispatcher blocks that consume it, then `/review-pr`'s
head binding, then the consumers and the guard. Every behaviour change lands in a fenced block a test
extracts and runs (obs #258).

## Phase-by-Phase Implementation Guide

### Phase 1: Engine — `shared/resources/finding-anchors.js`

**Lens by key.** Replace `anchorOf`'s `file_line ?? ref` with an explicit lens:

```js
const MALFORMED = new Set(["no-such-file", "out-of-range", "text-mismatch", "unparseable"]);

/** `{lens, path, line}` or `{lens, path: null}` — the lens is the KEY the finding carries. */
function anchorOf(f) {
  const lens = Object.prototype.hasOwnProperty.call(f, "file_line") ? "code" : "conformance";
  const raw = lens === "code" ? f.file_line : f.ref;
  const m = /^(\S+):(-?\d+)$/.exec(String(raw ?? "").trim());
  return m ? { lens, path: m[1], line: Number(m[2]) } : { lens, path: null };
}
```

In `checkAnchors`: `if (a.path === null) return { id, verdict: a.lens === "code" ? "unparseable" : "no-line" };`.
Update the header's verdict table (add `unparseable`, narrow `no-line` to "a conformance `ref`").

**Root in the rev tree.** In `checkTree`, after `resolveRev` succeeds:

```js
try {
  const t = exec("git", ["cat-file", "-t", `${sha}:./`], { cwd: absRoot, encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (t !== "tree") throw new Error(t);
} catch {
  return { ok: false, reason: "bad-root",
    message: `--root '${root}' is not in ${rev} — pass the root of the tree that was reviewed; no anchor was checked` };
}
```

Verified 2026-10-07: from a directory absent in `HEAD`, `git cat-file -t HEAD:./` fails rc 128
(`path 'newdir/' exists on disk, but not in 'HEAD'`); from one present, it prints `tree`.

**`--index`.** Add to `parseArgs` as a boolean flag; `run()` refuses `--index` with `--rev` as usage
(exit 2). `checkTree({ root, rev, index })`: with `index`, require
`git rev-parse --is-inside-work-tree` = `true` from the root, else `bad-root`. `makeReader` gains an
`index` route:

```js
if (index) {
  try {
    return exec("git", ["cat-file", "blob", `:./${rel}`], { cwd: absRoot, encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
}
```

Verified 2026-10-07: `git cat-file blob :./a.js` from the subdirectory returns the staged content
while the working tree holds another.

**Tests** (`shared/resources/tests/finding-anchors.test.mjs`): the three Unit cases in the task's §8;
reuse the file's `gitRepo()` helper (added in task.194 QA cycle 2) for the rev and index fixtures.

### Phase 2: Dispatcher blocks

The decision that replaces each block's exit-code comment. One shape, at all four sites, inside the
existing fenced block (so `{findings-json}` and the per-skill path stay as they are):

```bash
CHECK_OUT=$(command node .agents/skills/<skill>/references/finding-anchors.js \
  --findings-file "$FINDINGS_JSON" --root "$(git rev-parse --show-toplevel)" \
  <route flag> --annotate "$FINDINGS_JSON" --json 2>/dev/null)
REASON=$(printf '%s' "$CHECK_OUT" | jq -r '.reason // empty' 2>/dev/null)
case "$REASON" in
  ok|malformed-anchors) ;;   # every finding now carries anchor_check — mark, continue
  bad-root|bad-rev|usage) echo "HALT: finding-anchors refused the call ($REASON) — fix the call; never render unchecked anchors as verified"; exit 1 ;;
  *) echo "HALT: finding-anchors did not run (no JSON reason) — check the bundled path; never render unchecked anchors as verified"; exit 1 ;;
esac
```

`<route flag>` per caller: review-pr `--rev "$HEAD_REV"` (Phase 3 binds it); qa-task / qa-story
`--rev HEAD`; review-code none for a working tree, `--index` for `--staged`, `--rev HEAD` for a range
or PR target.

**`--inline` guard**, before each jq (review-pr and review-code):

```bash
FINDINGS_JSON="{findings-json}"   # the file Step 6 / Step 2b annotated
jq -e '[(.code_review.findings[]?, .pr_conformance.findings[]?) | select(has("anchor_check") | not)] | length == 0' \
  "$FINDINGS_JSON" >/dev/null \
  || { echo "HALT: findings are not annotated — run the anchor check first; nothing posted inline"; exit 1; }
```

Keep the existing jq program byte-for-byte after the guard: the jq-run tests extract it with
`jq '(\[[\s\S]*?\])'[\s\\]*"\$FINDINGS_JSON"`.

**New test** `evals/shared/tests/finding-anchors-blocks.test.mjs`: reuse `fencedBlocks()` from
`finding-anchors-callers.test.mjs` (move it to a shared helper if both need it), pick the block that
contains `finding-anchors.js`, substitute `{findings-json}`, and run it with `bash` in a scratch git
repository: (a) no `.agents/skills/<skill>/references/finding-anchors.js` → exit non-zero and
"did not run"; (b) the checker present (symlink the live engine) and one malformed finding → exit 0;
(c) control: one clean finding → exit 0.

### Phase 3: `/review-pr` head SHA

- Step 1b's `gh pr view` field list gains `headRefOid`; bind `HEAD_SHA` from it (GitHub) or from the
  Bitbucket PR JSON's `source.commit.hash`.
- Step 6's block replaces the `HEAD_REV` placeholder:

```bash
HEAD_SHA="{the PR head SHA bound in Step 1b}"
if ! git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null; then
  git fetch -q origin "pull/{pr-number}/head" 2>/dev/null \
    || git fetch -q origin "{head-branch}" 2>/dev/null || true   # GitHub ref, else Bitbucket branch
fi
HEAD_REV="$HEAD_SHA"   # the checker exits 2 bad-rev if it still does not resolve
```

- Test (`skills/review-pr/tests/review-pr.test.js`): extract the Step 6 block, substitute the
  placeholders with a SHA that exists in a scratch repository, put a stub `finding-anchors.js` that
  echoes its argv as JSON (`{"reason":"ok","argv":[…]}`), and assert `--rev <sha>` reached it.
- Remove the "pull/<n>/head as above" wording in the paragraph after the block (obs #293: grep the old
  behaviour, `pull/<n>/head`, before calling the edit done).

### Phase 4: Consumers, population, release notes

- develop-bug verify loop (`:48`): one sentence after the blocking predicate — a blocking finding whose
  `anchor_check` is `no-such-file`, `out-of-range`, `text-mismatch` or `unparseable` still blocks, and is
  carried into the Re-Investigation note and `/qa-fix` as `(location unverified: {file_line})`.
- Population test: replace the `skills/*/SKILL.md` scan with the executed-document scan in the task's §3
  (exclude generated copies by their `AUTO-GENERATED` marker line); `CITE_ONLY` entries with reasons for
  code-review-prompt.md, pr-conformance-prompt.md, develop-pipeline-step-5-6-qa-loop.md,
  double-check, review-security, loop-supervisor; every other member must mention `anchor_check`; floor 5.
- `npm run bundle`, `npm run bundle:check`; CHANGELOG `[Unreleased]` › Fixed.

## Key Patterns and References

- Engine conventions: as task.194 (`--json` `reason`, `process.exitCode`, `require.main` guard).
- `command node`, never bare `node`.
- Never hand-edit a `skills/*/references/` copy.
- Documentation probe (qa-fix Step 3.5): search for the **old behaviour** (`exit 1 = malformed`,
  `pull/<n>/head`, `no-line` for code findings), not only the edited text (obs #293).

## Testing Approach

- Unit: `finding-anchors.test.mjs` (injected `readFile`; scratch git repositories for rev and index).
- Blocks: `finding-anchors-blocks.test.mjs` runs each dispatcher block for real.
- Mutation proofs per SC-10, against copies, restored and compared with `cmp`.
