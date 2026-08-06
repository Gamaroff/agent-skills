# Shared Resources

Single source of truth for cross-skill documentation. `package_skill.py` auto-bundles any file referenced here into each skill's zip and rewrites paths accordingly — skills are fully self-contained after packaging.

## Usage

Reference files in skill `.md` files using the exact path `shared/resources/<filename>`. Do not use symlinks or relative paths.

## File Index

### Platform Detection

| File | Used by (skill count) | Purpose |
|------|-----------------------|---------|
| `platform-detection.md` | 9 skills | Canonical spec for tracker/VCS resolver order (Jira/GitHub, Bitbucket/GitHub) |
| `resolve-platform.sh` | 10 skills | Shell helper — sources before any tracker/VCS branch; determines `TRACKER` and `VCS` env vars |
| `resolve-platform.test.sh` | — (test only) | Test suite for the platform resolver; not bundled into skills |

Skills that source `resolve-platform.sh`: `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`, `sync-jira-story`, `sync-jira-task`

### GitHub Project Boards

| File | Used by (skill count) | Purpose |
|------|-----------------------|---------|
| `set-github-project-priority.sh` | 3 skills | Mirrors the `priority:*` label onto the GitHub Project v2 "Priority" single-select field. Idempotent, never halts the caller. Loops over every Project board containing the issue. Derives priority from the issue's label when the arg is omitted. |

Skills that invoke `set-github-project-priority.sh`: `create-task`, `review-task`, `review-story`

**Why GitHub-only**: this helper exists because GitHub does not auto-sync `priority:*` issue labels into a Project v2 board's "Priority" single-select custom field — two separate stores with no built-in mirror. **No Jira/Bitbucket analogue is needed**:

- **Jira**: priority is a first-class issue field (`fields.priority.name`), not a label. Jira boards display issue priority directly — there is no separate board-level priority field to drift out of sync. Local↔remote priority drift is corrected end-to-end by `/sync-jira-task`, `/sync-jira-story`, `/sync-jira-epic` via `jira-sync.js` — see `normalisePriority()` (lowercase frontmatter ↔ Title Case Jira API, with a `PRIORITY_MAP` synonym table and live-priority lookup) and the priority diff inside `diffFields()`.
- **Bitbucket**: used only as a VCS in this repo (embedded source-document URLs in Jira ADF). No boards, labels, or priority concepts. Nothing to mirror.

### Develop Pipeline

Ordered step-by-step reference for the full story/task development pipeline. Used by `develop-story` and `develop-task`.

| File | Purpose |
|------|---------|
| `develop-pipeline-step-0-resolve-and-prepare.md` | Resolve story, validate, set up branch |
| `develop-pipeline-step-1-create-branch.md` | Create Gitflow branch |
| `develop-pipeline-step-2-review.md` | Pre-implementation review gate |
| `develop-pipeline-step-3-develop-loop.md` | Implementation loop with quality checks |
| `develop-pipeline-step-4-create-pr.md` | Open pull request |
| `develop-pipeline-step-5-6-qa-loop.md` | QA review + fix loop |
| `develop-pipeline-step-7-finalise.md` | Finalise and close story |
| `develop-pipeline-step-8-commit.md` | Commit uncommitted changes |
| `develop-pipeline-pause.md` | Mid-pipeline pause/resume protocol |
| `develop-pipeline-resume-contract.md` | Resuming an interrupted pipeline run |
| `develop-pipeline-lite-mode.md` | Lightweight mode for low-risk tasks |
| `develop-pipeline-autonomous-defaults.md` | Default decisions when running autonomously |

### Document Lifecycle

| File | Used by (skill count) | Purpose |
|------|-----------------------|---------|
| `document-status-lifecycle.md` | 18 skills | Canonical status states (`Draft → … → Accepted`) and frontmatter conventions |
| `sign-off.md` | 4 skills | Stakeholder sign-off table: format, `skills-config.yaml` roster, enforcement levels, and the agents-never-sign rule |

Skills that reference `sign-off.md`: `create-story`, `create-task`, `review-story`, `review-task`

### Code Quality

| File | Used by (skill count) | Purpose |
|------|-----------------------|---------|
| `code-vs-test-validation.md` | 6 skills | Rules for what counts as code vs test validation; prevents test-only "done" claims |

### Integrations

| File | Used by (skill count) | Purpose |
|------|-----------------------|---------|
| `jira-sync.js` | 3 skills | Node.js helper for Jira REST API operations (create/update issues, sync fields) |

## Adding a New Shared Resource

1. Drop the file in `shared/resources/`.
2. Reference it in your skill's `.md` files using `shared/resources/<filename>`.
3. `package_skill.py` will auto-bundle it into the skill zip at packaging time.
4. Add an entry to this README.

## Modifying an Existing Resource

Changing a shared resource affects all skills that reference it. Before modifying:

1. Run `grep -r "shared/resources/<filename>" skills/` to find all dependents.
2. Test each dependent skill after the change.
3. Re-package affected skills with `package_skill.py`.
