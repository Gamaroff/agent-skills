"use strict";
/**
 * Key → document lookup, stated once (task 178).
 *
 * WHY THIS EXISTS
 * ---------------
 * task.176 replaced the develop pipelines' tracker-key → document lookup with one anchored,
 * quote-tolerant lookup in the shared step-0 §0a, which halts on several matches. `review-task` and
 * `review-story` still carried their own copies of the old one — `grep -rl "jira_key: ${KEY}"` — so a
 * review of RAPP-70 could resolve RAPP-702's document, a quoted key matched nothing, a `.request.`
 * sibling could win, and `head -1` hid two matches. Each copy had to be found and fixed by hand. This
 * test makes a fourth copy fail CI instead.
 *
 * WHAT IT CHECKS
 * --------------
 * 1. No canonical source searches the docs/ tree for a tracker-key VALUE outside the one statement
 *    of the rule — §0a's own lookup. The key is what the line DOES, not how its flags are spelled
 *    (QA cycle 2 replaced a flag-spelling key that kept missing spellings — obs #135, #174): within
 *    one command segment (split on pipes, `;`, `&&` and code-span backticks), a grep-family command
 *    (`grep`, `egrep`, `fgrep`, `git grep`, `rg`) + a key field followed by a value
 *    (`jira_key: X`, `github_issue: {N}`, `${KEY_FIELD}:…`) + the `docs` tree as a path argument,
 *    and NOT a files-WITHOUT-match search (`-L`, `--files-without-match`), which is a different rule
 *    (the sync-*-bug skills list unlinked documents that way) and is pinned below.
 *
 *    SCOPE — a tripwire, not a parser. It catches the shapes in the "matches the restatements" fixture
 *    table and nothing is claimed beyond them; a lexical matcher cannot see every way to spell a grep,
 *    and three QA cycles chasing spellings showed it (QA cycle 3, Step 2.6: scope the claim). Known
 *    unseen shapes: a lookup that pipes `find docs …` into a grep; a pattern continued onto the next
 *    physical line with a trailing `\`; an escape-class value (`jira_key:\s*X`); `rg -L` (which is
 *    `--follow`, read here as files-without-match). Add a shape to the table when one is found in a
 *    canonical source.
 * 2. Non-vacuity: §0a still holds its anchored pattern, the population is non-trivial, and the
 *    allowlisted note still exists (a stale allowlist entry is red).
 * 3. The three former sites cite §0a, and each skill ships the step-0 document.
 * 4. review-task's Jira-key branch — its two fenced blocks around the §0a block in the copy the skill
 *    ships, run as one script as the skill says — resolves a quoted key to its one task document, not
 *    to a `.request.` sibling or a prefix neighbour, under bash and zsh; and the check block run alone
 *    (a fresh shell) HALTs on its unbound inputs instead of reporting "no local document".
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// One command segment of a line. Pipes, `;`, `&&`, `||` and markdown code-span backticks separate
// segments, so a pipeline or a sentence naming two commands is read command by command — but only
// OUTSIDE quotes: a `|` inside a quoted pattern is alternation (`"^(jira_key|github_issue): X"`),
// not a pipe (QA cycle 3, CR-1). Single quotes take no escapes; inside double quotes `\` escapes.
function segments(line) {
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      cur += c;
      if (quote === '"' && c === "\\" && i + 1 < line.length) cur += line[++i];
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === "|" || c === ";" || c === "`") {
      out.push(cur);
      cur = "";
      if (c === "|" && line[i + 1] === "|") i++;
    } else if (c === "&" && line[i + 1] === "&") {
      out.push(cur);
      cur = "";
      i++;
    } else cur += c;
  }
  out.push(cur);
  return out;
}
const GREP_FAMILY = /(?:^|[\s$(])(?:(?:git\s+)?[ef]?grep|rg)(?=\s)/;
// A key field followed by a VALUE — not a closing quote, not the end: `jira_key: X`,
// `github_issue: {N}`, `${KEY_FIELD}:[[:space:]]*…`. A value-less `"^jira_key:"` inventories keys.
const KEY_WITH_VALUE =
  /(?:\bjira_key|\bgithub_issue|\$\{?KEY_FIELD\}?)\)?:[ \t]*(?=[^\s'"`)\\]|\[)/;
// The docs tree itself as a path argument — `docs`, `docs/`, `./docs/`, `$ROOT/docs`, a glob over it
// (`docs/**/*.md`) or a brace set under it (`docs/{stories,tasks}/`) — but not one named file under it
// (QA cycle 3, CR-2).
const DOCS_TREE =
  /(?:^|[\s'"(=])(?:\.\/|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?\/)?docs(?:\/(?:\*\*?(?:\/[^\s'")]*)?|\{[^}\s]*\}\/?)?)?(?=[\s'")]|$)/;
const FILES_WITHOUT =
  /(?:^|\s)(?:-[A-Za-z]*L[A-Za-z]*|--files-without-match)(?=\s|$)/;

const lookupSegment = (seg) =>
  GREP_FAMILY.test(seg) && KEY_WITH_VALUE.test(seg) && DOCS_TREE.test(seg);
// A grep over the docs tree for a tracker-key value: the restated lookup.
const isKeyLookup = (line) =>
  segments(line).some((seg) => lookupSegment(seg) && !FILES_WITHOUT.test(seg));
// A files-WITHOUT-match grep over a key field: a different rule (unlinked documents).
const isFilesWithoutKey = (line) =>
  segments(line).some(
    (seg) =>
      GREP_FAMILY.test(seg) &&
      /\b(?:jira_key|github_issue):/.test(seg) &&
      FILES_WITHOUT.test(seg),
  );

const STEP0_SOURCE =
  "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md";
// The one allowlisted hit: the rule's own statement, §0a's lookup. Matched by file and by text,
// never by line number. Its liveness test below is also the guard's non-vacuity floor: a key that
// stops matching the statement it protects is a key that matches nothing.
const ALLOWLIST = [
  {
    file: STEP0_SOURCE,
    sentence: "DOC_MATCHES=$(grep -rlE",
    why: "the one statement — §0a Key → document lookup",
  },
];

const AUTO_GENERATED = /^<!-- AUTO-GENERATED — DO NOT EDIT/m;

function population() {
  const tracked = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      "skills/*/SKILL.md",
      "skills/*/references/*.md",
      "shared/resources/*.md",
      "shared/resources/*.sh",
      "skills/*/scripts/*",
    ],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
  return tracked
    .filter((f) => fs.existsSync(path.join(ROOT, f)))
    .map((f) => ({ file: f, text: read(f) }))
    .filter(
      ({ file, text }) =>
        !(file.includes("/references/") && AUTO_GENERATED.test(text)),
    );
}

function hits(files, matches) {
  const out = [];
  for (const { file, text } of files) {
    text.split("\n").forEach((line, i) => {
      if (matches(line)) out.push({ file, line: i + 1, text: line });
    });
  }
  return out;
}

const allowlisted = (h) =>
  ALLOWLIST.some((a) => a.file === h.file && h.text.includes(a.sentence));

test("no canonical source restates the key → document lookup outside §0a's own statement", () => {
  const files = population();
  assert.ok(
    files.length >= 100,
    `population is non-trivial (${files.length} files)`,
  );
  const offenders = hits(files, isKeyLookup).filter((h) => !allowlisted(h));
  assert.deepEqual(
    offenders.map((h) => `${h.file}:${h.line}: ${h.text.trim()}`),
    [],
    "cite references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup instead",
  );
});

test("every allowlist entry is still live — a stale entry would hide a return", () => {
  const files = population();
  for (const a of ALLOWLIST) {
    const live = hits(files, isKeyLookup).filter(
      (h) => allowlisted(h) && h.file === a.file,
    );
    assert.equal(live.length, 1, `${a.file}: "${a.sentence}" (${a.why})`);
  }
});

test("the key matches the restatements it exists to catch", () => {
  for (const s of [
    'LOCAL_PATH=$(grep -rl "jira_key: ${JIRA_KEY}" docs/ 2>/dev/null \\',
    'fall back to `grep -rl "github_issue: {N}" docs/`',
    "grep -rl 'jira_key: RAPP-1' docs/",
    'grep -lr "github_issue: 5" docs/',
    'grep -ril "jira_key: X" docs/',
    'grep -r -l "github_issue: 5" docs/',
    'grep --recursive -l "jira_key: X" docs/',
    // QA cycle 2, CR-1: spellings a flag-token key missed.
    'grep --include="*.md" -rl "jira_key: X" docs/',
    'grep -m1 -rl "jira_key: X" docs/',
    'grep "jira_key: X" -rl docs/',
    'egrep -rl "jira_key: X" docs/',
    'grep -r --files-with-match "jira_key: X" docs/',
    'rg -l "github_issue: 5" docs/',
    'git grep -l "jira_key: X" -- docs/',
    // QA cycle 3, CR-1/CR-2: alternation inside a quoted pattern; prefixed and globbed docs paths.
    'grep -rlE "^(jira_key|github_issue): X" docs/',
    'grep -rl "jira_key: X\\|github_issue: X" docs/',
    'grep -rl "jira_key: X" ./docs/',
    'grep -rl "jira_key: X" "$ROOT/docs"',
    'grep -l "jira_key: X" docs/**/*.md',
    'grep -rl "github_issue: 5" docs/{stories,tasks}/',
    `DOC_MATCHES=$(grep -rlE "^\${KEY_FIELD}:[[:space:]]*['\\"]?\${KEY_VALUE}['\\"]?[[:space:]]*$" docs/ 2>/dev/null \\`,
  ]) {
    assert.ok(isKeyLookup(s), s);
  }
  for (const s of [
    "grep -rL 'jira_key:' docs/", // files WITHOUT a key — another rule
    "TRACKER_ISSUE=$(grep '^jira_key:' {document-file})", // one file, not a lookup
    'grep "^jira_key: X" docs/tasks/task.1.x/task.1.x.md', // a file under docs/, not the tree
    // QA cycle 2, CR-3: lines that are not lookups.
    'grep -rl "status: done" docs/ | xargs grep -h "^jira_key:"',
    "run `grep -rl TODO docs/` then read the `jira_key:` field",
    'grep -rl "^jira_key:" docs/ | wc -l', // an inventory: no key value
  ]) {
    assert.ok(!isKeyLookup(s), `not a lookup: ${s}`);
  }
});

test("the discriminator: `grep -rL` (files WITHOUT a key) is another rule and is not matched", () => {
  const sites = hits(population(), isFilesWithoutKey);
  // Pinned on the real sites (sync-github-bug, sync-jira-bug). If they go, delete this floor.
  assert.ok(
    sites.length >= 1,
    "a `grep -rL … jira_key:|github_issue:` site still exists",
  );
  for (const h of sites) {
    assert.ok(!isKeyLookup(h.text), `${h.file}:${h.line}`);
  }
});

test("§0a still holds the anchored, quote-tolerant lookup the citations point at", () => {
  const step0 = read(STEP0_SOURCE);
  const i = step0.indexOf("### Key → document lookup");
  assert.ok(i > -1, "§0a carries a Key → document lookup section");
  assert.ok(
    step0.slice(i).includes(`^\${KEY_FIELD}:[[:space:]]*['\\"]?\${KEY_VALUE}`),
    "the lookup's anchored pattern is intact",
  );
});

const CITE =
  "references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup";

test("review-task and review-story cite §0a and ship the step-0 document", () => {
  const rt = read("skills/review-task/SKILL.md");
  const rs = read("skills/review-story/SKILL.md");
  assert.equal(
    rt.split(CITE).length - 1,
    2,
    "review-task: the Jira-key branch and the fallback",
  );
  assert.equal(rs.split(CITE).length - 1, 1, "review-story: the fallback");
  for (const skill of ["review-task", "review-story"]) {
    assert.ok(
      fs.existsSync(
        path.join(
          ROOT,
          `skills/${skill}/references/develop-pipeline-step-0-resolve-and-prepare.md`,
        ),
      ),
      `${skill} ships the cited document`,
    );
  }
});

// ---------------------------------------------------------------------------
// review-task's Jira-key branch, executed: bind block → §0a block (the copy the skill ships) →
// task-only check block.
// ---------------------------------------------------------------------------
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

function bashBlockAfter(text, marker) {
  const i = text.indexOf(marker);
  assert.ok(i > -1, `marker present: ${marker}`);
  const m = text.slice(i).match(/```bash\n([\s\S]*?)```/);
  assert.ok(m, `a bash block follows: ${marker}`);
  return m[1];
}

function jiraBranchScript() {
  const rt = read("skills/review-task/SKILL.md");
  const step0 = read(
    "skills/review-task/references/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  const bind = bashBlockAfter(
    rt,
    "**Step 2 — Extract the issue number / key**",
  );
  assert.match(bind, /KEY_FIELD=jira_key/);
  const lookup = bashBlockAfter(step0, "### Key → document lookup");
  const check = checkBlock();
  return `${bind}\n${lookup}\n${check}\necho "RESOLVED=$LOCAL_PATH"\n`;
}

function checkBlock() {
  const check = bashBlockAfter(
    read("skills/review-task/SKILL.md"),
    "**On the Jira-key branch**",
  );
  assert.match(check, /task\.\[0-9\]\*/);
  return check;
}

// Removed when the test that made it ends (QA cycle 1, CR-3): a run leaves no fixture tree behind.
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-task-key-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (rel, body) => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  // The task, quoted the way consumer documents quote it, with an artifact carrying the same key.
  put(
    "docs/tasks/task.101.thing/task.101.thing.md",
    "---\njira_key: 'RAPP-70'\n---\n",
  );
  put(
    "docs/tasks/task.101.thing/task.101.request.1.thing.md",
    '---\njira_key: "RAPP-70"\n---\n',
  );
  // A neighbour whose key extends this one.
  put(
    "docs/tasks/task.102.other/task.102.other.md",
    "---\njira_key: RAPP-702\n---\n",
  );
  // A story carrying a key: resolves, but is not a task.
  put(
    "docs/stories/story.3.1.thing/story.3.1.thing.md",
    "---\njira_key: 'RAPP-9'\n---\n",
  );
  return dir;
}

function run(shell, dir, input) {
  return spawnSync(shell, ["-c", jiraBranchScript()], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, INPUT: input },
  });
}

for (const shell of SHELLS) {
  test(`review-task Jira-key branch (${shell}): a quoted key resolves to its one task, not the .request. sibling or RAPP-702`, (t) => {
    const r = run(shell, fixture(t), "RAPP-70");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^RESOLVED=docs\/tasks\/task\.101\.thing\/task\.101\.thing\.md$/m,
    );
  });

  test(`review-task Jira-key branch (${shell}): the longer key finds its own document`, (t) => {
    const r = run(shell, fixture(t), "RAPP-702");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^RESOLVED=docs\/tasks\/task\.102\.other\/task\.102\.other\.md$/m,
    );
  });

  test(`review-task Jira-key branch (${shell}): an unknown key reports no local document`, (t) => {
    const r = run(shell, fixture(t), "RAPP-7");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /No local document found for Jira key RAPP-7\./);
  });

  test(`review-task Jira-key branch (${shell}): a key on a story is refused as not a task`, (t) => {
    const r = run(shell, fixture(t), "RAPP-9");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /resolves to docs\/stories\/story\.3\.1\.thing\/story\.3\.1\.thing\.md, which is not a task document/,
    );
  });

  // QA cycle 1, CR-1: the three blocks only work as one shell. Run alone, the check must refuse its
  // unbound inputs — never read an empty LOCAL_PATH as "no local document".
  test(`review-task Jira-key check (${shell}): run alone with no JIRA_KEY, it HALTs instead of reporting no document`, (t) => {
    const env = { ...process.env };
    delete env.JIRA_KEY;
    delete env.LOCAL_PATH;
    const r = spawnSync(shell, ["-c", checkBlock()], {
      cwd: fixture(t),
      encoding: "utf8",
      env,
    });
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /same shell as the bind block and §0a/);
    assert.doesNotMatch(r.stdout, /No local document found/);
  });

  test(`review-task Jira-key check (${shell}): run alone with LOCAL_PATH unbound, it HALTs naming §0a`, (t) => {
    const env = { ...process.env, JIRA_KEY: "RAPP-70" };
    delete env.LOCAL_PATH;
    const r = spawnSync(shell, ["-c", checkBlock()], {
      cwd: fixture(t),
      encoding: "utf8",
      env,
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /HALT: LOCAL_PATH is unbound/);
    assert.doesNotMatch(r.stdout, /No local document found/);
  });
}
