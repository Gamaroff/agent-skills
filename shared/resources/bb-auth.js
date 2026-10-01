"use strict";

// bb-auth — Bitbucket REST credential and repository slug, shared.
//
// Moved verbatim out of pr-inline-comment.js (task.172) so ci-tree-equivalence.js can read a
// commit's statuses without requiring a ~1,500-line PR-comment engine into three more skills.
// pr-inline-comment.js requires this file and keeps exporting both, so its public surface is
// unchanged. bitbucket-auth.sh is the shell twin: same variables, same order.

const GIT_EXEC_OPTS = {
  encoding: "utf-8",
  stdio: ["ignore", "pipe", "ignore"],
};

/**
 * Resolve the Bitbucket REST credential, mirroring bitbucket-auth.sh's order
 * and variable names exactly so a consumer configures ONE set of variables.
 *   BITBUCKET_ACCESS_TOKEN            → Bearer
 *   BITBUCKET_USERNAME + API token    → Basic
 * BITBUCKET_APP_PASSWORD is honoured as a legacy fallback for the Basic token.
 */
function bbAuthHeader(env = process.env) {
  if (env.BITBUCKET_ACCESS_TOKEN) {
    return { scheme: "bearer", header: `Bearer ${env.BITBUCKET_ACCESS_TOKEN}` };
  }
  const basic = env.BITBUCKET_API_TOKEN || env.BITBUCKET_APP_PASSWORD || "";
  if (env.BITBUCKET_USERNAME && basic) {
    const enc = Buffer.from(`${env.BITBUCKET_USERNAME}:${basic}`).toString(
      "base64",
    );
    return { scheme: "basic", header: `Basic ${enc}` };
  }
  return { scheme: "none", header: "" };
}

/** workspace/repo from the origin remote, portable across ssh and https forms. */
function bbSlug(execImpl) {
  const url = String(
    execImpl("git", ["remote", "get-url", "origin"], GIT_EXEC_OPTS) || "",
  ).trim();
  const m = url.match(/bitbucket\.org[:/](.+?)(?:\.git)?$/i);
  if (!m) throw new Error(`origin is not a Bitbucket remote: ${url}`);
  const parts = m[1].split("/").filter(Boolean);
  if (parts.length < 2)
    throw new Error(`could not parse workspace/repo from ${url}`);
  return { workspace: parts[0], repo: parts[parts.length - 1] };
}

module.exports = { bbAuthHeader, bbSlug };
