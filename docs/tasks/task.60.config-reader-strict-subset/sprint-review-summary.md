---
id: task.60.sprint-review-summary
title: 'Sprint Review Summary: Task 60 — config reader strict subset'
type: sprint-review-summary
task-ref: task.60.config-reader-strict-subset.md
status: complete
created: 2026-08-18
updated: 2026-08-18
---

# Sprint Review Summary: Task 60

**Task:** [Give the config reader's awk tier a grammar, or make it refuse](./task.60.config-reader-strict-subset.md)
**PR:** [#248](https://github.com/Gamaroff/agent-skills/pull/248) · **Issue:** [#247](https://github.com/Gamaroff/agent-skills/issues/247)
**Accepted:** 2026-08-18 · **Gate:** PASS 95/100 · **QA cycles:** 2

---

## Summary

`skills-config.yaml` is read through two tiers: `python3` + `pyyaml`, a real parser, and `awk`, a
set of anchored line regexes used when `pyyaml` is absent. The awk tier had **two** possible
answers — a value, and absent — so everything it could not read fell into the second one. For
`access:` absent means `full`, which made a declared restriction resolve to **no restriction at
all**: well-formed file, exit 0, nothing printed.

That tier is not a rare fallback. **It is the default tier on a stock macOS host**, where
`/usr/bin/python3` ships without `pyyaml` — so the tier consumers run is the one that was wrong.

This gives tier 2 a third answer and a documented grammar. Anything outside the subset is now
refused, naming the line, the construct, and two ways forward.

## Why it mattered now

Task.51 introduced `access:` and recorded this as **LIMIT-1**, deferred with an explicit condition:
close it *before* any skill gates a mutation on `ACCESS_TRACKER`. Today the wrong value is inert
because nothing reads it. Task.52 is the first consumer — and the moment a skill gates on it, a
wrong value stops being cosmetic and becomes an unintended tracker write by an agent the operator
believed they had restricted. This landed first, as required.

## What was delivered

- **A rule, not a spelling list.** Constructs are judged by one question: *can this change what one
  of the six consumed keys resolves to, relative to what its own line says?* The **aliasing family**
  (anchor, alias, merge key, multi-line flow mapping, tag, BOM, document separator) can, and is
  refused file-wide. **Key-spelling constructs** (quoted key, space before the colon, explicit
  `? key`, duplicate key) change only the key they spell, and are refused only for keys this reader
  consumes. Everything else — nesting at any depth, sequences, flow sequences, block scalars — is
  read from its own line and never refused.
- **The tier-1 half.** A mapping-valued `access.tracker` (an ordinary nesting typo) resolved to
  `full` under `pyyaml` too. Never an awk problem: the parser read it correctly and the reader then
  collapsed its "this is a mapping" signal into the same empty string it uses for "not configured".
- **A refusal that is reachable.** Raised from one site *above* the identity block — raised in the
  access path it would never print, because enum validation halts first with a message naming
  neither the construct nor either way out.
- **A named cause.** `__ERR__` now carries `<line>:<reason>`, retiring the enumerated list of three
  shapes the halt used to print.

## Testing & QA

| | |
| --- | --- |
| `tracker-access.test.sh` | 285 → **378** assertions, 0 failing |
| `npm test` | 1287/1287 |
| CI | **SUCCESS** on `e1f16bc` — green under `gawk` and `mawk` as well as BWK awk |
| Mutation audit | **24 mutations, 0 survivors** |
| QA cycles | 2 — CONCERNS 80/100 → PASS 95/100 |

Four mutations survived a first pass and each was closed by **adding the missing witness** rather
than by adjusting the count. The one worth naming: a failed `awk` produced no output, which was
byte-identical to *"found nothing outside the subset"* — this task's own defect one layer down,
absence of evidence read as evidence of absence, resolving to the permissive answer.

QA cycle 1 found the last open escalation route: a duplicated `access:` key. YAML resolves
duplicates *last-wins*; tier 2's block matcher was *first-wins*, so a copy-pasted second block
silently granted whichever value came first.

## Breaking change

On a host without `pyyaml`, a config using a refused construct now **halts** instead of resolving to
defaults at exit 0. Breaking in the correct direction — a silent wrong answer becomes a loud refusal
with two documented fixes — but still breaking. Tier 1 accepts all of these as written, so
`pip install pyyaml` requires no edit to the config. A config outside the subset that provably
declares no `access:` still warns and degrades.

## Known limitations

1. **No human has reviewed PR #248.** Both QA cycles and the DoD were performed by the pipeline.
2. **Duplicates deeper than the first child level are not refused** — not an escalation (tier 2
   resolves correctly there and tier 1 halts), but worth a spec line if the key surface grows deeper.

## Impact and follow-on

Closes **LIMIT-1** and **LIMIT-2** from task.51 and discharges both of that task's outstanding
acceptance conditions. **Unblocks [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)**, the first skill to gate a real mutation on `ACCESS_TRACKER`.

## The principle worth carrying

Tier 2's defect was never a missing regex. It was reporting *"I did not find it"* as *"it is not
there"*. Any reader that cannot distinguish those two will eventually resolve a restriction into a
permission.
