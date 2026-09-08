#!/usr/bin/env python3

"""
Skill Bundler — In-place version of package_skill.py.

Copies referenced `shared/resources/<file>` into `<skill>/references/<file>` and
rewrites `shared/resources/X` → `references/X` in the skill's .md and .js files
in place. Idempotent — running again is a no-op when already in sync.

This makes each skill directory self-contained so tools like `npx skills add`
that copy a skill's directory verbatim (without bundling) install a working
skill.

Usage:
    python bundle_skill.py <path/to/skill-folder>
    python bundle_skill.py --all                 # bundle every skill under skills/
"""

import re
import shutil
import sys
from pathlib import Path

from quick_validate import collect_shared_refs, find_repo_root

SHARED_REF_RE = re.compile(r'(?:\.\./)*shared/resources/([^\s`\'")\]*]+)')
JS_SHARED_RE = re.compile(
    r'(require\(["\'])(?:\.\./)+shared/resources/([^"\']+)(["\'])\)'
)
# ESM counterpart of JS_SHARED_RE, for `.mjs` (and any `.js` written as ESM):
#   import { x } from "../../../shared/resources/x.js"
#   import "../../shared/resources/x.js"
#   await import("../../shared/resources/x.js")
# `require()` and `import` are different syntax for the same edge, so both must be
# rewritten or a `.mjs` skill script breaks in every bundled install while passing
# in-repo — the un-bundled relative path resolves only here.
JS_ESM_SHARED_RE = re.compile(
    r'((?:from|import)\s+["\']|import\s*\(\s*["\'])(?:\.\./)+shared/resources/([^"\']+)(["\'])'
)
# Shell scripts under <skill>/scripts/ source shared libs via a relative path.
# Rewrite any `../…/shared/resources/<name>` to `../references/<name>` (the
# bundled location, one level up from scripts/).
SH_SHARED_RE = re.compile(r'(?:\.\./)+shared/resources/([A-Za-z0-9._-]+)')
# Matches already-rewritten in-tree references (so re-runs and partial states work).
REFS_REF_RE = re.compile(r'(?:^|[\s(\[`\'"/])references/([A-Za-z0-9._-]+\.(?:json|md|sh|js|mjs|py))')
# Sibling require/import in JS — `require("./foo.js")` — used to follow transitive
# deps inside bundled shared .js files.
JS_SIBLING_RE = re.compile(r'require\(["\']\./([A-Za-z0-9._/-]+\.js)["\']\)')
# ESM sibling counterpart — `import … from "./foo.js"` / `import("./foo.mjs")` —
# so transitive deps are followed inside bundled shared ESM files too.
JS_ESM_SIBLING_RE = re.compile(
    r'(?:(?:from|import)\s+["\']|import\s*\(\s*["\'])\./([A-Za-z0-9._/-]+\.m?js)["\']'
)
# Sibling source/exec in shell — for transitive deps inside bundled shared .sh
# files. Matches:
#   source "$(dirname "$0")/foo.sh"   |   exec "$(dirname "$0")/foo.sh" "$@"
#   source ./foo.sh                   |   . ./foo.sh
#   source foo.sh
SH_SIBLING_RE = re.compile(
    r'(?:source|exec|\.)\s+["\']?(?:\$\(dirname[^)]*\)/|\./)?([A-Za-z0-9._-]+\.sh)["\']?'
)
EXCLUDE_DIRS = {'__pycache__', '.git', 'node_modules', '.DS_Store'}
AUTOGEN_MARKER = "AUTO-GENERATED — DO NOT EDIT"


def autogen_header(filename, suffix):
    msg = (
        f"{AUTOGEN_MARKER}. "
        f"Source: shared/resources/{filename}. "
        f"Regenerate via `npm run bundle`."
    )
    if suffix == '.md':
        return f"<!-- {msg} -->\n"
    if suffix in ('.sh', '.py'):
        return f"# {msg}\n"
    if suffix in ('.js', '.mjs'):
        return f"// {msg}\n"
    return ""


def inject_header(content, filename, suffix):
    """Prepend an auto-generated header. Idempotent — skips if already present."""
    if AUTOGEN_MARKER in content.split('\n', 1)[0:2][0] or AUTOGEN_MARKER in content[:300]:
        return content
    header = autogen_header(filename, suffix)
    if not header:
        return content
    # .md: insert after YAML frontmatter if present
    if suffix == '.md' and content.startswith('---\n'):
        end = content.find('\n---\n', 4)
        if end != -1:
            cut = end + len('\n---\n')
            return content[:cut] + header + content[cut:]
    # .sh/.js/.mjs: insert after shebang (e.g. #!/usr/bin/env node) if present
    if suffix in ('.sh', '.js', '.mjs') and content.startswith('#!'):
        nl = content.find('\n')
        if nl != -1:
            return content[:nl + 1] + header + content[nl + 1:]
    return header + content


def rewrite_text(content, suffix):
    """Rewrite `shared/resources/X` references to their bundled `references/X` form.

    Module-level rather than nested inside `bundle_skill()` because the freshness
    check (`--check`) must reproduce this transform *exactly* to compare a bundled
    copy against its source. A re-implementation cannot be trusted to stay in step:
    a bundled copy is the source PLUS a banner PLUS this rewrite, so a naive
    checksum can never match, and an inexact reproduction reports drift that is not
    there. One definition, two callers.
    """
    if suffix == '.md':
        return SHARED_REF_RE.sub(lambda m: f"references/{m.group(1)}", content)
    if suffix in ('.js', '.mjs'):
        # Both forms are applied to both suffixes: a `.js` file may be ESM in a
        # consumer whose package.json says so, and a `.mjs` file may still use
        # createRequire(). Each regex is a no-op when its syntax is absent.
        content = JS_SHARED_RE.sub(
            lambda m: f'{m.group(1)}../references/{m.group(2)}{m.group(3)})',
            content,
        )
        return JS_ESM_SHARED_RE.sub(
            lambda m: f'{m.group(1)}../references/{m.group(2)}{m.group(3)}',
            content,
        )
    if suffix == '.sh':
        return SH_SHARED_RE.sub(lambda m: f"../references/{m.group(1)}", content)
    return content


def expected_bytes(src, name):
    """The exact bytes `<skill>/references/<name>` must hold for source `src`.

    This is the single definition of "in sync". Undecodable sources bypass both
    transforms and are copied verbatim, matching the historical behaviour.
    """
    suffix = Path(name).suffix
    try:
        return inject_header(
            rewrite_text(src.read_text(), suffix), name, suffix
        ).encode('utf-8')
    except UnicodeDecodeError:
        return src.read_bytes()


def discover_needed(skill_path, shared_dir):
    """Resolve the transitive set of shared resources a skill reaches.

    Returns (needed, skill_files). `needed` maps bundled name -> source Path.

    Discovery seeds from the skill's own files — following both `shared/resources/X`
    and `references/X` there — and then follows only the `shared/resources/X` form
    (plus JS/shell sibling imports) out of each shared source, to a fixed point.

    `references/X` is deliberately NOT followed out of shared text. It reads as a
    dependency but is usually prose: `tracker-card-summary.md` names
    `references/jira-sync.js` while explicitly stating that it avoids the
    `shared/resources/` form so the bundler will *not* vendor a Jira client into
    GitHub-only skills. Following it there vendored 38 unwanted files across the
    repo. Copies that no discovery rule reaches are handled after the fact by
    `source_backed_on_disk()` instead, which keys on a file already existing rather
    than on a sentence mentioning it.
    """
    skill_files = (
        list(skill_path.rglob('*.md'))
        + list(skill_path.rglob('*.js'))
        + list(skill_path.rglob('*.mjs'))
        + list(skill_path.rglob('*.sh'))
    )
    skill_files = [
        f for f in skill_files
        if not any(p in EXCLUDE_DIRS for p in f.parts)
        and 'references' not in f.relative_to(skill_path).parts
    ]

    needed = {}           # filename -> source Path
    pending = []          # candidates from shared/resources/X — warn if missing
    pending_quiet = []    # candidates from references/X — many are skill-native, silent
    for f in skill_files:
        text = f.read_text()
        pending.extend(collect_shared_refs(text))
        for m in REFS_REF_RE.finditer(text):
            pending_quiet.append(m.group(1))

    seen = set()
    while pending or pending_quiet:
        if pending:
            name = pending.pop()
            quiet = False
        else:
            name = pending_quiet.pop()
            quiet = True
        if name in seen:
            continue
        seen.add(name)
        src = shared_dir / name
        if not src.exists():
            if not quiet:
                print(f"⚠️  shared/resources/{name} not found")
            continue
        needed[name] = src
        try:
            text = src.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        pending.extend(collect_shared_refs(text))
        if src.suffix in ('.js', '.mjs'):
            pending.extend(m.group(1) for m in JS_SIBLING_RE.finditer(text))
            pending.extend(m.group(1) for m in JS_ESM_SIBLING_RE.finditer(text))
        if src.suffix == '.sh':
            pending.extend(m.group(1) for m in SH_SIBLING_RE.finditer(text))

    return needed, skill_files


def source_backed_on_disk(refs_dir, shared_dir, needed):
    """Bundled copies present on disk that discovery did not reach, but which have
    a `shared/resources/` counterpart.

    These are stale copies, not orphans in the risky sense: something put them
    there, and the file they mirror still exists. A copy with NO source is
    skill-native and is deliberately excluded — it legitimately lives in
    references/ and must never be rewritten or removed here.
    """
    out = {}
    if not refs_dir.is_dir():
        return out
    for dst in sorted(refs_dir.rglob('*')):
        if not dst.is_file() or dst.name in EXCLUDE_DIRS:
            continue
        if any(p in EXCLUDE_DIRS for p in dst.parts):
            continue
        rel = dst.relative_to(refs_dir).as_posix()
        if rel in needed:
            continue
        src = shared_dir / rel
        if src.is_file():
            out[rel] = src
    return out


def write_if_changed(dst, src, name, new_bytes):
    """Write a bundled copy when its bytes differ. Returns True if it wrote."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.read_bytes() == new_bytes:
        # Content unchanged — still re-sync mode for .sh in case the bit was lost.
        if Path(name).suffix == '.sh':
            src_mode = src.stat().st_mode & 0o777
            if (dst.stat().st_mode & 0o777) != src_mode:
                dst.chmod(src_mode)
        return False
    dst.write_bytes(new_bytes)
    # Preserve executable bit for shell scripts (matches source file mode).
    if Path(name).suffix == '.sh':
        dst.chmod(src.stat().st_mode & 0o777)
    return True


def resolve_paths(skill_path):
    """(skill_path, shared_dir, refs_dir) or None when this is not a bundleable skill."""
    skill_path = Path(skill_path).resolve()
    if not (skill_path / 'SKILL.md').exists():
        print(f"❌ SKILL.md not found in {skill_path}")
        return None
    repo_root = find_repo_root(skill_path)
    if not repo_root:
        print(f"❌ Cannot locate repo root from {skill_path}")
        return None
    return skill_path, repo_root / 'shared' / 'resources', skill_path / 'references'


def bundle_skill(skill_path):
    resolved = resolve_paths(skill_path)
    if resolved is None:
        return False
    skill_path, shared_dir, refs_dir = resolved

    # Pass 1: walk skill files (excluding references/) and shared files transitively.
    needed, skill_files = discover_needed(skill_path, shared_dir)

    # Pass 1b: add on-disk copies discovery could not reach but which have a source.
    reconcilable = source_backed_on_disk(refs_dir, shared_dir, needed)

    if not needed and not reconcilable:
        # Nothing shared reaches this skill and nothing on disk mirrors a shared
        # file. Any references/ content here is skill-native — leave it alone.
        print(f"✓ {skill_path.name}: no shared refs")
        return True

    # Pass 2: copy shared files into references/, with rewritten content. Idempotent.
    refs_dir.mkdir(exist_ok=True)
    bundled = 0
    for name, src in needed.items():
        if write_if_changed(refs_dir / name, src, name, expected_bytes(src, name)):
            bundled += 1
            print(f"  bundled references/{name}")

    # Pass 2b: reconcile the copies discovery did not reach.
    #
    # Discovery answers "what should this skill have?"; disk answers "what does it
    # already have?". A file in the second set but not the first was previously
    # invisible to every later step INCLUDING the status line, so the bundler
    # reported `in sync` for files it had not opened. Reconciling here means a copy
    # is refreshed on the strength of having a source, not of being reachable.
    reconciled = 0
    for name, src in reconcilable.items():
        if write_if_changed(refs_dir / name, src, name, expected_bytes(src, name)):
            reconciled += 1
            print(f"  reconciled references/{name} (not reached by discovery)")

    # Pass 3: rewrite skill source files in place.
    rewritten = 0
    for f in skill_files:
        original = f.read_text()
        updated = rewrite_text(original, f.suffix)
        if updated != original:
            f.write_text(updated)
            rewritten += 1
            print(f"  rewrote {f.relative_to(skill_path)}")

    parts = []
    if bundled:
        parts.append(f"{bundled} bundled")
    if reconciled:
        parts.append(f"{reconciled} reconciled")
    if rewritten:
        parts.append(f"{rewritten} rewritten")
    # `in sync` is now an assertion about every source-backed copy on disk, not
    # only about the ones discovery happened to reach.
    status = ", ".join(parts) if parts else "in sync"
    print(f"✅ {skill_path.name}: {status}")
    return True


def check_skill(skill_path):
    """Read-only freshness check. Returns a list of human-readable problems.

    Compares each source-backed bundled copy against `expected_bytes`, rather than
    regenerating and asking git what moved. The regenerate-and-diff idiom inherits
    the bundler's own blind spots by construction: a copy the bundler does not
    write produces no diff, so a stale file passes. Comparing per file is what
    makes the check independent of discovery.
    """
    resolved = resolve_paths(skill_path)
    if resolved is None:
        return [f"{skill_path}: not a bundleable skill"]
    skill_path, shared_dir, refs_dir = resolved

    needed, _ = discover_needed(skill_path, shared_dir)
    expected = dict(needed)
    expected.update(source_backed_on_disk(refs_dir, shared_dir, needed))

    problems = []
    for name, src in sorted(expected.items()):
        dst = refs_dir / name
        if not dst.exists():
            problems.append(f"{skill_path.name}: references/{name} is MISSING")
            continue
        if dst.read_bytes() != expected_bytes(src, name):
            problems.append(f"{skill_path.name}: references/{name} is STALE")
    return problems


def main():
    args = sys.argv[1:]
    check_mode = False
    if args and args[0] == '--check':
        check_mode = True
        args = args[1:]

    if not args:
        print("Usage: bundle_skill.py [--check] <skill-path> | --all")
        sys.exit(1)

    if args[0] == '--all':
        repo_root = Path(__file__).resolve().parents[3]
        skills_dir = repo_root / 'skills'
        targets = sorted(d for d in skills_dir.iterdir() if (d / 'SKILL.md').exists())
    else:
        targets = [Path(a) for a in args]

    if check_mode:
        problems = []
        for t in targets:
            problems.extend(check_skill(t))
        if problems:
            print("❌ Bundled references are out of date:")
            for p in problems:
                print(f"   {p}")
            print("\nRun 'npm run bundle' and commit the regenerated files.")
            sys.exit(1)
        print(f"✅ Bundle freshness: {len(targets)} skill(s) verified")
        sys.exit(0)

    failed = 0
    for t in targets:
        if not bundle_skill(t):
            failed += 1
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
