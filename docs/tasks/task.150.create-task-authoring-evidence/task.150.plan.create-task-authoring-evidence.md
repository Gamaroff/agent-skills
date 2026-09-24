---
id: task.150.plan
title: "Implementation Plan: create-task — anchored claims, a bounded title, and a --from-observation entry"
type: plan
task-ref: task.150.create-task-authoring-evidence.md
---

# Implementation Plan: create-task — anchored claims, a bounded title, a --from-observation entry

> Requirements and success criteria: [task.150.create-task-authoring-evidence.md](task.150.create-task-authoring-evidence.md)

## Overview

The work is two engine changes (a title check in the shared card preflight, and a pure seed helper in
create-task `lib.js`), four prose rules across create-task and review-task, and a new create-task
entry section. Every change has a test that is mutation-proved. Always edit the `shared/resources/`
sources, then run `npm run bundle`. Never edit a `skills/*/references/` copy.

## Measurements

Every figure in the task document comes from one of these commands. Each was run on develop at
`e04de749` on 2026-09-24. Re-run a command rather than trusting its number.

**M1: task title lengths.** The definition is the corpus test's: a card document is
`docs/tasks/<dir>/<dir>.md`. Result: 146 documents, 42 over 100 characters, 9 over 255, maximum 368,
median 82.

```bash
command node -e '
const {execSync:x}=require("child_process");const lib=require("./shared/resources/jira-sync.js");const R="e04de749";
const docs=x(`git ls-tree -r --name-only ${R} docs/tasks`).toString().split("\n").filter(f=>{const s=f.split("/");return s.length===4&&s[3]===s[2]+".md"});
const L=docs.map(f=>({n:+f.split("/")[2].split(".")[1],t:String(lib.parseFrontmatter(x(`git show ${R}:${f}`).toString()).frontmatter.title||"").length}));
const o=L.filter(e=>e.t>100);console.log(L.length,o.length,o.map(e=>e.n).sort((a,b)=>a-b).join(" "))'
```

The 42 ids over 100 are the `LEGACY_LONG_TITLES` allowlist:
`49 54 55 56 57 62 64 65 99 101 105 108 113 114 115 116 117 118 119 120 121 122 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 143 144 146`.
Re-run M1 at implementation time and use its output, not this line: a task merged in between may add
an id or remove one.

**M2: published issue titles.** This is a read-only `gh` call. #450 (task.138) has a 357-character
title and #464 (task.140) has a 368-character title.

```bash
gh issue view 464 --json title -q .title | awk '{print length($0)}'
```

**M3: task card documents citing an observation.** Result: 30.

```bash
git grep -l -i -E '(observation|obs) #[0-9]+' e04de749 -- 'docs/tasks/*/*.md' \
  | sed 's/^e04de749://' | awk -F/ '{d=$3; if ($4==d".md") print d}' | wc -l
```

**M4: log entries parked on a task by hand.** Result: 9 entries whose `parked_until` names
`task.N merged to develop`.

```bash
command node shared/resources/observation-log.js scan --workspace "$OBS_WORKSPACE" --json \
  | command node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).entries.filter(e=>/task\.\d+/.test(e.parked_until)).length))'
```

Observation title lengths from the same scan: 44 entries, median 127, and 34 over 100. That is why
the seed cannot copy an entry title as the task title (Phase 4).

**M5: story and epic title lengths.** Result: 23 documents, 0 over 100.

```bash
find docs -name 'story.*.md' -o -name 'epic.*.md' | grep -v -E '\.(qa|gate|bug|review|plan|dod|implementation)\.' \
  | while read f; do awk 'NR==1&&/^---/{f=1;next} f&&/^---/{exit} f&&/^title:/{sub(/^title:[ ]*/,"");gsub(/^"|"$/,"");print length($0);exit}' "$f"; done \
  | awk '{n++; if($1>100)k++} END{print n, k+0}'
```

## Phase-by-Phase Implementation Guide

### Phase 1: Title bound (obs #128)

**`shared/resources/jira-sync.js`**. Add these beside `checkCardSections`, which is at `:1785`, and
export both:

```js
// A card's summary line is the document's title. A title is a name, not a
// summary — the summary belongs in `description`. Measured on 2026-09-24: 42
// of 146 task titles exceeded 100 characters, the longest 368, and GitHub
// published them verbatim (task.150, obs #128).
const CARD_TITLE_MAX = 100;

function checkCardTitle(frontmatter, body = "") {
  const title = frontmatter && frontmatter.title != null ? String(frontmatter.title) : "";
  if (!title || title.length <= CARD_TITLE_MAX) return [];
  const h1 = (/^# (.+)$/m.exec(body) || [])[1] || "";
  const useH1 = h1 && h1.length <= CARD_TITLE_MAX;
  return [{
    severity: "important",
    section: "(title)",
    code: "title-too-long",
    message: `The frontmatter title is ${title.length} characters — the card's summary line would be a paragraph (limit ${CARD_TITLE_MAX}).`,
    fix: useH1
      ? `Use the H1 as the title ("${h1}", ${h1.length} chars) and move the rest into \`description\`.`
      : `Shorten the title to a name of at most ${CARD_TITLE_MAX} characters and move the rest into \`description\`.`,
  }];
}
```

`describeCardScope(result, {title = false} = {})`: when `title` is true, the clean line reads
`… — this checks the card sections and the title only, not template completeness.` The sync callers
keep the default, so their wording does not change.

**`shared/resources/card-preflight.js`**. In `preflight()` at `:115`, change the destructure to
`{ frontmatter, body }`, then:

```js
const sections = lib.checkCardSections(body, specs);
const titleFindings = lib.checkCardTitle(frontmatter, body);
const findings = [...sections.findings, ...titleFindings];
return { file, kind, body, ...sections, findings, ok: findings.length === 0, titleChecked: true };
```

Pass `{ title: true }` through to `describeCardScope`. `formatCardCheck` already renders `important`
as ⚠️ and prints `Fix:`, so it needs no change there.

**`skills/create-task/SKILL.md` § 4**. Append to the frontmatter bullet at `:460`: *`title` is a name,
not a summary. If step 4.6 reports `title-too-long`, use the H1 as the title and move the extra text
into `description`.* Do not put the number in the prose. It lives in `CARD_TITLE_MAX`.

**`shared/resources/authoring-card-preflight.md`**. Add one paragraph under *What to do with the
output*: the preflight also reads the frontmatter `title`, and `title-too-long` is `important`.

**Tests.**

- `card-preflight.test.mjs`: a `withTempDoc` fixture for each case in task § 8. For parity, add
  `"title over the bound"` to `shapes`, filter the title finding out of the authoring side before
  the `deepEqual`, and then assert that it was the only one filtered.
- `card-preflight-corpus.test.mjs`: add `LEGACY_LONG_TITLES` (a frozen `Set` of M1 ids) and one
  `test()` that walks `taskCardDocuments()`. It collects `over` (ids not in the set whose title is
  over the bound) and `stale` (ids in the set whose title is now within it), and asserts both are
  empty with messages naming the ids. It reuses `CORPUS_FLOOR`.

### Phase 2: Evidence rules (obs #127, #124)

**Section 3 prompt.** Add after the *Cite by identity* paragraph at `:692`:

```markdown
**Every current-state name carries its grep** (obs #127). A field, function, flag or file location
the document says exists *today* is cited with the `grep -rn` (or `git grep -n`) hit that found it,
as `path:line` paired with the identifier. A name the grep does not find is marked `(unverified)` or
removed. A task cut from an observation inherits the observation's wording, and an observation is a
memory of a run, not a read of the code: task.123 named a `qa_cycles_completed` field that exists
nowhere.
```

**§ 3.5 *Critical***. Add after the obs #102 bullet at `:432`:

```markdown
- **A current-state name nobody grepped** (obs #127): every field, function and file location the
  Technical Background asserts about the current code has a `grep` hit cited as `path:line`, or is
  marked `(unverified)`. Grep each one now. The author who names a field is the one who greps for it.
- **A categorised population without a witness per member** (obs #124): when the document sorts a
  measured population into classes (used / dead / prose, real dependency / not), each **member**
  carries its witness, meaning the `file:line` of its invocation or the grep that returned nothing. A
  count carries its command (obs #117). A category needs its witness, one per member. Where the
  classification drives a design (a regex keyed on an invocation spelling), quote at least one real
  instance of that spelling from the tree. task.122 counted 15 correctly and categorised 7 of them
  wrongly.
```

### Phase 3: Discriminator rule (obs #135)

**§ 3.5 *Critical***. Add after the Phase 2 bullets:

```markdown
- **A single-statement test keyed on a shared token** (obs #135): for each proposed single-statement,
  population or allowlist test, (a) grep the key it proposes and list every hit. If any hit belongs
  to a different rule, the key is shared, and the test needs a positive marker or a compound
  (verb + discriminator) pattern. (b) Name a restatement that would **not** match the key and say how
  the test sees it. (c) If the test's population is derived from directories, do not name a site to
  add. Name the regex change and a non-vacuity assertion instead.
```

**review-task Step 3**. Add a new numbered check after the last one, matching the shape of checks
6–8:

```markdown
N. **Single-statement test discriminator** (obs #135):
   - For each test the plan proposes that holds one statement, a population or an allowlist, grep
     the key it matches on and list every hit
   - A hit that belongs to a different rule means the key is shared: the test is red at the wrong
     site. Ask for a positive marker or a compound pattern
   - Ask which restatement of the rule would **not** match the key, and how the test sees it. A
     token-free restatement makes the test pass over the thing it was built to catch
   - A population derived from directories never needs a site added by hand. A plan that names one
     has misread the test
   - Flag as **Important** when the key is shared or no token-free restatement is addressed
```

Add to *Common Hallucination Patterns* (`:852`):
`- ❌ A test key that another rule's sites also match`.

**`tests/create-task-authoring-evidence.test.js`**. Use CommonJS and `node:test`. Copy the
heading-bounded, fence-aware section reader pattern of `blocksOf` in
`shared/resources/tests/probe-boundary-signals.test.mjs:253`, not a file-wide regex:

```js
const SITES = [
  { file: "skills/create-task/SKILL.md", heading: "### 3.5 Adversarial Quality Review",
    rules: [
      { key: /obs #127\b/, words: [/grep/, /\(unverified\)/] },
      { key: /obs #124\b/, words: [/per member|each \*\*member\*\*/, /file:line/] },
      { key: /obs #135\b/, words: [/grep the key/, /would \*\*not\*\* match/, /non-vacuity/] },
    ] },
  { file: "skills/create-task/SKILL.md", heading: "### Section 3: Technical Background",
    rules: [{ key: /obs #127\b/, words: [/\(unverified\)/] }] },
  { file: "skills/review-task/SKILL.md", heading: "### Step 3: Technical Accuracy and Anti-Hallucination Review",
    rules: [{ key: /obs #135\b/, words: [/grep the key/, /would \*\*not\*\* match/] }] },
];
// Floor: every heading found (3 sections) and every rule's key found once in its section.
// Words are asserted within the rule's own bullet (from the key to the next top-level bullet), not the section.
```

### Phase 4: `--from-observation` (obs #147)

**§ 1.1 (new), placed between § 1 and § 1.2.**

```bash
# From the repository root. Guarded: the resolver refuses an ephemeral anchor.
source .agents/skills/create-task/references/resolve-observation-workspace.sh || exit 1
node .agents/skills/create-task/references/observation-log.js scan --json > "$TMP/obs-scan.json"
```

Select the entries whose `id` is in the list. Refuse the run, naming the id and its status, when an
id is missing or its `status` is not `open`, because a parked or actioned entry already has a home.
Read each file at `${OBS_LOG_DIR}/<file>` and pass `{frontmatter, body}` to `seedFromObservations`.
The prose must also say which questions are asked (only the title, when `title` is null, and the
tracker-sync prompt at 4.5) and which defaults are taken and reported (priority `Medium`, the
template's category, and effort from the rubric).

The `shared/resources/` literals that make the bundler copy both files into create-task go in the
prose that cites them. `observation-log.js` needs `yaml-subset.js`, which is already bundled.

**The interactivity exceptions.** Add one sentence at each of `:108`, `:935` and `:958`: *In
`--from-observation` mode (§ 1.1) the entries are the collaboration source; only the questions they
leave open are asked.* At § 4.4 `:542`, add: *In `--from-observation` mode, write the rubric value
and report it in the completion message.*

**§ 5 step 2b.** After both files exist, run each `park[]` vector:

```bash
node .agents/skills/create-task/references/observation-log.js set-status --id 124 --status parked \
  --parked-until "task.150 merged to develop" --json
```

Read `reason`. `ok` and `already` are success. Report any other value verbatim and continue: parking
never blocks the document, and the entry stays `open`, which is visible and not lost.

**`skills/create-task/scripts/lib.js`**:

```js
const { CARD_TITLE_MAX } = require("../references/jira-sync.js");

function parseObservationBody(text) // → { issue, improvement, principle } from `## Issue` / `## Improvement` / `## Principle`; missing → ""

function seedFromObservations(entries, { taskId }) {
  // entries: [{ frontmatter, body }], any order
  // throws on a non-open entry: `observation #N is <status> — it already has a home`
  // ids ascending; tags = union(skill[]) + "observation"
  // title: single entry → strip a leading "<skill>: " prefix; `[Task ${taskId}] ${bare}` if ≤ CARD_TITLE_MAX,
  //        else null with titleReason "over-bound"; several entries → null, "multiple-entries"
  // description: the Improvement's first sentence per entry, joined
  // references: [`Observation #${id} — ${title}`]
  // changeLogDescription: `Initial draft — cut from observations #a, #b`
  // park: ids.map(id => ["set-status", "--id", String(id), "--status", "parked",
  //                      "--parked-until", `task.${taskId} merged to develop`, "--json"])
}
```

**`skills/create-task/tests/from-observation.test.js`**. The fixtures are real-shaped entries,
copied in structure from the log format (frontmatter keys as `renderObservation` writes them). The
round trip requires `shared/resources/observation-log.js` by repository path, not through
`.agents/skills` (see the gitignored-symlink trap). It runs
`run(["init","--workspace",ws])`, then `run(["write",…,"--body-file",f,"--workspace",ws])`, then each
`park[]` vector with `--workspace ws`, then `scan --json`, and asserts `parked` with the expected
`parked_until`. **`ws` must be repo-local, not under `os.tmpdir()`.** The engine refuses `/tmp` as
an ephemeral workspace (`EPHEMERAL_PATTERNS` in `observation-log.js`), so a `tmpdir()` workspace is
green on macOS (`/var/folders`) and red in Linux CI. Copy the `SCRATCH_ROOT` pattern and its
in-process `ephemeralReason` assertion from `shared/resources/tests/observation-log.test.mjs:66`.

### Phase 5: Docs

- CHANGELOG `[Unreleased]` › Changed: one paragraph per phase, citing `(task 150)` and the obs id.
- Run `npm run bundle`, `npm run generate-catalog`, `npm run ci:fast` and `npm run bundle:check`.

## Key Patterns and References

- § 3.5 obs #103, #117 and #102 bullets, and review-task checks 6–8, are the shape to copy.
- task.145's section-scoped population test is the precedent for keying on section, not file. A
  file-scoped test passed on a site that lacked the text (task.144 QA cycle 2).
- `CARD_SECTIONS_BY_KIND` lives once, beside its checker. `CARD_TITLE_MAX` follows the same rule.
- Patch Markdown with split/join and assert the split count. Never use `String.replace` with a
  replacement string.

## Testing Approach

- `command node --test shared/resources/tests/card-preflight.test.mjs shared/resources/tests/card-preflight-corpus.test.mjs`
- `command node --test tests/create-task-authoring-evidence.test.js skills/create-task/tests/from-observation.test.js`
- Mutation table: task § 8. For each row, snapshot the file with `cp`, apply the mutation, confirm the
  named test goes red, restore from the snapshot, and confirm it goes green. Record each run in the
  implementation report.
- Move the local `.agents/skills` symlink aside before trusting a local green.
