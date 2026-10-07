---
type: report
title: Doc drift audit
description: User-facing docs checked against current skill behaviour on develop at a0e135a6; 108 confirmed findings.
created: 2026-10-07
---

# Doc drift audit — 2026-10-07

**Scope:** `README.md`, `docs/concepts/`, `docs/operations/`, `docs/examples/`, `docs/reference/`
(not the generated skill catalog), `docs/runbooks/`, `docs/standards/` and the 10
`skills/*/README.md` files. **Not covered:** `docs/contributing/`, `docs/architecture/`,
`AGENTS.md`, and the `SKILL.md` files themselves (they are the source of truth here).

**Method:** four auditors, one per doc cluster, checked each concrete claim (commands, flags,
steps, paths, defaults) against `skills/*/SKILL.md`, `shared/resources/`, `package.json` and
CHANGELOG `[Unreleased]`. One verifier per cluster then tried to refute every finding. Only
findings the verifier confirmed are listed. The run used 8 agents.

**Baseline:** `develop` at `a0e135a6`, 401 commits after the last release tag `v0.52.0`
(2026-09-29).

## Summary

108 confirmed (12 high, 57 medium, 39 low) and 3 refuted. By kind: 62 stale, 25 missing,
11 broken, 10 inconsistent. The findings cover 46 docs.

### Themes

1. **Branch model (11 findings, 4 high).** Story branches are now cut from and PR back to
   `develop`. An epic has a branch only when it opts in with `branch_model: epic-integration`.
   The FAQ, the story-development runbook, the parallel-stories runbook, the first-week guide,
   quickstart-task, architecture.md and both develop-* READMEs still describe the old model, an
   always-present epic integration branch, or contradict each other. quickstart-task also
   recommends `main` and an epic prompt that no longer exists.
2. **Install and packaging commands that fail (4 high).** README's `npm run package:skill`
   form, the manual-install `tar` snippet, and getting-started's Option C `cp` all fail as
   written.
3. **Consumer paths.** troubleshooting.md tells consumers to `source shared/resources/…`. A
   consumer repo has only `.agents/skills/<skill>/references/`.
4. **Lite mode described as a flag** that skips context-gathering (glossary, troubleshooting,
   two runbooks). It is set automatically and changes only QA depth.
5. **Step 5c / `/review-pr` under-described.** Gate-loop diagrams still route only
   `CONCERNS / FAIL` to qa-fix. The quickstart artifact lists omit `review.N`, `pr-review.N`
   and `sprint-review-summary.md`. commands.md omits `--inline`, `--effort` and the work-item
   targets.
6. **Release process.** The release runbook still shows the direct fast-forward to `main`. That
   path was removed on 2026-09-22.

## High (12)

### OVERVIEW-1 — `README.md:85` (broken)

- **Doc says:** `npm run package:skill -- skills/<skill-name>` packages a single skill
- **Reality:** The `package:skill` script runs `cd skills/create-skill/scripts && python3 package_skill.py`, so the appended `skills/<name>` resolves against skills/create-skill/scripts/ and package_skill.py exits with 'Skill folder not found'. docs/contributing/packaging.md:65 uses the correct `../../<skill-name> ../../<skill-name>` form.
- **Evidence:** package.json:62 (`package:skill`); skills/create-skill/scripts/package_skill.py:50-55 (`Path(skill_path).resolve()` then not-found error)
- **Fix:** Change to `npm run package:skill -- ../../<skill-name> ../../<skill-name>` (matching packaging.md), or keep only the direct `python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>` form.

### OVERVIEW-2 — `docs/concepts/getting-started.md:272` (broken)

- **Doc says:** Manual install: `curl … .tar.gz \| tar -xz --strip-components=1 -C /tmp/agent-skills-install --wildcards 'agent-skills-*/skills/*'`
- **Reality:** Nothing creates /tmp/agent-skills-install first, so tar fails with "could not chdir". On macOS, bsdtar also rejects `--wildcards` ("Option --wildcards is not supported"). The snippet fails on every platform as written.
- **Evidence:** Measured: `tar -xz -C /private/tmp/nonexistent-xyz-dir` gives "could not chdir", and `tar --wildcards` on bsdtar 3.5.3 gives "Option --wildcards is not supported"
- **Fix:** Add `mkdir -p /tmp/agent-skills-install` before the curl. Do not just drop `--wildcards`: GNU tar matches member names literally without it, so the snippet would then fail on Linux. Drop the member pattern and the flag together (extract the whole tarball with `--strip-components=1`). The following loop already copies only skills/*/, so this works on both GNU tar and bsdtar.

### OVERVIEW-3 — `docs/concepts/getting-started.md:346` (broken)

- **Doc says:** Option C: run `python3 skills/create-skill/scripts/package_skill.py skills/develop-story`, then `cp /path/to/agent-skills/skills/develop-story/develop-story.zip .agents/skills/`
- **Reality:** With no output-dir argument, package_skill.py writes `<name>.zip` to the current directory (the repo root), not into skills/develop-story/. The next `cp` step therefore fails.
- **Evidence:** skills/create-skill/scripts/package_skill.py:78-84 (`output_path = Path.cwd()` when output_dir unset)
- **Fix:** Pass the output directory: `python3 skills/create-skill/scripts/package_skill.py skills/develop-story skills/develop-story`. Or change the cp source to `/path/to/agent-skills/develop-story.zip`.

### OVERVIEW-4 — `docs/concepts/quickstart-task.md:86` (stale)

- **Doc says:** Phase 0 prompts: Base branch `main` (default), PR target `main`, Epic branch No
- **Reality:** develop-task asks only two questions, Q1 base and Q2 PR target, and there is no epic-branch question ("No Q3"). Both recommend `develop`, not `main`. A user following the table branches from and targets `main`, against Gitflow.
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:650-655 (develop-task Q1: "develop" Recommended), :675-678 (Q2: "develop" Recommended), :682 ("No Q3"), :689
- **Fix:** Replace the table with two rows: Q1 base branch `develop` (Recommended), Q2 PR target `develop` (Recommended). Remove the Epic branch row. In §5B, change `git checkout main` to `git checkout develop`.

### REFERENCE-2 — `docs/reference/tracker-workflow.md:36` (stale)

- **Doc says:** "Step-file wiring is task.40, so on a GitHub board you can author, validate and probe the file today, and gh-stage.js will move a card when you call it directly, but the pipeline steps still use their own inline GraphQL."
- **Reality:** task.40 (replace the inline GitHub GraphQL board blocks with gh-stage.js calls) is accepted. The develop-pipeline step docs now call gh-stage.js: steps 0, 2, 4, 5-6 and 7, and lite-mode names `gh-stage.js --stage done` for GitHub. GitHub pipeline runs do read the ladder.
- **Evidence:** docs/tasks/task-registry.md:84 (task 40 `accepted`); shared/resources/develop-pipeline-step-7-finalise.md, -step-4-create-pr.md, -step-5-6-qa-loop.md each contain `gh-stage.js`; shared/resources/develop-pipeline-lite-mode.md:29
- **Fix:** Rewrite the Status callout to say that both trackers read the file and that the pipeline steps on GitHub move cards through gh-stage.js. Remove the 'step-file wiring is task.40 … inline GraphQL' sentence.

### REFERENCE-3 — `docs/reference/troubleshooting.md:96` (broken)

- **Doc says:** Consumer-facing fix commands `source shared/resources/resolve-paths.sh` (line 96), `source shared/resources/bitbucket-auth.sh` (lines 25, 30) and `bash -c 'source shared/resources/resolve-platform.sh'` (line 408)
- **Reality:** A consumer repo has no `shared/resources/`. These helpers ship as bundled copies under `.agents/skills/<skill>/references/`, so the commands fail with 'No such file'. The same doc already uses the installed path for handover-render.js and gh-stage.js (`.agents/skills/develop-task/references/...`).
- **Evidence:** skills/develop-task/references/{resolve-paths.sh,bitbucket-auth.sh,resolve-platform.sh} exist; docs/reference/troubleshooting.md:281,357 use `.agents/skills/develop-task/references/`
- **Fix:** Replace `shared/resources/X.sh` with `.agents/skills/develop-task/references/X.sh` in lines 25, 30, 96 and 408. Alternatively, add a note that `shared/resources/` exists only in the agent-skills repo.

### REFERENCE-4 — `docs/reference/faq.md:39` (stale)

- **Doc says:** "Why is the develop-story branch model two levels deep (epic → story)? … The epic branch is a long-lived integration point that collects sibling stories. Each story PR is small (epic → story diff), the epic PR to develop is the big merge"
- **Reality:** Story branches are cut from `develop` and PR back to `develop` by default. An epic has no branch of its own unless it opts in with `branch_model: epic-integration`, in which case `epic/{n}.{slug}` is created on demand. When the epic declares nothing, Phase 0 Q1 recommends `develop`.
- **Evidence:** skills/develop-story/SKILL.md:3 (description: 'Story branches are cut from `develop` … an epic has no branch of its own unless it opts in'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md Q1 table (`nothing, or develop-direct` → `develop`)
- **Fix:** Rewrite the entry: the default is develop-direct, with one level (story → develop). Epic integration branches are opt-in through `branch_model: epic-integration` (see configuration.md `branching.epicIntegration.*`). Explain when to opt in.

### RUNBOOKS-1 — `docs/runbooks/pm-workflows.md:61` (broken)

- **Doc says:** Chain 4 — Brownfield story: `1. /brownfield-story → single-story scoping`
- **Reality:** No `brownfield-story` skill exists; it was deleted in commit 2c166973 (2026-04-29, 'remove stale zip distributables and brownfield-story'). The command does nothing.
- **Evidence:** `skills/brownfield-story/SKILL.md` absent from tracked tree; `git log --diff-filter=D -- skills/brownfield-story/SKILL.md` → 2c166973
- **Fix:** Replace Chain 4 with a chain that exists (e.g. `/create-epic` with a single story, or `/create-task` for non-user-facing work) and remove the `/brownfield-story` line and its decision-tree node 'Brownfield story'.

### RUNBOOKS-2 — `docs/runbooks/release-and-install.md:22` (stale)

- **Doc says:** 'Direct fast-forward (solo / no branch protection): git checkout main && git merge --ff-only develop && git push'
- **Reality:** The direct fast-forward path was deliberately removed from the release reference on 2026-09-22: `main`'s required check is declared on `pull_request` only, so a direct push is refused and lands only by admin bypass. The release-prep PR is now the only documented promotion path.
- **Evidence:** docs/contributing/releases.md:119 ('There used to be a "Direct fast-forward" option here … removed on 2026-09-22'); CHANGELOG.md:1163-1177 ('the release-prep PR is now the only documented promotion path … The direct option is removed')
- **Fix:** Delete the 'Direct fast-forward' block in §2; keep only the PR-based path and link to releases.md for why the direct option was removed.

### RUNBOOKS-4 — `docs/runbooks/story-development.md:43` (stale)

- **Doc says:** Prerequisites: '`develop` exists (story PRs target an epic branch cut from `develop`)'; Verification (line 325): 'When all stories under an epic are accepted, merge the epic branch to `develop`.'
- **Reality:** The default branch model is develop-direct: story branches are cut from and PR back to `develop`; an epic has no branch unless it opts in with `branch_model: epic-integration`. The same runbook's own §Branch model (lines 189-217) says this, so the prerequisite and closing instruction contradict it.
- **Evidence:** skills/develop-story/SKILL.md:3 (description: 'Story branches are cut from `develop` and PR back to `develop` … an epic has no branch of its own unless it opts in to `branch_model: epic-integration`'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:615 (Q1/Q2 recommendation table)
- **Fix:** Line 43: 'story PRs target `develop` by default, or the epic's `epic/{N}.{slug}` integration branch when the epic opts in'. Line 325: 'If the epic used an integration branch, raise the `epic/{N}.{slug}` → `develop` PR once all its stories are accepted.'

### RUNBOOKS-5 — `docs/runbooks/create-parallel-stories.md:61` (stale)

- **Doc says:** 'PRs target the epic branch, not `develop`. Same convention as serial development.' (also diagram line 41 'Merge in any order to epic branch' and step 3 line 53 'Merge each story PR to the epic branch')
- **Reality:** Serial development's default is develop-direct — story PRs target `develop`; an epic integration branch exists only when the epic declares `branch_model: epic-integration`.
- **Evidence:** skills/develop-story/SKILL.md:3; docs/runbooks/story-development.md:193-215 (develop-direct default, epic integration opt-in)
- **Fix:** Replace with: 'Each PR targets the base chosen at develop-story Phase 0 Q2 — `develop` by default, or the epic integration branch when the epic opted in.' Update the diagram node and step 3 to match.

### SKILL-READMES-STANDARDS-1 — `skills/develop-story/README.md:16` (stale)

- **Doc says:** Story branches are cut from develop ... there is no epic integration branch, and a story branch is never cut from one (repeated at L53: 'No epic branch is created')
- **Reality:** develop-story supports an opt-in epic integration branch: an epic declaring branch_model: epic-integration leads Q1 with epic/{n}.{slug}; Step 1 creates it on demand and stories are cut from and PR into it
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:611-642 (branch_model: epic-integration -> EPIC_BRANCH); shared/resources/develop-pipeline-step-1-create-branch.md:67 '#### When the Q1 answer is an epic integration branch (develop-story only)'; skills/develop-story/SKILL.md:3 description; commit 360edb70
- **Fix:** As proposed. The Git row is at L23, not L22. Also fix diagram node L85 'create-story-branch from develop' and artifact-table L459 'Story branch ... (from develop)'.


## Medium (57)

### OVERVIEW-5 — `docs/concepts/quickstart-task.md:135` (stale)

- **Doc says:** Cleanup: `git branch -D task/task.{N}.readme-contributor-footnote`
- **Reality:** Task branches are named `feature/task.<id>.<name>`, so this command fails with "branch not found".
- **Evidence:** skills/create-branch/SKILL.md:90 (`feature/task.<id>.<name>`); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:652
- **Fix:** Change to `git branch -D feature/task.{N}.readme-contributor-footnote`.

### OVERVIEW-7 — `docs/concepts/quickstart-task.md:108` (missing)

- **Doc says:** 'You should see' lists six files: spec, plan, implementation, qa, gate, dod
- **Reality:** A develop-task run also writes the Step 2 review report `task.{N}.review.{n}.{name}.md`, the Step 5c PR review report `task.{N}.pr-review.{n}.{name}.md` (the QA loop's exit gate) and `sprint-review-summary.md`. A user checking against this table would conclude Step 5c never ran.
- **Evidence:** skills/review-pr/SKILL.md:663-666 (`.pr-review.{n}.` artifact); skills/finalise/SKILL.md:1289 (`sprint-review-summary.md`); docs/tasks/task.194.*/ (review.1, pr-review.1, sprint-review-summary.md present)
- **Fix:** Add rows for `task.{N}.review.1.{name}.md` (review-task), `task.{N}.pr-review.1.{name}.md` (review-pr, Step 5c) and `sprint-review-summary.md` (finalise).

### OVERVIEW-8 — `docs/concepts/quickstart-story.md:145` (missing)

- **Doc says:** 'You should have all 10 artifact types' from `ls` of the story directory, with row 10 = `dod.1` 'Definition-of-Done checklist + sprint review summary'
- **Reality:** There is no `story.{N}.1.pr-review.1.add-footer-link.md` row, though Step 5c writes one. The sprint review is a separate `sprint-review-summary.md`, not part of the DoD file. Rows 1-2 (PRD and epic) are not in the story directory the `ls` lists.
- **Evidence:** skills/review-pr/SKILL.md:663 (`.pr-review.{n}.` kind); skills/finalise/SKILL.md:1287-1289 (`{story-directory}/sprint-review-summary.md`)
- **Fix:** Add a `story.{N}.1.pr-review.1.add-footer-link.md` row (review-pr, Step 5c) and a separate `sprint-review-summary.md` row. Note that the PRD and epic live in parent directories.

### OVERVIEW-9 — `docs/concepts/quickstart-task.md:53` (broken)

- **Doc says:** Verify Bitbucket auth with `source shared/resources/bitbucket-auth.sh` (same in quickstart-story.md:54 and :196)
- **Reality:** These quickstarts run in a consumer project, which has no `shared/resources/` directory. Installed skills carry the helper as `.agents/skills/<skill>/references/bitbucket-auth.sh`, so the command fails with 'No such file'.
- **Evidence:** git ls-files: skills/create-pr/references/bitbucket-auth.sh (bundled copy), and only this repo has shared/resources/bitbucket-auth.sh
- **Fix:** Use `source .agents/skills/create-pr/references/bitbucket-auth.sh` in quickstart-task.md:53 and quickstart-story.md:54 and :196.

### OVERVIEW-10 — `docs/concepts/getting-started.md:121` (missing)

- **Doc says:** The wizard's step table (1-9 plus 2b) and 'Files produced' list
- **Reality:** After the skills install, the wizard has a `tracker-workflow.yaml` step. It keeps an existing file, generates one from the live board, or writes a template with a warning to edit it before the first run. Neither the table nor 'Files produced' mentions it.
- **Evidence:** scripts/setup-consumer.sh:580 (`write_tracker_workflow()`), :1955 (called from main after install_skills), :624/:632 (record_step 'generated from board' / 'template (edit before first run)')
- **Fix:** Add a table row between steps 8 and 9 for scaffolding `tracker-workflow.yaml` (generated from the live board when possible, otherwise a template to edit), and add `tracker-workflow.yaml` to 'Files produced'.

### OVERVIEW-11 — `docs/concepts/getting-started.md:129` (stale)

- **Doc says:** Step 4 'Writes `.env.example` (keys only); optionally writes `.env` + adds to `.gitignore`'
- **Reality:** The wizard writes live credentials to `.secrets/tooling.env` and adds both `.secrets/` and `.env` to .gitignore. This also contradicts the same page's 'Files produced' list, which says `.secrets/tooling.env`.
- **Evidence:** scripts/setup-consumer.sh:366 (`CRED_FILE=".secrets/tooling.env"`), :430-455 (write + `.gitignore` append of `.secrets/` and `.env`)
- **Fix:** Change to 'Writes `.env.example` (keys only); optionally writes `.secrets/tooling.env` and adds `.secrets/` and `.env` to `.gitignore`'.

### OVERVIEW-13 — `docs/concepts/architecture.md:96` (stale)

- **Doc says:** Dependency map: `FN --> ensure-epic-github-issue` / `ensure-epic-jira-issue`; line 111: 'finalise picks one of ensure-epic-{github,jira}-issue via the platform resolver'
- **Reality:** finalise never invokes ensure-epic-*. It has no `invokes:` key and its only `ensure-` mention is the bug sub-routines. The epic ensure sub-routines are called by create-story, create-epic, review-epic and review-story.
- **Evidence:** skills/finalise/SKILL.md (no `ensure-epic` match; only :1915 ensure-bug-*); skills/create-story/SKILL.md:4 (`invokes: [ensure-epic-github-issue, ensure-epic-jira-issue, …]`); skills/create-epic/SKILL.md:332
- **Fix:** Remove the FN→EGH/EGJ edges and the sentence at :111. Draw the ensure-epic edges from create-story (in its `invokes` list) and create-epic (body, :332). Optionally also from review-story and review-epic, which call them too.

### OVERVIEW-14 — `docs/concepts/architecture.md:132` (stale)

- **Doc says:** Step 1 returns 'epic + story branches ready'; Step 4 'create PR (--base epic branch)'
- **Reality:** Story branches are cut from `develop` and PR back to `develop` by default. An epic branch exists only when the epic opts in to `branch_model: epic-integration`.
- **Evidence:** skills/develop-story/SKILL.md:3 (description: 'Story branches are cut from `develop` and PR back to `develop` … an epic has no branch of its own unless it opts in'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:666
- **Fix:** Change line 132 to 'story branch ready (from develop, or the epic integration branch when opted in)' and line 136 to 'Step 4 — create PR (--base develop, or the epic integration branch)'.

### OVERVIEW-15 — `docs/concepts/architecture.md:138` (stale)

- **Doc says:** `alt gate CONCERNS / FAIL → qa-fix`; Step 5c runs on a 'clean gate only'; line 153: '`PASS`/`WAIVED` hands to Step 5c'
- **Reality:** The loop routes on the gate's queue, not its verdict token. A CONCERNS gate with no open `top_issues[]` entry goes straight to 5c. The Diminishing-returns (route 2) and Cosmetic-residue (route 2b) exits also hand to 5c with open entries. Only FAIL, or a gate with open entries, goes to qa-fix.
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:346-350 ('CONCERNS with no open entry … proceed to 5c'), :351-356 (FAIL/open entries → convergence check → route classifier → 5b), :357-362 (route 2b)
- **Fix:** Change the alt branch to 'gate has open top_issues[] (FAIL, or CONCERNS/PASS with open entries)'. Reword line 153 as: 'a gate with no open entry (PASS, CONCERNS or active WAIVED), or a route-2/2b exit, hands to Step 5c'.

### OVERVIEW-17 — `docs/operations/workflows.md:72` (stale)

- **Doc says:** develop-next: `select-next.mjs (deterministic) → /develop-story \| /develop-task`; line 67: 'The three pipelines above … Two orchestrators … choose the path for you'
- **Reality:** develop-next and develop-batch also dispatch `/develop-bug` rows. `/develop-bug` is one of the three runnable commands.
- **Evidence:** skills/develop-next/SKILL.md:4 (`invokes: [develop-story, develop-task, develop-bug]`), :119 ('only `/develop-story`, `/develop-task` and `/develop-bug` are runnable'); skills/develop-batch SKILL.md description ('/develop-story, /develop-task or /develop-bug')
- **Fix:** Change workflows.md:72 to `→ /develop-story \| /develop-task \| /develop-bug`. The develop-batch block (:76-79) names no pipeline commands, so there is nothing to change there; optionally add '(/develop-story \| /develop-task \| /develop-bug)' after 'pipelines run concurrently'. Also reword :66-67 'The three pipelines above' if develop-bug is not among them.

### OVERVIEW-18 — `docs/operations/workflows.md:65` (missing)

- **Doc says:** 'Roadmap-driven orchestration' presents develop-next and develop-batch as the two orchestrators one level up
- **Reality:** Shipped siblings are missing. `/qa-next` is the UAT loop (sibling of develop-next) and has gained `/qa-next <id>` and `--coverage` since v0.52. `loop-supervisor` runs the roadmap unattended with a fresh context per iteration, the documented alternative to `/loop` (which the section recommends). Neither is mentioned. README.md:66 already presents qa-next as develop-next's sibling.
- **Evidence:** skills/qa-next/SKILL.md (description: 'Sibling of develop-next: that loop builds, this one verifies'); skills/loop-supervisor/SKILL.md (description: built-in /loop re-invokes the same conversation …); docs/runbooks/unattended-overnight-runs.md; CHANGELOG.md [Unreleased] '`/qa-next <id>`'
- **Fix:** Add a short qa-next block (uat-status.mjs --next → walk checklist → record 🟡/❌/⏸, file bugs, never ✅). Add a note that for hours-long runs `loop-supervisor` replaces `/loop`, linking the Unattended Overnight Runs runbook.

### OVERVIEW-19 — `docs/concepts/which-path.md:28` (inconsistent)

- **Doc says:** A production defect routes to `/create-branch --hotfix` (flowchart :28, prose :60, table :93), with the hotfix runbook as the only follow-up
- **Reality:** The rewritten hotfix runbook says a hotfix is a bug with a different branch model. You file it with `/create-bug-report` (general bug, description says 'production'), then `/develop-bug` takes the hotfix branch model and calls `create-branch --hotfix` itself. Running `/create-branch --hotfix` by hand skips the bug document, review-bug, the regression test and the fix record.
- **Evidence:** docs/runbooks/hotfix.md:18-20 ('The pipeline is the same one a regular bug uses — /develop-bug'), :36-42, :48-51 (create-bug-report → develop-bug → create-branch --hotfix); skills/develop-bug SKILL.md description ('production hotfix (off main)')
- **Fix:** Change the 'Yes — urgent fix' leaf to '/create-bug-report (say "production") → /develop-bug, hotfix branch model', in the flowchart, the Question 2 prose and the quick-reference table, still linking hotfix.md.

### OVERVIEW-20 — `docs/concepts/overview.md:127` (stale)

- **Doc says:** Platform-aware skills are create-pr, create-task, finalise, review-story, review-task, qa-fix, ensure-epic-jira-issue, create-epic. Platform-agnostic: create-branch, commit-changes, create-story, qa-story, qa-gate. Line 114: resolve-platform.sh is 'sourced by 8 platform-aware skills'
- **Reality:** 28 SKILL.md files reference resolve-platform.sh, including create-story and qa-story, which the doc calls platform-agnostic. Also qa-task, review-pr, review-code, review-bug, review-epic, develop-next, all sync-github-* and all ensure-*.
- **Evidence:** `grep -rl resolve-platform.sh skills/*/SKILL.md` → 28 files incl. skills/create-story/SKILL.md, skills/qa-story/SKILL.md, skills/review-pr/SKILL.md, skills/qa-task/SKILL.md
- **Fix:** Drop the hard-coded count and lists. Say 'every skill that touches a tracker or PR sources resolve-platform.sh', remove create-story and qa-story from the agnostic list, or generate the list.

### REFERENCE-1 — `docs/reference/commands.md:62` (stale)

- **Doc says:** `/review-pr [PR\|branch]` and `/review-pr --comment` / `--no-code` / `--no-docs` are the only listed forms
- **Reality:** review-pr also takes `--effort low\|medium\|high\|max` and `--inline` (posts each finding inline, implies --comment). Its target can also be a work item: a Jira key, a Jira /browse/ or board or /issues/ URL, `#N`, or a GitHub issue URL, which Step 1a resolves to the PR (task.176). The seed is confirmed.
- **Evidence:** skills/review-pr/SKILL.md:36 `Invoke as /review-pr [target] [--effort LEVEL] [--comment] [--inline] [--no-code] [--no-docs]`; :40 target values; :41 --effort; :43 --inline
- **Fix:** Change row 61 to `/review-pr [PR\|branch\|JIRA-KEY\|Jira-URL\|#issue\|issue-URL]` and say that a work item resolves to its PR. Add `--inline` (implies --comment) and `--effort LEVEL` to row 62.

### REFERENCE-5 — `docs/reference/commands.md:143` (missing)

- **Doc says:** session-handoff rows cover only write mode and read mode
- **Reality:** session-handoff gained a third mode, Continue (task.156). It writes a continuation file beside the work item (`task.N.handoff.{k}.slug.md`, story equivalent, else `.agents/handoffs/`) and prints a paste-ready resume prompt. It also ships an opt-in context-pressure installer (task.157).
- **Evidence:** skills/session-handoff/SKILL.md:3 (Three modes), :36 Modes table Continue row, :196 `## Continue`; CHANGELOG.md [Unreleased] 'session-handoff gains a continue mode'
- **Fix:** Add a row for `/session-handoff` in continue mode, asked by intent ('hand off to a fresh session', 'context is filling up'). Say that it writes a co-located continuation file plus a resume prompt that re-verifies first.

### REFERENCE-6 — `docs/reference/activation-phrases.md:108` (missing)

- **Doc says:** session-handoff phrases cover only write mode and read mode
- **Reality:** The session-handoff description now triggers on 'hand off to a fresh session', 'context is filling up' and 'continue this in a new context' (continue mode). None of these appear here.
- **Evidence:** skills/session-handoff/SKILL.md:3 description trigger list
- **Fix:** Add a row: "Hand off to a fresh session" / "Context is filling up" / "Continue this in a new context" → `session-handoff` (continue mode).

### REFERENCE-7 — `docs/reference/glossary.md:29` (stale)

- **Doc says:** "Lite mode: Optional flag that skips pre-develop context-gathering for low-risk stories/tasks."
- **Reality:** Lite mode is not a flag. Phase 0 sets it automatically when risk_level is low or absent, there are fewer than 3 tasks or phases, and the work touches a single module. It changes only QA: Step 5 uses direct tools only and Step 5c runs `/review-pr --effort low`. It does not skip pre-develop context-gathering.
- **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-23 (Trigger Conditions; 'Lite mode trades QA depth for speed'); skills/develop-story/SKILL.md 'Lite mode applies to Step 5 only'
- **Fix:** Redefine it as an auto-detected mode, triggered when risk_level is low or absent, there are fewer than 3 tasks or phases, and the work touches a single module. In this mode Step 5 QA uses direct tools only and Step 5c runs `/review-pr --effort low` (degraded, never skipped). Every other step, including Step 7's finalise side-effects, runs unchanged. Do not single out 'Steps 4, 7 and 8', because lite-mode.md says all other steps run unchanged.

### REFERENCE-8 — `docs/reference/anti-patterns.md:63` (stale)

- **Doc says:** "finalise always runs its full side-effects … even in `--lite` mode." / "Lite mode is about skipping context-gathering before development" / "The lite flag is not the right tool."
- **Reality:** No `--lite` flag exists on the develop orchestrators; lite mode is auto-detected in Phase 0. It reduces QA depth rather than pre-develop context-gathering.
- **Evidence:** git grep -- '--lite' over skills/develop-*/SKILL.md and shared/resources/develop-pipeline-*.md returns nothing; shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:373 (PIPELINE_MODE computed from Agent 3); shared/resources/develop-pipeline-lite-mode.md:19-25
- **Fix:** Drop `--lite`/'lite flag'. Say that lite mode, which is auto-detected and trades QA depth, never skips Step 7.

### REFERENCE-9 — `docs/reference/troubleshooting.md:168` (stale)

- **Doc says:** "You expected `--lite` to skip the PR comment / tracker update." / "Lite mode skips context-gathering before development"
- **Reality:** No --lite flag exists. Lite mode is auto-detected and shortens QA: Step 5 uses direct tools and Step 5c runs at --effort low.
- **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-23
- **Fix:** Reword the symptom ('the run was in lite mode') and the cause (lite mode shortens QA only; Step 7 always runs in full).

### REFERENCE-10 — `docs/reference/glossary.md:15` (stale)

- **Doc says:** "Bug report: Structured record of an issue found by QA or a user, scoped to an existing story."
- **Reality:** Bug reports have three modes. A story bug is co-located with the story, a task bug sits in the task directory, and a general (cross-cutting) bug lives in `docs/bugs/bug.{n}.{name}/` and is numbered from the global bug registry.
- **Evidence:** skills/create-bug-report/SKILL.md description (three modes); docs/standards/file-naming.md:24-26 general bug
- **Fix:** Define it as a story, task or general bug and link docs/standards/bug-documents.md. Add a Bug registry row (`docs/bugs/bug-registry.md`) beside the epic and task registries.

### REFERENCE-11 — `docs/reference/troubleshooting.md:192` (missing)

- **Doc says:** QA loop hits 5 cycles → "Stop the orchestrator. Read the QA report, address the underlying issue manually, then run /qa-story or /qa-task to re-gate."
- **Reality:** There is a documented resume path after a loop-limit or not-converging escalation. Resume rebuilds the cycle count from disk and offers a grant of extra cycles (`grant-qa-cycles.sh`, which writes `qa_max_cycles` / `extra_cycles_granted` on the lock), so the pipeline can continue rather than be driven by hand.
- **Evidence:** shared/resources/develop-pipeline-resume-contract.md:521 '### Re-entry after a QA loop escalation'; shared/resources/develop-pipeline-step-5-6-qa-loop.md:16 (QA_MAX_CYCLES from lock `qa_max_cycles`, writer grant-qa-cycles.sh)
- **Fix:** Add: re-invoke `/develop-*` and choose Resume. It reconstructs the cycle count and offers extra cycles (grant-qa-cycles.sh). Running qa-* standalone is then counted, not repeated.

### REFERENCE-12 — `docs/reference/troubleshooting.md:225` (missing)

- **Doc says:** 'Resume picked up the wrong step' says re-invoking resumes from the artifacts on disk and doesn't cover a finalise DoD-gaps halt
- **Reality:** New in task.170: after a `/finalise` DoD-gaps halt, a committed code fix past the newest gate's `head:` re-enters the QA loop at step 5 / qa_phase 5a through `reenter-qa-after-finalise.sh` instead of re-running finalise. It sets `qa_max_cycles = max(existing, base+2)`. A docs-only fix resumes at 7, and an uncommitted fix is refused as `uncommitted-fix`.
- **Evidence:** shared/resources/develop-pipeline-resume-contract.md:606 '### Re-entry after a finalise DoD-gaps halt'; CHANGELOG.md [Unreleased] 'A code fix after a /finalise DoD-gaps halt is gated before acceptance (task.170)'
- **Fix:** Add a section, 'Finalise halted with DoD gaps and I fixed code'. Commit the fix and re-invoke; the run re-enters QA at 5a. A document-only fix resumes at 7. Mention the `uncommitted-fix` refusal.

### REFERENCE-13 — `docs/reference/configuration.md:1145` (stale)

- **Doc says:** Platform resolution order step 2: "Environment variables (`JIRA_URL` present → Jira; `BITBUCKET_USERNAME` present → Bitbucket)"
- **Reality:** VCS resolves from config `vcs:` and then the git remote (bitbucket.org → bitbucket, else github). No environment variable selects Bitbucket. Only TRACKER has env and .env rungs (JIRA_URL).
- **Evidence:** shared/resources/resolve-platform.sh:502-511 (VCS = config value, `auto` → `git remote get-url origin \| grep -qi bitbucket.org`); shared/resources/platform-detection.md:58 'config → env → .env (TRACKER only) → git remote (VCS only) → default'
- **Fix:** Change step 2 to '`JIRA_URL` in env or `.env` → Jira (tracker only)'. State that VCS comes from config and then the git remote.

### REFERENCE-14 — `docs/reference/configuration.md:558` (inconsistent)

- **Doc says:** The Pipeline stages table lists six stages (work-started, in-review, in-qa, ready-for-merge, blocked, done) and says "The three new stages default off"
- **Reality:** The moment set has eight members: it also includes `changes-requested` (Step 5b, once per cycle) and `pr-merged` (develop-next/develop-batch post-merge). Five are off by default. tracker-workflow.md documents all eight.
- **Evidence:** shared/resources/tracker-workflow.js:58-67 MOMENTS; docs/reference/tracker-workflow.md:132-143 ('All eight are wired. The five marked ❌…')
- **Fix:** Add `changes-requested` and `pr-merged` rows to the table. Change 'The three new stages' to 'The five off-by-default stages', or replace the table with a link to tracker-workflow.md § The moments.

### RUNBOOKS-3 — `docs/runbooks/release-and-install.md:50` (missing)

- **Doc says:** 'The script: bumps version, updates CHANGELOG, commits chore(release), creates an annotated tag, pushes.' followed by a manual §4 'Sync develop forward'
- **Reality:** release.sh first reads CI's verdict for HEAD (scripts/release-ci-verdict.mjs) and refuses unless Test/ShellCheck are green (escape: `--skip-ci-check`), warns on branches with commits not on develop, runs `npm run test:clean-checkout`, and syncs develop with main itself (step 9; `--no-sync-develop` to skip). A maintainer running it right after merging the release-prep PR is refused while CI is still pending, with no explanation in this runbook.
- **Evidence:** scripts/release.sh:13-28 (steps 1b CI verdict, 2 branch warning, 9 'Syncs develop with main'), scripts/release.sh:10-11 (`--no-sync-develop`, `--skip-ci-check`)
- **Fix:** In §3 list what release.sh does including the CI-verdict gate (wait for CI on main, or `--skip-ci-check` only when CI was confirmed another way) and the automatic develop sync; reword §4 as 'only if you passed --no-sync-develop'.

### RUNBOOKS-6 — `docs/runbooks/create-parallel-stories.md:50` (broken)

- **Doc says:** `git worktree add ../{repo}-story-{E}.{S} feature/story.{E}.{S}.{name}` then run `/develop-story` inside it
- **Reality:** Without `-b`, `git worktree add` requires the branch to already exist; the story branch does not exist until develop-story Step 1 creates it, so the command fails with 'invalid reference'. The create-parallel-stories skill's own setup commands use `-b`.
- **Evidence:** skills/create-parallel-stories/SKILL.md:249 (`git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1`)
- **Fix:** Use `git worktree add -b feature/story.{E}.{S}.{name} ../{repo}-story-{E}.{S} develop` (or defer to the commands `/create-parallel-stories` prints). Same fix in docs/runbooks/first-week/day-4-parallel.md:57-58.

### RUNBOOKS-7 — `docs/runbooks/first-week/day-4-parallel.md:91` (inconsistent)

- **Doc says:** End of day: 'Two PRs open against the epic branch'; What you learned (line 101): 'PRs target the epic branch regardless of how many stories run in parallel.'
- **Reality:** The same page's steps (lines 62-64) say PRs open against the Phase 0 Q2 base, `develop` by default, which matches develop-story's develop-direct default. The verify checklist and lesson contradict both.
- **Evidence:** docs/runbooks/first-week/day-4-parallel.md:62-64; skills/develop-story/SKILL.md:3
- **Fix:** Line 91: 'Two PRs open against `develop` (or the epic integration branch if the epic opted in)'. Line 101: 'PRs target the base chosen at Phase 0 Q2, whatever the parallelism.'

### RUNBOOKS-8 — `docs/runbooks/first-week.md:36` (stale)

- **Doc says:** Day 2 done when: '1 story PR merged to the epic branch; story status `accepted`'
- **Reality:** Story PRs target `develop` by default (no epic branch unless opted in), and Day 2 itself only asks for a PR open on GitHub (day-2-stories.md:62, 72).
- **Evidence:** skills/develop-story/SKILL.md:3; docs/runbooks/first-week/day-2-stories.md:72 ('≥ 1 story PR exists on GitHub')
- **Fix:** Change to '1 story PR open (or merged) against `develop`; story status `accepted`'.

### RUNBOOKS-9 — `docs/runbooks/story-development.md:132` (stale)

- **Doc says:** 'Epic GitHub/Jira issues are created automatically downstream by `develop-story` → `finalise`, via `ensure-epic-github-issue` or `ensure-epic-jira-issue`'; called-skills map (lines 277-280): 'Inside `finalise`, the platform resolver picks one of: ensure-epic-github-issue / ensure-epic-jira-issue'
- **Reality:** finalise never invokes an ensure-epic routine. The epic issue is ensured by `create-story` and `review-story` (both declare `ensure-epic-github-issue`/`ensure-epic-jira-issue` in `invokes:`).
- **Evidence:** skills/create-story/SKILL.md:4 and skills/review-story/SKILL.md (invokes lists); skills/ensure-epic-github-issue/SKILL.md:3 ('called from create-story and review-story'); `grep ensure-epic skills/finalise/SKILL.md` → no match
- **Fix:** B.3: 'Epic issues are ensured by `create-story` and `review-story` (via ensure-epic-*)'. Move the two ensure-epic bullets from 'Inside finalise' to the create-story/review-story rows of the upstream map. Same fix for docs/runbooks/jira-publish.md:124 ('ensure-epic-jira-issue — called by finalise').

### RUNBOOKS-10 — `docs/runbooks/story-development.md:249` (stale)

- **Doc says:** 'Add `--lite` to skip pre-develop codebase mapping and other context-gathering for low-risk stories.'
- **Reality:** There is no `--lite` flag. Lite mode is set only by Phase 0 detection (risk_level low/absent AND <3 tasks AND single module), and it changes only QA depth: Step 5 uses direct tools, Step 5c runs `--effort low`, all other steps run unchanged (codebase mapping is not skipped).
- **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-24 (trigger conditions; 'All other steps run unchanged'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:373 ('there is no lite-mode CLI'); skills/develop-story/SKILL.md:242 ('Lite mode applies to Step 5 only')
- **Fix:** Replace with: 'Lite mode is auto-detected in Phase 0 (low risk, <3 tasks, one module) — there is no flag. It shortens QA only (direct-tools Step 5, `--effort low` Step 5c); Step 7 still runs in full.'

### RUNBOOKS-11 — `docs/runbooks/task-development.md:92` (stale)

- **Doc says:** Phase 0 prompts for task path, base branch, PR target branch, and 'Lite mode for low-risk tasks (skips pre-develop codebase mapping…)'; line 128: '`--lite` skips context-gathering steps'
- **Reality:** Phase 0d asks exactly Q1 base + Q2 PR target; lite mode is auto-detected, never prompted, has no flag, and affects only Step 5 QA depth and Step 5c effort.
- **Evidence:** skills/develop-task/SKILL.md:35 ('0d — Q1 base + Q2 PR target … no Q3'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:693 ('Do NOT invent additional questions … lite-mode detection runs in 0a-parallel Agent 3'); shared/resources/develop-pipeline-lite-mode.md:10-24
- **Fix:** Drop the 'Lite mode' prompt bullet; describe lite mode as auto-detected and QA-only, and remove `--lite` from line 128.

### RUNBOOKS-12 — `docs/runbooks/story-development.md:89` (stale)

- **Doc says:** review-prd outputs `prd.review.{YYYY-MM-DD}.md`; review-epic (line 126) outputs `epic.{N}.review.{YYYY-MM-DD}.md`; line 164: validate mode and interactive mode 'Both update the story's `status`'
- **Reality:** Review reports are sequence-numbered: `prd.review.{N}.{name}.md` and `epic.{N}.review.{n}.{name}.md`. Standalone `review-story --validate` is read-only and never modifies the story; only the orchestrated validate-and-apply variant promotes status.
- **Evidence:** skills/review-prd/SKILL.md:140 (`prd.review.{N}.{name}.md`); skills/review-epic/SKILL.md:532-536 (`epic.[N].review.[n].[name].md`); skills/review-story/SKILL.md:147 ('Standalone validate … never modifies the story document')
- **Fix:** Use `prd.review.{N}.{name}.md` and `epic.{N}.review.{n}.{name}.md`; change line 164 to 'Interactive mode updates `status` once resolved; standalone `--validate` is read-only.'

### RUNBOOKS-14 — `docs/runbooks/story-development.md:146` (missing)

- **Doc says:** create-story Calls: '`documentation-standards-validator`, optionally `mermaid-architect`'
- **Reality:** create-story also invokes `wireframe` (§5.4.6, for UI stories; added as wireloom and renamed to wireframe in [Unreleased]) and the ensure-epic/ensure-story issue routines. review-story also invokes `wireframe` and runs its `check` on embedded wireloom blocks.
- **Evidence:** skills/create-story/SKILL.md:4 (invokes: […, mermaid-architect, wireframe]), :687 ('5.4.6 Check for UI/Wireframe Opportunity (conditional, via `wireframe`)'); CHANGELOG.md [Unreleased] '/wireloom is now /wireframe'
- **Fix:** Add `wireframe` (UI stories) and `ensure-story-*`/`ensure-epic-*` to the create-story Calls row and to the upstream called-skills table (line 288).

### RUNBOOKS-15 — `docs/runbooks/story-development.md:253` (missing)

- **Doc says:** Resume semantics: 're-invoke /develop-story <same-path>. The skill … resumes at the first incomplete step.'
- **Reality:** New since v0.52.0 (task.170): when a run halted at Step 7 with DoD `❌ GAPS` and the fix was a committed code change, Phase 0b offers 'Re-enter QA at 5a' (Recommended), which re-enters the QA loop through `reenter-qa-after-finalise.sh`, not at Step 7. A document-only fix resumes at 7; an uncommitted fix is refused.
- **Evidence:** skills/develop-story/SKILL.md:331 and skills/develop-task/SKILL.md:318 ('Re-entry after a finalise DoD-gaps halt fixed by a code change'); shared/resources/develop-pipeline-resume-contract.md:606
- **Fix:** Add the re-entry sentence to Resume semantics in story-development.md (~line 253) and task-development.md (~line 132). After a Step 7 DoD-gaps halt fixed by a committed code change, pick 'Re-enter QA at 5a' (Recommended) so the new head is gated before acceptance. A document-only fix resumes at 7; an uncommitted fix is refused.

### RUNBOOKS-16 — `docs/runbooks/task-development.md:87` (broken)

- **Doc says:** `/develop-task docs/tasks/task.{N}.{name}.md`; Verification line 189: `grep -E '^status:\|^Status:' docs/tasks/task.{N}.{name}.md`
- **Reality:** A task document lives inside its self-named directory: `docs/tasks/task.{N}.{name}/task.{N}.{name}.md`. The path given does not exist, so the verification grep fails.
- **Evidence:** docs/runbooks/task-development.md:64 (same runbook: outputs `docs/tasks/task.{N}.{name}/task.{N}.{name}.md`); AGENTS.md Task Registry / task path `docs/tasks/task.{N}.{name}/`
- **Fix:** Use `docs/tasks/task.{N}.{name}/task.{N}.{name}.md` at lines 87 and 189.

### RUNBOOKS-18 — `docs/runbooks/sprint-cycle.md:64` (missing)

- **Doc says:** Phase 5 Retrospective points only to `autoskill` and `remember-insight`; the planning, review and completion phases name no sprint-ceremony skill
- **Reality:** The library ships sprint-ceremony skills: `jira-sprint-manager` (start/close sprints, add/remove issues), `jira-sprint-review-prep` (Sprint Review agenda/DoD compliance), `jira-sprint-retrospective` (retro document from Jira + git), and `jira-standup-auditor`.
- **Evidence:** skills/jira-sprint-retrospective/SKILL.md, skills/jira-sprint-review-prep/SKILL.md, skills/jira-sprint-manager/SKILL.md, skills/jira-standup-auditor/SKILL.md (all present)
- **Fix:** Add the Jira-tracker options by phase: jira-sprint-manager in Phase 1 (planning) and Phase 4 (closing the sprint), jira-standup-auditor in Phase 2 (daily standups), jira-sprint-review-prep in Phase 3, and jira-sprint-retrospective in Phase 5.

### SKILL-READMES-STANDARDS-2 — `skills/develop-task/README.md:51` (inconsistent)

- **Doc says:** No epic-branch concept. Both develop-task and develop-story Q1 prompt ... neither creates or targets an epic branch.
- **Reality:** develop-story can create and target an epic integration branch (opt-in); only develop-task has no epic-branch concept
- **Evidence:** shared/resources/develop-pipeline-step-1-create-branch.md:67-90; docs/standards/story-documents.md:124-148 (Branch strategy)
- **Fix:** Reword: 'develop-task has no epic-branch concept; develop-story offers an opt-in epic integration branch when the parent epic declares branch_model: epic-integration.'

### SKILL-READMES-STANDARDS-3 — `skills/develop-task/README.md:283` (stale)

- **Doc says:** find latest gate file: ls task.{id}.gate.*.yml \| sort -t. -k4 -n \| tail -1; cycle = (count of "### QA Cycle" entries) + 1 (also artifact table L449 'latest gate sorted by -t. -k4 -n')
- **Reality:** The latest gate and cycle number come from the qa-cycle.sh helper (highest-numbered cycle, zero-padding normalised, two files claiming one cycle refused); the loop limit is QA_MAX_CYCLES from the lock's qa_max_cycles, default 5
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:135-160 (QA_CYCLE=$(bash .../qa-cycle.sh ...), task.158) and :14-20 (QA_MAX_CYCLES=$(jq -r '.qa_max_cycles // 5' ...))
- **Fix:** Replace the two diagram notes and the artifact-table cell with 'QA_CYCLE / LATEST_GATE from references/qa-cycle.sh'; change 'loop cycle ≤ 5' to 'cycle ≤ QA_MAX_CYCLES (lock qa_max_cycles, default 5)'.

### SKILL-READMES-STANDARDS-4 — `skills/develop-story/README.md:291` (stale)

- **Doc says:** ls story.{epic}.{story}.gate.*.yml \| sort -t. -k5 -n \| tail -1; cycle = (count of "### QA Cycle" entries) + 1
- **Reality:** Gate and cycle are resolved by qa-cycle.sh; the budget is QA_MAX_CYCLES (lock qa_max_cycles, default 5)
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:135-160 and :14-20
- **Fix:** As proposed. Also fix artifact-table L468 'latest gate sorted by -t. -k5 -n' and 'alt cycle > 5' at L357.

### SKILL-READMES-STANDARDS-5 — `skills/develop-task/README.md:114` (stale)

- **Doc says:** Diagram 1: 'S5gate -- CONCERNS / FAIL --> S6 qa-fix'; Diagram 4 (L312): 'else CONCERNS / FAIL / has top_issues -> /qa-fix'
- **Reality:** The loop routes on the open top_issues[] queue, not the token: a CONCERNS gate with no open entry goes to 5c (route 3); FAIL/open-queue gates first run the Convergence check (escalates from cycle 3) and the route classifier (Diminishing-returns exit route 2, Cosmetic-residue exit route 2b), plus the Gate-the-last-fix half-cycle (route 2c) at budget; a malformed gate HALTs
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:24-60 (five routes, four guards table) and :310-372 (Outcome branching arms); classifyLoopRoute() in shared/resources/qa-diminishing-returns.js
- **Fix:** Redraw the S5gate fork and Diagram 4's alt block as: no open entry (PASS / active WAIVED / CONCERNS) -> 5c; open entry -> Convergence check -> route classifier -> 5b; add the escalate and half-cycle paths, citing the step-5-6 doc.

### SKILL-READMES-STANDARDS-6 — `skills/develop-story/README.md:121` (stale)

- **Doc says:** 'S5gate -- CONCERNS / FAIL --> S6 qa-fix' and L327 'else CONCERNS / FAIL / has top_issues'
- **Reality:** Queue-based routing with route 3 (CONCERNS, empty queue -> 5c), Convergence check, Diminishing-returns/Cosmetic-residue exits and Gate-the-last-fix half-cycle
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:24-60, :310-372
- **Fix:** Same redraw as the develop-task README diagrams.

### SKILL-READMES-STANDARDS-7 — `skills/develop-task/README.md:443` (stale)

- **Doc says:** Artifact Lifecycle Table: Review report path `task.{id}.review.{YYYY-MM-DD}.md`; Plan file 'upstream (created by /plan or manual)' (L444)
- **Reality:** review-task writes task.{n}.review.{N}.{descriptive-name}.md with N computed by next_numbered; the plan file is written by create-task
- **Evidence:** skills/review-task/SKILL.md:1432-1436 (REVIEW_N=$(next_numbered ... review ...)); skills/develop-task/SKILL.md:345 'Review report: task.{id}.review.{N}.{name}.md'; skills/create-task/SKILL.md:372,709 (plan created alongside task)
- **Fix:** Change the path to `task.{id}.review.{N}.{name}.md` and the plan row's 'Created by' to '/create-task (or relocated from an upstream plan)'.

### SKILL-READMES-STANDARDS-8 — `skills/develop-story/README.md:460` (stale)

- **Doc says:** Review report `story.{epic}.{story}.review.{YYYY-MM-DD}.md`; Plan file 'created by /plan or manual' (L461)
- **Reality:** review-story writes story.{epic}.{story}.review.{n}.{story-name}.md; create-story writes the plan file
- **Evidence:** skills/review-story/SKILL.md:421,431; skills/create-story/SKILL.md:607
- **Fix:** Change to `story.{epic}.{story}.review.{n}.{name}.md` and attribute the plan file to /create-story.

### SKILL-READMES-STANDARDS-9 — `skills/develop-task/README.md:448` (stale)

- **Doc says:** Artifact table: QA report, gate file and DoD summary are 'committed in Step 8'; Step 7 node shows only 'DoD + tracker close + board Done'
- **Reality:** QA report + gate are committed per cycle; /finalise 6a-6c commits and pushes the accepted document, DoD summary, sprint-review-summary.md and registry tick, asserts them on origin and takes a second CI reading before its PR comment/close. Step 8 commits only the implementation report and HALTs if anything else is dirty
- **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:133-176 (publish boundary, CI reading 1/2, HALT on dirty paths); :521-536 Step 7 Completion Checklist
- **Fix:** Set 'Terminal state' for QA report/gate to 'committed per QA cycle' and for DoD summary to 'committed + pushed by /finalise 6a'; add sprint-review-summary.md and registry rows; mention the two CI readings in the Step 7 node/description.

### SKILL-READMES-STANDARDS-10 — `skills/develop-story/README.md:467` (stale)

- **Doc says:** QA report, gate file and DoD summary 'committed in Step 8'
- **Reality:** Per-cycle QA commits and /finalise's publish boundary (6a commit+push, CI reading 2) carry these; Step 8 commits only the report
- **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:133-176
- **Fix:** Same edit as the develop-task README artifact table.

### SKILL-READMES-STANDARDS-11 — `skills/develop-task/README.md:494` (stale)

- **Doc says:** Jira table, Pause hook: '**silent** — Jira posting requires authenticated MCP, unavailable from shell context'; Diagram 5 (L379) 'Hook->>GH: gh issue comment {tracker_issue} (GitHub only)'
- **Reality:** The PreCompact hook posts its issue comment through one tracker-comment.js call that resolves the tracker from the lock, so it reaches Jira when JIRA_URL/JIRA_API_TOKEN/JIRA_USER_EMAIL are in the hook's environment; both writes go through the access gate (deferred under restricted access.tracker)
- **Evidence:** shared/resources/develop-pipeline-on-precompact.sh:16,36-45 (Jira via tracker-comment.js), :322-345 (issue comment, LOCK_TRACKER), :303-307 (ACCESS_TRACKER deferral)
- **Fix:** Replace the Jira Pause-hook cell with 'tracker-comment.js --stage (best-effort; posts when JIRA_* credentials are in the hook env; deferred under restricted access.tracker)' and change the diagram arrow to 'tracker-comment.js (GitHub or Jira)'.

### SKILL-READMES-STANDARDS-12 — `skills/develop-story/README.md:512` (stale)

- **Doc says:** Pause hook on Jira is silent (requires MCP); Diagram 5 (L394) issue comment is 'GitHub only'
- **Reality:** The hook posts via tracker-comment.js to either tracker when credentials exist
- **Evidence:** shared/resources/develop-pipeline-on-precompact.sh:16,36-45,322-345
- **Fix:** Same edit as the develop-task README.

### SKILL-READMES-STANDARDS-14 — `skills/develop-task/README.md:341` (missing)

- **Doc says:** Diagram 4 ends at 'cycle > 5 -> escalation -> HALT'; Diagram 1 ends Step 7 gaps at 'HALT: DoD gaps'; resume flow offers only resume-from-step
- **Reality:** Since v0.52 the HALT snapshot supports two QA re-entries: 'Resume at 5a with {k} more cycles' after a loop-limit/not-converging halt (grant-qa-cycles.sh writes extra_cycles_granted/qa_max_cycles) and 'Re-enter QA at 5a' after a finalise DoD-gaps halt fixed by code (reenter-qa-after-finalise.sh, task.170)
- **Evidence:** skills/develop-task/SKILL.md (Error Recovery: 'Re-entry after a QA loop escalation' -> grant-qa-cycles.sh; 'Re-entry after a finalise DoD-gaps halt fixed by a code change' -> reenter-qa-after-finalise.sh); CHANGELOG.md [Unreleased] task.170 entry
- **Fix:** As proposed, but do not date it 'since v0.52': the finalise DoD-gaps re-entry (task.170) is unreleased. Add both re-entries to Diagram 5 and to the 'cycle > 5' / 'HALT: DoD gaps' nodes, citing the SKILL Error Recovery sections, and replace the literal 5 with QA_MAX_CYCLES in both READMEs.

### SKILL-READMES-STANDARDS-15 — `skills/develop-next/README.md:20` (stale)

- **Doc says:** Merge gate: 'QA gate file `PASS` + document `accepted` (finalise output)'
- **Reality:** The gate requires document accepted, gate not FAIL, and no open top_issues[] entry: CONCERNS with no open entry and WAIVED (waiver documented) both merge; a PASS-only reading HALTed task.105
- **Evidence:** skills/develop-next/SKILL.md:137-158 (Verify green table: accepted+CONCERNS no open -> merge; accepted+WAIVED -> merge)
- **Fix:** Replace the bullet with: 'document `accepted`, gate not `FAIL`, and no `open` entry in the gate's top_issues[] (CONCERNS/WAIVED with no open finding merge)'.

### SKILL-READMES-STANDARDS-16 — `skills/develop-batch/README.md:122` (stale)

- **Doc says:** Per-item merge gate: 'QA gate file `PASS` + document `accepted`'
- **Reality:** Same as develop-next: accepted + gate not FAIL + no open top_issues[] entry
- **Evidence:** skills/develop-batch/SKILL.md:382-401 (same table and waiver clause as develop-next Step 3)
- **Fix:** Same wording change as the develop-next README.

### SKILL-READMES-STANDARDS-20 — `skills/review-task/README.md:88` (stale)

- **Doc says:** Output: `[task-directory]/task.{n}.review.{descriptive-name}.md`
- **Reality:** Report is `task.{n}.review.{N}.{descriptive-name}.md`, N computed with next_numbered; Step 0 also offers 'Action plan only' (no file)
- **Evidence:** skills/review-task/SKILL.md:1432-1436, :1674, :1678 (Option B: Action Plan Only)
- **Fix:** Change to `task.{n}.review.{N}.{descriptive-name}.md` and mention the action-plan-only option.

### SKILL-READMES-STANDARDS-21 — `skills/review-task/README.md:222` (broken)

- **Doc says:** Complements / See Also: `/qa-technical-task` - QA review for tasks (also L270)
- **Reality:** No such skill; task QA is /qa-task
- **Evidence:** skills/qa-task/SKILL.md exists; no skills/qa-technical-task directory
- **Fix:** Replace `/qa-technical-task` with `/qa-task` at skills/review-task/README.md L229 and L270.

### SKILL-READMES-STANDARDS-23 — `skills/review-story/README.md:3` (missing)

- **Doc says:** README describes only the interactive review (Quick Start, process, output) with no other mode
- **Reality:** review-story has a second mode, Validate (`--validate` or 'is this story ready?'): a non-interactive GO/NO-GO gate with a 1-10 readiness score, plus a validate-and-apply variant used by develop-story
- **Evidence:** skills/review-story/SKILL.md:3 (description), :36-60 (Validate Mode, /review-story --validate ...), :71 (validate output artifact), :148 (APPLY=true)
- **Fix:** Add a 'Validate mode' section with the --validate invocations, the GO/NO-GO output and when develop-story uses validate-and-apply.

### SKILL-READMES-STANDARDS-25 — `docs/standards/task-documents.md:64` (stale)

- **Doc says:** `depends_on` — 'blocks pipeline if the dependency is not `accepted`'; Prerequisites (L142): 'If depends_on is set, the dependency task is accepted'
- **Reality:** No pipeline step reads the depends_on frontmatter key; develop-task's status gate checks only status, and select-next.mjs reads dependencies from the registry's 'Depends on' column, not frontmatter
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:355-365 (task status table, no depends_on); grep for depends_on finds only skills/sync-github-task/SKILL.md:66, skills/ensure-task-github-issue/SKILL.md:156 (display) and skills/develop-next/scripts/select-next.mjs:914 (registry column header alias)
- **Fix:** Mark depends_on as informational (synced to the tracker card); say that ordering is enforced by develop-next via the registry 'Depends on' column / roadmap deps:, or drop the 'blocks pipeline' claim and the checklist line.

### SKILL-READMES-STANDARDS-26 — `docs/standards/task-documents.md:146` (stale)

- **Doc says:** Invocation: `/develop docs/tasks/...`, `/develop task.17....md`, `/develop #297    # GitHub issue number`
- **Reality:** The doc's own prerequisites are for develop-task, the end-to-end pipeline; /develop is the single implementation step and accepts no issue-number input (only file/dir/epic inputs). Issue forms (#297) are resolved by develop-task's Phase 0a
- **Evidence:** skills/develop/SKILL.md:25-31 (input forms: story/task file or dir, epic file); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:24,67 ('Issue hash notation: #297'); skills/develop-task/SKILL.md:3 ('Invoke with /develop-task [task-file-path]')
- **Fix:** Change the block to `/develop-task docs/tasks/task.17.cache-lib-simplification/`, `/develop-task task.17....md`, `/develop-task #297`.

### SKILL-READMES-STANDARDS-27 — `docs/standards/story-documents.md:163` (stale)

- **Doc says:** Invocation: `/develop <story-dir>`, `/develop story....md`, `/develop #297`
- **Reality:** Prerequisites target develop-story; /develop takes no issue number. The pipeline entry point is /develop-story, which resolves #297
- **Evidence:** skills/develop/SKILL.md:25-31; skills/develop-story/SKILL.md:3 ('Invoke with /develop-story [story-file-path]')
- **Fix:** Use `/develop-story` in all three invocation lines.

### SKILL-READMES-STANDARDS-28 — `docs/standards/prd-documents.md:16` (inconsistent)

- **Doc says:** Layout `docs/prd/{domain}/prd.{feature}/prd.{feature}.md` with epics at `${PRD_ROOT}/{domain}/prd.{feature}/epics/epic.{N}.{name}/` (L22)
- **Reality:** story-documents.md:14-20 and epic-documents.md:16-22 put epics at `docs/prd/{domain}/{feature}/epics/` (no prd. prefix), as do docs/reference/configuration.md:20-22, shared/resources/resolve-paths.sh:19 and create-epic; create-prd alone writes `[domain]/prd.[feature]/prd.[feature].md`. This repo's own tree is docs/prd/onboarding/prd.onboarding.md + docs/prd/onboarding/epics/
- **Evidence:** skills/create-prd/SKILL.md:45,65 vs skills/create-epic/SKILL.md:46,107-108,349; shared/resources/resolve-paths.sh:19; git ls-files docs/prd
- **Fix:** Edit only docs/standards/prd-documents.md (the layout tree, the epic locator sentence and the 'Directory: prd.{feature}' naming rule) to use {domain}/{feature}/prd.{feature}.md and {domain}/{feature}/epics/, matching resolve-paths.sh and create-epic. File a follow-up to fix create-prd's output path (`${PRD_ROOT}/[domain]/prd.[feature]/prd.[feature].md` at SKILL L45/L65).


## Low (39)

### OVERVIEW-6 — `docs/concepts/quickstart-task.md:94` (stale)

- **Doc says:** The agent chains: review-task → create-branch → develop → …
- **Reality:** develop-task runs create-branch first (Step 1), then review-task (Step 2).
- **Evidence:** skills/develop-task/SKILL.md frontmatter `invokes: [create-branch, review-task, develop, …]` and description ("create-branch → review-task → develop")
- **Fix:** Reorder to create-branch → review-task → develop → create-pr → qa-task → qa-fix → review-pr → finalise → commit-changes.

### OVERVIEW-12 — `docs/concepts/getting-started.md:297` (stale)

- **Doc says:** Pipelines run hands-free when 'three Claude Code hooks' are registered (also step 9 at line 134: 'the three pipeline hooks')
- **Reality:** The installer registers two hooks, PreCompact and Stop. The page's own table lists two.
- **Evidence:** shared/resources/develop-pipeline-install-hooks.sh:2 and :326-329 (PreCompact + Stop only); scripts/setup-consumer.sh:1821 ('2 hooks registered')
- **Fix:** Change 'three' to 'two' at lines 134 and 297.

### OVERVIEW-16 — `docs/operations/workflows.md:111` (inconsistent)

- **Doc says:** 'On a PASS/WAIVED gate the loop does not end — it hands to Step 5c'
- **Reality:** A CONCERNS gate with an empty or all-closed queue also hands to 5c (route 3), as do the Diminishing-returns and Cosmetic-residue exits. 'Fix Cycle (if needed)' reads as if CONCERNS always means qa-fix.
- **Evidence:** shared/resources/develop-pipeline-step-5-6-qa-loop.md:346-350
- **Fix:** Change to 'On a gate with no open findings (PASS, CONCERNS or an active WAIVED), or a route-2/2b exit, the loop hands to Step 5c'.

### OVERVIEW-21 — `docs/concepts/overview.md:90` (stale)

- **Doc says:** Skill categories list `document-project` (Documentation and research) and `simplify` (Writing and editing) as library skills
- **Reality:** Neither skill exists in this library (there is no skills/document-project or skills/simplify). `simplify` is a host built-in, not a shipped skill.
- **Evidence:** `ls skills/` (129 dirs) has no document-project or simplify; docs/reference/skill-catalog.md:3 ('all 129 skills')
- **Fix:** Remove `document-project` (document-existing-project is already listed) and `simplify` from the category lists.

### OVERVIEW-22 — `docs/concepts/architecture.md:99` (missing)

- **Doc says:** Dependency map: create-story → documentation-standards-validator, mermaid-architect
- **Reality:** create-story now also invokes `wireframe` (renamed from `/wireloom`, shipped since v0.52) for UI stories, plus the ensure-epic-* and ensure-story-* sub-routines. The map shows none of them.
- **Evidence:** skills/create-story/SKILL.md:4 (`invokes: [ensure-epic-github-issue, ensure-epic-jira-issue, ensure-story-github-issue, ensure-story-jira-issue, mermaid-architect, wireframe]`); CHANGELOG.md [Unreleased] '`/wireloom` is now `/wireframe`'
- **Fix:** Add `CS --> WF[wireframe]` (UI stories) and the ensure-epic/ensure-story edges to the create-story node.

### OVERVIEW-23 — `docs/concepts/quickstart-story.md:200` (stale)

- **Doc says:** '`/develop-story` pauses at QA planning — Expected — test plan generation'
- **Reality:** The pipeline always skips /qa-planning silently. There is no QA-planning pause or prompt.
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:601 ('the pipeline always skips `/qa-planning`. Do not prompt for it'), :682
- **Fix:** Delete the row.

### OVERVIEW-24 — `docs/concepts/quickstart-story.md:127` (stale)

- **Doc says:** 'Both prompts also offer an epic integration branch … as a trailing, unrecommended option'; line 129 also says 'Pick `No`' for lite mode, which line 127 says is not a prompt
- **Reality:** Only Q1 appends the epic-integration option, and only when `branching.epicIntegration.offerWhenUndeclared` is not false. Q2 offers develop / main / Other. Lite mode is auto-detected, so there is nothing to answer 'No' to.
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:639-642 (Q1 append), :666 (Q2 'Otherwise: develop / main / Other')
- **Fix:** Change to 'Q1 also offers an epic integration branch … (unless `offerWhenUndeclared: false`)'. Remove 'Pick `No` for anything…' from the lite-mode note.

### OVERVIEW-25 — `docs/concepts/quickstart-story.md:210` (inconsistent)

- **Doc says:** Lifecycle states: `draft → ready-for-development → in-progress → accepted`
- **Reality:** The canonical lifecycle also includes `planned` and `ready-for-review`. quickstart-task.md:160 and getting-started.md:431 state it in full.
- **Evidence:** shared/resources/document-status-lifecycle.md (draft → planned → ready-for-development → in-progress → ready-for-review → accepted)
- **Fix:** Change to `draft → ready-for-development → in-progress → ready-for-review → accepted` (story lifecycle; `planned` is task-only per document-status-lifecycle.md:58). Or give the full ladder with a note that `planned` applies to tasks only.

### OVERVIEW-26 — `docs/concepts/which-access.md:36` (inconsistent)

- **Doc says:** Flowchart leaf: 'access.tracker: approve — today this still defers; see limits'
- **Reality:** `approve` defers during the run, then asks one batched confirmation at handover and executes the approved records via the committed script. It degrades to `command` only without a tty. The same page's prose (:51) and restricted-access.md:34 already say this, but the leaf reads as if approve were unimplemented.
- **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:500-510 ('The approve model at handover' … 'Approved records execute via the committed script')
- **Fix:** Change the leaf to 'access.tracker: approve — one batched confirmation at handover'.

### OVERVIEW-27 — `README.md:148` (inconsistent)

- **Doc says:** Contributing step 4: 'Update docs/reference/skill-catalog.md'
- **Reality:** The catalog is generated and CI diffs it, so a hand edit is overwritten or fails the check. CONTRIBUTING.md:42 says to run `npm run generate-catalog`.
- **Evidence:** docs/reference/skill-catalog.md:5-6 ('auto-generated … Run `npm run generate-catalog`'); CONTRIBUTING.md:42; .github/workflows/validate.yml:19
- **Fix:** Change to 'Run `npm run generate-catalog` (regenerates docs/reference/skill-catalog.md and the README badge)'.

### OVERVIEW-28 — `docs/examples/architecture/README.md:19` (stale)

- **Doc says:** Recommends `architectureSharded: true` and `architectureVersion: v4` in skills-config.yaml
- **Reality:** No skill, shared resource or script reads either key. The configuration reference documents only `architecture.architectureShardedLocation`.
- **Evidence:** `git grep 'architectureVersion\\|architectureSharded:' -- ':!skills/*/references/*'` matches only docs and .agents/plans, with no reader in skills/ or shared/resources/; docs/reference/configuration.md:14, :229
- **Fix:** Drop the two keys from the snippet and keep `architectureShardedLocation` plus `devLoadAlwaysFiles`, or mark them as informational, not read by any skill.

### REFERENCE-15 — `docs/reference/glossary.md:25` (stale)

- **Doc says:** "Phase 0 … Prompts for story/task path, base branch, lite mode."
- **Reality:** Phase 0d's Upfront Setup asks exactly two questions: Q1, the feature branch base, and Q2, the PR target. Lite mode is computed from the document and never prompted for.
- **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:684-690 (required-question count = 2: Q1 + Q2); :373 lite mode detection
- **Fix:** Replace with 'Prompts for branch base and PR target; detects lite mode automatically'.

### REFERENCE-16 — `docs/reference/activation-phrases.md:32` (missing)

- **Doc says:** review-pr phrases: 'Review this PR' / 'Does this PR match the task?' / 'Is the evidence there for this PR?'
- **Reality:** review-pr also triggers from a work item, for example 'review the PR for RAPP-702'. It accepts a Jira key, Jira URL or GitHub issue and finds the PR.
- **Evidence:** skills/review-pr/SKILL.md description ('Accepts a Jira key, Jira URL or GitHub issue and finds its PR… review the PR for RAPP-702')
- **Fix:** Add "Review the PR for RAPP-702" to the review-pr row.

### REFERENCE-17 — `docs/reference/activation-phrases.md:123` (missing)

- **Doc says:** wireframe phrases cover mock-ups from a brief only
- **Reality:** wireframe also turns an existing HTML screen or hi-fi mockup into a wireframe (obs #245) and has a `wireframe.js status <file.html>` step.
- **Evidence:** skills/wireframe/SKILL.md:3 description ('wants an existing HTML screen or hi-fi mockup turned into a wireframe'); :54-62
- **Fix:** Add "Turn this HTML screen into a wireframe" → `wireframe`.

### REFERENCE-18 — `docs/reference/commands.md:60` (stale)

- **Doc says:** `/review-code` and `/review-code --comment` / `--fix` are the only listed forms
- **Reality:** review-code also takes `--effort LEVEL` and a target of `<PR-number>`, `<base>...<head>` or `--staged`.
- **Evidence:** skills/review-code/SKILL.md:30 'Invoke as /review-code [target] [--effort LEVEL] [--comment] [--fix]'; :34-35
- **Fix:** Show `/review-code [PR\|base...head\|--staged]` and add `--effort LEVEL`.

### REFERENCE-19 — `docs/reference/commands.md:42` (missing)

- **Doc says:** `/create-task` — Author a standalone task (no other form listed)
- **Reality:** `/create-task --from-observation <id>[,<id>…]` seeds a task from observation-log entries and parks them on it. It shipped in v0.52.0.
- **Evidence:** skills/create-task/SKILL.md:182 '`/create-task --from-observation 124,127` cuts a task from observation-log entries'
- **Fix:** Add a row for `/create-task --from-observation <ids>`.

### REFERENCE-20 — `docs/reference/pipeline-artifacts.md:73` (stale)

- **Doc says:** "## The nine documents, in plain terms"
- **Reality:** The table has ten rows: work item, plan, review report, PR review report, security review report, implementation report, QA report, gate file, DoD summary and tracker handover.
- **Evidence:** docs/reference/pipeline-artifacts.md:77-86
- **Fix:** Drop the count ('The documents, in plain terms') or change it to ten.

### REFERENCE-21 — `docs/reference/pipeline-artifacts.md:97` (stale)

- **Doc says:** `develop-pipeline.last-halt.json` — "Written on HALT; persists until you choose 'Start fresh' on the next run"
- **Reality:** Choosing Resume runs `advance-pipeline-lock.sh --restore <doc-dir>`, which rebuilds the lock from the snapshot and consumes it. Step 8 also deletes a sole legacy snapshot. An orphaned `.lock.pausing.<pid>` claim is the other restore candidate and isn't listed.
- **Evidence:** shared/resources/develop-pipeline-pause.md:80 ('--restore … consumes the source'; 'Step 8 deletes such a snapshot')
- **Fix:** Change the lifetime to 'Written on HALT/pause; consumed by --restore on Resume (or left behind on Start fresh)'. Add a `.lock.pausing.<pid>` row.

### REFERENCE-23 — `docs/reference/faq.md:65` (stale)

- **Doc says:** "Why are skills distributed as zips?" — the packager bundles into each zip (also line 99; glossary.md:61 'Auto-bundled into each skill's zip by the packager')
- **Reality:** The primary install is `setup-consumer.sh`, which extracts a tarball of skill directories that `npm run bundle` (bundle_skill.py) made self-contained in-tree. Zips are a gitignored build artifact used only for the manual offline install.
- **Evidence:** AGENTS.md § Shared Resources (two distribution paths); scripts/setup-consumer.sh (tarball, no .zip use); docs/concepts/getting-started.md:340 'Option C — manual zip install'
- **Fix:** Retitle it to 'Why is each skill self-contained?' and describe both in-tree bundling (tarball installs) and zips (offline).

### REFERENCE-24 — `docs/reference/faq.md:93` (stale)

- **Doc says:** "`docs/tasks/` and the two registry filenames (`epic-registry.md`, `tasks/task-registry.md`) are also hardcoded."
- **Reality:** There is also a third hardcoded registry, `docs/bugs/bug-registry.md`, for general bugs.
- **Evidence:** AGENTS.md § Bug Registry; docs/standards/bug-registry.md
- **Fix:** List the three registries, including `bugs/bug-registry.md`.

### REFERENCE-25 — `docs/reference/invocation.md:177` (stale)

- **Doc says:** create-pr "Pushes branch, detects target (develop/main), generates description from template, creates via `gh pr create`."
- **Reality:** create-pr prompts for the target branch and opens the PR with the GitHub CLI or the Bitbucket REST API, depending on the auto-detected platform.
- **Evidence:** skills/create-pr/SKILL.md description ('Prompts for target branch … using the GitHub CLI (GitHub) or Bitbucket REST API (Bitbucket)')
- **Fix:** Change to 'prompts for the target … creates via `gh pr create` (GitHub) or the Bitbucket REST API'.

### RUNBOOKS-13 — `docs/runbooks/story-development.md:232` (stale)

- **Doc says:** Step 2: 'Runs the interactive review (skipped if the story was reviewed recently and is still `ready-for-development`).'
- **Reality:** The pipeline runs review-story in non-interactive validate-and-apply mode. It skips when a review report exists and status is Ready for Development or In Progress; recency is not a criterion.
- **Evidence:** skills/develop-story/SKILL.md:291 ('Always validate-and-apply … non-interactive, no questions asked'); shared/resources/develop-pipeline-step-2-review.md:30-38 (skip/run table)
- **Fix:** 'Runs review-story in validate-and-apply mode (no questions). Skipped when a `story.{E}.{S}.review.*.md` report exists and status is Ready for Development or In Progress.' Same correction for task-development.md:111, where develop-task also skips a `Planned` task whose review report is current.

### RUNBOOKS-17 — `docs/runbooks/task-development.md:74` (stale)

- **Doc says:** review-task output: 'Co-located review report `task.{N}.review.{name}.md`'
- **Reality:** The report carries a sequence number: `task.{n}.review.{N}.{descriptive-name}.md`.
- **Evidence:** skills/review-task/SKILL.md:326, :1432 (`task.{n}.review.{N}.{descriptive-name}.md`); skills/develop-task/SKILL.md:345 (`task.{id}.review.{N}.{name}.md`)
- **Fix:** Change to `task.{N}.review.{n}.{name}.md`.

### RUNBOOKS-19 — `docs/runbooks/first-week/day-3-messy-path.md:50` (stale)

- **Doc says:** Expected artifact: `story.{epic}.{story}.gate.1.*.yml` with `decision: FAIL` (and line 61 `decision: PASS`)
- **Reality:** Gate files record the verdict under the `gate:` key (`gate: PASS\|CONCERNS\|FAIL\|WAIVED`). There is no `decision:` field, so grepping for it finds nothing.
- **Evidence:** skills/qa-gate/SKILL.md:87 (`gate: PASS # PASS\|CONCERNS\|FAIL\|WAIVED`); skills/qa-story/SKILL.md:274 (`grep '^gate:'`)
- **Fix:** Change both expectations to `gate: FAIL` / `gate: PASS`. Also line 58: re-run `qa-story` rather than `qa-gate`, which is the manual-override skill.

### RUNBOOKS-20 — `docs/runbooks/change-management.md:56` (stale)

- **Doc says:** change-checklist sections: 1 Issue summary, 2 Affected artifacts, 3 Cascade analysis, 4 Options, 5 Recommended action, 6 Edits
- **Reality:** change-checklist's six sections are: 1 Understand Trigger & Context, 2 Epic Impact Assessment, 3 Artifact Conflict & Impact Analysis, 4 Path Forward Evaluation, 5 Sprint Change Proposal Components, 6 Final Review & Handoff.
- **Evidence:** skills/change-checklist/SKILL.md:28,49,74,105,137,157 (Section 1–6 headings)
- **Fix:** Replace the numbered list with the skill's actual section names.

### RUNBOOKS-21 — `docs/runbooks/document-existing-project.md:7` (stale)

- **Doc says:** 'there is also a legacy `/document-project` slug; it is now a thin deprecation stub that points here.'
- **Reality:** `skills/document-project/` was deleted outright, not replaced by a stub. `/document-project` no longer exists.
- **Evidence:** commit 6510d78e ('Delete legacy skills/document-project/SKILL.md'); no tracked `skills/document-project/` path
- **Fix:** Change to: 'The former `/document-project` skill was removed; use `/document-existing-project`.' Or delete the note.

### RUNBOOKS-22 — `docs/runbooks/release-and-install.md:92` (missing)

- **Doc says:** Wizard steps table: Platform, Credentials, Config, Registries, Docs scaffold, Skill profile, Skills, Hooks
- **Reality:** The wizard also asks the tracker access model (`access.tracker`, step 'Tracker access') and writes `tracker-workflow.yaml` (from the live board when it can read it, otherwise a template to edit before the first run).
- **Evidence:** scripts/setup-consumer.sh:277-278 (record_step "Tracker access"), :583-632 and :693-696 (record_step "tracker-workflow")
- **Fix:** Add two rows: 'Tracker access — choose full/manual/command/approve/read-only' and 'tracker-workflow — generate `tracker-workflow.yaml` from the board, or a template to edit'.

### RUNBOOKS-23 — `docs/runbooks/jira-publish.md:105` (inconsistent)

- **Doc says:** 'All three sync skills drive the Jira issue's status from the local frontmatter `status:`.'
- **Reality:** The runbook documents four sync skills (Phase 4 adds `sync-jira-bug`), and sync-jira-bug also drives transitions, recording them in Status History.
- **Evidence:** docs/runbooks/jira-publish.md:74-91 (Phase 4 sync-jira-bug); skills/sync-jira-bug/SKILL.md description ('Writes Status History rows … on issue creation and status transition')
- **Fix:** Change to 'All four sync skills drive the Jira issue's status from the local status'. Add that sync-jira-bug maps the bug lifecycle (new/in-progress/ready-for-qa/closed/reopened, not the document lifecycle) and records transitions in `## Status History`, not a Change Log.

### RUNBOOKS-24 — `docs/runbooks/qa-flow.md:136` (missing)

- **Doc says:** Phase 3b shows only `/review-pr --effort medium --comment` (the orchestrator's call on the current branch's PR)
- **Reality:** Since task.176, a standalone `/review-pr` also accepts a work item as target: a Jira key or URL, a GitHub issue URL or `#N`. It resolves the item to its PR, and `resolved_via` names the route.
- **Evidence:** skills/review-pr/SKILL.md:36,40 (target: `<PR-number>`\|`<PR-URL>`\|`<branch>`\|`<JIRA-KEY>`\|`<Jira-URL>`\|`#<issue>`\|`<GitHub-issue-URL>`); CHANGELOG.md [Unreleased] '/review-pr starts from the work item'
- **Fix:** Add a line for standalone use: `/review-pr [PR \| branch \| JIRA-KEY \| Jira URL \| #issue] [--effort …] [--comment]`, linking to the SKILL.md target table.

### RUNBOOKS-25 — `docs/runbooks/bug-fix.md:108` (missing)

- **Doc says:** Step 3 sets `new → in-progress` … sets `ready-for-qa`. The registry row is said to change only at Step 7 ('general bug → the registry row flips to `closed`').
- **Reality:** For a general bug, every status write (in-progress, ready-for-qa, reopened, closed) is mirrored into the `docs/bugs/bug-registry.md` row in the same edit. A consumer drift guard compares the two on every push.
- **Evidence:** skills/develop-bug/SKILL.md:219 ('General bug: every status write here … is mirrored into the docs/bugs/bug-registry.md row's Status cell in the same edit'), :241
- **Fix:** In Step 3 and Steps 5–6 note that a general bug's registry row mirrors each status write, so verifying only the final `closed` row is not sufficient mid-run.

### RUNBOOKS-26 — `docs/runbooks/first-week/day-1-tasks.md:81` (broken)

- **Doc says:** 'see docs/runbooks/task-development.md §"Phase B — QA loop"'; prerequisite line 18: 'Node ≥ 20'
- **Reality:** task-development.md has no 'Phase B — QA loop' section; the QA loop is a row inside 'Phase B — Implementation (develop-task)'. Day 1 works in a clone of this repo, whose package.json requires Node >= 22.
- **Evidence:** docs/runbooks/task-development.md:80 ('## Phase B — Implementation (`develop-task`)'); package.json:16-17 (`"engines": { "node": ">=22" }`)
- **Fix:** Link to `../task-development.md#phase-b--implementation-develop-task` (Steps 5–6 row) and change the prerequisite to Node ≥ 22.

### SKILL-READMES-STANDARDS-13 — `skills/develop-task/README.md:25` (stale)

- **Doc says:** Hooks row lists only `PreCompact` -> `scripts/on-precompact.sh`
- **Reality:** The pipeline installs two hooks: PreCompact (graceful pause) and Stop (on-stop.sh, forced continuation via decision: block); install-hooks.sh registers both
- **Evidence:** skills/develop-task/SKILL.md:13-19 (two hooks, install-hooks.sh); skills/develop-task/scripts/on-stop.sh; skills/develop-story/SKILL.md:176
- **Fix:** Add 'Stop -> scripts/on-stop.sh (blocks a premature stop mid-pipeline)' and the install command to the Hooks row; same fix in skills/develop-story/README.md:27.

### SKILL-READMES-STANDARDS-17 — `skills/develop-next/README.md:3` (missing)

- **Doc says:** /develop-next 'takes the next unblocked item on the consumer project's completion roadmap'
- **Reality:** Selection also derives a frontier from the task and bug registries; roadmap-complete means the roadmap and both registries are exhausted, and Step 4 annotates the task-registry row (registry-tick.js --annotate)
- **Evidence:** skills/develop-next/SKILL.md:119 ('roadmap-complete now means the roadmap and both registries are exhausted'), :406 (item.source = task-registry), :422 (registry-tick.js --annotate); commit ef54b2b2
- **Fix:** Add a sentence: when the roadmap has no runnable row, the selector falls back to docs/tasks/task-registry.md and docs/bugs/bug-registry.md, and a registry-sourced item is recorded by annotating its registry row.

### SKILL-READMES-STANDARDS-18 — `skills/develop-next/README.md:29` (missing)

- **Doc says:** Parallel batch: `select-next.mjs --batch` is 'a planning aid' that returns `git worktree add` commands; develop in parallel, merge serially
- **Reality:** /develop-batch automates that fan-out (worktrees, concurrent pipelines, serial rebase+merge, ticks)
- **Evidence:** skills/develop-batch/SKILL.md (frontmatter description); skills/develop-batch/README.md:150-155
- **Fix:** Point the bullet at /develop-batch (and its README) as the automated path, keeping select-next.mjs --batch as the read-only preview.

### SKILL-READMES-STANDARDS-19 — `skills/qa-next/README.md:80` (broken)

- **Doc says:** '`uat-automate <id>` (a separate skill: branch -> spec ... -> PR) turns it into a regression test' (also L43 '/qa-next and uat-automate update it')
- **Reality:** No uat-automate skill ships in this repository; qa-next's own SKILL.md qualifies the hand-off 'until that skill exists in the consumer'
- **Evidence:** ls skills/ (no uat-automate); skills/qa-next/SKILL.md:229
- **Fix:** Say uat-automate is a consumer-side skill not shipped here, and give the fallback from SKILL.md:229 (the Automation candidate block is the spec brief; run --automated when the spec lands).

### SKILL-READMES-STANDARDS-22 — `skills/review-task/README.md:73` (stale)

- **Doc says:** '7-step comprehensive analysis' (1 Template ... 7 Readiness Scoring); question rounds 'After Step 1 / After Steps 2-3 / After Steps 4-5' (L45-47)
- **Reality:** SKILL.md runs 'Review Workflow (8 Sequential Steps)': Step 0 output format, 0a branch setup, 1 config, 1.5 parallel pre-pass, 2 template, 3 technical accuracy, 4 plan, 6 consistency, 6.5 mermaid, 7 risk, 8 output, 8.5 offer fixes, 9 status; QP1 follows Step 2, QP2 Step 4, QP3 Step 7
- **Evidence:** skills/review-task/SKILL.md:309-1767 headings (Step 0 ... Step 8.5), :750, :1150, :1364 (QUESTION POINTs)
- **Fix:** Rewrite the list from SKILL headings: 0 output format, 0a branch setup, 1 config/context (with the Phase 1.5 parallel pre-pass), 2 template, 3 technical accuracy, 4 plan completeness, 6 consistency, 6.5 Mermaid validation, 7 risk/rollback, 8 output (full report or action plan only), 8.5 offer fixes, 8.6 Jira body push, 9 status update, 10 tracker comment. Question points come after Steps 2, 4 and 7.

### SKILL-READMES-STANDARDS-24 — `skills/review-story/README.md:75` (stale)

- **Doc says:** '8-step comprehensive analysis' ending at '8. Review Report'; question rounds after Steps 1-2/3-4/5-7
- **Reality:** SKILL.md runs Step 0 (mode/output), 0a, 1 (context + parallel pre-pass), 2-8, 6.5 Mermaid validation, 6.6 Wireframe verification (via wireframe, shipped since v0.52), 9 output, 9.5 offer fixes, 9.6 tracker sync, 10 status update, 11 tracker comment
- **Evidence:** skills/review-story/SKILL.md:412-2450 step headings (Step 6.6: Wireframe Verification (via `wireframe`) at :1376)
- **Fix:** Update the step list to the SKILL headings, including 6.6 wireframe verification and steps 9.5, 9.6, 10 and 11. Also replace the '3 batched rounds' section (L45-49) and the '3 question points' feature bullet with the single Unified Question Point (one batch of at most 4 questions after Step 8, skipped in validate mode).

### SKILL-READMES-STANDARDS-29 — `docs/standards/task-documents.md:102` (missing)

- **Doc says:** Co-located artifacts table (and Directory layout L13-23) lists plan, review, PR review, implementation, QA, DoD, gate
- **Reality:** Pipelines also write sprint-review-summary.md (finalise 6a), continuation handoff task.{n}.handoff.{n}.{name}.md (session-handoff continue), tracker handover task.{n}.handover.{n}.{name}.{md,sh,json} and task bug reports; the layout tree also omits the pr-review file
- **Evidence:** skills/finalise/SKILL.md:1289,1338 (sprint-review-summary.md committed at 6a); docs/standards/file-naming.md:54-56 (handoff/handover rows); CHANGELOG.md [Unreleased] task.156
- **Fix:** Add rows for sprint-review-summary.md, handoff, handover and bug reports (or link file-naming.md for the full list), and add the pr-review line to the tree. Same gap in docs/standards/story-documents.md:21-27 and :102-110; file-naming.md has no sprint-review-summary row either.

### SKILL-READMES-STANDARDS-30 — `docs/standards/README.md:7` (missing)

- **Doc says:** Index lists PRD/epic/story/task schemas and file-naming, status, plan, epic-registry, task-registry, architecture
- **Reality:** docs/standards/ also holds bug-documents.md (general-bug schema) and bug-registry.md, and neither is indexed
- **Evidence:** git ls-files docs/standards (bug-documents.md, bug-registry.md)
- **Fix:** Add '- `docs/standards/bug-documents.md`' under Document schemas and '- `docs/standards/bug-registry.md`' under Cross-cutting rules.

## Refuted by the verifier (3)

- REFERENCE-22 `docs/reference/pipeline-artifacts.md` — pipeline-artifacts.md scopes itself to 'Every file /develop-story and /develop-task create'. It does not claim to list every co-located file, and it does not cover session-handoff. The continuation handoff is written by session-handoff, not the pipeline, and file-naming.md, which owns the filename grammar, already has the rows. The doc does not cover this skill, so the 'missing' standard is not met.
- REFERENCE-26 `docs/reference/configuration.md` — The configuration.md hooks section is explicitly scoped to the project `.claude/settings.json` hooks that the develop pipelines register. The context-pressure hook is a user-level (~/.claude) opt-in installed by session-handoff, which configuration.md does not cover. It is documented in session-handoff/SKILL.md § Context-pressure trigger. This is a possible enhancement, not drift.
- REFERENCE-27 `docs/reference/develop-story-pipeline-audit.2026-08-20.md` — develop-story-pipeline-audit.2026-08-20.md:181 already wraps the example in backticks (`[document-change-log.md](document-change-log.md)`). It renders as a code span, not a live link, so it is not broken.

## Coverage

| Cluster | Docs read | Partly or not checked |
|---|---|---|
| overview | 18 | docs/examples/architecture/index.md optional-shard links (lines 21-27): not reported as broken because they sit inside an HTML comment template and are placeholders by design<br>The observe-work Session Start Protocol was not run: the task required a read-only audit, and that protocol writes to the observation log |
| reference | 11 | docs/reference/skill-catalog.md — generated by npm run generate-catalog and confirmed fresh today (per task)<br>docs/reference/develop-story-pipeline-audit.2026-08-20.md — a dated point-in-time audit pinned to 85403aa (v0.44.0) that says it records findings rather than current behaviour, so its content was not checked for drift; only its links were checked (see REFERENCE-27)<br>docs/reference/configuration.md lines ~629-1008 (Jira status mapping candidate lists, estimate fields, doc-link branch order, project.yml, placeholders) — read but only spot-checked; individual defaults such as the Jira candidate lists and docBranch resolution order were not each verified against jira-sync.js<br>docs/reference/tracker-workflow.md lines ~170-520 and 698-770 (bespoke-column worked examples, format rules, Jira execution semantics, failure behaviour) — read, CLI flags were verified to exist in gh-stage.js/jira-stage.js/scaffold script, and the link and anchor check passed; individual semantic claims in those sections were not each re-derived |
| runbooks | 21 | — |
| skill-readmes-standards | 23 | skills/develop-story/README.md subagent contract table rows 1-10 (output schemas): spot-checked only, not verified field by field against each prompt file<br>skills/loop-supervisor/README.md lines 200-406 (dashboard frame contract, ledger shapes): option flags and defaults verified against scripts/run-loop.mjs; the dashboard payload fields were not checked against the implementation<br>skills/command-development/README.md: structure and file list verified; approximate word counts (~6,000 words of examples vs ~2,700 actual) treated as cosmetic and not reported |
