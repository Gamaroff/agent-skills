---
id: task.320.plan
title: "Implementation Plan: Task 319's leftover findings are closed"
type: plan
task-ref: task.320.task-319-leftover-findings.md
---

# Implementation Plan: Task 319's leftover findings are closed

> Requirements and success criteria: [task.320.task-319-leftover-findings.md](task.320.task-319-leftover-findings.md)

## Overview

Four shared scripts and one export, each changed in a few lines. The snippets below were run once at
`b005792a9` in a scratch clone (task document § 3, which names the one part that was not exercised). Write each test first and see it red.

Edit `shared/resources/` only. `npm run bundle` makes the copies.

## Phase-by-Phase Implementation Guide

### Phase 1: The re-run engine

**`shared/resources/criteria-section.js`** — add `makeFenceTracker` to `module.exports`.

**`shared/resources/finalise-rerun-at-head.js`**, T319-CR-1201, in `run`, where `entries` is null or empty:

```js
const fenced = makeFenceTracker();
const parts = [[]];
for (const line of body.split(/\r?\n/)) {
  if (!fenced(line) && line.startsWith("## ")) parts.push([]);
  parts.at(-1).push(line);
}
const under = parts
  .filter((part) => /^## .*(?:criteri|\bAC[ -]?\d)/i.test(part[0] ?? ""))
  .map((part) => part.slice(1).join("\n"))
  .join("\n");
// `entries === null`: the reader knows no heading of this document, so none of them narrows the search
const where = entries === null || under.trim() === "" ? body : under;
```

T319-CR-1202: the loop of `lazilyNamed` becomes `lazyTexts(body)`, which returns `whole`;
`lazilyNamed(list, whole, texts)` keeps the comparison. In the backtick check:

```js
const lost = list.find(
  (c) => !whole.includes(c) && (shows(raw, c) || shows(joined[i], c)),
);
```

`joined` is `lazyTexts(body)`. It has one entry per criterion, in the reader's order: both start a
criterion on the same two expressions.

T319-CR-1203, in `differing`, before the `core.ignorecase=false` loop, and one call in it:

```js
const subs = new Map();
for (const [f, { mode }] of tree)
  if (mode === "160000") subs.set(folded(f), f);
const besideSub = (f) => {
  const parts = f.split("/");
  for (let i = 1; i < parts.length; i++) {
    const d = parts.slice(0, i).join("/");
    const s = subs.get(folded(d));
    if (s === undefined || s === d) continue;
    const [a, b] = [lstat(d), lstat(s)];
    if (!b || a?.ino !== b.ino || a.dev !== b.dev) return true;
  }
  return false;
};
```

`links`, a few lines below, is a wider set: it also takes the gitlinks of the index, in the loop that
runs after this one. The snippet reads the commit's tree only, as the trial did. A submodule that is
staged and not in the head is already `bad` by the index comparison. A nested repository `SUB/` is listed with a trailing slash; the walk covers it.

Test cases: the rows of the task document's first table. The neighbours to extend are the tests
named T319-CR-805, T319-CR-1003, T319-CR-1005 and T319-CR-1002.

### Phase 2: The push and the tick

**`shared/resources/push-held.sh`**, T319-CR-1303, in `bounded`, after `rc=${rc:-$?}`:

```bash
# killed, and the time is up: the watcher's doing while this script was stopped, which is a timeout
if [ "$rc" -eq 137 ] && [ "$SECONDS" -gt "$end" ]; then rc=124; fi
```

T319-CR-1302, at the fetch. `why` is read before the second question, because that one writes `$OUT`:

```bash
bounded "$ASK_SECONDS" git fetch --quiet --no-tags --no-recurse-submodules origin "refs/heads/$BRANCH"
rc=$?
WHY=$(why "$rc" "$ASK_SECONDS")
[ "$rc" -eq 0 ] || local_git cat-file -e "$REMOTE^{commit}" \
  || refused "origin's $BRANCH has another commit, which could not be fetched ($WHY)"
```

`WHY` is also the name the push uses at the end of the script. The two never meet; keep it so.

Test for 1302: create `.git/refs/remotes/origin/feature/x.lock`, with the remote one commit ahead. Its
second half exists already: the partial-clone case beside T319-CR-1103 must stay green, unchanged.

Test for 1303: a `post-receive` hook that sleeps, `PUSH_HELD_SECONDS=3`, SIGSTOP to the script after
1.5 s and SIGCONT 11 s later. The control is a pre-push hook that runs `kill -9 $PPID` inside the bound.

**`shared/resources/tick-pr.sh`**, T319-CR-1304, in `landed`:

```bash
for at in $(cd "$(git rev-parse --show-toplevel)" && git diff-tree -r -z --no-renames --name-only "$from" "$1" \
  | GIT_LITERAL_PATHSPECS=1 xargs -0 git rev-list --first-parent "$from..$base" --); do
```

Do **not** use `git -C … rev-list`: the T319-CR-902 test recognises the call by its first words, and
goes red. A `cd` at the top of the script is wrong too: the quality gate would run in another directory.

T319-CR-1301, one paragraph in the header comment, near `landed`: a tick whose conflict was resolved on
the forge, and which was squashed with its branch deleted, reads `resume`. Nothing is deleted. Close the
second PR by hand, and delete the local tick branch.

### Phase 3: The configuration

**`shared/resources/ci-tree-equivalence.js`**:

```js
/** A key as YAML reads it: the subset keeps an escape in a quoted key as text. */
const unescaped = (s) =>
  String(s).replace(
    /\\(?:x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8}))/g,
    (_, x, u, U) =>
      String.fromCodePoint(Math.min(parseInt(x ?? u ?? U, 16), 0xfffd)),
  );
const normKey = (k) => unescaped(k).toLowerCase().replace(/[-_]/g, "");
```

Export `unescaped` and use it in `listKeyRows`, whose own copy goes. An escaped `docsOnly` is refused
today as an unknown key of `ci`; after this its message names the near miss instead.

In `skipMarkerOf`, the character test reads `v`, and the length still reads the trimmed `m`:

```js
if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v) || [...m].length > SKIP_MARKER_MAX) {
```

### Phase 4: Records and bundle

- `docs/reference/configuration.md`: the `ci.skipMarker` row (spaces at the ends are dropped, anything
  else at the ends is checked), the "configuration is strict" paragraph and the
  `pipeline.pushRecordCommits` row (an escaped block name is refused), the `developNext.tickVia` row
  (the T319-CR-1301 limit).
- `skills/develop-next/SKILL.md` § "How the tick is pushed": the limit, after the `landed` sentence.
- `CHANGELOG.md` `[Unreleased]`.
- Task 319 § Deferred Work: add "closed by task 320" to each entry, with a Change Log row written by
  `change-log.js`.
- `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- Every test drives the real CLI or script in a temporary repository, with `GIT_CONFIG_GLOBAL=/dev/null`.
- A comment names its finding id, as the neighbours do.
- Cite a sibling by bare filename inside `shared/resources/`.

## Testing Approach

Four suites on the laptop are about two minutes. The rest runs on the LAN server: `npm run test:remote`.
Mutations: revert each snippet above alone, and name the test that goes red.
