import type {
    GitBackupClient,
    GitBackupCredentials,
} from "./git-backup";

export type GitClientNoticeType = 'success' | 'error' | 'info';

export type GitClientNotify = (notice: {
    type: GitClientNoticeType;
    message: string;
}) => void;

export type GitClientConfirm = (message: string) => boolean | Promise<boolean>;

export type GitClientCredentialsProvider =
    | GitBackupCredentials
    | (() => GitBackupCredentials | Promise<GitBackupCredentials>);

export interface GitClientControllerOptions {
    client: GitBackupClient;
    getCredentials?: GitClientCredentialsProvider;
    notify?: GitClientNotify;
    confirmRestore?: GitClientConfirm;
    onError?: (message: string, error: unknown) => void;
}
