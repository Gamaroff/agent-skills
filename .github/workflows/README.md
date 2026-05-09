# GitHub Actions Workflows

Workflows disabled to stay within GitHub Free tier limits (2,000 min/month on private repos).
Re-enable if the repo moves to a paid plan or goes public.

---

## Validate Skills (`validate.yml`)

**Trigger:** PRs touching `skills/**`  
**Cost:** ~6s per run — 3 parallel jobs on PRs  
**Purpose:** For each modified skill, runs `quick_validate.py` (checks SKILL.md frontmatter) and `package_skill.py` (smoke-tests the zip build).

**To restore:** recreate `.github/workflows/validate.yml`:

```yaml
name: Validate Skills

on:
  pull_request:
    paths:
      - 'skills/**'

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Find modified skills and validate
        run: |
          git fetch origin ${{ github.base_ref }}
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep '^skills/' | cut -d/ -f1-2 | sort -u)
          if [ -z "$CHANGED" ]; then
            echo "No skill directories changed."
            exit 0
          fi
          FAILED=0
          for SKILL_DIR in $CHANGED; do
            if [ -f "$SKILL_DIR/SKILL.md" ]; then
              echo "Validating $SKILL_DIR..."
              python3 skills/create-skill/scripts/quick_validate.py "$SKILL_DIR" || FAILED=1
            fi
          done
          exit $FAILED

      - name: Packaging smoke test (changed skills)
        run: |
          git fetch origin ${{ github.base_ref }}
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep '^skills/' | cut -d/ -f1-2 | sort -u)
          if [ -z "$CHANGED" ]; then
            echo "No skill directories changed — skipping packaging test."
            exit 0
          fi
          FAILED=0
          cd skills/create-skill/scripts
          for SKILL_DIR in $CHANGED; do
            SKILL_ABS=$(realpath "../../../$SKILL_DIR" 2>/dev/null || echo "../../../$SKILL_DIR")
            if [ -f "../../../$SKILL_DIR/SKILL.md" ]; then
              echo "Packaging $SKILL_DIR..."
              OUTDIR=$(mktemp -d)
              python3 package_skill.py "../../../$SKILL_DIR" "$OUTDIR" || FAILED=1
              rm -rf "$OUTDIR"
            fi
          done
          exit $FAILED
```

---

## Generate SBOM (`sbom.yml`)

**Trigger:** On release publish, or manual `workflow_dispatch`  
**Cost:** Negligible — only runs when you cut a release  
**Purpose:** Generates CycloneDX and SPDX software bill of materials, attaches both to the GitHub release as artifacts.

**To restore:** recreate `.github/workflows/sbom.yml`:

```yaml
name: Generate SBOM

on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Generate SBOM (CycloneDX)
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.cyclonedx.json
          artifact-name: sbom.cyclonedx.json

      - name: Generate SBOM (SPDX)
        uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json
          artifact-name: sbom.spdx.json

      - name: Attach SBOMs to release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v2
        with:
          files: |
            sbom.cyclonedx.json
            sbom.spdx.json
```

---

## CodeQL (`codeql.yml`) — removed

**Trigger:** PRs to main + push to main + weekly cron (Mondays 04:23 UTC)  
**Cost:** High — 3 parallel matrix jobs (python, javascript-typescript, actions) per trigger  
**Purpose:** Static security analysis. Was also failing due to Actions runner permission issues.

**To restore:** recreate `.github/workflows/codeql.yml`:

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '23 4 * * 1'

permissions:
  contents: read

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      packages: read
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        language: [python, javascript-typescript, actions]

    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Initialize CodeQL
        uses: github/codeql-action/init@4e828ff8d448a8a6e532957b1811f387a63867e8 # v3.29.4
        with:
          languages: ${{ matrix.language }}
          queries: security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@4e828ff8d448a8a6e532957b1811f387a63867e8 # v3.29.4
        with:
          category: "/language:${{ matrix.language }}"
```
