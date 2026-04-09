import { ArrowLeft, Copy, Save } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { languageFromExtension, normalizeExtension } from "./language";

interface RawEditorShellProps {
  title: string;
  extension?: string | null;
  language?: string;
  content: string;
  readOnly?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onContentChange?: (value: string) => void;
  onBack?: () => void;
  onCopy?: () => void;
  onSave?: () => void;
  headerRightSlot?: ReactNode;
}

export function RawEditorShell({
  title,
  extension,
  language,
  content,
  readOnly = false,
  isLoading = false,
  isSaving = false,
  onContentChange,
  onBack,
  onCopy,
  onSave,
  headerRightSlot,
}: RawEditorShellProps): ReactElement {
  const normalizedExtension = normalizeExtension(extension);
  const resolvedLanguage = language ?? languageFromExtension(normalizedExtension);

  return (
    <div className="container mx-auto p-4 max-w-6xl mt-10 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground shrink-0"
              onClick={onBack}
              title="Back"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">
              {title}
              {normalizedExtension ? (
                <span className="text-muted-foreground">.{normalizedExtension}</span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              Raw text viewer ({resolvedLanguage})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headerRightSlot}
          {onCopy && (
            <button
              className="inline-flex items-center gap-2 text-sm rounded-md border px-3 py-2 hover:bg-accent"
              onClick={onCopy}
              title="Copy to clipboard"
              type="button"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          )}

          {onSave && !readOnly && (
            <button
              className="inline-flex items-center gap-2 text-sm rounded-md border px-3 py-2 hover:bg-accent disabled:opacity-50"
              onClick={onSave}
              disabled={isSaving}
              title="Save"
              type="button"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      <CodeEditor
        value={content}
        onChange={readOnly ? undefined : onContentChange}
        language={resolvedLanguage}
        readOnly={readOnly}
        height="calc(100vh - 220px)"
        theme="vs-dark"
        className="border rounded-lg"
      />

      {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
    </div>
  );
}
