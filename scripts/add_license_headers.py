#!/usr/bin/env python3
"""
Add license/copyright fields to all SKILL.md frontmatter blocks.

Idempotent — skips files that already have a `license` field.
"""

import sys
from pathlib import Path

COPYRIGHT = "Copyright (c) 2025 Lorien Gamaroff"
LICENSE = "MIT"

SKILLS_DIR = Path(__file__).parent.parent / "skills"


def patch_skill_md(path: Path) -> str:
    """Return 'patched', 'skipped', or 'error'."""
    text = path.read_text()

    if not text.startswith("---"):
        return "error: no frontmatter"

    # Find closing ---
    end = text.index("---", 3)
    frontmatter = text[3:end]
    rest = text[end:]  # includes the closing ---

    if "license:" in frontmatter:
        return "skipped"

    # Append fields before closing ---
    new_frontmatter = frontmatter.rstrip("\n") + f'\ncopyright: "{COPYRIGHT}"\nlicense: {LICENSE}\n'
    path.write_text("---" + new_frontmatter + rest)
    return "patched"


def main():
    results = {"patched": [], "skipped": [], "error": []}

    for skill_md in sorted(SKILLS_DIR.glob("*/SKILL.md")):
        status = patch_skill_md(skill_md)
        key = status.split(":")[0]
        results[key].append(f"{skill_md.parent.name}: {status}")

    print(f"Patched : {len(results['patched'])}")
    print(f"Skipped : {len(results['skipped'])}")
    print(f"Errors  : {len(results['error'])}")

    if results["error"]:
        print("\nErrors:")
        for e in results["error"]:
            print(f"  {e}")

    if "--verbose" in sys.argv:
        print("\nPatched:")
        for p in results["patched"]:
            print(f"  {p}")


if __name__ == "__main__":
    main()
