# Bug Report: Task 110 - The `node`/`python3` arm runs any in-repo script with any arguments — including installed binaries and the repo's own writers

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-8
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`interpreterRule` holds the *leading flags* to an allow-list and the *script* to "a relative path
with no `/` prefix and no `..`", and then — by design, as SKILL.md's `node` row says — "everything
after a script belongs to the script". The whitelist section opens with "Commands run only through
a read-only whitelist", and that claim is only as strong as whatever relative path the script token
names. Two families of relative path break it with **no attacker file on disk** — a committed
handoff line is the whole precondition, the same precondition bug.6 rated HIGH:

1. **Installed tool binaries under `node_modules/`.** `npx prettier --write .` is refused and
   `npm run format:check -- --write` was closed in cycle 6, but
   `node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js` is a relative script with
   arguments that "belong to the script". **Executed** (QA cycle 7, scratch fixture, through the
   real verifier's read mode): the row reported `confirmed` and `git status` showed the file
   rewritten (`M scripts/ugly.js`). The same spelling reaches every installed binary —
   `node_modules/.bin/*`, `node_modules/eslint/bin/eslint.js --fix`, and so on — with every flag
   the npx specs exist to refuse.
2. **The repository's own mutating CLIs.** This repo ships them beside the read-only ones the live
   handoff uses: `shared/resources/registry-tick.js` (writes the task registry),
   `skills/observe-work/references/observation-log.js write|set-status|archive` (writes the
   observation log), `shared/resources/gh-stage.js --issue N --stage done` (moves a board card),
   `shared/resources/tracker-comment.js` (posts to a tracker issue),
   `skills/create-skill/scripts/generate_catalog.py` / `bundle_skill.py --all` (rewrite
   `docs/reference/` and every `references/` copy — the same work `npm run generate-catalog` and
   `npm run bundle` are **refused** for, and which the live handoff's own row 33 records as "read
   mode refused"). **Executed** through the verifier with `--cwd` at the repo root:
   `node shared/resources/registry-tick.js --file <task.110> --dry-run --json` ran to its decision
   (`reason: not-accepted … ticked: false` — with `accepted` and no `--dry-run` it writes);
   `node shared/resources/gh-stage.js --help` printed the board mover's usage. The reviewer
   (CR-4) independently reached `python3 skills/create-skill/scripts/generate_catalog.py` and
   `node scripts/generate-skill-dependencies.mjs`.

Cycle 3 classified `node x.js --require ./y` as "in-repo-trusted" and stopped there; cycle 2 fixed
`npm run lint:fix` ("scripts trusted by suffix") as a MEDIUM by naming the read-only npm scripts
exactly. The interpreter arm never received the same discipline, so an argument the npm arm now
refuses is accepted one spelling away.

## Steps to Reproduce

```bash
# 1. installed binary — a write, no attacker file
mkdir -p /tmp/fx && cd /tmp/fx && git init -q && cp -R <repo>/node_modules/prettier node_modules/ \
  && printf 'const  x = {a:1,\n  b:2}\n' > ugly.js && git add -A && git commit -qm init
printf '| Check | Command | Result |\n| --- | --- | --- |\n| w | `node node_modules/prettier/bin/prettier.cjs --write ugly.js` | **ugly.js** |\n' > h.md
node <repo>/skills/session-handoff/scripts/handoff-verify.mjs h.md --json   # verdict: confirmed
git status --short                                                          # M ugly.js

# 2. an in-repo writer
node -e 'import("<repo>/skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(
  m.isAllowed("node shared/resources/registry-tick.js --file docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md").ok,
  m.isAllowed("node shared/resources/gh-stage.js --issue 407 --stage done").ok,
  m.isAllowed("python3 skills/create-skill/scripts/generate_catalog.py").ok))'   # true true true
```

## Expected Behavior

The read-only claim holds for the interpreter arm the way it now holds for `npm`: either the
script token is held to an exact allow-list of the in-repo read-only entry points a handoff may
run (the discipline `NPM_SCRIPTS` uses — `select-next.mjs --dry-run`, `observation-log.js
queue|scan|doctor`, `quick_validate.py`, `handoff-verify.mjs` itself), or at minimum a
`node_modules/` / `.bin/` segment in the script positional is refused so installed binaries can be
reached only through the npx specs that allow-list their flags — and SKILL.md then states plainly
that any other repo-authored script is trusted with its arguments, so the row-33 claim in the live
handoff is corrected rather than contradicted.

## Actual Behavior

Any relative path is a script; any argument is the script's. A committed line rewrites the tree,
ticks a registry, or moves a tracker card on every reader's machine.

## Impact

The "read-only whitelist" is read-only for `git`, `gh`, `npm`, `npx` and the utilities, and
open-ended for `node` and `python3`. The write needs no attacker file; the tracker mutation needs
only the reader's ordinary credentials. This is the invariant §10 names as the deliverable's one
risk, and it is the third arm (after `npm --` and `gh api <url>`) found open by executing rather
than reading.

## Recommendation

Allow-list the script positional by exact path (preferred — it is the mechanism the npm arm
converged on and the property test can then cover it), or refuse `node_modules/` and `.bin/`
segments and document the residual trust. Add the executed spellings above to the refused-list
test and the read-only entry points the live handoff uses to the allowed list, so the live handoff
still reads 17+ confirmed.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 7)

**Root Cause**: `interpreterRule` held only the interpreter's own leading flags and required the script to be a relative path with no `..`; the script's identity was never consulted and everything after it was passed through as "belongs to the script" (gate 2, CR-13). So the trust boundary of the arm was "any file in the checkout, with any arguments" — which includes `node_modules/*/bin/*` and every writer the `npm run` arm refuses by name.

**Fix**: the script positional is an **exact allow-list of read-only entry points** (`NODE_SCRIPTS`, `PY_SCRIPTS`), each carrying its own `checkArgs` spec for the tail — the `NPM_SCRIPTS` discipline applied to scripts. Listed: `develop-next/scripts/select-next.mjs` (`--lint` `--batch` `--require-touches`, the three registry/roadmap paths relative-only, no positional), `observation-log.js` under any skill's `references/` or `shared/resources/` (read verbs `doctor` `scan` `queue` `next-id` `families` only; `--workspace`/`--audit-root` may be absolute since the log lives outside the repo), and `create-skill/scripts/quick_validate.py` (one relative positional). Each matches at this repo's `skills/…` path and a consumer's `.agents/skills/…` path, so the same handoff line verifies in both. Anything else — `node_modules/…`, `.bin/…`, `registry-tick.js`, `gh-stage.js`, `tracker-comment.js`, `generate_catalog.py`, `bundle_skill.py`, a listed engine's write verbs — is `not on whitelist`. `checkArgs` gained `valueFlags` (a flag that consumes its next token) to express `--workspace /abs` without loosening positionals. SKILL.md's `node` and `python3` rows now state the list and the reason, so the "read-only whitelist" opening and the row agree (gate 7 maintainability CONCERNS).

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `NODE_SCRIPTS`, `PY_SCRIPTS`, `interpreterRule(…, scripts, …)`, `checkArgs` `valueFlags`
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: the prettier.cjs `--write`, `.bin/prettier`, registry-tick, gh-stage, tracker-comment, generate_catalog, bundle_skill, package_skill spellings, the bug's former allowed fixtures `node skills/x.mjs` / `python3 skills/x.py`, and a listed engine's `write`/`archive`/`set-status`/`checkpoint`/`init`; allowed: the live handoff's entry points at both install paths. The three CLI tests that used `node slow.js` as a slow fixture now run it as the fixture package's `npm test` (the tree the group kill covers is one level deeper: verifier → npm → sh → node → grandchild)
- `skills/session-handoff/SKILL.md` — `node`, `python3` rows; refused-by-construction list; the specs paragraph names `NODE_SCRIPTS`/`PY_SCRIPTS` and says how to add an entry point

**Testing**: 29/29. Executed through the verifier in a scratch fixture with prettier installed: `node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js` → `unverifiable: not on whitelist: node`, the file byte-identical afterwards. Live handoff read mode: `select-next.mjs`, `select-next.mjs --lint`, `quick_validate.py` and `observation-log.js queue --workspace … --json` all execute (the last reads `stale` because the total moved 52 → 57 — genuine). Mutation-proved: reverting the script lookup to pass-through → `whitelist: mutating shapes … are refused` red; dropping the `valueOk` check on a spaced value → red.

**Verification Steps for QA**:
1. `isAllowed("node node_modules/prettier/bin/prettier.cjs --write x").ok === false`; same for `node shared/resources/registry-tick.js --dry-run` and `python3 skills/create-skill/scripts/generate_catalog.py`.
2. `isAllowed("node .agents/skills/observe-work/references/observation-log.js queue --workspace /abs --json").ok === true`; `… write --title x` is `false`.
3. `command node skills/session-handoff/scripts/handoff-verify.mjs .agents/handoff.md --json` — no interpreter row reads `not on whitelist`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | QA cycle 7 — prettier write executed through the verifier in a scratch fixture; registry-tick reached under `--dry-run` |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | interpreter script positional is an exact allow-list with per-entry specs; the prettier `--write` spelling executed through the verifier and refused |
