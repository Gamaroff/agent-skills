// Guards for WHERE setup-consumer.sh writes credentials, and for the gitignore
// rule that protects them.
//
// The two must stay welded together. Writing credentials to `.secrets/` without
// an ignore rule is strictly worse than leaving them in `.env` — it moves a
// live token from an ignored path to an unignored one. That is why the path
// change and the rule shipped in the same task, and why the test that would
// catch them coming apart is the most important one here.
//
// The wizard deliberately does NOT move an existing `.env`. It holds live
// credentials, and a wizard that relocates one under the user's feet is one bad
// path expansion away from destroying the only copy. The byte-identical
// assertion below pins that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WIZARD = path.join(REPO, "scripts", "setup-consumer.sh");
const CRED = ".secrets/tooling.env";

const LINES = [
  "JIRA_URL=https://example.atlassian.net",
  "JIRA_API_TOKEN=ATATTtoken",
  "BITBUCKET_USERNAME=jsmith",
];

// Every path the assertions below can ask about. Snapshotted eagerly, because
// of a trap this harness already fell into once: returning closures that read
// the temp directory lets `finally` delete it first, after which every
// existence check answers "absent" and every absence assertion passes for the
// wrong reason. Read inside the try, return plain data.
const SNAPSHOT_PATHS = [CRED, ".env", ".env.example", ".gitignore", ".secrets/tooling.env.example"];

// Drive write_env_files in isolation against a throwaway repo root.
// `seed` pre-creates files; `input` answers the prompts.
function runWizard({ seed = {}, input = "\n" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "setup-consumer-cred-"));
  try {
    for (const [rel, body] of Object.entries(seed)) {
      const abs = path.join(dir, rel);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, body);
    }
    const arr = LINES.map((l) => `'${l}'`).join(" ");
    const out = execFileSync(
      "bash",
      ["-c", `source '${WIZARD}'; ENV_LINES=(${arr}); write_env_files`],
      {
        cwd: dir,
        input,
        env: { ...process.env, SETUP_CONSUMER_NO_MAIN: "1", DRY_RUN: "false" },
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const files = {};
    for (const rel of SNAPSHOT_PATHS) {
      const abs = path.join(dir, rel);
      files[rel] = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
    }
    return {
      out,
      read: (rel) => {
        if (!(rel in files)) throw new Error(`add ${rel} to SNAPSHOT_PATHS`);
        return files[rel];
      },
      exists: (rel) => {
        if (!(rel in files)) throw new Error(`add ${rel} to SNAPSHOT_PATHS`);
        return files[rel] !== null;
      },
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a fresh install writes credentials to .secrets/tooling.env, not .env", () => {
  const r = runWizard();
  assert.ok(r.exists(CRED), `expected ${CRED} to be written`);
  assert.ok(
    !r.exists(".env"),
    "the wizard must not create a repo-root .env — that is the location this moved away from",
  );
  assert.match(r.read(CRED), /JIRA_API_TOKEN=ATATTtoken/);
});

test("the gitignore rule covers .secrets/ AND .env", () => {
  const gi = runWizard().read(".gitignore");
  assert.ok(gi, ".gitignore must be created when absent");
  // .secrets/ protects the file just written. Losing this rule is the one
  // outcome strictly worse than never having moved the credentials at all.
  assert.match(gi, /^\.secrets\/$/m, ".secrets/ must be ignored");
  // .env stays: the loaders still read it, and a migrating consumer has one.
  assert.match(gi, /^\.env$/m, ".env must remain ignored");
});

test("an existing .gitignore is appended to, not replaced", () => {
  const gi = runWizard({ seed: { ".gitignore": "node_modules/\ndist/\n" } }).read(".gitignore");
  assert.match(gi, /node_modules\//, "pre-existing rules must survive");
  assert.match(gi, /^\.secrets\/$/m);
  assert.match(gi, /^\.env$/m);
});

test("a .gitignore whose last line is unterminated does not absorb the new rule", () => {
  // "dist/" + ".secrets/" = "dist/.secrets/", a rule matching neither path.
  // Silent, and the credential file it was meant to protect ends up tracked.
  const gi = runWizard({ seed: { ".gitignore": "node_modules/\ndist/" } }).read(".gitignore");
  assert.match(gi, /^dist\/$/m, "the unterminated line must stay intact");
  assert.match(gi, /^\.secrets\/$/m, ".secrets/ must be its own line");
  assert.ok(!/dist\/\.secrets/.test(gi), "the rules must not have been concatenated");
});

test("re-running does not duplicate the gitignore rules", () => {
  // The wizard is re-run on every `--update`; a rule appended each time turns
  // a two-line file into a hundred-line one.
  const gi = runWizard({ seed: { ".gitignore": ".secrets/\n.env\n" } }).read(".gitignore");
  assert.equal(gi.match(/^\.secrets\/$/gm).length, 1, ".secrets/ must appear once");
  assert.equal(gi.match(/^\.env$/gm).length, 1, ".env must appear once");
});

test("the tracked .env.example is not swallowed by the .secrets/ rule", () => {
  // It stays at the repo root precisely so the rule that protects the real
  // credential file cannot hide the example describing it.
  const r = runWizard();
  assert.ok(r.exists(".env.example"), ".env.example must be at the repo root");
  assert.ok(
    !r.exists(".secrets/tooling.env.example"),
    "the example must not live inside the ignored directory",
  );
});

test(".env.example names the new location and says .env still works", () => {
  const ex = runWizard().read(".env.example");
  assert.match(ex, /Copy to \.secrets\/tooling\.env/, "must name the new destination");
  assert.match(ex, /fallback/i, "must say a root .env is still read, or a migrating consumer panics");
  assert.match(ex, /^JIRA_API_TOKEN=$/m, "keys only, never values");
  assert.ok(!/ATATTtoken/.test(ex), "the example must never carry a real value");
});

test("an existing .env holding credentials is reported and left byte-identical", () => {
  const original = "JIRA_API_TOKEN=ATATTexisting\nSOMETHING_ELSE=1\n";
  const r = runWizard({ seed: { ".env": original } });
  assert.equal(r.read(".env"), original, "the wizard must never move or rewrite a live .env");
  assert.match(r.out, /mv \.env \.secrets\/tooling\.env/, "must print the exact migration command");
  assert.ok(r.exists(CRED), "the new file is still written alongside it");
});

test("a .env with no credentials in it triggers no migration advice", () => {
  // A consumer may keep application config in .env legitimately. Nagging about
  // one that holds no tooling token is noise, and noisy advice gets ignored.
  const r = runWizard({ seed: { ".env": "PORT=3000\nDEBUG=true\n" } });
  assert.ok(
    !/mv \.env/.test(r.out),
    "no migration advice when .env holds no tooling credential",
  );
});

test("declining the overwrite keeps an existing .secrets/tooling.env", () => {
  const original = "JIRA_API_TOKEN=ATATTkeepme\n";
  // Prompts: overwrite? -> "n". The write prompt is never reached.
  const r = runWizard({ seed: { [CRED]: original }, input: "n\n" });
  assert.equal(r.read(CRED), original, "declining must not clobber live credentials");
  // Content alone does not prove the guard ran: with the guard removed, "n"
  // answers the *write* prompt instead and the file is equally untouched. Pin
  // the guard by the branch it takes, or this passes for the wrong reason.
  assert.match(r.out, /already exists/, "the overwrite guard must have fired");
  assert.match(r.out, /existing file kept/, "must take the kept-existing branch");
});

test("accepting the overwrite replaces it", () => {
  const r = runWizard({ seed: { [CRED]: "JIRA_API_TOKEN=ATATTold\n" }, input: "y\n\n" });
  assert.match(r.read(CRED), /ATATTtoken/, "accepting must write the new values");
  assert.ok(!/ATATTold/.test(r.read(CRED)), "the old value must be gone");
});

test("declining the write leaves no credential file at all", () => {
  const r = runWizard({ input: "n\n" });
  assert.ok(!r.exists(CRED), "a declined write must not produce a half-formed credential file");
});
