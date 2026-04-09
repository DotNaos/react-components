import { useCallback } from "react";

import type { GitClientControllerOptions } from "./controller-types";
import { gitClientView } from "./GitClientView";
import type { GitClientInput, GitClientOutput } from "./types";
import { useGitClientController } from "./useGitClientController";

export interface GitClientShellProps extends GitClientControllerOptions {
  className?: string;
  headerTitle?: string;
}

export function GitClientShell({ className, headerTitle, ...controllerOptions }: GitClientShellProps) {
  const {
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
  } = useGitClientController(controllerOptions);

  const input: GitClientInput = {
    snapshots,
    backups,
    changes,
    commitDiff,
    currentCheckout,
    loading,
    refreshing,
    hasPendingBackup,
    className,
    headerTitle,
  };

  const emit = useCallback(
    (output: GitClientOutput) => {
      switch (output.type) {
        case "refresh":
          void refreshLists(output.payload.showToast);
          return;
        case "create-snapshot":
          void handleSnapshot();
          return;
        case "create-backup":
          void handleBackup();
          return;
        case "push-backup":
          void handlePush();
          return;
        case "checkout":
          void handleCheckout(output.payload.oid);
          return;
        case "restore-latest":
          void handleRestoreToLatest();
          return;
        case "restore":
          void handleRestore(output.payload.oid);
          return;
      }
    },
    [
      handleBackup,
      handleCheckout,
      handlePush,
      handleRestore,
      handleRestoreToLatest,
      handleSnapshot,
      refreshLists,
    ]
  );

  return <>{gitClientView.render(input, emit)}</>;
}
