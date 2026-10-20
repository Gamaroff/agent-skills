#!/usr/bin/env node
/**
 * doc-link-branch — the branch a tracker card's document link points at.
 *
 * Every card links to its document as `…/blob/<branch>/<path>`. The branch used
 * to be the current branch's upstream, whatever it was — so a card created while
 * HEAD was another work item's feature branch linked to a branch that never
 * carries the document, and the link 404'd once that branch was deleted
 * (obs #287, carrier for #188). Eight GitHub skills each derived it with the same
 * `@{u}` line and `jira-sync.js` with a ninth copy; the copies already disagreed.
 *
 * The rule, defined once here:
 *
 *   explicit  →  configured  →  upstream, IF it names the document's work item  →  default
 *
 * "Names the work item" is read from the branch's last path segment, which must
 * start with the document's id or its parent's id (task.N for task.N.bug.M,
 * story.P.E.S for story.P.E.S.bug.M) followed by ".", "-" or the end — so
 * `task.20` never matches `feature/task.200.x`, and `bugfix/task.144-cli-decline`
 * matches task.144. Two more shapes count:
 *   - a story (or a story's bug) on its epic's integration branch: the branch the
 *     epic document declares as `integration_branch`, or a last segment that
 *     starts with `{P}.{E}` (the default `epic/{p}.{n}.{slug}` pattern);
 *   - a bug document on a `hotfix/v*` branch, which carries no work-item id.
 * Ids are read by doc-id.js, never by a pattern of their own.
 *
 * Pure functions: workItemOf, branchNamesWorkItem, resolveDocLinkBranch,
 * stripRemotePrefix. I/O, injectable: integrationBranchOf, currentUpstream.
 *
 * CLI:
 *   doc-link-branch.js --doc <path> [--explicit <branch>] [--default <branch>] [--json]
 * prints the branch on one line. Without --default it asks `gh repo view` for the
 * repository's default branch once, and falls back to `develop` — the GitHub
 * sites' long-standing fallback. Exit 0 = resolved, 2 = usage error.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const docId = require("./doc-id.js");

const REAL_FS = {
  readFile: (p) => fs.readFileSync(p, "utf8"),
};

// The work item a document belongs to, from its filename. A bug keeps its parent
// as `parent`, because a QA bug is filed — and its card created — on the parent's
// own branch. An artifact of a work item (its review, plan, QA report) belongs to
// that work item. Null when doc-id cannot read the name.
function workItemOf(docPath) {
  const p = docId.parse(path.basename(String(docPath || "")));
  if (!p.ok) return null;
  const nestedBug = p.artifact === "bug" && p.seq !== null;
  return {
    id: nestedBug ? `${p.id}.bug.${p.seq}` : p.id,
    parent: nestedBug ? p.id : null,
    kind: p.kind,
    isBug: p.kind === "bug" || nestedBug,
    prd: p.prd,
    epic: p.epic,
  };
}

// True when `segment` is `id`, or starts with `id` followed by "." or "-".
function segmentNames(segment, id) {
  return (
    segment === id ||
    segment.startsWith(`${id}.`) ||
    segment.startsWith(`${id}-`)
  );
}

// True when `segment` names `id` and is not a bug of it other than `self`. A bug branch's segment
// is `{parent}.bug.{N}.{slug}`, which starts with `{parent}.` — so without this, the branch of bug 4
// named its parent's own document and every sibling bug (task.200 QA cycle 2, TASK-200-007).
function segmentNamesItem(segment, id, self) {
  if (!segmentNames(segment, id)) return false;
  const bug = segment.slice(id.length).match(/^\.bug\.(\d+)(?=$|[.-])/);
  return !bug || `${id}.bug.${bug[1]}` === self;
}

function branchNamesWorkItem(branch, docPath, { integrationBranch = "" } = {}) {
  const item = workItemOf(docPath);
  const b = String(branch || "").trim();
  if (!item || !b) return false;
  const segment = b.slice(b.lastIndexOf("/") + 1);
  if (
    [item.id, item.parent].some(
      (id) => id && segmentNamesItem(segment, id, item.id),
    )
  ) {
    return true;
  }
  if (item.isBug && b.startsWith("hotfix/v")) return true;
  if (item.kind === "story") {
    if (integrationBranch && b === String(integrationBranch).trim())
      return true;
    // A bare segment is not an integration branch: it needs the prefix the
    // pattern gives it (`epic/` by default), whatever that prefix is.
    if (b !== segment && segmentNames(segment, `${item.prd}.${item.epic}`)) {
      return true;
    }
  }
  return false;
}

function resolveDocLinkBranch({
  explicit,
  configured,
  upstream,
  defaultBranch,
  docPath,
  integrationBranch,
} = {}) {
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  if (configured && String(configured).trim()) return String(configured).trim();
  if (
    upstream &&
    branchNamesWorkItem(upstream, docPath, { integrationBranch })
  ) {
    return String(upstream).trim();
  }
  return defaultBranch;
}

// "origin/feature/foo" -> "feature/foo"; "" / "noref" -> null. Remote names
// cannot contain "/", but branch names can, so strip only up to the FIRST slash.
function stripRemotePrefix(upstreamRef) {
  if (!upstreamRef) return null;
  const slash = upstreamRef.indexOf("/");
  return slash === -1 ? null : upstreamRef.slice(slash + 1);
}

// The current branch's upstream without its remote name, or null on a detached
// HEAD, no upstream, or no git.
function currentUpstream({ cwd } = {}) {
  try {
    const ref = execFileSync(
      "git",
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return stripRemotePrefix(ref);
  } catch (_) {
    return null;
  }
}

// The integration branch a story's epic declares, read from the epic document
// above it (`…/epic.P.E.slug/epic.P.E.slug.md`, frontmatter `integration_branch`).
// "" for anything that is not a story, or an epic that declares none.
function integrationBranchOf(docPath, { io = REAL_FS } = {}) {
  const item = workItemOf(docPath);
  if (!item || item.kind !== "story") return "";
  let dir = path.dirname(path.resolve(String(docPath)));
  for (;;) {
    const base = path.basename(dir);
    const p = docId.parse(base);
    if (
      p.ok &&
      p.kind === "epic" &&
      p.artifact === null &&
      p.prd === item.prd &&
      p.epic === item.epic
    ) {
      try {
        return docId.frontmatterField(
          io.readFile(path.join(dir, `${base}.md`)),
          "integration_branch",
        );
      } catch (_) {
        return "";
      }
    }
    const up = path.dirname(dir);
    if (up === dir) return "";
    dir = up;
  }
}

function ghDefaultBranch() {
  try {
    const name = execFileSync(
      "gh",
      [
        "repo",
        "view",
        "--json",
        "defaultBranchRef",
        "-q",
        ".defaultBranchRef.name",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return name || "develop";
  } catch (_) {
    return "develop";
  }
}

const USAGE =
  "usage: doc-link-branch.js --doc <path> [--explicit <branch>] [--default <branch>] [--json]";

function runCli(argv, deps = {}) {
  const {
    upstream = () => currentUpstream(),
    defaultBranch = ghDefaultBranch,
    integrationBranch = (doc) => integrationBranchOf(doc),
  } = deps;
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--json") {
      args.json = true;
      continue;
    }
    if (!["--doc", "--explicit", "--default"].includes(flag)) {
      return { exitCode: 2, error: `unknown argument: ${flag}\n${USAGE}` };
    }
    const value = argv[i + 1];
    if (
      value === undefined ||
      (value.startsWith("--") && flag !== "--explicit")
    ) {
      return { exitCode: 2, error: `${flag} needs a value\n${USAGE}` };
    }
    args[flag.slice(2)] = value;
    i++;
  }
  if (!args.doc) return { exitCode: 2, error: `--doc is required\n${USAGE}` };
  const up = upstream();
  const branch = resolveDocLinkBranch({
    explicit: args.explicit,
    upstream: up,
    // Asked only when it is the answer: an explicit branch or a matching upstream
    // needs no default, and a given --default needs no `gh` call at all.
    defaultBranch: undefined,
    docPath: args.doc,
    integrationBranch: integrationBranch(args.doc),
  });
  const resolved = branch || args.default || defaultBranch();
  return {
    exitCode: 0,
    payload: { branch: resolved, upstream: up, doc: args.doc },
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const r = runCli(argv);
  if (r.exitCode === 2) {
    process.stderr.write(`doc-link-branch: ${r.error}\n`);
  } else {
    process.stdout.write(
      argv.includes("--json")
        ? JSON.stringify(r.payload) + "\n"
        : `${r.payload.branch}\n`,
    );
  }
  process.exitCode = r.exitCode;
}

module.exports = {
  workItemOf,
  branchNamesWorkItem,
  resolveDocLinkBranch,
  stripRemotePrefix,
  currentUpstream,
  integrationBranchOf,
  runCli,
};
