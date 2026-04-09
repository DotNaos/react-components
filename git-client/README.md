<<<<<<< PROPOSED_CHANGE
# Git Client Widgets
=======
# Git Backup Widgets
>>>>>>> END_PROPOSED_CHANGE

## Flows
- Fetch snapshots, backups, pending changes, and checkout state on load.
- Allow creating snapshots, squashing snapshots into backups, and pushing backups.
- Support checkout and restore flows, with a read-only banner when detached.
- Show current changes and per-commit diffs for opened versions.

## Requirements
- Accept a `GitBackupClient` and optional credentials provider.
- Delegate notifications and confirmations to the host application.
- Keep UI state encapsulated within a controller hook.

## UX
- Two-column timeline (cloud backups + local snapshots) with an explicit squash action.
- Pending changes and opened-version diffs displayed side-by-side.
- Refresh button with optional “what changed” messaging.

## Style
- Use shared UI primitives from `@aryazos/ui/shadcn`.
<<<<<<< PROPOSED_CHANGE
- Feature-contained components under `git-client/`.
=======
- Feature-contained components under `git-backup/`.
>>>>>>> END_PROPOSED_CHANGE

## Data Models
- Snapshot/Backup: `{ oid, message, timestamp }`.
- Change/Diff: `{ filepath, status, name?, type? }`.
- Checkout: `{ oid | null, isDetached }`.
