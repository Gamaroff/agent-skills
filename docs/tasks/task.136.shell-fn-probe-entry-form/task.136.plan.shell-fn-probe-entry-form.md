---
id: task.136.plan
title: "Implementation Plan: shell-fn: probe entry form and fake-gh affordance"
type: plan
task-ref: task.136.shell-fn-probe-entry-form.md
---

# Implementation Plan: `shell-fn:` probe entry form and fake-`gh` affordance

> Requirements and success criteria: [task.136.shell-fn-probe-entry-form.md](task.136.shell-fn-probe-entry-form.md)

## Overview

A third arm on `runProbeSpec`, fixture-first. Everything the arm needs — fixture materialisation, the shell list, the timeout, `compareExpected`, `computeVerdict` — already exists for the `shell:` arm; the new code is the entry parser branch, the command line the arm spawns, and a `PATH` prepend. The task.125 failure (`bash gh-labels.sh <fixture>` — sourced and exited, function never called) is the mutation the green row must go red on.

## Phase-by-Phase Implementation Guide

### Phase 1: Fixtures and red rows

**Files to create:**

- `tests/fixtures/fake-gh/gh` (mode 755):

```bash
#!/usr/bin/env bash
# fake gh — a fixture, not a mock framework. Refuses to run outside the probe.
[ "${FAKE_GH:-}" = "1" ] || { echo "fake gh invoked outside the probe (FAKE_GH unset)" >&2; exit 2; }
case "${1:-} ${2:-}" in
  "label list")
    # gh_labels_filter passes --json name -L <n> -q '.[].name'; answer the -q form
    printf '%s\n' priority:high priority:medium priority:low task bug ;;
  "issue create")
    printf '%s\n' "$@" >> "${FAKE_GH_LOG:-/dev/null}"; echo "https://example.invalid/issues/1" ;;
  *) echo "fake gh: unsupported subcommand: $*" >&2; exit 2 ;;
esac
```

- `tests/fixtures/shell-fn/echo-unfiltered.sh` — `echo_all() { printf '%s\n' "$@"; }` and nothing else.
- `tests/fixtures/shell-fn/syntax-error.sh` — a file with an unclosed `if`.

**Files to modify:** `shared/resources/tests/security-probe.test.mjs` — a new block after the `// A boundary delivered as a bash script is reached through shell:<path>` block (around the `FIXED_SCRIPT` / `PREFIX_SCRIPT` constants), same shape:

```js
const FN_ENTRY = "shell-fn:shared/resources/gh-labels.sh#gh_labels_filter";
const FAKE_GH = "tests/fixtures/fake-gh";

test("resolveEntry: shell-fn:<path>#<fn> resolves with kind shell-fn", () => {
  const r = resolveEntry(FN_ENTRY, REPO_ROOT);
  assert.equal(r.ok, true); assert.equal(r.kind, "shell-fn"); assert.equal(r.fnName, "gh_labels_filter");
});
test("resolveEntry: shell-fn: without # is bad-entry naming the form", () => { … });
// containment: mirror the three shell: rows (/etc/passwd, node_modules, NUL) with the shell-fn: prefix

test("shell-fn: gh_labels_filter engages against the label corpus behind the fake gh", () => {
  const r = runProbeSpec({ sink: "filename", entry: FN_ENTRY, fakeGh: FAKE_GH });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases.filter(c => c.mismatches.length), null, 1));
  assert.equal(r.totals.executed, r.cases.length * probeShells().length);
});
test("shell-fn: a function that echoes unfiltered is absent", …);
test("shell-fn: a library that fails to source is unverifiable with exit 97 on every case", …);
```

The `filename` sink's cases need `expected.stdout` for a label filter: derive it in the test from the fixture label set (legitimate candidate present in the set → printed; hostile → empty), rather than hand-typing strings. If the existing `filename` corpus's `expected` does not fit the filter's contract, add a `label` shape to `security-input-corpus.{md,mjs}` in this phase and extend the schema test — do not bend `filename`.

### Phase 2: Entry resolution and the runner

**Files to modify:** `shared/resources/security-probe.mjs`

*`resolveEntry`* — beside `SHELL_PREFIX`:

```js
export const SHELL_FN_PREFIX = "shell-fn:";
…
const isShellFn = entry.startsWith(SHELL_FN_PREFIX);
if (isShellFn) {
  const body = entry.slice(SHELL_FN_PREFIX.length);
  const hash = body.lastIndexOf("#");
  if (hash <= 0 || hash === body.length - 1)
    return { ok: false, reason: "bad-entry", detail: `entry must be "shell-fn:path#function", got "${entry}"` };
  rawPath = body.slice(0, hash); fnName = body.slice(hash + 1);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fnName))
    return { ok: false, reason: "bad-entry", detail: `"${fnName}" is not a shell function name` };
}
// …existing containment on rawPath…
return isShellFn ? { ok: true, kind: "shell-fn", entryPath, fnName } : /* existing */;
```

*The runner arm* — factor the `shell:` arm's per-case loop so both arms call one `runShellCase(shell, argv, { cwd, env, timeout })`; the `shell:` arm passes `[entryPath, fixturePath]`, the new arm passes:

```js
const noRc = shell === "zsh" ? ["-f"] : ["--noprofile", "--norc"];
const argv = [...noRc, "-c",
  'source "$1" || exit 97; shift; fn="$1"; shift; "$fn" "$@"',
  "probe", entryPath, fnName, ...caseArgv(c)];
const env = { ...process.env, LC_ALL: "C", FAKE_GH: fakeGh ? "1" : undefined,
              PATH: fakeGh ? `${resolve(fakeGh)}:${process.env.PATH}` : process.env.PATH };
```

`caseArgv(c)` is the case's input as one argument (the `filename`/`label` sink's `input` string). Exit 97 is reserved: `compareExpected` already names `exit 97 ≠ 0`; add a `reason: "source-failed"` to `computeVerdict` only if every case exits 97 — otherwise the ordinary mismatch path applies.

*`--fake-gh <dir>`* on `main`: `resolve` against `--repo-root`, require `existsSync(join(dir, "gh"))` and `X_OK`, else `reason: "bad-fake-gh"` (exit 2, same family as `bad-entry`). Record `fakeGh: dir` on the run.

**Mutation proofs** (record both in the implementation report):

1. Replace the command line with `[entryPath, ...caseArgv]` (the task.125 shape) → the green row reads `absent`.
2. Drop the `PATH` prepend → `gh label list` fails → `gh_labels_filter` prints nothing → `absent`.

### Phase 3: The rule and the two prompts

- `shared/resources/probe-boundary-rule.md` — in the paragraph that carries task.128's header signal, add: *a file whose header says "source it" or that defines functions and makes no top-level call is a library: probe it with `shell-fn:<path>#<function>`, and if its body names `gh`, add `--fake-gh tests/fixtures/fake-gh` so the call is answered by the fixture rather than the network.*
- `shared/resources/finalise-dod-security-prompt.md`, `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` Step 3b — extend the sentence that names `shell:` to name `shell-fn:` and `--fake-gh`, citing the rule file for the signal. Grep `evals/shared/tests/*.test.mjs` for the current sentence before editing; the pinned copy is updated in the same commit.

### Phase 4: Bundle, evidence, CHANGELOG

- `npm run bundle`, `npm run bundle:check`.
- From the repository root: `command node shared/resources/security-probe.mjs --sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --fake-gh tests/fixtures/fake-gh --json` — paste `verdict`, `reason`, `totals` into the implementation report.

## Key Patterns and References

- `security-probe.mjs` § "THE SHELL ENTRY FORM (task.128)" — the comment block that explains why no interpreter is on `SAFE_COMMANDS` and why the shell arm is a form, not a second engine. The new arm's comment sits under it and says the same for a function.
- Every arm **returns** a verdict; nothing calls `process.exit()` (bug.3, `stdout-drain-on-exit.test.mjs`). `--fake-gh` validation returns `{ verdict: "unverifiable", reason: "bad-fake-gh" }` from `main`, it does not throw.
- `gh-labels.sh` reads labels with `gh label list --json name -L "$GH_LABELS_LIST_LIMIT" -q '.[].name'` — the fake answers that exact shape, one name per line.

## Testing Approach

- `command node --test shared/resources/tests/security-probe.test.mjs` for every row; `npm run ci:fast` for the prompt-contract and bundle-freshness guards.
- shellcheck on `tests/fixtures/fake-gh/gh`.
- Under zsh the Bash tool's shell: the green row must pass with `probeShells()` = `["bash", "zsh"]` — assert the record's `shells` lists both on a host that has zsh.
