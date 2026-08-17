---
name: jira-sprint-retrospective
description: 'Generate a sprint retrospective document from Jira and git, and save it into the repository. Classifies committed work against work discovered mid-sprint, tracks carry-over in both directions, and scopes the analysis to named people or to everyone who held work in the sprint. Use when the user asks to "write a sprint retro", "do a retrospective for sprint N", "what happened last sprint", or wants a retrospective to read during sprint planning.'
---

# Jira Sprint Retrospective

Produces a dated retrospective document — what was committed, what was discovered mid-sprint, what
carried over, and what the delivery data says — written into the repository so it survives the
ceremony instead of scrolling past in a terminal.

Sibling skills stop short of this. `jira-sprint-manager` computes closure and velocity data and prints
it; `jira-sprint-review-prep` computes a scope-creep audit and prints that. Both discard their output,
and neither reads `assignee`, so neither can answer "what did this person's sprint look like".

## When to Use This Skill

- Preparing for a sprint planning or retrospective ceremony
- Recording what a closed sprint actually delivered, as a durable document
- Producing a per-person delivery record for one or more named people

**Run it against a closed sprint.** The Agile API returns _current_ membership for an active sprint
and a _snapshot at closure_ for a closed one, so a retro of a live sprint changes shape underneath
you.

## Prerequisites

**Binaries:** `bash`, `curl`, `jq`, `git`.

**Required env:** `JIRA_INSTANCE` (bare host, no scheme), `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`.

**Optional env:** `JIRA_SP_FIELD` — Story Points field id, default `customfield_10026`. That default
is the Atlassian team-managed default but is tenant-specific in practice; discover the real one with
`bash ./references/discover-sp-field.sh`. Points are not used in the rendered document today, so a
wrong id degrades nothing.

## Configuration

Read from the consumer's `skills-config.yaml`. **Every key is optional and every key has a default** —
an absent `retrospective:` block is the normal case, not an error. Resolution order everywhere is
**CLI flag → config → default**.

| Key                             | Default                       | Used for                                                                    |
| ------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `retrospective.location`        | `docs/development/sprints`    | Directory the document is written to                                        |
| `retrospective.filenamePattern` | `sprint.{n}.retrospective.md` | `{n}` is the sprint number                                                  |
| `retrospective.indexFile`       | `README.md`                   | Index inside `location`; set to `''` to disable                             |
| `retrospective.identities`      | unset                         | Maps a Jira display name to a git email, enabling per-person commit figures |

```yaml
retrospective:
  location: docs/development/sprints
  filenamePattern: sprint.{n}.retrospective.md
  indexFile: README.md
  identities:
    - jira: Ada Lovelace
      git: ada@example.com
```

`identities` is read with python and PyYAML. Where that is unavailable the map is skipped and commit
figures fall back to repository-wide, which the document then labels as such — see
[Commit figures](#commit-figures).

## Workflow

### 1. Resolve the sprint

Given an id, use it. Otherwise list and pick — a retro almost always wants a **closed** sprint, so do
not reach for the active one by default:

```bash
bash ./references/jira-list-sprints.sh <board_id> closed
```

Zero results → stop and say so. One → use it. More than one → show the most recent few with their
windows and ask. `bash ./references/jira-get-active-sprint.sh <board_id>` is available when the user
explicitly wants the sprint still running.

### 2. Compile the data

```bash
bash ./scripts/compile-retro-data.sh <sprint_id> > "$(mktemp -t retro-data.XXXXXX.json)"
```

Emits sprint meta, the assignee roster, and one row per issue:

```
{ sprint: {id, name, goal, startDate, endDate, completeDate, state},
  assignees: [{displayName, accountId, emailAddress}],
  unassignedCount: number,
  issues: [{ key, summary, description, issueType, parentKey, status,
             statusCategoryKey, resolution, resolutionDate, created, points,
             assignee (nullable), addedMidSprint, addedDate, carriedOver }] }
```

Two classifications carry the document, and both are **changelog-based, not date-based**:

- **`addedMidSprint`** — a Sprint changelog event joined this issue to this sprint _after_
  `startDate`. This is when the issue joined the sprint, not when it was created. An issue filed
  months ago and pulled in on day six is discovery, and dating it by creation would miss that.
- **`carriedOver`** — joined at or before `startDate` having come from another sprint (the same event
  names a prior sprint in `from`). An issue on its first ever sprint has an empty `from` and is not
  carry-over.

### 3. Collect commit figures

```bash
bash ./scripts/collect-git-activity.sh '<startDate>' '<endDate>' [--author-email a@b,c@d]
```

Pure `git log`, walking `--all` by default because a retrospective must see work on integration
branches that never reached the trunk. Exits 0 with `available: false` and a reason when git is
unusable — the document is still produced, minus these lines.

### 4. Render

```bash
bash ./scripts/render-retro.sh <data.json> --git <git.json> [--people "Ada Lovelace"] [--stdout]
```

Writes to the resolved path and prints it. `--stdout` renders without writing — use it to preview.
`--print-path` resolves the output path and exits, which is how you check whether this sprint already
has a retrospective before overwriting one.

### 5. Author the narrative

The renderer fills everything the data determines and leaves four marked slots, because a script
cannot decide what a sprint meant:

| Marker             | What to write                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `retro:headline`   | One or two sentences naming the most important thing the data says                                       |
| `retro:findings`   | Three to five findings, each an H3 claim, a short paragraph, and a blockquote of the figures it rests on |
| `retro:keepchange` | Two or three rows of concrete observed practice — not generic advice                                     |
| `retro:order`      | The carry-over ranked by consequence, closing with one question to open planning                         |
| `retro:pr-counts`  | Merged-PR counts if you collected them (step 6); otherwise delete the comment                            |

Fill each in place and **delete the comment**. Ground every claim in a figure that is already in the
document; drop any claim you cannot. Explanations under each item come from the issue's own
description — do not invent detail the tracker does not carry.

### 6. Merged-PR counts, best effort

Optional. Determine the platform with `source ./references/resolve-platform.sh || exit 1` (sets `VCS`) — **source it, do not execute it**: run as `bash …` the variables never reach the caller, and a rejected config prints a `return` error and exits 0. Then query
that platform's API for pull requests merged inside the sprint window and write the count into the
`retro:pr-counts` slot along with the query used. **If credentials are missing or the call fails,
delete the slot and say nothing** — an unmeasured count must never be implied.

### 7. Index the document

If `retrospective.indexFile` is non-empty:

- **Directory or index missing** — create the directory and write the index from
  `resources/sprints-index-readme.md`, replacing `{LOCATION}` with the resolved location.
- **Index present** — add one row to its table:

  ```
  | {n} | {start} to {end} | {scope} | [Sprint {n}](sprint.{n}.retrospective.md) |
  ```

  Rows are ordered by sprint number. **If a row for this sprint already exists, update it in place
  rather than appending** — re-running for the same sprint must not produce a duplicate.

Commit the retrospective and the index bump together.

## Scoping to People

`--people "Ada Lovelace,Grace Hopper"` restricts the document. Omitted, it covers everyone who held
work in the sprint and records `scope: all`.

Matching is case-insensitive against `displayName`, `emailAddress` and `accountId`, then falls back to
a substring match on the display name **only when that resolves to exactly one person**.

**An unmatched or ambiguous name halts** and prints the sprint's real roster. This is deliberate: a
typo that silently produced an empty retrospective would look like a quiet sprint, which is a worse
outcome than an error.

Unassigned issues count toward sprint totals and appear in the item lists marked `unassigned`. They
are never dropped — work nobody owns is exactly what a retrospective should surface.

## Commit figures

Jira gives a display name; git gives an author email; nothing reliably connects them. So:

- **With `retrospective.identities`** — the named people's emails are passed to
  `collect-git-activity.sh` and the figures are per-person.
- **Without it** — figures cover the whole repository for the window, and the document says
  `repository-wide` next to them.

There is no name-matching fallback. Inferring an identity from a display name is wrong whenever
someone uses a nickname or a different email domain, and a misattributed commit count in a
retrospective is worse than an absent one.

The correction-share figure counts commit subjects matching a fixed pattern. It is a **heuristic, not
a classification** — the pattern is printed into the document so a reader can re-run it and disagree.

## Guardrails

- Scripts use `set -euo pipefail` and source the shared lib from `references/jira-sprint-lib.sh`
  (bundled from `references/jira-sprint-lib.sh` by `npm run bundle`) — pagination, 429/5xx
  retry, and auth by header rather than `-u`, so credentials never appear in `ps`.
- Pagination handles sprints of any size.
- No `startDate` on the sprint disables mid-sprint and carry-over detection with a warning, rather
  than emitting false positives.
- Comparing `changelog.created` against `startDate` is an ISO-8601 string comparison. Jira emits both
  as `+0000`, so this holds; a tenant rendering custom timezones would need adjustment.
- Sprint changelog values are comma-separated id lists. They are split and exact-matched, so sprint 5
  never matches sprint 51.
- An issue removed and re-added mid-sprint counts as added on the re-add; removal events are not
  correlated.
- The renderer writes one file and, via step 7, touches one index. It never modifies issue documents
  and never calls a Jira write endpoint.

## Tests

Fixture-replay, no live Jira:

```bash
bash skills/jira-sprint-retrospective/tests/fixture.test.sh
```

Locks the JSON to markdown contract: figure arithmetic, people filtering, the unmatched-name halt,
and the presence of every authoring marker.
