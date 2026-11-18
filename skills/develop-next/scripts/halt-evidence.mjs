#!/usr/bin/env node
/**
 * halt-evidence.mjs — does the evidence contradict a recorded HALT? (task.279, obs #53, #66)
 *
 * develop-next Step 0.1a stops on `halted: true`. That flag is a record, and an operator can resolve the
 * halt out of band (finish the item by hand, merge its PR) without clearing it. This reader looks at the
 * same facts Step 0.1b reconciles: the item's document and its PR. The halt is **resolved out of band**
 * only when BOTH hold: the document is `accepted` (a bug: `closed`) AND the PR is MERGED. Anything else —
 * either missing, a PR state that could not be read, a halt the run state never tied to a PR — the halt
 * stands, and the caller stops exactly as before.
 *
 * Usage:
 *   halt-evidence.mjs --state <run-state.json> --pr-state <MERGED|OPEN|CLOSED|unknown> [--apply] [--json]
 *
 * `--pr-state` is the caller's own platform read (gh or the Bitbucket REST arm, as Step 0.1b does); this
 * script has no network. An absent or unrecognised value reads as `unknown`, which never resolves.
 * `--apply` rewrites the run state through the same advance as Step 0.1b (`merged: true`, `halted: false`,
 * `haltKind: null`), and only when resolved. The evidence is recorded in `haltResolvedBy`.
 *
 * Output: one JSON object on stdout with a `reason`.
 * Exit codes: 0 = resolved out of band (and, with --apply, written); 1 = the halt stands, or the write
 * failed; 2 = usage error.
 *
 * reason: resolved-out-of-band | not-halted | no-evidence | no-document | document-not-done |
 *         pr-not-merged | pr-unknown | write-failed | usage
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PR_STATES = new Set(["MERGED", "OPEN", "CLOSED"]);

/** The `status:` value of a document's YAML frontmatter, or "" when it has none. */
export function readDocStatus(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return "";
  const line = /^status:[ \t]*(.*)$/m.exec(m[1]);
  return line ? line[1].replace(/^["']|["']$/g, "").trim() : "";
}

/** A bug document never reads `accepted`: its lifecycle ends at `closed`. */
export function isBugDocument(file) {
  return /(^|\.)bug\.[0-9]+\./.test(path.basename(file));
}

/**
 * Pure decision. `state` is the parsed run-state object, `docStatus` the document's frontmatter status
 * (null when the document could not be read), `prState` the caller's PR read.
 * Returns { resolved, reason, evidence }.
 */
export function decide({ state, docStatus, prState, docFile }) {
  if (!state || state.halted !== true)
    return { resolved: false, reason: "not-halted", evidence: {} };
  const prNumber = state.prNumber;
  if (prNumber === null || prNumber === undefined || prNumber === "")
    return { resolved: false, reason: "no-evidence", evidence: {} };
  if (docStatus === null)
    return { resolved: false, reason: "no-document", evidence: { prNumber } };
  const done = isBugDocument(docFile || "") ? "closed" : "accepted";
  if (docStatus !== done)
    return {
      resolved: false,
      reason: "document-not-done",
      evidence: { prNumber, docStatus, expected: done },
    };
  const pr = PR_STATES.has(prState) ? prState : "unknown";
  if (pr === "unknown")
    return {
      resolved: false,
      reason: "pr-unknown",
      evidence: { prNumber, docStatus },
    };
  if (pr !== "MERGED")
    return {
      resolved: false,
      reason: "pr-not-merged",
      evidence: { prNumber, docStatus, prState: pr },
    };
  return {
    resolved: true,
    reason: "resolved-out-of-band",
    evidence: { prNumber, docStatus, prState: pr },
  };
}

function parseArgs(argv) {
  const out = { apply: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--json") out.json = true;
    else if (a === "--state" || a === "--pr-state") {
      if (i + 1 >= argv.length) return { error: `${a} needs a value` };
      out[a === "--state" ? "state" : "prState"] = argv[++i];
    } else return { error: `unknown argument: ${a}` };
  }
  if (!out.state) return { error: "--state <run-state.json> is required" };
  return out;
}

function emit(obj, code) {
  process.stdout.write(JSON.stringify(obj) + "\n");
  process.exitCode = code; // never process.exit() after an async stdout write (bug.3)
}

export function main(argv) {
  const args = parseArgs(argv);
  if (args.error) return emit({ reason: "usage", error: args.error }, 2);

  let state;
  try {
    state = JSON.parse(fs.readFileSync(args.state, "utf8"));
  } catch (e) {
    return emit(
      { reason: "usage", error: `run state unreadable: ${e.message}` },
      2,
    );
  }

  let docStatus = null;
  const docFile = state && state.commandArg;
  if (docFile) {
    try {
      docStatus = readDocStatus(fs.readFileSync(docFile, "utf8"));
    } catch {
      docStatus = null;
    }
  }

  const verdict = decide({
    state,
    docStatus,
    prState: args.prState,
    docFile,
  });
  if (!verdict.resolved) return emit({ ...verdict }, 1);

  if (args.apply) {
    const next = {
      ...state,
      merged: true,
      halted: false,
      haltKind: null,
      haltResolvedBy: verdict.evidence,
    };
    const tmp = `${args.state}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n");
      fs.renameSync(tmp, args.state);
    } catch (e) {
      try {
        fs.rmSync(tmp, { force: true });
      } catch {
        /* nothing to clean */
      }
      return emit(
        {
          ...verdict,
          resolved: false,
          reason: "write-failed",
          error: e.message,
        },
        1,
      );
    }
    return emit({ ...verdict, applied: true }, 0);
  }
  return emit({ ...verdict, applied: false }, 0);
}

// Real paths on both sides: invoked through the .agents/skills symlink, argv[1] is the link (obs #126).
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}
if (isInvokedDirectly()) main(process.argv.slice(2));
