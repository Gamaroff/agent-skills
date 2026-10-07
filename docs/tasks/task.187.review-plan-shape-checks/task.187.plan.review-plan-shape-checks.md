---
id: task.187.plan
title: "Implementation Plan: Review checks for plan shapes"
type: plan
task-ref: task.187.review-plan-shape-checks.md
---

# Implementation Plan: Review checks for plan shapes

> Requirements and success criteria: [task.187.review-plan-shape-checks.md](task.187.review-plan-shape-checks.md)

## Overview

Append six checks to review-task Step 3 and review-story Step 4 in the house shape of checks 10–14,
extend review-task Step 6/7 and port them to review-story Step 5, then hold presence with one test
in the shape of the four sibling presence tests and add a mechanical test-reach guard.

## Phase 1: review-task Step 3 checks 15–20

**Anchor**: insert after the last bullet of `14. **Call-site population** (obs #120):` and before
`**Common Hallucination Patterns to Detect**:` in `skills/review-task/SKILL.md`.

Each check uses the shape of check 13 (`13. **Single-statement test discriminator** (obs #135):`):
a dash list with the trigger first, the action, a worked example naming the task, and a closing
`- Flag as **Important** when …` line. Proposed headings:

```markdown
15. **Removed-literal test sweep** (obs #203):
16. **Other writers in a replaced region** (obs #242):
17. **Identity over a shell command string** (obs #252):
18. **Test file reached by the runner** (obs #255):
19. **Reconstruction states for a resume rule** (obs #264):
20. **A site list carries its grep** (obs #129):
```

Content sources, one per check — read each observation's Improvement in full before writing:

| Check | Trigger | Action | Worked example (from the observation's Issue) |
| --- | --- | --- | --- |
| 15 | plan removes or inverts a behaviour | search every tracked test file for the literal (e.g. `git grep -n '<literal>' -- '*.test.*'`, plus fixture directories); list every hit as a test to update | obs #203's task |
| 16 | plan replaces/rewrites/deletes a region of a document | search the project's skill and resource sources, every file type, for writers that target the region; each named carried / refused / owned | task.155 (the incident; task.171 later ruled it out of its own scope) |
| 17 | identity, dedupe or uninstall key read from a shell command string | require a shell-word parse that inverts the writer's quoting | task.157 `context-pressure.mjs check` substring |
| 18 | plan names a new test file | the file is reached by the project's test runner configuration, or the plan lists the runner edit; this repository's `tests/test-runner-reach.test.js` appears in the worked example only | obs #255's task |
| 19 | plan adds/changes a resume, lock or reconstruction rule | the document lists the states the rule must hold in (report at / ahead of / behind the gates; gate written, entry not; back-filled entry; in-place vs re-invocation) — same shape as check 12's released-shape diff. Name the resume contract by bare filename, never a path literal | obs #264's task |

**Consumer-neutral wording.** review-task ships to other projects. Each check's rule names "the
project's test files / test runner configuration / skill and resource sources"; this repository's
paths appear only in the `Worked example:` line. Checks 15, 16 and 18 each end with a "not
applicable" line for a project that has no such artefact, in the shape of check 14's `no-roots` rule.
Each check carries a `Trigger:` line and a `Worked example:` line (the presence test asserts both).
| 20 | document lists "every X site" or sites in parentheses, outside check 14's five engines | the document records the grep that defines X; the reviewer re-runs it and diffs | obs #129's task |

Then, in the same file:

- **Common Hallucination Patterns**: append six lines, e.g.
  `- ❌ A removed behaviour whose literal is still pinned by a test the plan never lists (check 15)`.
- **Detection Rules** (`### Detection Rules`, after rule 8 `**Population Verification**`): append
  rules 9–14, one line each, MUST-phrased like rules 6–8.
- **Questions to Collect**: add "When a replaced region has another writer: carried, refused or
  owned?", "When an identity key is a pattern: what parse inverts the writer?", "When a resume rule
  changes: which reconstruction states must it hold in?".

## Phase 2: review-task Step 6 and Step 7

- `2. **Testing Completeness**:` — append a bullet that **cites** create-task § Section 8
  (`skills/create-task/SKILL.md:894`, which states the control-case rule) and adds only the review
  action:

  ```markdown
     - **Behavioural evidence that re-runs its own example needs a control case** (obs #176, #285):
       the rule is create-task's (§ Section 8, "Behavioural evidence needs a control case"); a plan
       whose evidence re-runs the quoted incident with no control → **Important**
  ```

- `4. **Success Criteria Measurability**:` — after the post-merge item, add **one lead-in sentence**
  (e.g. "Two more shapes fail later than review, each **Important** too:"), then the two items in
  the `- **…** (obs #N).` shape. The existing "Three shapes reach that point" (`:1121`) stays true
  because the new items sit under their own lead-in. Do **not** write a count of kinds anywhere in
  check 4: `tests/lib/count-of-kinds.js` scans all of it (test "check 4 names every test-free kind
  the AC prompt lists, and counts none of them"):
  - **A behaviour fix in prose lands in an executable block** (obs #258): when the fix for a
    behaviour criterion lands in `SKILL.md` or a shared reference, the plan puts it in a fenced
    block a test helper extracts and runs. A table cell, blockquote or sentence → Important; offer
    "move it into a fenced block, or reuse an existing extractable block".
  - **A criterion's test runs on CI's platform** (obs #279): a criterion needing a shell or OS the CI
    lanes lack (zsh, macOS; `.github/workflows/test.yml` is `ubuntu-latest`) → Important, with the
    two resolutions: scope it to the CI shell plus "verified locally", or add the lane.
- `### Step 7` `1. **Risk Identification**:` — append:
  `- An exemption to a refuse-by-default guard, or a widening of what it treats as safe = at least
  Medium risk; the plan names a differential oracle — shapes the exemption must still refuse,
  compared head vs base (obs #269)`. Add the matching **Important** line to Issues to Flag.

## Phase 3: review-story parity

- **Step 4** (`### Step 4: Technical Accuracy and Anti-Hallucination Review`): append checks 11–16
  after `10. **Call-site population** (obs #120):`, ported from Phase 1. Adapt worked examples only
  where a story differs (a story's resume-rule change is rare; keep the trigger, shorten the
  example). Pattern lines read `(check 11)` … `(check 16)`.
- **Step 5** (`### Step 5: Completeness and Gap Analysis`): after `9. **Effort Estimate**:` add
  `10. **Acceptance Criteria Classification** (obs #224, #285):` — one paragraph that cites
  review-task check 4 as `[review-task check 4](../review-task/SKILL.md#step-6-consistency-and-completeness-review)`
  and the AC prompt as `[finalise's AC agent, Step 3](references/finalise-dod-ac-prompt.md#step-3-check-each-acceptance-criterion)`
  (non-path link text); state that a story AC fitting no kind is Important. No restated kinds list,
  no count.
- **Step 5** `4. **Testing Coverage**:` — append the control-case, prose-in-a-fence and CI-platform
  bullets (same wording as Phase 2, pointing at the Step 5 check 10 for the classification).
- **Step 5** — add `11. **Guard exemptions** (obs #269):` with the Step 7 wording from Phase 2.
- Extend the Step 4 and Step 5 "Issues to Flag" Important lines with the new checks.
- Run `npm run bundle`. `finalise-dod-ac-prompt.md` reaches no other shared file, so it bundles
  alone either way (CLAUDE.md "Cite or depend"). Confirm the bundler prints closure ±0 for
  review-task and +1 for review-story, `bundle:check` is clean, and the new copy is tracked.

## Phase 4: `tests/test-runner-reach.test.js`

```js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const script = require(path.join(ROOT, "package.json")).scripts.test;

// exported for the mutation proof: run it against an edited script string
function reach(scriptText, files) {
  const globs = [...scriptText.matchAll(/'([^']+\.test\.m?js)'/g)].map((m) => m[1]);
  const bashes = new Set([...scriptText.matchAll(/bash ([^\s&;]+\.test\.sh)/g)].map((m) => m[1]));
  const res = globs.map((g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$"));
  const unreached = files.filter((f) => (f.endsWith(".sh") ? !bashes.has(f) : !res.some((r) => r.test(f))));
  return { globs, bashes, unreached };
}
```

- Population: `git ls-files` filtered by `/\.test\.(m?js|sh)$/` minus `/^skills\/[^/]+\/references\//`
  (bundled copies; their `shared/resources/tests/` sources are reached).
- Assertions: `unreached` is empty (message lists each file); floors printed and asserted
  (population ≥ 200, globs ≥ 25).
- Mutation and control tests inside the file: `reach(scriptWithoutWireframeGlob, files)` reports
  `skills/wireframe/tests/wireframe.test.js`; a deeper-directory file is not matched by a one-level
  glob; the untouched script reports nothing.
- Measured on `0b6003fe` (for the implementation report, not the test): 231 tracked, 4 unreached —
  all four under `skills/{qa-task,qa-story}/references/tests/`.

## Phase 5: `tests/review-plan-shape-checks.test.js`

Copy the structure of `tests/review-call-site-population-check.test.js`: a `sectionOf` slice per
step heading (`tests/lib/markdown-section`), then per check:

- the numbered heading is present under the right step heading, with its obs id;
- its `❌ … (check N)` line exists, and N equals the number of the heading it names (per file — this
  is the CR5-2 guard);
- the check carries `**Important**`, a `Trigger:` line and a `Worked example:` line;
- checks 15, 16 and 18 (and twins 11, 12, 14) carry their "not applicable" line;
- Step 6 / Step 7 / Step 5 items are found by their bold lead-in, and review-task check 4's
  "Three shapes reach that point" sentence is still present and no "N kinds" phrase appears
  (`require("./lib/count-of-kinds")`);
- each new check has a Detection Rules line, and checks 16, 17, 19 (twins 12, 13, 15) a Questions to
  Collect line;
- a non-vacuity floor: 6 checks found in each skill; a missing site is a red assertion, never a
  skip.

Mutation proofs: delete check 17 from a copy of review-task and check 13 from a copy of
review-story, point the test at the copies (factor the file reads behind a `ROOT` override), and
confirm red naming each.

## Key Patterns and References

- House shape for a check: `skills/review-task/SKILL.md` checks 13 and 14.
- House shape for a presence test: `tests/review-call-site-population-check.test.js`,
  `tests/outcome-reachability-check.test.js` (CR5-2 history in its comments).
- Fragment-link citation rule: CLAUDE.md "Cite or depend"; `skills/create-skill/SKILL.md`
  § "Cite or depend".

## Testing Approach

`command node --test tests/test-runner-reach.test.js tests/review-plan-shape-checks.test.js`, then
`npm test`, `npm run bundle:check`, `prettier --check .`. Record every mutation proof's red output
in the implementation report.
