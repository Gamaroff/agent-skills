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
# Shell scripts under <skill>/scripts/ source shared libs via a relative path.
# Rewrite any `../…/shared/resources/<name>` to `../references/<name>` (the
# bundled location, one level up from scripts/).
SH_SHARED_RE = re.compile(r'(?:\.\./)+shared/resources/([A-Za-z0-9._-]+)')
# Matches already-rewritten in-tree references (so re-runs and partial states work).
REFS_REF_RE = re.compile(r'(?:^|[\s(\[`\'"/])references/([A-Za-z0-9._-]+\.(?:md|sh|js|mjs|py))')
# Sibling require/import in JS — `require("./foo.js")` — used to follow transitive
# deps inside bundled shared .js files.
JS_SIBLING_RE = re.compile(r'require\(["\']\./([A-Za-z0-9._/-]+\.js)["\']\)')
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


def bundle_skill(skill_path):
    skill_path = Path(skill_path).resolve()
    if not (skill_path / 'SKILL.md').exists():
        print(f"❌ SKILL.md not found in {skill_path}")
        return False

    repo_root = find_repo_root(skill_path)
    if not repo_root:
        print(f"❌ Cannot locate repo root from {skill_path}")
        return False

    shared_dir = repo_root / 'shared' / 'resources'
    refs_dir = skill_path / 'references'

    def rewrite_text(content, suffix):
        if suffix == '.md':
            return SHARED_REF_RE.sub(lambda m: f"references/{m.group(1)}", content)
        if suffix == '.js':
            return JS_SHARED_RE.sub(
                lambda m: f'{m.group(1)}../references/{m.group(2)}{m.group(3)})',
                content,
            )
        if suffix == '.sh':
            return SH_SHARED_RE.sub(lambda m: f"../references/{m.group(1)}", content)
        return content

    # Pass 1: walk skill files (excluding references/) and shared files transitively.
    skill_files = (
        list(skill_path.rglob('*.md'))
        + list(skill_path.rglob('*.js'))
        + list(skill_path.rglob('*.sh'))
    )
    skill_files = [
        f for f in skill_files
        if not any(p in EXCLUDE_DIRS for p in f.parts)
        and 'references' not in f.relative_to(skill_path).parts
    ]

    needed = {}  # filename -> source Path
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
        if src.suffix == '.js':
            pending.extend(m.group(1) for m in JS_SIBLING_RE.finditer(text))
        if src.suffix == '.sh':
            pending.extend(m.group(1) for m in SH_SIBLING_RE.finditer(text))

    if not needed:
        # Skill may have stale references/ dir but no shared refs anymore — leave it.
        print(f"✓ {skill_path.name}: no shared refs")
        return True

    # Pass 2: copy shared files into references/, with rewritten content. Idempotent.
    refs_dir.mkdir(exist_ok=True)
    bundled = 0
    for name, src in needed.items():
        dst = refs_dir / name
        try:
            text = src.read_text()
            suffix = Path(name).suffix
            expected = rewrite_text(text, suffix)
            expected = inject_header(expected, name, suffix)
            new_bytes = expected.encode('utf-8')
        except UnicodeDecodeError:
            new_bytes = src.read_bytes()
        if dst.exists() and dst.read_bytes() == new_bytes:
            # Content unchanged — still re-sync mode for .sh in case the bit was lost.
            if Path(name).suffix == '.sh':
                src_mode = src.stat().st_mode & 0o777
                if (dst.stat().st_mode & 0o777) != src_mode:
                    dst.chmod(src_mode)
            continue
        dst.write_bytes(new_bytes)
        # Preserve executable bit for shell scripts (matches source file mode).
        if Path(name).suffix == '.sh':
            dst.chmod(src.stat().st_mode & 0o777)
        bundled += 1
        print(f"  bundled references/{name}")

    # Pass 3: rewrite skill source files in place.
    rewritten = 0
    for f in skill_files:
        original = f.read_text()
        updated = rewrite_text(original, f.suffix)
        if updated != original:
            f.write_text(updated)
            rewritten += 1
            print(f"  rewrote {f.relative_to(skill_path)}")

    status = f"{bundled} bundled, {rewritten} rewritten" if (bundled or rewritten) else "in sync"
    print(f"✅ {skill_path.name}: {status}")
    return True


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: bundle_skill.py <skill-path> | --all")
        sys.exit(1)

    if args[0] == '--all':
        repo_root = Path(__file__).resolve().parents[3]
        skills_dir = repo_root / 'skills'
        targets = sorted(d for d in skills_dir.iterdir() if (d / 'SKILL.md').exists())
    else:
        targets = [Path(a) for a in args]

    failed = 0
    for t in targets:
        if not bundle_skill(t):
            failed += 1
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
