/**
 * jira-interception.test.mjs — the two layers that make a restricted
 * `access.tracker` real for Jira REST (task.53).
 *
 * Hermetic: no network, no credentials, no tracker. Every non-GET assertion
 * runs against a `fetchImpl` stub that THROWS on any write, so "no mutation
 * reached the network" is proven by the suite rather than asserted by reading
 * the code. The three invariants that matter, and why:
 *
 *   BYTE-IDENTICAL UNDER `full` — this file sits behind every Jira operation in
 *               14 skills. If `full` mode drifts, the blast radius is the whole
 *               library, so §1 pins it: same transport call, same options,
 *               nothing journalled.
 *
 *   FAIL-CLOSED — a mutation NOBODY annotated must still be refused. §3 removes
 *               the annotation and asserts the record is still written and the
 *               write still never happens. Layer 2 makes records legible; it is
 *               not what makes them safe.
 *
 *   ONE RECORD PER LOGICAL MUTATION — the gate sits above the retry loop, and a
 *               deferral answers `ok`, so no caller's retry ladder is entered.
 *               §5 and §7 watch both halves of that.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.join(HERE, "..");
const REPO = path.join(SHARED, "..", "..");

const lib = require(path.join(SHARED, "jira-sync.js"));
const dm = require(path.join(SHARED, "defer-mutation.js"));
const hr = require(path.join(SHARED, "handover-render.js"));

const BASE = "https://acme.atlassian.net";

// Async-aware on purpose. A `try/finally` around a bare `fn(dir)` removes the
// directory the moment the async body hits its first await, so every record
// written afterwards lands in a directory nobody reads — the tests then pass
// vacuously with an empty journal.
async function withTmp(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-intercept-"));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function journal(dir) {
  const f = path.join(dir, ".claude", "state", "tracker-actions.jsonl");
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/**
 * A transport that refuses to perform a write.
 *
 * The Jira JQL search is the ONE read that uses POST, so it is allowed through
 * — that is the behaviour §6 pins. Everything else with a method other than GET
 * throws, which is what turns "the gate leaked" into a red test rather than a
 * silent tracker mutation in a suite nobody watches.
 */
function throwOnWrite(calls = []) {
  return async (url, opts = {}) => {
    calls.push({ url, opts });
    const method = String(opts.method || "GET").toUpperCase();
    if (method !== "GET" && !/\/rest\/api\/3\/search/.test(url)) {
      throw new Error(`a write reached the network: ${method} ${url}`);
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      async json() {
        return { key: "PROJ-1", fields: { updated: "2026-08-18T09:00:00Z" } };
      },
      async text() {
        return "{}";
      },
    };
  };
}

// ── 1. `full` mode is byte-identical ───────────────────────────────────────

test("§1 under `full` a non-GET reaches the transport unchanged and journals nothing", async () => {
  await withTmp(async (dir) => {
    const calls = [];
    const seen = [];
    const fetchImpl = async (url, opts) => {
      seen.push({ url, opts });
      return {
        ok: true,
        status: 204,
        headers: { get: () => null },
        async json() {
          return {};
        },
      };
    };
    const http = lib.makeHttp({ fetchImpl, access: "full", cwd: dir });
    const resp = await http(`${BASE}/rest/api/3/issue/PROJ-1`, {
      method: "PUT",
      headers: { Accept: "application/json" },
      body: "{}",
    });
    assert.equal(resp.status, 204);
    assert.equal(
      resp.deferred,
      undefined,
      "a full-mode response is not marked",
    );
    assert.equal(seen.length, 1, "exactly one transport call");
    assert.equal(seen[0].opts.method, "PUT");
    assert.equal(seen[0].opts.body, "{}");
    assert.deepEqual(Object.keys(seen[0].opts).sort(), [
      "body",
      "headers",
      "method",
      "signal",
    ]);
    assert.deepEqual(journal(dir), [], "full mode journals nothing");
    assert.equal(calls.length, 0);
  });
});

test("§1 an unannotated `defer:` option never reaches the transport in full mode", async () => {
  await withTmp(async (dir) => {
    const seen = [];
    const fetchImpl = async (url, opts) => {
      seen.push(opts);
      return { ok: true, status: 204, headers: { get: () => null } };
    };
    const http = lib.makeHttp({ fetchImpl, access: "full", cwd: dir });
    await http(`${BASE}/rest/api/3/issue/PROJ-1`, {
      method: "PUT",
      body: "{}",
      defer: { kind: "jira.issue.update", intent: "x" },
    });
    assert.ok(
      !("defer" in seen[0]),
      "`defer` is ours, not fetch's — it must be stripped before the request",
    );
  });
});

// ── 2. Every annotated kind records once, legibly, and never writes ────────

test("§2 putIssueAtomic defers with the field names and values, not a body blob", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const res = await lib.putIssueAtomic({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      issueKey: "PROJ-1",
      fields: {
        summary: "Rename the widget",
        customfield_10001: { name: "Platform" },
        description: { type: "doc", content: [] },
      },
    });
    assert.equal(res.deferred, true);
    assert.equal(res.updated, null, "the deferred UPDATE shape");
    assert.ok(res.record, "the caller is told which record to look for");

    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.issue.update");
    assert.ok(recs[0].intent.includes("PROJ-1"));
    assert.equal(recs[0].target.issue, "PROJ-1");
    assert.equal(recs[0].desired.summary, "Rename the widget");
    assert.equal(
      recs[0].desired.customfield_10001,
      "Platform",
      'the point of layer 2: "Platform", not {"name":"Platform"}',
    );
    assert.equal(
      recs[0].desired.description,
      "(structured value — see the work-item document)",
      "an ADF blob is NAMED, never dumped into a checklist",
    );
  });
});

test("§2 moveToBacklog defers and does not claim the issue moved", async () => {
  await withTmp(async (dir) => {
    const lines = [];
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const res = await lib.moveToBacklog({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      boardId: "42",
      issueKey: "PROJ-1",
      output: { info: (m) => lines.push(m), warn: (m) => lines.push(m) },
    });
    assert.equal(res.moved, false, "a refusal is not a move");
    assert.equal(res.reason, "deferred");
    assert.ok(
      !lines.some((l) => /Moved to backlog/.test(l)),
      "reporting a move that did not happen is the drift this gate removes",
    );

    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.backlog.add");
    assert.match(recs[0].intent, /backlog of board 42/);
  });
});

test("§2 an annotated create records jira.issue.create with a legible summary", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const resp = await http(`${BASE}/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify({ fields: {} }),
      defer: {
        kind: "jira.issue.create",
        intent: 'Create the Jira story "Rename the widget" in PROJ',
        target: { name: "Rename the widget", url: `${BASE}/rest/api/3/issue` },
        desired: lib.summariseFields({ summary: "Rename the widget" }),
      },
    });
    assert.equal(resp.deferred, true);
    assert.equal(resp.status, 202);
    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.issue.create");
    assert.equal(
      recs[0].produces,
      "jira.issueKey",
      "the roster default survives — dependants consume it via dependsOn",
    );
  });
});

test("§2 every intent written by this gate is non-empty", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    await lib.putIssueAtomic({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      issueKey: "PROJ-1",
      fields: { summary: "x" },
    });
    await lib.moveToBacklog({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      boardId: "42",
      issueKey: "PROJ-1",
      output: { info() {}, warn() {} },
    });
    await http(`${BASE}/rest/api/3/issue/PROJ-1/comment`, { method: "POST" });
    const recs = journal(dir);
    assert.equal(recs.length, 3);
    for (const r of recs) {
      assert.ok(
        r.intent && r.intent.trim().length > 0,
        `${r.kind} wrote an empty intent — no renderer can reconstruct one`,
      );
    }
  });
});

// ── 3. Fail-closed: an unannotated mutation is refused, not executed ───────

test("§3 an unannotated non-GET is refused, recorded as jira.unknown-mutation, never sent", async () => {
  await withTmp(async (dir) => {
    const calls = [];
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(calls),
      access: "manual",
      cwd: dir,
    });
    const resp = await http(`${BASE}/rest/api/3/issueLink`, {
      method: "POST",
      body: '{"type":"blocks"}',
    });
    assert.equal(resp.deferred, true);
    assert.equal(
      resp.ok,
      true,
      "a deferral is not a failure — callers throw on !ok",
    );
    assert.equal(calls.length, 0, "nothing reached the transport");

    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.unknown-mutation");
    assert.equal(
      recs[0].consequence,
      "irreversible",
      "nothing knows what it would have done — the confirm gate is the honest default",
    );
    assert.match(recs[0].intent, /POST \/rest\/api\/3\/issueLink/);
    assert.equal(recs[0].desired.method, "POST");
  });
});

test("§3 every access mode other than full refuses", async () => {
  for (const mode of ["read-only", "approve", "command", "manual"]) {
    await withTmp(async (dir) => {
      const calls = [];
      const http = lib.makeHttp({
        fetchImpl: throwOnWrite(calls),
        access: mode,
        cwd: dir,
      });
      const resp = await http(`${BASE}/rest/api/3/issue/PROJ-1`, {
        method: "PUT",
      });
      assert.equal(resp.deferred, true, `${mode} must refuse`);
      assert.equal(calls.length, 0, `${mode} let a write through`);
      assert.equal(journal(dir)[0].access, mode);
    });
  }
});

// ── 4. The 21st kind renders ───────────────────────────────────────────────

test("§4 jira.unknown-mutation is in the roster and renders non-empty in all four formats", () => {
  const roster = dm.loadRoster();
  assert.ok(
    roster.has("jira.unknown-mutation"),
    "the 21st kind must be reachable",
  );

  const rec = dm.buildRecord({
    kind: "jira.unknown-mutation",
    access: "manual",
    intent: "Perform PUT /rest/api/3/issue/PROJ-1 by hand",
    target: { issue: "PROJ-1", url: `${BASE}/browse/PROJ-1` },
    desired: { method: "PUT" },
  });
  for (const format of hr.FORMATS) {
    const out = hr.render([rec], format, { run: "t", access: "manual" });
    assert.ok(out && out.trim().length > 0, `${format} rendered empty`);
    assert.ok(
      !/undefined|\[object Object\]|\{\{/.test(out),
      `${format} left something unsubstituted`,
    );
  }
  assert.match(
    hr.render([rec], "md", { run: "t", access: "manual" }),
    /unrecognised REST call/i,
    "the wording says only what is known",
  );
});

// ── 5. One record per logical mutation, across retries ─────────────────────

test("§5 a 429-retrying transport cannot produce more than one record — the gate is above the loop", async () => {
  await withTmp(async (dir) => {
    let attempts = 0;
    const fetchImpl = async () => {
      attempts++;
      return {
        ok: false,
        status: 429,
        headers: { get: () => "0" },
        async json() {
          return {};
        },
        async text() {
          return "";
        },
      };
    };
    const http = lib.makeHttp({
      fetchImpl,
      access: "manual",
      cwd: dir,
      retries: 3,
      retryDelayMs: 1,
    });
    await http(`${BASE}/rest/api/3/issue/PROJ-1`, { method: "PUT" });
    assert.equal(attempts, 0, "the refused write never entered the retry loop");
    assert.equal(journal(dir).length, 1, "one logical mutation, one record");
  });
});

test("§5 a deferral answers ok, which is what makes every caller retry ladder unreachable", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const resp = await http(`${BASE}/rest/api/3/issue`, { method: "POST" });
    assert.equal(resp.ok, true);
    assert.notEqual(
      resp.status,
      400,
      "a 400 would send sync-jira-epic's create down its epic-name retry and write a second record",
    );
  });
});

// ── 6. A read wearing a POST is still a read ───────────────────────────────

test("§6 findExistingByLabel searches normally under a restricted mode", async () => {
  await withTmp(async (dir) => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, method: opts.method });
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async json() {
          return { issues: [{ key: "PROJ-9", fields: { updated: "u" } }] };
        },
      };
    };
    const http = lib.makeHttp({ fetchImpl, access: "manual", cwd: dir });
    const found = await lib.findExistingByLabel({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      projectKey: "PROJ",
      label: "synced-from-task-53",
    });
    assert.equal(calls.length, 1, "the search ran");
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(journal(dir), [], "a read is not a mutation");
    assert.ok(
      found,
      "refusing this would make the next run create a duplicate",
    );
  });
});

test("§6 the allowlist is by URL, not by a guess about what looks like a read", () => {
  assert.equal(lib.isReadViaPost(`${BASE}/rest/api/3/search/jql`), true);
  assert.equal(lib.isReadViaPost(`${BASE}/rest/api/3/search`), true);
  assert.equal(lib.isReadViaPost(`${BASE}/rest/api/3/issue`), false);
  assert.equal(
    lib.isReadViaPost(`${BASE}/rest/api/3/issue/PROJ-1/search`),
    false,
  );
});

// ── 7. The sync scripts return the shapes their callers already cope with ──

test("§7 a deferred create short-circuits sync-jira-story's retry ladder after one record", async () => {
  await withTmp(async (dir) => {
    const s = require(
      path.join(
        REPO,
        "skills",
        "sync-jira-story",
        "scripts",
        "sync-jira-story.js",
      ),
    );
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const resp = await s.createStoryWithRetry({
      http,
      auth: { baseUrl: BASE, email: "a@b.c", token: "t", project: "PROJ" },
      fields: { summary: "Rename the widget", project: { key: "PROJ" } },
      output: { info() {}, warn() {} },
    });
    assert.equal(resp.deferred, true);
    const recs = journal(dir);
    assert.equal(recs.length, 1, "the 400-retry ladder was never entered");
    assert.equal(recs[0].kind, "jira.issue.create");
    assert.match(recs[0].intent, /Rename the widget/);
  });
});

test("§7 a deferred response invents no issue key — that is what keeps the create shape null", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const resp = await http(`${BASE}/rest/api/3/issue`, { method: "POST" });
    const body = await resp.json();
    assert.deepEqual(
      body,
      {},
      "a fabricated key would be written to frontmatter, break the idempotent " +
        "synced-from-* label search, and make the next run create a duplicate",
    );
    assert.equal(body.key, undefined);
    assert.equal(await resp.text(), "");
    assert.equal(
      resp.deferredRecord,
      journal(dir)[0].id,
      "the caller is pointed at the record it must act on",
    );
  });
});

// ── 8. The sprint scripts: a deferral must not abort a `set -euo pipefail` run

test("§8 jsm_curl defers a non-GET and leaves JSM_HTTP_STATUS/JSM_BODY set", async () => {
  return withTmp(async (dir) => {
    const script = `
      set -euo pipefail
      cd ${JSON.stringify(dir)}
      source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
      JIRA_INSTANCE=acme.atlassian.net
      JIRA_USER_EMAIL=a@b.c
      JIRA_API_TOKEN=t
      JSM_DEFER_KIND=jira.sprint.set-state
      JSM_DEFER_INTENT="Set sprint 42 to state: closed"
      JSM_DEFER_TARGET='{"sprint":"42"}'
      JSM_DEFER_DESIRED='{"state":"closed"}'
      jsm_curl POST "https://acme.atlassian.net/rest/agile/1.0/sprint/42" '{"state":"closed"}'
      # Both callers branch on these under set -u; an unset one aborts the run.
      echo "status=$JSM_HTTP_STATUS"
      echo "body=$JSM_BODY"
      # move-sprint-issues.sh:46 accepts 200 or 204; manage-sprint-state.sh:49 requires 200.
      if [ "$JSM_HTTP_STATUS" -ne 200 ]; then echo "WOULD-ABORT"; exit 1; fi
      echo "completed"
    `;
    const out = execFileSync("bash", ["-c", script], {
      encoding: "utf8",
      env: { ...process.env, ACCESS_TRACKER: "manual", PATH: process.env.PATH },
    });
    assert.match(out, /status=200/);
    assert.match(out, /completed/);
    assert.doesNotMatch(out, /WOULD-ABORT/);
    assert.match(out, /body=\{"deferred":true\}/, "JSM_BODY must stay jq-safe");

    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.sprint.set-state");
    assert.equal(recs[0].desired.state, "closed");
  });
});

test("§8 jsm_curl still performs a GET under a restricted mode", async () => {
  return withTmp(async (dir) => {
    // curl is never reached: an unroutable host would hang, so the assertion is
    // that the gate did NOT short-circuit — the journal stays empty.
    const script = `
      source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
      cd ${JSON.stringify(dir)}
      [ "$(jsm_access_mode)" = "manual" ] || { echo "MODE-WRONG"; exit 1; }
      echo ok
    `;
    const out = execFileSync("bash", ["-c", script], {
      encoding: "utf8",
      env: { ...process.env, ACCESS_TRACKER: "manual" },
    });
    assert.match(out, /ok/);
    assert.deepEqual(journal(dir), []);
  });
});

// ── 9. jira-create-epic.js — outside layer 1, so it carries its own gate ───

test("§9 jira-create-epic.js records and makes no network call under a restricted mode", async () => {
  return withTmp(async (dir) => {
    const r = spawnSync(
      process.execPath,
      [
        path.join(
          REPO,
          "skills",
          "jira-epic-creator",
          "scripts",
          "jira-create-epic.js",
        ),
        "--summary",
        "Interception epic",
      ],
      {
        encoding: "utf8",
        cwd: dir,
        env: {
          ...process.env,
          ACCESS_TRACKER: "manual",
          // Unroutable on purpose: if the gate leaked, this test would hang or
          // fail on a connection error rather than pass.
          JIRA_URL: "https://127.0.0.1:1/",
          JIRA_API_TOKEN: "t",
          JIRA_USER_EMAIL: "a@b.c",
          JIRA_PROJECT_KEY: "PROJ",
        },
        timeout: 20000,
      },
    );
    assert.match(
      `${r.stdout}${r.stderr}`,
      /deferred/i,
      `expected a deferral, got:\n${r.stdout}\n${r.stderr}`,
    );
    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, "jira.issue.create");
    assert.equal(recs[0].skill, "jira-epic-creator");
    assert.match(recs[0].intent, /Interception epic/);
  });
});

// ── 10. The resolver says what is now true ─────────────────────────────────

test("§10 the PARTIALLY ENFORCED notice names Jira as covered and GitHub as the gap", () => {
  const src = fs.readFileSync(path.join(SHARED, "resolve-platform.sh"), "utf8");
  assert.match(src, /all Jira writes and board\/status moves are deferred/);
  assert.match(src, /GitHub issue and PR writes/);
});
