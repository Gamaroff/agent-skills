---
id: task.140.plan
title: "Implementation Plan: shell-fn sentinel hardening"
type: plan
task-ref: task.140.shell-fn-sentinel-hardening.md
---

# Implementation Plan: shell-fn sentinel hardening

> Requirements and success criteria: [task.140.shell-fn-sentinel-hardening.md](task.140.shell-fn-sentinel-hardening.md)

## Overview

Rows first, then the body. Every change below was proposed by a reviewer on task.136 and **executed under bash and zsh before it was recorded**; the plan reproduces those bodies verbatim so the implementer's job is to land and prove them, not to re-derive them.

## Phase-by-Phase Implementation Guide

### Phase 1: The red rows

Append to the `// ── task.136 …` blocks in `shared/resources/tests/security-probe.test.mjs`, using the existing `FN_FIXTURES`, `LABEL_CASES`, `FAKE_GH` constants and the temp-dir-inside-repo pattern (`mkdtempSync(join(REPO_ROOT, FN_FIXTURES, ".t140-…"))`, removed in `finally`):

```js
test("shell-fn entry: a library that installs its own EXIT trap before a guard is still a named decline (c3-CR-1)", () => {
  // lib: 'trap "true" EXIT\nf() { echo hi; }\n[ -n "$NOPE" ] || exit 1\n'
  // expect: verdict unverifiable, reason entry-not-probeable, executed 0, detail /source .* failed \(exit 97\)/
});
test("shell-fn entry: a set -e library whose top-level command fails is declined, not sourced to completion (PR-review CR-1)", () => {
  // lib: 'set -e\nfalse\nf() { echo reached; }\n'  → entry-not-probeable, executed 0
});
test("shell entry: a script whose body names gh without --fake-gh is needs-fake-gh, same as the shell-fn form (c3-CR-2)", () => {
  // script: '#!/usr/bin/env bash\ngh label list >/dev/null 2>&1; printf "12\\n"\n' via shell:<path>, sink filename, no fakeGh
  // expect reason needs-fake-gh, executed 0; with fakeGh: FAKE_GH it runs (fake answers) and is scored
});
test("shell-fn entry: gh reached as `gh;`, `gh>`, `\"$GH\" api` or through a one-level source is detected (c3-CR-3)", () => {
  // four libs; each without fakeGh → needs-fake-gh; the sourcing lib: 'source "$(dirname "$0")/../../shared/resources/gh-labels.sh"' is NOT
  // followable ($0 is the harness) — use a literal relative path: 'source ../../../shared/resources/gh-labels.sh' resolved against the lib's dir
});
test("resolveEntry: a symlink inside the root that points outside it is refused (symlink limit closed)", () => {
  // mkdtemp under REPO_ROOT/tests/fixtures/shell-fn; symlinkSync("/etc", join(dir,"link")); resolveEntry(`shell-fn:${rel}/link/passwd#f`) → outside-repo-root
  // OR, if the stated-limit alternative is taken: assert ok:true and cite probe-boundary-rule.md §5's accepted-limit sentence in the test name
});
```

Run: all five red (the fourth in four sub-assertions). 66 existing rows green.

### Phase 2: The body and the gates

**`SHELL_FN_BODY`** — replace the first line-group only:

```js
const SHELL_FN_BODY =
  // `exit` is SHADOWED for the duration of the source: a library-installed
  // `trap … EXIT` replaces ours and fires after the shell has already chosen the
  // library's exit code; a function named exit intercepts the CALL, before any
  // trap, and `builtin exit 97` is the sentinel (task.140, c3-CR-1). The source's
  // status is taken as a simple command — on the left of `||` both shells
  // suspend errexit for everything the library runs at top level (PR-review
  // CR-1) — and the explicit test below keeps the non-zero-last-command case.
  `exit() { builtin exit ${SHELL_FN_SOURCE_FAILED}; }; trap 'exit ${SHELL_FN_SOURCE_FAILED}' EXIT; ` +
  `source "$1"; src=$?; trap - EXIT; unset -f exit; [ "$src" -eq 0 ] || exit ${SHELL_FN_SOURCE_FAILED}; ` +
  `shift; fn="$1"; shift; ` +
  … (typeset -f line and the subshell/remap lines unchanged)
```

Verified by the task.136 reviewers: bash 5.3 / bash 3.2 / zsh 5.9 → 97 for own-trap, errexit-mid-file, non-zero-last-command and top-level-exit; 0 for a clean library; the `set -e` + `return 97` row still yields 99.

**`needs-fake-gh` gate** — `if (isShellForm && fakeGhDir === null) {` and a helper:

```js
const GH_COMMAND_WORD = /(^|[\s;|&(`$])gh([\s;|&)>]|$)/m;
const SOURCE_LINE = /^\s*(?:source|\.)\s+["']?([^"'\s;]+)["']?/gm;
function namesGh(entryPath, root) {
  const seen = new Set();
  const texts = [];
  const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
  const first = read(entryPath); if (first === null) return false; texts.push(first);
  for (const m of first.matchAll(SOURCE_LINE)) {                    // ONE level, deliberately
    const raw = m[1]; if (raw.includes("$")) continue;              // a variable path is not followable
    const p = isAbsolute(raw) ? raw : resolve(dirname(entryPath), raw);
    if (relative(root, p).startsWith("..") || seen.has(p)) continue; // outside the root: not ours to read
    seen.add(p); const t = read(p); if (t !== null) texts.push(t);
  }
  return texts.some((t) => GH_COMMAND_WORD.test(t));
}
```

**Dead clause** — `const isShell = entry.startsWith(SHELL_PREFIX);` with a one-line comment that the two prefixes are disjoint.

**`resolveEntry` realpath** (option A):

```js
const root = realpathSafe(resolve(repoRoot));
let entryPath = isAbsolute(rawPath) ? resolve(rawPath) : resolve(root, rawPath);
entryPath = realpathSafe(entryPath);            // realpathSync when it exists, else unchanged
// realpathSafe = (p) => { try { return realpathSync(p); } catch { return p; } }
```

Both sides realpath'd so a symlinked checkout root compares equal to itself. If this refuses a legitimate symlinked install in the row Risk 2 asks for, take option B: keep the lexical check, keep the `shellfn.symlink-escape` reproduction, and write the accepted-limit sentence + row.

**Mutation proofs** (snapshot with `cp`, restore from the snapshot): revert the `exit` shadow → own-trap row red; revert `src=$?` to `|| exit 97` → errexit row red; gate back to `kind === "shell-fn"` → the `shell:` row red; terminators back to `(\s|$)` → `gh;` sub-assertion red; drop the one-level follow → source sub-assertion red; drop `realpathSafe` → symlink row red.

### Phase 3: The lint lanes

In **both** `scripts/lint-shell.sh` and `.github/workflows/shellcheck.yml`, after the `git ls-files '*.sh' | grep -v …` selection:

```bash
# Executable fixtures with no extension: a tracked file under tests/fixtures/ whose
# first line is a bash shebang (task.140 — the fake gh lived outside both lanes).
while IFS= read -r f; do
  [ "$(head -c 21 "$f")" = "#!/usr/bin/env bash" ] && FILES+=("$f")
done < <(git ls-files 'tests/fixtures/*' | grep -vE '\.(sh|json|md|txt)$')
```

(`mapfile` form in the workflow, to match its style.) Confirm `npm run lint:shell` prints `linting 75 source shell scripts` and stays `< 200`. Prove the lane sees the file: `cp tests/fixtures/fake-gh/gh /tmp/gh-bad; echo 'x=$1; echo $x' >> /tmp/gh-bad; shellcheck --severity=warning /tmp/gh-bad` → SC2086 — then, in a scratch worktree only, put the bad line into the tracked fixture and run `bash scripts/lint-shell.sh` → red; discard the worktree.

### Phase 4: Rule, bundle, CHANGELOG

`probe-boundary-rule.md` §5 sentinel paragraph: replace "An EXIT trap is armed around the `source`, so a top-level `exit` … is the same named decline" with the shadowed-`exit` + status-capture sentence, naming the two library shapes it closes; fake-gh paragraph: "a library **or script** whose text — or the text of a file it `source`s at top level — names `gh`"; symlink: delete the limit sentence (option A) or rewrite as owned (option B). `npm run bundle`; `bundle:check`; CHANGELOG `[Unreleased]` → `### Fixed`.

## Key Patterns and References

- `security-probe.mjs` § "THE SHELL-FN ENTRY FORM (task.136)" — extend the comment block; do not add a second one.
- The `cp`-snapshot mutation discipline in `references/mutation-proving.md`.
- `scripts/lint-shell.sh` header — "when one changes, change the other in the same commit".

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs` per phase; `npm run ci:fast`; `npm run lint:shell`; `npm run bundle:check`.
- Re-run task.136's evidence command from the repo root and paste `verdict`/`executed` into the implementation report — the green path is the regression check.
