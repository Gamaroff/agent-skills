// Decide whether a clean-checkout base location is usable, in one place.
//
// scripts/test-clean-checkout.sh runs this as a CLI; the decision is also an
// export so security-probe.mjs can reach it through `path#export` (task 154 DoD:
// as an inline `node -e` reading an environment variable, no probe entry form
// could deliver a candidate to it, and probe mode executed nothing).
//
// resolveBase(raw) returns the resolved absolute base, or THROWS with the
// reason. It never writes: the runner makes the one `mkdir` itself. A base is
// refused when it
//   - is empty, or carries a control character (it could not be reported or
//     split safely) — checked on the path as given and again as resolved, since
//     a symlink component can carry one the given path did not;
//   - is ephemeral in any spelling observation-log.js classifies (macOS resolves
//     /var/tmp to /private/var/tmp, which the engine does not list), because
//     observation-log.test.mjs refuses a scratch base there;
//   - is not an existing writable directory, or a path whose parent is one — so
//     the runner's single `mkdir` creates it and no parent it would never remove.
//
// CLI: `node clean-checkout-base.mjs <raw>` prints `OK` then the resolved base
// on the next line, or `REFUSE` then the reason, and exits 0 either way; exit 2
// is a usage error.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  ephemeralReason,
} = require("../../shared/resources/observation-log.js");

const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

export function resolveBase(raw) {
  if (typeof raw !== "string" || raw === "") {
    throw new Error(`${JSON.stringify(raw)} — the base is empty`);
  }
  if (CONTROL_CHAR.test(raw)) {
    throw new Error(`${JSON.stringify(raw)} — it contains a control character`);
  }
  const given = path.resolve(raw);
  let p = given;
  const tail = [];
  while (!fs.existsSync(p) && path.dirname(p) !== p) {
    tail.unshift(path.basename(p));
    p = path.dirname(p);
  }
  const abs = path.join(fs.realpathSync.native(p), ...tail);
  if (CONTROL_CHAR.test(abs)) {
    throw new Error(
      `${JSON.stringify(abs)} — it resolves to a path with a control character`,
    );
  }
  const spellings = [abs, given];
  for (const s of [abs, given]) {
    if (s.startsWith("/private/var/"))
      spellings.push(s.slice("/private".length));
  }
  for (const s of spellings) {
    const why = ephemeralReason(s);
    if (why) {
      throw new Error(
        `${abs} — ${why}, which observation-log.test.mjs refuses as a scratch base; set CLEAN_CHECKOUT_DIR elsewhere`,
      );
    }
  }
  if (tail.length > 1) {
    throw new Error(
      `${abs} — its parent directory does not exist; create it first`,
    );
  }
  const target = tail.length === 0 ? abs : path.dirname(abs);
  let st;
  try {
    st = fs.statSync(target);
  } catch (e) {
    throw new Error(`${target} — it cannot be read (${e.code})`);
  }
  if (!st.isDirectory()) throw new Error(`${target} — it is not a directory`);
  try {
    fs.accessSync(target, fs.constants.W_OK | fs.constants.X_OK);
  } catch (e) {
    throw new Error(`${target} — it is not writable (${e.code})`);
  }
  return abs;
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(process.argv[1]) ===
      fs.realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isMain()) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    process.stderr.write("usage: clean-checkout-base.mjs <base>\n");
    process.exitCode = 2;
  } else {
    let out;
    try {
      out = `OK\n${resolveBase(args[0])}`;
    } catch (e) {
      out = `REFUSE\n${e.message}`;
    }
    process.stdout.write(out);
  }
}
