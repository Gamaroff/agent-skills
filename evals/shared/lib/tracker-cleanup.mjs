"use strict";
/**
 * Tracker cleanup helper for live scenarios.
 *
 * After a live scenario runs, the skill should have written
 *   <sandbox>/.eval/tracker-receipt.json
 * with shape:
 *   {
 *     "createdInRealTracker": true,
 *     "platform": "jira" | "github",
 *     "issueKey": "PROJ-123" | "42",
 *     "repo":     "owner/name"     // github only
 *   }
 *
 * This helper reads the receipt and deletes / closes / archives the issue.
 * Idempotent — safe to call twice; safe to call on a receipt that points to
 * an already-deleted issue.
 *
 * NOTE: this module shells out to the platform CLI (`jira` / `gh`) rather
 * than driving REST directly, to avoid baking auth flows into the eval
 * harness. The same CLIs the skills themselves call in production. If the
 * binaries are absent the cleanup is a no-op + warning, NOT a hard error —
 * we never want cleanup failure to mask the assertion result.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

function which(bin) {
  try { return execFileSync("which", [bin], { encoding: "utf-8" }).trim() || null; }
  catch { return null; }
}

function warn(msg) { process.stderr.write(`tracker-cleanup: WARN ${msg}\n`); }

export function cleanupFromReceipt(sandbox) {
  const receiptPath = path.join(sandbox, ".eval", "tracker-receipt.json");
  if (!fs.existsSync(receiptPath)) {
    warn(`no receipt at ${receiptPath} — nothing to clean up`);
    return { cleaned: false, reason: "no receipt" };
  }
  let receipt;
  try { receipt = JSON.parse(fs.readFileSync(receiptPath, "utf-8")); }
  catch (e) { warn(`receipt unparseable: ${e.message}`); return { cleaned: false, reason: "bad receipt" }; }

  if (!receipt.createdInRealTracker) {
    return { cleaned: false, reason: "receipt marked as non-real (DRY_RUN?)" };
  }

  switch (receipt.platform) {
    case "jira":   return cleanupJira(receipt);
    case "github": return cleanupGithub(receipt);
    default:       warn(`unknown platform: ${receipt.platform}`); return { cleaned: false };
  }
}

function cleanupJira(receipt) {
  const bin = which("jira");
  if (!bin) { warn("`jira` cli not on PATH — leaving issue in place"); return { cleaned: false }; }
  if (!receipt.issueKey) { warn("receipt missing issueKey"); return { cleaned: false }; }
  // jira-cli supports `jira issue delete <KEY>`. Some installs require --force.
  const res = spawnSync("jira", ["issue", "delete", receipt.issueKey, "--force"], { encoding: "utf-8" });
  if (res.status !== 0) {
    warn(`jira delete ${receipt.issueKey} exited ${res.status}: ${(res.stderr || "").slice(0, 200)}`);
    return { cleaned: false };
  }
  return { cleaned: true, platform: "jira", issueKey: receipt.issueKey };
}

function cleanupGithub(receipt) {
  const bin = which("gh");
  if (!bin) { warn("`gh` cli not on PATH — leaving issue in place"); return { cleaned: false }; }
  if (!receipt.issueKey || !receipt.repo) {
    warn("receipt missing issueKey/repo"); return { cleaned: false };
  }
  // GitHub does not allow issue *deletion* via gh — close + lock is the
  // accepted "cleanup" pattern for ephemeral test issues.
  const close = spawnSync("gh", ["issue", "close", receipt.issueKey, "-R", receipt.repo, "-c", "eval cleanup"], { encoding: "utf-8" });
  if (close.status !== 0) {
    warn(`gh issue close ${receipt.issueKey} exited ${close.status}: ${(close.stderr || "").slice(0, 200)}`);
    return { cleaned: false };
  }
  spawnSync("gh", ["issue", "lock", receipt.issueKey, "-R", receipt.repo], { encoding: "utf-8" });
  return { cleaned: true, platform: "github", issueKey: receipt.issueKey };
}
