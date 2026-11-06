# File-write rules

How a skill's prose tells an agent to change a file, write a body, or post one. The operator's
standing rules forbid a payload heredoc and an interpreter edit; this file states them once, with
the sanctioned replacement beside each. A prohibition without its replacement gets broken at the
moment the replacement looks slower (obs #158).

## The rule

Repository files and body payloads are written with the file tool, not the shell.

- **Change a repository file with the file-edit tool, one hunk per call.** Never an interpreter
  script (`python3 -`, `node -e`, `perl -i`), never `sed -i`, never a heredoc carrying file content.
  A multi-hunk change is several edit calls. Replacement: `Edit`, then `git diff --stat` to confirm.
- **Write a body or payload (a comment, a PR body, a findings JSON, a gate) with the file tool and
  pass it by path** (`--body-file`, `--findings-file`). An unquoted heredoc executes backticks and
  `$(…)` in the text; a quoted one ends early when the payload holds its own delimiter line.
- **A block an agent runs verbatim carries no payload heredoc.** The only exception is an agent with
  no file tool.

`payload-heredoc-ratchet.test.mjs` (beside the other shared tests) counts the payload heredocs that
remain in shipped prose and fails when a new one appears.

## Recipes

### Mutation revert

A mutation proof edits one line, runs the test, and puts the line back:

1. Snapshot the file (`cp`), as `mutation-proving.md` step 1 says.
2. `Edit` the one line. Run the applied-check block in `mutation-proving.md` step 4: it fails when
   the edit changed nothing.
3. Run the test and read which test went red.
4. `Edit` the line back, then `cmp <snapshot> <file>` must print nothing. Compare with the
   snapshot, not `git diff --stat`: a file that carries an uncommitted fix differs from `HEAD`
   after a correct restore.

### Gate write

Write the gate file with the file tool. The bind block prints the head and the clock; put those two
printed values in `head:` and `updated:`. The finding text is typed once, in the file, and never
passes through a shell. The gate-head freshness test is the backstop for a mistyped value.

### Fresh-body post

A post can republish last cycle's body if the write failed and the post ran anyway (obs #85).

1. Write the body in one call, and post it in a **later** call. Never both in one parallel batch.
2. Before the post, assert a line only this cycle's body carries (the commit sha, the cycle number)
   and stop without posting when it is absent.
