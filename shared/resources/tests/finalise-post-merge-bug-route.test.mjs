/**
 * finalise-post-merge-bug-route — where the acceptance commit goes when a bug is finalised after
 * its PR merged (task 272; obs #38; owner decision recorded in the task plan, Phase 1).
 *
 * A bug fixed on a plain bugfix branch and finalised after the merge is checked out on the base
 * branch. 6a's acceptance commit would push to it. The route: a docs-only branch off the base, the
 * base never pushed to, and a HALT naming the next step (open the docs PR, re-run). Every block run
 * here is EXTRACTED from skills/finalise/SKILL.md, never restated, in a scratch git repo with a bare
 * origin, under bash and (where installed) zsh.
 *
 * Controls: the same bug on a non-base branch commits and pushes where it stands; a task on the base
 * branch is untouched by the route (it finalises before its merge, on its own branch).
 *
 * Run: node --test shared/resources/tests/finalise-post-merge-bug-route.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { makeConsumerRoot } from "../../../evals/shared/lib/consumer-root.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const FINALISE = readFileSync(
  join(REPO_ROOT, "skills/finalise/SKILL.md"),
  "utf8",
);

const SHELLS = [
  "bash",
  ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0
    ? ["zsh"]
    : []),
];

/** The first ```bash fence after `needle`, dedented. */
function fenceAfter(text, needle) {
  const at = text.indexOf(needle);
  assert.ok(at > -1, `needle not found: ${needle}`);
  const start = text.indexOf("```bash\n", at);
  assert.ok(start > -1, `no bash fence after ${needle}`);
  const bodyStart = text.indexOf("\n", start) + 1;
  const close = /\n[ \t]*```[ \t]*(\n|$)/g;
  close.lastIndex = bodyStart - 1;
  const m = close.exec(text);
  assert.ok(m, `unterminated fence after ${needle}`);
  const body = text.slice(bodyStart, m.index + 1);
  const indent = Math.min(
    ...body
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.match(/^ */)[0].length),
  );
  return body
    .split("\n")
    .map((l) => l.slice(indent))
    .join("\n");
}

// Bare origins this file makes; removed at exit (the scratch roots are the helper's to clean).
const remotes = [];
process.on("exit", () => {
  for (const d of remotes) rmSync(d, { recursive: true, force: true });
});

const DIR = "docs/bugs/bug.5.fx";
const sixA = (stem, kind) =>
  fenceAfter(FINALISE, "6a. **Acceptance commit + push.**")
    .replace(/^STEM="\{[^\n]*$/m, `STEM="${stem}"`)
    .replace(/^DOC_KIND="\{[^\n]*$/m, `DOC_KIND="${kind}"`)
    .replaceAll("{document-directory}", DIR)
    .replaceAll("{document-path}", `${DIR}/${stem}.fx.md`);

/** A repo on `branch`, with a bare origin that already holds that branch, and the acceptance
 *  artefacts a bug run wrote (the bug report and its DoD) staged-ready in the working tree. */
function fixture(branch, stem = "bug.5") {
  const root = makeConsumerRoot(REPO_ROOT, "post-merge-bug-");
  const remote = mkdtempSync(join(tmpdir(), "post-merge-bug-remote-"));
  remotes.push(remote);
  const g = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const write = (rel, body) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  spawnSync("git", ["init", "-q", "--bare", remote]);
  g("init", "-q", "-b", branch);
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");
  writeFileSync(join(root, ".git", "info", "exclude"), ".agents\n.claude\n");
  write(
    "skills-config.yaml",
    'ci:\n  docsOnly:\n    patterns:\n      - "docs/**"\n',
  );
  write(`${DIR}/${stem}.fx.md`, "status: fixed\n");
  g("add", "-A");
  g("commit", "-q", "-m", "base");
  g("remote", "add", "origin", remote);
  g("push", "-q", "origin", branch);
  // What /finalise actions 1–6 wrote.
  write(
    `${DIR}/${stem}.fx.md`,
    "status: fixed\n\n## Status History\n| row |\n",
  );
  write(`${DIR}/${stem}.dod.1.fx.md`, "# DoD\n");
  const remoteHeads = () =>
    spawnSync(
      "git",
      [
        "--git-dir",
        remote,
        "for-each-ref",
        "--format=%(refname:short) %(objectname)",
        "refs/heads",
      ],
      {
        encoding: "utf8",
      },
    ).stdout.trim();
  return { root, g, write, remote, remoteHeads };
}

function run(shell, root, script, env = {}) {
  return spawnSync(shell, ["-s", "--"], {
    input: script,
    encoding: "utf8",
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });
}

for (const shell of SHELLS) {
  test(`[${shell}] a bug finalised on the base branch commits to docs/<stem>-dod, never pushes the base, and HALTs naming the docs PR`, () => {
    const f = fixture("develop");
    const baseBefore = f.remoteHeads();
    const r = run(shell, f.root, sixA("bug.5", "bug"));
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /HALT: post-merge-docs-pr — the acceptance commit is pushed to docs\/bug\.5-dod/,
    );
    assert.match(r.stdout, /develop was not pushed to/);
    assert.match(r.stdout, /\/create-pr --base develop/);
    assert.equal(f.g("rev-parse", "--abbrev-ref", "HEAD"), "docs/bug.5-dod");
    assert.equal(
      f.g("log", "-1", "--format=%s"),
      "docs(bug.5): DoD verified — finalise --bug",
    );
    const heads = Object.fromEntries(
      f
        .remoteHeads()
        .split("\n")
        .map((l) => l.split(" ")),
    );
    assert.ok(
      heads["docs/bug.5-dod"],
      `the docs branch reached origin: ${f.remoteHeads()}`,
    );
    assert.equal(
      `develop ${heads.develop}`,
      baseBefore,
      "origin/develop is exactly where it was",
    );
    assert.equal(
      f
        .g("show", "--name-only", "--format=", "docs/bug.5-dod")
        .split("\n")
        .sort()
        .join(","),
      `${DIR}/bug.5.dod.1.fx.md,${DIR}/bug.5.fx.md`,
    );
  });

  test(`[${shell}] control — the same bug on a non-base branch commits and pushes where it stands, no docs branch`, () => {
    const f = fixture("bugfix/bug.5.fx");
    const r = run(shell, f.root, sixA("bug.5", "bug"));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /post-merge-docs-pr/);
    assert.equal(f.g("rev-parse", "--abbrev-ref", "HEAD"), "bugfix/bug.5.fx");
    assert.doesNotMatch(f.remoteHeads(), /docs\/bug\.5-dod/);
  });

  test(`[${shell}] control — the re-run, already on the docs branch, skips the commit it made and carries on`, () => {
    const f = fixture("develop");
    run(shell, f.root, sixA("bug.5", "bug"));
    const again = run(shell, f.root, sixA("bug.5", "bug"));
    assert.equal(again.status, 0, again.stdout + again.stderr);
    assert.match(
      again.stdout,
      /acceptance artefacts already committed — skipping commit, pushing/,
    );
    assert.equal(
      f.g("rev-list", "--count", "HEAD"),
      "2",
      "no second acceptance commit",
    );
  });

  test(`[${shell}] control — a task on the base branch is untouched by the route`, () => {
    const f = fixture("develop", "task.9");
    f.write(`${DIR}/sprint-review-summary.md`, "# Sprint review\n");
    const r = run(shell, f.root, sixA("task.9", "task"));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /post-merge-docs-pr/);
    assert.equal(f.g("rev-parse", "--abbrev-ref", "HEAD"), "develop");
  });

  test(`[${shell}] the other base names (main, master) take the route too; an unknown trunk name is an ordinary branch`, () => {
    for (const base of ["main", "master"]) {
      const f = fixture(base);
      const r = run(shell, f.root, sixA("bug.5", "bug"));
      assert.equal(r.status, 1, `${base}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, new RegExp(`off ${base}\\)`));
      assert.equal(f.g("rev-parse", "--abbrev-ref", "HEAD"), "docs/bug.5-dod");
    }
    const t = fixture("trunk");
    assert.equal(run(shell, t.root, sixA("bug.5", "bug")).status, 0);
  });
}
