---
id: task.126.plan
title: "Implementation Plan: bundler citation form and pre-commit refusal"
type: plan
task-ref: task.126.bundler-citation-form.md
---

# Implementation Plan: bundler citation form and pre-commit refusal

> Requirements and success criteria: [task.126.bundler-citation-form.md](task.126.bundler-citation-form.md)

## Overview

One new edge kind in discovery, one report suffix, one hook exit code. Measure before and after with
a full bundle, `bundle:check` and `git diff --stat`.

> Anchors re-verified against `develop` `f7ca1985` on 2026-09-29 (review 1). The first draft named
> `SHARED_REF_RE` at l.11 and a `collect_shared_refs` in `bundle_skill.py`; neither holds any more.

## Phase-by-Phase Implementation Guide

### Phase 1

**Where the ref parse lives today — three copies of one pattern:**

- `bundle_skill.py:35` `SHARED_REF_RE`: used by `rewrite_text` and `comment_only_refs`.
- `bundle_skill.py:149` `SHARED_REF_LINE_RE`, consumed by `shared_refs_with_lines` (l.152): the seed
  and the transitive walk in `discover_needed`.
- `quick_validate.py:42` `collect_shared_refs`, with an inline regex. `quick_validate.validate_skill`
  (l.161) and `package_skill.py:96` both use it.

Each name class is `[^\s`'")\]*]+`, which admits `#`. So today `shared/resources/X.md#a` yields the
name `X.md#a`. `validate_skill` then returns "file does not exist" and fails `validate:all`, and the
bundler warns "missing source".

**The other seed:** `REFS_REF_RE` (`bundle_skill.py:58`) seeds `pending_quiet` from skill files. That
is the spelling every skill file carries after the in-place rewrite, and it is how the three pointer
sites are reached. Its name group ends at the extension, so a trailing `#frag` is simply not captured,
and today it is a dependency.

**Changes:**

- In `quick_validate.py`, add `parse_shared_refs(text) -> [(line, name, kind)]`: one regex pass, the
  fragment split off, and `kind` decided by the rule in the task's §3. Re-express
  `collect_shared_refs` as `[n for _, n, _ in parse_shared_refs(t)]`. Re-express
  `bundle_skill.shared_refs_with_lines` as `[(l, n) for l, n, _ in …]`. Delete `SHARED_REF_LINE_RE`.
  `SHARED_REF_RE` stays for `rewrite_text`, which must keep the fragment in the rewritten text.
- Add a comment form that accepts both prefixes:
  `CITE_COMMENT_RE = re.compile(r'<!--\s*cite:\s*(?:\.\./)*(?:shared/resources|references)/([A-Za-z0-9._/-]+)\s*-->')`.
  A name matched here is `cite`. Its bare path inside the comment is still matched by the ordinary
  pattern, so dedupe by name with the kind upgraded (`cite` wins inside a cite comment, and `dep`
  wins across separate mentions).
- `discover_needed` (`bundle_skill.py:521`):
  - `pending` holds `(name, origin, kind)` and `pending_quiet` holds `(name, kind)`.
  - The `REFS_REF_RE` seed reads the character after the match. `#` on an `.md` target makes it
    `cite`; a `cite` comment covers the other case.
  - `seen: dict name -> kind`. Skip an entry when the name has been seen with a kind at least as
    strong; re-process it when a `dep` arrives for a name seen only as `cite`.
  - On a `cite`: add the name to `needed` and do not read the file.
  - Non-`.md` targets are always `dep`.
- The status line at `bundle_skill.py:1423` becomes `✅ {skill}: {status} · closure {M} (+{K} vs committed)`.
  `bundle_skill(…)` gets the tracked set from one `git ls-files -- 'skills/*/references/*'` in
  `main()`, passed down; do not spawn a process per skill.
- `package_skill.py` needs no regex of its own. It gets the fragment strip by using
  `collect_shared_refs`.

Tests go in `tests/bundle-citation.test.js` (new). Copy the fixture pattern from
`tests/bundle-check-mode.test.js`: a shared `hub.md` referencing `leaf-a.md` and `leaf-b.js`, plus
skills A–E as listed in the task's Phase 1. Keep `tests/bundle-missing-source.test.js` §1d green and
add a fragment input to its corpus.

### Phase 2

`.githooks/pre-commit` already computes `PRE` and `POST` over the dirty `references/` set:
- `NEW = comm -13 PRE POST` is staged by the hook itself;
- `LEFT = comm -12 PRE POST` is only warned about.

The refusal goes on the untracked part of `LEFT`:

```bash
UNTRACKED_LEFT="$(comm -12 <(printf '%s\n' "$LEFT" | sort) \
  <(git ls-files --others --exclude-standard -- "$REFS_PATHSPEC" | sort))"
if [ -n "$UNTRACKED_LEFT" ] && [ "${BUNDLE_PRECOMMIT_WARN:-0}" != "1" ]; then
  {
    echo "✗ Untracked generated copies in skills/*/references/ — bundle:check will fail in CI:"
    printf '%s\n' "$UNTRACKED_LEFT" | sed 's/^/      /'
    echo "  git add them, or remove the shared/resources/ mention that produced them (create-skill § Cite or depend)."
    echo "  BUNDLE_PRECOMMIT_WARN=1 downgrades this to a warning."
  } >&2
  exit 1
fi
```

`REFS_PATHSPEC` is the hook's existing `'skills/*/references/*'`. Without the trailing `*` the
pathspec matches nothing, and the refusal would be silently inert.

The test is `tests/pre-commit-hook.test.js`, in node so the `tests/*.test.js` glob runs it:
- `git init` a temp repo, copy `.githooks/pre-commit` in, and stub `npm run bundle` with a
  `package.json` script;
- cover the four cases in the task's Phase 2.

### Phase 3

`create-skill/SKILL.md`: beside the rule "Inside `shared/resources/`, a `shared/resources/` literal
is a bundling instruction", add a short **Cite or depend** subsection giving both forms and when each
is right.

AGENTS.md § Shared Resources, one sentence: "A fragment reference to an `.md` target
(`shared/resources/X.md#section`, or `references/X.md#section` in a skill file) bundles X alone; a
bare mention bundles X and everything X depends on."

Convert:

```bash
grep -n 'references/develop-pipeline-autonomous-defaults.md' skills/{qa-fix,review-task,review-story}/SKILL.md
```

→ `references/develop-pipeline-autonomous-defaults.md#subagents--unavailable-failed-slow`, then run
`npm run bundle`. Then run `python3 skills/create-skill/scripts/bundle_skill.py --check` and
`git rm` every `UNREACHED` copy in the three skills. Compare that list with the measured sets in the
task's §3 before deleting. Record `git diff --stat`.

## Key Patterns and References

- Fixture-based bundler tests: `tests/bundle-check-mode.test.js`, `tests/bundle-comment-origin.test.js`.
- The comment-path rule (task.119): a `cite` comment is the deliberate inverse, a comment that *is*
  meant to bundle exactly one file.
- task.122: the `UNREACHED` class is what proves the conversion removed the copies it claims.

## Testing Approach

`node --test tests/bundle-*.test.js tests/pre-commit-hook.test.js`, then a full `npm run bundle`,
`bundle:check`, `validate:all` and `bundled-links.test.js` on the converted tree.
