# Live develop-task test with real GitHub

> **Audience:** contributors validating the develop-task pipeline end-to-end against a real Git repo and GitHub PR — outside the eval framework's fixture/smoke infrastructure.

Use this guide to exercise the full 8-step pipeline (`create-branch` → `commit-changes`) with a freshly authored task document, real branches, and a real pull request. Sibling of [`live-github-test.md`](./live-github-test.md), which covers `/develop-story`.

---

## When to use this

- You changed `develop-task/SKILL.md` or a sub-skill and want real-world validation before adding a replay fixture.
- You want to confirm the task pipeline produces correctly-named branches and a PR targeting `develop` (not an epic branch — that's `/develop-story`).
- CI smoke tests pass but you suspect a regression in task artifact naming or DoD handling.

For hermetic fast feedback, prefer `npm run eval:develop-task` instead.

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
gh repo create eval-sandbox-task --public --description "develop-task live eval sandbox"
```

Clone it and bootstrap a minimal Node.js project so the `develop` step has real code to modify:

```bash
git clone https://github.com/$(gh api user --jq .login)/eval-sandbox-task ~/sandbox/eval-sandbox-task
cd ~/sandbox/eval-sandbox-task

npm init -y
mkdir src

cat > src/index.js << 'EOF'
function add(a, b) { return a + b; }
module.exports = { add };
EOF

git add .
git commit -m "chore: bootstrap minimal node project"
git push origin main

# develop-task expects a `develop` branch — feature branches are cut from it
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

Schema is flat (`tracker:` + `vcs:`); repo slug is derived at runtime from `gh repo view` / `git remote get-url origin`. See [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md).

---

## Step 3 — Author the task document

Create the task directory and document. Single file — no PRD, no epic.

```bash
mkdir -p docs/tasks/task.1.setup-jest

cat > docs/tasks/task.1.setup-jest/task.1.setup-jest.md << 'EOF'
---
id: task.1.setup-jest
title: "Set up Jest testing infrastructure"
status: ready-for-development
type: task
---

# Task 1: Set up Jest testing infrastructure

**Status:** Ready for Development

## Why

The project has no test runner. Adding Jest unblocks future stories from shipping with tests and gives QA something to run.

## Acceptance Criteria

- [ ] `jest` installed as a devDependency
- [ ] `jest.config.js` present at repo root with `testEnvironment: "node"`
- [ ] `npm test` script wired in `package.json` (runs `jest`)
- [ ] One trivial passing smoke test in `tests/smoke.test.js` that exercises `src/index.js`'s `add` function
- [ ] `npm test` exits 0

## Implementation Phases

1. Install `jest` as a devDependency
2. Create `jest.config.js` with `{ testEnvironment: "node" }`
3. Update `package.json` scripts: `"test": "jest"`
4. Add `tests/smoke.test.js` covering the `add` function
5. Verify `npm test` passes

## Non-Functional Requirements

None beyond a clean test run.

## Tasks / Subtasks

- [ ] Install Jest
- [ ] Add config file
- [ ] Wire npm script
- [ ] Add smoke test
- [ ] Confirm green run
EOF

git add docs/
git commit -m "docs: add task for Jest setup"
git push origin develop
```

---

## Step 4 — Run develop-task

Open Claude Code in `~/sandbox/eval-sandbox-task` and invoke:

```
/develop-task docs/tasks/task.1.setup-jest/task.1.setup-jest.md
```

Phase 0 will ask, in order:

1. **Feature branch base** — `Which branch should feature/task.1.setup-jest be based on?` → choose **develop** (recommended default).
2. **PR target branch** — `Which branch should the pull request target?` → choose **develop** (recommended default).

Expected pipeline progression:

```
═══ DEVELOP-TASK PIPELINE: STEP 1/8 — CREATE-BRANCH ═══
  creates feature/task.1.setup-jest from develop

═══ DEVELOP-TASK PIPELINE: STEP 2/8 — REVIEW-TASK ═══

═══ DEVELOP-TASK PIPELINE: STEP 3/8 — DEVELOP ═══
  installs jest, adds jest.config.js, wires npm test
  adds tests/smoke.test.js

═══ DEVELOP-TASK PIPELINE: STEP 4/8 — CREATE-PR ═══
  opens PR targeting develop

═══ DEVELOP-TASK PIPELINE: STEP 5/8 — QA-TASK ═══
═══ DEVELOP-TASK PIPELINE: STEP 6/8 — QA-FIX ═══   (only if QA finds issues)

═══ DEVELOP-TASK PIPELINE: STEP 7/8 — FINALISE ═══
═══ DEVELOP-TASK PIPELINE: STEP 8/8 — COMMIT-CHANGES ═══
```

---

## Step 5 — Verify metrics

Run these checks after the pipeline completes:

```bash
# Branch created correctly
git branch -a | grep "task\.1"

# PR targets develop (NOT an epic branch — that would be /develop-story)
gh pr list --repo $(gh api user --jq .login)/eval-sandbox-task --json number,title,baseRefName

# Implementation report present
find docs/ -name "task.1.implementation.*.md"

# QA report + gate present
find docs/ -name "task.1.qa.*.md"
find docs/ -name "task.1.gate.*.yml"

# DoD checklist present
find docs/ -name "task.1.dod.*.md"

# Lock file removed (pipeline completed cleanly)
[ ! -f .claude/state/develop-pipeline.lock ] && echo "PASS: lock cleaned up"

# No unexpected halts
[ ! -f .claude/state/develop-pipeline.last-halt.json ] && echo "PASS: no halts"

# Jest run is green (final acceptance check)
npm test

# Step durations (git commit timestamps)
git log --format="%ai %s" | head -20
```

### What to look for

| Check | Expected |
|---|---|
| Feature branch | `feature/task.1.setup-jest` based on `develop` |
| PR base | `develop` (**not** an epic branch — tasks are standalone) |
| Implementation report | `task.1.implementation.{N}.{name}.md` with `status: accepted` |
| QA report | `task.1.qa.{N}.{name}.md` |
| QA gate | `task.1.gate.{N}.{name}.yml` with `gate: PASS` or `CONCERNS` |
| DoD checklist | `task.1.dod.{N}.{name}.md` |
| Lock file | absent (`.claude/state/develop-pipeline.lock` removed by step 8) |
| Halt snapshot | absent (`.claude/state/develop-pipeline.last-halt.json` not created) |
| Test runner | `npm test` exits 0 with the smoke test passing |

---

## Step 6 — Teardown

`gh repo delete` requires the `delete_repo` OAuth scope. If you don't have it, run `gh auth refresh -h github.com -s delete_repo` first.

```bash
cd ~
gh repo delete "$(gh api user --jq .login)/eval-sandbox-task" --yes
rm -rf ~/sandbox/eval-sandbox-task
```

---

## Graduating to a fixture

If this run reveals a regression, convert it to a replay fixture:

1. Copy the artifacts from `docs/tasks/task.1.setup-jest/` into a new step-isolation scenario under `evals/develop-task/step-isolation/<name>/replay/`.
2. Add a `scenario.json` with assertions targeting the failing behaviour. The smoke baseline lives at `evals/develop-task/smoke/01-end-to-end-dry/` — model new scenarios on it.
3. Run `npm run eval:develop-task` to verify the fixture catches the regression.

See [recipes.md](./recipes.md#9-i-added-a-new-helper--scenario--driver--where-does-it-go) for where new scenarios belong.
