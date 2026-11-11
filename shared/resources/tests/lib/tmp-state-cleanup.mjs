// Temp-directory bookkeeping for tests that start a background recorder (task.291).
//
// The status-line wrapper starts `context-pressure.mjs record` detached and never waits for it, and
// the recorder creates its state directory — and any missing parent — with
// `mkdirSync(dir, { recursive: true })`. A test that ends while its recorder is still running can
// therefore have its temp directory removed by an `after` hook and then RECREATED by the recorder,
// and nothing removes it again: a leaked directory, intermittently (1 run in 100 unloaded, 3 in 100
// under load, measured on 2026-11-11).
//
// The fix is to wait, not to retry: only the recorder's mkdir can recreate a removed directory, and
// it writes its file after the mkdir, so once the file exists the recorder can no longer recreate
// anything. `cleanup` waits (bounded) for every file a test said to expect, then removes.
//
// Not a test file: it lives in tests/lib/, which the runner's `*.test.mjs` glob does not reach, so
// it is imported and never run on its own.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const POLL_MS = 50;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {object} opts
 * @param {string} opts.prefix   `mkdtemp` prefix for every directory this tracker makes.
 * @param {string} [opts.base]   Parent of those directories (default: the OS temp directory).
 * @param {number} [opts.waitMs] The one bound on waiting, across every expected file.
 */
export function createTmpTracker({
  prefix,
  base = os.tmpdir(),
  waitMs = 3000,
}) {
  const dirs = [];
  const expected = [];
  return {
    /** Make a directory and remember it for `cleanup`. */
    tmpdir() {
      const d = fs.mkdtempSync(path.join(base, prefix));
      dirs.push(d);
      return d;
    },
    /** Say a background recorder will write `file`; `cleanup` waits for it. Returns `file`. */
    expectRecord(file) {
      expected.push(file);
      return file;
    },
    /** Wait for every expected file (bounded by `waitMs` in total), then remove every directory. */
    async cleanup() {
      const end = Date.now() + waitMs;
      for (const file of expected) {
        while (!fs.existsSync(file) && Date.now() < end) await sleep(POLL_MS);
      }
      for (const d of dirs)
        fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 });
    },
  };
}
