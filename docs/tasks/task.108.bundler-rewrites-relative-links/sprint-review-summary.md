# Sprint Review Summary - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Story/Task ID:** task.108
**Epic:** — (standalone technical task)
**Completed Date:** 2026-09-12
**Completed By:** Claude (develop-task pipeline via develop-next)
**Pull Request:** [#396](https://github.com/Gamaroff/agent-skills/pull/396)

---

## Summary

Every bundled `skills/*/references/*.md` copy carried links authored for `shared/resources/` depth — 845 broken relative links in 215 files, certified clean by both existing guards. The bundler now resolves each prose link and applies one rule (inside the skill → relative, anything else → upstream URL), the packager imports that pass, and a link check with a non-vacuity floor runs under `npm test` so the class cannot recur silently.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Checker reports 0 broken links over `skills/**/*.md` + `shared/resources/**/*.md` — 663 files, 2,098 links parsed, 958 relative, 0 broken; floors 200 files / 1,000 links / 20 top-level shared sources
- [x] `npm run bundle` idempotent (second run: no diff); `--check --all` 126 skills, 0 problems
- [x] Zips from `package_skill.py` carry no broken relative links (7 real skills extracted and checked across QA) and no duplicate entries
- [x] Checker runs under `npm test` → `ci:fast` / `ci` / `test.yml` with no workflow edit
- [x] Mutation proofs recorded — eight in total across development and four QA cycles
- [x] 2026-08-20 audit note (Theme F) closed with a pointer to this task

### Key Features Implemented

- **One link rule in `bundle_skill.py`**: `rewrite_md_links()` resolves each prose link against its source directory; a target inside the destination skill is emitted relative, anything else becomes `https://github.com/Gamaroff/agent-skills/blob/develop/<path>` (one constant). Fenced blocks and inline code spans are tracked line by line; `{…}`/`[…]`/`<…>` placeholders and root-absolute targets are left alone. Bundled siblings are decided from `needed ∪ reconcilable` — the same population the checker uses — so runs cannot flip.
- **Packager parity**: `package_skill.py` imports the pass (three inline regexes deleted), writes the bundled bytes rather than the raw source into the zip, emits no duplicate arcnames, and applies the outside-the-skill rule to the skill's own `.md`.
- **The guard**: `tests/bundled-links.test.js` + `tests/lib/markdown-links.js` (the extractor is the deliberate twin of the Python pass); `tests/bundle-link-rewrite.test.js` exercises the pass on a synthetic skill including nested shared sources and zip parity.
- **Eval parity helper**: `evals/shared/lib/bundled-parity.mjs` asks the bundler (`--check`) whether a copy is fresh — fail-closed (`ran` vs `ok`) — replacing two test-local normalisers that undid the rewrite by hand.
- **Source-side repairs**: 10 skill-native reference files and templates whose links were wrong at the source, fixed as found.

---

## Technical Details

### Files Modified/Created

- `skills/create-skill/scripts/bundle_skill.py` — link pass, `expected_bytes(src, name, refs_dir, bundled_names)`, URL-safe `SHARED_REF_RE`, `_skill_dirs()` memo
- `skills/create-skill/scripts/package_skill.py` — imports the pass; zip bytes; no duplicates; own-file rule
- `skills/create-skill/scripts/quick_validate.py` — `collect_shared_refs` URL-safe
- `tests/lib/markdown-links.js`, `tests/bundled-links.test.js`, `tests/bundle-link-rewrite.test.js` — new
- `evals/shared/lib/bundled-parity.mjs`, `evals/shared/tests/bundled-parity.test.mjs` — new; two eval tests rewired
- `skills/*/references/*.md` — 205 regenerated copies (mechanical)
- `docs/contributing/packaging.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/reference/develop-story-pipeline-audit.2026-08-20.md`, `docs/templates/epic-template.md` + 9 skill-native files

### Architecture/Design Decisions

- The review replaced a `docs/`-only rule with a single in-bundle/else-upstream rule after measuring that ~45% of the breakage was unbundled shared siblings, which a `docs/`-only rule would have left as in-repo-only paths.
- `blob/develop` is pinned in one constant; tarball installs come from `develop`.
- Freshness for eval tests is defined by the bundler itself, not by a hand-written inverse of the rewrite.

### Dependencies

- **New Dependencies Added:** none (stdlib `functools`)
- **Breaking Changes:** none for consumers; one-time mechanical rewrite of 205 bundled copies in-repo

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 16 new tests across the three new suites; `npm run ci:fast` 3,203 tests / 3,202 pass / 0 fail
- **Integration Tests:** bundle idempotency; `--check --all`; zip extraction on 7 real skills
- **Mutation Proofs:** pass stubbed; floor emptied; in-skill branch off; bundled set ignored; `<>` placeholder dropped; `ok`/`ran` check reverted; nested-source join reverted; shared-half pathspec narrowed — each turned the named test red

### QA

- 4 cycles: CONCERNS 90 → PASS 100 (+1 gated low) → CONCERNS 90 → PASS 100; 16 findings fixed, 0 remaining
- Step 5c `/review-pr`: APPROVE (3 low follow-ups)
- CI green on `f587c357`

---

## Security & Compliance

- **Security:** PASS — boundary probed with 54 executed candidates (corpus path sink + rewriter-specific + JS twin), 0 reproduced; no secrets, no shell spawns, no filesystem access keyed on link targets
- **Compliance:** NOT_APPLICABLE

---

## Documentation Updates

- `docs/contributing/packaging.md` — new §Link re-relativisation
- `AGENTS.md` — bundling paragraph names the rule and the guard
- `CHANGELOG.md` — `[Unreleased]` › Fixed
- `docs/reference/develop-story-pipeline-audit.2026-08-20.md` — Theme F closed

---

## Demo Notes

`npm run bundle` twice → second run silent; `node --test tests/bundled-links.test.js` → 0 broken over 663 files; revert the join in `_relocate_target` → the nested-source test goes red.

## Known Limitations / Future Work

- Low follow-ups from the PR review: packager `bundled_names` includes skill-native names (relative in zip vs upstream in-tree for a colliding sibling link — none exists today); `git ls-files` without `-z` on non-ASCII paths (none tracked); banner-window parity (4,000 chars vs 40 lines); dead `unzip`-format filter clauses; README pointer to the packaging doc.
