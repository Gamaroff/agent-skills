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
 * 1. No canonical source runs a recursive files-with-matches grep over the key outside the one
 *    allowlisted §0a history note. The key is COMPOUND (obs #135): `grep` + a flag cluster holding
 *    `-r` and a LOWERCASE `l` in either order + `jira_key:` / `github_issue:`, any quote style. The
 *    plain recursive form would also match `grep -rL 'jira_key:'` (files WITHOUT a key) in the
 *    sync-*-bug skills — a different rule — so the lowercase `l` is the discriminator, and it is
 *    pinned below rather than assumed.
 * 2. Non-vacuity: §0a still holds its anchored pattern, the population is non-trivial, and the
 *    allowlisted note still exists (a stale allowlist entry is red).
 * 3. The three former sites cite §0a, and each skill ships the step-0 document.
 * 4. review-task's Jira-key branch — its two fenced blocks around the §0a block in the copy the skill
 *    ships — resolves a quoted key to its one task document, not to a `.request.` sibling or a prefix
 *    neighbour, under bash and zsh.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const KEY_GREP =
  /grep +(?:-[A-Za-z]+ +)*-[A-Za-z]*(?:rl|lr)[A-Za-z]* +.*\b(?:jira_key|github_issue):/;
const FILES_WITHOUT_KEY_GREP =
  /grep +(?:-[A-Za-z]+ +)*-[A-Za-z]*rL[A-Za-z]* +.*\b(?:jira_key|github_issue):/;

const STEP0_SOURCE =
  "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md";
// The one allowlisted hit: §0a's own note describing the form it replaced. Matched by file and by
// sentence, never by line number.
const ALLOWLIST = [
  {
    file: STEP0_SOURCE,
    sentence: "The previous form of this lookup was a bare",
    why: "history — the §0a note naming the unanchored form task.176 replaced",
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

function hits(files, re) {
  const out = [];
  for (const { file, text } of files) {
    text.split("\n").forEach((line, i) => {
      if (re.test(line)) out.push({ file, line: i + 1, text: line });
    });
  }
  return out;
}

const allowlisted = (h) =>
  ALLOWLIST.some((a) => a.file === h.file && h.text.includes(a.sentence));

test("no canonical source restates the key → document grep outside the §0a history note", () => {
  const files = population();
  assert.ok(
    files.length >= 100,
    `population is non-trivial (${files.length} files)`,
  );
  const offenders = hits(files, KEY_GREP).filter((h) => !allowlisted(h));
  assert.deepEqual(
    offenders.map((h) => `${h.file}:${h.line}: ${h.text.trim()}`),
    [],
    "cite references/develop-pipeline-step-0-resolve-and-prepare.md#key--document-lookup instead",
  );
});

test("every allowlist entry is still live — a stale entry would hide a return", () => {
  const files = population();
  for (const a of ALLOWLIST) {
    const live = hits(files, KEY_GREP).filter(
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
    'grep -rlE "^jira_key: X" docs/',
    'grep -n -rl "jira_key: X" docs/',
  ]) {
    assert.match(s, KEY_GREP, s);
  }
});

test("the discriminator: `grep -rL` (files WITHOUT a key) is another rule and is not matched", () => {
  const sites = hits(population(), FILES_WITHOUT_KEY_GREP);
  // Pinned on the real sites (sync-github-bug, sync-jira-bug). If they go, delete this floor.
  assert.ok(
    sites.length >= 1,
    "a `grep -rL … jira_key:|github_issue:` site still exists",
  );
  for (const h of sites) {
    assert.doesNotMatch(h.text, KEY_GREP, `${h.file}:${h.line}`);
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
  const check = bashBlockAfter(rt, "**On the Jira-key branch**");
  assert.match(check, /task\.\[0-9\]\*/);
  return `${bind}\n${lookup}\n${check}\necho "RESOLVED=$LOCAL_PATH"\n`;
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-task-key-"));
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
  test(`review-task Jira-key branch (${shell}): a quoted key resolves to its one task, not the .request. sibling or RAPP-702`, () => {
    const r = run(shell, fixture(), "RAPP-70");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^RESOLVED=docs\/tasks\/task\.101\.thing\/task\.101\.thing\.md$/m,
    );
  });

  test(`review-task Jira-key branch (${shell}): the longer key finds its own document`, () => {
    const r = run(shell, fixture(), "RAPP-702");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^RESOLVED=docs\/tasks\/task\.102\.other\/task\.102\.other\.md$/m,
    );
  });

  test(`review-task Jira-key branch (${shell}): an unknown key reports no local document`, () => {
    const r = run(shell, fixture(), "RAPP-7");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /No local document found for Jira key RAPP-7\./);
  });

  test(`review-task Jira-key branch (${shell}): a key on a story is refused as not a task`, () => {
    const r = run(shell, fixture(), "RAPP-9");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /resolves to docs\/stories\/story\.3\.1\.thing\/story\.3\.1\.thing\.md, which is not a task document/,
    );
  });
}
