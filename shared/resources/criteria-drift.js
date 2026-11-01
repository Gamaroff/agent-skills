#!/usr/bin/env node
"use strict";

// criteria-drift — which criteria changed since a base, and how (task.248, obs #139).
//
// On task.234, qa-fix cycle 2 wrote "That is accepted as the cost…" under
// criterion #5 after the bound was missed, and left the box ticked. Five QA
// gates and the 5c review read the box as met; only the DoD AC agent failed
// it, for having no approver. This engine makes the change visible to QA.
//
// Two kinds of change, because develop and QA legitimately append evidence
// notes under a criterion, and the task.234 amendment was itself written
// inside one. The engine cannot tell a note from an amendment, so it does not
// try: it forces the reader to answer.
//
//   reworded  the criterion's existing words changed — on its own line, or in
//             a continuation line it already had. Unapproved → a finding.
//   appended  the criterion line is unchanged and its old continuation text is
//             a prefix of the new, ending at a word boundary: text was only
//             added. "within 5" → "within 50 ms" is reworded, not appended. The
//             QA gate records whether the addition relaxes the criterion.
//   added     a criterion with no counterpart at the base.
//   removed   a criterion with no counterpart now. Never approved: there is no
//             new text to carry an approver.
//
// A checkbox tick is not a change: the criterion text excludes the checkbox.
// `approved` means the CHANGED text carries `approved by <name>` that the base
// text did not: an approval written for an earlier amendment does not carry
// over to a later one.
//
// The base. In the develop pipelines the review step edits the criteria on the
// feature branch, so the PR base would report every review fix as an amendment.
// `--base-from-review <target>` therefore resolves, in order: the newest review
// report's `reviewed_blob` (the document exactly as reviewed) when the object
// store holds it; the document at the commit that added that report (`exact`
// says whether it is the reviewed blob); `git merge-base HEAD origin/<target>`.
// `base.kind` names which one answered. `--base <ref>` and `--base-blob <sha>`
// name a base directly.
//
// reason        exit  meaning
// clean         0     no criterion changed
// drift         0     changed[] is non-empty
// new-document  0     the document did not exist at the base
// no-criteria   1     the document has no criteria section now
// usage         2     bad arguments, or a base that cannot be read — never clean
//
// Usage:
//   criteria-drift.js --doc <path> (--base <ref> | --base-blob <sha> | --base-from-review <branch>) [--json]

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { readCriteriaEntries } = require("./criteria-section.js");
const { parse: parseDocId } = require("./doc-id.js");

const RE_LEADING_ID =
  /^(?:\*\*)?([A-Z]{1,6}-?\d+[A-Za-z]?)(?:\*\*)?\s*(?:[:.)—–-]|\*\*)\s*/;
const RE_APPROVED = /\bapproved by\s+([^,.;\n]+)/gi;

function norm(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

function shape(entry) {
  const line = norm(entry.line);
  const cont = norm(entry.continuation.filter((l) => l !== "").join(" "));
  return { line, cont, full: cont ? `${line} ${cont}` : line };
}

// `after` keeps all of `before` and adds whole words after it. A bare prefix test
// read "within 5" → "within 50 ms" as an addition (task.248 QA cycle 1, T248-QA-2).
// The added text must start with a space, or with a punctuation mark that is
// followed by a space or ends the text ("5 s" → "5 s, measured by x").
function extendsAtBoundary(before, after) {
  if (before === "") return true;
  if (!after.startsWith(before)) return false;
  return /^(?:\s|[,;:.!?)](?:\s|$))/.test(after.slice(before.length));
}

function approvals(text) {
  return [...String(text).matchAll(RE_APPROVED)].map((m) => norm(m[1]));
}

// Approvers in `after` beyond those already in `before` (multiset difference).
function newApprovers(before, after) {
  const left = approvals(before);
  const out = [];
  for (const a of approvals(after)) {
    const i = left.indexOf(a);
    if (i === -1) out.push(a);
    else left.splice(i, 1);
  }
  return out;
}

function idOf(s, pos) {
  const m = RE_LEADING_ID.exec(s.line);
  return m ? m[1] : `#${pos + 1}`;
}

// Align before and after by their criterion lines (longest common subsequence
// on the normalised line), then pair the unmatched ones in each gap in order.
function align(before, after) {
  const n = before.length;
  const m = after.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] =
        before[i].line === after[j].line
          ? L[i + 1][j + 1] + 1
          : Math.max(L[i + 1][j], L[i][j + 1]);
  const anchors = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (before[i].line === after[j].line) {
      anchors.push([i, j]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  anchors.push([n, m]);
  const pairs = [];
  let pi = 0;
  let pj = 0;
  for (const [ai, aj] of anchors) {
    const bs = [];
    const as = [];
    for (let i = pi; i < ai; i++) bs.push(i);
    for (let j = pj; j < aj; j++) as.push(j);
    const k = Math.min(bs.length, as.length);
    for (let x = 0; x < k; x++) pairs.push([bs[x], as[x]]);
    for (let x = k; x < bs.length; x++) pairs.push([bs[x], null]);
    for (let x = k; x < as.length; x++) pairs.push([null, as[x]]);
    if (ai < n && aj < m) pairs.push([ai, aj]);
    pi = ai + 1;
    pj = aj + 1;
  }
  return pairs;
}

/**
 * The decision, pure over the two document texts. `beforeBody` null means the
 * document did not exist at the base.
 */
function diffCriteria(beforeBody, afterBody) {
  const afterEntries = readCriteriaEntries(afterBody);
  if (afterEntries === null)
    return { reason: "no-criteria", changed: [], exitCode: 1 };
  if (beforeBody === null)
    return { reason: "new-document", changed: [], exitCode: 0 };
  const before = (readCriteriaEntries(beforeBody) || []).map(shape);
  const after = afterEntries.map(shape);
  const changed = [];
  for (const [i, j] of align(before, after)) {
    const b = i === null ? null : before[i];
    const a = j === null ? null : after[j];
    if (b && a && b.full === a.full) continue;
    let kind;
    if (!b) kind = "added";
    else if (!a) kind = "removed";
    else if (a.line === b.line && extendsAtBoundary(b.cont, a.cont))
      kind = "appended";
    else kind = "reworded";
    const approvers = a ? newApprovers(b ? b.full : "", a.full) : [];
    changed.push({
      id: a ? idOf(a, j) : idOf(b, i),
      kind,
      before: b ? b.full : null,
      after: a ? a.full : null,
      approved: approvers.length > 0,
      approver: approvers[0] ?? null,
    });
  }
  return { reason: changed.length ? "drift" : "clean", changed, exitCode: 0 };
}

// ── git ─────────────────────────────────────────────────────────────────────

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

class Usage extends Error {}

function repoPath(doc) {
  // git's toplevel is a real path, so the document must be one too: through a symlink
  // (macOS /var → /private/var, /proc/self/cwd) the relative path left the repository and every
  // base read as new-document at exit 0 (task.248 QA cycle 2, T248-QA2-3).
  let abs;
  try {
    abs = fs.realpathSync(path.resolve(doc));
  } catch {
    throw new Usage(`${doc} cannot be resolved`);
  }
  const dir = path.dirname(abs);
  let top;
  try {
    top = fs.realpathSync(git(["rev-parse", "--show-toplevel"], dir).trim());
  } catch {
    throw new Usage(`${doc} is not inside a git repository`);
  }
  const rel = path.relative(top, abs).split(path.sep).join("/");
  if (
    rel === "" ||
    rel === ".." ||
    rel.startsWith("../") ||
    path.isAbsolute(rel)
  )
    throw new Usage(`${doc} resolves outside its repository (${top})`);
  return { abs, top, rel };
}

function isCommit(ref, cwd) {
  try {
    git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

// The document at a commit, or null when the path is not in that tree.
function showAtRef(ref, p) {
  if (!isCommit(ref, p.top))
    throw new Usage(`base ${ref} is not a commit this repository has`);
  try {
    git(["cat-file", "-e", `${ref}:${p.rel}`], p.top);
  } catch {
    return null;
  }
  try {
    return git(["show", `${ref}:${p.rel}`], p.top);
  } catch (e) {
    throw new Usage(
      `cannot read ${p.rel} at ${ref}: ${String(e.stderr || e.message).trim()}`,
    );
  }
}

function showBlob(sha, p) {
  try {
    if (git(["cat-file", "-t", sha], p.top).trim() !== "blob")
      throw new Error("not a blob");
    return git(["cat-file", "blob", sha], p.top);
  } catch {
    throw new Usage(`base blob ${sha} cannot be read`);
  }
}

// The prefix the document's own review reports carry: its id, or for a bug filed beside its parent
// the bug's prefix (task.67.bug.3). null when doc-id.js cannot read the name.
function reviewPrefix(p) {
  const d = parseDocId(path.basename(p.abs));
  if (!d.ok || d.id === null) return null;
  return d.artifact && d.seq !== null ? `${d.id}.${d.artifact}.${d.seq}` : d.id;
}

// The newest review report OF THIS DOCUMENT, by its review.{N}. index. A co-located bug's review
// (task.9.bug.1.review.2.*) shares the directory and must never become the task's base (task.248
// QA cycle 2, T248-QA2-2).
function newestReviewBlob(p) {
  const dir = path.dirname(p.abs);
  const prefix = reviewPrefix(p);
  if (prefix === null) return null;
  const head = `${prefix}.review.`;
  let best = null;
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith(head)) continue;
    const m = /^(\d+)\.[^/]*\.md$/.exec(f.slice(head.length));
    if (!m) continue;
    const n = Number(m[1]);
    if (!best || n > best.n) best = { n, f };
  }
  if (!best) return null;
  const text = fs.readFileSync(path.join(dir, best.f), "utf8");
  const b = /^\*\*reviewed_blob:\*\*\s*`?([0-9a-f]{7,64})`?\s*$/m.exec(text);
  // The report is returned without a stamp too: a review never halts over a
  // missing reviewed_blob line, and the commit that added the report is still
  // a better base than the merge-base (task.248 QA cycle 1, T248-QA-1).
  return { sha: b ? b[1] : null, report: best.f };
}

// The commit that first added a review report beside the document, or null.
function reportCommit(report, p) {
  const rel = path.posix.join(path.posix.dirname(p.rel), report);
  try {
    const out = git(["log", "--diff-filter=A", "--format=%H", "--", rel], p.top)
      .trim()
      .split("\n");
    return out[out.length - 1] || null;
  } catch {
    return null;
  }
}

function resolveBase(opts, p) {
  if (opts.base)
    return {
      base: { kind: "ref", ref: opts.base },
      body: showAtRef(opts.base, p),
    };
  if (opts.baseBlob)
    return {
      base: { kind: "blob", ref: opts.baseBlob },
      body: showBlob(opts.baseBlob, p),
    };
  const rb = newestReviewBlob(p);
  if (rb) {
    if (rb.sha) {
      try {
        return {
          base: { kind: "reviewed-blob", ref: rb.sha, report: rb.report },
          body: showBlob(rb.sha, p),
        };
      } catch {
        // The stamp is a `git hash-object` of the document; nothing writes that
        // object to the store, so it is readable only once a commit carries the
        // exact reviewed bytes. Next best: the commit that added the report.
      }
    }
    const added = reportCommit(rb.report, p);
    if (added) {
      const body = showAtRef(added, p);
      if (body !== null) {
        // Unstamped, nothing says the bytes are the reviewed ones: never exact.
        const exact =
          rb.sha !== null &&
          git(["rev-parse", `${added}:${p.rel}`], p.top).trim() === rb.sha;
        return {
          base: { kind: "review-commit", ref: added, report: rb.report, exact },
          body,
        };
      }
    }
  }
  const target = opts.baseFromReview;
  let mb;
  try {
    mb = git(["merge-base", "HEAD", `origin/${target}`], p.top).trim();
  } catch {
    throw new Usage(
      `no reviewed_blob to use, and no merge-base with origin/${target}`,
    );
  }
  return {
    base: {
      kind: "merge-base",
      ref: mb,
      target,
      ...(rb && rb.sha ? { unreadableBlob: rb.sha } : {}),
    },
    body: showAtRef(mb, p),
  };
}

function parseArgs(argv) {
  const o = { json: false };
  const takes = {
    "--doc": "doc",
    "--base": "base",
    "--base-blob": "baseBlob",
    "--base-from-review": "baseFromReview",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (takes[a]) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--"))
        throw new Usage(`${a} needs a value`);
      o[takes[a]] = v;
      i++;
    } else throw new Usage(`unknown argument: ${a}`);
  }
  if (!o.doc) throw new Usage("--doc <path> is required");
  const bases = ["base", "baseBlob", "baseFromReview"].filter((k) => o[k]);
  if (bases.length !== 1)
    throw new Usage(
      "give exactly one of --base, --base-blob, --base-from-review",
    );
  return o;
}

function run(argv) {
  let json = argv.includes("--json");
  let result;
  try {
    const o = parseArgs(argv);
    json = o.json;
    let afterBody;
    try {
      afterBody = fs.readFileSync(o.doc, "utf8");
    } catch (e) {
      throw new Usage(`cannot read ${o.doc}: ${e.code || e.message}`);
    }
    const p = repoPath(o.doc);
    const { base, body } = resolveBase(o, p);
    result = { ...diffCriteria(body, afterBody), base };
  } catch (e) {
    if (!(e instanceof Usage)) throw e;
    result = { reason: "usage", changed: [], exitCode: 2, error: e.message };
  }
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (result.reason === "drift") {
    for (const c of result.changed)
      process.stdout.write(
        `${c.id} ${c.kind}${c.approved ? ` (approved by ${c.approver})` : " (no approver)"}\n`,
      );
  } else if (result.reason === "usage") {
    process.stderr.write(`usage: ${result.error}\n`);
  } else {
    process.stdout.write(`${result.reason}\n`);
  }
  process.exitCode = result.exitCode;
}

if (require.main === module) run(process.argv.slice(2));

module.exports = { diffCriteria, run };
