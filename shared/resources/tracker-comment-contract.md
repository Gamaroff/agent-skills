---
name: tracker-comment-contract
description: How every pipeline step and skill posts a comment to a tracker issue — the one tracker-comment.js call, its reason vocabulary, and the single circumstance under which the Atlassian MCP fallback is permitted. Referenced by every comment site rather than repeated at each one.
---

# Posting a comment to a tracker issue

> **This is the primary path. There is no other one.** Before task 55, every Jira
> comment in this repository was an `addCommentToJiraIssue` MCP call an agent
> made by following prose, and every GitHub issue comment was a bare
> `gh issue comment`. Neither could be intercepted, retried by code, or made
> idempotent, because interception needs a chokepoint and prose has none.

## The call

One call covers both trackers — `tracker-comment.js` resolves `TRACKER` itself,
so a step doc never branches on it for a comment:

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
{the markdown body}
EOF

node .agents/skills/{skill}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage {moment} --json
```

**Always `--body-file`, never an inline `--body` string.** Comment bodies carry
backticks, `$(…)`, quotes and newlines; an interpolated body is a shell
injection waiting for the first comment that contains one. The file also means
the body reaches the deferred-mutation record through `command.stdin`, which is
what makes two different comments on the same issue hash to two different
records instead of collapsing into one.

**`--stage` is the comment's identity**, not a board column. It is what builds
the idempotency marker, so a resumed pipeline does not comment twice. Omit it
only for a comment that genuinely should be posted every time.

> `--stage` here is deliberately **not** read from `pipeline:` in
> `tracker-workflow.yaml`. That block decides which column a card moves to, and
> an omitted moment there means "do not move the card" — it does not mean "do
> not say anything". A project whose board has no review column still wants the
> PR-opened comment. There is therefore no `stage-disabled` reason on this CLI.

## Reading `reason`

| `reason` | Means | Do |
|---|---|---|
| `posted` | The comment was created | Nothing |
| `already` | Exactly one marker match — this moment was already commented | Nothing. This is a resume, not a failure |
| `deferred` | `access.tracker` is not `full`; recorded for the handover | Nothing — the record **is** the deliverable |
| `unverifiable` | 2+ marker matches, or the comment list could not be read | Log in the Issues Log and continue. **Never post anyway** |
| `no-credentials` | No usable auth | The one case where the MCP fallback applies — below |

Exit codes match `jira-stage.js` and `gh-stage.js` exactly: `0` for every
outcome above, `1` for a skip but only under `--strict`, `2` for a usage error
(missing `--issue`, missing or empty `--body-file`, unknown flag). A comment
failure must never kill a pipeline run, which is why almost everything exits 0.

### Why `unverifiable` is not `already`

Two marker matches means something posted twice. Resolving that by adopting the
first — which is what `| head -1` does in the older PR-comment convention — is
how the duplicate becomes invisible and stays that way. The CLI reports the
count and refuses to choose. Treat it as a signal that something upstream ran
twice, not as noise.

`unverifiable` is a **reason**; it is unrelated to the deferred record's
`satisfied` **boolean**, which means "already correct, collapse me in the
renderer". An ambiguous match sets `reason: "unverifiable"` and leaves
`satisfied` false — the point being precisely that nothing could be verified.

## The MCP fallback — `no-credentials` only

When `TRACKER=jira` **and** the CLI reported `reason: "no-credentials"`, and only
then, call the Atlassian MCP tool:

- `addCommentToJiraIssue` with `cloudId` (the hostname from `JIRA_URL`),
  `issueIdOrKey: {TRACKER_ISSUE}`, the same `commentBody`, and
  `contentFormat: "markdown"`.
- If a call fails with a cloud resolution error, call
  `getAccessibleAtlassianResources` and use the `id` from the matching entry.
- On failure: log a warning and continue. Comments are non-blocking.

**Do not run both paths.** The CLI is authoritative whenever credentials exist.
This mirrors the fallback `jira-stage.js` already established for transitions,
and it exists for the same reason: a rule enforced only by prose fails silently,
and this repository has written down twice why that is the failure mode to
design out rather than to police.

Any other MCP comment call — one not reached through a `no-credentials` branch —
is a regression. `evals/shared/tests/transition-protocol-parity.test.mjs`
enforces this: an `addCommentToJiraIssue` mention in shipped prose is only legal
when the literal `no-credentials` appears in the lines just above it.
