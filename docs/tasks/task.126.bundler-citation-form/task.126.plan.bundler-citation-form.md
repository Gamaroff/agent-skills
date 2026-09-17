---
id: task.126.plan
title: "Implementation Plan: bundler citation form and pre-commit refusal"
type: plan
task-ref: task.126.bundler-citation-form.md
---

# Implementation Plan: bundler citation form and pre-commit refusal

> Requirements and success criteria: [task.126.bundler-citation-form.md](task.126.bundler-citation-form.md)

## Overview

One new edge kind in discovery, one report line, one hook exit code. Measure before and after with a
full bundle and `git diff --stat`.

## Phase-by-Phase Implementation Guide

### Phase 1

`bundle_skill.py`:

- `SHARED_REF_RE` (l.11) keeps matching the path; capture the trailing `#fragment` when present.
  Add `CITE_COMMENT_RE = re.compile(r'<!--\s*cite:\s*shared/resources/([A-Za-z0-9._/-]+)\s*-->')`.
- `collect_shared_refs(text)` → list of `(name, kind)`; `kind = 'cite'` when a fragment or the
  comment form matched, else `'dep'`. Callers that only want names use `[n for n, _ in …]`.
- `discover_needed`: `pending` becomes a list of `(name, kind)`. When popping a `cite` entry: add to
  `needed`, **do not** scan its text for further refs. When popping a `dep`: today's behaviour.
  A name reached first as `cite` and later as `dep` is re-queued as `dep` (dependency wins).
- Reporting: after the write pass, `closure = len(needed)`; compare with
  `len(git ls-files skills/<skill>/references)` for `+K`; print
  `✅ <skill>: bundled N · closure M (+K vs committed)`.
- `package_skill.py`: `from bundle_skill import collect_shared_refs, …` — if it restates the regexes,
  replace with the import (the task forbids a second definition).

Tests (copy the fixture pattern in `tests/bundle-check-mode.test.js`): shared `hub.md` referencing
`leaf-a.md` and `leaf-b.js`; skill A cites `shared/resources/hub.md#rule` → `references/` has `hub.md`
only; skill B mentions `shared/resources/hub.md` → has all three; skill C cites hub AND depends on
`leaf-a.md` → has hub + leaf-a.

### Phase 2

Find the hook: `grep -rln "bundle" .husky/ scripts/ 2>/dev/null | head`. After its bundle run:

```bash
NEW=$(git ls-files --others --exclude-standard -- 'skills/*/references/')
if [ -n "$NEW" ] && [ "${BUNDLE_PRECOMMIT_WARN:-0}" != "1" ]; then
  printf '❌ bundle generated untracked copies:\n%s\n' "$NEW"
  echo "   git add them, or remove the shared/resources/ mention that produced them (create-skill § citation form)."
  echo "   BUNDLE_PRECOMMIT_WARN=1 downgrades this to a warning."
  exit 1
fi
```

Shell test: fixture repo with the hook installed; add a bare mention to a skill; `git commit` → exit 1
and the path named; `git add skills/x/references/new.md` → commit succeeds.

### Phase 3

`create-skill/SKILL.md`, beside the "Inside `shared/resources/`, a literal is a bundling instruction"
rule (staged 2026-09-17): a short **Cite or depend** subsection with the two forms and one sentence on
when each is right. AGENTS.md § Shared Resources: "A fragment link (`shared/resources/X.md#section`)
bundles X alone; a bare mention bundles X and everything X depends on."

Convert: `grep -n "develop-pipeline-autonomous-defaults" skills/{qa-fix,review-task,review-story}/SKILL.md`
→ append `#subagents` (or the actual heading anchor). `npm run bundle`; `git diff --stat` recorded in
the implementation report.

## Key Patterns and References

- Fixture-based bundler tests: `tests/bundle-check-mode.test.js`, `tests/bundle-comment-origin.test.js`.
- The comment-path rule (task.119) — a `cite` comment is the deliberate inverse: a comment that
  *is* meant to bundle, one file.

## Testing Approach

`node --test tests/bundle-*.test.js`; the hook shell test; full `npm run bundle` + `bundle:check` +
`bundled-links.test.js` on the converted tree.
