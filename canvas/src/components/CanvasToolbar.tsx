import { LassoMode, ToolType } from "../types/types";
import {
    Eraser,
    Highlighter,
    LassoSelect,
    Minus,
    MousePointer2,
    PenTool,
    Plus,
    Redo,
    Scan,
    Shapes,
    SquareDashedMousePointer,
    Trash2,
    Type,
    Undo,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import "../canvas.css";
import type { ShapeKind } from "../types/drawingTypes";
import {
    ActiveSlots,
    CANVAS_CONSTANTS,
    CanvasToolbarProps,
    EraserMode,
    SizeSlot,
    ToolSizes,
} from "../types/types";
import { CanvasToolbarFloatingMenu } from "./CanvasToolbarFloatingMenu";
import { ConfirmDialog } from "./ConfirmDialog";

export type { ActiveSlots, EraserMode, SizeSlot, ToolSizes };

export interface CanvasToolbarComponentProps extends CanvasToolbarProps {
  tool: ToolType;
  color: string;
  toolSizes: ToolSizes;
  activeSlots: ActiveSlots;
  eraserMode: EraserMode;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onSlotChange: (tool: ToolType, slot: SizeSlot) => void;
  onSizeChange: (tool: ToolType, slot: SizeSlot, size: number) => void;
  onEraserModeChange: (mode: EraserMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear?: () => void;
  theme?: "dark" | "light";
  /** Current grid pattern type */
  gridPattern?: "dots" | "grid" | "none";
  /** Callback when grid pattern changes */
  onGridPatternChange?: (pattern: "dots" | "grid" | "none") => void;
  /** Current shape type for shapes tool */
  shapeType?: ShapeKind;
  /** Callback when shape type changes */
  onShapeTypeChange?: (type: ShapeKind) => void;
  /** Current lasso mode */
  lassoMode?: LassoMode;
  /** Callback when lasso mode changes */
  onLassoModeChange?: (mode: LassoMode) => void;
  /** Current text font size */
  textFontSize?: number;
  /** Callback when text font size changes */
  onTextFontSizeChange?: (size: number) => void;
  /** Current text bold state */
  textBold?: boolean;
  /** Callback when text bold changes */
  onTextBoldChange?: (bold: boolean) => void;
  /** Current text italic state */
  textItalic?: boolean;
  /** Callback when text italic changes */
  onTextItalicChange?: (italic: boolean) => void;
  /** Pen color slots (array of 4 colors) */
  penColors?: string[];
  /** Active pen color slot index */
  activePenColorIndex?: number;
  /** Callback when a pen color slot is selected */
  onPenColorSelect?: (index: number) => void;
  /** Callback when a pen color slot color changes */
  onPenColorChange?: (index: number, color: string) => void;
  /** Whether shapes should be filled */
  shapeFilled?: boolean;
  /** Callback when shape filled changes */
  onShapeFilledChange?: (filled: boolean) => void;
}

/**
 * Toolbar component for the canvas with tool selection, color picker, size slots, and zoom controls.
 */
export function CanvasToolbar({
  className,
  showZoomControls = true,
  showUndoRedo = true,
  showColorPicker = true,
  showSizeSlider = true,
  colors = [...CANVAS_CONSTANTS.DEFAULT_COLORS],
  tool,
  color,
  toolSizes,
  activeSlots,
  eraserMode,
  zoom,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onSlotChange,
  onSizeChange,
  onEraserModeChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  onClear,
  theme = "dark",
  gridPattern,
  onGridPatternChange,
  shapeType = "rectangle",
  onShapeTypeChange,
  lassoMode,
  onLassoModeChange,
  textFontSize = 16,
  onTextFontSizeChange,
  textBold = false,
  onTextBoldChange,
  textItalic = false,
  onTextItalicChange,
  penColors = ["#1a1a1a", "#ef4444", "#3b82f6", "#10b981"],
  activePenColorIndex = 0,
  onPenColorSelect,
  onPenColorChange,
  shapeFilled = false,
  onShapeFilledChange,
}: CanvasToolbarComponentProps) {
  void showColorPicker;
  void showSizeSlider;
  void colors;
  void gridPattern;
  void onGridPatternChange;

  const themeClass = theme === "light" ? "light" : "";
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0, width: 0 });

  // Refs for main buttons to position the floating menu
  const penBtnRef = useRef<HTMLButtonElement>(null);
  const eraserBtnRef = useRef<HTMLButtonElement>(null);
  const textBtnRef = useRef<HTMLButtonElement>(null);
  const shapeBtnRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Determine if we should show the floating menu
  const activeToolGroup = (() => {
      if (tool === 'pen' || tool === 'highlighter') return 'pen';
      if (tool === 'eraser') return 'eraser';
      if (tool === 'text') return 'text';
      if (tool === 'shapes') return 'shapes';
      return null;
  })();

  const showFloatingMenu = !!activeToolGroup;

  useEffect(() => {
    // Position relative to the header if available, otherwise relative to toolbar
    if (toolbarRef.current && activeToolGroup) {
        const header = toolbarRef.current.closest('header');
        const targetRect = header ? header.getBoundingClientRect() : toolbarRef.current.getBoundingClientRect();

        setToolbarPos({
            top: targetRect.bottom + 12, // Gap below header/toolbar
            left: targetRect.left + targetRect.width / 2, // Center of header/toolbar
            width: targetRect.width
        });
    }
  }, [tool, activeToolGroup]);

  // Check if this is a header toolbar (popovers should open downward)
  const isHeaderToolbar = className?.includes("header-toolbar") ?? false;

  const handleClearClick = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    onClear?.();
    setShowClearConfirm(false);
  }, [onClear]);

  const handleCancelClear = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  return (
    <>
      {/* Top Controls - Zoom + Undo/Redo/Clear - Kept as requested? User didn't mention removing, but showed specific main toolbar. Keeping top controls for utility. */}
      {showZoomControls && (
        <div className={`top-controls ${themeClass}`} onMouseDown={(e) => e.preventDefault()}>
          <div className={`action-controls ${themeClass}`}>
            {showUndoRedo && (
              <>
                <button type="button" className="action-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
                  <Undo className="w-4 h-4" />
                </button>
                <button type="button" className="action-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
                  <Redo className="w-4 h-4" />
                </button>
              </>
            )}
            {onClear && (
              <button type="button" className="action-btn danger" onClick={handleClearClick} title="Clear Canvas">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className={`zoom-controls ${themeClass}`}>
            <button type="button" className="zoom-btn" onClick={onZoomOut}><Minus className="w-4 h-4" /></button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button type="button" className="zoom-btn" onClick={onZoomIn}><Plus className="w-4 h-4" /></button>
            <button type="button" className="zoom-btn" onClick={onZoomReset}><Scan className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div ref={toolbarRef} className={`canvas-toolbar ${themeClass} ${className ?? ""}`} onMouseDown={(e) => e.preventDefault()}>
        <div className="toolbar-content">
          <button
            type="button"
            className={`tool-btn ${tool === "cursor" ? "active" : ""}`}
            onClick={() => onToolChange("cursor")}
            title="Cursor / Select"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={`tool-btn ${tool === "lasso" ? "active" : ""}`}
            onClick={() => {
                if (tool === 'lasso' && onLassoModeChange) {
                    onLassoModeChange(lassoMode === 'freeform' ? 'rectangle' : 'freeform');
                } else {
                    onToolChange("lasso");
                }
            }}
            title={`Lasso (${lassoMode === 'freeform' ? 'Freeform' : 'Rectangle'}) - Click again to toggle`}
          >
            {lassoMode === "freeform" ? <LassoSelect className="w-5 h-5" /> : <SquareDashedMousePointer className="w-5 h-5" />}
          </button>

          <div className="toolbar-divider" />

          <button
            ref={penBtnRef}
            type="button"
            className={`tool-btn ${tool === "pen" || tool === "highlighter" ? "active" : ""}`}
            onClick={() => {
                // Determine if we switch to pen or toggling
                if (tool !== 'pen' && tool !== 'highlighter') {
                    onToolChange('pen');
                }
            }}
            title="Pen Tools"
          >
             {tool === 'highlighter' ? <Highlighter className="w-5 h-5" /> : <PenTool className="w-5 h-5" />}
          </button>

          <button
            ref={eraserBtnRef}
            type="button"
            className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
            onClick={() => onToolChange("eraser")}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <button
            ref={textBtnRef}
            type="button"
            className={`tool-btn ${tool === "text" ? "active" : ""}`}
            onClick={() => onToolChange("text")}
            title="Text"
          >
             <Type className="w-5 h-5" />
          </button>

          <button
            ref={shapeBtnRef}
            type="button"
            className={`tool-btn ${tool === "shapes" ? "active" : ""}`}
            onClick={() => onToolChange("shapes")}
            title="Shapes"
          >
            <Shapes className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CanvasToolbarFloatingMenu
        show={showFloatingMenu}
        activeToolGroup={activeToolGroup}
        tool={tool}
        theme={theme}
        toolbarPos={toolbarPos}
        penColors={penColors}
        activePenColorIndex={activePenColorIndex}
        onPenColorSelect={onPenColorSelect}
        onPenColorChange={onPenColorChange}
        toolSizes={toolSizes}
        activeSlots={activeSlots}
        onSlotChange={onSlotChange}
        onSizeChange={onSizeChange}
        eraserMode={eraserMode}
        onEraserModeChange={onEraserModeChange}
        textFontSize={textFontSize}
        onTextFontSizeChange={onTextFontSizeChange}
        textBold={textBold}
        onTextBoldChange={onTextBoldChange}
        textItalic={textItalic}
        onTextItalicChange={onTextItalicChange}
        shapeType={shapeType}
        onShapeTypeChange={onShapeTypeChange}
        shapeFilled={shapeFilled}
        onShapeFilledChange={onShapeFilledChange}
        color={color}
        onColorChange={onColorChange}
        isHeaderToolbar={isHeaderToolbar}
        lassoMode={lassoMode}
        onToolChange={onToolChange}
      />

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Canvas"
        message="Are you sure you want to clear the entire canvas? This action cannot be undone."
        confirmLabel="Clear"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
        theme={theme}
      />
    </>
  );
}
