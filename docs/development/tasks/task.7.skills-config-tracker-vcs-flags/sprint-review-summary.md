# Sprint Review Summary — skills-config: document explicit tracker and vcs flags

**Task ID:** task.7
**Completed Date:** 2026-05-06
**Pull Request:** [#13](https://github.com/Gamaroff/agent-skills/pull/13)
**GitHub Issue:** [#12](https://github.com/Gamaroff/agent-skills/issues/12)

---

## Summary

Documents the implicit platform-detection convention as explicit `tracker:` and `vcs:` config keys in `skills-config.sample.yaml`, establishes a canonical resolver spec at `shared/resources/platform-detection.md`, and updates `CLAUDE.md` with the 4-step resolver order. Teams can now override platform routing without modifying skill bodies.

---

## What Was Delivered

### Success Criteria Met

- [x] `skills-config.sample.yaml` documents both `tracker:` and `vcs:` keys with `auto` defaults
- [x] `CLAUDE.md` describes the full resolver order (config > env > git remote > default)
- [x] `shared/resources/platform-detection.md` created as canonical resolver spec
- [x] Sample YAML parses without errors
- [x] No code changes required for existing skills — fully backward-compatible
- [x] Future skills can adopt the keys by referencing the canonical spec

### Key Features Delivered

- **Explicit config keys**: `tracker: auto | jira | github` and `vcs: auto | bitbucket | github` in `skills-config.sample.yaml` — teams can override without touching skill bodies
- **CLAUDE.md Platform Detection section**: 4-step resolver order documented; aspirational skill list (honoring config keys is a follow-up); platform-agnostic skills listed
- **Canonical resolver spec**: `shared/resources/platform-detection.md` — python-based `read_config_key()` helper (no yq dependency), env var table, edge cases (mirror repos, migrations, CI without git remote)

---

## Technical Details

### Files Modified/Created

- `skills-config.sample.yaml` — +7 lines: `tracker: auto` and `vcs: auto` keys with resolver-order comments
- `CLAUDE.md` — +17 lines: `### Platform Detection` subsection under `## Configuration`
- `shared/resources/platform-detection.md` — new 58-line canonical spec

### Architecture/Design Decisions

- **`auto` default**: preserves all current implicit detection behavior; explicit values override only when set
- **Python helper over yq**: `read_config_key()` uses `python3 -c "import yaml..."` — matches the project's existing validation pattern; avoids an undocumented `yq` dependency
- **Shared resource path**: `shared/resources/platform-detection.md` follows CLAUDE.md convention — `package_skill.py` will auto-bundle it when any skill adds a reference

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None — additive only; `auto` default is fully backward-compatible

---

## Testing & Quality Assurance

### Test Coverage

- **Validation:** YAML lint via `ruby -ryaml` — PASS
- **Content verification:** resolver snippet, env var table, edge cases verified
- **Regression:** No existing skill files modified; zero regression risk

### Code Review

- **QA Gate:** ✅ PASS (97/100)
- **QA Cycle:** 1 iteration, 0 issues found

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — N/A category (config/docs only)

- [x] No auth or permission changes
- [x] No sensitive data added
- [x] No new dependencies

### Compliance Review

✅ **N/A** — no PII, no financial data, no UI/accessibility changes

---

## Documentation

### Updated Documentation

- [x] `CLAUDE.md` — Platform Detection section added
- [x] `shared/resources/platform-detection.md` — canonical spec created
- [x] `skills-config.sample.yaml` — keys documented with inline comments

---

## Demo Notes

### How to Verify

1. Open `skills-config.sample.yaml` — confirm `tracker: auto` and `vcs: auto` keys present before `qa:` block
2. Open `CLAUDE.md` — find `### Platform Detection` under `## Configuration` — confirm 4-step resolver order and skill lists
3. Open `shared/resources/platform-detection.md` — confirm resolver snippet, env vars, edge cases
4. Run: `ruby -ryaml -e "YAML.load_file('skills-config.sample.yaml'); puts 'valid'"` — expected: `valid`

---

## Impact & Value

### User Impact

Teams working in ambiguous environments (mirror repos, platform migrations) can now explicitly set `tracker: jira` and `vcs: bitbucket` in their `skills-config.yaml` to override what `git remote` or `JIRA_URL` would detect. Onboarding friction reduced — convention is documented rather than hidden in skill bodies.

### Technical Impact

- Centralizes platform-detection convention into one canonical spec — reduces drift across skills
- New skill authors have a clear reference (`shared/resources/platform-detection.md`) rather than re-deriving the pattern
- Foundation for task.8 (audit of which skills honor the convention) and follow-up migration tasks

---

## Known Limitations & Future Work

### Current Limitations

- Skills do **not yet read** `tracker:`/`vcs:` from `skills-config.yaml` — honoring the new keys is a per-skill follow-up migration (documented as aspirational in CLAUDE.md)

### Suggested Follow-Up Tasks

- **task.8**: Audit existing skills against the canonical platform-detection spec
- Per-skill migration: update `create-pr`, `create-task`, `finalise`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic` to read `tracker:`/`vcs:` config keys before falling back to implicit detection

---

**Status:** ✅ **ACCEPTED**

_Task verified against Definition of Done and ready for Sprint Review presentation._
