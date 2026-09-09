# Sprint Review Summary — Task 87

**Task:** Shell commands in table cells escape the snippet-execution gate
**Status:** ✅ Accepted — 2026-09-09
**PR:** [#365](https://github.com/Gamaroff/agent-skills/pull/365) · **Issue:** [#364](https://github.com/Gamaroff/agent-skills/issues/364)
**Final Gate:** PASS (100/100) after 2 QA cycles · **DoD:** 10/10

---

## Summary

The QA gate that executes documented shell snippets under both bash and zsh could only see **fenced**
` ```bash ` blocks. Commands written inside markdown **table cells** were invisible to it — and the
places those appear are disproportionately *verification* commands, where a false pass is the worst
available failure.

Task 77 shipped one. A predicate in `develop-pipeline-resume-contract.md`'s Steps 5–6 verification cell
returned a **false PASS under zsh** whenever its glob matched nothing, and would have verified a run
with **no QA artifacts at all** as complete. Three QA cycles and a full CI run did not catch it, for
one reason: the extractor never read the cell.

It does now.

## What landed

- **`extractTableCellCommands()`** merges into the same block stream `extractBlocks()` feeds, so
  classification, the fail-closed allow-list, the sandbox and the dual-shell comparison are untouched.
  A table-cell command runs through exactly the same code as a fenced one.
- **Two pipe rules**, because a table cell has two properties a fenced block does not: `\|` is an
  escaped delimiter that must be undone before the text is shell, and a pipe inside an *open* backtick
  span is **content**. The second deliberately diverges from GFM — rendering cares where cell
  boundaries are, this engine cares whether a command was seen at all.
- **`shell-disagreement` gained a `channel`** (`stdout` / `status`). The comparison was stdout-only, and
  the task-77 predicate prints nothing under either shell: its whole defect is the exit status. The two
  channels are each other's blind spot and this repo has now shipped one of each.
- **`origin`** (`fence` / `table-cell`) on every block, result and finding; the report annotates
  `line N (table cell: Verification command)`.
- Rule doc §1a and §3, and a `CHANGELOG.md` entry.

## Evidence

- **127 tests** (98 → 127). Repo-wide **2993 pass / 0 fail**; full `npm run ci` green including
  `eval:all`; GitHub CI **5/5 SUCCESS**.
- **A seven-mutation matrix** — every added behaviour reverted one at a time, each red, restored green.
- **26 adversarial probes executed**, 12 of them pushing mutating commands through the new path.
  All refused; nothing escaped the sandbox.
- **A corpus measurement**: of 182 tracked `SKILL.md` and `shared/resources/*.md` files, **4** carry
  table-cell commands, contributing 42 new blocks and **zero** new findings.

## Worth carrying forward

**The QA loop caught a regression its own previous cycle had introduced.** Cycle 1 fixed a silent
command-drop; cycle 2's refute pass found that the fix reintroduced the same defect class by a
different route (an escaped backtick read as a span delimiter). That is the argument for the refute
pass in one sentence: *a fix is new code, not the closure of a finding.*

**The mutation check caught a vacuous test.** An assertion offered as proof of a guard passed with the
guard removed — a fallback absorbed the difference. It reported coverage that was not there. The
replacement was found by **brute-forcing short strings** for a distinguishing input, not by reasoning
about which input ought to differ; the reasoning had already failed once.

**The conformance lens found what nothing else checks.** Step 5c's PC-1: the change shipped a schema
field the *task document* never recorded. The QA gate scores the work, not the document's account of
the work.

**The CI gate withheld acceptance.** The first rollup sample read PENDING (`conclusion: ""` on a running
job — the exact shape that once got rounded up to green). Acceptance waited three more samples.

## Known limitations

Documented rather than fixed, neither with a corpus instance: a blockquoted table is not recognised,
and an unequal backtick run truncates the span. A compact pipeline (`ls|wc`, no whitespace) is still
not extracted — a deliberate noise bound that fails toward running less.
