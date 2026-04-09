import type { GitBackupLogger } from "./types";

export const DEFAULT_AUTHOR = { name: "Aryazos User", email: "user@aryazos.app" };

export const defaultLogger: GitBackupLogger = {
  error: (message: string, data?: unknown) => {
    console.error(message, data);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(message, data);
  }
};

export const getGitAuth = (token?: string) => {
  if (!token) return {};
  return {
    onAuth: () => ({ username: token })
  };
};
