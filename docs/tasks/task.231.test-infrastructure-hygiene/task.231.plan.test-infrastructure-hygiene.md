---
id: task.231.plan
title: "Implementation Plan: Test infrastructure hygiene"
type: plan
task-ref: task.231.test-infrastructure-hygiene.md
---

# Implementation Plan: Test infrastructure hygiene

> Requirements and success criteria: [task.231.test-infrastructure-hygiene.md](task.231.test-infrastructure-hygiene.md)

## Overview

The plan has four independent parts in disjoint files, plus a measuring phase first. The temp-dir
part wraps the suite rather than touching 475 call sites, and then fixes the four worst prefixes.
The other three parts are small, local changes, each held by unit cases and a mutation proof.

## Phase 0: Measure

The leak measurement command, used for the baseline in the task document:

```bash
D="$(mktemp -d "$HOME/.cache/t231-leak.XXXXXX")"   # outside /tmp, so a /tmp snapshot stays clean
TMPDIR="$D" npm test > "$D.log" 2>&1; echo "exit=$?"
ls -A "$D" | sed -E 's/[-_.][A-Za-z0-9]{6,}$//' | sort | uniq -c | sort -rn > "$D.prefixes"
find "$D" | wc -l
```

Run it twice and `diff` the two `.prefixes` files. The answer decides whether the ratchet keys on
counts or on the prefix set.

To trace the escapes, use `ls /tmp` before and after one run, then `comm -13`. For each new name,
grep its prefix:

```bash
git grep -nE '(pipeline-hold|review-pr-comment)' -- '*.mjs' '*.js' '*.sh' '*.md'
```

`skills/review-pr/SKILL.md:867` uses `mktemp -t review-pr-comment.XXXXXX.md`. If a test executes
that block with a scrubbed env, the escape is the test's `env` and not the block. Check the test's
`spawnSync(..., { env })` for a missing `TMPDIR`.

To measure the dead-anchor population, apply Phase 3's change in a scratch worktree and run both
corpus tests. Their failure lists are the seed for `KNOWN_ANCHORS` and `KNOWN_ARTIFACT_ANCHORS`.

## Phase 1: `scripts/test-tmpdir.mjs`

Shape:

```js
// usage: node scripts/test-tmpdir.mjs [--ratchet <file>] -- <command> [args…]
// 1. dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-test-"))   // the system tmpdir, read BEFORE overriding
// 2. child = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, TMPDIR: dir, TMP: dir, TEMP: dir } })
// 3. leftovers = groupByPrefix(fs.readdirSync(dir))       // same sed rule as Phase 0, as a function
// 4. verdict  = compareRatchet(leftovers, ratchet)        // new | over | healed | ok
// 5. finally: fs.rmSync(dir, { recursive: true, force: true })
// 6. exit: child.status !== 0 ? child.status : (verdict ok ? 0 : 1); a signal → 1 + name it
```

- Export `groupByPrefix` and `compareRatchet` (`require.main === module` guard) so the unit test
  drives them without spawning the whole suite. Spawn the wrapper itself only for the end-to-end
  cases: exit codes, the directory removed, and `TMPDIR` visible to the child.
- The prefix rule has to be one function used by the report and by the test. Do not write a second
  regex (see the "two parsers of one format" principle).
- `process.on("SIGINT")` and `process.on("SIGTERM")` remove the directory, then re-raise.
- Write the report to stderr: `tmp-leak: new prefix "x" (3 entries) — git grep -n '"x-'`. Healed
  entries say `delete it from tests/tmp-leak-ratchet.json so the ratchet tightens`, which matches
  `doc-links.test.mjs:399`'s wording.
- Any `process.exit` after a large `stdout.write` must drain first (see the select-next truncation
  trap in `docs/contributing/traps.md`). The report goes to stderr in small writes, so exit through
  `process.exitCode` and do not call `process.exit()`.

`package.json`:

```json
"test": "node scripts/test-tmpdir.mjs -- npm run test:suite",
"test:suite": "<the current test chain, unchanged>"
```

Helper fixes. Each is the same move, so apply it wherever the prefix is created:

```js
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-next-"));
t.after(() => fs.rmSync(dir, { recursive: true, force: true }));   // inside a test
// or, in a helper that returns the dir: return the dir AND register cleanup on the caller's `t`,
// or wrap the body in try/finally when the helper owns the whole lifetime.
```

For `executed-prose.mjs` (`fixtureRepo`), check whether callers reuse the template across tests.
#50 saw an ENOENT copying `/tmp/executed-prose-*/origin.git/objects` mid-run. If the template is
shared, it may be removed only once the file's last test is done (`after()` at module level), not
per test.

## Phase 2: `SCRATCH_ROOT`

```js
function scratchRoot() {
  const here = join(SHARED, "..", "..");
  const r = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: here, encoding: "utf8" });
  const common = r.status === 0 ? r.stdout.trim() : "";
  const main = common ? dirname(common) : here;   // common = <main>/.git
  return join(main, ".observation-log-test-tmp");
}
```

- In the main checkout, `dirname(<main>/.git)` is `<main>`, so the path is the same as today. In a
  linked worktree it points to the main checkout. Keep the existing ephemeral pre-check (`:69-72`).
- Test it on a scratch repo outside any worktree: `git init` and a commit, then
  `git worktree add <scratch>/wt`. Spawn a tiny script (or the helper, if exported) with the cwd
  inside `wt`, and assert the result is under the main scratch repo and not under `wt`.
- The `.gitignore:71` entry already covers the main checkout.

## Phase 3: anchors in `doc-links.js`

```js
function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")              // inline HTML
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")   // drop punctuation (an em dash is punctuation)
    .replace(/ /g, "-");                  // each space → "-" (so "a — b" → "a--b")
}
function anchorsOf(text) {
  // reuse the module's existing fence/code-span blanking so a heading inside a fence is not an anchor
  // ATX headings only (`#`…`######`); strip trailing #'s and inline code backticks/emphasis markers first
  // duplicates: second "x" → "x-1", third → "x-2"
  // plus <a id="…"> / <a name="…">
}
```

- Run the inline-markup strip **before** slugging: `` `code` `` → `code`, `**b**` → `b`, and
  `[text](url)` → `text`. Run every slug edge case against a heading in this repository whose
  GitHub anchor is known. The unit fixtures quote those headings.
- In `checkFile` (`:352`), when `noFragment` ends in `.md` (or is `""` for same-file) and a fragment
  exists, read the target. Read the tracked blob when `tracked` is in use, so the check matches the
  path check's tracked-tree rule. If `decodeSafe(fragment)` is not in `anchorsOf(target)`, push
  `state: "no-anchor"`.
- Same-file `#x` currently hits `continue` at `noFragment === ""`. Branch before that.
- `KNOWN_ANCHORS` entries are pinned `file:target#fragment`, in the same shape as `KNOWN`.
- CI step, after the changed-files step:

```yaml
- name: Check relative links and anchors (doc-links.js)
  run: |
    set -uo pipefail
    status=0
    while IFS= read -r f; do
      [ -n "$f" ] && [ -f "$f" ] || continue
      node shared/resources/doc-links.js --file "$f" || status=1
    done < changed.txt
    exit $status
```

  A `docs/tasks/**` file whose link points at a consumer layout fails here too. If Phase 0 shows the
  changed-files population includes those, scope this step with the same exclusions the corpus tests
  use. Do not add a second list: read it from where the corpus test defines it, or filter the step to
  the paths the corpus tests cover.
- Run `npm run bundle` and commit the regenerated `references/doc-links.js` copies.

## Phase 4: parity rule

```js
function isWaitMarked(lines, i) {
  const SET = /set-waiting-on\.sh "[^"]+"/;
  if (SET.test(lines.slice(Math.max(0, i - 12), i + 12).join("\n"))) return true;
  for (let j = i + 1; j <= Math.min(lines.length - 1, i + 12); j++) {
    if (/^\s*(```|~~~)/.test(lines[j])) {              // the first fence that opens after the dispatch
      let k = j + 1;
      while (k < lines.length && !/^\s*(```|~~~)\s*$/.test(lines[k])) k++;
      return SET.test(lines.slice(j, k).join("\n"));
    }
  }
  return false;
}
```

- Better: use the repository's one fence reader (`qa-execute-snippets.mjs` `extractBlocks`, per
  obs #48's principle) to find the block's range, instead of the inline loop above. The loop shows
  the intent only.
- Unit cases use synthetic `lines` arrays: a mark 20 lines into the following fence → true; the
  following fence with no mark → false; a mark only in a fence that closes before `i` → false.
- Optional follow-up, recorded but not required: the prose restatement at `skills/finalise/SKILL.md:526`
  can stay, because it informs the reader. The test no longer depends on it.

## Testing Approach

- New suite: `tests/test-tmpdir.test.js` (already inside the `tests/*.test.js` glob in `test:suite`).
- Extended suites: `doc-links.test.mjs`, `observation-log.test.mjs` and
  `qa-loop-lock-fields-parity.test.mjs`.
- Mutation proofs are as listed in the task's § 8. Run each mutation on a tree no background suite is
  reading (obs #64).
- Verify locally with the `.agents/skills` symlink moved aside (see the traps doc), so local green
  matches CI.
