import { Save } from "lucide-react";
import type { ReactElement } from "react";

interface NoteSaveActionProps {
  isDirty?: boolean;
  isLoading?: boolean;
  hasExternalChanges?: boolean;
  onSave?: () => void;
}

export function NoteSaveAction({
  isDirty = false,
  isLoading = false,
  hasExternalChanges = false,
  onSave,
}: NoteSaveActionProps): ReactElement | null {
  if (hasExternalChanges) {
    return <span className="text-sm text-amber-500">Conflict</span>;
  }

  if (!onSave || !isDirty) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isLoading}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Save (Ctrl+S)"
    >
      <Save className="h-4 w-4 animate-pulse" />
    </button>
  );
}
