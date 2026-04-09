import type { ToolType } from "../../types/types";
import { ArrowLeft } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import type { CanvasDrawingData } from "../../types/drawingTypes";
import { CanvasEditor } from "../../CanvasEditor";
import {
    CanvasToolbar,
    type ActiveSlots,
    type CanvasToolbarComponentProps,
    type EraserMode,
    type SizeSlot,
    type ToolSizes,
} from "../../components/CanvasToolbar";
import { PdfViewer } from "../pdf/PdfLayer";

interface DrawingEditorShellProps {
  documentId: string;
  title?: string;
  onTitleChange?: (value: string) => void;
  data?: CanvasDrawingData | null;
  pdfData?: string | null;
  isLoading?: boolean;
  isDirty?: boolean;
  error?: string | null;
  onBack?: () => void;
  onChange?: (data: CanvasDrawingData) => void;
  headerRightSlot?: ReactNode;
  topSlot?: ReactNode;
  theme?: "dark" | "light";
  tool?: ToolType;
  color?: string;
  toolSizes?: ToolSizes;
  activeSlots?: ActiveSlots;
  eraserMode?: EraserMode;
  onToolChange?: (tool: ToolType) => void;
  onColorChange?: (color: string) => void;
  onSlotChange?: (tool: ToolType, slot: SizeSlot) => void;
  onSizeChange?: (tool: ToolType, slot: SizeSlot, size: number) => void;
  onEraserModeChange?: (mode: EraserMode) => void;
}

function propsChanged(
  prev: CanvasToolbarComponentProps | null,
  next: CanvasToolbarComponentProps,
): boolean {
  if (!prev) return true;

  const keys = Object.keys(next) as (keyof CanvasToolbarComponentProps)[];
  if (Object.keys(prev).length !== keys.length) return true;

  for (const key of keys) {
    const val1 = prev[key];
    const val2 = next[key];

    if (typeof val1 === "function" && typeof val2 === "function") continue;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return true;
      for (let i = 0; i < val1.length; i++) {
        if (val1[i] !== val2[i]) return true;
      }
      continue;
    }

    if (val1 !== val2) return true;
  }

  return false;
}

export function DrawingEditorShell({
  documentId,
  title,
  onTitleChange,
  data,
  pdfData,
  isLoading = false,
  isDirty = false,
  error,
  onBack,
  onChange,
  headerRightSlot,
  topSlot,
  theme = "dark",
  tool,
  color,
  toolSizes,
  activeSlots,
  eraserMode,
  onToolChange,
  onColorChange,
  onSlotChange,
  onSizeChange,
  onEraserModeChange,
}: DrawingEditorShellProps): ReactElement {
  const [toolbarProps, setToolbarProps] = useState<CanvasToolbarComponentProps | null>(null);
  const toolbarPropsRef = useRef<CanvasToolbarComponentProps | null>(null);

  const renderToolbar = useCallback((props: CanvasToolbarComponentProps) => {
    toolbarPropsRef.current = props;
    setTimeout(() => {
      setToolbarProps((prev) => (propsChanged(prev, props) ? props : prev));
    }, 0);
    return null;
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-destructive mb-4">{error}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading drawing...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {topSlot}

      <header
        className={`h-[57px] flex items-center justify-between px-4 border-b transition-colors duration-300 ${
          isDirty ? "border-border bg-foreground/2" : "border-border"
        }`}
      >
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {onTitleChange ? (
            <input
              type="text"
              value={title ?? ""}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Drawing"
              className="text-lg font-medium bg-transparent border-none outline-none focus:ring-0 w-64 placeholder:text-muted-foreground/40"
            />
          ) : (
            <span className="text-lg font-medium truncate max-w-[320px]">
              {title ?? "Untitled Drawing"}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {headerRightSlot}
          {toolbarProps && (
            <CanvasToolbar
              {...toolbarProps}
              showZoomControls={false}
              showUndoRedo={false}
              className="header-toolbar"
            />
          )}
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {pdfData ? (
          <PdfViewer
            pdfData={pdfData}
            documentId={documentId}
            initialAnnotations={data}
            onAnnotationsChange={onChange}
            theme={theme}
            tool={tool}
            color={color}
            toolSizes={toolSizes}
            activeSlots={activeSlots}
            eraserMode={eraserMode}
            onToolChange={onToolChange}
            onColorChange={onColorChange}
            onSlotChange={onSlotChange}
            onSizeChange={onSizeChange}
            onEraserModeChange={onEraserModeChange}
            renderToolbar={renderToolbar}
          />
        ) : (
          <CanvasEditor
            initialData={data}
            onChange={onChange}
            theme={theme}
            tool={tool}
            color={color}
            toolSizes={toolSizes}
            activeSlots={activeSlots}
            eraserMode={eraserMode}
            onToolChange={onToolChange}
            onColorChange={onColorChange}
            onSlotChange={onSlotChange}
            onSizeChange={onSizeChange}
            onEraserModeChange={onEraserModeChange}
            renderToolbar={renderToolbar}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}
