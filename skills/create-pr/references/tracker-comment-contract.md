---
name: tracker-comment-contract
description: How every pipeline step and skill posts a comment to a tracker issue — the one tracker-comment.js call, its reason vocabulary, and the single circumstance under which the Atlassian MCP fallback is permitted. Referenced by every comment site rather than repeated at each one.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/tracker-comment-contract.md. Regenerate via `npm run bundle`. -->

# Posting a comment to a tracker issue

> **This is the primary path for a tracker-issue comment, and the only one on
> Jira.** Before task 55, every Jira comment in this repository was an
> `addCommentToJiraIssue` MCP call an agent made by following prose, and every
> GitHub issue comment was a bare `gh issue comment`. Neither could be
> intercepted, retried by code, or made idempotent, because interception needs a
> chokepoint and prose has none.
>
> **On GitHub the picture is not yet complete.** A number of authored prose sites
> still post with a bare `gh issue comment` — they are covered by
> `tracker_write()` for interception, but they carry no marker, so they are not
> idempotent and a resumed run comments again. Those sites were out of this
> task's scope, which targeted the MCP sites and the one stray `curl`. Do not
> read the paragraph above as "nothing else posts a comment"; read it as "nothing
> else *should*, and on Jira nothing else does."
>
> PR comments are a different concern entirely and are not covered here.

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
| `dry-run` | `--dry-run` was passed; nothing read, nothing written | Nothing |

Exit codes match `jira-stage.js` and `gh-stage.js` exactly:

| Code | When |
|---|---|
| `0` | Every reason above |
| `1` | A skip, but **only** under `--strict` — never for `already`, which is success |
| `2` | A usage error: missing `--issue`; missing, unreadable or empty `--body-file`; an unknown flag; a value-taking flag with a missing or flag-shaped value; an unknown `--stage`; a non-numeric `--issue` on GitHub; an unresolvable access mode |

A comment failure must never kill a pipeline run, which is why almost everything
exits 0. Exit 2 is reserved for the caller getting the invocation wrong — a class
the pipeline should never reach at runtime, and wants to hear about loudly if it
does.

**`--stage` is validated against a known list** (`COMMENT_STAGES`, plus a numeric
suffix for the cycle-scoped `qa-cycle` / `qa-fix`). An unlisted stage is exit 2
rather than a silently unique marker that nothing could ever deduplicate against.

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

Any other MCP comment call is a regression, and
`evals/shared/tests/transition-protocol-parity.test.mjs` enforces it as an
**absolute prohibition**: the literal `addCommentToJiraIssue` may not appear in
shipped prose at all, outside this file and `jira-transition-protocol.md`. A
bundled copy of either is exempt only when its content matches the shared source
— by content, never by filename.

That is why the fallback procedure above lives *here* and is referenced rather
than restated at each call site. The guard's first version tried to be cleverer
— it allowed a mention when the literal `no-credentials` appeared within twelve
lines above it — and that rule was **vacuous**: every rewritten site ends with a
reason table containing that literal, so the window was pre-satisfied
everywhere, and a verbatim bare MCP block re-inserted next to a reason table
produced zero offenders. A guard satisfied by the sentence documenting the
correct behaviour is worse than no guard, because it reports success. Keeping
the procedure in one place is what makes the rule enforceable.
