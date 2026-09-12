/**
 * evals/shared/lib/bundled-parity.mjs — the helper that asks the bundler
 * whether a copy is fresh, and the one property that matters most about it:
 * it fails CLOSED.
 *
 * task.108 QA cycle 1, CR-1: the first cut returned `!problems.has(rel)` and
 * never consulted `ok`, so a runner without `python3` certified every
 * banner-carrying copy as fresh — the MCP-comment allowlist in
 * transition-protocol-parity.test.mjs would have been satisfied by the exact
 * environment that could not check it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bundleCheck,
  declaredSource,
  isFreshBundledCopy,
} from "../lib/bundled-parity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");
const BUNDLER = join(
  repoRoot,
  "skills",
  "create-skill",
  "scripts",
  "bundle_skill.py",
);

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "bundled-parity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "shared", "resources"), { recursive: true });
  const skill = join(root, "skills", "x");
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(root, "package.json"), '{"name":"f"}\n');
  writeFileSync(
    join(skill, "SKILL.md"),
    "---\nname: x\ndescription: d\n---\nsee shared/resources/a.md\n",
  );
  writeFileSync(join(root, "shared", "resources", "a.md"), "# A\n");
  execFileSync("python3", [BUNDLER, skill], { encoding: "utf-8" });
  return { root, skill, copy: join(skill, "references", "a.md") };
}

test("a freshly bundled copy is fresh; its banner names the source", (t) => {
  const { skill, copy } = fixture(t);
  assert.equal(declaredSource(copy), "a.md");
  assert.equal(bundleCheck(skill).ok, true);
  assert.equal(isFreshBundledCopy(copy, "a.md"), true);
  assert.equal(isFreshBundledCopy(copy, "b.md"), false, "wrong source");
});

test("a tampered copy is not fresh, and the problem names it", (t) => {
  const { skill, copy } = fixture(t);
  appendFileSync(copy, "tampered\n");
  const r = bundleCheck(skill);
  assert.equal(
    r.ran,
    true,
    "the bundler ran — the problem is real, not a crash",
  );
  assert.equal(r.ok, false);
  assert.match(r.problems.get("a.md") ?? "", /STALE/);
  assert.equal(isFreshBundledCopy(copy, "a.md"), false);
});

test("fails CLOSED: a bundler that cannot run certifies nothing", (t) => {
  const { skill, copy } = fixture(t);
  const opts = { python: join(skill, "no-such-python-binary") };
  const r = bundleCheck(skill, opts);
  assert.equal(r.ran, false, "ran must be false when the check could not run");
  assert.equal(r.ok, false, "ok must be false when the check could not run");
  assert.equal(
    r.problems.size,
    0,
    "and there are no problems — for the wrong reason",
  );
  assert.equal(
    isFreshBundledCopy(copy, "a.md", opts),
    false,
    "a copy nobody could look at is not fresh",
  );
});

test("a stale UNRELATED sibling does not de-allowlist a fresh copy", (t) => {
  const { root, skill, copy } = fixture(t);
  // Bundle a second shared file, then tamper only that one.
  writeFileSync(join(root, "shared", "resources", "b.md"), "# B\n");
  appendFileSync(join(skill, "SKILL.md"), "and shared/resources/b.md\n");
  execFileSync("python3", [BUNDLER, skill], { encoding: "utf-8" });
  appendFileSync(join(skill, "references", "b.md"), "tampered\n");
  const r = bundleCheck(skill);
  assert.equal(r.ran, true);
  assert.equal(r.ok, false, "the skill as a whole is not clean");
  assert.equal(
    isFreshBundledCopy(copy, "a.md"),
    true,
    "but a.md itself is fresh",
  );
  assert.equal(
    isFreshBundledCopy(join(skill, "references", "b.md"), "b.md"),
    false,
  );
});
