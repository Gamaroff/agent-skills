# Runnable prose — positional-parameter tokens and their token-free equivalents

> Loaded on demand from `create-skill` § *Runnable prose carries no positional-parameter token*.
> This file is a **reference**, loaded with Read, and therefore arrives verbatim. The rule lives in
> `SKILL.md`; the literal tokens live here, because `SKILL.md` is rendered on invocation and would
> corrupt any example that spelled them out. Guard: `tests/fenced-bash-positional-params.test.js`.

## What the harness does (task.119 Phase 0, 2026-09-17, Claude Code 2.1.274)

Three throwaway skills were invoked with one, two and three arguments. Findings, each observed
directly in the delivered copy:

| Premise | Result |
| --- | --- |
| Is a sibling `references/*.md` loaded with Read substituted? | **No.** `$0 $1 $2` arrived verbatim. Only the invoked `SKILL.md` is rendered — so `shared/resources/*.md` and every bundled `references/` copy are safe, and the guard's scope is `skills/*/SKILL.md` alone. |
| How are tokens indexed? | **Zero-indexed.** `/skill alpha beta` renders `$0 $1 $2` as `alpha beta $2`; `/skill only` renders it as `only $1 $2`. A token past the argument count is left literal. |
| Does a backslash escape survive? | **Yes, but.** `\$0` arrives as `$0` — backslash consumed, token intact — so the *delivered* block is correct. The *on-disk* form is then `awk '{print \$2}'`, a syntax error in BSD awk and under zsh alike. Delivery-safe, disk-unsafe. |
| Do the braced and parenthesised forms survive? | **Yes.** `${0} ${1} ${2}` and `${BASH_SOURCE[0]}` arrived intact; `$(2)` in awk arrived intact and prints field 2 (checked against `$2` on the same input, under bash and zsh). |

The zero-indexing is why the corpus obeyed the rule by accident for so long: nineteen sites carried
`awk '{print $2}'`, and a skill invoked with one argument only ever has `$0` touched.

## The equivalents

Each row was executed under bash and zsh on the same input and produced identical output.

| Instead of | Write | Why it is safe |
| --- | --- | --- |
| `awk '{print $2}'` | `awk '{print $(2)}'` | awk's field operator applied to an expression — no `$`+digit. **Not** `cut -f2`: `cut` is tab-delimited by default and does not collapse runs of whitespace, so it is not equivalent to awk's default field splitting |
| `awk '$0 ~ /re/'` | `awk '/re/'` | a bare pattern tests the whole record |
| `awk '{ print length($0) }'` | `awk '{ print length }'` | `length` with no argument is the record's length |
| `awk '{ sub(/x/, "y", $0) }'` | `awk '{ sub(/x/, "y") }'` | two-argument `sub()`/`gsub()` edit the record in place |
| `PR=$1; HEAD=$2` in a script header | `PR=${1}; HEAD=${2}` | the braced form is not substituted and is identical shell |
| `$(dirname "$0")` | `$(dirname "${0}")` — or `${BASH_SOURCE[0]}` when the script is sourced | same |
| `# capped at $20` | `# capped at 20 USD` | a comment inside a fenced block is rendered too — the first fix for observation #23 was a warning comment that the mechanism corrupted |

## The escape, and where it is tolerated

`\$N` is delivery-safe and disk-unsafe. The guard's regex carries a lookbehind that tolerates it,
because inside a **bash double-quoted string** `\$` is ordinary shell syntax and the on-disk form
runs correctly (`echo "cost \$5"` prints `cost $5`). Inside single quotes — which is where awk
programs live — it breaks the program on disk while fixing it in delivery, so `qa-task` Step 4b
(which executes from disk) would fail on it. Prefer the table; reach for the escape only in a
double-quoted string that has no token-free spelling.

## Allowlisting

Where a token is genuinely unavoidable, add `{ file, line, reason }` to `ALLOWLIST` in the guard.
The reason is checked for existence and minimum length, and an entry whose line no longer carries a
token fails the test — an allowlist nobody has to maintain is an allowlist that hides the next hit.
At authoring time the allowlist is empty: all 22 hits in 12 files had a token-free equivalent.

## What the guard cannot see

- It reads the disk, like everything else. It prevents the corruption rather than detecting it.
- `qa-task` Step 4b executes fenced blocks **from disk**, so a green Step 4b says nothing about
  what the harness delivered. Its own step states this limit.
- Only `SKILL.md` is rendered. A token in `shared/resources/*.md` is safe today; if a future harness
  renders Read-loaded files, widen the guard's scope (`skillFiles()`) rather than relaxing the rule.
