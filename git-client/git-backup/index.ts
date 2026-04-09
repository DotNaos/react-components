export { createGitBackupService } from "./service";
export {
  DEFAULT_GITIGNORE_CONTENT,
  DEFAULT_LOCAL_BACKUP_REF,
  DEFAULT_MAIN_BRANCH,
  DEFAULT_SNAPSHOT_BRANCH,
  DEFAULT_TRACKED_EXTENSIONS
} from "./constants";
export type {
  GitBackupChange,
  GitBackupChangeStatus,
  GitBackupCheckoutState,
  GitBackupClient,
  GitBackupCommitDiffEntry,
  GitBackupConfig,
  GitBackupCredentials,
  GitBackupFileMeta,
  GitBackupFileMetaInput,
  GitBackupLogger,
  GitBackupRestoreResult,
  GitBackupService,
  GitBackupSnapshot
} from "./types";
