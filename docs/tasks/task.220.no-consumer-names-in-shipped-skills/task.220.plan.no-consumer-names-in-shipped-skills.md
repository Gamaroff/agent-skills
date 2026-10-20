---
id: task.220.plan
title: "Implementation Plan: No consumer names in shipped skills"
type: plan
task-ref: task.220.no-consumer-names-in-shipped-skills.md
---

# Implementation Plan: No consumer names in shipped skills

> Requirements and success criteria: [task.220.no-consumer-names-in-shipped-skills.md](task.220.no-consumer-names-in-shipped-skills.md)

## Overview

Add the guard first and keep its failure list as the population. Then apply one scripted edit pass
in which every exact edit must match an expected number of times, run a regex pass for the example
values, empty the old exemption list, remove the wireframe skill's consumer profile, and re-bundle.

This file deliberately does not spell the consumer's names, so it adds none to the repository.
`<NAME>` stands for the consumer's product and repository name, `<KEY>` for its Jira project key,
`<BRAND>` for its brand (it also prefixes CSS classes and file names, as `<BRAND>-`), and `<HOST>`
for its Jira host prefix; `<key>` is the key in lower case. Read the real values off the pattern list in
`shared/resources/tests/pipeline-answers-generic.test.mjs` and the guard's Phase 1 failure list.

## Phase-by-Phase Implementation Guide

### Phase 1: Add the guard

`tests/no-consumer-names.test.js` (CommonJS, `node:test`), following `tests/bundled-links.test.js`:

```js
// Letter-bounded, case-insensitive (review 1): `\b` treats `_` as a word
// character, so `\b<KEY>\b` missed `<KEY>_RECORD`, and a case-sensitive key
// missed `<key>-story-….json` and `https://<key>.atlassian.net`.
const CONSUMER_NAMES = [
  /<NAME>/i,
  /(?<![a-z])<KEY>(?![a-z])/i,
  /(?<![a-z])<BRAND>(?![a-z])/i,
  /<HOST>/i,
];
const SCOPE = ["skills", "shared"];
// The scanners' own calibration samples hold the names on purpose.
const SELF = new Set(["shared/resources/tests/pipeline-answers-generic.test.mjs"]);
```

- `shipped()`: `git ls-files -z ...SCOPE`, minus `SELF`; skip binary files (a NUL in the first 8 KB).
- Test 1 — the scanner flags one sample per pattern, plus `<KEY>_RECORD`, `<key>-story-x.json` and
  `https://<key>.atlassian.net`, and nothing in look-alikes such as
  `rapport, TRAPPED, wrapper, bootstrapped, unwrapped, orbit`.
- Test 2 — non-vacuity: at least 500 files walked, and the walk includes
  `shared/resources/jira-sync.js`, `skills/finalise/SKILL.md` and `skills/wireframe/SKILL.md`.
- Test 3 — no shipped line matches; the failure lists `path:line: text`.
- Test 4 — no shipped **path** matches (the fixture file names); the failure lists the paths.

Run `node --test tests/no-consumer-names.test.js` and save the failure list. Record it in the
implementation report as `path: count` per file — never the raw lines, which print the names.

### Phase 2: Edit the sources

Write the edit script to a file and run it (`python3 -I edit.py`). Every exact edit asserts its match
count before anything is written; a no-match stops the run (a scripted replace that matches nothing
exits 0 otherwise).

**Exact prose edits** (old → new, one match each):

| File | Old | New |
| --- | --- | --- |
| `shared/resources/develop-pipeline-step-2-review.md` | `Reported by a consumer (\`<NAME>-wallet\` task.113 / <KEY>-728) that` | `Reported by a consumer project (2026, one of its tasks) that` |
| `shared/resources/jira-sync.js` | `— <KEY> has six across three —` | `— one consumer's has six across three —` |
| `shared/resources/jira-sync.js` | `backward transitions — <KEY>\n  // offers` | `backward transitions — one\n  // consumer's offers` |
| `shared/resources/jira-sync.js` | `Observed on <KEY>: two transitions` | `Observed on a consumer's board: two transitions` |
| `shared/resources/jira-sync.js` | `Observed live (<NAME>-wallet <KEY>-111, 2026-08-08):` | `Observed live (a consumer project, 2026-08-08):` |
| `shared/resources/tests/generate-prd-epic-index.test.mjs` | `Found in a consumer repo (<NAME>-wallet) which` | `Found in a consumer repo which` |
| `shared/resources/tests/jira-stage.test.mjs` | `exists for (<NAME>-wallet <KEY>-111, 2026-08-08):` | `exists for (a consumer project, 2026-08-08):` |
| `shared/resources/tests/jira-sync-no-transition.test.mjs` | `(observed: <KEY>-715,\n// 2026-09-05` | `(observed on a consumer's\n// card, 2026-09-05` |
| `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` | `(<NAME>-wallet task.33 / <KEY>-575).` | `(reported by a consumer project).` |
| `skills/finalise/SKILL.md` | `Observed live (<NAME>-wallet, stories 3.2 and 3.3,` | `Observed live (a consumer project, two stories,` |
| `skills/finalise/SKILL.md` | `That is the <KEY>-715\n   >   sequence` | `That is the\n   >   sequence` |
| `skills/finalise/SKILL.md` | `Observed on <KEY>-715 (2026-09-05):` | `Observed on a consumer's card (2026-09-05):` |
| `skills/scaffold-tracker-workflow/tests/scaffold-tracker-workflow.test.js` | `the <KEY>\n * board (id 407) as read` | `a\n * consumer's board as read` |
| `skills/scaffold-tracker-workflow/tests/scaffold-tracker-workflow.test.js` | `// <KEY> board 407, verbatim column order.` | `// A consumer's board, verbatim column order.` |
| `skills/scaffold-tracker-workflow/scripts/scaffold-tracker-workflow.js` | `Blocked column early — <KEY>'s` | `Blocked column early — one consumer's` |
| `skills/sync-jira-bug/tests/end-to-end.test.js` | `bug card <KEY>-713 and its siblings <KEY>-706/707/708` | `a bug card and three of its siblings` |
| `skills/sync-jira-bug/tests/end-to-end.test.js` | `measured on <KEY>-713.` | `measured on that bug card.` |

**Fixture renames**, before the regex pass: `git mv` each
`shared/resources/tests/fixtures/<key>-*.json` to `proj-*.json`. Assert there are exactly 10 before
moving any.

**Regex pass**, over tracked files under `skills/` and `shared/`, skipping `*/references/*`,
`skills/wireframe/` (Phase 3) and `pipeline-answers-generic.test.mjs`, in this order:

1. `\b<KEY>_(COLUMNS|TYPES|RECORD)\b` → `BOARD_\1`
2. `\b<KEY>\b` → `PROJ`
3. `(<HOST>|<key>)\.atlassian\.net` → `acme.atlassian.net`
4. `(?<![a-z])<key>-` → `proj-` (the fixture names `jira-stage-fixtures.test.mjs` loads)
5. `boards/407\b` → `boards/12`

Then grep the diff for awkward results (`PROJ's`, `the PROJ board`) and reword by hand.

**Old exemptions.** In `shared/resources/tests/pipeline-answers-generic.test.mjs`, replace the
`EXEMPT` array with `const EXEMPT = [];` and a short comment pointing at
`tests/no-consumer-names.test.js`. Keep its `CONSUMER_NAMES` and test 1 samples.

A dry run of Phase 2 on 2026-10-20, before review 1 widened the pass, touched 21 source files (114
lines changed each way) and left `pipeline-answers-generic.test.mjs` green after `EXEMPT` was
emptied. The widened pass touches more; the guard's own failure list is the population, not this
figure.

### Phase 3: The wireframe skill

- `git rm skills/wireframe/references/html-formats/<BRAND>-hifi.md`.
- `skills/wireframe/SKILL.md`, § "Working from an existing UI", step 2: drop the profile table. Keep
  the paragraph on what a profile decides versus what the rules decide. Replace "copy the shape of an
  existing one into `references/html-formats/` and add a row here" with: the skill ships no profile;
  a format belongs to a project, so a project that converts one format repeatedly keeps its profile
  in its own repository — outside `.agents/skills/`, which a reinstall overwrites — and names it in
  its own agent instructions. Re-read the rest of the section for any wording that assumes a table.
- `skills/wireframe/tests/wireframe.test.js`: delete the "HTML format profiles" section — the
  `FORMATS_DIR` constant, `profiles()`, and its two tests. Nothing else in the file reads that directory.

### Phase 4: Re-bundle and verify

```bash
npm run bundle
npm run bundle:check
npm run validate -- skills/wireframe
node --test tests/no-consumer-names.test.js shared/resources/tests/pipeline-answers-generic.test.mjs skills/wireframe/tests/
npm run ci:fast        # about 10 minutes; run it in the background
```

Record each touched test file's pass count before Phase 2 and after Phase 4; they must match, except
the wireframe suite, which loses exactly two.

## Key Patterns and References

- `shared/resources/tests/pipeline-answers-generic.test.mjs` — same scanner shape; reuse its line
  splitter rather than inventing a third.
- `tests/bundled-links.test.js` — the walk-`git ls-files` pattern the guard follows.

## Testing Approach

- Guard red at Phase 1, green at Phase 4 (record both in the implementation report, red as masked
  `path: count` lines).
- Time the guard on the PR's head commit: `uptime; time command node --test tests/no-consumer-names.test.js`.
- Calibrate the scanner: each sample in test 1 is flagged, each look-alike is not.
- Per-file test counts unchanged for every renamed fixture.
- `npm run bundle:check` clean after the commit.
