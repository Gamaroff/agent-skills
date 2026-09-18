---
id: task.122.plan
title: "Implementation Plan: --check UNREACHED class for undiscovered bundled copies"
type: plan
task-ref: task.122.bundle-check-unreached-copies.md
---

# Implementation Plan: `--check` UNREACHED class for undiscovered bundled copies

> Requirements and success criteria: [task.122.bundle-check-unreached-copies.md](task.122.bundle-check-unreached-copies.md)

## Overview

Report the population that already exists (`source_backed_on_disk` minus `needed`), shrink it with
one scoped discovery rule, and delete what remains. The measurement script that produced the 15/12
figure is the shape of the report loop.

## Phase-by-Phase Implementation Guide

### Phase 1: the class

**`skills/create-skill/scripts/bundle_skill.py`**

`REMEDIES` (l.762) — add:

```python
    'UNREACHED': (
        'has a shared/resources/ source but no rule in this skill discovers it — '
        'the copy is refreshed and never depended on. Cite it from the skill '
        '(shared/resources/X or references/X in a skill file) or delete the copy'
    ),
```

`REGENERABLE` unchanged (`('STALE', 'MISSING', 'WRONG MODE')`).

`check_skill` (l.867) — after `reconcilable = source_backed_on_disk(...)` and before the main loop:

```python
    # Reconcilable-only members are the population the writer refreshes and no
    # discovery rule reaches. They are fresh by construction — the loop below
    # will find them in sync — and that is exactly why they need their own
    # class: the freshness comparison is what hides them.
    for rel in sorted(set(reconcilable) - set(needed)):
        report(rel, 'UNREACHED', 'source-backed copy that no discovery rule reaches')
```

Keep them in `expected` too, so STALE/MISSING still applies to them (a copy can be both unreached
and stale; report both).

`check_all` (l.1060): the summary enumerates classes found; nothing to add unless it hard-codes the
taxonomy — read the comment at l.1094 first.

**`tests/bundle-check-mode.test.js`** — copy the ORPHANED fixture pattern (l.215-265):
write `shared/resources/lonely.md`, write `references/lonely.md` as the bundler would (use the
bundler to produce it, then remove the citation from the skill), run check →
`classesFound == ['UNREACHED']`; run bundle; run check → still `['UNREACHED']`. That second assertion
is the non-regenerable proof and belongs beside the existing "classes a bundle run DOES clear" block
(l.351).

### Phase 2: the discovery rule

Regex, beside `REFS_REF_RE` (l.54):

```python
# The invocation spelling a bundled step doc uses to call a script that ships
# inside the same skill: `.agents/skills/{skill}/references/X`. Followed out of
# SHARED text only when {skill} names the skill being bundled — the bare
# `references/X` form is deliberately not followed there (see discover_needed).
INVOKE_REF_RE = re.compile(
    r'\.agents/skills/(\{[A-Za-z0-9|-]+\}|[A-Za-z0-9-]+)/references/([A-Za-z0-9._-]+)'
)
```

In `discover_needed`, inside the shared-source loop (after `pending.extend(collect_shared_refs(text))`,
l.477), for `.md` and `.sh` sources. A bare placeholder group (`{skill}`, no `|`) falls out naturally —
`names == ['skill']` matches no real skill — and must stay that way: read as a wildcard it would vendor
`change-log.js` into the 24 skills that bundle `document-change-log.md` (measured, review 1). Assert the
bare-placeholder case in the fixture; do not add a branch for it:

```python
        for m in INVOKE_REF_RE.finditer(text):
            who, name = m.group(1), m.group(2)
            names = who.strip('{}').split('|') if who.startswith('{') else [who]
            if skill_path.name in names:
                pending_quiet.append(name)
```

`pending_quiet`, not `pending`: a missing source here is not a warning-worthy authoring error, it is
a skill-native file that happens to be invoked by path.

`package_skill.py` imports only `rewrite_text, rewrite_md_links, expected_bytes` from `bundle_skill` and
collects `shared/resources/` refs by `rglob` over the skill tree **including `references/`**, so it
reaches these copies by walking the already-bundled tree. It does not need `INVOKE_REF_RE` for the zip;
do not restate the regex there.

Respell the one real invocation so the rule reaches it:
`shared/resources/develop-pipeline-step-8-commit.md:108`
`.agents/skills/{skill}/references/verify-push-state.sh` → `.agents/skills/{develop-story|develop-task|develop-bug}/references/verify-push-state.sh`,
then `npm run bundle` refreshes the three bundled copies of the step doc.

Fixture: shared `step.md` containing
`bash .agents/skills/fx/references/tool.sh` and `shared/resources/tool.sh` present; skill `fx`
cites `step.md`; assert `tool.sh` in `discover_needed(fx)`; skill `other` cites the same `step.md`;
assert `tool.sh` not in `discover_needed(other)` and, if `other/references/tool.sh` exists,
reported UNREACHED. Two more variants of the same fixture: `{fx|other}` → in `needed` for both;
`{skill}` → in `needed` for neither.

### Phase 3: deletions

```bash
git rm skills/{jira-sprint-manager,jira-sprint-retrospective,jira-sprint-review-prep,jira-epic-creator}/references/yaml-subset.js
git rm skills/review-story/references/review-story-prepass-prompts.md
git rm skills/{qa-task,qa-story}/references/develop-pipeline-step-0-resolve-and-prepare.md
git rm skills/{qa-task,qa-story}/references/develop-pipeline-step-1-create-branch.md
git rm skills/qa-task/references/resolve-paths.sh
git rm skills/{create-task,create-story}/references/set-github-project-priority.sh
```

`set-github-project-priority.sh` in create-task/create-story needs no reword first: `REFS_REF_RE` does
not match the bare backticked mention at `create-task/SKILL.md:580`, and create-story has no mention at
all (review 1 ran the regex against both files). The qa-task/qa-story five are named only in comments in
`read-config.sh` / `resolve-platform.sh` / `gh-stage.js` — grep each once more before the `rm`, per the
task's Medium-risk mitigation.

Then `npm run bundle`, `python3 skills/create-skill/scripts/bundle_skill.py --check`, expect zero
UNREACHED. Mutation proof: `git checkout HEAD~1 -- skills/review-story/references/review-story-prepass-prompts.md`,
check names it, `git rm` again.

## Key Patterns and References

- Population construction: `check_skill` l.885-892 and `bundle_skill` l.1116-1121 — same union, keep them identical.
- Fixture helpers and the measurement-based `REGENERABLE` proof: `tests/bundle-check-mode.test.js` l.13-40, l.351+.
- Regex scoping precedent: `REFS_REF_RE` is followed from skill files only; `INVOKE_REF_RE` is followed from shared files only when scoped — document both in the `discover_needed` docstring.
- The 12/15 measurement: a 20-line script importing `bundle_skill` and calling the two functions per skill; keep it as the shape of the report loop, not as a second tool.

## Testing Approach

`node --test tests/bundle-check-mode.test.js` for the fixtures; `npm run bundle:check` and
`--check --all` on the live tree at each phase boundary (15 → 12 → 0). Consumer check: delete
`skills/develop-task/references/`, `npm run bundle:skill skills/develop-task`, confirm
`verify-push-state.sh` is back.
