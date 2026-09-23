# Changelog

## Unreleased

### Added

- **A fixture entry, so `--dry-run` has something to roll.** The real
  `CHANGELOG.md` is empty under `## Unreleased` between releases, which is the
  correct steady state and also means a dry run against the live tree can only
  ever demonstrate the "nothing to release" branch. Point the script at this
  file with `--changelog=` to see the other one.

### Fixed

- **A second section, so the roll is shown to carry more than one.**

## 0.178.0 — 2026-09-22

### Added

- Whatever the previous release said. Only the heading matters here: the roll
  must insert above it and leave it untouched.
