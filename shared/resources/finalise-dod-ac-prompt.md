---
name: finalise-dod-ac-prompt
description: Explore subagent prompt for AC traceability, PR status, and documentation check in /finalise DoD parallel dispatch. Substitute <STORY_FILE>, <PR_NUMBER>, <STORY_TYPE>, <DIFF_FILE>, and <RERUN_SCOPE> before dispatching.
---

# AC Traceability Check — Explore Subagent Prompt

**Usage**: Dispatch as an Explore subagent from `/finalise` Steps 3–5 parallel dispatch. Substitute `<STORY_FILE>`, `<PR_NUMBER>`, `<STORY_TYPE>`, `<DIFF_FILE>`, and `<RERUN_SCOPE>` before sending.

---

## Instructions

You are a read-only verification agent. Check AC traceability, PR review status, and documentation updates for the story/task being finalised.

### Step 0: Read the re-run scope

The caller computed this run's scope from the previous run's record (`finalise-rerun-scope.js scope`):

```
<RERUN_SCOPE>
```

- **Use the ids it lists as `ac_id`, quoted exactly** (`ac_id: "#2"` — unquoted, a `#` starts a YAML comment). It lists them in every mode. A verdict under any other id is not merged.
- **`mode: full`**: judge every criterion, exactly as Step 3 says.
- **`mode: scoped`**: judge only the criteria under **Re-judge**, by Step 3's rules. For a `reported-gap` entry that lists members, re-check the members it names under `re-check members` and any member whose evidence moved since the prior head; return every member you judged in `members`. A `re-check members` entry you do not return counts as `FAIL`, and so does a re-judged criterion you do not return. When the criterion fails for a reason that is not a member (the execution rule, a test that does not cover it), state that reason in `non_member_fail`: the caller reads that field, never your `note`. A `FAIL` that sets it, or that names no failing member, stands whatever the members say; without it, a `FAIL` whose failing members are all carried or new on unchanged evidence is overturned. An entry that shows `prior non-member FAIL` names the reason the previous run gave: check whether it still holds. Copy each **Carry** criterion through unchanged.
- **A problem you notice outside your scope** — in a carried criterion, a carried member, or a member no earlier run named whose evidence has not changed — goes in `advisories` with its evidence. It is reported to the reader and does not fail the run. The caller restores every carried verdict whatever you return, so an advisory is the only place such a finding is kept.

### Step 1: Read the story/task file

Read `<STORY_FILE>`. Extract:
- Every acceptance criterion from `## Acceptance Criteria` (stories) or `## 9. Success Criteria` / `## Success Criteria` (tasks). Include both checked `- [x]` and unchecked `- [ ]` items.
- The PR number is `<PR_NUMBER>`, resolved by the caller. Do not derive it from the document — a document cites other work's PRs (task 175). An empty `<PR_NUMBER>` means none was resolved: report `pr_status: NOT_FOUND`.
- The story/task type from frontmatter `type:` field (e.g. `api`, `ui`, `data`, `auth`, `infrastructure`, `task`, `refactoring`).

### Step 2: Check PR status

Run: `gh pr view <PR_NUMBER> --json state,reviewDecision,url 2>/dev/null`

- If PR number not found: set pr_status = NOT_FOUND, pr_review_decision = null.
- Parse `state` (OPEN | MERGED) and `reviewDecision` (APPROVED | REVIEW_REQUIRED | CHANGES_REQUESTED | null).

### Step 3: Check each acceptance criterion

For each AC item extracted in Step 1:
1. Read `<DIFF_FILE>` to find file paths modified in the PR.
2. For each modified file path: search for code that implements the AC (grep key terms from the AC description).
3. Also search for a test file (`.spec.ts`, `.test.ts`, `.spec.js`) that covers the AC — grep for the same key terms.
4. **Citation rule**: A `PASS` requires BOTH a non-null `code_citation` AND a non-null `test_citation`. Missing either → `FAIL`. No exceptions.
5. **Execution rule**: the cited test must actually run in a lane that gates this change. A test that exists but never executes on the PR is not evidence — it is a citation. Determine the lane from the test's path and the project's CI config (e.g. a `paths-ignore`d job, a suite excluded by the runner's default scope, a directory the per-PR job does not select). If the cited test does not run per-PR, set `status: FAIL` and name the lane in `note`, even though the file exists.
6. **Quantifier rule**: a criterion over a set ("each test", "every file", "all call sites") is checked member by member. List the members from `<DIFF_FILE>`, map each one to its evidence, and put every unmapped member in `note`. `PASS` only when that list is empty. Return the list as `members` (each `member`, `evidence`, `status`), so a re-run can carry the mapped ones. Evidence that some members are covered proves "at least one", not "each".
7. **Amendment rule**: a criterion is judged as it was reviewed. Run, from the repository root, `command node .agents/skills/finalise/references/criteria-drift.js --doc "<STORY_FILE>" --base-from-review "$(gh pr view <PR_NUMBER> --json baseRefName -q .baseRefName 2>/dev/null || echo develop)" --json` (criteria-drift.js, task.248). For each `changed` entry whose `kind` is `reworded`, `added` or `removed` and whose `approved` is false, set that criterion's `status: FAIL` and `note: "amendment unapproved"`, whatever its evidence. Do the same for an `appended` entry when the added text relaxes the criterion (widens a bound, adds an exception) and `approved` is false; an appended evidence note does not relax it. Exit 1 (`no-criteria`) means there is nothing to compare. Any other non-zero exit is not a pass: name it in every criterion's `note` and set `status: FAIL`.

⚠️ **A ticked AC checkbox is a claim, not evidence.** Verify against the diff and the test lane; never treat the story's own checkbox as satisfying either rule. Both failure modes below have occurred and neither was caught by the checkbox:

- An AC ticked complete with **no test written at all**. When the assertion was finally written it went **red immediately**, having concealed a live defect for the whole period it was assumed present.
- A test written and cited, but placed in a **smoke/e2e directory excluded from the per-PR job** — so it would never have guarded the PR it was authored for.

**Five kinds of criterion may carry `test_citation: "NOT_APPLICABLE: …"`, and only these five:**
(the last of them, a CI-state criterion, is not graded here at all — task 249)

- **"No unit tests applicable."** A task that says so explicitly (cite that line). Mark `PASS` with a note.
- **A documentation criterion.** Its whole deliverable is what a document says — a CHANGELOG entry cites the work item, a reference doc is updated, a doc agrees with the code — not what code does. Classify by what the criterion *requires*, not how it is worded: if it can be stated as "file F says S", it is a documentation criterion; if meeting it needs code to do something when run, it is not. For a documentation criterion:
  - `code_citation` is the document line that meets it (e.g. `CHANGELOG.md:309`). **Read that text.** `note` says in one clause what the cited text states and why that meets the criterion. A citation you did not read is a `FAIL`.
  - `test_citation` is a test that pins that document when one exists — for a CHANGELOG citation, the repository's changelog corpus guard if it has one; name it, and say in `note` when it runs (a post-merge guard is still a guard). Otherwise `"NOT_APPLICABLE: documentation criterion"`.
  - `PASS` when the cited text is present and says what the criterion requires. `FAIL` when it is absent or says something else.
- **A measured criterion.** A non-functional bound (a runtime, size, count or rate the criterion states as a number) whose natural evidence is a measurement, not a per-PR test. Classify it by what it bounds **and** by whether a per-PR test could assert that bound: if one could, it is a behaviour criterion and takes the normal path. For a measured criterion:
  - `code_citation` is the line of a **committed** artifact that records the measurement and the command that produced it — one committed by the time the work is accepted: a QA report, the QA gate file, or this run's DoD file. **Read that line.** `note` states the bound, the measured value and the command.
  - **The implementation report is not one of them.** The pipeline commits it in its last step, after this check runs, so a citation of it is uncommitted on every run (obs #105). A measurement found only there is `FAIL` with `note: "cite the QA report or DoD"` — the fix is to record the figure where it is committed, not to accept it from the report.
  - `test_citation` is `"NOT_APPLICABLE: measured criterion"`.
  - `PASS` when the criterion states a bound, the cited measurement meets it, and the command is named. `FAIL` when the measurement is uncited or uncommitted, or when it misses the bound. A criterion that states no numeric bound ("no measurable change", "fast enough") is not a measured criterion: it takes the behaviour path, and fails there without a test.
  - A wall-clock bound decays with every later commit and every change in machine load. Its cited measurement must record the load it ran under (`uptime` beside `time`) and be taken on the PR's head commit. A figure from an earlier commit, or with no load recorded, is `FAIL` with `note: "re-measure"`. A bound is graded on the median of at least five runs, each with its load recorded: a single run is `FAIL` with `note: "re-measure"`.
- **A process criterion.** Its deliverable is how the work was verified, not what the code does — "each fix is mutation-proven", "every finding is reproduced before it is fixed", "each phase is reviewed". Classify by what the criterion *requires*: if it names a verification step applied to units of the work, it is a process criterion; if it names a behaviour the code must have, it is not (obs #82). For a process criterion:
  - Find where the work item defines the units — its Testing Strategy, its phase list, the fixes its QA reports name — and apply the **quantifier rule** (rule 6) to that set: each unit is a member.
  - `code_citation` is the committed record the work item names for the process (a QA report's fix section, a gate's evidence line, the DoD). Each member's `evidence` is the line recording that unit's step — for a mutation proof, the revert and the test that went red. **Read each line.**
  - `test_citation` is `"NOT_APPLICABLE: process criterion"`.
  - `PASS` when every unit has a committed record of the step. `FAIL` naming the uncovered units in `note`. A record that says the step happened without saying what it found ("mutation-tested ✅") is not evidence of it.
- **A CI-state criterion.** Its only evidence is the state of the PR's CI run — "CI is green on the PR head", "every required check passes". You run before `/finalise` reads CI, so you cannot see the reading that decides it, and a grade you give now would be a guess (obs #110). Return it **ungraded**:
  - `status: DEFERRED-CI`. `code_citation` is the CI configuration that defines the run (e.g. `.github/workflows/ci.yml:1`); `test_citation` is `"NOT_APPLICABLE: CI-state criterion"`; `note` names what the criterion asks of CI.
  - `/finalise` Step 6 grades it from CI reading 1 — `SUCCESS` → PASS, `FAILURE` → FAIL, anything else leaves it deferred and the CI decision table decides. Until then it counts as **not met**, so a `DEFERRED-CI` you return can only lower `overall`, never raise it.
  - Only a criterion whose **whole** evidence is CI state takes this path. "The new test passes in CI" is a behaviour criterion: cite the test, and the execution rule covers the lane. "CI is green *and* the docs are updated" is two criteria; judge the doc half by its own path and say so in `note`.

`test_runs_per_pr` is `null` on all five kinds: the execution rule reads a test lane, and none has a test in one. **A behaviour criterion never takes any of these paths**, and a bound a per-PR test could assert is a behaviour criterion. "Hard to test" is not "no unit tests applicable", and describing a behaviour in a document does not make it a documentation criterion. Before this rule existed, every run failed its CHANGELOG criterion for having no test and the orchestrator overrode it by hand; a check that is overridden on every run is not a check.

### Step 4: Check documentation updates

Based on `<STORY_TYPE>`:
- **api / backend**: Is there an updated OpenAPI/Swagger spec, or API docs file? Search for `.yaml`/`.json` files with `paths:` or `swagger:` content, or `docs/api/`.
- **ui / frontend**: Are there updated screenshots or user guide markdown files in `docs/`?
- **data**: Is schema documentation updated? Search `docs/` for ERD or schema doc mentions.
- **refactoring / task**: Are any README or skill files updated where behaviour changed? Do not read `CHANGELOG.md` for this: the changelog entry is agent 4's check (`finalise-dod-docs-prompt.md`), which runs only when the project opts in (`changelog.enforce`, task.241). A criterion of the work item's own that names the changelog is still checked above, as a documentation criterion.

If no documentation update is required for the story type (e.g. pure internal refactor): mark `NOT_APPLICABLE` with a note citing the reason from the story file.

---

## Output

Return **YAML only** — no prose before or after it. Put the whole answer in **one** fenced block opened
with the info string `finalise-ac-yaml` (three backticks, then `finalise-ac-yaml`), holding exactly the
YAML below. `/finalise` takes the block out of your transcript file and records its size and hash; it
does not retype your answer, so a second fenced block with that info string, or text outside the one
block, is ignored at best. The shape:

```yaml
ac_traceability:
  story_file: "<STORY_FILE>"
  pr_number: <number or null>
  pr_status: APPROVED | OPEN | MERGED | NOT_FOUND
  pr_review_decision: APPROVED | REVIEW_REQUIRED | CHANGES_REQUESTED | null
  acs:
    - ac_id: "AC1"
      description: "brief AC description (≤15 words)"
      status: PASS | FAIL | DEFERRED-CI      # DEFERRED-CI only for a CI-state criterion (Step 3)
      severity: low | medium | high         # REQUIRED on a FAIL (Severity rule below); omit on PASS / DEFERRED-CI
      code_citation: "path/to/file.ts:NN"   # null if not found
      test_citation: "path/to/file.spec.ts:NN"  # null if not found, or "NOT_APPLICABLE: reason"
      test_runs_per_pr: true | false | null     # false → status must be FAIL; name the lane in note. null only when test_citation is NOT_APPLICABLE
      members:                                  # required when the quantifier rule applies; omit otherwise
        - member: "the member's name, as you listed it"
          evidence: "path/to/file.spec.ts:NN"   # null if unmapped
          status: PASS | FAIL
      non_member_fail: "reason"                 # only on a FAIL whose reason is not a member; omit otherwise
      note: "optional explanation"
  docs:
    - item: "description of doc item"
      status: PASS | FAIL | NOT_APPLICABLE
      severity: low | medium | high    # REQUIRED on a FAIL (Severity rule below); omit otherwise
      citation: "path/to/file.md:NN"   # null if not found
      note: "optional, required if NOT_APPLICABLE"
  advisories:                                   # findings outside the Step 0 scope; [] when none
    - ac_id: "SC-1"
      note: "what you saw, with its evidence"
  overall: PASS | FAIL | PARTIAL
  summary: "one-line summary of AC traceability results"
```

**Citation rule**: `status: PASS` requires a non-null citation. Null citation → `status: FAIL`. `NOT_APPLICABLE` must have a `note`.

**Execution rule**: for acceptance criteria with a test citation, `status: PASS` additionally requires `test_runs_per_pr: true`. A cited test in a lane the PR does not run is a citation, not evidence → `status: FAIL` with the lane named in `note`. The `NOT_APPLICABLE` kinds in Step 3 carry `null` here and are judged by their own rules.

**Severity rule**: every FAIL carries `severity`. It is what lets `/finalise` take the bounded fix-and-recheck path (Step 8a) on a low finding instead of halting a hands-free run. `low`: one member or one check, where the code's behaviour is right or it fails closed, such as a missing test for a correct branch or one wrong doc line. `medium`: behaviour is wrong for a member. `high`: the criterion is undelivered, or it fails open. More than one failed member is not low. A FAIL with no `severity` is read as not low and halts, so leaving it off is never the lenient choice.
