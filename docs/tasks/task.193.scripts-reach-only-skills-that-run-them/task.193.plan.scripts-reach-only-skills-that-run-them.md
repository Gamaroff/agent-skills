---
id: task.193.plan
title: "Implementation Plan: Scripts reach only the skills that run them"
type: plan
task-ref: task.193.scripts-reach-only-skills-that-run-them.md
---

# Implementation Plan: Scripts reach only the skills that run them

> Requirements and success criteria: [task.193.scripts-reach-only-skills-that-run-them.md](task.193.scripts-reach-only-skills-that-run-them.md)

## Overview

Classify the 34 prose script literals, fix the unneeded ones, remove the unreached copies, then add
one test that guards the class and pins create-skill's rule sentence.

## Phase 1: Classification

**The 34 prose literals** (`b36d7d32`; doc:line → script). Re-measure with the population
definition in the task's § 8 before starting; the list has moved. Review 1 measured **37** on
`eb44b9c3` with the corrected running-line rule (a command token immediately before the path): the
table below plus `step-0:729 pipeline-answers.js` and `step-8-commit:50 report-lint.js`, at shifted
line numbers (e.g. the resume contract's incident line is now `:614`).

| Citing document | Lines | Script |
| --- | --- | --- |
| develop-pipeline-lite-mode.md | 35 | tracker-comment.js |
| develop-pipeline-resume-contract.md | 551 | grant-qa-cycles.sh |
| develop-pipeline-step-0-resolve-and-prepare.md | 389, 481, 719 | tracker-comment.js, gh-stage.js, report-lint.js |
| develop-pipeline-step-2-review.md | 73, 180 | review-report-freshness.js, tracker-comment.js |
| develop-pipeline-step-3-develop-loop.md | 327 | tracker-comment.js |
| develop-pipeline-step-4-create-pr.md | 273, 311 | gh-stage.js, tracker-comment.js |
| develop-pipeline-step-5-6-qa-loop.md | 16, 79, 125, 644 | grant-qa-cycles.sh, set-qa-phase.sh, gh-stage.js, qa-diminishing-returns.js |
| develop-pipeline-step-7-finalise.md | 215, 217, 313 (×2), 337, 432, 433 | stakeholder-summary-cli.js, tracker-comment.js, tracker-comment.js + tracker-issue.js, gh-stage.js, handover-render.js, handover-verify.js |
| finalise-dod-security-prompt.md | 149, 166 | security-input-corpus.mjs, security-probe.mjs |
| jira-transition-protocol.md | 9 | jira-stage.js |
| platform-detection.md | 9, 387, 489 | resolve-platform.sh, bitbucket-auth.sh ×2 |
| qa-runnable-prose-detection.md | 337 | qa-execute-snippets.mjs |
| security-input-corpus.md | 3, 13 | security-input-corpus.mjs ×2 |
| security-review-prompt.md | 17, 45, 78 | security-probe.mjs ×2, security-input-corpus.mjs |
| tracker-state-poller-subagent.md | 78 | resolve-platform.sh |

For each row and script:

```bash
DOC=develop-pipeline-resume-contract.md; SCRIPT=grant-qa-cycles.sh
for d in skills/*/references/$DOC; do s=${d#skills/}; s=${s%%/*};
  # a running line for SCRIPT in this skill's own files, excluding the copy of DOC that names it in prose
  hit=$(grep -rnE "(bash|sh|source|node|require\(|import|from)[^\n]*$SCRIPT" "skills/$s" \
        --include='*.md' --include='*.sh' --include='*.js' --include='*.mjs' \
        | grep -v "references/$SCRIPT:" | head -1)
  echo "$s: ${hit:-NONE}"
done
```

**The hit must run this skill's own copy.** Keep a hit only when its script path is
`.agents/skills/<s>/references/<script>`, a bare `references/<script>`, or a `{a|b|…}` alternation
that includes `<s>`. Drop a hit that names another skill's copy. The resume contract's
`.agents/skills/{develop-story|develop-task}/references/grant-qa-cycles.sh` line, bundled into
qa-task, is not a witness for qa-task. Without this filter the command above reports a hit for all
six skills on `b36d7d32`. A skill whose only own-copy running line sits in a bundled document is still
a running skill, because the bundled document is what the agent executes. Record each kept
`path:line` as the witness. Verdict per
(doc, script): **needed** if every bundling skill has a hit; otherwise **not needed** for the
skills with `NONE`. A mixed verdict means switching to the bare filename **and** adding a direct
`references/<script>` mention in the `SKILL.md` of each running skill that would lose the copy.

## Phase 2: Fix

- Rewrite not-needed literals to the bare filename (keep the backticks: `` `grant-qa-cycles.sh` ``).
- `npm run bundle`, then `npm run bundle:check`; `git rm` every `UNREACHED` path it prints; re-run
  until clean.
- Run `npm test` before committing: lifted-block tests resolve scripts through bundled
  `references/`, and they are what would catch a skill that lost a script it runs.
- **Removed-literal test sweep** (review 1, I2). For the scripts Phase 1 switches, search the tests for
  the literal and for the bundled copies being removed:
  `git grep -nE "shared/resources/(<script1>|<script2>…)" -- '*.test.*' 'tests/**' 'evals/**'` and
  `git grep -nE "(<skill>)/references/(<script>)" -- '*.test.*' 'tests/**' 'evals/**'`. On `eb44b9c3` the
  first finds only tests that read the **source** scripts by path (`qa-loop-lock-fields-parity.test.mjs`,
  `tests/qa-cycle.test.js:449`, `report-lint-call-sites.test.mjs:153`, `security-probe.test.mjs`,
  `review-security.test.js`, `stdout-drain-on-exit.test.mjs:379`) — unaffected by a prose edit — and the
  second finds nothing for `develop-bug`/`qa-story`/`qa-task`/`review-pr`. List any new hit as a test
  to update.

## Phase 3: `tests/shared-script-literals.test.js`

```js
const ALLOWED = {
  // "<doc>:<script>": "<why every skill that bundles <doc> needs <script> bundled>",
};
```

- Scan per the task's § 8 population definition. Track fences with `fenceStep` from
  `tests/lib/markdown-section.js`. **Running line = a command token immediately before the path**
  (`bash `, `sh `, `source `, `node `, `command node `, `require(`, `import(`, JS `import … from `,
  optionally behind one quote/backtick) — never "a token anywhere earlier on the line", which passes
  `Engine source: \`shared/resources/x.js\`` prose (review 1, I1).
- Assertions: (1) every match is in `ALLOWED`; (2) every `ALLOWED` key matches at least one line;
  (3) floors: ≥ 40 `.md` files read, ≥ 1 fenced script literal seen (proves the fence branch runs).
- Control fixtures: run the scanner function on six inline strings before the tree scan — must fail:
  plain prose, ``Engine source: `shared/resources/x.js` ``, ``wrap it with f from `shared/resources/x.sh` ``;
  must pass: fenced, a `bash shared/resources/x.sh` line, a cite wrapper.
- Pin: `sectionOf(read("skills/create-skill/SKILL.md"), "### Inside \`shared/resources/\`, a \`shared/resources/\` literal is a bundling instruction")`
  returns an **array of lines** — join it, collapse whitespace — and assert it contains
  `A literal that puts the shared-resources directory in front of the filename is not a reference`
  and does **not** contain the old rule form `` A literal `references/<file>` ``. Do **not** forbid the
  bare token `references/<file>`: the section's obs #175 sentence names it on purpose, so that pin is red
  on today's tree (review 1, C1 — measured). The heading text is also quoted by
  `tests/bundle-missing-source.test.js:308`, so keep both in step.

## Key Patterns and References

- Guard with an allowlist, a reason per entry, a stale-entry check and floors: obs #117's rule in
  create-task § 3.5.
- Cite vs depend: CLAUDE.md "Cite or depend"; `skills/create-skill/SKILL.md` § "Cite or depend".

## Testing Approach

`command node --test tests/shared-script-literals.test.js`, then `npm test`, `npm run bundle:check`.
Record the classification table and both mutation proofs in the implementation report.
