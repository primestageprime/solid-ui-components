#!/usr/bin/env bash
# Cut a solid-ui-components release: bump version + lockfile, commit, push,
# tag. The publish workflow (publish.yml) fires automatically on the push
# because package.json changed; it publishes to GitHub Packages.
#
# PRECONDITION (agent's job, this script only validates it): CHANGELOG.md
# already contains a "## X.Y.Z" section for the new version — move the
# [Unreleased] entries there and re-add an empty [Unreleased] heading.
#
# Usage: release.sh [patch|minor|major|X.Y.Z]   (default: patch)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
BUMP="${1:-patch}"

[ -z "$(git status --porcelain)" ] || { echo "ERROR: working tree dirty — commit or stash first"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "ERROR: releases cut from main only"; exit 1; }
git pull --rebase

ver=$(npm version "$BUMP" --no-git-tag-version | sed 's/^v//')
npm install --package-lock-only >/dev/null 2>&1

if ! grep -q "^## ${ver}" CHANGELOG.md; then
  git checkout -- package.json package-lock.json
  echo "ERROR: CHANGELOG.md has no '## ${ver}' section. Write the changelog first, then re-run."
  exit 1
fi

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release ${ver}"
git push
git tag "v${ver}"
git push origin "v${ver}"

echo "Released v${ver}. CI (test/typecheck/build) + publish run automatically:"
gh run list --limit 3 2>/dev/null || echo "(gh unavailable — check Actions in the repo)"
echo "Verify the package at: https://github.com/orgs/primestageprime/packages?repo_name=solid-ui-components"
