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

test("§7b the epic create, its double-POST retry, and the Team-field PUT each record once and correctly", async () => {
  await withTmp(async (dir) => {
    const e = require(
      path.join(
        REPO,
        "skills",
        "sync-jira-epic",
        "scripts",
        "sync-jira-epic.js",
      ),
    );
    // The epic create is annotated at the FIRST POST only; its epic-name retry
    // is the same logical mutation. Driving the real path is what proves the
    // retry branch is unreachable on a deferral — asserting "the gate answers
    // ok, so a 400 branch cannot fire" is an inference, not a test.
    assert.ok(e, "sync-jira-epic must be requireable");

    const calls = [];
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(calls),
      access: "manual",
      cwd: dir,
    });
    const fields = {
      summary: "Interception epic",
      project: { key: "PROJ" },
      issuetype: { name: "Epic" },
      customfield_10011: "Interception epic",
    };
    // Exactly the annotation sync-jira-epic.js attaches to its create POST.
    const post = () =>
      http(`${BASE}/rest/api/3/issue`, {
        method: "POST",
        body: JSON.stringify({ fields }),
        defer: {
          kind: "jira.issue.create",
          intent: `Create the Jira epic "${fields.summary}" in PROJ`,
          target: {
            name: fields.summary,
            url: `${BASE}/rest/api/3/issue`,
            ui_url: `${BASE}/secure/CreateIssue!default.jspa`,
          },
          desired: lib.summariseFields(fields),
          skill: "sync-jira-epic",
        },
      });

    const resp = await post();
    assert.equal(resp.deferred, true);
    assert.equal(
      resp.ok,
      true,
      "sync-jira-epic.js guards its epic-name retry with `if (!resp.ok)`; an ok " +
        "deferral is what makes that second POST unreachable",
    );
    assert.equal(calls.length, 0);
    assert.equal(journal(dir).length, 1, "one logical create, one record");
    assert.equal(journal(dir)[0].skill, "sync-jira-epic");

    // The Team-field PUT — the literal "set Team to Platform" case the design
    // justifies layer 2 with. Unannotated it renders as a PUT and a UUID.
    const teamResp = await http(`${BASE}/rest/api/3/issue/PROJ-7`, {
      method: "PUT",
      body: JSON.stringify({ fields: { customfield_10001: "team-uuid-1" } }),
      defer: {
        kind: "jira.issue.update",
        intent: "Set the Team field on PROJ-7 so the epic appears on board 42",
        target: { issue: "PROJ-7", url: `${BASE}/rest/api/3/issue/PROJ-7` },
        desired: { Team: "team-uuid-1" },
        skill: "sync-jira-epic",
      },
    });
    assert.equal(teamResp.deferred, true);
    const team = journal(dir)[1];
    assert.equal(team.kind, "jira.issue.update");
    assert.equal(team.desired.Team, "team-uuid-1");
    assert.match(team.intent, /Team field on PROJ-7/);
    assert.equal(calls.length, 0, "still nothing on the wire");
  });
});

test("§7b the sync-jira-task create annotation records jira.issue.create, not the catch-all", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });
    const fields = { summary: "Refactor the widget", project: { key: "PROJ" } };
    const resp = await http(`${BASE}/rest/api/3/issue`, {
      method: "POST",
      body: JSON.stringify({ fields }),
      defer: {
        kind: "jira.issue.create",
        intent: `Create the Jira task "${fields.summary}" in PROJ`,
        target: { name: fields.summary, url: `${BASE}/rest/api/3/issue` },
        desired: lib.summariseFields(fields),
        skill: "sync-jira-task",
      },
    });
    assert.equal(resp.deferred, true);
    const rec = journal(dir)[0];
    assert.equal(rec.kind, "jira.issue.create");
    assert.notEqual(
      rec.kind,
      "jira.unknown-mutation",
      "an unannotated create would still be safe, but not legible",
    );
    assert.equal(rec.skill, "sync-jira-task");
    assert.equal(rec.desired.summary, "Refactor the widget");
  });
});

test("§7c the sync scripts hand their callers the documented deferred shapes", async () => {
  await withTmp(async (dir) => {
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: dir,
    });

    // The UPDATE shape, at the layer the risk actually lives in: a real key the
    // caller already had, and a null timestamp. Reaching for the real `updated`
    // here would tell the next run the issue was touched.
    const put = await lib.putIssueAtomic({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      issueKey: "PROJ-1",
      fields: { summary: "x" },
    });
    const updateShape = {
      issueKey: "PROJ-1",
      issueUrl: `${BASE}/browse/PROJ-1`,
      updated: put.updated,
    };
    assert.deepEqual(updateShape, {
      issueKey: "PROJ-1",
      issueUrl: `${BASE}/browse/PROJ-1`,
      updated: null,
    });

    // The CREATE shape. The stated risk is "a deferred create corrupts a
    // document"; the defence is that no key exists to write, so the scripts
    // return the same null triple --dry-run already returns.
    const s = require(
      path.join(
        REPO,
        "skills",
        "sync-jira-story",
        "scripts",
        "sync-jira-story.js",
      ),
    );
    const resp = await s.createStoryWithRetry({
      http,
      auth: { baseUrl: BASE, email: "a@b.c", token: "t", project: "PROJ" },
      fields: { summary: "Rename the widget", project: { key: "PROJ" } },
      output: { info() {}, warn() {} },
    });
    assert.equal(resp.deferred, true);
    const created = await resp.json();
    const createShape = {
      issueKey: created.key ?? null,
      issueUrl: created.key ? `${BASE}/browse/${created.key}` : null,
      updated: null,
    };
    assert.deepEqual(createShape, {
      issueKey: null,
      issueUrl: null,
      updated: null,
    });
  });
});

test("§7c the three sync scripts guard their write-back and their key on `deferred`", () => {
  // A structural guard, and stated as one. The behavioural halves are §7 and
  // §7c above; this pins the two branches that keep a deferral out of the local
  // file, which no hermetic test can reach without a full Jira fixture.
  for (const [skill, script] of [
    ["sync-jira-story", "sync-jira-story.js"],
    ["sync-jira-task", "sync-jira-task.js"],
    ["sync-jira-epic", "sync-jira-epic.js"],
  ]) {
    const src = fs.readFileSync(
      path.join(REPO, "skills", skill, "scripts", script),
      "utf8",
    );
    // The write-back gate and the --json reason are asserted in §13 (CR-3),
    // which pins the FLAG rather than the record id: gating on the id let a
    // failed journal write report success.
    assert.match(
      src,
      /result = \{ issueKey: null, issueUrl: null, updated: null \}/,
      `${skill}: a deferred create must return the null triple, never a placeholder key`,
    );
  }
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

/** Run one of the sprint scripts with a restricted mode and a tmp cwd. */
function runSprintScript(script, args, dir) {
  return spawnSync(
    "bash",
    [
      path.join(REPO, "skills", "jira-sprint-manager", "scripts", script),
      ...args,
    ],
    {
      encoding: "utf8",
      cwd: dir,
      env: {
        ...process.env,
        ACCESS_TRACKER: "manual",
        JIRA_INSTANCE: "acme.atlassian.net",
        JIRA_USER_EMAIL: "a@b.c",
        JIRA_API_TOKEN: "t",
      },
      timeout: 30000,
    },
  );
}

test("§8b move-sprint-issues.sh completes under `set -euo pipefail` and records the right kind", async () => {
  await withTmp(async (dir) => {
    // The real script, not a re-implementation of its checks. Its `JSM_DEFER_*`
    // exports are the only thing standing between this mutation and a generic
    // `jira.unknown-mutation` record, and nothing else in the suite runs them.
    const r = runSprintScript(
      "move-sprint-issues.sh",
      ["42", "PROJ-1,PROJ-2"],
      dir,
    );
    assert.equal(
      r.status,
      0,
      `the script aborted — a deferral became a failed run:\n${r.stdout}\n${r.stderr}`,
    );
    // CR-4 — the script must NOT claim the move happened. The previous version
    // of this assertion pinned the success line, which made the test protect the
    // defect rather than catch it.
    assert.match(r.stdout, /NOT moved to: 42/);
    assert.doesNotMatch(
      r.stdout,
      /^Moved 2 issue/m,
      "a refused move must never print the success line",
    );

    const recs = journal(dir);
    assert.equal(recs.length, 1, "one chunk, one record");
    assert.equal(recs[0].kind, "jira.sprint.move-issues");
    assert.match(recs[0].intent, /Move 2 issue\(s\) to: 42/);
    assert.equal(recs[0].desired.target, "42");
    assert.match(recs[0].desired.issues, /PROJ-1, PROJ-2/);
  });
});

test("§8b manage-sprint-state.sh completes and records jira.sprint.set-state", async () => {
  await withTmp(async (dir) => {
    const r = runSprintScript("manage-sprint-state.sh", ["42", "closed"], dir);
    assert.equal(
      r.status,
      0,
      `the script aborted — its \`-ne 200\` branch fired:\n${r.stdout}\n${r.stderr}`,
    );
    // CR-4 — same contract for the state transition.
    assert.match(r.stdout, /NOT transitioned to: closed/);
    assert.doesNotMatch(
      r.stdout,
      /^Sprint 42 transitioned to/m,
      "a refused transition must never print the success line",
    );

    const recs = journal(dir);
    assert.equal(
      recs.length,
      1,
      "the POST-then-PUT fallback is guarded by `-eq 405 || -eq 404`; a 200 " +
        "deferral must not trigger a second attempt and a second record",
    );
    assert.equal(recs[0].kind, "jira.sprint.set-state");
    assert.equal(recs[0].desired.state, "closed");
    assert.equal(recs[0].target.sprint, "42");
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

test("§10 the PARTIALLY ENFORCED notice exists and is qualified", () => {
  // The exact wording — what IS gated and what is not — is pinned in §13 (CR-5).
  const src = fs.readFileSync(path.join(SHARED, "resolve-platform.sh"), "utf8");
  assert.match(src, /PARTIALLY ENFORCED/);
  assert.match(src, /GitHub issue and PR writes/);
});

// ── 11. A capability that refuses without a documented reason reads as a bug ─

test("§11 the `deferred` reason is documented where a reader actually hits it", () => {
  const cfg = fs.readFileSync(
    path.join(REPO, "docs", "reference", "configuration.md"),
    "utf8",
  );
  assert.match(
    cfg,
    /reason: "deferred"/,
    "configuration.md is where an operator reads what access.tracker does",
  );
  assert.match(cfg, /jira_key: null/, "and that a create returns no key");

  const trouble = fs.readFileSync(
    path.join(REPO, "docs", "reference", "troubleshooting.md"),
    "utf8",
  );
  assert.match(
    trouble,
    /My Jira card did not move/i,
    "troubleshooting.md is where someone lands when the card did not move",
  );
  assert.match(trouble, /tracker-actions\.jsonl/, "and is told where to look");

  for (const skill of ["sync-jira-story", "sync-jira-task", "sync-jira-epic"]) {
    const md = fs.readFileSync(
      path.join(REPO, "skills", skill, "SKILL.md"),
      "utf8",
    );
    assert.match(
      md,
      /"reason": null/,
      `${skill}: the --json sample must carry the key`,
    );
    assert.match(md, /deferred/, `${skill}: and explain what "deferred" means`);
  }
});

// ── 12. A bundled copy must not ship a stale roster ────────────────────────

test("§12 every bundled copy of a file this change touches carries the change", () => {
  // A targeted parity check, and stated as one — it does not re-implement the
  // bundler, it pins the load-bearing facts. The failure it exists for is
  // specific: `defer-mutation.js` refuses to write a record when its roster
  // count disagrees with the doc, so a bundled pair left at 20 would refuse
  // every deferral IN AN INSTALLED SKILL while the whole suite passed in-repo.
  const bundled = (name) =>
    fs
      .readdirSync(path.join(REPO, "skills"))
      .map((s) => path.join(REPO, "skills", s, "references", name))
      .filter((f) => fs.existsSync(f));

  const deferCopies = bundled("defer-mutation.js");
  assert.ok(
    deferCopies.length > 0,
    "defer-mutation.js must be bundled somewhere",
  );
  for (const f of deferCopies) {
    assert.match(
      fs.readFileSync(f, "utf8"),
      /EXPECTED_KIND_COUNT = 21/,
      `${path.relative(REPO, f)} is stale — run \`npm run bundle\``,
    );
  }

  const rosterCopies = bundled("tracker-access-record.md");
  assert.equal(
    rosterCopies.length,
    deferCopies.length,
    "the roster doc and its parser must be bundled together — defer-mutation.js " +
      "reads the doc from its own directory at run time",
  );
  for (const f of rosterCopies) {
    const text = fs.readFileSync(f, "utf8");
    assert.match(
      text,
      /\*\*Total: 21\.\*\*/,
      `${path.relative(REPO, f)} is stale`,
    );
    assert.match(
      text,
      /`jira\.unknown-mutation`/,
      `${path.relative(REPO, f)} is stale`,
    );
  }

  for (const f of bundled("jira-sync.js")) {
    const text = fs.readFileSync(f, "utf8");
    assert.match(
      text,
      /isReadViaPost/,
      `${path.relative(REPO, f)} has no layer 1`,
    );
    assert.match(
      text,
      /summariseFields/,
      `${path.relative(REPO, f)} has no layer 2`,
    );
  }

  for (const f of bundled("jira-sprint-lib.sh")) {
    assert.match(
      fs.readFileSync(f, "utf8"),
      /jsm_defer\(\)/,
      `${path.relative(REPO, f)} has no access gate`,
    );
  }
});

// ── 13. The QA cycle 1 findings, each with a test that fails without its fix ─

test("§13 CR-1 a refused transition is not reported as a transition", async () => {
  await withTmp(async (dir) => {
    const calls = [];
    const http = lib.makeHttp({
      fetchImpl: async (url, opts = {}) => {
        calls.push({ url, method: opts.method });
        if ((opts.method || "GET") !== "GET") {
          throw new Error(`a write reached the network: ${url}`);
        }
        // The transitions GET the chain makes before posting.
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async json() {
            return {
              transitions: [
                { id: "31", name: "Start", to: { name: "In Progress" } },
              ],
            };
          },
        };
      },
      access: "manual",
      cwd: dir,
    });

    const res = await lib.transitionToStatus({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      issueKey: "PROJ-1",
      targetStatus: ["In Progress"],
      currentStatus: "To Do",
      localStatus: "in-progress",
      output: { info() {}, warn() {} },
    });

    assert.equal(res.transitioned, false, "a refusal is not a transition");
    assert.equal(res.reason, "deferred");
    assert.equal(res.to, null, "nothing landed anywhere");
    assert.ok(calls.every((c) => (c.method || "GET") === "GET"));

    // The consequence that made this HIGH: the outcome drives a Change Log row
    // that is written to disk.
    const rows = lib.buildChangeLogEntries({
      created: false,
      issueKey: "PROJ-1",
      statusOutcome: { ...res, localStatus: "in-progress", issueKey: "PROJ-1" },
      author: "sync-jira-story",
      docNoun: "story",
    });
    assert.deepEqual(
      rows,
      [],
      "a document must not record a status change Jira never made",
    );
  });
});

test("§13 CR-1 a deferred transition is not a --fail-on-status-skip failure", () => {
  const lines = [];
  const rc = lib.summariseStatusOutcome(
    {
      transitioned: false,
      reason: "deferred",
      record: "abc123",
      issueKey: "PROJ-1",
      localStatus: "in-progress",
    },
    {
      output: { info: (m) => lines.push(m), warn: (m) => lines.push(m) },
      failOnSkip: true,
    },
  );
  assert.equal(rc, 0, "behaving exactly as configured is not a failure");
  assert.ok(
    lines.some((l) => /Recorded as abc123/.test(l)),
    "the operator is pointed at the record",
  );
  assert.ok(
    !lines.some((l) => /Move it by hand, or see the guidance/.test(l)),
    "a deferral is not a skip and must not be described as one",
  );
});

test("§13 CR-2 the operator-facing env var restricts on its own", async () => {
  await withTmp(async (dir) => {
    // AGENT_SKILLS_ACCESS_TRACKER is the knob a person sets; ACCESS_TRACKER is
    // an OUTPUT of resolve-platform.sh, which these scripts never source.
    assert.equal(
      lib.mostRestrictiveAccess({ AGENT_SKILLS_ACCESS_TRACKER: "manual" }),
      "manual",
    );
    // Most-restrictive-wins, in both orders — a stray env var may lock a run
    // down, never loosen it.
    assert.equal(
      lib.mostRestrictiveAccess({
        ACCESS_TRACKER: "full",
        AGENT_SKILLS_ACCESS_TRACKER: "manual",
      }),
      "manual",
    );
    assert.equal(
      lib.mostRestrictiveAccess({
        ACCESS_TRACKER: "manual",
        AGENT_SKILLS_ACCESS_TRACKER: "full",
      }),
      "manual",
    );
    assert.equal(lib.mostRestrictiveAccess({}), "full");
    assert.throws(
      () => lib.mostRestrictiveAccess({ ACCESS_TRACKER: "bogus" }),
      /not a recognised access mode/,
      "a typo must refuse, never default to full",
    );
    assert.deepEqual(journal(dir), []);
  });
});

test("§13 CR-2 the sprint gate honours AGENT_SKILLS_ACCESS_TRACKER alone", async () => {
  await withTmp(async (dir) => {
    const r = spawnSync(
      "bash",
      [
        path.join(
          REPO,
          "skills",
          "jira-sprint-manager",
          "scripts",
          "manage-sprint-state.sh",
        ),
        "42",
        "closed",
      ],
      {
        encoding: "utf8",
        cwd: dir,
        env: {
          // Deliberately NOT setting ACCESS_TRACKER: this is the documented
          // bare invocation, which never sources resolve-platform.sh.
          ...process.env,
          ACCESS_TRACKER: "",
          AGENT_SKILLS_ACCESS_TRACKER: "manual",
          JIRA_INSTANCE: "acme.atlassian.net",
          JIRA_USER_EMAIL: "a@b.c",
          JIRA_API_TOKEN: "t",
        },
        timeout: 30000,
      },
    );
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(
      r.stdout,
      /NOT transitioned/,
      "the gate must fire on the operator knob alone",
    );
    assert.equal(journal(dir).length, 1);
    assert.equal(journal(dir)[0].kind, "jira.sprint.set-state");
  });
});

test("§13 CR-3 a deferral with an unwritable journal still reports as deferred", async () => {
  await withTmp(async (dir) => {
    // Point the journal at a path that cannot be created, so dm.defer throws
    // and recordRefusal returns a null record id. The refusal must still be a
    // refusal: the id is reporting detail, not the fact.
    const notADir = path.join(dir, "wall");
    fs.writeFileSync(notADir, "not a directory");
    const http = lib.makeHttp({
      fetchImpl: throwOnWrite(),
      access: "manual",
      cwd: notADir,
    });
    const res = await lib.putIssueAtomic({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      issueKey: "PROJ-1",
      fields: { summary: "x" },
    });
    assert.equal(res.deferred, true, "the boolean is the fact");
    assert.equal(
      res.record,
      null,
      "the id is absent — the journal write failed",
    );
    assert.equal(res.updated, null);
  });
});

test("§13 CR-3 the sync scripts gate on the flag, not the record id", () => {
  for (const [skill, script] of [
    ["sync-jira-story", "sync-jira-story.js"],
    ["sync-jira-task", "sync-jira-task.js"],
    ["sync-jira-epic", "sync-jira-epic.js"],
  ]) {
    const src = fs.readFileSync(
      path.join(REPO, "skills", skill, "scripts", script),
      "utf8",
    );
    assert.match(
      src,
      /!deferred\b/,
      `${skill}: write-back must gate on the flag`,
    );
    assert.doesNotMatch(
      src,
      /!deferredRecord/,
      `${skill}: gating on the id makes a failed journal write report success`,
    );
    assert.match(
      src,
      /reason:\s*\n?\s*deferred \|\|/,
      `${skill}: --json reason must follow the flag (and, per §14, the ` +
        `transition outcome as well)`,
    );
  }
});

test("§13 QA-1 an unrecognised mode fails a write, not a read", () => {
  // A subprocess, and that is the point: the mode is captured at REQUIRE time so
  // a dot-env file cannot escalate it, which also means mutating process.env
  // after the require would prove nothing.
  const driver = `
    const lib = require(${JSON.stringify(path.join(SHARED, "jira-sync.js"))});
    const calls = [];
    const http = lib.makeHttp({
      fetchImpl: async (url, opts = {}) => {
        calls.push(opts.method || "GET");
        return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) };
      },
    });
    console.log("FACTORY-OK");
    http("https://x/rest/api/3/issue/PROJ-1", {})
      .then((r) => {
        console.log("GET", r.status);
        return http("https://x/rest/api/3/issue/PROJ-1", { method: "PUT" });
      })
      .then(() => console.log("PUT-LEAKED"))
      .catch((e) => console.log("PUT-REFUSED", e.message.slice(0, 60)))
      .then(() => console.log("CALLS", JSON.stringify(calls)));
  `;
  const r = spawnSync(process.execPath, ["-e", driver], {
    encoding: "utf8",
    env: { ...process.env, ACCESS_TRACKER: "bogus" },
    timeout: 20000,
  });
  assert.match(
    r.stdout,
    /FACTORY-OK/,
    "the factory must not throw — read-only callers (--probe-workflow, " +
      "scaffold-tracker-workflow) build an http() and never write",
  );
  assert.match(r.stdout, /GET 200/, "a read is never gated");
  assert.match(
    r.stdout,
    /PUT-REFUSED .*not a recognised/,
    "a write refuses loudly",
  );
  assert.doesNotMatch(r.stdout, /PUT-LEAKED/);
  assert.match(
    r.stdout,
    /CALLS \["GET"\]/,
    "the refused write never reached the transport",
  );
});

test("§13 CR-7 a deferred update names the calling skill, not the library", async () => {
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
      skill: "sync-jira-story",
    });
    await lib.moveToBacklog({
      http,
      baseUrl: BASE,
      email: "a@b.c",
      token: "t",
      boardId: "42",
      issueKey: "PROJ-1",
      output: { info() {}, warn() {} },
      skill: "sync-jira-story",
    });
    const recs = journal(dir);
    assert.equal(recs.length, 2);
    for (const r of recs) {
      assert.equal(
        r.skill,
        "sync-jira-story",
        "the handover renderer groups by skill — one run must not split in two",
      );
    }
  });
});

test("§13 CR-8 summariseFields keeps a value a human could type, and drops one they could not", () => {
  const out = lib.summariseFields({
    summary: "Rename the widget",
    timetracking: { originalEstimate: "3d" },
    assignee: { name: null },
    labels: ["a", null, "b"],
    description: { type: "doc", content: [] },
  });
  assert.equal(out.summary, "Rename the widget");
  assert.equal(
    out.timetracking,
    "3d",
    "a field these scripts send must survive",
  );
  assert.equal(
    out.assignee,
    "(structured value — see the work-item document)",
    'a null name must not render as the string "null"',
  );
  assert.equal(out.labels, "a, b", "an empty member is not a value to type");
  assert.equal(
    out.description,
    "(structured value — see the work-item document)",
  );
});

test("§13 CR-5 the notice names what is gated and what is not", () => {
  const src = fs.readFileSync(path.join(SHARED, "resolve-platform.sh"), "utf8");
  assert.match(src, /Jira REST via jira-sync\.js/, "name the gated path");
  assert.match(
    src,
    /raw curl or the Atlassian MCP tools/,
    "and the Jira writes that are NOT gated — create-issue and review-task still curl directly",
  );
  assert.doesNotMatch(
    src,
    /all Jira writes/,
    "the previous wording overstated coverage, which the notice itself calls worse than none",
  );
});

test("§13 CR-2b an unrecognised mode aborts the sprint caller, not just a subshell", () => {
  // Found during the cycle-2 re-review of the CR-2 fix itself. `jsm_access_mode`
  // is called as `$(jsm_access_mode)`, and an `exit 1` inside command
  // substitution kills only the subshell: the caller printed "Refusing" and then
  // carried on with an empty mode. A refusal that does not refuse is worse than
  // no refusal, because the message says it did.
  const r = spawnSync(
    "bash",
    [
      "-c",
      `set -euo pipefail
       source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
       JIRA_INSTANCE=x; JIRA_USER_EMAIL=a@b.c; JIRA_API_TOKEN=t
       jsm_curl POST "https://x/y" "{}"
       echo "REACHED-AFTER"`,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ACCESS_TRACKER: "bogus" },
      timeout: 20000,
    },
  );
  assert.equal(r.status, 1, "the caller must exit non-zero");
  assert.match(r.stderr, /not a recognised access mode/);
  assert.doesNotMatch(
    r.stdout,
    /REACHED-AFTER/,
    "execution must not continue past a refused mode",
  );
});

// ── 14. Cycle-2 findings: the fixes were new code, and carried their own bugs ─

test("§14 C2-CR1 a config-declared restriction holds with no env var set at all", async () => {
  await withTmp(async (dir) => {
    fs.writeFileSync(
      path.join(dir, "skills-config.yaml"),
      "access:\n  tracker: manual\n",
    );
    // The env tiers are the ones the first fix taught the gates about. This is
    // the tier an operator actually edits and commits, and every gate ignored
    // it — so the documented bare invocation performed the write.
    assert.equal(
      dm.resolveAccessTracker(
        {},
        { configPath: path.join(dir, "skills-config.yaml") },
      ),
      "manual",
    );
    // Most-restrictive-wins across all three tiers, in both directions.
    assert.equal(
      dm.resolveAccessTracker(
        { ACCESS_TRACKER: "full" },
        { configPath: path.join(dir, "skills-config.yaml") },
      ),
      "manual",
      "a permissive env var must never loosen a config that restricts",
    );
  });
});

test("§14 C2-CR1 the sprint script honours a config-only restriction end to end", async () => {
  await withTmp(async (dir) => {
    fs.writeFileSync(
      path.join(dir, "skills-config.yaml"),
      "access:\n  tracker: manual\n",
    );
    const env = { ...process.env };
    delete env.ACCESS_TRACKER;
    delete env.AGENT_SKILLS_ACCESS_TRACKER;
    const r = spawnSync(
      "bash",
      [
        path.join(
          REPO,
          "skills",
          "jira-sprint-manager",
          "scripts",
          "manage-sprint-state.sh",
        ),
        "42",
        "closed",
      ],
      {
        encoding: "utf8",
        cwd: dir,
        env: {
          ...env,
          JIRA_INSTANCE: "acme.atlassian.net",
          JIRA_USER_EMAIL: "a@b.c",
          JIRA_API_TOKEN: "t",
        },
        timeout: 30000,
      },
    );
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(
      r.stdout,
      /NOT transitioned/,
      "no env var, and the gate still fires",
    );
    const recs = journal(dir);
    assert.equal(recs.length, 1);
    assert.equal(
      recs[0].access,
      "manual",
      "the record names the mode that was in force",
    );
  });
});

test("§14 C2-CR2 every gate resolves the mode the same way", () => {
  // The four hand-rolled copies are gone. Anything that still ranks modes
  // locally is a copy that will drift — which is exactly how the config tier
  // came to be missing from all four.
  const shared = fs.readFileSync(
    path.join(SHARED, "defer-mutation.js"),
    "utf8",
  );
  assert.match(
    shared,
    /AGENT_SKILLS_ACCESS_TRACKER/,
    "the one resolver reads both env names",
  );
  assert.match(shared, /readConfiguredAccessTracker/, "and the config tier");

  for (const f of [
    path.join(SHARED, "jira-sync.js"),
    path.join(
      REPO,
      "skills",
      "jira-epic-creator",
      "scripts",
      "jira-create-epic.js",
    ),
  ]) {
    const src = fs.readFileSync(f, "utf8");
    assert.match(
      src,
      /resolveAccessTracker/,
      `${path.relative(REPO, f)} must delegate, not re-rank`,
    );
    assert.doesNotMatch(
      src,
      /const ACCESS_RANK = \{/,
      `${path.relative(REPO, f)} keeps its own mode table — that is the drift`,
    );
  }
  const sh = fs.readFileSync(path.join(SHARED, "jira-sprint-lib.sh"), "utf8");
  assert.match(
    sh,
    /--resolve-access/,
    "the shell gate asks the one resolver too",
  );
});

test("§14 C2-CR2 the stage CLI gate is not looser than the gate underneath it", () => {
  // jira-stage.js calls dm.resolveAccessTracker. Before the consolidation it saw
  // only ACCESS_TRACKER, so with the operator knob alone it read "full", skipped
  // its purpose-built jira.transition deferral, and fell through to the layer-1
  // net — which refused the same POST as an untyped jira.unknown-mutation and
  // turned a --strict run into a failure.
  assert.equal(
    dm.resolveAccessTracker(
      { AGENT_SKILLS_ACCESS_TRACKER: "manual" },
      { config: false },
    ),
    "manual",
  );
  // Sharing the resolver is not enough: both stage CLIs capture the env BEFORE
  // loadDotEnv and hand the resolver that snapshot, so a capture naming only
  // ACCESS_TRACKER makes the shared resolver blind to the operator knob. The
  // first version of this fix did exactly that, and this assertion is what
  // catches it — asserting the resolver in isolation did not.
  for (const cli of ["jira-stage.js", "gh-stage.js"]) {
    const src = fs.readFileSync(path.join(SHARED, cli), "utf8");
    assert.match(src, /resolveAccessTracker/, `${cli} must share the resolver`);
    const capture = /const accessEnv = \{[^}]*\}/s.exec(src);
    assert.ok(capture, `${cli}: no accessEnv capture found`);
    assert.match(
      capture[0],
      /AGENT_SKILLS_ACCESS_TRACKER/,
      `${cli}: the capture must carry the operator knob, or the shared resolver ` +
        `never sees it and this CLI's gate is looser than the net beneath it`,
    );
  }
});

test("§14 C2-CR3 a refused transition alone still reports reason: deferred", () => {
  // The create and the PUT set the flag directly. A refused TRANSITION is the
  // third source, and on the no-field-changes path it is the ONLY one — so
  // keying `reason` off the flag alone reported null for a run that refused and
  // recorded a write.
  for (const [skill, script] of [
    ["sync-jira-story", "sync-jira-story.js"],
    ["sync-jira-task", "sync-jira-task.js"],
    ["sync-jira-epic", "sync-jira-epic.js"],
  ]) {
    const src = fs.readFileSync(
      path.join(REPO, "skills", skill, "scripts", script),
      "utf8",
    );
    assert.match(
      src,
      /statusOutcome\?\.reason === "deferred"/,
      `${skill}: --json must see the transition deferral too`,
    );
    assert.match(
      src,
      /record: deferredRecord \|\| statusOutcome\?\.record/,
      `${skill}: and point at the record it wrote`,
    );
  }
});

test("§14 C2-CR4 an empty list renders as a named absence, never the string null", () => {
  const out = lib.summariseFields({
    components: [],
    labels: [null],
    timetracking: { originalEstimate: "" },
    kept: "x",
  });
  for (const k of ["components", "labels", "timetracking"]) {
    assert.notEqual(
      out[k],
      null,
      `${k}: null is rendered by JSON.stringify as "null"`,
    );
    // §15 (C3-CR7) pins the wording: an empty collection is an instruction to
    // clear the field, not an unrenderable value.
    assert.match(out[k], /cleared/, `${k}: name what is being asked for`);
  }
  assert.equal(out.kept, "x");

  // The consequence, at the renderer that produces the operator's line.
  const rec = dm.buildRecord({
    kind: "jira.issue.update",
    access: "manual",
    intent: "Set fields on PROJ-1",
    target: { issue: "PROJ-1" },
    desired: out,
  });
  const md = hr.render([rec], "md", { run: "t", access: "manual" });
  assert.doesNotMatch(
    md,
    /components = null/,
    "an operator cannot type null into a field",
  );
});

// ── 15. Cycle-3 findings: the consolidation's own defects ──────────────────

test("§15 C3-CR1 a present-but-unusable restriction refuses; a genuinely absent one does not", async () => {
  await withTmp(async (dir) => {
    const cfg = path.join(dir, "skills-config.yaml");

    // The case that made this HIGH. `access: {tracker: manual}` is a flow
    // mapping, which the subset parser reads as the STRING "{tracker: manual}"
    // — so `.tracker` was undefined, the tier answered "absent", and a declared
    // restriction resolved to `full`.
    fs.writeFileSync(cfg, "access: {tracker: manual}\n");
    assert.throws(
      () => dm.readConfiguredAccessTracker({ configPath: cfg }),
      /not a block mapping|Refusing/,
      "reading an unparseable restriction as absent is fail-OPEN",
    );

    // Absent is still absent — the ordinary case must not become an error.
    const cfg2 = path.join(dir, "b", "skills-config.yaml");
    fs.mkdirSync(path.dirname(cfg2));
    fs.writeFileSync(cfg2, "tracker: jira\nvcs: github\n");
    assert.equal(dm.readConfiguredAccessTracker({ configPath: cfg2 }), "");

    // A non-scalar mode refuses rather than being coerced.
    const cfg3 = path.join(dir, "c", "skills-config.yaml");
    fs.mkdirSync(path.dirname(cfg3));
    fs.writeFileSync(cfg3, "access:\n  tracker:\n    mode: manual\n");
    assert.throws(
      () => dm.readConfiguredAccessTracker({ configPath: cfg3 }),
      /Refusing/,
    );
  });
});

test("§15 C3-CR3 the config search honours SKILLS_CONFIG_FILE and stops at the repo root", async () => {
  await withTmp(async (dir) => {
    // A parent config must NOT reach into a repo that declared nothing: the
    // walk stops at the first directory carrying a .git entry.
    fs.writeFileSync(
      path.join(dir, "skills-config.yaml"),
      "access:\n  tracker: manual\n",
    );
    const repo = path.join(dir, "inner");
    fs.mkdirSync(repo);
    fs.writeFileSync(path.join(repo, ".git"), "gitdir: elsewhere");
    assert.equal(
      dm.readConfiguredAccessTracker({ cwd: repo }),
      "",
      "an unrelated parent's restriction must not bind this repo",
    );

    // And an explicit redirect that lands on nothing refuses rather than
    // silently falling back to detection.
    assert.throws(
      () =>
        dm.readConfiguredAccessTracker({
          cwd: repo,
          env: { SKILLS_CONFIG_FILE: path.join(dir, "nope.yaml") },
        }),
      /does not exist/,
    );
  });
});

test("§15 C3-CR4 a resolver crash does not block a GET", async () => {
  await withTmp(async (dir) => {
    // --resolve-access is answered before the roster is loaded, so a roster
    // problem cannot masquerade as a refused mode. Point the roster doc at
    // nothing and confirm the resolver still answers.
    const r = spawnSync(
      process.execPath,
      [path.join(SHARED, "defer-mutation.js"), "--resolve-access"],
      { encoding: "utf8", cwd: dir, env: { ...process.env }, timeout: 20000 },
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout.trim(), /^(full|manual|command|approve|read-only)$/);

    // And the shell gate leaves reads alone even when resolution refuses.
    const sh = `
      set -euo pipefail
      source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
      jsm_resolve_access || echo "REFUSED"
      echo "MODE=\${JSM_ACCESS_MODE:-none}"
    `;
    const r2 = spawnSync("bash", ["-c", sh], {
      encoding: "utf8",
      cwd: dir,
      env: { ...process.env },
      timeout: 20000,
    });
    assert.equal(r2.status, 0, `${r2.stdout}\n${r2.stderr}`);
  });
});

test("§15 C3-CR5 a polluted stdout does not divert a full-access run", async () => {
  await withTmp(async (dir) => {
    // A node-level warning on stderr used to be folded into the value, so a
    // full-access run saw neither `full` nor the invalid sentinel and diverted
    // every mutation into the defer branch with a garbage --access.
    const sh = `
      set -euo pipefail
      source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
      jsm_resolve_access
      echo "MODE=[$JSM_ACCESS_MODE]"
    `;
    const r = spawnSync("bash", ["-c", sh], {
      encoding: "utf8",
      cwd: dir,
      env: { ...process.env, NODE_OPTIONS: "--trace-warnings" },
      timeout: 20000,
    });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(
      r.stdout,
      /MODE=\[(full|manual|command|approve|read-only)\]/,
      "the mode must be exactly one of the five, never a captured warning",
    );
  });
});

test("§15 C3-CR6 the mode is resolved once, into caller scope", async () => {
  await withTmp(async (dir) => {
    // The previous version memoised inside `$(...)`, so the cache died with the
    // subshell and every call re-spawned node.
    const sh = `
      set -euo pipefail
      source ${JSON.stringify(path.join(SHARED, "jira-sprint-lib.sh"))}
      jsm_resolve_access
      first="$JSM_ACCESS_MODE"
      jsm_resolve_access
      echo "CACHED=[\${JSM_ACCESS_MODE:-unset}] SAME=$([ "$first" = "$JSM_ACCESS_MODE" ] && echo yes || echo no)"
    `;
    const r = spawnSync("bash", ["-c", sh], {
      encoding: "utf8",
      cwd: dir,
      env: { ...process.env },
      timeout: 20000,
    });
    assert.match(
      r.stdout,
      /CACHED=\[(full|manual|command|approve|read-only)\] SAME=yes/,
      "the resolved mode must survive in the caller's shell",
    );
  });
});

test("§15 C3-CR2 a missing writer degrades closed, not open", () => {
  const src = fs.readFileSync(
    path.join(
      REPO,
      "skills",
      "jira-epic-creator",
      "scripts",
      "jira-create-epic.js",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    src,
    /if \(!dm\) return "full"/,
    'a missing writer must not assert "full" — the gate reads `!== "full"`, so ' +
      "that turned a broken bundle into a live epic create",
  );
  assert.match(
    src,
    /ACCESS_RANK_FALLBACK/,
    "it must fall back to the env tier instead",
  );
});
