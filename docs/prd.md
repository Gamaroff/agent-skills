# PRD & Story Documents

Reference for projects using `develop-story`. Covers the required directory hierarchy, frontmatter schemas for epics and stories, status rules, auto-generated artifacts, and configuration.

Use `create-story` to produce a story document. Use `develop-story` (or `develop`) to run the full implementation pipeline.

---

## Directory Hierarchy

Stories are nested inside their parent epic's directory. `{domain}` and `{feature}` are project-defined path segments:

```
docs/prd/
└── {domain}/
    └── {feature}/
        └── epics/
            └── epic.{N}.{name}/
                ├── epic.{N}.{name}.md
                └── stories/
                    └── story.{E}.{S}.{name}/
                        ├── story.{E}.{S}.{name}.md                      # main document (human-authored)
                        ├── story.{E}.{S}.plan.{name}.md                 # story plan
                        ├── story.{E}.{S}.review.{YYYY-MM-DD}.md         # review report (auto)
                        ├── story.{E}.{S}.implementation.{N}.{name}.md   # pipeline report (auto)
                        ├── story.{E}.{S}.qa.{N}.{name}.md               # QA assessment (auto)
                        ├── story.{E}.{S}.dod.{N}.{name}.md              # definition of done (auto)
                        └── story.{E}.{S}.gate.{N}.{name}.yml            # QA gate decision (auto)
```

**Example paths**:
```
docs/prd/auth/login-flow/epics/epic.178.feature-ui/epic.178.feature-ui.md
docs/prd/auth/login-flow/epics/epic.178.feature-ui/stories/story.178.1.login-form/story.178.1.login-form.md
```

This layout requires `devStoryLocation: nested` in `skills-config.yaml`. For flat story layout, see [Configuration](#configuration).

---

## File Naming

- Structural segments separated by dots: `epic.178.feature-ui.md`
- Descriptive name uses hyphens, all lowercase: `feature-ui`
- Directory name matches the filename stem exactly (no extension)
- Epic numbers (`{N}`) are **globally unique** across the project — always check `/docs/development/epic-registry.md` before creating a new epic

See [conventions.md](./conventions.md) for the full naming pattern reference.

---

## Epic Frontmatter Schema

```yaml
---
epic_number: 178
title: "Feature UI"
type: epic
domain: auth
status: in-progress
priority: High
created: 2026-01-10
updated: 2026-01-15
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `epic_number` | integer | Yes | Globally unique — register in `docs/development/epic-registry.md` |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `epic` |
| `domain` | string | Yes | Path segment matching the directory (e.g. `auth`, `billing`) |
| `status` | enum | Yes | See [Status Lifecycle](#status-lifecycle) |
| `priority` | enum | Yes | `Critical`, `High`, `Medium`, `Low` |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `estimated_stories` | integer | Optional | Planned story count |
| `prd_source` | string | Optional | Source PRD filename |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |

---

## Story Frontmatter Schema

```yaml
---
epic: epic.178.feature-ui
title: "Login form validation"
type: story
status: ready-for-development
priority: High
assignee: TBD
created: 2026-01-12
updated: 2026-01-15
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `epic` | string | **YES — HARD GATE** | Must match the parent epic's directory stem, e.g. `epic.178.feature-ui`. Pipeline **HALTS** immediately if absent |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `story` |
| `status` | enum | Yes | See [Status Lifecycle](#status-lifecycle) |
| `priority` | enum | Yes | `High`, `Medium`, `Low` |
| `assignee` | string | Yes | `TBD` or a name |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `risk_level` | enum | Optional | `high`, `medium`, `low` — triggers the high-risk gate |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` — pipeline creates one if tracker is Jira and this is absent |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |

---

## Status Lifecycle

```
draft → planned → ready-for-development → in-progress → ready-for-review → accepted
```

`cancelled` is reachable from any non-terminal state.

| Frontmatter value | Body label | Set by | Precondition |
|---|---|---|---|
| `draft` | `Draft` | `create-story` | Initial state |
| `planned` | `Planned` | Author | Optional intermediate state |
| `ready-for-development` | `Ready for Development` | `review-story` | Review passes |
| `in-progress` | `In Progress` | `develop` | Was `ready-for-development` |
| `ready-for-review` | `Ready for Review` | `develop` | All acceptance criteria / tasks checked off |
| `accepted` | `Accepted` | `finalise` | DoD passed, QA gate PASS or WAIVED |
| `cancelled` | `Cancelled` | Human or any skill | Manual decision — terminal state |

**Sync rule**: frontmatter `status:` uses `lowercase-kebab-case`; the `**Status:**` line in the document body uses `Title Case`. Both must be updated in the same edit. The `finalise` skill enforces this.

---

## Co-located Story Artifacts

These files are generated automatically by skills during the pipeline. Do not create or modify them manually (gate files are owned exclusively by QA skills):

| Artifact | Pattern | Written by | Purpose |
|---|---|---|---|
| Plan file | `story.{E}.{S}.plan.{name}.md` | `create-story` | Story implementation guide |
| Review report | `story.{E}.{S}.review.{YYYY-MM-DD}.md` | `review-story` (Step 2) | Review findings |
| Implementation report | `story.{E}.{S}.implementation.{N}.{name}.md` | `develop-story` pipeline | Pipeline run record |
| QA report | `story.{E}.{S}.qa.{N}.{name}.md` | `qa-review` (Step 5) | QA assessment narrative |
| Definition of Done | `story.{E}.{S}.dod.{N}.{name}.md` | `finalise` (Step 7) | DoD checklist outcome |
| QA gate | `story.{E}.{S}.gate.{N}.{name}.yml` | `qa-review` / `qa-gate` | Machine-readable gate decision — **never modified by dev skills** |

---

## Configuration

Place `skills-config.yaml` at the project root. Relevant keys for `develop-story`:

```yaml
prd:
  prdSharded: true                           # required for the nested hierarchy
  prdShardedLocation: docs/prd              # base directory for all epics and stories
  epicFilePattern: "*/epics/epic.{n}.*.md"  # how the pipeline locates the parent epic

devStoryLocation: nested   # "nested" = stories live inside epic dirs (recommended)
                           # flat alternative: devStoryLocation: docs/stories

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md   # loaded at pipeline start

devDebugLog: .ai/debug-log.md
```

**`devStoryLocation: nested` vs flat**

| Mode | Story path | Use when |
|---|---|---|
| `nested` | `{epic-dir}/stories/story.{E}.{S}.{name}/` | Stories are logically scoped to their epic |
| flat path (e.g. `docs/stories`) | `docs/stories/story.{E}.{S}.{name}/` | Stories are managed independently of epic directory layout |

When using a flat path, the `epic:` frontmatter field is still **required** — it is used for branch targeting and epic-level tracking even though the directory structure is flat.

Full configuration reference: [conventions.md](./conventions.md).

---

## Branch Strategy

`develop-story` manages branches automatically:

| Branch | Pattern | Created from | PR targets |
|---|---|---|---|
| Epic branch | `feature/epic.{N}.{name}` | `develop` (on first story) | `develop` (merged manually when all stories done) |
| Story branch | `feature/story.{E}.{S}.{name}` | Epic branch | Epic branch |

Story PRs target the parent epic branch, **not** `develop`. The epic branch is merged to `develop` manually once all stories are accepted. Teams need `develop` as their integration branch for this convention to work.

---

## Prerequisites Checklist

Before running `develop-story`, verify:

- [ ] Story file exists at the correct nested path under `docs/prd/`
- [ ] `epic:` frontmatter is set and matches an actual epic directory stem
- [ ] Parent epic file exists in `docs/prd/`
- [ ] `prd.prdSharded: true` is set in `skills-config.yaml`
- [ ] `prd.prdShardedLocation` points to the correct base directory
- [ ] `status:` is `draft`, `planned`, or `ready-for-development`
- [ ] Frontmatter `status:` and body `**Status:**` are in sync

---

## Invocation

```
/develop docs/prd/auth/login-flow/epics/epic.178.feature-ui/stories/story.178.1.login-form/
/develop story.178.1.login-form.md
/develop #297    # GitHub issue number
```
