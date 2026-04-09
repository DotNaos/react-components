import { useEffect, useRef } from "react";

interface AutosaveOptions {
  isDirty: boolean;
  onSave: () => void;
  delayMs?: number;
  enabled?: boolean;
  blocked?: boolean;
}

export function useAutosave({
  isDirty,
  onSave,
  delayMs = 1500,
  enabled = true,
  blocked = false,
}: AutosaveOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || blocked || !isDirty) return undefined;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onSave();
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [blocked, delayMs, enabled, isDirty, onSave]);
}
