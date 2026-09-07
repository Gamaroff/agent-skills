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
  (`tests/spawn-budget.mjs`), never a literal.

**What it does not do, stated honestly:**

- **There is no OS-level sandbox.** The module under probe runs with full Node
  privileges — exactly as `qa-runnable-prose-detection.md` §3aa already says of
  the snippet path. The containment contains *the harness*, not the repository.
- **A symlink that points out of the tree resolves at import time**, after the
  path check. Node offers no cheap pre-import realpath guarantee for a path that
  may not yet exist. This is a limit, not a defence.
- **v1 probes importable entry points only.** A shell/exec sink, a live database
  sink, or anything that must open a socket is **declined and recorded as
  declined** — never counted as probed, never counted as passing.
- **No probe opens a network connection.** Both motivating defects are pure
  composers; if a target needs the network, that is a decline.

The precondition — a pure-ish predicate or composer — is what the boundary rule
selects for anyway. If it turns out that most real controls are not importable
in-process and v1 declines almost everything, **that is a finding to record here
in this section**, not something to paper over by loosening §2.

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
