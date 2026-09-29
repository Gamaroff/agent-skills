/**
 * Consumer-root helper — the one way a test builds a consumer-shaped root.
 *
 * Public API:
 *   makeConsumerRoot(repoRoot, prefix?) -> string   (absolute path)
 *
 * A consumer has `.agents/skills/<name>/…` because setup-consumer.sh vendors it.
 * This repository's root has it only through the developer's gitignored
 * `.agents/skills -> ../skills` symlink (.gitignore `.agents/skills`), which CI
 * does not have. So a test that runs a snippet reaching `.agents/skills/…` from
 * the repo root — or from the inherited cwd — passes locally and fails on every
 * CI push: finalise-bug-mode.test.mjs passed 71/71 locally and failed 19 rows in
 * CI (obs #149). Run such a snippet from HERE.
 *
 * The root lives under tmpdir(), which is fine for a snippet's cwd — the
 * ephemeral-location refusal in observation-log.js applies to a log workspace,
 * not to a working directory. It is removed on process exit.
 */

import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Every root this process built, removed by ONE exit hook. A listener per root
// trips Node's MaxListenersExceededWarning past ten roots in one test file.
const ROOTS = [];
let hooked = false;

/**
 * @param {string} repoRoot  this repository's root; its `skills/` is linked in
 * @param {string} [prefix]  mkdtemp prefix, so a leftover root names its test
 * @returns {string} the consumer root, with `.agents/skills -> <repoRoot>/skills`
 */
export function makeConsumerRoot(repoRoot, prefix = "consumer-") {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  mkdirSync(path.join(root, ".agents"));
  symlinkSync(
    path.join(repoRoot, "skills"),
    path.join(root, ".agents", "skills"),
  );
  ROOTS.push(root);
  if (!hooked) {
    hooked = true;
    process.on("exit", () => {
      for (const r of ROOTS) rmSync(r, { recursive: true, force: true });
    });
  }
  return root;
}
