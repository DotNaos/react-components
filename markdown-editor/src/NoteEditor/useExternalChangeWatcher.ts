import { useEffect } from "react";

interface ExternalChangeWatcherOptions {
  enabled?: boolean;
  onCheck: () => void;
}

export function useExternalChangeWatcher({
  enabled = true,
  onCheck,
}: ExternalChangeWatcherOptions): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleFocus = () => {
      onCheck();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, onCheck]);
}
