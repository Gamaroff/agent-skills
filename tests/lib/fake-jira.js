"use strict";

/**
 * A fake Jira, shared by the end-to-end suites of all four `sync-jira-*` skills.
 *
 * This started life as a module-local function inside
 * `skills/sync-jira-bug/tests/end-to-end.test.js`. It is here because it is the
 * only thing that has ever caught a convergence defect in these scripts: it
 * reads the payload back rather than trusting the caller's model of what was
 * sent. Unit tests over `diffFields` and `collectIssueFields` pass whether or
 * not the two agree with each other, which is precisely the class of bug
 * task.96 exists to fix.
 *
 * What it fakes is deliberately narrow — enough of the API for one create and
 * one update per issue, plus the endpoints the sync path actually calls. It is
 * not a Jira emulator and must not become one. A fake Jira cannot prove a real
 * tenant accepts a payload; it proves the half that was broken.
 *
 * Run: node --test 'skills/sync-jira-*\/tests/*.test.js'
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const BASE = "https://example.atlassian.net";
const BB = "https://bitbucket.org/ws/repo";

const ENV = {
  JIRA_URL: BASE,
  JIRA_API_TOKEN: "t",
  JIRA_USER_EMAIL: "e@example.com",
  JIRA_PROJECT_KEY: "PROJ",
  BITBUCKET_REPO_URL: BB,
  JIRA_DOC_BRANCH: "develop",
};

const DEFAULT_ISSUE_TYPES = [
  { id: "10000", name: "Epic" },
  { id: "10001", name: "Story" },
  { id: "10002", name: "Task" },
  { id: "10004", name: "Bug" },
];

const DEFAULT_TRANSITIONS = [
  { id: "21", name: "Start", to: { name: "In Progress" } },
  {
    id: "41",
    name: "Close",
    to: { name: "Done", statusCategory: { key: "done" } },
  },
];

/**
 * Build a fake Jira.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.projectKey="PROJ"]  key new issues are minted under
 * @param {number}  [opts.nextKey=901]        first issue number to mint
 * @param {string}  [opts.boardType="kanban"] `/board/{id}/configuration` type.
 *   "kanban" makes `moveToBacklog` a clean no-op; "scrum" exercises the real
 *   `POST /rest/agile/1.0/backlog/issue` path, recorded in `state.backlog`.
 * @param {string}  [opts.projectStyle="next-gen"] `/rest/api/3/project/{key}`
 *   style. Only `sync-jira-story` reads it: "classic" drives the Epic Link
 *   customfield path, anything else drives team-managed `parent`.
 * @param {Array}   [opts.issueTypes]  createmeta issue types
 * @param {Array}   [opts.transitions] transitions offered on every issue
 * @param {Array}   [opts.priorities]  `/rest/api/3/priority` response
 * @returns {{state: object, fetchImpl: Function}}
 */
function fakeJira(opts = {}) {
  const {
    projectKey = "PROJ",
    nextKey = 901,
    boardType = "kanban",
    projectStyle = "next-gen",
    issueTypes = DEFAULT_ISSUE_TYPES,
    transitions = DEFAULT_TRANSITIONS,
    priorities = [{ name: "Highest" }, { name: "High" }, { name: "Medium" }],
  } = opts;

  const state = {
    issues: {},
    links: [],
    labels: {},
    requests: [],
    backlog: [],
    nextKey,
  };

  const ok = (body) => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  const empty = (status) => ({
    ok: status < 400,
    status,
    json: async () => ({}),
    text: async () => "",
  });

  const fetchImpl = async (url, opts2 = {}) => {
    const method = opts2.method || "GET";
    const body = opts2.body ? JSON.parse(opts2.body) : null;
    state.requests.push({ url, method, body });

    if (url.includes("/rest/api/3/priority")) return ok(priorities);

    if (url.includes("/rest/api/3/search/jql")) {
      const m = /labels = "([^"]+)"/.exec(body.jql || "");
      const key = m && state.labels[m[1]];
      return ok({ issues: key ? [{ key, fields: {} }] : [] });
    }

    if (url.includes("/issuetypes") || url.includes("createmeta"))
      return ok({ issueTypes });

    if (url.includes("/rest/api/3/issueLinkType"))
      return ok({
        issueLinkTypes: [
          {
            id: "10",
            name: "Blocks",
            inward: "is blocked by",
            outward: "blocks",
          },
          {
            id: "20",
            name: "Relates",
            inward: "relates to",
            outward: "relates to",
          },
        ],
      });

    if (url.includes("/rest/api/3/issueLink") && method === "POST") {
      state.links.push(body);
      return empty(201);
    }

    // Backlog placement. Only reached when the board reports `scrum`; the
    // script skips it entirely on kanban, so a kanban fake proves nothing
    // about this endpoint either way.
    if (url.includes("/rest/agile/1.0/backlog/issue") && method === "POST") {
      for (const k of body.issues || []) state.backlog.push(k);
      return empty(204);
    }

    // Board config. `moveToBacklog` reads `.type` and returns early unless it
    // is exactly "scrum".
    if (url.includes("/board/") && url.includes("/configuration"))
      return ok({ type: boardType });

    // Project statuses — the workflow-probe path, not the sync path. Matched
    // BEFORE the bare project route below, which its URL also contains.
    if (url.includes("/rest/api/3/project/") && url.endsWith("/statuses"))
      return ok(
        issueTypes.map((t) => ({
          name: t.name,
          statuses: [
            { name: "To Do" },
            { name: "In Progress" },
            { name: "Done" },
          ],
        })),
      );

    // Project style. `detectProjectStyle` reads `.style`; "classic" means the
    // Epic Link customfield, anything else means team-managed `parent`.
    if (url.includes("/rest/api/3/project/"))
      return ok({ key: projectKey, style: projectStyle });

    const issueMatch = /\/rest\/api\/3\/issue\/([A-Z]+-\d+)/.exec(url);
    if (issueMatch) {
      const key = issueMatch[1];
      const issue = state.issues[key];
      if (!issue) return empty(404);

      if (url.includes("/transitions")) {
        if (method === "POST") {
          // Apply it. A stub whose status never moves would make every run look
          // like a fresh transition, and the "second run changes nothing"
          // assertion would be testing the stub rather than the skill.
          const chosen = transitions.find((t) => t.id === body.transition.id);
          if (chosen) issue.status = chosen.to.name;
          issue.updated = new Date(Date.now() + 1000).toISOString();
          return empty(204);
        }
        return ok({ transitions });
      }

      if (method === "PUT") {
        Object.assign(issue.fields, body.fields);
        issue.updated = new Date(Date.now() + 1000).toISOString();
        return ok({ fields: { ...issue.fields, updated: issue.updated } });
      }

      if (url.includes("fields=issuelinks"))
        return ok({
          fields: {
            issuelinks: state.links
              .filter((l) => l.inwardIssue.key === key)
              .map((l) => ({
                type: { name: l.type.name },
                outwardIssue: { key: l.outwardIssue.key },
              })),
          },
        });

      return ok({
        key,
        fields: {
          ...issue.fields,
          updated: issue.updated,
          status: { name: issue.status },
        },
      });
    }

    if (url.endsWith("/rest/api/3/issue") && method === "POST") {
      const key = `${projectKey}-${state.nextKey++}`;
      state.issues[key] = {
        fields: { ...body.fields },
        updated: new Date().toISOString(),
        status: "To Do",
      };
      for (const l of body.fields.labels || []) state.labels[l] = key;
      // `text()` must carry the JSON too: sync-jira-epic parses the create
      // response with `JSON.parse(await resp.text())` where its siblings call
      // `resp.json()`. A fake that returns "" here fails epic only, with an
      // error that names Jira rather than the stub.
      return {
        ok: true,
        status: 201,
        json: async () => ({ key }),
        text: async () => JSON.stringify({ key }),
      };
    }

    return empty(404);
  };

  return { state, fetchImpl };
}

// ---------------------------------------------------------------------------
// Reading the payload back
// ---------------------------------------------------------------------------

/** Walk an ADF doc and return every link mark's href, in document order. */
function hrefsIn(node, acc = []) {
  if (Array.isArray(node)) {
    for (const n of node) hrefsIn(n, acc);
    return acc;
  }
  if (!node || typeof node !== "object") return acc;
  for (const mark of node.marks || [])
    if (mark.type === "link" && mark.attrs?.href) acc.push(mark.attrs.href);
  if (node.content) hrefsIn(node.content, acc);
  return acc;
}

/**
 * The description the fake Jira is holding — the same bytes
 * `GET /issue/{key}?fields=description` would hand back.
 */
function descriptionOf(state, key) {
  return state.issues[key].fields.description;
}

/**
 * Count the writes that actually reached the issue.
 *
 * This is the assertion the change summary cannot make on its own: suppressing
 * the "Updated: labels" message without fixing the diff would leave the summary
 * clean and the PUT still firing. Counting is also why this is asserted rather
 * than timed — a wall-clock assertion here would be load-flaky.
 *
 * @param {object} state
 * @param {object} [filter]
 * @param {string} [filter.method]      e.g. "PUT"
 * @param {string} [filter.issueKey]    only requests addressed to this issue
 * @returns {number}
 */
function countRequests(state, filter = {}) {
  const { method, issueKey } = filter;
  return state.requests.filter((r) => {
    if (method && r.method !== method) return false;
    if (issueKey && !r.url.includes(`/rest/api/3/issue/${issueKey}`))
      return false;
    // A transition is a POST, never a PUT, so no exclusion is needed for the
    // PUT count — but an explicit issueKey filter would otherwise also match
    // the transition sub-resource on a POST query.
    return true;
  }).length;
}

/** PUTs issued against one issue — the field-update writes, nothing else. */
function putCount(state, issueKey) {
  return countRequests(state, { method: "PUT", issueKey });
}

// ---------------------------------------------------------------------------
// A repo on disk, because the scripts resolve paths and links from a real tree
// ---------------------------------------------------------------------------

/**
 * Create a temp git repo and write `files` into it.
 *
 * @param {string} prefix              mkdtemp prefix, e.g. "story-e2e-"
 * @param {Record<string,string>} files  repo-relative path → contents
 * @returns {string} the realpath'd repo root
 */
function gitRepo(prefix, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const root = fs.realpathSync(dir);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
  return root;
}

/**
 * Build a `runSync(root, file, fetchImpl, extraArgs)` driver bound to one skill.
 *
 * The script identity used to be baked into the runner, which is what made the
 * bug suite's harness unusable by its three siblings.
 *
 * @param {object} cfg
 * @param {{run: Function}} cfg.module   the required sync script
 * @param {string} cfg.cliName           argv[1], e.g. "sync-jira-story"
 * @param {object} [cfg.env]             env overrides merged over ENV
 */
function makeRunner({ module: mod, cliName, env = {} }) {
  const merged = { ...ENV, ...env };
  return async function runSync(root, file, fetchImpl, extraArgs = []) {
    const cwd = process.cwd();
    const saved = {};
    for (const [k, v] of Object.entries(merged)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    process.chdir(root);
    try {
      return await mod.run({
        argv: ["node", cliName, "--file", file, ...extraArgs],
        fetchImpl,
      });
    } finally {
      process.chdir(cwd);
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
}

module.exports = {
  BASE,
  BB,
  ENV,
  fakeJira,
  hrefsIn,
  descriptionOf,
  countRequests,
  putCount,
  gitRepo,
  makeRunner,
};
