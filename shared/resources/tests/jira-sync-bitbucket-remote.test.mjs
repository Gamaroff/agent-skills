// jira-sync-bitbucket-remote.test.mjs — which git remotes derive a Bitbucket browse base
//
// Guards task.264. `getBitbucketRepoBase` rewrote only `git@bitbucket.org:`; every other
// shape Bitbucket Cloud serves returned null, and on a null base an update of an existing
// card was written without its "Source Documents" links. `parseBitbucketRemote` is the
// pure parser that replaces the rewrite; `getBitbucketRepoBase` is exercised against a
// real repository so the wiring is held too, not just the function.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const lib = require(join(__dirname, "..", "jira-sync.js"));

const BASE = "https://bitbucket.org/w/r";

const DERIVES = [
  ["scp, bitbucket.org", "git@bitbucket.org:w/r.git"],
  ["https", "https://bitbucket.org/w/r.git"],
  ["scp, ssh.bitbucket.org", "git@ssh.bitbucket.org:w/r.git"],
  ["https with a user", "https://u@bitbucket.org/w/r.git"],
  ["ssh://", "ssh://git@bitbucket.org/w/r.git"],
  ["ssh:// on ssh.bitbucket.org", "ssh://git@ssh.bitbucket.org/w/r.git"],
  [
    "ssh:// on altssh with a port",
    "ssh://git@altssh.bitbucket.org:443/w/r.git",
  ],
  ["no .git suffix", "https://bitbucket.org/w/r"],
  ["trailing slash", "https://bitbucket.org/w/r/"],
  ["upper-case host", "https://Bitbucket.ORG/w/r.git"],
];

for (const [name, remote] of DERIVES) {
  test(`parseBitbucketRemote derives the base: ${name}`, () => {
    assert.equal(lib.parseBitbucketRemote(remote), BASE);
  });
}

test("parseBitbucketRemote never carries a credential into the base", () => {
  const out = lib.parseBitbucketRemote(
    "https://user:s3cr3t-token@bitbucket.org/w/r.git",
  );
  assert.equal(out, BASE);
  assert.ok(!/s3cr3t|user|@/.test(out), `credential leaked into ${out}`);
});

const REFUSED = [
  ["an unknown host", "git@github.com:w/r.git"],
  ["a look-alike host (suffix)", "https://bitbucket.org.evil.example/w/r.git"],
  ["a look-alike host (prefix)", "https://evilbitbucket.org/w/r.git"],
  ["a look-alike scp host", "git@bitbucket.org.evil.example:w/r.git"],
  ["an unlisted subdomain", "https://api.bitbucket.org/w/r.git"],
  ["an empty string", ""],
  ["undefined", undefined],
  ["a one-segment path", "https://bitbucket.org/w.git"],
  ["a three-segment path", "https://bitbucket.org/w/r/extra.git"],
];

for (const [name, remote] of REFUSED) {
  test(`parseBitbucketRemote returns null for ${name}`, () => {
    assert.equal(lib.parseBitbucketRemote(remote), null);
  });
}

// The wiring: getBitbucketRepoBase reads `origin` of the repository it runs in.
function baseForRemote(remote, env = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "bbremote-")));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    if (remote)
      execFileSync("git", ["remote", "add", "origin", remote], { cwd: dir });
    const saved = { cwd: process.cwd(), env: process.env.BITBUCKET_REPO_URL };
    process.chdir(dir);
    try {
      if (env.BITBUCKET_REPO_URL === undefined)
        delete process.env.BITBUCKET_REPO_URL;
      else process.env.BITBUCKET_REPO_URL = env.BITBUCKET_REPO_URL;
      return lib.getBitbucketRepoBase();
    } finally {
      process.chdir(saved.cwd);
      if (saved.env === undefined) delete process.env.BITBUCKET_REPO_URL;
      else process.env.BITBUCKET_REPO_URL = saved.env;
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("getBitbucketRepoBase derives the base from an ssh.bitbucket.org origin", () => {
  assert.equal(baseForRemote("git@ssh.bitbucket.org:w/r.git"), BASE);
});

test("getBitbucketRepoBase derives the base from an ssh:// altssh origin", () => {
  assert.equal(
    baseForRemote("ssh://git@altssh.bitbucket.org:443/w/r.git"),
    BASE,
  );
});

test("getBitbucketRepoBase returns null for a non-Bitbucket origin", () => {
  assert.equal(baseForRemote("https://github.com/w/r.git"), null);
});

test("getBitbucketRepoBase returns null with no origin at all", () => {
  assert.equal(baseForRemote(null), null);
});

test("BITBUCKET_REPO_URL wins over the remote, trailing slash stripped", () => {
  assert.equal(
    baseForRemote("git@bitbucket.org:a/b.git", {
      BITBUCKET_REPO_URL: "https://bitbucket.org/x/y/",
    }),
    "https://bitbucket.org/x/y",
  );
});

test("an empty BITBUCKET_REPO_URL falls through to the remote", () => {
  assert.equal(
    baseForRemote("git@bitbucket.org:w/r.git", { BITBUCKET_REPO_URL: "" }),
    BASE,
  );
});

// The refusal message an update prints when no base can be derived.
function messageForRemote(remote) {
  const dir = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "bbmsg-")));
  const cwd = process.cwd();
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    if (remote)
      execFileSync("git", ["remote", "add", "origin", remote], { cwd: dir });
    process.chdir(dir);
    return lib.missingBitbucketBaseMessage("PROJ-9");
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("the refusal names the env var, the card and the exact line to set", () => {
  const msg = messageForRemote("https://git.example.com/team/proj.git");
  assert.match(msg, /PROJ-9/);
  assert.match(msg, /BITBUCKET_REPO_URL=https:\/\/bitbucket\.org\/team\/proj/);
  assert.match(msg, /git\.example\.com/, "it must name the remote it read");
});

test("the refusal never prints a credential from the remote", () => {
  const msg = messageForRemote(
    "https://user:s3cr3t-token@git.example.com/team/proj.git",
  );
  assert.ok(!/s3cr3t|user:/.test(msg), `credential leaked: ${msg}`);
});

test("the refusal still gives the template line when there is no remote", () => {
  const msg = messageForRemote(null);
  assert.match(
    msg,
    /BITBUCKET_REPO_URL=https:\/\/bitbucket\.org\/<workspace>\/<repo>/,
  );
  assert.match(msg, /origin: none/);
});
