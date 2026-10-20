"use strict";

/**
 * Each GitHub site's link-branch lines run, under bash, exactly as its SKILL.md spells them
 * (task.200 QA cycle 1).
 *
 * The population test reads these lines as text and passed while all eight were unparseable: the
 * guard's message held an apostrophe, and inside a double-quoted `${VAR:?word}` bash reads it as an
 * opening quote, so every block exited 2 before it ran (TASK-200-001). Three sync sites also read a
 * document path that nothing in the block bound (TASK-200-002). Both are defects of the lines as
 * executed, so this test executes them: for each site it lifts the path binding, the resolver call
 * and the guard out of the same fenced block, runs them in a scratch repository with `gh` stubbed,
 * and expects the branch on stdout.
 *
 * Population, derived not listed: every `skills/*\/SKILL.md` that calls `doc-link-branch.js --doc`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO = path.join(__dirname, "..");
const SITE_FLOOR = 8;
const CALL_RE =
  /^DOC_BRANCH=\$\(command node \.agents\/skills\/([a-z0-9-]+)\/references\/doc-link-branch\.js --doc "\$\{([A-Z_]+)\}"/;
const GUARD_RE = /^: "\$\{DOC_BRANCH:\?/;
// A document of each kind the sites link. None of them names the scratch repository's branch, so
// every site falls through to the stubbed `gh` default.
const DOCS = {
  TASK_RELATIVE_PATH: "docs/tasks/task.7.sample/task.7.sample.md",
  EPIC_RELATIVE_PATH:
    "docs/prd/sample/prd.1.sample/epics/epic.1.2.sample/epic.1.2.sample.md",
  STORY_RELATIVE_PATH:
    "docs/prd/sample/prd.1.sample/epics/epic.1.2.sample/stories/story.1.2.3.sample/story.1.2.3.sample.md",
  BUG_RELATIVE_PATH: "docs/bugs/bug.4.sample/bug.4.sample.md",
};

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
}

// The site's lines, from its fenced block: the binding of the path the call reads, the call, the
// guard. A binding outside the block is prose, and a shell running the block never sees it.
function siteLines(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => CALL_RE.test(l));
  if (at < 0) return null;
  const [, skill, pathVar] = lines[at].match(CALL_RE);
  let open = at;
  while (open > 0 && !/^\s*```/.test(lines[open - 1])) open--;
  const bind = lines
    .slice(open, at)
    .filter((l) => l.startsWith(`${pathVar}=`))
    .pop();
  const guard = lines[at + 1];
  return { skill, pathVar, bind, call: lines[at], guard };
}

// Runs a site's lines in `repo`, with the binding's value replaced by a document of its kind.
function runSite(repo, env, site) {
  const doc = DOCS[site.pathVar];
  const bind = site.bind ? `${site.pathVar}=${JSON.stringify(doc)}` : "";
  const script = [
    bind,
    site.call,
    site.guard,
    'printf "%s" "$DOC_BRANCH"',
  ].join("\n");
  const file = path.join(repo, `site-${site.skill}.sh`);
  fs.writeFileSync(file, script);
  return spawnSync("bash", [file], { cwd: repo, env, encoding: "utf8" });
}

function sites() {
  return fs
    .readdirSync(path.join(REPO, "skills"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `skills/${e.name}/SKILL.md`)
    .filter((f) => fs.existsSync(path.join(REPO, f)))
    .map((f) => ({
      f,
      site: siteLines(fs.readFileSync(path.join(REPO, f), "utf8")),
    }))
    .filter(({ site }) => site);
}

// A scratch repository on a branch that names no sample document, with each skill's bundled
// resolver installed where its call addresses it, and a `gh` that answers `main`.
function scratch(skills, ghAnswer = "main") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dlb-sites-"));
  const repo = path.join(root, "repo");
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\necho ${ghAnswer}\n`);
  fs.chmodSync(path.join(bin, "gh"), 0o755);
  sh("git", ["init", "-q", "-b", "feature/task.99.unrelated", repo]);
  for (const s of skills) {
    const dest = path.join(repo, ".agents/skills", s, "references");
    fs.mkdirSync(dest, { recursive: true });
    for (const f of ["doc-link-branch.js", "doc-id.js"]) {
      fs.copyFileSync(
        path.join(REPO, "skills", s, "references", f),
        path.join(dest, f),
      );
    }
  }
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  return { root, repo, env };
}

test("control: the runner fails a guard with an apostrophe and a path left unbound", () => {
  const site = {
    skill: "sync-github-task",
    pathVar: "TASK_RELATIVE_PATH",
    bind: 'TASK_RELATIVE_PATH="{path}"',
    call: 'DOC_BRANCH=$(command node .agents/skills/sync-github-task/references/doc-link-branch.js --doc "${TASK_RELATIVE_PATH}")',
    guard:
      ': "${DOC_BRANCH:?doc-link-branch.js resolved no branch — check the --doc path and that the bundled resolver is present}"',
  };
  const { root, repo, env } = scratch([site.skill]);
  try {
    const good = runSite(repo, env, site);
    assert.equal(good.status, 0, good.stderr);
    assert.equal(good.stdout, "main");

    const apostrophe = runSite(repo, env, {
      ...site,
      guard: ': "${DOC_BRANCH:?is the skill\'s bundled copy of it present?}"',
    });
    assert.notEqual(
      apostrophe.status,
      0,
      "an apostrophe in the guard word must fail to parse",
    );

    const unbound = runSite(repo, env, { ...site, bind: undefined });
    assert.notEqual(unbound.status, 0, "an unbound path must trip the guard");
    assert.match(unbound.stderr, /resolved no branch/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("every GitHub site's link-branch lines run under bash and print the branch", () => {
  const found = sites();
  assert.ok(
    found.length >= SITE_FLOOR,
    `${found.length} SKILL.md files call doc-link-branch.js --doc (floor ${SITE_FLOOR})`,
  );
  const { root, repo, env } = scratch(found.map(({ site }) => site.skill));
  try {
    const failures = [];
    for (const { f, site } of found) {
      if (!site.bind) {
        failures.push(
          `${f}: no ${site.pathVar}= binding in the block before the call`,
        );
        continue;
      }
      if (!GUARD_RE.test(site.guard || "")) {
        failures.push(
          `${f}: the line after the call is not the DOC_BRANCH guard`,
        );
        continue;
      }
      const r = runSite(repo, env, site);
      if (r.status !== 0 || r.stdout !== "main") {
        failures.push(
          `${f}: exit ${r.status}, stdout ${JSON.stringify(r.stdout)}, stderr ${r.stderr.trim()}`,
        );
      }
    }
    assert.deepEqual(failures, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// create-epic's PRD link has two arms: GitHub asks the resolver for gh's default, Bitbucket passes
// its own (TASK-200-004). The scratch repository has no origin, so Bitbucket falls back to `main`,
// and `gh` answers something else, which tells the arms apart.
test("create-epic's PRD link-branch lines run under bash on both VCS arms", () => {
  const text = fs.readFileSync(
    path.join(REPO, "skills/create-epic/SKILL.md"),
    "utf8",
  );
  const lines = text.split("\n");
  const call = lines.findIndex((l) =>
    l.includes('doc-link-branch.js --doc "${PRD_SOURCE_PATH}"'),
  );
  assert.ok(
    call >= 0,
    "create-epic resolves the PRD link through doc-link-branch.js",
  );
  let from = call;
  while (from > 0 && !lines[from].startsWith('if [ "$VCS" = "github" ]'))
    from--;
  let to = call;
  while (to < lines.length && !lines[to].startsWith(': "${BRANCH:?')) to++;
  assert.ok(
    from > 0 && to < lines.length,
    "the VCS branch and its guard surround the call",
  );
  const block = lines.slice(from, to + 1).join("\n");
  const { root, repo, env } = scratch(["create-epic"], "gh-default");
  try {
    for (const [vcs, want] of [
      ["github", "gh-default"],
      ["bitbucket", "main"],
    ]) {
      const file = path.join(repo, `create-epic-${vcs}.sh`);
      fs.writeFileSync(
        file,
        [
          `VCS=${vcs}`,
          'PRD_SOURCE_PATH="docs/prd/sample/prd.1.sample/prd.1.sample.md"',
          block,
          'printf "%s" "$BRANCH"',
        ].join("\n"),
      );
      const r = spawnSync("bash", [file], { cwd: repo, env, encoding: "utf8" });
      assert.equal(r.status, 0, `${vcs}: ${r.stderr}`);
      assert.equal(r.stdout, want, `${vcs} arm`);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
