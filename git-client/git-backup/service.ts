import fs from "fs";
import git, { TREE, walk } from "isomorphic-git";
import http from "isomorphic-git/http/node";
import path from "path";

import {
  DEFAULT_GITIGNORE_CONTENT,
  DEFAULT_LOCAL_BACKUP_REF,
  DEFAULT_MAIN_BRANCH,
  DEFAULT_SNAPSHOT_BRANCH,
  DEFAULT_TRACKED_EXTENSIONS
} from "./constants";
import { ensureGitignore, getAllFiles, isTrackedExtension } from "./file-utils";
import type {
  GitBackupChange,
  GitBackupChangeStatus,
  GitBackupCheckoutState,
  GitBackupCommitDiffEntry,
  GitBackupConfig,
  GitBackupFileMeta,
  GitBackupService,
  GitBackupSnapshot
} from "./types";
import { DEFAULT_AUTHOR, defaultLogger, getGitAuth } from "./service-helpers";

export function createGitBackupService(config: GitBackupConfig): GitBackupService {
  const trackedExtensions = config.trackedExtensions ?? DEFAULT_TRACKED_EXTENSIONS;
  const snapshotBranch = config.snapshotBranch ?? DEFAULT_SNAPSHOT_BRANCH;
  const mainBranch = config.mainBranch ?? DEFAULT_MAIN_BRANCH;
  const localBackupRef = config.localBackupRef ?? DEFAULT_LOCAL_BACKUP_REF;
  const gitignoreContent = config.gitignoreContent ?? DEFAULT_GITIGNORE_CONTENT;
  const author = config.author ?? DEFAULT_AUTHOR;
  const logger = config.logger ?? defaultLogger;
  const now = config.now ?? (() => new Date());

  const resolveRootDir = () =>
    typeof config.rootDir === "function" ? config.rootDir() : config.rootDir;

  const maybeResolveMeta = async (
    rootDir: string,
    filepath: string,
    status: GitBackupChangeStatus
  ): Promise<GitBackupFileMeta> => {
    if (!config.resolveFileMeta) return {};
    try {
      return await config.resolveFileMeta({ rootDir, filepath, status });
    } catch (error) {
      logger.warn("Failed to resolve file metadata", { error, filepath });
      return {};
    }
  };

  const hasWorkingTreeChanges = async (dir: string): Promise<boolean> => {
    const statusMatrix = await git.statusMatrix({ fs, dir });
    return statusMatrix.some(([filepath, headStatus, workdirStatus, stageStatus]: [string, number, number, number]) => {
      if (filepath === ".gitignore") return false;
      return headStatus !== workdirStatus || workdirStatus !== stageStatus;
    });
  };

  const stageTrackedFiles = async (dir: string): Promise<void> => {
    const statusMatrix = await git.statusMatrix({ fs, dir });
    const allFiles = await getAllFiles(dir);

    for (const filepath of allFiles) {
      if (!isTrackedExtension(filepath, trackedExtensions)) continue;
      try {
        await git.add({ fs, dir, filepath, force: true });
      } catch (error) {
        logger.warn("Failed to add file", { error, filepath });
      }
    }

    for (const [filepath, headStatus, workdirStatus] of statusMatrix) {
      if (headStatus === 1 && workdirStatus === 0) {
        try {
          await git.remove({ fs, dir, filepath });
        } catch (error) {
          logger.warn("Failed to remove file", { error, filepath });
        }
      }
    }
  };

  const service: GitBackupService = {
    async initRepo(): Promise<void> {
      const dir = resolveRootDir();
      try {
        await git.init({ fs, dir });
        await ensureGitignore(dir, gitignoreContent);

        await git.setConfig({ fs, dir, path: "user.name", value: author.name });
        await git.setConfig({ fs, dir, path: "user.email", value: author.email });

        const branches = await git.listBranches({ fs, dir });

        if (!branches.includes(snapshotBranch)) {
          if (branches.length === 0) {
            await fs.promises.writeFile(
              path.join(dir, ".git", "HEAD"),
              `ref: refs/heads/${snapshotBranch}\n`
            );
            return;
          }

          try {
            await git.branch({ fs, dir, ref: snapshotBranch });
            await git.checkout({ fs, dir, ref: snapshotBranch });
          } catch (error) {
            logger.warn("Could not create/checkout snapshots branch", { error });
          }
        } else {
          try {
            await git.checkout({ fs, dir, ref: snapshotBranch });
          } catch (error) {
            logger.warn("Could not checkout snapshots branch", { error });
          }
        }
      } catch (error) {
        logger.error("Failed to init git repo", { error });
        throw error;
      }
    },

    async createSnapshot(): Promise<string> {
      const dir = resolveRootDir();
      await ensureGitignore(dir, gitignoreContent);
      await stageTrackedFiles(dir);

      const nowDate = now();
      const dateStr = nowDate.toISOString().split("T")[0];

      let count = 1;
      try {
        const logs = await git.log({ fs, dir, ref: snapshotBranch, depth: 100 });
        const todayLogs = logs.filter((entry: any) => {
          const committerDate = new Date(entry.commit.committer.timestamp * 1000);
          return (
            committerDate.toISOString().split("T")[0] === dateStr &&
            entry.commit.message.startsWith("Snapshot")
          );
        });
        count = todayLogs.length + 1;
      } catch {
        // No logs yet.
      }

      const message = `Snapshot ${dateStr} (${count})`;
      return git.commit({
        fs,
        dir,
        message,
        author
      });
    },

    async getPendingSnapshots(): Promise<GitBackupSnapshot[]> {
      const dir = resolveRootDir();
      try {
        const branches = await git.listBranches({ fs, dir });
        if (!branches.includes(snapshotBranch)) {
          return [];
        }

        let pointerSha = "";
        try {
          pointerSha = await git.resolveRef({ fs, dir, ref: localBackupRef });
        } catch {
          // No ref yet.
        }

        const commits = await git.log({ fs, dir, ref: snapshotBranch });

        const pending: GitBackupSnapshot[] = [];
        for (const commit of commits) {
          if (commit.oid === pointerSha) break;
          if (!commit.commit.message.startsWith("Snapshot")) continue;
          pending.push({
            oid: commit.oid,
            message: commit.commit.message,
            timestamp: commit.commit.committer.timestamp * 1000
          });
        }

        return pending;
      } catch (error) {
        logger.error("Error getting pending snapshots", { error });
        return [];
      }
    },

    async getCommitDiff(oid: string): Promise<GitBackupCommitDiffEntry[]> {
      const dir = resolveRootDir();
      try {
        const { commit } = await git.readCommit({ fs, dir, oid });
        const parent = commit.parent[0];
        if (!parent) return [];

        const changes: GitBackupCommitDiffEntry[] = [];

        await walk({
          fs,
          dir,
          trees: [TREE({ ref: oid }), TREE({ ref: parent })],
          map: async (filepath: string, [a, b]: [any, any]) => {
            if (!filepath || filepath === "." || filepath.startsWith(".git")) return;
            if (!isTrackedExtension(filepath, trackedExtensions)) return;

            const typeA = await a?.type();
            const typeB = await b?.type();

            if (typeA === "tree" || typeB === "tree") return;

            const oidA = a ? await a.oid() : null;
            const oidB = b ? await b.oid() : null;

            if (oidA && !oidB) {
              changes.push({ filepath, status: "added" });
            } else if (!oidA && oidB) {
              changes.push({ filepath, status: "deleted" });
            } else if (oidA && oidB && oidA !== oidB) {
              changes.push({ filepath, status: "modified" });
            }
          }
        });

        return changes;
      } catch (error) {
        logger.error("Failed to get commit diff", { error });
        return [];
      }
    },

    async getPendingChanges(): Promise<GitBackupChange[]> {
      const dir = resolveRootDir();
      try {
        await ensureGitignore(dir, gitignoreContent);

        const changes: GitBackupChange[] = [];

        const allFiles = await getAllFiles(dir);
        const trackableFiles = new Set(
          allFiles.filter((filepath) => isTrackedExtension(filepath, trackedExtensions))
        );

        const statusMatrix = await git.statusMatrix({ fs, dir });
        const filesInMatrix = new Set<string>();

        for (const [filepath, headStatus, workdirStatus, stageStatus] of statusMatrix) {
          if (filepath === ".gitignore") continue;

          filesInMatrix.add(filepath);

          let status: GitBackupChangeStatus | "" = "";

          if (headStatus === 0 && workdirStatus === 2) {
            status = "added";
          } else if (headStatus === 1 && workdirStatus === 0) {
            status = "deleted";
          } else if (headStatus === 1 && workdirStatus === 2) {
            status = "modified";
          } else if (headStatus === 0 && workdirStatus === 0 && stageStatus === 0) {
            continue;
          } else if (workdirStatus === stageStatus && headStatus === stageStatus) {
            continue;
          }

          if (status) {
            const meta = await maybeResolveMeta(dir, filepath, status);
            changes.push({ filepath, status, ...meta });
          }
        }

        for (const filepath of trackableFiles) {
          if (!filesInMatrix.has(filepath)) {
            const meta = await maybeResolveMeta(dir, filepath, "added");
            changes.push({ filepath, status: "added", ...meta });
          }
        }

        return changes;
      } catch (error) {
        logger.error("Error getting pending changes", { error });
        return [];
      }
    },

    async createBackup(): Promise<string> {
      const dir = resolveRootDir();
      const snapshotHead = await git.resolveRef({ fs, dir, ref: snapshotBranch });

      let parent: string[] = [];
      try {
        const localMain = await git.resolveRef({ fs, dir, ref: `refs/heads/${mainBranch}` });
        parent = [localMain];
      } catch {
        // First backup, no local main yet.
      }

      const { commit: snapshotCommitObject } = await git.readCommit({ fs, dir, oid: snapshotHead });
      const tree = snapshotCommitObject.tree;

      const nowDate = now();
      const dateStr = nowDate.toISOString().split("T")[0];

      let count = 1;
      try {
        const logs = await git.log({ fs, dir, ref: mainBranch, depth: 50 });
        const todayLogs = logs.filter((entry: any) => {
          const committerDate = new Date(entry.commit.committer.timestamp * 1000);
          return (
            committerDate.toISOString().split("T")[0] === dateStr &&
            entry.commit.message.startsWith("Backup")
          );
        });
        count = todayLogs.length + 1;
      } catch {
        // No main branch yet.
      }

      const message = `Backup ${dateStr} (${count})`;
      const timestamp = Math.floor(nowDate.getTime() / 1000);

      const commitOid = await git.writeCommit({
        fs,
        dir,
        commit: {
          message,
          tree,
          parent,
          author: { ...author, timestamp, timezoneOffset: 0 },
          committer: { ...author, timestamp, timezoneOffset: 0 }
        }
      });

      await git.writeRef({
        fs,
        dir,
        ref: `refs/heads/${mainBranch}`,
        value: commitOid,
        force: true
      });

      await git.writeRef({
        fs,
        dir,
        ref: localBackupRef,
        value: snapshotHead,
        force: true
      });

      return commitOid;
    },

    async pushBackup(repoUrl: string, token?: string): Promise<void> {
      const dir = resolveRootDir();
      await git.addRemote({ fs, dir, remote: "origin", url: repoUrl, force: true });
      await git.push({
        fs,
        dir,
        remote: "origin",
        ref: mainBranch,
        http,
        ...getGitAuth(token),
        force: false
      });
    },

    async getBackups() {
      const dir = resolveRootDir();
      try {
        const branches = await git.listBranches({ fs, dir });
        if (!branches.includes(mainBranch)) {
          return [];
        }
        const commits = await git.log({ fs, dir, ref: mainBranch });
        return commits.map((commit: any) => ({
          oid: commit.oid,
          message: commit.commit.message,
          timestamp: commit.commit.committer.timestamp * 1000
        }));
      } catch {
        return [];
      }
    },

    async getCurrentCheckout(): Promise<GitBackupCheckoutState> {
      const dir = resolveRootDir();
      try {
        const headContent = await fs.promises.readFile(path.join(dir, ".git", "HEAD"), "utf-8");
        const isDetached = !headContent.startsWith("ref:");

        if (isDetached) {
          return { oid: headContent.trim(), isDetached: true };
        }

        try {
          const oid = await git.resolveRef({ fs, dir, ref: "HEAD" });
          return { oid, isDetached: false };
        } catch {
          return { oid: null, isDetached: false };
        }
      } catch (error) {
        logger.error("Error getting current checkout", { error });
        return { oid: null, isDetached: false };
      }
    },

    async checkoutCommit(oid: string): Promise<void> {
      const dir = resolveRootDir();
      try {
        await git.checkout({ fs, dir, ref: oid });
      } catch (error) {
        logger.error("Error checking out commit", { error });
        throw error;
      }
    },

    async restoreToLatest() {
      const dir = resolveRootDir();
      try {
        const { isDetached } = await service.getCurrentCheckout();
        const hasChanges = await hasWorkingTreeChanges(dir);

        let snapshotOid: string | undefined;
        if (isDetached && hasChanges) {
          snapshotOid = await service.createSnapshot();
          await git.writeRef({
            fs,
            dir,
            ref: `refs/heads/${snapshotBranch}`,
            value: snapshotOid,
            force: true
          });
        }

        await git.checkout({ fs, dir, ref: snapshotBranch });

        return { snapshotCreated: Boolean(snapshotOid), snapshotOid };
      } catch (error) {
        logger.error("Error restoring to latest", { error });
        throw error;
      }
    },

    async restoreFromCommit(oid: string): Promise<void> {
      const dir = resolveRootDir();
      try {
        const { commit } = await git.readCommit({ fs, dir, oid });
        const isBackupCommit = commit.message.startsWith("Backup");

        await git.checkout({ fs, dir, ref: oid });

        await git.writeRef({
          fs,
          dir,
          ref: `refs/heads/${snapshotBranch}`,
          value: oid,
          force: true
        });

        if (isBackupCommit) {
          await git.writeRef({
            fs,
            dir,
            ref: `refs/heads/${mainBranch}`,
            value: oid,
            force: true
          });

          await git.writeRef({
            fs,
            dir,
            ref: localBackupRef,
            value: oid,
            force: true
          });
        }

        await git.checkout({ fs, dir, ref: snapshotBranch });
      } catch (error) {
        logger.error("Error restoring from commit", { error });
        throw error;
      }
    }
  };

  return service;
}
