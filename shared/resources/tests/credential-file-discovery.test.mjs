// credential-file-discovery.test.mjs — where credentials are read from, and
// what happens when they are not found.
//
// Each block guards a defect class that was live before this change, or that the
// change itself makes newly reachable:
//
//   A — precedence.     `.secrets/tooling.env` must beat `.env` for the same key,
//                       or an Nx consumer that migrates gets the OLD token from
//                       the file Nx broadcasts into every task's environment.
//   B — merge, not      Stopping at the first file that exists strands every key
//       first-file.     the consumer has not moved yet. Merging can only ADD a
//                       key relative to the old one-file behaviour.
//   C — shell wins.     An already-set process.env key is never overwritten —
//                       the pre-existing contract, easy to lose in a rewrite.
//   D — the silent      THE defect. `loadDotEnv()` used to `return` on a missing
//       no-op.          file and swallow every error, so a relocated or unseeded
//                       credential file made every /sync-jira-* and /develop-*
//                       tracker stage run, report success, and update nothing.
//                       A consumer cannot safely move its credential file until
//                       something says so out loud.
//   E — file present,   The same silent no-op arrives by a second route: a file
//       keys absent.    that exists but omits the keys. Warning on "no file"
//                       alone would miss it.
//   F — no false        A consumer who exports the keys in their shell needs no
//       alarm.          file and must not be nagged. A warning that is usually
//                       noise is one nobody reads when it is not.
//   G — gh-stage        gh-stage must NOT warn: the only key it supplies is
//       asymmetry.      optional with a default, so absence is the normal case.
//                       The asymmetry with jira-sync.js is deliberate.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const lib = require("../jira-sync.js");
const gh = require("../gh-stage.js");

const GIT_QUIET = { stdio: ["ignore", "ignore", "ignore"] };

/** A throwaway git repo with the given files written into it. */
function makeRepo(files = {}) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "cred-test-")),
  );
  execSync("git init", { cwd: root, ...GIT_QUIET });
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

/**
 * Run `fn` with cwd at `root`, a pristine process.env seeded from `env`, and
 * stderr captured. Restores all three however `fn` exits.
 */
function inRepo(root, env, fn) {
  const cwd0 = process.cwd();
  const env0 = process.env;
  const write0 = process.stderr.write;
  let stderr = "";
  process.chdir(root);
  process.env = { ...env };
  process.stderr.write = (chunk) => {
    stderr += chunk;
    return true;
  };
  lib._resetCredentialWarning();
  try {
    const value = fn();
    return { value, stderr, env: process.env };
  } finally {
    process.stderr.write = write0;
    process.env = env0;
    process.chdir(cwd0);
    lib._resetCredentialWarning();
  }
}

const BOTH_KEYS = { JIRA_URL: "https://x.atlassian.net", JIRA_API_TOKEN: "t" };

// ── A — precedence ───────────────────────────────────────────────────────────

test("A: .secrets/tooling.env wins over .env for the same key", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "JIRA_API_TOKEN=from_secrets\n",
    ".env": "JIRA_API_TOKEN=from_dotenv\n",
  });
  const { env } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.equal(env.JIRA_API_TOKEN, "from_secrets");
});

test("A: precedence order is declared, not incidental", () => {
  assert.deepEqual(lib.CREDENTIAL_FILES, [".secrets/tooling.env", ".env"]);
  // Both loaders must agree, or a consumer has two credential locations.
  assert.deepEqual(gh.CREDENTIAL_FILES, lib.CREDENTIAL_FILES);
});

// ── B — merge, not first-file-wins ───────────────────────────────────────────

test("B: a key present only in .env is still loaded when .secrets exists", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "JIRA_URL=https://x.atlassian.net\n",
    ".env": "BITBUCKET_API_TOKEN=only_in_dotenv\n",
  });
  const { env } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.equal(env.JIRA_URL, "https://x.atlassian.net");
  assert.equal(
    env.BITBUCKET_API_TOKEN,
    "only_in_dotenv",
    "stopping at the first existing file would strand every unmigrated key",
  );
});

test("B: loadDotEnv reports which files it actually read", () => {
  const root = makeRepo({ ".env": "JIRA_URL=u\nJIRA_API_TOKEN=t\n" });
  const { value } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.equal(value.loaded.length, 1);
  assert.ok(value.loaded[0].endsWith(".env"));
  assert.ok(
    value.searched.some((p) => p.endsWith(".secrets/tooling.env")),
    "the new path must be searched even when absent, or the report misleads",
  );
});

// ── C — an already-set key is never overwritten ──────────────────────────────

test("C: the shell beats every file", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "JIRA_API_TOKEN=from_secrets\n",
    ".env": "JIRA_API_TOKEN=from_dotenv\n",
  });
  const { env } = inRepo(root, { JIRA_API_TOKEN: "from_shell" }, () =>
    lib.loadDotEnv(),
  );
  assert.equal(env.JIRA_API_TOKEN, "from_shell");
});

// ── D — the silent no-op is over ─────────────────────────────────────────────

test("D: no credential file anywhere warns on stderr and names both paths", () => {
  const root = makeRepo({});
  const { stderr } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.match(stderr, /JIRA_URL, JIRA_API_TOKEN not set/);
  assert.match(stderr, /\.secrets\/tooling\.env/);
  assert.match(stderr, /\.env/);
  assert.match(stderr, /loaded:\s+\(none\)/);
  assert.match(
    stderr,
    /updating nothing/,
    "the warning must name the failure mode, not just the absence",
  );
});

test("D: the warning is once per process", () => {
  const root = makeRepo({});
  const { stderr } = inRepo(root, {}, () => {
    lib.loadDotEnv();
    lib.loadDotEnv();
    lib.loadDotEnv();
  });
  assert.equal(stderr.match(/agent-skills:/g).length, 1);
});

test("D: loadDotEnv never throws, whatever it finds", () => {
  const root = makeRepo({ ".secrets/tooling.env": "  not=valid\n" });
  assert.doesNotThrow(() => inRepo(root, {}, () => lib.loadDotEnv()));
});

// ── E — file present, keys absent ────────────────────────────────────────────

test("E: a file that exists but omits the keys still warns", () => {
  const root = makeRepo({ ".secrets/tooling.env": "SOME_OTHER_KEY=1\n" });
  const { stderr } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.match(stderr, /JIRA_URL, JIRA_API_TOKEN not set/);
  assert.match(
    stderr,
    /loaded:\s+\S+tooling\.env/,
    "it must say the file WAS read — otherwise the reader hunts for a missing file that exists",
  );
  assert.doesNotMatch(
    stderr,
    /fix: create/,
    "do not tell someone to create a file they already have",
  );
});

test("E: a partially-filled file names only the keys actually missing", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "JIRA_URL=https://x.atlassian.net\n",
  });
  const { stderr } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.match(stderr, /JIRA_API_TOKEN not set/);
  assert.doesNotMatch(stderr, /JIRA_URL,/);
});

// ── F — no false alarm ───────────────────────────────────────────────────────

test("F: keys exported in the shell suppress the warning entirely", () => {
  const root = makeRepo({});
  const { stderr } = inRepo(root, BOTH_KEYS, () => lib.loadDotEnv());
  assert.equal(stderr, "", "a consumer with shell credentials needs no file");
});

test("F: a complete credential file is silent", () => {
  const root = makeRepo({
    ".secrets/tooling.env":
      "JIRA_URL=https://x.atlassian.net\nJIRA_API_TOKEN=t\n",
  });
  const { stderr } = inRepo(root, {}, () => lib.loadDotEnv());
  assert.equal(stderr, "");
});

// ── G — gh-stage reads the new path but stays quiet ──────────────────────────

test("G: gh-stage reads .secrets/tooling.env", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "GH_PROJECT_STATUS_FIELD=Stage\n",
  });
  const { env } = inRepo(root, {}, () => gh.loadDotEnv(root));
  assert.equal(env.GH_PROJECT_STATUS_FIELD, "Stage");
});

test("G: gh-stage still reads .env, and .secrets wins", () => {
  const root = makeRepo({
    ".secrets/tooling.env": "GH_PROJECT_STATUS_FIELD=FromSecrets\n",
    ".env": "GH_PROJECT_STATUS_FIELD=FromDotenv\nOTHER_KEY=kept\n",
  });
  const { env } = inRepo(root, {}, () => gh.loadDotEnv(root));
  assert.equal(env.GH_PROJECT_STATUS_FIELD, "FromSecrets");
  assert.equal(env.OTHER_KEY, "kept");
});

test("G: gh-stage does NOT warn when no credential file exists", () => {
  const root = makeRepo({});
  const { stderr } = inRepo(root, {}, () => gh.loadDotEnv(root));
  assert.equal(
    stderr,
    "",
    "its only key is optional with a default — warning here would fire on every GitHub consumer and mean nothing",
  );
});
