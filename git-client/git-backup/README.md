# Git Backup Feature

## Flows
- Init: create repo (if needed), ensure `.gitignore`, set user config, and ensure the snapshots branch is checked out.
- Snapshot: stage tracked files, create a snapshot commit on the snapshots branch.
- Backup: squash snapshots into the main branch, advancing a local backup pointer.
- Push: push the main branch to a configured remote.
- Restore: checkout a commit, or restore back to latest snapshots (saving a snapshot first if needed).
- Inspect: list snapshots/backups and compute pending changes or commit diffs.

## Requirements
- Operates on a caller-provided root directory (typically the vault path).
- Tracks only configured extensions (default: `.md`, `.ink`, `.yaml`, `.yml`).
- Maintains separate snapshot and backup histories using distinct refs.
- Exposes a narrow service interface suitable for IPC wiring.

## UX
- Consumers can present read-only mode when the repo is in detached HEAD.
- Pending changes and commit diffs power list views (e.g., “current changes” or “opened version”).

## Style
- Explicit configuration over globals (root dir provider, tracked extensions, gitignore content).
- Small, focused modules: types, constants, file helpers, service.

## Data Models
- Snapshot/Backup: `{ oid, message, timestamp }`.
- Change/Diff: `{ filepath, status, name?, type? }`.
- Checkout: `{ oid | null, isDetached }`.
- Restore result: `{ snapshotCreated, snapshotOid? }`.
