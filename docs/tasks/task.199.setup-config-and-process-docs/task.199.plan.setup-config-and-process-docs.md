---
id: task.199.plan
title: "Implementation Plan: Setup, configuration and process docs"
type: plan
task-ref: task.199.setup-config-and-process-docs.md
---

# Implementation Plan: Setup, configuration and process docs

> Requirements and success criteria: [task.199.setup-config-and-process-docs.md](task.199.setup-config-and-process-docs.md)

## Overview

20 findings, each with what the doc says, what the source says, the evidence and the fix, copied from the verified audit (`develop` @ `a0e135a6`). Phase 0 re-checks each one before it is edited.

## Findings by doc

### `docs/concepts/getting-started.md`

- [ ] **OVERVIEW-10** (medium, missing) — line 121
  - **Doc says:** The wizard's step table (1-9 plus 2b) and 'Files produced' list
  - **Source:** After the skills install, the wizard has a `tracker-workflow.yaml` step. It keeps an existing file, generates one from the live board, or writes a template with a warning to edit it before the first run. Neither the table nor 'Files produced' mentions it.
  - **Evidence:** scripts/setup-consumer.sh:580 (`write_tracker_workflow()`), :1955 (called from main after install_skills), :624/:632 (record_step 'generated from board' / 'template (edit before first run)')
  - **Fix:** Add a table row between steps 8 and 9 for scaffolding `tracker-workflow.yaml` (generated from the live board when possible, otherwise a template to edit), and add `tracker-workflow.yaml` to 'Files produced'.
- [ ] **OVERVIEW-11** (medium, stale) — line 129
  - **Doc says:** Step 4 'Writes `.env.example` (keys only); optionally writes `.env` + adds to `.gitignore`'
  - **Source:** The wizard writes live credentials to `.secrets/tooling.env` and adds both `.secrets/` and `.env` to .gitignore. This also contradicts the same page's 'Files produced' list, which says `.secrets/tooling.env`.
  - **Evidence:** scripts/setup-consumer.sh:366 (`CRED_FILE=".secrets/tooling.env"`), :430-455 (write + `.gitignore` append of `.secrets/` and `.env`)
  - **Fix:** Change to 'Writes `.env.example` (keys only); optionally writes `.secrets/tooling.env` and adds `.secrets/` and `.env` to `.gitignore`'.
- [ ] **OVERVIEW-12** (low, stale) — line 297
  - **Doc says:** Pipelines run hands-free when 'three Claude Code hooks' are registered (also step 9 at line 134: 'the three pipeline hooks')
  - **Source:** The installer registers two hooks, PreCompact and Stop. The page's own table lists two.
  - **Evidence:** shared/resources/develop-pipeline-install-hooks.sh:2 and :326-329 (PreCompact + Stop only); scripts/setup-consumer.sh:1821 ('2 hooks registered')
  - **Fix:** Change 'three' to 'two' at lines 134 and 297.

### `docs/concepts/quickstart-task.md`

- [ ] **OVERVIEW-9** (medium, broken) — line 53
  - **Doc says:** Verify Bitbucket auth with `source shared/resources/bitbucket-auth.sh` (same in quickstart-story.md:54 and :196)
  - **Source:** These quickstarts run in a consumer project, which has no `shared/resources/` directory. Installed skills carry the helper as `.agents/skills/<skill>/references/bitbucket-auth.sh`, so the command fails with 'No such file'.
  - **Evidence:** git ls-files: skills/create-pr/references/bitbucket-auth.sh (bundled copy), and only this repo has shared/resources/bitbucket-auth.sh
  - **Fix:** Use `source .agents/skills/create-pr/references/bitbucket-auth.sh` in quickstart-task.md:53 and quickstart-story.md:54 and :196.

### `docs/concepts/which-access.md`

- [ ] **OVERVIEW-26** (low, inconsistent) — line 36
  - **Doc says:** Flowchart leaf: 'access.tracker: approve — today this still defers; see limits'
  - **Source:** `approve` defers during the run, then asks one batched confirmation at handover and executes the approved records via the committed script. It degrades to `command` only without a tty. The same page's prose (:51) and restricted-access.md:34 already say this, but the leaf reads as if approve were unimplemented.
  - **Evidence:** shared/resources/develop-pipeline-step-7-finalise.md:500-510 ('The approve model at handover' … 'Approved records execute via the committed script')
  - **Fix:** Change the leaf to 'access.tracker: approve — one batched confirmation at handover'.

### `docs/concepts/which-path.md`

- [ ] **OVERVIEW-19** (medium, inconsistent) — line 28
  - **Doc says:** A production defect routes to `/create-branch --hotfix` (flowchart :28, prose :60, table :93), with the hotfix runbook as the only follow-up
  - **Source:** The rewritten hotfix runbook says a hotfix is a bug with a different branch model. You file it with `/create-bug-report` (general bug, description says 'production'), then `/develop-bug` takes the hotfix branch model and calls `create-branch --hotfix` itself. Running `/create-branch --hotfix` by hand skips the bug document, review-bug, the regression test and the fix record.
  - **Evidence:** docs/runbooks/hotfix.md:18-20 ('The pipeline is the same one a regular bug uses — /develop-bug'), :36-42, :48-51 (create-bug-report → develop-bug → create-branch --hotfix); skills/develop-bug SKILL.md description ('production hotfix (off main)')
  - **Fix:** Change the 'Yes — urgent fix' leaf to '/create-bug-report (say "production") → /develop-bug, hotfix branch model', in the flowchart, the Question 2 prose and the quick-reference table, still linking hotfix.md.

### `docs/examples/architecture/README.md`

- [ ] **OVERVIEW-28** (low, stale) — line 19
  - **Doc says:** Recommends `architectureSharded: true` and `architectureVersion: v4` in skills-config.yaml
  - **Source:** No skill, shared resource or script reads either key. The configuration reference documents only `architecture.architectureShardedLocation`.
  - **Evidence:** `git grep 'architectureVersion\|architectureSharded:' -- ':!skills/*/references/*'` matches only docs and .agents/plans, with no reader in skills/ or shared/resources/; docs/reference/configuration.md:14, :229
  - **Fix:** Drop the two keys from the snippet and keep `architectureShardedLocation` plus `devLoadAlwaysFiles`, or mark them as informational, not read by any skill.

### `docs/reference/configuration.md`

- [ ] **REFERENCE-14** (medium, inconsistent) — line 558
  - **Doc says:** The Pipeline stages table lists six stages (work-started, in-review, in-qa, ready-for-merge, blocked, done) and says "The three new stages default off"
  - **Source:** The moment set has eight members: it also includes `changes-requested` (Step 5b, once per cycle) and `pr-merged` (develop-next/develop-batch post-merge). Five are off by default. tracker-workflow.md documents all eight.
  - **Evidence:** shared/resources/tracker-workflow.js:58-67 MOMENTS; docs/reference/tracker-workflow.md:132-143 ('All eight are wired. The five marked ❌…')
  - **Fix:** Add `changes-requested` and `pr-merged` rows to the table. Change 'The three new stages' to 'The five off-by-default stages', or replace the table with a link to tracker-workflow.md § The moments.
- [ ] **REFERENCE-13** (medium, stale) — line 1145
  - **Doc says:** Platform resolution order step 2: "Environment variables (`JIRA_URL` present → Jira; `BITBUCKET_USERNAME` present → Bitbucket)"
  - **Source:** VCS resolves from config `vcs:` and then the git remote (bitbucket.org → bitbucket, else github). No environment variable selects Bitbucket. Only TRACKER has env and .env rungs (JIRA_URL).
  - **Evidence:** shared/resources/resolve-platform.sh:502-511 (VCS = config value, `auto` → `git remote get-url origin | grep -qi bitbucket.org`); shared/resources/platform-detection.md:58 'config → env → .env (TRACKER only) → git remote (VCS only) → default'
  - **Fix:** Change step 2 to '`JIRA_URL` in env or `.env` → Jira (tracker only)'. State that VCS comes from config and then the git remote.

### `docs/reference/faq.md`

- [ ] **REFERENCE-23** (low, stale) — line 65
  - **Doc says:** "Why are skills distributed as zips?" — the packager bundles into each zip (also line 99; glossary.md:61 'Auto-bundled into each skill's zip by the packager')
  - **Source:** The primary install is `setup-consumer.sh`, which extracts a tarball of skill directories that `npm run bundle` (bundle_skill.py) made self-contained in-tree. Zips are a gitignored build artifact used only for the manual offline install.
  - **Evidence:** AGENTS.md § Shared Resources (two distribution paths); scripts/setup-consumer.sh (tarball, no .zip use); docs/concepts/getting-started.md:340 'Option C — manual zip install'
  - **Fix:** Retitle it to 'Why is each skill self-contained?' and describe both in-tree bundling (tarball installs) and zips (offline).
- [ ] **REFERENCE-24** (low, stale) — line 93
  - **Doc says:** "`docs/tasks/` and the two registry filenames (`epic-registry.md`, `tasks/task-registry.md`) are also hardcoded."
  - **Source:** There is also a third hardcoded registry, `docs/bugs/bug-registry.md`, for general bugs.
  - **Evidence:** AGENTS.md § Bug Registry; docs/standards/bug-registry.md
  - **Fix:** List the three registries, including `bugs/bug-registry.md`.

### `docs/reference/glossary.md`

- [ ] **REFERENCE-10** (medium, stale) — line 15
  - **Doc says:** "Bug report: Structured record of an issue found by QA or a user, scoped to an existing story."
  - **Source:** Bug reports have three modes. A story bug is co-located with the story, a task bug sits in the task directory, and a general (cross-cutting) bug lives in `docs/bugs/bug.{n}.{name}/` and is numbered from the global bug registry.
  - **Evidence:** skills/create-bug-report/SKILL.md description (three modes); docs/standards/file-naming.md:24-26 general bug
  - **Fix:** Define it as a story, task or general bug and link docs/standards/bug-documents.md. Add a Bug registry row (`docs/bugs/bug-registry.md`) beside the epic and task registries.

### `docs/runbooks/bug-fix.md`

- [ ] **RUNBOOKS-25** (low, missing) — line 108
  - **Doc says:** Step 3 sets `new → in-progress` … sets `ready-for-qa`. The registry row is said to change only at Step 7 ('general bug → the registry row flips to `closed`').
  - **Source:** For a general bug, every status write (in-progress, ready-for-qa, reopened, closed) is mirrored into the `docs/bugs/bug-registry.md` row in the same edit. A consumer drift guard compares the two on every push.
  - **Evidence:** skills/develop-bug/SKILL.md:219 ('General bug: every status write here … is mirrored into the docs/bugs/bug-registry.md row's Status cell in the same edit'), :241
  - **Fix:** In Step 3 and Steps 5–6 note that a general bug's registry row mirrors each status write, so verifying only the final `closed` row is not sufficient mid-run.

### `docs/runbooks/change-management.md`

- [ ] **RUNBOOKS-20** (low, stale) — line 56
  - **Doc says:** change-checklist sections: 1 Issue summary, 2 Affected artifacts, 3 Cascade analysis, 4 Options, 5 Recommended action, 6 Edits
  - **Source:** change-checklist's six sections are: 1 Understand Trigger & Context, 2 Epic Impact Assessment, 3 Artifact Conflict & Impact Analysis, 4 Path Forward Evaluation, 5 Sprint Change Proposal Components, 6 Final Review & Handoff.
  - **Evidence:** skills/change-checklist/SKILL.md:28,49,74,105,137,157 (Section 1–6 headings)
  - **Fix:** Replace the numbered list with the skill's actual section names.

### `docs/runbooks/first-week/day-1-tasks.md`

- [ ] **RUNBOOKS-26** (low, broken) — line 81
  - **Doc says:** 'see docs/runbooks/task-development.md §"Phase B — QA loop"'; prerequisite line 18: 'Node ≥ 20'
  - **Source:** task-development.md has no 'Phase B — QA loop' section; the QA loop is a row inside 'Phase B — Implementation (develop-task)'. Day 1 works in a clone of this repo, whose package.json requires Node >= 22.
  - **Evidence:** docs/runbooks/task-development.md:80 ('## Phase B — Implementation (`develop-task`)'); package.json:16-17 (`"engines": { "node": ">=22" }`)
  - **Fix:** Link to `../task-development.md#phase-b--implementation-develop-task` (Steps 5–6 row) and change the prerequisite to Node ≥ 22.

### `docs/runbooks/jira-publish.md`

- [ ] **RUNBOOKS-23** (low, inconsistent) — line 105
  - **Doc says:** 'All three sync skills drive the Jira issue's status from the local frontmatter `status:`.'
  - **Source:** The runbook documents four sync skills (Phase 4 adds `sync-jira-bug`), and sync-jira-bug also drives transitions, recording them in Status History.
  - **Evidence:** docs/runbooks/jira-publish.md:74-91 (Phase 4 sync-jira-bug); skills/sync-jira-bug/SKILL.md description ('Writes Status History rows … on issue creation and status transition')
  - **Fix:** Change to 'All four sync skills drive the Jira issue's status from the local status'. Add that sync-jira-bug maps the bug lifecycle (new/in-progress/ready-for-qa/closed/reopened, not the document lifecycle) and records transitions in `## Status History`, not a Change Log.

### `docs/runbooks/release-and-install.md`

- [ ] **RUNBOOKS-3** (medium, missing) — line 50
  - **Doc says:** 'The script: bumps version, updates CHANGELOG, commits chore(release), creates an annotated tag, pushes.' followed by a manual §4 'Sync develop forward'
  - **Source:** release.sh first reads CI's verdict for HEAD (scripts/release-ci-verdict.mjs) and refuses unless Test/ShellCheck are green (escape: `--skip-ci-check`), warns on branches with commits not on develop, runs `npm run test:clean-checkout`, and syncs develop with main itself (step 9; `--no-sync-develop` to skip). A maintainer running it right after merging the release-prep PR is refused while CI is still pending, with no explanation in this runbook.
  - **Evidence:** scripts/release.sh:13-28 (steps 1b CI verdict, 2 branch warning, 9 'Syncs develop with main'), scripts/release.sh:10-11 (`--no-sync-develop`, `--skip-ci-check`)
  - **Fix:** In §3 list what release.sh does including the CI-verdict gate (wait for CI on main, or `--skip-ci-check` only when CI was confirmed another way) and the automatic develop sync; reword §4 as 'only if you passed --no-sync-develop'.
- [ ] **RUNBOOKS-22** (low, missing) — line 92
  - **Doc says:** Wizard steps table: Platform, Credentials, Config, Registries, Docs scaffold, Skill profile, Skills, Hooks
  - **Source:** The wizard also asks the tracker access model (`access.tracker`, step 'Tracker access') and writes `tracker-workflow.yaml` (from the live board when it can read it, otherwise a template to edit before the first run).
  - **Evidence:** scripts/setup-consumer.sh:277-278 (record_step "Tracker access"), :583-632 and :693-696 (record_step "tracker-workflow")
  - **Fix:** Add two rows: 'Tracker access — choose full/manual/command/approve/read-only' and 'tracker-workflow — generate `tracker-workflow.yaml` from the board, or a template to edit'.

### `docs/standards/prd-documents.md`

- [ ] **SKILL-READMES-STANDARDS-28** (medium, inconsistent) — line 16
  - **Doc says:** Layout `docs/prd/{domain}/prd.{feature}/prd.{feature}.md` with epics at `${PRD_ROOT}/{domain}/prd.{feature}/epics/epic.{N}.{name}/` (L22)
  - **Source:** story-documents.md:14-20 and epic-documents.md:16-22 put epics at `docs/prd/{domain}/{feature}/epics/` (no prd. prefix), as do docs/reference/configuration.md:20-22, shared/resources/resolve-paths.sh:19 and create-epic; create-prd alone writes `[domain]/prd.[feature]/prd.[feature].md`. This repo's own tree is docs/prd/onboarding/prd.onboarding.md + docs/prd/onboarding/epics/
  - **Evidence:** skills/create-prd/SKILL.md:45,65 vs skills/create-epic/SKILL.md:46,107-108,349; shared/resources/resolve-paths.sh:19; git ls-files docs/prd
  - **Fix:** Edit only docs/standards/prd-documents.md (the layout tree, the epic locator sentence and the 'Directory: prd.{feature}' naming rule) to use {domain}/{feature}/prd.{feature}.md and {domain}/{feature}/epics/, matching resolve-paths.sh and create-epic. File a follow-up to fix create-prd's output path (`${PRD_ROOT}/[domain]/prd.[feature]/prd.[feature].md` at SKILL L45/L65).

### `docs/standards/README.md`

- [ ] **SKILL-READMES-STANDARDS-30** (low, missing) — line 7
  - **Doc says:** Index lists PRD/epic/story/task schemas and file-naming, status, plan, epic-registry, task-registry, architecture
  - **Source:** docs/standards/ also holds bug-documents.md (general-bug schema) and bug-registry.md, and neither is indexed
  - **Evidence:** git ls-files docs/standards (bug-documents.md, bug-registry.md)
  - **Fix:** Add '- `docs/standards/bug-documents.md`' under Document schemas and '- `docs/standards/bug-registry.md`' under Cross-cutting rules.

## Key Patterns and References

- Edit `shared/resources/` sources, never `skills/*/references/` copies (none is in scope).
- Line numbers are from 2026-10-07; find each passage by its quoted text if the line moved.
- When a fix restates a rule, cite the source file rather than paraphrasing it in a second place.

## Testing Approach

- Per finding: re-read the cited source line after editing; grep the doc for the old wording.
- Per file: `prettier --check` and the CI link checker.
