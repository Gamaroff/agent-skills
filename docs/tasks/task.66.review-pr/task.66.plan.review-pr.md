---
id: task.66.plan
title: "Implementation Plan: review-pr skill"
type: plan
task-ref: task.66.review-pr.md
---

# Implementation Plan — Task 66

> Requirements and success criteria: [task.66.review-pr.md](task.66.review-pr.md)

## Overview

`/review-pr` answers one question: *this PR says it implements task 65 — does it, and is the
evidence there?* It resolves the PR back to its work item, reads the artifacts beside that
document, and runs two read-only lenses over the same scoped diff — the existing code reviewer
and a new conformance reviewer — then writes one advisory report.

Nine steps, two new files.

## Step 0 — Platform and access

Copy `skills/create-pr/SKILL.md` Step 0.5 verbatim.

```bash
source references/resolve-platform.sh || exit 1   # sets TRACKER, VCS, ACCESS_*; the || exit 1 is load-bearing
PLATFORM="$VCS"

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$PLATFORM" = "bitbucket" ]; then
  BB_PATH=$(echo "$REMOTE_URL" | sed -E 's|.*bitbucket\.org[:/]||; s|\.git$||')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
  source references/bitbucket-auth.sh || exit 1
  AUTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BB_CURL_AUTH[@]}" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}")
  [ "$AUTH_CHECK" != "200" ] && echo "Bitbucket auth failed (HTTP $AUTH_CHECK — 404 means the credential was not accepted)" && exit 1
fi
```

**Rule for the whole skill:** PR-shaped → `$VCS`. Issue-shaped → `$TRACKER`.

## Step 1 — Resolve the PR

| Platform | Call |
|---|---|
| GitHub | `gh pr view [N] --json number,url,title,body,state,isDraft,headRefName,baseRefName,author,additions,deletions,changedFiles,files,reviewDecision,statusCheckRollup` |
| Bitbucket | `GET ${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/{id}` |

By branch (Bitbucket) — reuse `skills/qa-fix/SKILL.md`, which already URL-encodes:

```bash
ENCODED_BRANCH=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$BRANCH")
curl -sf "${BB_CURL_AUTH[@]}" \
  "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests?q=source.branch.name%3D%22${ENCODED_BRANCH}%22+AND+state%3D%22OPEN%22"
```

Binds `PR_NUMBER`, `PR_URL`, `PR_TITLE`, `PR_BODY`, `HEAD_BRANCH`, `BASE_BRANCH`, `PR_STATE`.
No PR → HALT with a named message.

## Step 2 — Resolve the work item (the new primitive)

First hit wins. Record which rung matched as `resolved_via`.

| # | Rung | Mechanism |
|---|---|---|
| 1 | branch stem | strip `feature/` \| `bugfix/` \| `hotfix/` → `STEM` → `docs/**/${STEM}/${STEM}.md`, else `docs/**/${STEM}.md` |
| 2 | `pr_number` | `grep -rl "pr_number: ${PR_NUMBER}" docs/` |
| 3 | gate `pr:` | `grep -rl "$PR_URL" docs/**/*.gate.*.yml` → sibling work item |
| 4 | tracker issue | PR body `#{N}` **or** `[A-Z]+-[0-9]+` (Jira key) → `github_issue:` / `jira_key:` frontmatter grep |
| 5 | Explore | bounded subagent fallback |
| 6 | none | code-only review, stated loudly |

Rung 1 handles `task.N.*`, `story.{E}.{S}.*`, `epic.N.*`, `bug.N.*`. Rungs 4-5 reuse the cascade
in `develop-pipeline-step-0-resolve-and-prepare.md` § 0a — do not reinvent it.

Exclusion filter (nine segments — the published idiom lists only the first four):

```
.qa.  .gate.  .bug.  .implementation.  .review.  .dod.  .plan.  .handover.  .pr-review.
```

Stories nest under `${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/`.
Glob across `docs/`; never assume one root.

## Step 3 — Collect the paper trail

```bash
D=$(dirname "$DOC_FILE")
ls "$D"/*.implementation.*.md "$D"/*.review.*.md "$D"/*.qa.*.md \
   "$D"/*.gate.*.yml "$D"/*.dod.*.md "$D"/*sprint-review-summary.md \
   "$D"/*.bug.*.md "$D"/*.handover.*.md 2>/dev/null
```

Glob only — the trailing slug is free text (`task.53.implementation.1.jira-rest-interception-initial-run.md`),
and the sprint-review file is unprefixed in task dirs but prefixed in at least one story dir.

Read the **highest-numbered** gate for `gate:`, `quality_score`, `top_issues`, `waiver`; the DoD
header block; the implementation report's Pipeline Progress table. Predicates already exist in
`docs/reference/pipeline-artifacts.md` § "Verifying a completed run".

## Step 3b — Tracker context (read-only, non-blocking)

`TRACKER=github` → `gh issue view N --json title,state,labels,milestone`.
`TRACKER=jira` → `GET ${JIRA_URL}/rest/api/2/issue/{jira_key}?fields=summary,status,issuetype,priority`, Basic auth
(`JIRA_USER_EMAIL`:`JIRA_API_TOKEN`, base64). Only `status.name` and `summary` are consumed. Atlassian MCP
`getJiraIssue` is the fallback when no credential resolves.
Used only to check the issue state agrees with the doc `status:` and the PR state.

## Step 4 — Build the diff

Git is the common denominator, so one path serves both platforms:

```bash
DIFF_FILE=$(mktemp -t review-pr.XXXXXX.patch)     # scratch, never the repo
git fetch -q origin "$BASE_BRANCH" "$HEAD_BRANCH"
git diff "origin/$BASE_BRANCH...origin/$HEAD_BRANCH" > "$DIFF_FILE"
```

Fall back to `gh pr diff N` / `GET …/pullrequests/{id}/diff` only when the refs will not fetch.
**Cross-fork PR**: `origin/$HEAD_BRANCH` does not exist when the head is a fork branch — detect it
(`headRepositoryOwner` ≠ base repo owner) and take the API-diff fallback directly, not after a failed fetch.
Empty diff → say so and stop.

## Step 5 — Two lenses, dispatched in parallel

`--effort` (`low|medium|high|max`, default `medium`) scales the **breadth** of both lenses and never their output
contract: `low`/`medium` favour few high-confidence findings; `high`/`max` widen coverage and may surface
`confidence: low` candidates, clearly labelled. The YAML shape is identical at every level.

**Lens A — code.** `shared/resources/code-review-prompt.md` passed **verbatim**, substituting
`<DIFF_FILE>` and `<WORKING_DIR>`. Never paraphrased inline: it is shared with `/qa-story` and
`/qa-task`, and paraphrasing forks it. Skipped under `--no-code`.

**Lens B — conformance.** New file `shared/resources/pr-conformance-prompt.md`. Inputs: the
work-item doc, the artifact paths, `$DIFF_FILE`, the tracker snapshot. Skipped under `--no-docs`.

```yaml
pr_conformance:
  work_item: "task.65.registry-aware-selection"
  resolved_via: branch-stem
  artifacts:
    implementation: present
    review: present
    qa_cycles: 3
    gate: "PASS — task.65.gate.3.registry-aware-selection.yml (90/100)"
    dod: present
    sprint_review: present
  findings:
    - id: PC-1
      category: coverage          # coverage | scope | trail | consistency
      severity: high              # low | medium | high
      confidence: high            # low | medium | high
      ref: "AC-3"                 # AC id, artifact path, or file:line
      finding: "<one sentence>"
      suggested_action: "<one sentence>"
  truncated_count: 0
```

Categories:

- **coverage** — each acceptance / success criterion traced to a diff hunk or a test; unmet ACs.
- **scope** — diff touches files no criterion calls for, or the PR does what the doc never claims.
- **trail** — no implementation report; gate not `PASS`/`WAIVED`; `top_issues[]` non-empty; DoD
  absent while `status: accepted`; QA-report count ≠ gate count; handover with outstanding items.
- **consistency** — doc `status:` vs PR state vs tracker state; `pr_number` absent or wrong; no
  Change Log row; stale `updated:`.

Carry `code-review-prompt.md`'s discipline across: verify against the real file before reporting,
prefer few high-confidence findings, use `confidence: low` rather than inflating severity, return
an empty list when there is nothing. The subagent is read-only and returns findings only.

## Step 6 — Deterministic verdict (advisory)

| Condition | Verdict |
|---|---|
| any conformance `high`, or code `bug` + `severity: high` + `confidence: high` | 🚨 REQUEST CHANGES |
| any `medium` | ⚠️ CONCERNS |
| otherwise | ✅ APPROVE |

Never `gh pr review --approve`. Never a gate `.yml` — only `qa-*` skills write those.

## Step 7 — Write the report

```
docs/tasks/task.65.registry-aware-selection/task.65.pr-review.1.registry-aware-selection.md
```

`{n}` starts at 1, increments on re-review (the convention `finalise` uses for `.dod.{n}.`).
No work item → **write no file**. Render the code findings to the terminal and say the review is unanchored.
Report artifacts are co-located with the work item that led to the PR; with nothing to co-locate against, an
`.agents/reviews/` directory would be a new unsanctioned location (`plan-file-locations.md` and `source-tree.md`
sanction only `.agents/plans/`).

Sections: header (PR / doc / issue / gate links) → Verdict → Artifact Trail table → AC
Traceability table → Conformance Findings → Code Review Findings → Recommended Actions.
Give it as a literal fenced template in SKILL.md.

## Step 8 — `--comment` (optional, confirmed)

One summary comment, marker `<!-- agent-skills-pr-review -->`, using the find-by-marker →
edit-by-id → else-create recipe from `skills/finalise/SKILL.md` — the only dual-platform
idempotent PR comment in the repo.

- GitHub: `gh pr view --json comments` → `gh api -X PATCH /repos/{o}/{r}/issues/comments/{id}` →
  else `gh pr comment`, all through `tracker_call_with_retry` (3× backoff + the `ACCESS_TRACKER`
  deferral gate, free).
- Bitbucket: `GET`/`PUT`/`POST …/pullrequests/{id}/comments` with `{content:{raw:…}}`. Single-shot.

Never gates. Never post over an `unverifiable` reason. Ask first unless `--comment` was explicit.

## Step 9 — Cleanup

```bash
rm -f "$DIFF_FILE"
```

## Phase 10 — Standards doc sweep

`.pr-review.` is a new artifact kind, and no standard names it yet. Register it in the same change:

- `docs/standards/file-naming.md` — a row in the **story** table (`story.{epic}.{story}.pr-review.{n}.{name}.md`)
  and the **task** table (`task.{n}.pr-review.{n}.{name}.md`)
- `docs/standards/task-documents.md` and `docs/standards/story-documents.md` — a `PR review report` row in the
  Co-located artifacts table, written by `review-pr`
- `docs/reference/pipeline-artifacts.md` — `review-pr` in the step → artifact map, marked standalone
- `grep -rn '\*\.review\.\*' skills/ shared/ scripts/` — nothing may swallow `.pr-review.`

Do **not** add `.agents/reviews/`; the fallback was removed.

## Key References

- `shared/resources/code-review-prompt.md` — Lens A, reused verbatim
- `shared/resources/resolve-platform.sh`, `bitbucket-auth.sh` — platform and auth
- `skills/create-pr/SKILL.md` § 0.5 — the platform preamble
- `skills/finalise/SKILL.md` — dual-platform idempotent PR comment
- `skills/qa-fix/SKILL.md` — dual-platform PR lookup by branch
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § 0a — doc resolution cascade
- `docs/reference/pipeline-artifacts.md` — artifact map and verification predicates
- `skills/review-bug/tests/review-bug.test.js` — contract-test model

## Testing Approach

Contract tests over the SKILL.md prose (`node:test`, CommonJS), then the repo suites, then a manual
end-to-end against PR 281 / task 65, which carries a full trail.

Mutation-prove each claim:

- rename the task 65 work item in a scratch clone → cascade must fall to rung 2, not return nothing
- blank a scratch gate's `gate:` → a `trail` finding must be raised
- remove the comment marker → the second post must duplicate
- revert the `package.json` glob → `npm test` must stop naming the suite
