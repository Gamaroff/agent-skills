// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/security-probe-ts-hook.mjs. Regenerate via `npm run bundle`.
/**
 * security-probe-ts-hook.mjs — the loader hook behind the TypeScript module
 * entry form of security-probe.mjs (task.314).
 *
 * The engine starts the `RUNNER` child with `--import <this file>` ONLY when the
 * entry ends in `.ts`, `.mts`, `.cts` or `.tsx`. This file runs in that child,
 * before the entry loads, and does two things with the TARGET repository's own
 * `typescript` package:
 *
 *   resolve  ts.resolveModuleName with the nearest tsconfig, so extensionless
 *            imports, `index.ts`, NodeNext `./x.js` -> `x.ts` and `paths` aliases
 *            resolve the way the project resolves them. Anything it does not
 *            resolve to a TypeScript source (packages, `node:` built-ins) is left
 *            to Node.
 *   load     ts.transpileModule to ESM. It never type-checks and writes nothing
 *            to disk, so the engine's escape check stays quiet.
 *
 * NOTHING a plan or a case supplies reaches this file. Its one input is
 * `PROBE_TS_COMPILER`, the absolute path of the compiler, which the engine
 * resolved in the parent after the entry passed `resolveEntry`'s containment
 * check and which it binds into the child's environment itself, with
 * `PROBE_TS_ROOT`, the repo root that bounds the tsconfig lookup. The engine does
 * the "is there a compiler, and does this Node have `registerHooks`" checks
 * BEFORE it spawns, because a throw inside an `--import` hook kills `node`
 * before the runner can report anything (review.1 I1); the guard below is only
 * the backstop for a caller that skips them.
 *
 * The hook API is the synchronous `module.registerHooks`, in Node since v22.15.0.
 */
import { createRequire, registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const compilerPath = process.env.PROBE_TS_COMPILER;
if (typeof compilerPath !== "string" || compilerPath === "") {
  throw new Error("security-probe-ts-hook: PROBE_TS_COMPILER is not set");
}
const ts = createRequire(import.meta.url)(compilerPath);
// The repo root, also bound by the engine: a tsconfig is looked for no higher
// than this, so one in a parent directory is never inherited (QA cycle 2).
const root = process.env.PROBE_TS_ROOT;
if (typeof root !== "string" || root === "") {
  throw new Error("security-probe-ts-hook: PROBE_TS_ROOT is not set");
}

const TS_SOURCE = /\.[cm]?tsx?$/;
const TS_DECLARATION = /\.d\.[cm]?ts$/;

/** The compiler options for the nearest tsconfig of `file`, parsed once per config. */
const optionsByConfig = new Map();
const NO_CONFIG = Symbol("no-tsconfig");
const configByDir = new Map();
function nearestConfig(dir) {
  if (!configByDir.has(dir)) {
    const found = ts.findConfigFile(dir, ts.sys.fileExists, "tsconfig.json");
    const rel = found === undefined ? "" : relative(root, found);
    const inside =
      rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
    configByDir.set(dir, found !== undefined && inside ? found : undefined);
  }
  return configByDir.get(dir);
}
function compilerOptions(file) {
  const config = nearestConfig(dirname(file));
  const key = config ?? NO_CONFIG;
  if (!optionsByConfig.has(key)) {
    let options;
    if (config === undefined) {
      // No tsconfig: classic resolution would not map `./x.js` to `x.ts`, so
      // state the default instead of inheriting the compiler's.
      options = {
        moduleResolution:
          ts.ModuleResolutionKind.Bundler ?? ts.ModuleResolutionKind.NodeJs,
      };
    } else {
      const { config: json } = ts.readConfigFile(config, ts.sys.readFile);
      options = ts.parseJsonConfigFileContent(
        json ?? {},
        ts.sys,
        dirname(config),
      ).options;
    }
    optionsByConfig.set(key, options);
  }
  return optionsByConfig.get(key);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL;
    if (
      typeof parent === "string" &&
      parent.startsWith("file:") &&
      TS_SOURCE.test(parent) &&
      !specifier.startsWith("node:") &&
      !specifier.startsWith("file:")
    ) {
      const parentFile = fileURLToPath(parent);
      const found = ts.resolveModuleName(
        specifier,
        parentFile,
        compilerOptions(parentFile),
        ts.sys,
      ).resolvedModule;
      if (
        found !== undefined &&
        !found.isExternalLibraryImport &&
        TS_SOURCE.test(found.resolvedFileName) &&
        !TS_DECLARATION.test(found.resolvedFileName)
      ) {
        return {
          url: pathToFileURL(found.resolvedFileName).href,
          shortCircuit: true,
        };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      !url.startsWith("file:") ||
      !TS_SOURCE.test(url) ||
      TS_DECLARATION.test(url)
    ) {
      return nextLoad(url, context);
    }
    const file = fileURLToPath(url);
    const options = compilerOptions(file);
    const out = ts.transpileModule(readFileSync(file, "utf8"), {
      // `transpileModule` emits CommonJS for a `.cts` name whatever `module`
      // says, and a CommonJS module's `require` is not routed through the resolve
      // hook on every supported Node (Node 22 failed on it, Node 26 did not). So
      // a `.cts` source is named `.mts` for the compiler and loaded as a module,
      // like every other TypeScript source here.
      fileName: file.replace(/\.cts$/, ".mts"),
      compilerOptions: {
        ...options,
        // TypeScript's own default is ES5, which downlevels classes: a thrown
        // `class E extends Error` then fails `instanceof E`, and the guard is
        // scored on code the repository never ships (QA cycle 2, T314-CR2-1).
        target: options.target ?? ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        // A JSX file with no `jsx` option emits raw JSX, which cannot be imported.
        jsx: options.jsx ?? ts.JsxEmit.ReactJSX,
        verbatimModuleSyntax: false,
        sourceMap: false,
        inlineSourceMap: false,
        declaration: false,
        noEmit: false,
      },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  },
});
