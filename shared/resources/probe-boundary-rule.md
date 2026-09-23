# The probe boundary rule

> The argument beside the mechanism. `security-probe.mjs` is the mechanism; this
> file is why it is shaped the way it is, and what it may not claim. Read this
> before changing either.

Pairs with [`qa-runnable-prose-detection.md`](qa-runnable-prose-detection.md),
which does the same job for the snippet path.

---

## 1. Why a probe is not a snippet

`qa-execute-snippets.mjs` executes **text extracted from a markdown fence**. The
document chooses the command; the harness only decides whether to allow it. That
is why its safety model is an allow-list that fails closed, and why `bug.3` and
`bug.6` between them document **26 routes past that classifier** — every one of
them a way of writing a command that reads as safe and is not.

A probe is a different trust class:

| | Snippet execution (task.67) | Probe execution (task.80) |
| --- | --- | --- |
| Subject | text extracted from a markdown fence | a named export in this repository |
| Who chooses the command | the document | the engine |
| Caller supplies | the whole command line | a module path, an export name, and input **values** |
| Gate | command allow-list | resolved-path containment; inputs never reach a shell |

The engine constructs its own runner. The caller never names a command, so there
is no command to allow-list. Inputs cross to the child as **JSON on stdin** —
never interpolated into a shell string, never placed on argv — so no
caller-authored value is ever parsed as code.

## 2. The refusal: `node` must never join `SAFE_COMMANDS`

**This is the shortcut, and it is refused.**

Making a probe runnable through the snippet path requires an interpreter on
`SAFE_COMMANDS`. It is one line. It looks like a small change. It is not.

`SAFE_COMMANDS` gates untrusted prose. Adding `node` to it does not make *probes*
runnable — it makes **every fenced bash block in every document** able to run
arbitrary code through the QA path, because the classifier cannot tell a probe's
`node` from a document's `node`. The allow-list stops being an allow-list at the
moment it admits a general-purpose interpreter: everything behind it becomes
reachable by writing four characters inside a fence.

The 26 documented fail-open routes are the evidence for how hard that boundary
already is to hold **while it excludes interpreters**. Widening it is not a
one-line change to a list; it is a decision to stop having the boundary.

This refusal is asserted in code, not only here:

```
shared/resources/tests/qa-execute-snippets.test.mjs
  → "task.80 parity: no interpreter is on the snippet allow-list"
```

That test enumerates `node`, `nodejs`, `python`, `python3`, `ruby`, `perl`,
`php`, `deno`, `bun` and `osascript` against both `SAFE_COMMANDS` and
`COMMAND_RUNNERS`. If you are reading this because that test went red, the
answer is not to update the test.

## 3. How the verdict is derived — the load-bearing inference

The corpus (`security-input-corpus.mjs`, task.79) gives each case a `correct`
field, and `correct` is **human-readable prose**. "REJECT a host component
containing `/`, `?`, `#`, `@` or whitespace" is an instruction to a reader, not a
predicate a machine can evaluate.

So "hostile cases handled as `correct` says" is derived from `direction`, which
is the machine-readable half of the same statement:

- **hostile** → the control *should* reject. An accepted hostile case means the
  vulnerability **reproduces**.
- **legitimate** → the control *should* accept. A rejected legitimate case is
  **over-blocking**.

A control "rejects" by throwing, or by returning `null` / `undefined` / `false` —
the non-throwing rejection shape a validator commonly uses. Treating a `false`
return as acceptance would score a working control as absent.

The verdict branches, in the order they are checked:

| Condition | Verdict | Why |
| --- | --- | --- |
| nothing executed | `unverifiable` | Zero cases is never a pass. This is the defect the whole series exists to close. |
| no **hostile** case executed | `unverifiable` | Legitimate cases alone are evidence the function runs, not that it guards. |
| a hostile case reproduced, **none** rejected | `absent` | Nothing is filtering anything. |
| a hostile case reproduced, **some** rejected | `present-but-inert` | A control demonstrably **exists** and demonstrably let a hostile case through. |
| none reproduced, ≥1 legitimate accepted | `engages` | The control holds and does not block real traffic. |
| none reproduced, **0** legitimate accepted | `unverifiable` | See §3.2. |

### 3.1 `present-but-inert` is the high-severity verdict

Worse than `absent`, and the ordering is not intuition. An absent control is a
gap someone will eventually notice. An inert one has **already been reviewed and
believed** — a reader opened the file, saw a validation branch, and moved on. The
probe is the only thing that distinguishes them, because from the source they
look identical.

The fixture that produces it (`tests/fixtures/security-probe/inert-control.mjs`)
rejects whitespace and `@` and passes `/`. A reviewer reading it sees a control.

### 3.2 A function that rejects *everything* does not engage

This is the branch most likely to be removed by someone simplifying the logic, so
it is stated plainly: **`engages` requires at least one legitimate case to pass.**

A stub that throws unconditionally rejects every hostile case. Under the naive
rule "no hostile case reproduced → engages", an unimplemented control scores a
clean probe. That is the same failure as a self-reported `probes_executed: 0`,
wearing different clothes — a control that was never written reporting that it
works.

So: hostile-rejection alone is not evidence of a control. It is evidence of *a
function that says no*, which is also what a `throw new Error("TODO")` is.

## 4. `declined` is its own state

`declined` is **never** folded into `executed: 0`.

Both render as "nothing ran", and they answer different questions:

- `executed: 0` — the engine reached the target and found nothing to run.
- `declined` — the engine refused, or could not reach the target at all.

Collapsing them makes a broken probe indistinguishable from a clean one. This is
the defect `task.73` chased through four QA cycles, and `bug.7` documents the
same shape one layer up.

Declining conditions, each reported with its reason:

| `reason` | Meaning |
| --- | --- |
| `bad-entry` | The entry spec is not `path#exportName`. |
| `outside-repo-root` | The resolved path escapes the containment root. |
| `unknown-sink` | No corpus for that sink. `corpusFor` throws rather than returning `[]`, deliberately. |
| `entry-not-probeable` | The module would not import, or the export is not a function. |
| `case-errored` | One case timed out or its child never ran. |

## 5. Containment, and what it does not cover

**What the engine does:**

- Resolves the entry path and rejects anything outside the repository root
  **before importing**. `import()` runs the module's top level, so a post-hoc
  check would fire after arbitrary code had already executed. The check is on the
  *resolved* path, so `a/../../etc/x` is caught and a legitimate relative path
  containing `..` is not refused for looking suspicious.
- Runs each case in **its own child process**, so a hang, a throw or a
  `process.exit` is contained and attributable to one case rather than killing
  the run.
- Gives the child the same **minimal environment** as the snippet path —
  `sandboxEnv()` from `qa-execute-snippets.mjs`, six keys, an allow-list — so no
  parent token reaches a probe.
- Watches a **sentinel directory** beside the working copy with `snapshotTree()`
  and reports any write that escapes, whatever the probe claimed to do.
- Takes its per-case timeout from the **shared spawn budget**
  (`spawn-budget.mjs`), never a literal.

**What it does not do, stated honestly:**

- **There is no OS-level sandbox.** The module under probe runs with full Node
  privileges — exactly as `qa-runnable-prose-detection.md` §3aa already says of
  the snippet path. The containment contains *the harness*, not the repository.
- **A symlink that points out of the tree resolves at import time**, after the
  path check. Node offers no cheap pre-import realpath guarantee for a path that
  may not yet exist. This is a limit, not a defence.
- **The engine reaches four entry forms, and "not importable" is not a decline.**
  `path#export` imports a JS module; `shell:path` runs a **shell script that
  takes one positional argument** — `bash <script> <fixture-dir>` per case, under
  bash and (when the host has it) zsh, with the script and directory passed as
  argv, never as a string, stdin closed, `sandboxEnv()` plus `LC_ALL=C`. A sink
  the corpus marks *materialised* (`MATERIALISED_SINKS`; today `filename`) is
  written to a fixture directory beside its bracketing controls, and the case's
  `expected` — stdout, exit, stderr, paths that must be absent — is what the run
  is compared against. Same case loop, same verdict, same record, and each
  (case, shell) run is one executed probe. **A bash boundary that was recorded
  `boundary: false` because it had no export was the task.121 failure** (five
  gates at `probes_executed: 0` against a script that says it refuses rather
  than guesses); the shell form is what removes that reason for zero. It does
  not soften the guard: zero executed is still `unverifiable`.

  **`shell-fn:path#function` sources a library and calls the function** with the
  case's input as its argv, per case under the same shells, with rc files off
  (`bash --noprofile --norc` / `zsh -f`) on top of the sandbox `HOME` — because
  this form sources *into* the shell, where `shell:` only ever runs `bash
  <script>`. **The header signal that tells the two shell forms apart:** a file
  whose header says *source it* (`source references/x.sh || exit 1`, then call
  `fn`), or that defines functions and makes **no top-level call**, is a
  library — probe it with `shell-fn:`. Run through `shell:` such a file defines
  its function and exits 0 with nothing on stdout, so every case mismatches and
  the verdict reads `absent` behind a full count with `escaped 0` — **the
  task.125 result** (`gh-labels.sh#gh_labels_filter`, 28 identical `"" ≠ "12\n"`
  mismatches, a human override at the gate). Two consequences the caller owns:
  - **A function's `expected` is not the sink corpus's.** The `filename` corpus
    describes a script that prints the highest gate number; a label filter never
    prints `12`. Name a cases file with `--cases-file <path>` whose `expected`
    is the function's own contract (`tests/fixtures/shell-fn/gh-labels.cases.json`
    is the one for `gh_labels_filter`); keep `--sink filename` — it selects the
    materialised fixture directory the runner runs in.
  - **A function whose body names `gh` is answered by a fixture, not the
    network:** add `--fake-gh <dir>`, a directory holding an executable `gh`
    (this repository's is `tests/fixtures/fake-gh`; a consumer supplies its
    own). The engine prepends it to `PATH` with `FAKE_GH=1` in the env — the
    fixture refuses to run without that variable — validates it before anything
    spawns (`bad-fake-gh` otherwise), and records it as `fake_gh` on the run.
    **A library whose text names `gh` and was given no `--fake-gh` is declined
    `needs-fake-gh`, not scored**: run bare, the real `gh` fails from the
    sandbox cwd, the function takes its read-failed passthrough, and the verdict
    would land on `absent` / `present-but-inert` — the values a missing control
    produces — with nothing but `fake_gh: null` to say "could not look". The
    decline names the library and the flag; it does not hang.

  Exit 97 is reserved for "the source itself failed" and 98 for "the function
  is not defined after sourcing"; both fold into one `entry-not-probeable`
  decline that names the library, never into a scored `absent`. An EXIT trap
  is armed around the `source`, so a **top-level `exit` inside the library**
  (a `|| exit 1` guard, say) is the same named decline rather than a scored
  `absent` behind a full count. The function itself runs in a **subshell** with
  the library's own errexit setting restored inside it, so a function that
  calls `exit` cannot end the harness, `set -e` in the library cannot skip the
  status capture — and its own 97 or 98 is re-mapped to 99 and *scored* as a
  mismatch rather than read as a broken library. Because the input reaches the function
  as argv and not as a directory entry, a `shell-fn:` case may carry a `/`
  (`area/backend` is a real label); no per-case file is written for this form,
  only the sink's controls. `--fake-gh` on a JS-form entry is `bad-fake-gh`:
  the JS runner never consults `PATH`, and a fake it cannot reach must not be
  recorded as having answered. A stdin-reading function, or one needing more
  than argv, is still declined (§ Out of Scope, task.128).

  **`cli:path --argv '<JSON array>'` runs a Node CLI** — a `.mjs` / `.js`
  script — as `node <path> ...argv`, one probe per case, for the boundary that
  lives behind a **flag parser** rather than a one-argument export (task.141's
  `uat-status.mjs --env` guard sits behind a three-argument function; the JS
  form could not reach it, and the gate recorded zero probes executed). The
  template is a JSON array of strings with **exactly one `"{input}"` element**,
  which becomes the case's input as one argv element, never split and never
  parsed by a shell, and optionally `"{fixture}"` elements, which become the
  case's fixture directory (the sink's controls plus the case's name for a
  materialised sink, otherwise empty). **A slot is a whole element or nothing** —
  `--env={input}` is refused, not interpolated — so no argument is ever built
  by concatenating probe input into a string. The sandbox is the shell arm's:
  the fixture is the cwd and sits inside the sandbox root, `HOME` and `TMPDIR`
  point inside it, stdin is empty, and the script's own directory is watched.
  Three rules the caller owns:
  - **The verdict is the exit status.** Exit 0 is *accepted*, non-zero is
    *rejected*. That is a contract the CLI must honour: one that exits 0 while
    refusing is scored as accepting. A case that needs a finer signal carries
    `expected` (stdout, exit, stderr, absent paths), which is then compared and
    mapped through `direction` exactly as the shell arm does it.
  - **A crash is not a refusal.** An uncaught error — Node's own `Node.js
    vX.Y.Z` footer on stderr — a kill, or a timeout is *errored*: "could not
    look". A script that fails to load therefore folds into one
    `entry-not-probeable` decline instead of scoring as a control that rejects
    every hostile input.
  - **A `--argv` shape error is an argument error, not a probe result:** exit 2,
    `bad-argv`, nothing runs and no record is written (`--argv` without `cli:`,
    `cli:` without `--argv`, zero or two `{input}`, an unknown or embedded
    slot). An entry outside the root, or one that is not a `.mjs` / `.js`
    regular file, is a named decline like every other form's. The record carries
    the template as `argv`, and a `cli:` control is keyed on it, so probing
    `--env {input}` and `--clear-note {input}` on one script records two
    controls, not one silently replacing the other.

  `cli:` does **not** touch §2: the engine chooses the interpreter
  (`process.execPath`) and the script is fixed by `--entry` and
  containment-checked before anything spawns, exactly as the JS form already
  runs a Node child. `node` stays off `SAFE_COMMANDS`.
- **What is still declined, and recorded as declined:** a script or CLI that
  reads its input from stdin, a shell script that takes more than one positional,
  anything that must open a socket; a live database sink; anything that needs
  the network (a CLI that consults `gh` included — `--fake-gh` is a shell-form
  flag). These are limits of the entry forms,
  not reasons to record `boundary: false` — the boundary exists whether or not
  the engine can reach it, and §5.1 is how it is tested.
- **No probe opens a network connection.** Both motivating defects are pure
  composers; if a target needs the network, that is a decline.

The precondition — a pure-ish predicate, composer, single-argument script or
argv-driven Node CLI — is what the boundary rule selects for anyway. If it turns
out that most real controls are reachable by none of the forms and the engine declines almost
everything, **that is a finding to record here in this section**, not something
to paper over by loosening §2.

### 5.1 When the sink is declined and the reviewer probes it by hand

A declined sink (a stdin-reading script or CLI, a multi-positional shell
script, a networked control — what no entry form reaches) is not exempt from
being tested; it is exempt from the *engine*. **Reach for this only after the
entry forms have been tried** — a one-argument script is `shell:`'s job and a
Node CLI driven by its argv is `cli:`'s, and a by-hand probe of either is the
self-report the engine exists to remove. A `cli:` probe exercises **one arm**
— the CLI's own argv; the other arms below (a wrapper, an env-var path) still
need the by-hand rule when they reach the same sink. When the reviewer executes such
candidates itself, two rules apply that the engine would otherwise have enforced:

**Every refused shape is re-tried through every arm that reaches the same sink.**
A CLI has more than one way in — its own argv, a `--` passthrough, a wrapper such
as `npm run` / `npx`, a path taken from an environment variable — and each arm
parses independently. On task.111 the absolute-path form was refused by the first
arm tried and the enumeration stopped; the `npm run` wrapper passed the same
string through untouched and reached the sink (obs #91). An arm is recorded clean
only after the shapes refused elsewhere have been run through it, and the
absolute form of any shape the arm accepted relatively has been run under the same
arm. Record the arm × shape pairs tried, not only the verdict.

**A by-hand probe runs under a minimal environment, in a scratch checkout, with a
throwaway `HOME`.** The engine's `sandboxEnv()` allow-lists six keys for exactly
this reason; a probe run from the reviewer's shell inherits the reader's entire
session — API keys, `GH_TOKEN`, `CLAUDE_*`, npm config, and the `.claude/` /
`.agents/` links of the working copy. On task.111 an executed candidate launched
two agent sessions from inside the review (obs #97). The floor:

```bash
# Minimal env: only what the command under probe needs. Add keys deliberately.
env -i PATH=/usr/bin:/bin:/usr/local/bin HOME="$(mktemp -d)" \
  <command> <candidate>
```

and the working directory is a scratch clone (`git worktree add` of the PR head is
enough) that carries no `.claude/`, `.agents/` or credential files. A probe that
needs a variable the minimal env removed is a probe whose result must say so.
Anything an executed candidate writes lands under the throwaway `HOME` or the
scratch tree, and the reviewer diffs both afterwards — the by-hand equivalent of
the engine's sentinel directory.

### 5.2 Which deliverables the rule names — the signals live in one module

The signal list a reader applies at Step 1b (finalise) and Step 3b (QA) is data,
not only prose: `probe-boundary-signals.mjs` beside this file exports
`BOUNDARY_SIGNALS` and `classifyBoundaryText(text)`, and the prompts' bullet
lists are its `description`s. The fifth signal is the one task.121 lacked — **a
script or function whose own header says it refuses, never guesses, or fails
closed is a boundary by its own words, in any language.** `qa-cycle.sh`'s header
("refuses rather than guesses") classifies as one; the task.121 gate-5 note ("the
helper reads filenames and prints a bounded integer") carries no signal, which is
why a reader applying only the JS-shaped ones recorded `boundary: false`
against a script that said otherwise. A test calls the classifier on both.

## 6. Exit codes

`0` clean / `1` findings / `2` hard error, per the repository convention stated at
the top of `qa-execute-snippets.mjs`.

**`unverifiable` exits `1`, not `0`.** A CI check reading `$?` cannot otherwise
tell "the control holds" from "we could not tell" — and making those two
indistinguishable at the exit code is the same defect this engine exists to
close, one layer further out.

| Outcome | Exit |
| --- | --- |
| `engages` | 0 |
| `present-but-inert` | 1 |
| `absent` | 1 |
| `unverifiable` | 1 |
| **any verdict, with `escapes` non-empty** | **1** |
| bad argument, unreadable `--cases-file`, invalid `--timeout` | 2 |

**An escape overrides the verdict.** A probe that wrote outside its sandbox exits
non-zero even when the control it was probing scored `engages`. The verdict
describes the *control under probe*; the escape describes the *probe itself*, and
a caller reading only `$?` must not be told the second was fine because the first
was. The default (non-`--json`) summary line appends `ESCAPED n` for the same
reason — the sentinel is the last line of containment, and it was previously the
one result that line dropped.

`--timeout` is validated with the same rule the spawn budget applies to its env
vars: a plain decimal integer, minimum 1. `0` is rejected specifically because it
parses cleanly and means **no timeout** to `spawnSync` — it reads as "be quick"
and would silently remove per-case containment.

---

## See also

- [`qa-runnable-prose-detection.md`](qa-runnable-prose-detection.md) — the same
  argument for the snippet path, including §3aa on the absent OS sandbox
- [`security-input-corpus.md`](security-input-corpus.md) — the corpus this
  consumes (task.79)
- [`mutation-proving.md`](mutation-proving.md) — the procedure every verdict
  branch above was proved with
- `probe-boundary-signals.mjs` — the signal list as data, and the classifier
  a test can call (§5.2)
