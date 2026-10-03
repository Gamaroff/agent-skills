---
name: review-pr
description: 'Reviews a pull request as a claim — does this change deliver what its story or task promised, and is the evidence behind it real? Resolves the PR back to its work item (branch stem, pr_number, gate URL, tracker issue), collects the co-located pipeline artifacts (implementation report, review report, QA reports, gate, DoD, sprint-review, bugs, handover), pulls the linked GitHub issue or Jira card, then runs two read-only lenses over the PR diff: the shared adversarial code reviewer and a conformance reviewer checking coverage, scope, trail and consistency. Accepts a Jira key, Jira URL or GitHub issue and finds its PR. Works on GitHub and Bitbucket. Advisory — writes a co-located report and optionally posts one summary PR comment; never approves, never writes a gate, never edits code. Triggers: review this PR, review pull request 123, does this PR match the task, review the PR for RAPP-702, /review-pr.'
---

> **Platform detection**: see [`references/platform-detection.md`](references/platform-detection.md) and [`references/resolve-platform.sh`](references/resolve-platform.sh)

# Review PR

## Overview

`/review-pr` reviews a pull request **as a claim**: *this PR says it implements task 65 — does it, and is the evidence there?*

It is the missing third member of a family. `/review-task` and `/review-story` review a document **before** implementation. `/review-code` reviews a **diff** in isolation. Neither asks whether the change on the branch actually delivers what the work item promised, or whether the paper trail the pipeline left behind it is complete and honest.

Two read-only lenses run over the same scoped diff:

- **Code** — [`references/code-review-prompt.md`](references/code-review-prompt.md), passed verbatim. The same reviewer `/review-code`, `/qa-story` and `/qa-task` dispatch.
- **Conformance** — [`references/pr-conformance-prompt.md`](references/pr-conformance-prompt.md). New here: coverage, scope, trail, consistency.

A PR can be flawless code that implements the wrong thing, or correct work whose gate never reached `PASS`. Neither lens sees the other's failures, which is why both run.

**The skill is advisory.** It writes a co-located report and optionally posts one summary PR comment. It never submits a formal approve/request-changes review, never writes a gate `.yml` (only `qa-*` skills do that), and never edits code.

## When to Use This Skill

- "Review this PR" / "review pull request 123" / "review PR 281"
- "Does this PR actually match the task?" / "is the evidence there for this PR?"
- Reviewing someone else's pipeline-produced PR before merging it
- Auditing a merged PR after the fact — the trail is still on disk

Do **not** use this for a pure diff review with no work item — use `/review-code`. Do **not** use it *as* a QA gate — it writes no gate file; `/qa-story` and `/qa-task` do. (The develop pipelines run it at **Step 5c**, inside their QA loop, and act on its verdict themselves — that is consultation, not gating. See *Relationship to the develop pipelines*.)

## Arguments

Invoke as `/review-pr [target] [--effort LEVEL] [--comment] [--inline] [--no-code] [--no-docs]`.

| Arg | Values | Default | Meaning |
| --- | --- | --- | --- |
| `target` | _(none)_ \| `<PR-number>` \| `<PR-URL>` \| `<branch>` \| `<JIRA-KEY>` \| `<Jira-URL>` \| `#<issue>` \| `<GitHub-issue-URL>` | open PR for the current branch | Which PR to review. A Jira key (`RAPP-702`), a Jira `/browse/` URL, a Jira board URL carrying `?selectedIssue=`, a Jira Cloud `…/issues/KEY` URL, a GitHub issue URL or `#N` names the **work item**; Step 1a resolves it to its PR |
| `--effort` | `low` \| `medium` \| `high` \| `max` | `medium` | Breadth vs. precision, for **both** lenses |
| `--comment` | flag | off | Post one summary comment to the PR |
| `--inline` | flag | off | Additionally post each finding as an inline comment on its own line. Implies `--comment` |
| `--no-code` | flag | off | Skip the code lens |
| `--no-docs` | flag | off | Skip the conformance lens |

**Effort** scales coverage, never the output contract — the YAML shape is identical at every level:

- `low` / `medium` — few, high-confidence findings (favour precision).
- `high` / `max` — broader coverage; may surface `confidence: low` candidates, clearly labelled.

Posting is outward-facing: **ask before posting** unless `--comment` was passed explicitly.

## Workflow

### Step 0 — Resolve platform and access

```bash
source references/resolve-platform.sh || exit 1
# TRACKER = jira | github ; VCS = github | bitbucket
PLATFORM="$VCS"

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$PLATFORM" = "bitbucket" ]; then
  # owner/repo = the remote's last two path segments — one expression, identical in Step 0,
  # Step 0b's repo_of and the rungs 3–4 block (a test holds them equal). It reads an altssh
  # remote (ssh://git@altssh.bitbucket.org:443/ws/repo.git) as ws/repo, not workspace 443.
  BB_PATH=$(printf '%s\n' "$REMOTE_URL" | sed -E 's#/+$##; s#\.git$##; s#^.*[:/]([^/:]+/[^/:]+)$#\1#')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
  source references/bitbucket-auth.sh || exit 1

  AUTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BB_CURL_AUTH[@]}" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}")
  [ "$AUTH_CHECK" != "200" ] && \
    echo "Error: Bitbucket auth failed (HTTP $AUTH_CHECK — 404 means the credential was not accepted)" && exit 1
fi
```

The `|| exit 1` on both `source` lines is load-bearing: a bare `source` prints the validation error and then continues with an unvalidated value.

**Branch on `$VCS` for everything PR-shaped, on `$TRACKER` for everything issue-shaped.** They are separate axes — a repo can host code on Bitbucket and track work in Jira, or on Bitbucket with GitHub issues.

Verify Bitbucket auth **by status code**, never by the length of a returned list: Bitbucket answers an unauthenticated request to a private repo with **404, not 401**, so a bad credential reads exactly like an empty repository.

### Step 0b — Parse `target`

Bind the variables Step 1 uses. Without this, `$PR` and `$BRANCH` are undefined and every form of
`target` except "no argument" has no path into the commands below.

The parsing is a pure, offline script —
[`scripts/parse-target.sh`](scripts/parse-target.sh) — so every accepted form has a test that runs
it under bash and zsh. Prose cannot prove a URL parses; a script can.

```bash
# One block, one shell: the host check below reads what the parse binds, so the two
# cannot be split — a host check run in a shell of its own sees KIND="" and passes
# every target silently.
source references/resolve-platform.sh || exit 1          # TRACKER, VCS
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
BRANCH=$(git branch --show-current)
PR="" KIND="" JIRA_KEY="" ISSUE_NUM="" TARGET_HOST="" TARGET_REPO=""
# A refusal (malformed URL, `#abc`, a control character) exits 2 with its reason on
# stderr — HALT and show it. A URL never falls through to the branch arm: that is how
# a pasted Jira link used to become "no pull request found for https://…".
PARSED=$(bash .agents/skills/review-pr/scripts/parse-target.sh "${TARGET:-}") || exit 1
while IFS='=' read -r k v; do
  case "$k" in
    kind)      KIND="$v" ;;
    pr)        PR="$v" ;;
    branch)    BRANCH="$v" ;;
    jira_key)  JIRA_KEY="$v" ;;
    issue_num) ISSUE_NUM="$v" ;;
    host)      TARGET_HOST="$v" ;;
    repo)      TARGET_REPO="$v" ;;
  esac
done <<EOF
$PARSED
EOF

# Host check, per kind. `#` delimiters: the www/api alternation needs `|`, and a
# `|`-delimited sed fails to parse, prints nothing, and makes both sides "" — an equal
# pair, so the check would pass silently. ssh.github.com / altssh.bitbucket.org are
# the platforms' port-443 SSH hosts, the same platform as the web host.
norm_host() { printf '%s\n' "${1}" | sed -E 's#^[A-Za-z+]+://##; s#^[^@/]*@##; s#[:/].*$##; s#^(www|api)\.##; s#^ssh\.github\.com$#github.com#; s#^altssh\.bitbucket\.org$#bitbucket.org#' | tr '[:upper:]' '[:lower:]'; }
repo_of()   { printf '%s\n' "${1}" | sed -E 's#/+$##; s#\.git$##; s#^.*[:/]([^/:]+/[^/:]+)$#\1#' | tr '[:upper:]' '[:lower:]'; }
lc()        { printf '%s' "${1}" | tr '[:upper:]' '[:lower:]'; }
REMOTE_HOST=$(norm_host "$REMOTE_URL")
REMOTE_REPO=$(repo_of "$REMOTE_URL")
# JIRA_URL is not bound by the resolver, which reads .env only to choose TRACKER — so
# read it from the environment, else from .env, the same two places the resolver looks.
JIRA_URL_SEEN="$JIRA_URL"
# .env by the resolver's rules: optional `export`, CR stripped, last wins. Then the value: a quoted
# one is the inside of its first quote pair, an unquoted one loses a ` #…` comment tail, both trimmed.
# Without that, `JIRA_URL="https://acme.atlassian.net" # prod` kept its comment and warned falsely.
# Each `t` is its own -e: BSD sed reads `…; t; …` as a label named by the rest of the script.
# The space after `=` is stripped by the FIRST sed, never the second: any earlier `s` that matches
# sets the flag `t` tests, and the first `t` would then skip the comment strip and the trim.
[ -n "$JIRA_URL_SEEN" ] || JIRA_URL_SEEN=$(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?JIRA_URL=[[:space:]]*//p' "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null \
  | tr -d '\r' | tail -1 \
  | sed -E -e "s/^\"([^\"]*)\".*\$/\1/" -e t -e "s/^'([^']*)'.*\$/\1/" -e t \
        -e 's/[[:space:]]+#.*$//' -e 's/[[:space:]]+$//')
case "$KIND" in
  pr)
    if [ -n "$TARGET_HOST" ]; then                     # a bare number has no host to check
      case "$REMOTE_HOST" in
        github.com|bitbucket.org)
          if [ "$(norm_host "$TARGET_HOST")" != "$REMOTE_HOST" ]; then
            echo "HALT: PR URL host $TARGET_HOST does not match this repo's remote $REMOTE_HOST ($REMOTE_URL)"; exit 1
          fi
          if [ -n "$TARGET_REPO" ] && [ "$(repo_of "$TARGET_REPO")" != "$REMOTE_REPO" ]; then
            echo "HALT: PR URL is for $TARGET_REPO, but this repo is $REMOTE_REPO ($REMOTE_URL)"; exit 1
          fi ;;
        "")
          echo "⚠️ no origin remote — PR URL host not checked" ;;
        *)
          # An SSH alias (git@github-work:o/r.git) or a self-hosted server: the remote's
          # HOST is not a name this check can compare, so it cannot prove a host mismatch —
          # but its owner/repo still reads correctly, so a repo mismatch still halts.
          [ "$(norm_host "$TARGET_HOST")" = "$REMOTE_HOST" ] \
            || echo "⚠️ remote host $REMOTE_HOST is not a known platform host (an SSH alias?) — PR URL host $TARGET_HOST not compared"
          if [ -n "$TARGET_REPO" ] && [ "$(repo_of "$TARGET_REPO")" != "$REMOTE_REPO" ]; then
            echo "HALT: PR URL is for $TARGET_REPO, but this repo is $REMOTE_REPO ($REMOTE_URL)"; exit 1
          fi ;;
      esac
    fi ;;
  jira)
    if [ -n "$TARGET_HOST" ] && [ -z "$JIRA_URL_SEEN" ]; then
      echo "⚠️ JIRA_URL is not set (environment or .env) — Jira URL host $TARGET_HOST not checked"
    elif [ -n "$TARGET_HOST" ] && [ "$(norm_host "$TARGET_HOST")" != "$(norm_host "$JIRA_URL_SEEN")" ]; then
      echo "⚠️ Jira URL host $TARGET_HOST differs from JIRA_URL $(norm_host "$JIRA_URL_SEEN") — continuing with key $JIRA_KEY"
    fi ;;
  github-issue)
    # Gated on VCS, not TRACKER: what reads this issue is `gh` against origin (rung 4),
    # so origin's host and owner/repo are what it must match.
    if [ -n "$TARGET_REPO" ] && [ "$VCS" = "github" ]; then
      case "$REMOTE_HOST" in
        github.com)
          if [ "$(norm_host "$TARGET_HOST")" != "$REMOTE_HOST" ]; then
            echo "HALT: issue URL host $TARGET_HOST does not match this repo's remote $REMOTE_HOST ($REMOTE_URL)"; exit 1
          fi ;;
        "") echo "⚠️ no origin remote — issue URL host and repo not checked" ;;
        *)  [ "$(norm_host "$TARGET_HOST")" = "$REMOTE_HOST" ] \
              || echo "⚠️ remote host $REMOTE_HOST is not github.com (an SSH alias or GHE?) — issue URL host $TARGET_HOST not compared" ;;
      esac
      if [ -n "$REMOTE_REPO" ] && [ "$(repo_of "$TARGET_REPO")" != "$REMOTE_REPO" ]; then
        echo "HALT: issue URL is for $TARGET_REPO, but this repo is $REMOTE_REPO ($REMOTE_URL)"; exit 1
      fi
    fi ;;
esac

# The bound values, printed so the steps below re-bind them: every fenced block is
# its own shell, and a value computed here does not exist in the next one.
printf 'KIND=%s PR=%s BRANCH=%s JIRA_KEY=%s ISSUE_NUM=%s TARGET_HOST=%s TARGET_REPO=%s\n' \
  "$KIND" "$PR" "$BRANCH" "$JIRA_KEY" "$ISSUE_NUM" "$TARGET_HOST" "$TARGET_REPO"
```

| `KIND` | From | Next |
| --- | --- | --- |
| `pr-for-current-branch` | no argument | Step 1b, PR for `$BRANCH` |
| `pr` | a bare number; a GitHub `/pull/N`, Bitbucket web `/pull-requests/N` or API `/pullrequests/N` URL (`…/pull/12/files` is PR 12) | Step 1b |
| `branch` | anything else that is not a URL | Step 1b |
| `jira` | a bare key (`RAPP-702`), `/browse/KEY`, a board URL's `selectedIssue=KEY`, Jira Cloud `…/issues/KEY` | Step 1a |
| `github-issue` | `#N`, a GitHub `/issues/N` URL | Step 1a |

**The URL's host picks the platform before any path arm is tried.** Jira Cloud's issue view
`…/projects/RAPP/issues/RAPP-702` contains `/issues/` and must not be read as a GitHub issue. The
parser never decides a key's issue type — a story key and an epic key look alike — so an epic is
caught after the document resolves (Step 1a, rung 1), not here.

**A bare number stays a PR number.** The develop pipelines pass one at Step 5c. Step 1b reclassifies
it as an issue on GitHub only when `gh pr view` fails and `gh issue view` succeeds.

#### Host check, per kind

Never "every URL against the git remote" — that would halt every Jira URL, which is never hosted where
the code is. The check is the second half of the block above.

| Kind | Compared against | On mismatch |
| --- | --- | --- |
| PR URL | the host of `git remote get-url origin`, and its `owner/repo` | **HALT**, naming both — a GitHub PR URL pasted into a Bitbucket checkout used to be looked up on Bitbucket, and `github.com/other/repo/pull/12` would review this repo's #12. A remote whose **host** is an SSH alias or a self-hosted server only **warns** about the host — its name cannot prove a mismatch — but a different `owner/repo` still halts |
| Jira URL | the host of `JIRA_URL`, from the environment or `.env` | **warn**, naming both, and continue with the key — the key is what resolves. With no `JIRA_URL` at all it says the host was **not checked** |
| GitHub issue URL | when `VCS=github`: origin's host (on github.com) and `owner/repo` — rung 4 reads the issue with `gh` against origin | **HALT**, naming both |

### Step 1 — Resolve the PR

#### Step 1a — Card → PR (only when `KIND` is `jira` or `github-issue`)

**Gated on `KIND=jira|github-issue`.** `KIND=pr`, `branch` and `pr-for-current-branch` go straight
to Step 1b — a PR target costs no extra call. **Resolution is read-only**: every call below is a
`view`, a `list` or a GET; nothing is written to Jira or GitHub.

A first-hit-wins ladder. Record the rung as `resolved_via` (`jira key → <rung>` or
`github issue → <rung>`); Step 2 prints it.

| # | Rung | Mechanism |
| --- | --- | --- |
| 1 | **work item doc** | The **docs guard** below first — no `docs/` binds `DOC_FILE=""` and skips §0a. Otherwise [§0a Key → document lookup](references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup) with `KEY_FIELD=jira_key KEY_VALUE=$JIRA_KEY`, or `KEY_FIELD=github_issue KEY_VALUE=$ISSUE_NUM`; it binds `LOCAL_PATH`, and `DOC_FILE=$LOCAL_PATH` hands it on. Cited, not restated: one anchored, quote-tolerant lookup serves the develop pipelines and this skill |
| 2 | doc's `pr_number:` | `sed -nE "s/^pr_number:[[:space:]]*['\"]?([0-9]+)['\"]?[[:space:]]*$/\1/p" "$DOC_FILE"` → `PR` |
| 3 | **branch stem** | `STEM=$(basename "$DOC_FILE" .md)`; a PR whose source branch is `STEM` or ends in `/STEM` — the rungs 3–4 block below |
| 4 | key / closing PR | Jira: a PR whose title or description names `JIRA_KEY` — **candidates only**. GitHub issue: `gh issue view "$ISSUE_NUM" --json closedByPullRequestsReferences` — **`VCS=github` only** |
| 5 | branch fallback | `KIND=jira` and still nothing → `BRANCH="$JIRA_KEY"`, Step 1b; `resolved_via: jira key → branch fallback` (a branch may be named `RAPP-702`) |
| 6 | none | **HALT** naming every rung tried: `"No pull request found for {target}: tried work item doc, pr_number, branch stem, key search, branch fallback."` |

**Rung 1 — no doc, or an epic.** No document → skip rungs 2–3 and continue at rung 4; the review that
follows may be code-only (Step 2, rung 6). The §0a lookup's own HALT on several matching documents (it exits 1) is
honoured, never overridden with `head -1`. **Epic** → **HALT**: `"{key} is an epic — pass a story or
task key."` An epic is detected after rung 1: the resolved doc's filename starts `epic.` or its
frontmatter carries `type: epic`; with no doc and `TRACKER=jira`, the Step 3b call's
`fields.issuetype.name` reads `Epic`. Reviewing every PR of an epic is out of scope.

**The docs guard — run it before §0a, here and in Step 2.** §0a HALTs on a missing `docs/`, which
is right for the develop pipelines (they cannot proceed without a document) and wrong here: a
repository that keeps no `docs/` has no document, and this skill can still review its PR. Without
the guard a card review in such a repository halted at rung 1 and never reached rung 4 or the
code-only review. §0a itself is unchanged.

```bash
# No docs/ at the repository root → no document, and §0a is not called at all.
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || ROOT=$(pwd)
if [ -d "$ROOT/docs" ]; then
  DOCS=present DOC_FILE=""    # → run §0a now (from the root), then DOC_FILE="$LOCAL_PATH"
else
  DOCS=absent DOC_FILE=""
fi
printf 'DOCS=%s DOC_FILE=%s\n' "$DOCS" "$DOC_FILE"
```

`DOCS=present` → run §0a with this rung's `KEY_FIELD` / `KEY_VALUE` and bind `DOC_FILE=$LOCAL_PATH`.
`DOCS=absent` → `DOC_FILE` is already `""`: continue at rung 4, as for any rung 1 that finds no
document. In Step 2 it skips rungs 1–4, which all read `docs/`, and continues at rung 5/6.

**Rungs 3 and 4 run as one block.** `gh pr list --head` is an exact match and the source branch
carries a prefix (`feature/`, `bugfix/`), so rung 3 filters client-side, anchored on the last
segment. Rung 4's key matches are **candidates, never answers**: one Jira card matched 3 merged PRs by
title and 5 by description, two of them docs-only (a tracker reconcile, a card sync). A title or
description match is **never auto-picked**, not even a single one: list the candidates and ask
(interactive), or halt with the list (non-interactive). An auto-pick requires the doc's `pr_number:`
or branch stem.

The block is self-contained because every fenced block is its own shell: `bb_pr_search` is defined
where both rungs call it, and the inputs are re-bound at its top — `KIND`, `JIRA_KEY` and
`ISSUE_NUM` from Step 0b's printed line, `DOC_FILE` from rung 1 (empty when no document resolved).
A failed request is a HALT, never an empty result: "no candidates" must mean the search ran.

```bash
source references/resolve-platform.sh || exit 1          # VCS
: "${KIND:?re-bind KIND from the line Step 0b printed}"
: "${DOC_FILE?bind DOC_FILE from rung 1 — empty when no document resolved, never left unset}"
case "$KIND" in
  jira)         : "${JIRA_KEY:?re-bind JIRA_KEY from the line Step 0b printed}" ;;
  github-issue) : "${ISSUE_NUM:?re-bind ISSUE_NUM from the line Step 0b printed}" ;;
esac
if [ "$VCS" = "bitbucket" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  # The same owner/repo expression as Step 0 and repo_of.
  BB_PATH=$(printf '%s\n' "$REMOTE_URL" | sed -E 's#/+$##; s#\.git$##; s#^.*[:/]([^/:]+/[^/:]+)$#\1#')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
  source references/bitbucket-auth.sh || exit 1
fi

# Every page, every state — merged PRs are a supported target.
bb_pr_search() {   # ${1} = an unencoded q= expression
  BB_Q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "${1}") || return 1
  BB_URL="${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests?q=${BB_Q}&state=OPEN&state=MERGED&state=DECLINED&pagelen=50&fields=values.id,values.title,values.state,values.source.branch.name,next"
  while [ -n "$BB_URL" ]; do
    BB_PAGE=$(curl -sf "${BB_CURL_AUTH[@]}" "$BB_URL") || return 1
    printf '%s\n' "$BB_PAGE" | jq -c '.values[] | {number: .id, title, state, branch: .source.branch.name}' || return 1
    BB_URL=$(printf '%s\n' "$BB_PAGE" | jq -r '.next // empty') || return 1
  done
}

CANDIDATES="" RUNG=""
# Rung 3 — branch stem, only when rung 1 resolved a document.
if [ -n "$DOC_FILE" ]; then
  STEM=$(basename "$DOC_FILE" .md)
  if [ "$VCS" = "github" ]; then
    # --limit 1000, not 100: an older work item's PR must not drop off a short page.
    ALL=$(gh pr list --state all --limit 1000 --json number,headRefName,state) || { echo "HALT: gh pr list failed"; exit 1; }
    CANDIDATES=$(printf '%s\n' "$ALL" | jq -c --arg s "$STEM" '.[] | select(.headRefName == $s or (.headRefName | endswith("/" + $s)))
                         | {number, state, branch: .headRefName}') || exit 1
  else
    HITS=$(bb_pr_search "source.branch.name ~ \"$STEM\"") || { echo "HALT: Bitbucket PR search failed"; exit 1; }
    CANDIDATES=$(printf '%s\n' "$HITS" | jq -c --arg s "$STEM" 'select(.branch == $s or (.branch | endswith("/" + $s)))') || exit 1
  fi
  [ -z "$CANDIDATES" ] || RUNG="branch stem"
fi

# Rung 4 — key search (candidates only) or closing PR (GitHub VCS only).
if [ -z "$CANDIDATES" ]; then
  case "$KIND:$VCS" in
    jira:github)
      ALL=$(gh pr list --state all --limit 100 --search "$JIRA_KEY in:title,body" --json number,title,state,headRefName) \
        || { echo "HALT: gh pr list --search failed"; exit 1; }
      CANDIDATES=$(printf '%s\n' "$ALL" | jq -c '.[] | {number, state, title, branch: .headRefName}') || exit 1
      RUNG="key search" ;;
    jira:bitbucket)
      CANDIDATES=$(bb_pr_search "title ~ \"$JIRA_KEY\" OR description ~ \"$JIRA_KEY\"") \
        || { echo "HALT: Bitbucket PR search failed"; exit 1; }
      RUNG="key search" ;;
    github-issue:github)
      # Lists only PRs that use a closing keyword (`Closes #N`).
      REFS=$(gh issue view "$ISSUE_NUM" --json closedByPullRequestsReferences) || { echo "HALT: gh issue view failed"; exit 1; }
      CANDIDATES=$(printf '%s\n' "$REFS" | jq -c '.closedByPullRequestsReferences[] | {number, url}') || exit 1
      RUNG="closing PR" ;;
    github-issue:bitbucket)
      RUNG="closing PR skipped — GitHub-only" ;;
  esac
fi

printf 'RUNG=%s\n' "${RUNG:-none}"
[ -z "$CANDIDATES" ] || printf '%s\n' "$CANDIDATES"
```

A closing reference is a link the PR's author declared, not a text match, so it goes through the
selection rules below like rungs 2–3. It carries no state: one reference → use it; several → the
**several** row.

**GitHub issue with `VCS=bitbucket`: rungs 1–3 only.** Rung 4's `closedByPullRequestsReferences` is a
GitHub PR field; a Bitbucket repo has no such link. Skip it, and when nothing resolves, the HALT names
rung 4 as **skipped — GitHub-only**, so the gap is not mistaken for a search that found nothing.

**Selection** — applied to the PRs a rung returns:

| PRs found | Outcome |
| --- | --- |
| exactly one open PR | use it |
| none open, exactly one merged (or declined) | use it — **merged PRs are allowed**; Step 4's diff fallback already supports them |
| several open, or several and none open | **several**: list them (number, state, branch, title) and ask (interactive), or **halt with the list** (non-interactive — a pipeline or `claude -p` run). A wrong pick yields a confident review of the wrong change |
| zero | next rung |

`pr_number:` (rung 2) names one PR by construction and is used whatever its state. The PR chosen here
binds `PR`, and Step 1b resolves it like any other PR number.

#### Step 1b — Resolve the PR

**GitHub** (`VCS=github`):

```bash
# "${PR:-$BRANCH}", never "${PR:-}". An EMPTY argument makes `gh pr view` resolve the
# CURRENT branch's PR, so `/review-pr some-other-branch` would silently review the wrong
# PR instead of erroring. Verified: `gh pr view "" --json number` returns the current
# branch's PR number.
gh pr view "${PR:-$BRANCH}" --json number,url,title,body,state,isDraft,headRefName,baseRefName,\
author,additions,deletions,changedFiles,files,reviewDecision,statusCheckRollup,headRepositoryOwner
```

**Bitbucket** (`VCS=bitbucket`) — by id, or by source branch:

```bash
curl -sf "${BB_CURL_AUTH[@]}" "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR}"

ENCODED_BRANCH=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$BRANCH")
curl -sf "${BB_CURL_AUTH[@]}" \
  "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests?q=source.branch.name%3D%22${ENCODED_BRANCH}%22+AND+state%3D%22OPEN%22"
```

Bind `PR_NUMBER`, `PR_URL`, `PR_TITLE`, `PR_BODY`, `HEAD_BRANCH`, `BASE_BRANCH`, `PR_STATE`.

**A bare number that is an issue (GitHub only).** When `KIND=pr` came from a bare number (no
`TARGET_HOST`) and `gh pr view` fails, run `gh issue view "$PR" --json number`. The PR error for an
issue number is identical to the one for a number that does not exist
(`GraphQL: Could not resolve to a PullRequest…`), so only the issue call tells them apart. If it
succeeds, set `KIND=github-issue ISSUE_NUM=$PR PR=""`, run Step 1a, and record
`resolved_via: github issue (bare number) → <rung>`.

No PR resolves → **HALT**: `"No pull request found for {target}. Open one with /create-pr, or pass a PR number."`

### Step 2 — Resolve the work item

A first-hit-wins cascade. Record which rung matched as `resolved_via` and print it in the report — provenance is what lets a human catch a wrong anchor.

**When Step 1a resolved the document, this cascade is skipped.** `DOC_FILE` is already bound and
`resolved_via` carries the card route — `jira key → pr_number`, `jira key → branch stem`,
`jira key → key search (confirmed)`, `jira key → branch fallback`, `github issue → pr_number`,
`github issue → branch stem`, `github issue → closing PR`. When Step 1a found a PR but no document
(rung 4 or 5), run the cascade from that PR as usual.

Run the **docs guard** (Step 1a) before the cascade. `DOCS=absent` skips rungs 1–4, which all read
`docs/`, and continues at rung 5/6.

| # | Rung | Mechanism |
| --- | --- | --- |
| 1 | **branch stem** | strip `feature/` \| `bugfix/` \| `hotfix/` → `STEM` → `find docs -type f -path "*/${STEM}/${STEM}.md"`, else `find docs -type f -name "${STEM}.md"` |
| 2 | `pr_number` | [§0a Key → document lookup](references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup) with `KEY_FIELD=pr_number KEY_VALUE=$PR_NUMBER` → `DOC_FILE=$LOCAL_PATH` |
| 3 | gate `pr:` | `grep -rl --include='*.gate.*.yml' -- "$PR_URL" docs/` → its sibling work item |
| 4 | tracker issue | PR body `#{N}` **or** `[A-Z]+-[0-9]+` → `github_issue:` / `jira_key:` frontmatter grep |
| 5 | Explore | bounded read-only subagent fallback |
| 6 | none | degrade to a **code-only** review, stated loudly |

> **Two shell traps this table deliberately avoids.** `docs/**/…` needs `shopt -s globstar`, which is
> off by default — without it bash expands `**` as a single level and the gate glob matches **nothing**,
> silently. And an unanchored `pr_number: ${PR_NUMBER}` is a prefix match: reviewing PR 28 would resolve
> to a document whose frontmatter reads `pr_number: 281`, anchoring the entire review on the wrong work
> item. Both fail quietly, which is the worst shape for a resolver whose job is to be right about
> *which document this is*. Rung 2 gets its anchoring from §0a, below.

Rung 1 handles `task.{N}.*`, `story.{E}.{S}.*`, `epic.{N}.*` and `bug.{N}.*`. Rungs 4–5 reuse the cascade already documented in [`references/develop-pipeline-step-0-resolve-and-prepare.md`](references/develop-pipeline-step-0-resolve-and-prepare.md) § 0a — do not reinvent it. Rungs 2 and 4 **are** [§0a Key → document lookup](references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup) — rung 2 with `KEY_FIELD=pr_number`, rung 4 with the key or number the PR body names: anchored, quote-tolerant, the work-item rule applied, and a HALT on several matches. Rung 2 was a bare `grep` before task.177, so a review of PR 290 anchored on `bug.3.dod.1…md`, the one file carrying `pr_number: 290` — a DoD summary, not the bug.

**Rung 4 must match both shapes.** A Bitbucket PR description carries `PROJ-123`, never `#{N}`; matching only the GitHub shape makes this rung dead on exactly the Bitbucket + Jira combination the skill exists to support.

**Exclusion filter** — find the work item, not its artifacts. The rule is stated once, in
[§0a Key → document lookup](references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup),
and every rung here applies it: a file named after its own directory (`{stem}/{stem}.md`) is the
work item; otherwise a basename carrying any of these kind segments is an artifact:

```
.qa.  .gate.  .bug.  .implementation.  .review.  .dod.  .plan.  .handover.  .pr-review.  .request.
sprint-review-summary.md
```

`sprint-review-summary.md` is matched by name, since it has no dotted kind segment; `/finalise`
writes it beside every accepted work item with the item's key. `.request.` is there because a `{kind}.{N}.request.{n}.*.md` carries the same `jira_key` as its work
item, so without it a key lookup returns two files and the work item is ambiguous.

Story documents are **not** in `docs/stories/`. They nest under `${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/`. Glob across `docs/`; never assume one root.

### Step 3 — Collect the paper trail

```bash
D=$(dirname "$DOC_FILE")

# `find`, NOT a multi-glob `ls`. Under zsh — the macOS default shell — a glob that
# matches nothing aborts the ENTIRE command ("no matches found"), so one absent
# artifact kind silently suppresses every kind that IS present. Verified: a task
# directory with no *.bug.*.md returned 0 files under zsh and 7 under bash.
# A trail check that reports a complete trail as absent is the worst failure this
# skill can have, and it fails on the default shell.
for pat in '*.implementation.*.md' '*.qa.*.md' '*.gate.*.yml' '*.dod.*.md' \
           '*sprint-review-summary.md' '*.bug.*.md' '*.handover.*.md'; do
  find "$D" -maxdepth 1 -name "$pat" 2>/dev/null
done

# Review reports, EXCLUDING this skill's own prior output.
# `*.review.*.md` also matches `*.pr-review.*.md` — without the filter a
# re-review collects its own previous report as the pre-implementation review.
find "$D" -maxdepth 1 -name '*.review.*.md' 2>/dev/null | grep -v '\.pr-review\.'

# This skill's own prior reports, for the {n} increment in Step 7.
find "$D" -maxdepth 1 -name '*.pr-review.*.md' 2>/dev/null
```

> **Every shell snippet in this skill must behave identically under bash and zsh.** macOS defaults to
> zsh; a snippet that only works under bash fails for most users, and unmatched globs fail *silently*
> in the direction of "nothing is there".

**Glob on the artifact segment; never reconstruct an exact filename.** The trailing slug is free descriptive text — `task.53.implementation.1.jira-rest-interception-initial-run.md` does not repeat the work-item slug. The sprint-review file is unprefixed in task directories and prefixed in some story directories, so glob `*sprint-review-summary.md`.

Read the **highest-numbered** gate for `gate:`, `quality_score`, `top_issues`, `waiver`; the DoD header block; and the implementation report's Pipeline Progress table. The same verification predicates the pipeline uses to confirm a completed run apply here: a gate
that reached 5c (the QA loop's §5c accepting-route set — read from the last QA cycle entry's `**Action**: Proceeding to 5c` row, not from the gate token), a DoD file present once the document says `accepted`. (In this
repo they are written up in `docs/reference/pipeline-artifacts.md`; that is a repo document, not
a bundled skill reference, so it is named rather than linked.)

### Step 3b — Tracker context (read-only, non-blocking)

| `TRACKER` | Call |
| --- | --- |
| `github` | `gh issue view "$N" --json title,state,labels,milestone` |
| `jira` | `GET ${JIRA_URL}/rest/api/2/issue/{jira_key}?fields=summary,status,issuetype,priority`, Basic auth (`JIRA_USER_EMAIL`:`JIRA_API_TOKEN`, base64) |

Only `status`/`state` and the title are consumed — enough to check the tracker agrees with the document and the PR. The Atlassian MCP `getJiraIssue` is the fallback when no credential resolves. Any failure here is logged and non-blocking; the review continues without tracker context.

### Step 4 — Build the diff

Git is the common denominator, so **one path serves both platforms** — no host API needed:

```bash
DIFF_FILE="$(mktemp -t review-pr.XXXXXX.patch)"   # scratch, never the repo
if git fetch -q origin "$BASE_BRANCH" "$HEAD_BRANCH" 2>/dev/null \
   && git diff "origin/$BASE_BRANCH...origin/$HEAD_BRANCH" > "$DIFF_FILE" \
   && [ -s "$DIFF_FILE" ]; then
  : # git path succeeded
else
  USE_API_DIFF=1                                   # fall through to the API fallback below
fi
```

**Check the exit status.** A merged PR normally has its head branch deleted, so `git fetch` fails and
the diff comes back empty — which an unchecked path reports as "no changes to review". That silently
breaks the *"audit a merged PR after the fact"* case this skill explicitly supports.

**Cross-fork PRs**: `origin/$HEAD_BRANCH` also does not exist when the head is a fork branch. Detect that up front (`headRepositoryOwner` ≠ the base repo owner) and set `USE_API_DIFF=1` without attempting the fetch at all. Either route — cross-fork, or any fetch/diff failure above — lands here:

```bash
gh pr diff "$PR_NUMBER" > "$DIFF_FILE"                                          # GitHub

# -L is required: the Bitbucket /diff endpoint REDIRECTS to the rendered diff, and
# `curl -sf` without it exits 0 having written an empty file — on exactly the merged
# and cross-fork paths this fallback exists to serve.
curl -sfL "${BB_CURL_AUTH[@]}" \
  "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/diff" > "$DIFF_FILE"   # Bitbucket

[ -s "$DIFF_FILE" ] || { echo "Diff fallback produced an empty patch — cannot review."; exit 1; }
```

**Exclude auto-generated files before dispatching.** A skill change carries its bundled
`references/` copies — byte-identical to `shared/resources/` and headed `AUTO-GENERATED — DO NOT
EDIT`. On this repo's own PR they were 30 of 55 files and ~23,000 of 24,253 lines. Reviewing them is
pure noise and crowds out real findings:

```bash
git diff "origin/$BASE_BRANCH...origin/$HEAD_BRANCH" -- . ':(exclude)*/references/*' > "$DIFF_FILE"
```

Widen the exclusion to whatever the repo generates (lockfiles, `dist/`, snapshots). State in the
report which paths were excluded, so the review's scope is auditable.

**Check the exclusion against authorial intent before applying it.** The rule is a heuristic about
*intent* ("the author did not write these") applied by *path*, and it inverts when the PR's subject
is the generated tree itself — on the PR that introduced bundle-freshness checking, one `references/`
file was the headline finding, not noise. Mechanically: list what the exclusion would remove, and if
any excluded path is also named in the work item's Files Summary, the PR body, or a commit-message
subject, **review it** — a generated file nobody mentions is noise; one the author wrote a commit
message about is a deliberate change. Record the deviation in the same scope note that records the
default. (obs #33)

Empty diff → say so and stop.

### Step 5 — Dispatch both lenses in parallel

One message, two `Agent` calls, both `subagent_type="Explore"`, both read-only. Never read the raw diff into main context.

**Mark the wait on the pipeline lock** beside the dispatch and clear it once both lenses have returned — `bash .agents/skills/review-pr/references/set-waiting-on.sh "5c review-pr lenses"`, then `… --clear` (source: `references/set-waiting-on.sh`). Inside a `/develop-*` pipeline this is Step 5c, and a turn yielded while the lenses run is a wait the Stop hook would otherwise re-prompt as a stall (task.124, obs #89); standalone there is no lock and both calls are silent no-ops.

**Lens A — code** (skip under `--no-code`): pass the **Prompt Template** from [`references/code-review-prompt.md`](references/code-review-prompt.md) verbatim, substituting `<DIFF_FILE>` and `<WORKING_DIR>`. Do not paraphrase it inline — it is shared with `/qa-story` and `/qa-task`, and paraphrasing forks it. Returns `code_review:`.

**Lens B — conformance** (skip under `--no-docs`): pass the **Prompt Template** from [`references/pr-conformance-prompt.md`](references/pr-conformance-prompt.md) verbatim, substituting `<DOC_FILE>`, `<ARTIFACTS>`, `<DIFF_FILE>`, `<TRACKER_SNAPSHOT>`, `<PR_STATE>` and `<WORKING_DIR>`. Returns `pr_conformance:`.

Fold the resolved `--effort` into both dispatches. Parse both blocks; do not invent or augment findings.

The caller resolves the work item and artifact list **before** dispatching and passes them in. Lens B never runs the cascade itself — a subagent that chose its own anchor could silently review against the wrong document, with no provenance to catch it.

### Step 6 — Render findings and compute the verdict

The two schemas are deliberately parallel (`id` / `category` / `severity` / `confidence` / `finding` / `suggested_action`), so one rendering path serves both:

```
[PC-1] coverage · high · confidence: high — AC-3
  what is wrong
  → suggested action

[CR-1] bug · high · confidence: high — src/x/y.ts:42
  what is wrong
  → suggested action
```

Conformance findings first (they judge whether the change is the right change), then code findings. Within each, sort by severity. If `truncated_count > 0`, note the omitted count.

**The location field is the one place the two schemas are *not* parallel, and it must be normalised.**
The list above omits it, which is exactly how the discrepancy stays invisible: `pr_conformance` emits
**`ref:`** (a criterion id, artifact path, frontmatter field, or `path:line`), while `code_review`
emits **`file_line:`** (always `path:line`). Both render into the same trailing `— {ref}` position
above, and both are written as **`ref`** in the structured block Step 7 emits — a `CR-*` entry's `ref`
is its subagent `file_line` verbatim.

Carrying `file_line` through for code findings would re-create, one layer down, the very
parse-by-position problem the structured block exists to remove: a consumer would again have to test
which key is present before it could read a location.

**Deterministic verdict — advisory only:**

| Condition | Verdict |
| --- | --- |
| any finding with `severity: high` **and** `confidence: high` | 🚨 **REQUEST CHANGES** |
| any remaining finding with `severity: high` **or** `severity: medium` (at any confidence) | ⚠️ **CONCERNS** |
| otherwise (only `severity: low` findings, or none) | ✅ **APPROVE** |

**Name the field in every row.** An earlier draft's middle row read only "any `medium`", which left a
`severity: high` + `confidence: medium` bug matching no row at all — and falling through to APPROVE.
A verdict table that silently approves a high-severity finding is worse than no table.

**This table is normative.** `pr-conformance-prompt.md` points here rather than restating it — two
copies of a decision table drift, and a verdict rule that differs between two files in the same change
means "follows the deterministic table exactly" has no single table to follow.

Never call `gh pr review --approve`. Never write a gate `.yml`.

### Step 7 — Write the review report

Co-located with the work item, using the `.pr-review.{n}.` artifact kind:

```
docs/tasks/task.65.registry-aware-selection/task.65.pr-review.1.registry-aware-selection.md
{story-dir}/story.2.1.pr-review.1.capture-prd-as-worked-example.md
```

`{n}` starts at 1 and increments on re-review — the convention `finalise` uses for `.dod.{n}.`.

**No work item resolved → write no file.** Render the code findings to the terminal and say plainly that the review is unanchored. Report artifacts are co-located with the work item that led to the PR; with nothing to co-locate against there is no sanctioned location, and inventing one would add a directory no standard names.

ALWAYS use this exact template structure:

````markdown
# PR Review Report: PR #{number} — {title}

**Reviewed:** {YYYY-MM-DD}
**PR:** [#{number}]({url}) — `{head}` → `{base}` ({state})
**Work item:** [`{doc filename}`]({relative path}) — resolved via `{resolved_via}`
**Tracker:** [{issue ref}]({issue url}) — {state}
**Verdict:** {✅ APPROVE | ⚠️ CONCERNS | 🚨 REQUEST CHANGES}

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ / ❌ | {filename} |
| Review report | ✅ / ❌ | {filename} |
| QA reports | {n} | {filenames} |
| Gate | {PASS/CONCERNS/FAIL/WAIVED} | {filename} ({score}) |
| DoD | ✅ / ❌ | {filename} |
| Sprint review | ✅ / ❌ | {filename} |
| Open bugs | {n} | {filenames} |
| Handover | ✅ / ❌ | {outstanding count} |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| {AC-1 text} | `{path:line}` / test name | ✅ met / ⚠️ partial / ❌ unmet |

## Conformance Findings

{rendered PC-* findings, or "None."}

## Code Review Findings

{rendered CR-* findings, or "None."}

## Machine-Readable Findings

```yaml
findings:
  # one entry per rendered finding, conformance first then code
  - id: {PC-n or CR-n, matching the rendered finding}
    category: {coverage|scope|trail|consistency for PC-*, bug|cleanup for CR-*}
    severity: {low|medium|high}
    confidence: {low|medium|high}
    ref: {the same ref rendered after the em-dash, quoted}
    finding: {one sentence: what is wrong}
    suggested_action: {one sentence: the fix approach}
truncated_count: {integer — the two lenses' counts summed}
```

## Recommended Actions

1. {highest-priority action}
````

**About the machine-readable block.** It is what `/qa-fix`'s findings ingester reads; the rendered
sections above it are for humans. Four rules, each of which has a way of going wrong:

- **One block, both lenses**, conformance entries first then code entries — the same order as the
  rendered sections, so a human diffing the two sees them line up. One block means the ingester has
  exactly one anchor to find.
- **Tag the fence `yaml`.** The rendered findings sit in untagged ``` fences; an untagged block here
  would be indistinguishable from them.
- **`ref` for both lenses**, per the normalisation rule in Step 6. A `CR-*` entry's `ref` is its
  subagent `file_line` verbatim.
- **Always emit the section, even with nothing to report** — as `findings: []` with
  `truncated_count: 0`. If a findings-free report omitted it, an absent section would mean both
  "report written before this existed" and "no findings", and the ingester's legacy fallback would
  fire on a report that had a block. A bug in emitting the block would then be indistinguishable from
  a legacy report.

`truncated_count` is the **sum** of the two lenses' counts. The rendered omitted-count note in Step 6
stays as it is — this field is the machine-readable half of the same fact, not a replacement for it.

**Check the report's links before leaving this step** (only when a file was written — with no work item resolved there is nothing to check). CI's `docs-link-check` reads every changed
`docs/**/*.md` — a PR review report as much as the document beside it — and a quoted finding that contains a
bracket-paren shape renders as a live link (task.139 run 2 went red on two QA reports; task.152,
obs #155). The engine resolves against the git index, so a sibling this run wrote reads as dead
until it is staged — stage first:

```bash
git add "{work-item-dir}/{prefix}.pr-review.{n}.{name}.md"
node .agents/skills/review-pr/references/doc-links.js --file "{work-item-dir}/{prefix}.pr-review.{n}.{name}.md"
```

Exit 1 → fix the quotation (put it in a fence, or break the `[..](..)` shape so it no longer reads
as a link) and re-run until it exits 0. Exit 2 is a usage error: fix the call. `git add` only
stages — the pipeline commits these files next anyway, and staging is reversible.

### Step 8 — `--comment` (optional)

**One** summary comment, idempotent via the marker `<!-- agent-skills-pr-review -->`, using the find-by-marker → edit-by-id → else-create recipe from `finalise` — the only dual-platform idempotent PR comment in this repo.

First build the body file — every command below reads it, and none of them creates it:

```bash
# The lead goes BELOW the marker — see the warning under this block. `in-review`
# is the same stage the tracker comment for this moment uses; one vocabulary.
LEAD=$(node references/stakeholder-summary-cli.js --stage in-review) || exit 1

BODY_FILE="$(mktemp -t review-pr-comment.XXXXXX.md)"
{
  printf '%s\n\n' '<!-- agent-skills-pr-review -->'
  printf '%s\n\n---\n\n' "$LEAD"
  cat "$REPORT_FILE"            # or the rendered summary when no report was written
} > "$BODY_FILE"
```

> **The marker stays on the first line, and that is what keeps this comment idempotent.** Both arms
> below find an existing comment with `startswith("<!-- agent-skills-pr-review -->")` and then edit
> it by id. A lead inserted *above* the marker makes that search miss, so a re-run posts a **new**
> comment instead of updating the old one — visible as duplicate comments, which reads as a
> formatting problem rather than a bug, and never fails. `$BODY_FILE` is built once here and read by
> the GitHub PATCH path, the GitHub POST path and both Bitbucket paths, so the lead reaches the
> **update** path as well as the create path. That is the half that is easy to miss.

**GitHub:**

```bash
EXISTING_COMMENT_ID=$(gh pr view "$PR_URL" --json comments \
  -q '.comments[] | select(.body | startswith("<!-- agent-skills-pr-review -->")) | .url' \
  2>/dev/null | head -1 | grep -oE '[0-9]+$')

if [ -n "$EXISTING_COMMENT_ID" ]; then
  OWNER=$(gh repo view --json owner -q '.owner.login')
  REPO_NAME=$(gh repo view --json name -q '.name')
  tracker_call_with_retry gh api -X PATCH \
    "/repos/${OWNER}/${REPO_NAME}/issues/comments/${EXISTING_COMMENT_ID}" \
    -F "body=@${BODY_FILE}" >/dev/null \
    && echo "✅ PR review comment updated" || echo "⚠️ PR comment edit failed — non-blocking"
else
  tracker_call_with_retry gh pr comment "$PR_URL" --body-file "$BODY_FILE" \
    && echo "✅ PR review comment posted" || echo "⚠️ PR comment failed — non-blocking"
fi
```

**Bitbucket:**

```bash
# pagelen=100 — Bitbucket pages comments, and scanning only the first page means a busy
# PR never finds the marker and posts a duplicate, defeating the idempotency this exists for.
EXISTING_COMMENT_ID=$(curl -sf "${BB_CURL_AUTH[@]}" \
  "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments?pagelen=100" \
  | jq -r '.values[] | select(.content.raw | startswith("<!-- agent-skills-pr-review -->")) | .id' | head -1)

BB_PAYLOAD=$(jq -n --arg raw "$(cat "$BODY_FILE")" '{content: {raw: $raw}}')
if [ -n "$EXISTING_COMMENT_ID" ]; then
  curl -sf -X PUT "${BB_CURL_AUTH[@]}" -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments/${EXISTING_COMMENT_ID}" \
    -d "$BB_PAYLOAD" >/dev/null
else
  curl -sf -X POST "${BB_CURL_AUTH[@]}" -H "Content-Type: application/json" \
    "${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/${PR_NUMBER}/comments" \
    -d "$BB_PAYLOAD" >/dev/null
fi
```

Always `--body-file` / a file-sourced payload, never an inline body: bodies carry backticks, `$(…)` and newlines.

The GitHub path goes through `tracker_call_with_retry`, inheriting 3× exponential backoff **and** the `ACCESS_TRACKER` deferral gate for free. The Bitbucket path is single-shot — the missing Bitbucket retry helper is a known gap `qa-fix` already documents.

Commenting never gates. Never post over an `unverifiable` reason.

#### `--inline` — findings beside the lines they are about

The summary comment above stays the default and is always posted. `--inline` adds a second delivery:
each finding that carries a `file_line` is also posted as an inline comment anchored to that line, via
the shared primitive. It resolves `$VCS` itself, so this step does not branch:

```bash
# Findings from both lenses, reshaped into the CLI's input contract.
# `.code_review.findings[]`, NOT `.code_review[]` — the latter iterates the
# WRAPPER's values (`reviewed`, the findings array, `truncated_count`), so
# `select(.file_line != null)` indexes a string and jq aborts outright.
# `.finding` is the schema's key; there is no `.summary`.
# Two lenses, two different anchor keys. `code_review` findings carry
# `file_line`; `pr_conformance` findings carry `ref`, which is a criterion id, a
# frontmatter field, an artifact path OR a `path:line` — only the last form can
# be anchored. Both are normalised and then filtered by SHAPE, so a `ref` of
# "AC-3" is excluded rather than aborting the program. jq is all-or-nothing
# inside `[ … ]`: one malformed entry would otherwise empty the file and drop
# every finding. Conformance findings that cannot anchor stay in the summary
# comment, which is posted regardless.
jq '[ (.code_review.findings[]? | . + {anchor: .file_line}),
      (.pr_conformance.findings[]? | . + {anchor: .ref})
      | select((.anchor? // "") | test("^.+:[0-9]+$"))
      | {path: (.anchor | split(":")[0]),
         line: (.anchor | split(":")[1] | tonumber),
         body: (.finding
                + (if .suggested_action then "\n\n→ " + .suggested_action else "" end))} ]' \
   "$FINDINGS_JSON" > "$INLINE_FILE" || {
  echo "findings JSON did not match the schema — not posting inline"; exit 1; }

node .agents/skills/review-pr/references/pr-inline-comment.js \
  --pr "$PR_NUMBER" --findings-file "$INLINE_FILE" \
  --summary-file "$BODY_FILE" --json
```

**Anchoring failure degrades; it never drops a finding.** A line outside the diff hunk is rejected —
routinely, since a finding about an unchanged function whose caller moved has no line to attach to —
and that finding is appended to the summary comment instead, reporting `anchor-failed` rather than
`posted`. Read the per-finding `reason`s, not just the top-level one: a run reporting `partial` has
delivered everything, just not all of it inline.

Full contract, the `reason` vocabulary and the marker-plus-update-in-place re-run rule:
[`references/pr-inline-comment-contract.md`](references/pr-inline-comment-contract.md).

### Step 9 — Cleanup

```bash
rm -f "$DIFF_FILE" "$BODY_FILE"
```

## Customization

Both lenses are shared prompts. Customise them at their **source** under the repo's `shared/resources/` directory — **not** the bundled `references/` copies beside this skill, which carry an `AUTO-GENERATED — DO NOT EDIT` header and are overwritten by the bundler:

- `code-review-prompt.md` — shared with `/review-code`, `/qa-story`, `/qa-task`. An edit here changes all four skills.
- `pr-conformance-prompt.md` — used only by this skill today.

After editing, run `npm run bundle`.

## Relationship to Other Skills

- **`/review-code`** — reviews a diff with no work item and can `--fix`. Use it when there is nothing to conform to.
- **`/review-task`, `/review-story`** — review the document *before* implementation. `/review-pr` reviews the change *after*.
- **`/qa-task`, `/qa-story`** — the gating QA pass over a tracked work item. `/review-pr` is advisory and writes no gate.
- **`/finalise`** — verifies the DoD and marks work accepted. `/review-pr` reads the DoD it produced; it never writes one.

## Relationship to the develop pipelines

`/develop-story` and `/develop-task` **do** call `/review-pr`, as **Step 5c** — the exit gate of
their Steps 5–6 QA loop. It runs once a QA gate reaches it by any of §5c's five routes — the cycle entry's `**Action**` row reads `Proceeding to 5c` — and nothing leaves that
loop without passing through it. The full routing lives in the pipelines' Steps 5–6 QA loop step
file, §5c — deliberately not linked by path, because the bundler follows such a reference and would
copy that file and its transitive dependencies into this skill, which does not need them to run.
(`/develop-bug` does not call this skill — it runs its own verify loop.)

**Only the conformance lens is new value there.** Those pipelines' QA step already runs the code
reviewer every cycle with `code_review_blocking=true`, so 5c's code lens is duplication. Its
conformance lens is not duplicated anywhere: whether the diff *covers* what the work item promised,
whether it drifted outside that *scope*, whether the artifact *trail* is complete and honest, and
whether the work item is *consistent* with what shipped. That gap is why the wiring exists.

**Being consulted by a pipeline is not the same as gating one, and this skill still does not gate.**
The distinction is the whole reason the wiring is legitimate:

- `/review-pr` **reports** a verdict. It writes no gate `.yml`, never submits a formal GitHub
  review, and never edits code — exactly as before.
- The **orchestrator** acts on that verdict: `REQUEST CHANGES` sends the run back to `/qa-fix` on
  the shared 5-cycle budget; `CONCERNS` records findings without blocking; `APPROVE` exits to
  Step 7.

Gate files remain the exclusive output of `/qa-story` and `/qa-task`.

Invoking it by hand is unchanged and still worthwhile — someone opening a finished PR and asking
whether to merge it is the same question, asked outside a pipeline run.
