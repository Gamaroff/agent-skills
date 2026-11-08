/**
 * The executed-prose fixture template must not start background git work (task 271, Arm 2's
 * root-cause half; obs #50). A detached `git maintenance run --auto` spawned by the template's
 * commits and pushes can still be touching the object store while `fixtureRepo()` copies it, which
 * is the suspected cause of the one-in-6142 ENOENT on task.205 (not reproduced).
 *
 * The assertion is behavioural: build a template in a child process with git's own trace turned on,
 * and read what git spawned. Non-vacuity: the trace must show the commits the template made, so an
 * empty trace (git not traced at all) cannot pass this test.
 *
 * Run via: CI=true node --test shared/resources/tests/executed-prose-no-background-git.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB = pathToFileURL(join(__dirname, "lib", "executed-prose.mjs")).href;

test("building and copying the fixture template spawns no git maintenance or gc", () => {
  const dir = mkdtempSync(join(tmpdir(), "fin-prose-bg-"));
  const trace = join(dir, "trace.json");
  try {
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const { fixtureRepo } = await import(${JSON.stringify(LIB)}); fixtureRepo();`,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, GIT_TRACE2_EVENT: trace, TMPDIR: dir },
      },
    );
    assert.equal(child.status, 0, child.stderr);
    const events = readFileSync(trace, "utf8");
    // Non-vacuity: git was traced and did the template's commit and push.
    assert.match(events, /"argv":\[[^\]]*"commit"/, "the trace saw no commit");
    assert.match(events, /"argv":\[[^\]]*"push"/, "the trace saw no push");
    assert.doesNotMatch(
      events,
      /"argv":\[[^\]]*"(maintenance|gc)"/,
      "git spawned background maintenance while building the template",
    );
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
});
