// executed-prose.mjs — the shared harness for tests that RUN a block cut from a shipped document
// (task.147). A test that greps a step document proves the new text exists, not that it works;
// these helpers cut the fenced block out with the repository's own fence reader, bind its
// placeholders, and run it in a throwaway git repository with a bare `origin` and a `gh` stub on
// PATH, under bash and (when present) zsh.
//
// The pattern is probe-base-binding.test.mjs's, lifted here so the six task.147 tests share one
// copy of it rather than six.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../../qa-execute-snippets.mjs";
import { spawnBudget } from "../../spawn-budget.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..", "..", "..");

const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
export const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

const { timeoutMs } = spawnBudget("EXECUTED_PROSE");

export function readDoc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// The ONE fenced block whose code contains `anchor`. Exactly one, or the test is red: a renamed
// anchor or a moved block must not turn the test vacuously green (the non-vacuity floor).
export function blockBy(markdown, anchor, label = anchor) {
  const hits = extractBlocks(markdown).filter((b) => b.code.includes(anchor));
  assert.equal(
    hits.length,
    1,
    `expected exactly one block carrying ${JSON.stringify(label)}, found ${hits.length}`,
  );
  return hits[0].code;
}

// Replace each placeholder, then refuse any left unbound. Two spellings occur in shipped prose:
// `{name}` (step documents; may carry `|` alternatives) and `<name>` (develop-batch, develop-next).
// `${…}` expansions and shell redirections are not placeholders and are left alone.
export function bind(code, map) {
  let out = code;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  // Shell comments are prose (`ls <glob>`), not code the block runs; judge only the code.
  const live = out
    .split("\n")
    .map((l) => l.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");
  const curly = live.match(/(?<!\$)\{[A-Za-z][A-Za-z0-9_|-]*\}/g) || [];
  const angle = live.match(/<[A-Za-z][A-Za-z0-9_#-]*>/g) || [];
  assert.deepEqual(
    [...curly, ...angle],
    [],
    `unbound placeholder(s) in the extracted block: ${[...curly, ...angle].join(", ")}`,
  );
  return out;
}

export function git(cwd, ...args) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
  });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  }
  return r.stdout;
}

// A clone of a bare origin: one base commit on `develop`, plus `feature/x` pushed with upstream
// and checked out. Returns { dir, work, origin }.
//
// Built once per process and copied per test: a fresh build is about a dozen git spawns, and at
// one per case it pushed two suites past ten seconds. The clone's remote is the RELATIVE path
// `../origin.git`, which git resolves from the working tree, so every copy talks to its own origin.
let template = null;

function buildTemplate() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "executed-prose-tpl-"));
  const origin = path.join(dir, "origin.git");
  const work = path.join(dir, "work");
  git(dir, "init", "-q", "--bare", "-b", "develop", origin);
  git(dir, "clone", "-q", origin, work);
  git(work, "remote", "set-url", "origin", "../origin.git");
  git(work, "config", "user.email", "t@example.com");
  git(work, "config", "user.name", "t");
  git(work, "config", "commit.gpgsign", "false");
  git(work, "checkout", "-q", "-b", "develop");
  fs.writeFileSync(path.join(work, "README.md"), "base\n");
  fs.writeFileSync(path.join(work, "package.json"), "{}\n");
  git(work, "add", "-A");
  git(work, "commit", "-q", "-m", "base");
  git(work, "push", "-q", "-u", "origin", "develop");
  git(work, "checkout", "-q", "-b", "feature/x");
  git(work, "push", "-q", "-u", "origin", "feature/x");
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export function fixtureRepo() {
  template ??= buildTemplate();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "executed-prose-"));
  fs.cpSync(template, dir, { recursive: true });
  return {
    dir,
    work: path.join(dir, "work"),
    origin: path.join(dir, "origin.git"),
  };
}

export function write(work, rel, content) {
  const p = path.join(work, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

// An executable `gh` in `<dir>/bin`. Every call appends its argv (one line) to `<dir>/gh.argv`,
// then runs `body` — a POSIX sh fragment that sees the arguments as "$@".
export function ghStub(dir, body) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin, { recursive: true });
  const argvLog = path.join(dir, "gh.argv");
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh\necho "$*" >> "${argvLog}"\n${body}\n`,
    { mode: 0o755 },
  );
  return { bin, argvLog };
}

export function ghCalls(argvLog) {
  return fs.existsSync(argvLog)
    ? fs.readFileSync(argvLog, "utf8").split("\n").filter(Boolean)
    : [];
}

// Run `script` under `shell` in `cwd`. No rc files: zsh reads ~/.zshenv even under `-c`, and a
// PATH it re-prepends puts the real `gh` ahead of the stub, so the test would measure the host
// rather than the block.
function shellArgv(shell, script) {
  return shell === "zsh"
    ? ["-f", "-c", script]
    : ["--noprofile", "--norc", "-c", script];
}

function shellEnv(bin, env) {
  return {
    ...process.env,
    ...env,
    PATH: bin ? `${bin}:${process.env.PATH}` : process.env.PATH,
  };
}

export function run(shell, script, { cwd, bin, env = {} } = {}) {
  const r = spawnSync(shell, shellArgv(shell, script), {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    env: shellEnv(bin, env),
  });
  if (r.error || r.signal || r.status === null) {
    throw new Error(
      `${shell} never produced an answer: ${r.error || r.signal}`,
    );
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// The same, without blocking the event loop — for a suite whose cases run concurrently. The two
// suites that execute a whole checklist per case ran past ten seconds serially.
export function runAsync(shell, script, { cwd, bin, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      shell,
      shellArgv(shell, script),
      { cwd, encoding: "utf8", timeout: timeoutMs, env: shellEnv(bin, env) },
      (error, stdout, stderr) => {
        if (
          error &&
          (error.killed || error.signal || typeof error.code !== "number")
        ) {
          reject(
            new Error(
              `${shell} never produced an answer: ${error.signal || error.message}`,
            ),
          );
          return;
        }
        resolve({ status: error ? error.code : 0, stdout, stderr });
      },
    );
  });
}

export function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
