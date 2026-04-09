import type {
    GitBackupChange,
    GitBackupCheckoutState,
    GitBackupCommitDiffEntry,
    GitBackupSnapshot,
} from "./git-backup";
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
    GitClientControllerOptions,
    GitClientCredentialsProvider,
} from './controller-types';

const defaultCheckoutState: GitBackupCheckoutState = {
    oid: null,
    isDetached: false,
};

function resolveCredentials(provider?: GitClientCredentialsProvider) {
    if (!provider) {
        return Promise.resolve({
            repoUrl: null as string | null,
            token: undefined as string | undefined,
        });
    }

    if (typeof provider === 'function') {
        return Promise.resolve(provider());
    }

    return Promise.resolve(provider);
}

export function useGitClientController(options: GitClientControllerOptions) {
    const { client, getCredentials, notify, confirmRestore, onError } = options;
    const [snapshots, setSnapshots] = useState<GitBackupSnapshot[]>([]);
    const [backups, setBackups] = useState<GitBackupSnapshot[]>([]);
    const [changes, setChanges] = useState<GitBackupChange[]>([]);
    const [commitDiff, setCommitDiff] = useState<GitBackupCommitDiffEntry[]>(
        [],
    );
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasPendingBackup, setHasPendingBackup] = useState(false);
    const [currentCheckout, setCurrentCheckout] =
        useState<GitBackupCheckoutState>(defaultCheckoutState);
    const prevCountsRef = useRef({ snapshots: 0, backups: 0, changes: 0 });

    const emit = useCallback(
        (type: 'success' | 'error' | 'info', message: string) => {
            notify?.({ type, message });
        },
        [notify],
    );

    const refreshLists = useCallback(
        async (showToast = false) => {
            const {
                snapshots: prevSnapshots,
                backups: prevBackups,
                changes: prevChanges,
            } = prevCountsRef.current;

            try {
                setRefreshing(true);
                const [nextSnapshots, nextBackups, nextChanges, checkout] =
                    await Promise.all([
                        client.getPendingSnapshots(),
                        client.getBackups(),
                        client.getPendingChanges(),
                        client.getCurrentCheckout(),
                    ]);

                setSnapshots(nextSnapshots);
                setBackups(nextBackups);
                setChanges(nextChanges);
                setCurrentCheckout(checkout);
                prevCountsRef.current = {
                    snapshots: nextSnapshots.length,
                    backups: nextBackups.length,
                    changes: nextChanges.length,
                };

                if (showToast && notify) {
                    const newSnapshots = nextSnapshots.length - prevSnapshots;
                    const newBackups = nextBackups.length - prevBackups;
                    const newChanges = nextChanges.length - prevChanges;

                    if (newSnapshots > 0 || newBackups > 0 || newChanges > 0) {
                        const parts: string[] = [];
                        if (newSnapshots > 0) {
                            parts.push(
                                `${newSnapshots} new snapshot${newSnapshots > 1 ? 's' : ''}`,
                            );
                        }
                        if (newBackups > 0) {
                            parts.push(
                                `${newBackups} new backup${newBackups > 1 ? 's' : ''}`,
                            );
                        }
                        if (newChanges > 0) {
                            parts.push(
                                `${newChanges} new change${newChanges > 1 ? 's' : ''}`,
                            );
                        }
                        emit('success', `Found: ${parts.join(', ')}`);
                    } else if (newChanges < 0) {
                        emit(
                            'success',
                            `${Math.abs(newChanges)} change${Math.abs(newChanges) > 1 ? 's were' : ' was'} resolved`,
                        );
                    } else {
                        emit('info', 'Everything is up to date');
                    }
                }
            } catch (error) {
                onError?.('Failed to refresh', error);
                if (showToast) {
                    emit('error', 'Failed to refresh');
                }
            } finally {
                setRefreshing(false);
            }
        },
        [client, emit, notify, onError],
    );

    useEffect(() => {
        refreshLists();
    }, [refreshLists]);

    useEffect(() => {
        const fetchDiff = async () => {
            if (currentCheckout.isDetached && currentCheckout.oid) {
                try {
                    const diff = await client.getCommitDiff(
                        currentCheckout.oid,
                    );
                    setCommitDiff(diff);
                } catch (error) {
                    onError?.('Failed to load changes for this version', error);
                    emit('error', 'Could not load changes for this version');
                    setCommitDiff([]);
                }
            } else {
                setCommitDiff([]);
            }
        };

        void fetchDiff();
    }, [client, currentCheckout, emit, onError]);

    const handleSnapshot = useCallback(async () => {
        try {
            setLoading(true);
            await client.initRepo();
            await client.createSnapshot();
            emit('success', 'Snapshot saved');
            await refreshLists();
        } catch (error) {
            onError?.('Failed to create snapshot', error);
            emit('error', 'Could not save snapshot');
        } finally {
            setLoading(false);
        }
    }, [client, emit, onError, refreshLists]);

    const handleBackup = useCallback(async () => {
        if (snapshots.length === 0) return;
        try {
            setLoading(true);
            await client.createBackup();
            emit('success', 'Backup created locally');
            setHasPendingBackup(true);
            await refreshLists();
        } catch (error) {
            onError?.('Failed to create backup', error);
            emit('error', 'Could not create backup');
        } finally {
            setLoading(false);
        }
    }, [client, emit, onError, refreshLists, snapshots.length]);

    const handlePush = useCallback(async () => {
        try {
            const credentials = await resolveCredentials(getCredentials);
            const repoUrl = credentials?.repoUrl ?? null;
            const token = credentials?.token ?? '';

            if (!repoUrl) {
                emit('error', 'Please configure Repository URL in Settings');
                return;
            }

            setLoading(true);
            await client.pushBackup(repoUrl, token);
            emit('success', 'Backup uploaded to cloud');
            setHasPendingBackup(false);
            await refreshLists();
        } catch (error) {
            onError?.('Failed to push backup', error);
            emit('error', 'Uploading to cloud failed');
        } finally {
            setLoading(false);
        }
    }, [client, emit, getCredentials, onError, refreshLists]);

    const handleCheckout = useCallback(
        async (oid: string) => {
            try {
                setLoading(true);
                await client.checkoutCommit(oid);
                await refreshLists();
            } catch (error) {
                onError?.('Failed to checkout', error);
                emit('error', 'Could not open older version');
            } finally {
                setLoading(false);
            }
        },
        [client, emit, onError, refreshLists],
    );

    const handleRestoreToLatest = useCallback(async () => {
        try {
            setLoading(true);
            const result = await client.restoreToLatest();
            const snapshotSaved = result?.snapshotCreated;
            emit(
                'success',
                snapshotSaved
                    ? "Your edits were saved and you're back on the latest version"
                    : 'Back on the latest version',
            );
            await refreshLists();
        } catch (error) {
            onError?.('Failed to restore', error);
            emit('error', 'Could not switch to the latest version');
        } finally {
            setLoading(false);
        }
    }, [client, emit, onError, refreshLists]);

    const handleRestore = useCallback(
        async (oid: string) => {
            const confirmMessage =
                'Are you sure you want to reset to this state? This will discard any changes made after this point.';
            const confirmResult = confirmRestore
                ? await confirmRestore(confirmMessage)
                : typeof window !== 'undefined' && 'confirm' in window
                  ? window.confirm(confirmMessage)
                  : true;

            if (!confirmResult) return;

            try {
                setLoading(true);
                await client.restoreFromCommit(oid);
                emit('success', 'Restored to selected version');
                await refreshLists();
            } catch (error) {
                onError?.('Failed to restore version', error);
                emit('error', 'Could not restore version');
            } finally {
                setLoading(false);
            }
        },
        [client, confirmRestore, emit, onError, refreshLists],
    );

    return {
        snapshots,
        backups,
        changes,
        commitDiff,
        loading,
        refreshing,
        hasPendingBackup,
        currentCheckout,
        refreshLists,
        handleSnapshot,
        handleBackup,
        handlePush,
        handleCheckout,
        handleRestoreToLatest,
        handleRestore,
    };
}
