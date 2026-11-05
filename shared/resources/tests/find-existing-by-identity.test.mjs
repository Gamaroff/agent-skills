/**
 * `findExistingByIdentity` — the guard that replaced the `synced-from-*` label.
 *
 * `summary ~` is a tokenised, over-matching text search, so the query only
 * yields candidates; the exact leading-bracket comparison is the guard. These
 * tests feed the finder hits a real tenant could return and assert which ones
 * are adopted.
 *
 * Run: node --test shared/resources/tests/find-existing-by-identity.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lib = require("../jira-sync.js");

function search(issues) {
  const calls = [];
  const http = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ issues }) };
  };
  return { http, calls };
}

const base = {
  baseUrl: "https://x.example",
  email: "a@b.c",
  token: "t",
  projectKey: "PROJ",
};

const WARN = { warn() {}, info() {} };

test("a near-miss id from the tokenised search is NOT adopted", async () => {
  const { http } = search([
    { key: "PROJ-1", fields: { summary: "[Task 12] Other", labels: [] } },
    { key: "PROJ-2", fields: { summary: "Follow-up to [Task 1]", labels: [] } },
  ]);
  const found = await lib.findExistingByIdentity({
    ...base,
    http,
    summary: "[Task 1] Cache",
    output: WARN,
  });
  assert.equal(found, null);
});

test("an exact leading id is adopted, case-insensitively, even if the title changed", async () => {
  const { http } = search([
    {
      key: "PROJ-7",
      fields: { summary: "[story.1.7.4.BUG.4] Renamed", labels: [] },
    },
  ]);
  const found = await lib.findExistingByIdentity({
    ...base,
    http,
    summary: "[story.1.7.4.bug.4] Tap target",
    output: WARN,
  });
  assert.equal(found.key, "PROJ-7");
});

test("a legacy label hit is adopted without an id match", async () => {
  const { http } = search([
    { key: "PROJ-3", fields: { summary: "No id", labels: ["synced-from-x"] } },
  ]);
  const found = await lib.findExistingByIdentity({
    ...base,
    http,
    summary: "[Task 9] T",
    legacyLabel: "synced-from-x",
    output: WARN,
  });
  assert.equal(found.key, "PROJ-3");
});

test("the query names the id phrase and the legacy label", async () => {
  const { http, calls } = search([]);
  await lib.findExistingByIdentity({
    ...base,
    http,
    summary: '[Task 9] has "quotes"',
    legacyLabel: "synced-from-x",
    output: WARN,
  });
  const jql = calls[0].body.jql;
  assert.match(jql, /summary ~ "\\"Task 9\\""/);
  assert.match(jql, /labels = "synced-from-x"/);
});

test("a summary with no leading id warns and searches nothing", async () => {
  const { http, calls } = search([]);
  const warnings = [];
  const found = await lib.findExistingByIdentity({
    ...base,
    http,
    summary: "Bare title",
    output: { warn: (m) => warnings.push(m), info() {} },
  });
  assert.equal(found, null);
  assert.equal(calls.length, 0);
  assert.equal(warnings.length, 1);
});
