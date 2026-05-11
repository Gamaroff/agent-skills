# Live develop-story test with real GitHub

> **Audience:** contributors validating the develop-story pipeline end-to-end against a real Git repo and GitHub PR — outside the eval framework's fixture/smoke infrastructure.

Use this guide to exercise the full 8-step pipeline (`create-epic-branch` → `commit-changes`) with freshly authored documents, real branches, and a real pull request. It complements the hermetic evals by catching issues that only surface when the model interacts with a live project and GitHub API.

---

## When to use this

- You changed `develop-story/SKILL.md` or a sub-skill and want real-world validation before adding a replay fixture.
- You want to observe the pipeline's decision-making on a project it has never seen.
- CI smoke tests pass but you suspect a regression in PR targeting or branch naming.

For hermetic fast feedback, prefer `npm run eval:develop-story` instead.

---

## Prerequisites

| Requirement | Check |
|---|---|
| `gh` CLI authenticated | `gh auth status` |
| `ANTHROPIC_API_KEY` set | `echo $ANTHROPIC_API_KEY` |
| Node 18+ | `node --version` |
| `git` configured | `git config user.email` |
| Claude Code with skills loaded | skills listed in session sidebar |

---

## Step 1 — Create the sandbox repo

Create a throwaway public repo. Never use a production repo for this test.

```bash
gh repo create eval-sandbox --public --description "develop-story live eval sandbox"
```

Clone it and bootstrap a minimal Node.js project so the `develop` step has real code to modify:

```bash
git clone https://github.com/$(gh api user --jq .login)/eval-sandbox ~/sandbox/eval-sandbox
cd ~/sandbox/eval-sandbox

npm init -y
npm install express --save
mkdir src

cat > src/index.js << 'EOF'
const express = require('express');
const app = express();

app.listen(3000, () => console.log('listening on 3000'));

module.exports = app;
EOF

git add .
git commit -m "chore: bootstrap minimal express app"
git push origin main

# develop-story expects a `develop` branch — epic branches are cut from it
git checkout -b develop
git push -u origin develop
```

---

## Step 2 — Configure the project

Add a minimal `skills-config.yaml` so platform detection short-circuits to GitHub without scanning git remotes:

```bash
cat > skills-config.yaml << 'EOF'
tracker: github
vcs: github
EOF

git add skills-config.yaml
git commit -m "chore: add skills-config"
git push origin develop
```

Repo slug (owner/name) is derived at runtime from `gh repo view` / `git remote get-url origin` — there is no `github.repo:` key. The schema is flat (`tracker:` + `vcs:`); see [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md).

---

## Step 3 — Author PRD, epic, and story

Create the document tree. All three files are intentionally minimal — the goal is exercising the pipeline, not the content.

```bash
mkdir -p docs/prd/app/core/epics/epic.1.health-endpoint/stories/story.1.1.add-health-route
```

### PRD

```bash
cat > docs/prd/app/core/prd.app-core.md << 'EOF'
# App Core — Product Requirements Document

## Goals and Background Context

Provide a stable, observable API for the platform. Uptime monitors need a reliable probe endpoint.

## Requirements

### Functional

FR1: The API must expose a `GET /health` endpoint that returns HTTP 200.

### Non Functional

NFR1: Response time under 50 ms at p99.

## Epic List

- Epic 1: Health Endpoint — add `/health` route with tests.

## Epic Details

### Epic 1: Health Endpoint

**Stories:**
- Story 1.1: Add health route — implement `GET /health` returning `{ status: "ok" }`.
EOF
```

### Epic

```bash
cat > docs/prd/app/core/epics/epic.1.health-endpoint/epic.1.health-endpoint.md << 'EOF'
---
epic_number: 1
title: "Health Endpoint"
type: epic
domain: app
status: in-progress
priority: High
created: 2026-05-11
updated: 2026-05-11
---

# Epic 1: Health Endpoint

**Status**: In Progress

## Epic Goal

Add a `/health` endpoint to allow uptime monitors to probe service availability.

## Stories

| Story | Title | Status |
|---|---|---|
| 1.1 | Add health route | Ready for Development |
EOF
```

### Story

```bash
cat > docs/prd/app/core/epics/epic.1.health-endpoint/stories/story.1.1.add-health-route/story.1.1.add-health-route.md << 'EOF'
---
id: story.1.1.add-health-route
title: "Add health route"
status: ready-for-development
epic: epic.1.health-endpoint
---

# Story 1.1: Add health route

**Status:** Ready for Development

## Story

As a platform operator
I want `GET /health` to return `200 { status: "ok" }`
So that uptime monitors can probe the service without triggering business logic.

## Acceptance Criteria

- [ ] `GET /health` returns HTTP 200
- [ ] Response body is `{ "status": "ok" }`
- [ ] No authentication required
- [ ] A Jest test covers the happy path

## Dev Notes

- Add the route in `src/index.js` or extract to `src/routes/health.js`
- Install `jest` + `supertest` as dev dependencies for the test
- Express is already bootstrapped in `src/index.js`

## Tasks / Subtasks

- [ ] Add `/health` route handler
- [ ] Write Jest test using supertest
- [ ] Ensure route is registered before `app.listen`
EOF
```

Commit the docs:

```bash
git add docs/
git commit -m "docs: add PRD, epic, and story for health endpoint"
git push origin develop
```

---

## Step 4 — Run develop-story

Open Claude Code in `~/sandbox/eval-sandbox` and invoke:

```
/develop-story docs/prd/app/core/epics/epic.1.health-endpoint/stories/story.1.1.add-health-route/story.1.1.add-health-route.md
```

Phase 0 will ask, in order:

1. **Epic branch creation** — `Epic branch feature/epic.1.health-endpoint does not exist yet. Create it from develop?` → choose **Create epic branch from develop** (recommended default).
2. **Story branch base** — `Confirm story branch base?` → choose **feature/epic.1.health-endpoint (epic branch — recommended)**.
3. **PR target** — `Confirm PR target branch?` → choose **feature/epic.1.health-endpoint (epic branch — recommended)**.

Expected pipeline progression:

```
═══ DEVELOP-STORY PIPELINE: STEP 1/8 — CREATE-BRANCH ═══
  creates feature/epic.1.health-endpoint from develop
  creates feature/story.1.1.add-health-route from the epic branch

═══ DEVELOP-STORY PIPELINE: STEP 2/8 — REVIEW-STORY ═══

═══ DEVELOP-STORY PIPELINE: STEP 3/8 — DEVELOP ═══
  adds src/routes/health.js or inline route
  adds tests/health.test.js (Jest + supertest)

═══ DEVELOP-STORY PIPELINE: STEP 4/8 — CREATE-PR ═══
  opens PR targeting feature/epic.1.health-endpoint (NOT develop)

═══ DEVELOP-STORY PIPELINE: STEP 5/8 — QA-STORY ═══
═══ DEVELOP-STORY PIPELINE: STEP 6/8 — QA-FIX ═══   (only if QA finds issues)

═══ DEVELOP-STORY PIPELINE: STEP 7/8 — FINALISE ═══
═══ DEVELOP-STORY PIPELINE: STEP 8/8 — COMMIT-CHANGES ═══
```

---

## Step 5 — Verify metrics

Run these checks after the pipeline completes:

```bash
# Branches created correctly
git branch -a | grep -E "epic\.1|story\.1\.1"

# PR targets the epic branch (not develop)
gh pr list --repo $(gh api user --jq .login)/eval-sandbox --json number,title,baseRefName

# Implementation report present
find docs/ -name "story.1.1.implementation.*.md"

# QA report + gate present
find docs/ -name "story.1.1.qa.*.md"
find docs/ -name "story.1.1.gate.*.yml"

# DoD checklist present
find docs/ -name "story.1.1.dod.*.md"

# Lock file removed (pipeline completed cleanly)
[ ! -f .claude/state/develop-pipeline.lock ] && echo "PASS: lock cleaned up"

# No unexpected halts
[ ! -f .claude/state/develop-pipeline.last-halt.json ] && echo "PASS: no halts"

# Step durations (git commit timestamps)
git log --format="%ai %s" | head -20
```

### What to look for

| Check | Expected |
|---|---|
| Epic branch | `feature/epic.1.health-endpoint` based on `develop` |
| Story branch | `feature/story.1.1.add-health-route` based on the epic branch |
| PR base | `feature/epic.1.health-endpoint` (**not** `develop`) |
| Implementation report | `story.1.1.implementation.{N}.{name}.md` with `status: accepted` |
| QA report | `story.1.1.qa.{N}.{name}.md` |
| QA gate | `story.1.1.gate.{N}.{name}.yml` with `gate: PASS` or `CONCERNS` |
| DoD checklist | `story.1.1.dod.{N}.{name}.md` |
| Lock file | absent (`.claude/state/develop-pipeline.lock` removed by step 8) |
| Halt snapshot | absent (`.claude/state/develop-pipeline.last-halt.json` not created) |
| Health route | `src/routes/health.js` or inline in `src/index.js` |
| Jest test | passes with `npm test` |

---

## Step 6 — Teardown

`gh repo delete` requires the `delete_repo` OAuth scope. If you don't have it, run `gh auth refresh -h github.com -s delete_repo` first.

```bash
cd ~
gh repo delete "$(gh api user --jq .login)/eval-sandbox" --yes
rm -rf ~/sandbox/eval-sandbox
```

---

## Graduating to a fixture

If this run reveals a regression, convert it to a replay fixture:

1. Copy the artifacts from `docs/prd/app/core/epics/` into a new step-isolation scenario under `evals/develop-story/step-isolation/<name>/replay/`.
2. Add a `scenario.json` with assertions targeting the failing behaviour.
3. Run `npm run eval:develop-story` to verify the fixture catches the regression.

See [recipes.md](./recipes.md#9-i-added-a-new-helper--scenario--driver--where-does-it-go) for where new scenarios belong.
