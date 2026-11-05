---
id: task.264
title: "Bitbucket remote host shapes and link-loss guard"
type: task
description: "Derive the Bitbucket repo base from every SSH and HTTPS remote shape Bitbucket serves, and stop sync-jira-* from rewriting an existing card without its Source Documents links when the base cannot be derived."
tags: [sync-jira, bitbucket, data-loss]
category: other
status: planned
priority: High
created: 2026-11-05
updated: 2026-11-05
assignee:
estimated_effort_hours: 8
---

# Bitbucket remote host shapes and link-loss guard

**Status:** Planned

> Detailed implementation guide: [task.264.plan.bitbucket-remote-host-shapes-and-link-loss-guard.md](task.264.plan.bitbucket-remote-host-shapes-and-link-loss-guard.md)

---

## 1. Overview

`getBitbucketRepoBase()` rewrites only the `git@bitbucket.org:` remote form. Every other shape Bitbucket serves returns `null`, and on a `null` base the four `sync-jira-*` scripts warn and carry on. On an update of an existing card that rewrites the description **without** its "Source Documents" links, so the links are removed from the card rather than preserved.

**Scope**: widen the base-URL derivation to the remote shapes Bitbucket serves, and make an update with an unresolvable base stop before it writes. Docs for the four sync skills say what happens when neither the env var nor the remote works.

**Key deliverables**:

1. A remote parser that accepts the shapes in § 3, with a unit test per shape.
2. A guard in `sync-jira-task`, `-story`, `-epic` and `-bug` that refuses an update when the base is `null`.
3. Updated `SKILL.md` text for the four skills.

---

## 2. Motivation

### Current Problems

1. **Most remote shapes are not recognised.** Measured by running the current rewrite over seven shapes (command in § 3): 6 of 7 return `null`, including `git@ssh.bitbucket.org:` and `ssh://git@bitbucket.org/`.
2. **A `null` base silently strips links on update.** With no base, `taskBbUrl` is `null` and the "Source Documents" block is skipped when the description is built (`skills/sync-jira-task/scripts/sync-jira-task.js:108-112`, `if (taskBbUrl) sourceLinks.push(...)` then `if (sourceLinks.length)`). The update then writes that description over the card's.
3. **The only signal is a warning that scrolls past.** `⚠️ Could not detect Bitbucket repo URL…` (`sync-jira-task.js:539-543`) is printed and the run exits 0.

Observed on a consumer repo with an `ssh.bitbucket.org` remote: a forced update printed the warning and the card afterwards held no links; the snapshot taken just before it held two. Re-running with `BITBUCKET_REPO_URL` set restored both.

### Benefits

- A card never loses its links because of how the remote is spelled.
- When the base genuinely cannot be derived, the failure is loud and happens before anything is written.
- The fallback behaviour is documented in the one place users look.

---

## 3. Technical Background

### Current behaviour

`getBitbucketRepoBase()` (`shared/resources/jira-sync.js:491`, `function getBitbucketRepoBase()`):

1. returns `BITBUCKET_REPO_URL` (trailing `/` stripped) when set;
2. else reads `git remote get-url origin` and applies `.replace(/^git@bitbucket\.org:/, "https://bitbucket.org/").replace(/\.git$/, "")` (`jira-sync.js:499-500`);
3. returns that only if it starts `https://bitbucket.org/`, else `null`.

Measured against the current rewrite (`command node -e` over `f = r => r.replace(/^git@bitbucket\.org:/,"https://bitbucket.org/").replace(/\.git$/,"")`, accept iff the result starts `https://bitbucket.org/`):

| Remote shape | Today |
| --- | --- |
| `git@bitbucket.org:w/r.git` | derives |
| `https://bitbucket.org/w/r.git` | derives |
| `git@ssh.bitbucket.org:w/r.git` | **null** |
| `https://u@bitbucket.org/w/r.git` | **null** |
| `ssh://git@bitbucket.org/w/r.git` | **null** |
| `ssh://git@ssh.bitbucket.org/w/r.git` | **null** |
| `ssh://git@altssh.bitbucket.org:443/w/r.git` | **null** |

The first four `null` rows are the handoff's list; the `altssh` row is added because `shared/resources/pr-read.sh:96` already names that spelling.

### Callers

`getBitbucketRepoBase` is called by `sync-jira-task.js:539`, `sync-jira-story.js:764`, `sync-jira-epic.js:782` and `sync-jira-bug.js:594` (`grep -rn getBitbucketRepoBase skills/sync-jira-*/scripts shared/resources/*.js`). Each warns identically when it returns `null`. Each computes `isUpdate = !!existingJiraKey` later (`sync-jira-task.js:633`, `-bug.js:742`, `-story.js:873`, `-epic.js:897`), so the guard sits after that line and before the first write.

### Existing remote parsers (second-mechanism check)

Two other parsers read remotes, and neither does this job:

- `shared/resources/pr-read.sh:96` (`bb_path=$(… sed -E …)`) extracts `workspace/repo` from the last two path segments, for the PR API. It is shell, takes the *configured* URL, and returns a slug rather than a browse base.
- `shared/resources/tracker-issue.js:~415-445` parses a *GitHub* slug and deliberately rejects other hosts.

The new parser **sits beside** both: it is the JS entry the sync scripts already import, it returns a browse base for `buildBitbucketUrl`, and folding it into the shell parser would put a subprocess in a pure function. It follows `tracker-issue.js`'s rule that the host match is **exact**, never a substring or a `.endsWith` guess, because a plausible-but-wrong base is worse than `null`.

### Target behaviour

- **Parse.** A pure function takes the remote string and returns the `https://bitbucket.org/<workspace>/<repo>` base, or `null`. Accepted hosts, matched exactly: `bitbucket.org`, `ssh.bitbucket.org`, `altssh.bitbucket.org`. Accepted forms: scp-style (`git@host:ws/repo`), `ssh://[user@]host[:port]/ws/repo`, `https://[user[:token]@]host/ws/repo`. A trailing `.git` and trailing `/` are stripped, and any userinfo is dropped from the result (a base must never carry a credential into a card).
- **Guard.** On an update (`isUpdate`) with `bbBase === null`, the script exits non-zero **before** the PUT with an error naming `BITBUCKET_REPO_URL` and the remote it read. A create keeps today's warning.

**Decision: error, not keep-the-links.** Carrying the old block forward would mean parsing the previous description's ADF, and leaves stale links behind whenever a document moved. An error writes nothing, loses nothing, and tells the user the one thing to set. Creates stay a warning because a new card has no links to lose.

---

## 4. Scope

### In Scope

✅ A tested remote parser in `shared/resources/jira-sync.js`, used by `getBitbucketRepoBase`
✅ The null-base guard in the four `sync-jira-*` scripts, update path only
✅ `SKILL.md` text for the four skills (env-var table and troubleshooting row)
✅ `CHANGELOG.md` and the bundled `references/` copies via `npm run bundle`

### Out of Scope

❌ Changing any consumer's git remote
❌ The label work already shipped in v0.64.0
❌ `pr-read.sh` and `tracker-issue.js` parsers (see § 3)
❌ Bitbucket Server / Data Center hosts: the exact-host rule leaves them to `BITBUCKET_REPO_URL`

---

## 5. Breaking Changes

**Behavioural, one:** an update with an unresolvable base now exits non-zero instead of exiting 0 with the links dropped.

- **Before**: warning, exit 0, description rewritten without "Source Documents".
- **After**: error, non-zero exit, nothing written.
- **Who is affected**: a repo whose remote is not a Bitbucket shape in § 3 and which has not set `BITBUCKET_REPO_URL`. For those repos the old run was already corrupting the card.
- **Migration path**: set `BITBUCKET_REPO_URL=https://bitbucket.org/<workspace>/<repo>` in the environment the sync runs in. The error message prints this exact line with the workspace and repo read from the remote when they can be read.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.264.plan.bitbucket-remote-host-shapes-and-link-loss-guard.md](task.264.plan.bitbucket-remote-host-shapes-and-link-loss-guard.md)

### Phase 1: Remote parser — Risk: Low

Files: `shared/resources/jira-sync.js`, its test file.

- [ ] Add `parseBitbucketRemote(url)` (pure, exported) accepting the shapes in § 3 and dropping userinfo.
- [ ] Make `getBitbucketRepoBase` call it on the `origin` URL.
- [ ] One failing-first test per shape, plus: unknown host, look-alike host (`bitbucket.org.evil.example`), empty string.

### Phase 2: Update guard — Risk: Medium

Depends on Phase 1. Files: the four `sync-jira-*` scripts, their tests.

- [ ] After `isUpdate` is computed, exit non-zero before any write when `isUpdate && !bbBase`; the message names `BITBUCKET_REPO_URL` and the remote.
- [ ] Keep the create-path warning unchanged.
- [ ] Honour `--dry-run`: report the same error rather than a clean plan.
- [ ] One test per script: update with a null base exits non-zero and issues no PUT.

### Phase 3: Docs and release — Risk: Low

Depends on Phases 1-2.

- [ ] Four `SKILL.md` files: env-var row says what is accepted; the troubleshooting row says an update stops and a create warns.
- [ ] `CHANGELOG.md` entry citing task 264.
- [ ] `npm run bundle`; commit the regenerated `references/` copies.

---

## 7. Files Summary

**Core**
1. ✅ `shared/resources/jira-sync.js`: parser and `getBitbucketRepoBase`
2. ✅ `skills/sync-jira-task/scripts/sync-jira-task.js`: guard
3. ✅ `skills/sync-jira-story/scripts/sync-jira-story.js`: guard
4. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js`: guard
5. ✅ `skills/sync-jira-bug/scripts/sync-jira-bug.js`: guard

**Tests**: a new `shared/resources/tests/jira-sync-bitbucket-remote.test.mjs` (parser), plus one case in each of `skills/sync-jira-{task,story,epic,bug}/tests/` (guard). Measure the existing test layout before adding files (`ls shared/resources/tests | grep jira-sync`).

**Documentation**: the four `skills/sync-jira-*/SKILL.md`, `CHANGELOG.md`.

**Generated (do not hand-edit)**: each `skills/sync-jira-*/references/jira-sync.js`, written by `npm run bundle`.

---

## 8. Testing Strategy

**Unit (parser)**: one case per shape in § 3 (7), plus unknown host, look-alike host, empty, trailing slash, credential in userinfo (must not appear in the result). Run: `CI=true ./node_modules/.bin/node --test` on the new file, or the repo's `npm test` entry for `shared/resources/tests`.

**Guard (per script)**: stub the HTTP layer already used by that script's tests, set `BITBUCKET_REPO_URL` empty and a remote that does not parse; assert non-zero exit and **no PUT recorded**. Assert behaviour, not source text.

**Regression**: with a parseable remote an update still writes the "Source Documents" block (existing tests); a create with a null base still warns and exits 0.

**Mutation proof**: revert the parser change and confirm the `ssh.bitbucket.org` case goes red; remove the guard and confirm the update-null-base case goes red in each script. Name the tests in the QA report.

---

## 9. Success Criteria

**Functional**
- [ ] Each of the seven shapes in § 3 derives `https://bitbucket.org/<ws>/<repo>`; unknown and look-alike hosts return `null`.
- [ ] An update with a null base exits non-zero and issues no write, in all four scripts.
- [ ] A create with a null base still warns and exits 0.

**Performance**
- [ ] No added subprocess or network call per sync run (the parser is pure).
- [ ] Added suite time under 2 s, recorded in the QA report.

**Code quality**
- [ ] `CI=true npm test` passes.
- [ ] `npm run validate` passes.
- [ ] Mutation proof recorded in the QA report: parser revert and guard removal each turn a named test red.

**Migration**
- [ ] `CHANGELOG.md` cites task 264.
- [ ] `npm run bundle:check` and `check:generated` are clean.
- [ ] Each of the four `SKILL.md` files states the update-stops / create-warns behaviour.

---

## 10. Risk Assessment

**High**
1. *Guard blocks a legitimate sync.*
   - Probability: Low. Impact: High (sync halts).
   - Mitigation: the error prints the exact `BITBUCKET_REPO_URL` line to set; the exact-host list covers all three hosts Bitbucket Cloud serves.
   - Rollback: revert Phase 2 only (parser stays).

**Medium**
2. *Look-alike host accepted.* Mitigation: exact host match plus a look-alike test.
3. *A credential in the remote leaks into a card.* Mitigation: userinfo dropped; test asserts the result carries none.

**Low**
4. *Bundled copies drift from the source.* Mitigation: `bundle:check` in CI.

---

## 11. Rollback Plan

**Immediate (< 1 hour)**
- Triggers: a legitimate update refused with a parseable remote; any card losing links.
- Steps: revert the release commit; run `npm run bundle`; tag a patch; tell consumers to run `setup-consumer.sh --update`.
- Validation: an update on a Bitbucket repo writes its "Source Documents" block.

**Partial (1-2 hours)**: revert Phase 2 alone, keeping the parser, if only the guard misbehaves.

**Forward fix**: a host missing from the exact list is fixed forward by adding it with a test; the interim workaround is `BITBUCKET_REPO_URL`.

---

## Stakeholder Sign-off

Sign-off is not enabled in this repository's `skills-config.yaml`; no rows are required.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-11-05 | 1.0 | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Remote parser
- [ ] Phase 2: Update guard
- [ ] Phase 3: Docs and release

QA artifacts land beside this file: `task.264.qa.[n].…md`, `task.264.gate.[n].…yml`, bugs as `task.264.bug.[N].…md`.

---

## References

- Source report: handoff note from a consumer repo, 2026-11-05, against v0.64.0.
- `shared/resources/pr-read.sh:96`: altssh slug parsing (sits beside, see § 3).
- `shared/resources/tracker-issue.js`: exact-host rule for GitHub remotes.
