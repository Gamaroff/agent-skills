"use strict";
/**
 * GitHub sandbox helper — wraps `gh` CLI to create and clean up a scratch PR.
 *
 * Public API:
 *   createGhSandbox(opts) -> Promise<GhReceipt>
 *
 * GhReceipt:
 *   { skipped: true, reason: string, cleanup: async () => void }   — when GH_TOKEN absent / opts.repo absent
 *   { skipped: false, pr: { number, url, baseRefName }, cleanup }  — happy path
 *
 * Cleanup: closes the PR and deletes the branch. Never destructive to the default branch.
 * Runs unconditionally — if cleanup fails, it warns to stderr and continues.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(execFile);

/**
 * @param {object}  opts
 * @param {string}  opts.repo    GitHub repo in "owner/name" form (required)
 * @param {string}  opts.branch  Head branch to create the PR from
 * @param {string}  opts.base    Base branch (e.g. "develop" or "main")
 * @param {string}  opts.title   PR title
 * @param {string}  [opts.body]  PR body (optional)
 * @param {function} [opts.exec] Injectable exec fn for testing (defaults to execFile)
 * @returns {Promise<GhReceipt>}
 */
export async function createGhSandbox({
  repo,
  branch,
  base,
  title,
  body = "",
  exec: execFn = execAsync,
} = {}) {
  const noop = async () => {};

  if (!process.env.GH_TOKEN) {
    return { skipped: true, reason: "GH_TOKEN not set", cleanup: noop };
  }
  if (!repo) {
    return { skipped: true, reason: "repo not provided", cleanup: noop };
  }
  if (!branch) {
    return { skipped: true, reason: "branch not provided", cleanup: noop };
  }

  const env = { ...process.env, GH_TOKEN: process.env.GH_TOKEN };

  try {
    await execFn(
      "gh",
      [
        "pr",
        "create",
        "--repo",
        repo,
        "--base",
        base,
        "--head",
        branch,
        "--title",
        title,
        "--body",
        body,
      ],
      { env },
    );
  } catch (e) {
    return {
      skipped: true,
      reason: `gh pr create failed: ${e.message}`,
      cleanup: noop,
    };
  }

  let pr;
  try {
    const { stdout } = await execFn(
      "gh",
      [
        "pr",
        "view",
        "--repo",
        repo,
        "--head",
        branch,
        "--json",
        "number,url,baseRefName",
      ],
      { env },
    );
    pr = JSON.parse(stdout);
  } catch (e) {
    return {
      skipped: true,
      reason: `gh pr view failed: ${e.message}`,
      cleanup: noop,
    };
  }

  const cleanup = async () => {
    try {
      await execFn(
        "gh",
        ["pr", "close", "--repo", repo, String(pr.number), "--delete-branch"],
        { env },
      );
    } catch (e) {
      process.stderr.write(`gh-sandbox cleanup warning: ${e.message}\n`);
    }
  };

  return { skipped: false, pr, cleanup };
}
