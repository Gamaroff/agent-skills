---
id: task.7.plan
title: "Implementation Plan: skills-config tracker/vcs flags"
type: plan
task-ref: task.7.skills-config-tracker-vcs-flags.md
---

# Implementation Plan: skills-config tracker/vcs flags

> Requirements and success criteria: [task.7.skills-config-tracker-vcs-flags.md](task.7.skills-config-tracker-vcs-flags.md)

## Overview

Document the existing implicit platform-detection convention as explicit config keys with `auto` defaults that preserve current behavior. Pure docs/config change — no runtime migration in this task.

## Phase-by-Phase Implementation Guide

### Phase 1: Patch `skills-config.sample.yaml`

Insert near the top, with comments:

```yaml
# Platform routing — controls which tracker and VCS surfaces skills target.
# `auto` (default) preserves implicit detection: tracker uses JIRA_URL env var,
# vcs uses git remote URL parsing. Set explicitly to override (useful for mirror
# repos, migrations, or projects with both surfaces).
tracker: auto   # auto | jira | github
vcs: auto       # auto | bitbucket | github
```

Place this block before the existing `qa:`, `prd:`, `architecture:` sections — platform routing is foundational.

### Phase 2: CLAUDE.md update

Add a new subsection under "Configuration":

```markdown
### Platform Detection

Skills that interact with remote trackers or PRs use this resolver order to
pick the platform:

1. **`skills-config.yaml`**: explicit `tracker:` and `vcs:` keys (values:
   `jira | github`, `bitbucket | github`).
2. **Env vars**: `JIRA_URL` set → tracker is Jira; otherwise GitHub.
3. **Git remote**: `bitbucket.org` in `origin` → vcs is Bitbucket;
   `github.com` → vcs is GitHub.
4. **Default**: GitHub for both.

Skills that currently honor the resolver:
- `create-pr`, `create-task`, `finalise`, `review-story` — full dual-path
- `qa-fix`, `ensure-epic-jira-issue`, `create-epic` — see tasks 3, 5, 6
  (in progress)

Skills that are platform-agnostic (no resolver needed):
- `create-branch`, `commit-changes`, `create-story` (docs-only),
  `qa-review`, `qa-gate`
```

### Phase 3: Optional canonical spec

Create `shared/resources/platform-detection.md`:

```markdown
# Platform Detection (canonical)

This file is the single source of truth for how skills determine the active
tracker and VCS platform. Skills reference this via the explicit path
`shared/resources/platform-detection.md`. At package time,
`scripts/package_skill.py` bundles this file under `references/` and rewrites
the path so installed skills are self-contained.

## Resolver

```bash
# Tracker
TRACKER=$(yq '.tracker // "auto"' skills-config.yaml 2>/dev/null || echo "auto")
if [ "$TRACKER" = "auto" ]; then
  if [ -n "$JIRA_URL" ]; then TRACKER="jira"; else TRACKER="github"; fi
fi

# VCS
VCS=$(yq '.vcs // "auto"' skills-config.yaml 2>/dev/null || echo "auto")
if [ "$VCS" = "auto" ]; then
  REMOTE_URL=$(git remote get-url origin)
  if echo "$REMOTE_URL" | grep -qi "github\.com"; then VCS="github"
  elif echo "$REMOTE_URL" | grep -qi "bitbucket\.org"; then VCS="bitbucket"
  else VCS="github"; fi
fi
```

## Env vars

- `JIRA_URL` — Jira base URL (e.g. `https://example.atlassian.net`)
- `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — auth for REST
- `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` — auth for BB REST
- `gh` CLI — assumed authenticated for GitHub paths

## Edge cases

- Mirror repo: explicit `tracker: jira` and `vcs: bitbucket` in skills-config.yaml
- Migration in progress: explicit override during the migration window
- CI without git remote: env var-only path (`tracker: jira` env)
```

### Phase 4: Validate

```bash
python -c "import yaml; yaml.safe_load(open('skills-config.sample.yaml'))"

# If Phase 3 done, sanity-check package bundling:
# (only if a skill is updated to reference platform-detection.md — usually a follow-up)
```

## Key Patterns and References

- `shared/resources/jira-sync.js` — existing example of canonical shared resource referenced by multiple skills
- Existing implicit detection: `skills/finalise/SKILL.md` lines 312-329, `skills/create-task/SKILL.md` lines 425-509

## Testing Approach

- YAML validity check (one-line python)
- Markdown render check (visual)
- No functional regression possible — pure config additive change
