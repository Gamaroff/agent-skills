"use strict";
/**
 * Git sandbox helper — creates a throwaway git repo in a tmpdir for eval use.
 *
 * Public API:
 *   createSandbox(options?) -> Promise<Sandbox>
 *   Sandbox: { path, run, commit, branchList, cleanup }
 */

import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(execFile);

/**
 * @param {object}   [opts]
 * @param {Record<string,string>} [opts.fixtureFiles]  rel-path → content
 * @param {boolean}  [opts.initialCommit]  default true
 * @param {string}   [opts.branch]         default branch name, default "develop"
 * @returns {Promise<Sandbox>}
 */
export async function createSandbox({
  fixtureFiles = {},
  initialCommit = true,
  branch = "develop",
} = {}) {
  const sandboxPath = await mkdtemp(join(tmpdir(), "agent-skills-eval-"));

  const run = async (cmd, args = []) => {
    const { stdout, stderr } = await execAsync(cmd, args, { cwd: sandboxPath });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  };

  await run("git", ["init", "-b", branch]);
  await run("git", ["config", "user.email", "eval@local"]);
  await run("git", ["config", "user.name", "eval"]);

  for (const [rel, content] of Object.entries(fixtureFiles)) {
    const full = join(sandboxPath, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf-8");
  }

  if (initialCommit && Object.keys(fixtureFiles).length > 0) {
    await run("git", ["add", "."]);
    await run("git", ["commit", "-m", "initial fixture"]);
  }

  return {
    path: sandboxPath,
    run,
    /** Commit all staged + unstaged changes with the given message. */
    commit: async (msg) => {
      await run("git", ["add", "."]);
      return run("git", ["commit", "--allow-empty", "-m", msg]);
    },
    /** Return list of local branch names. */
    branchList: async () => {
      const { stdout } = await run("git", ["branch", "--list"]);
      return stdout
        .split("\n")
        .map((s) => s.replace(/^[* ]+/, "").trim())
        .filter(Boolean);
    },
    /** Remove the sandbox directory unconditionally. */
    cleanup: () => rm(sandboxPath, { recursive: true, force: true }),
  };
}
