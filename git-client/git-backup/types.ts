export type GitBackupChangeStatus = "added" | "deleted" | "modified";

export interface GitBackupSnapshot {
  oid: string;
  message: string;
  timestamp: number;
}

export interface GitBackupCommitDiffEntry {
  filepath: string;
  status: GitBackupChangeStatus;
}

export interface GitBackupFileMeta {
  name?: string;
  type?: string;
}

export interface GitBackupChange extends GitBackupCommitDiffEntry, GitBackupFileMeta {}

export interface GitBackupCheckoutState {
  oid: string | null;
  isDetached: boolean;
}

export interface GitBackupRestoreResult {
  snapshotCreated: boolean;
  snapshotOid?: string;
}

export interface GitBackupCredentials {
  repoUrl: string | null;
  token?: string;
}

export interface GitBackupLogger {
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

export interface GitBackupFileMetaInput {
  rootDir: string;
  filepath: string;
  status: GitBackupChangeStatus;
}

export interface GitBackupConfig {
  rootDir: string | (() => string);
  gitignoreContent?: string;
  trackedExtensions?: string[];
  snapshotBranch?: string;
  mainBranch?: string;
  localBackupRef?: string;
  author?: { name: string; email: string };
  logger?: GitBackupLogger;
  now?: () => Date;
  resolveFileMeta?: (input: GitBackupFileMetaInput) => Promise<GitBackupFileMeta>;
}

export interface GitBackupService {
  initRepo(): Promise<void>;
  createSnapshot(): Promise<string>;
  getPendingSnapshots(): Promise<GitBackupSnapshot[]>;
  getCommitDiff(oid: string): Promise<GitBackupCommitDiffEntry[]>;
  getPendingChanges(): Promise<GitBackupChange[]>;
  createBackup(): Promise<string>;
  pushBackup(repoUrl: string, token?: string): Promise<void>;
  getBackups(): Promise<GitBackupSnapshot[]>;
  getCurrentCheckout(): Promise<GitBackupCheckoutState>;
  checkoutCommit(oid: string): Promise<void>;
  restoreToLatest(): Promise<GitBackupRestoreResult>;
  restoreFromCommit(oid: string): Promise<void>;
}

export type GitBackupClient = GitBackupService;
