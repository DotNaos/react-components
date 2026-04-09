import { createEmptyDrawingData } from "./types/drawingTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Canvas, CanvasHandle } from "./Canvas";
import {
    ActiveSlots,
    CanvasToolbar,
    CanvasToolbarComponentProps,
    EraserMode,
    SizeSlot,
    ToolSizes
} from "./components/CanvasToolbar";
import { getEraserSize } from "./components/EraserSizeSlots";
import { ResizeHandle } from "./components/ResizeHandles";
import { SelectionActionsMenu } from "./components/SelectionActionsMenu";
import { ShapeEditMenu } from "./components/ShapeEditMenu";
import { ZoomIndicator } from "./components/ZoomIndicator";
import { useSelection } from "./hooks/useSelection";
import { useShapes } from "./hooks/useShapes";
import type { CanvasDrawingData, Shape, Stroke } from "./types/drawingTypes";
import { CANVAS_CONSTANTS, ToolType, ViewState } from "./types/types";
import { calculateTextDimensions } from "./utils/drawingUtils";

/** Default tool sizes for each slot */
const DEFAULT_TOOL_SIZES: ToolSizes = {
  cursor: { small: 0, medium: 0, large: 0 },
  pen: { small: 6, medium: 12, large: 20 },
  highlighter: { small: 6, medium: 12, large: 20 },
  eraser: { small: 6, medium: 12, large: 20 },
  lasso: { small: 0, medium: 0, large: 0 },
  shapes: { small: 2, medium: 4, large: 8 },
  text: { small: 16, medium: 24, large: 32 },
};

/** Default active slots for each tool */
const DEFAULT_ACTIVE_SLOTS: ActiveSlots = {
  cursor: "medium",
  pen: "medium",
  highlighter: "medium",
  eraser: "medium",
  lasso: "medium",
  shapes: "medium",
  text: "medium",
};

export interface CanvasEditorProps {
  /** Initial drawing data */
  initialData?: CanvasDrawingData;
  /** Called when drawing data changes */
  onChange?: (data: CanvasDrawingData) => void;
  /** Called when view changes (for dynamic resolution, etc.) */
  onViewChange?: (view: ViewState) => void;
  /** Whether the canvas is read-only */
  readOnly?: boolean;
  /** Additional class name for container */
  className?: string;
  /** Show the grid */
  showGrid?: boolean;
  /** Theme for toolbar */
  theme?: "dark" | "light";
  /** External tool state (for global persistence) */
  tool?: ToolType;
  /** External color state (for global persistence) */
  color?: string;
  /** External tool sizes (for global persistence) */
  toolSizes?: ToolSizes;
  /** External active slots (for global persistence) */
  activeSlots?: ActiveSlots;
  /** External eraser mode (for global persistence) */
  eraserMode?: EraserMode;
  /** External view state (for controlled pan/zoom) */
  view?: ViewState;
  /** Callback when tool changes (for global persistence) */
  onToolChange?: (tool: ToolType) => void;
  /** Callback when color changes (for global persistence) */
  onColorChange?: (color: string) => void;
  /** Callback when active slot changes (for global persistence) */
  onSlotChange?: (tool: ToolType, slot: SizeSlot) => void;
  /** Callback when size changes (for global persistence) */
  onSizeChange?: (tool: ToolType, slot: SizeSlot, size: number) => void;
  /** Callback when eraser mode changes (for global persistence) */
  onEraserModeChange?: (mode: EraserMode) => void;
  /** Function to render background content (e.g. PDF) transformed by view */
  renderBackground?: (view: ViewState) => React.ReactNode;
  /** Custom toolbar rendering function. If provided, internal toolbar is not rendered */
  renderToolbar?: (props: CanvasToolbarComponentProps) => React.ReactNode;
  /** Grid pattern type (for PDF viewer) */
  gridPattern?: "dots" | "grid" | "none";
  /** Callback when grid pattern changes */
  onGridPatternChange?: (pattern: "dots" | "grid" | "none") => void;
}

/**
 * Complete canvas editor with integrated toolbar.
 * Manages tool state, undo/redo, and syncs changes with parent.
 * Tool settings can be controlled externally via props for global persistence.
 */
export function CanvasEditor({
  initialData,
  onChange,
  onViewChange: externalOnViewChange,
  readOnly = false,
  className,
  showGrid = true,
  theme = "dark",
  tool: externalTool,
  color: externalColor,
  toolSizes: externalToolSizes,
  activeSlots: externalActiveSlots,
  eraserMode: externalEraserMode,
  onToolChange: externalOnToolChange,
  onColorChange: externalOnColorChange,
  onSlotChange: externalOnSlotChange,
  onSizeChange: externalOnSizeChange,
  onEraserModeChange: externalOnEraserModeChange,
  view: externalView,
  renderBackground,
  renderToolbar,
  gridPattern,
  onGridPatternChange,
}: CanvasEditorProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const initialDataRef = useRef(initialData);
  const isInitializedRef = useRef(false);

  // Initialize data only once from initialData
  const [data, setData] = useState<CanvasDrawingData>(
    () => initialData ?? createEmptyDrawingData<Stroke, Shape>(),
  );

  // Resize state
  const [, setResizeHandle] = useState<ResizeHandle | null>(null);
  const resizeInitialStrokesRef = useRef<Stroke[]>([]);
  const resizeInitialShapesRef = useRef<Shape[]>([]);
  const resizeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // Internal tool state (used when not controlled externally)
  const [internalTool, setInternalTool] = useState<ToolType>(
    () => initialData?.settings?.tool ?? "pen",
  );
  const [internalColor, setInternalColor] = useState(
    () => initialData?.settings?.color ?? CANVAS_CONSTANTS.DEFAULT_COLORS[0],
  );
  const [internalToolSizes, setInternalToolSizes] = useState<ToolSizes>(
    () => DEFAULT_TOOL_SIZES,
  );
  const [internalActiveSlots, setInternalActiveSlots] = useState<ActiveSlots>(
    () => DEFAULT_ACTIVE_SLOTS,
  );
  const [internalEraserMode, setInternalEraserMode] = useState<EraserMode>("stroke");

  // Text formatting state
  const [textFontSize, setTextFontSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);

  // Pen color slots state
  const [penColors, setPenColors] = useState(["#1a1a1a", "#ef4444", "#3b82f6", "#10b981"]);
  const [activePenColorIndex, setActivePenColorIndex] = useState(0);

  // Shape filled state
  const [shapeFilled, setShapeFilled] = useState(false);

  // Use external state if provided, otherwise use internal state
  const tool = externalTool ?? internalTool;
  const color = externalColor ?? internalColor;
  const toolSizes = externalToolSizes ?? internalToolSizes;
  const activeSlots = externalActiveSlots ?? internalActiveSlots;
  const eraserMode = externalEraserMode ?? internalEraserMode;

  // Track strokes and redo stack separately for undo/redo state
  const [strokes, setStrokes] = useState<Stroke[]>(
    () => initialData?.strokes ?? [],
  );
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [internalView, setInternalView] = useState<ViewState>(
    () => initialData?.view ?? { x: 0, y: 0, scale: 1 },
  );

  // Use external view if provided, otherwise use internal
  const view = externalView ?? internalView;
  const setView = externalView ?
    (v: ViewState | ((prev: ViewState) => ViewState)) => {
      // When controlled externally, just call onViewChange
      const newView = typeof v === 'function' ? v(view) : v;
      externalOnViewChange?.(newView);
    } : setInternalView;

  // Emit changes helper
  // Note: We use the current view (external or internal) to avoid stale closures,
  // since the view may be externally controlled and change frequently
  const emitChange = useCallback(
    (newData: Partial<CanvasDrawingData>) => {
      // Use the current view - either external or internal
      // Don't use data.view which may be stale
      const currentView = externalView ?? internalView;
      const updated: CanvasDrawingData = {
        ...data,
        ...newData,
        // Always use current view unless caller explicitly provides a view
        view: newData.view ?? currentView,
        updatedAt: new Date().toISOString(),
      };
      setData(updated);
      onChange?.(updated);
    },
    [data, onChange, externalView, internalView],
  );

  // Selection state for lasso tool
  const selection = useSelection({
    strokes,
    onStrokesMove: (movedStrokes: Stroke[]) => {
      setStrokes(movedStrokes);
      setRedoStack([]); // Clear redo after move
    },
  });

  // Clear selection when tool changes away from lasso
  useEffect(() => {
    if (tool !== "lasso") {
      selection.clearSelection();
    }
  }, [tool, selection.clearSelection]);

  // Shapes state
  const [shapes, setShapes] = useState<Shape[]>(() => initialData?.shapes ?? []);
  const shapesRef = useRef(shapes);
  const shapesHook = useShapes({
    shapes,
    onShapesChange: (newShapes: Shape[]) => {
      setShapes(newShapes);
      shapesRef.current = newShapes;
      emitChange({ shapes: newShapes });
    },
  });

  // Delete selected strokes
  const deleteSelectedStrokes = useCallback(() => {
    const newStrokes = strokes.filter(s => !selection.selectedStrokeIds.has(s.id));
    setStrokes(newStrokes);
    setRedoStack([]);
    emitChange({ strokes: newStrokes });
    selection.clearSelection();
  }, [strokes, selection, emitChange]);

  // Duplicate selected strokes
  const duplicateSelectedStrokes = useCallback(() => {
    const offset = 20;
    const duplicated: Stroke[] = [];

    for (const stroke of strokes) {
      if (selection.selectedStrokeIds.has(stroke.id)) {
        const newId = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        duplicated.push({
          ...stroke,
          id: newId,
          points: stroke.points.map(p => ({ ...p, x: p.x + offset, y: p.y + offset })),
          bounds: {
            minX: stroke.bounds.minX + offset,
            maxX: stroke.bounds.maxX + offset,
            minY: stroke.bounds.minY + offset,
            maxY: stroke.bounds.maxY + offset,
          },
        });
      }
    }

    if (duplicated.length > 0) {
      const newStrokes = [...strokes, ...duplicated];
      setStrokes(newStrokes);
      setRedoStack([]);
      emitChange({ strokes: newStrokes });
      // Note: selection would need to support setting IDs directly to select duplicated strokes
    }
  }, [strokes, selection, emitChange]);

  // Combined delete handler for all selected items
  const deleteAllSelected = useCallback(() => {
    const hasSelectedStrokes = selection.selectedStrokeIds.size > 0;
    const hasSelectedShapes = shapesHook.selectedShapeIds.size > 0;

    if (hasSelectedStrokes) {
      deleteSelectedStrokes();
    }
    if (hasSelectedShapes) {
      shapesHook.deleteSelectedShapes();
    }
  }, [selection.selectedStrokeIds, shapesHook, deleteSelectedStrokes]);

  // Combined duplicate handler for all selected items
  const duplicateAllSelected = useCallback(() => {
    const hasSelectedStrokes = selection.selectedStrokeIds.size > 0;
    const hasSelectedShapes = shapesHook.selectedShapeIds.size > 0;

    if (hasSelectedStrokes) {
      duplicateSelectedStrokes();
    }
    if (hasSelectedShapes) {
      shapesHook.duplicateSelectedShapes();
    }
  }, [selection.selectedStrokeIds, shapesHook, duplicateSelectedStrokes]);

  // Keyboard handler for Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if we're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelection = selection.selectedStrokeIds.size > 0 || shapesHook.selectedShapeIds.size > 0;
        if (hasSelection) {
          e.preventDefault();
          deleteAllSelected();
        }
      }

      // Escape key - deselect everything
      if (e.key === 'Escape') {
        const hasSelection = selection.selectedStrokeIds.size > 0 || shapesHook.selectedShapeIds.size > 0;
        if (hasSelection) {
          e.preventDefault();
          selection.clearSelection();
          shapesHook.clearShapeSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedStrokeIds, shapesHook.selectedShapeIds, deleteAllSelected]);

  // Compute current sizes for each tool based on active slots
  const penSize = toolSizes.pen[activeSlots.pen];
  const highlighterSize = toolSizes.highlighter[activeSlots.highlighter];
  // Eraser uses hardcoded sizes (not customizable)
  const eraserSize = getEraserSize(activeSlots.eraser);
  const textSize = toolSizes.text?.[activeSlots.text] ?? 16;

  // Only sync when initialData ID changes (i.e., loading a different drawing)
  // or when explicitly reloading external changes
  useEffect(() => {
    if (!initialData) return;

    // Skip if this is the same drawing and already initialized
    const prevData = initialDataRef.current;
    const isNewDrawing = !prevData || (prevData as any).id !== (initialData as any).id;
    const isExternalUpdate =
      prevData &&
      prevData.updatedAt !== initialData.updatedAt &&
      isInitializedRef.current;

    if (isNewDrawing || isExternalUpdate) {
      initialDataRef.current = initialData;
      isInitializedRef.current = true;

      setData(initialData);
      // Only set internal state if not controlled
      if (!externalTool) setInternalTool(initialData.settings.tool);
      if (!externalColor) setInternalColor(initialData.settings.color);
      setStrokes(initialData.strokes);
      setRedoStack([]);

      // Only sync view from initialData if view is NOT externally controlled
      // When externally controlled, the parent owns the view state
      if (!externalView) {
        setView(initialData.view);
        if (canvasRef.current) {
          canvasRef.current.setView(initialData.view);
        }
      }

      // Update canvas strokes if ref available
      if (canvasRef.current) {
        canvasRef.current.setStrokes(initialData.strokes);
      }
    }
  }, [(initialData as any)?.id, initialData?.updatedAt, externalTool, externalColor]);



  // Handle shape click (selection)
  const handleShapeClick = useCallback((id: string, e: React.MouseEvent) => {
    // Drawing tools (pen, highlighter) should not select shapes - they just draw
    if (tool === "pen" || tool === "highlighter") return;

    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;

    if (isMultiSelect) {
      shapesHook.selectShape(id, true);
    } else {
      shapesHook.selectShape(id, false);
      selection.clearSelection();
    }
  }, [tool, shapesHook, selection]);

  // State for text edit request (used to programmatically open text input)
  const [editTextRequest, setEditTextRequest] = useState<{
    x: number;
    y: number;
    initialValue: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    color?: string;
    fontFamily?: string;
  } | null>(null);

  // Ref for the text shape being edited (to update on submit)
  const editingTextShapeIdRef = useRef<string | null>(null);

  // Handle selection start (lasso)
  const handleSelectionStart = useCallback((point: { x: number; y: number }) => {
    shapesHook.clearShapeSelection();
    selection.startSelection(point);
  }, [shapesHook, selection]);

  // Shape drag state
  const shapeDragPrevRef = useRef<{ x: number, y: number } | null>(null);

  const handleShapeDragStart = useCallback((point: { x: number, y: number }) => {
    shapeDragPrevRef.current = point;
  }, []);

  const handleShapeDragUpdate = useCallback((point: { x: number, y: number }) => {
    if (!shapeDragPrevRef.current) return;

    const delta = {
      x: point.x - shapeDragPrevRef.current.x,
      y: point.y - shapeDragPrevRef.current.y
    };

    shapesHook.moveSelectedShapes(delta);
    shapeDragPrevRef.current = point;
  }, [shapesHook]);

  const handleShapeDragEnd = useCallback(() => {
    shapeDragPrevRef.current = null;
  }, []);

  // Handle stroke complete
  const handleStrokeComplete = useCallback(
    (stroke: Stroke) => {
      const newStrokes = [...strokes, stroke];
      setStrokes(newStrokes);
      setRedoStack([]); // Clear redo stack on new action
      emitChange({ strokes: newStrokes });
    },
    [strokes, emitChange],
  );

  // Handle strokes removed (object eraser)
  const handleStrokesRemoved = useCallback(
    (removedIds: string[]) => {
      const newStrokes = strokes.filter((s) => !removedIds.includes(s.id));
      setStrokes(newStrokes);
      setRedoStack([]); // Clear redo stack on erase action
      emitChange({ strokes: newStrokes });
    },
    [strokes, emitChange],
  );

  // Handle line creation from straight line detection
  const handleLineCreate = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }, strokeColor: string, strokeWidth: number, isHighlighter: boolean) => {
      // Create a line shape using the shapes hook
      // The line will be automatically selected after creation
      shapesHook.createLine(start, end, strokeColor, strokeWidth, isHighlighter);
    },
    [shapesHook],
  );

  // Handle view change
  const handleViewChange = useCallback(
    (newView: ViewState) => {
      // When externally controlled, setView already calls externalOnViewChange
      // so we don't need to call it again or emit changes
      if (externalView) {
        setView(newView);
        // Don't call externalOnViewChange again - setView already does that
        // Don't call emitChange - parent owns the view state
      } else {
        setView(newView);
        emitChange({ view: newView });
        // Notify parent of view change (for dynamic resolution, etc.)
        externalOnViewChange?.(newView);
      }
    },
    [externalView, emitChange, externalOnViewChange, setView],
  );

  // Tool changes - call external handler if provided, otherwise update internal state
  const handleToolChange = useCallback(
    (newTool: ToolType) => {
      if (externalOnToolChange) {
        externalOnToolChange(newTool);
      } else {
        setInternalTool(newTool);
      }
      emitChange({ settings: { ...data.settings, tool: newTool } });
    },
    [data.settings, emitChange, externalOnToolChange],
  );

  // Handle shape double-click (for text editing)
  const handleShapeDoubleClick = useCallback((id: string, _e: React.MouseEvent) => {
    const shape = shapes.find(s => s.id === id);
    if (!shape || shape.kind !== "text") return;

    // Store which shape we're editing
    editingTextShapeIdRef.current = id;

    // Switch to text tool
    handleToolChange("text");

    // Request to open text input at shape position with existing content
    setEditTextRequest({
      x: shape.x1,
      y: shape.y1,
      initialValue: shape.text || '',
      fontSize: shape.fontSize,
      fontWeight: shape.fontWeight,
      fontStyle: shape.fontStyle,
      color: shape.strokeColor,
      fontFamily: shape.fontFamily,
    });

    // Sync global tool state to match the shape being edited
    if (shape.strokeColor) handleColorChange(shape.strokeColor);
    setTextBold(shape.fontWeight === 'bold');
    setTextItalic(shape.fontStyle === 'italic');
    if (shape.fontSize) setTextFontSize(shape.fontSize);

    // Delete the old shape - we'll recreate it when text is committed
    const newShapes = shapes.filter(s => s.id !== id);
    setShapes(newShapes);
    emitChange({ shapes: newShapes });
  }, [shapes, handleToolChange, setShapes, emitChange]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      if (externalOnColorChange) {
        externalOnColorChange(newColor);
      } else {
        setInternalColor(newColor);
      }
      emitChange({ settings: { ...data.settings, color: newColor } });
    },
    [data.settings, emitChange, externalOnColorChange],
  );

  // Slot change handler
  const handleSlotChange = useCallback(
    (toolType: ToolType, slot: SizeSlot) => {
      if (externalOnSlotChange) {
        externalOnSlotChange(toolType, slot);
      } else {
        setInternalActiveSlots((prev: ActiveSlots) => ({
          ...prev,
          [toolType]: slot,
        }));
      }
    },
    [externalOnSlotChange],
  );

  // Size change handler for specific tool and slot
  const handleSizeChange = useCallback(
    (toolType: ToolType, slot: SizeSlot, size: number) => {
      if (externalOnSizeChange) {
        externalOnSizeChange(toolType, slot, size);
      } else {
        setInternalToolSizes((prev: ToolSizes) => ({
          ...prev,
          [toolType]: {
            ...prev[toolType],
            [slot]: size,
          },
        }));
      }
    },
    [externalOnSizeChange],
  );

  // Eraser mode change handler
  const handleEraserModeChange = useCallback(
    (mode: EraserMode) => {
      if (externalOnEraserModeChange) {
        externalOnEraserModeChange(mode);
      } else {
        setInternalEraserMode(mode);
      }
    },
    [externalOnEraserModeChange],
  );

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const undone = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    setRedoStack([...redoStack, undone]);
    canvasRef.current?.setStrokes(newStrokes);
    emitChange({ strokes: newStrokes });
  }, [strokes, redoStack, emitChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const redone = redoStack[redoStack.length - 1];
    const newStrokes = [...strokes, redone];
    setStrokes(newStrokes);
    setRedoStack(redoStack.slice(0, -1));
    canvasRef.current?.setStrokes(newStrokes);
    emitChange({ strokes: newStrokes });
  }, [strokes, redoStack, emitChange]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(view.scale * 1.25, CANVAS_CONSTANTS.MAX_ZOOM);
    const newView = { ...view, scale: newScale };
    setView(newView);
    canvasRef.current?.setView(newView);
    emitChange({ view: newView });
  }, [view, emitChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(view.scale / 1.25, CANVAS_CONSTANTS.MIN_ZOOM);
    const newView = { ...view, scale: newScale };
    setView(newView);
    canvasRef.current?.setView(newView);
    emitChange({ view: newView });
  }, [view, emitChange]);

  const handleZoomReset = useCallback(() => {
    const newView = { x: 0, y: 0, scale: 1 };
    setView(newView);
    canvasRef.current?.resetView();
    emitChange({ view: newView });
  }, [emitChange]);

  // Clear all strokes
  const handleClear = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    canvasRef.current?.clear();
    emitChange({ strokes: [] });
  }, [emitChange]);

  // Calculate unified selection bounds
  const unifiedSelectionBounds = useMemo(() => {
    // 1. Strokes box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasStrokes = false;

    // Use getSelectionBounds instead of selectionBox (which is cleared after selection)
    const strokeBounds = selection.getSelectionBounds(strokes);

    if (strokeBounds) {
      minX = strokeBounds.x1;
      maxX = strokeBounds.x2;
      minY = strokeBounds.y1;
      maxY = strokeBounds.y2;
      hasStrokes = true;
    }

    // 2. Shapes box
    let hasShapes = false;
    if (shapesHook.selectedShapeIds.size > 0) {
      const selectedShapesList = shapes.filter(s => shapesHook.selectedShapeIds.has(s.id));
      if (selectedShapesList.length > 0) {
        hasShapes = true;
        for (const shape of selectedShapesList) {
          minX = Math.min(minX, Math.min(shape.x1, shape.x2));
          maxX = Math.max(maxX, Math.max(shape.x1, shape.x2));
          minY = Math.min(minY, Math.min(shape.y1, shape.y2));
          maxY = Math.max(maxY, Math.max(shape.y1, shape.y2));
        }
      }
    }

    if (!hasStrokes && !hasShapes) return null;

    return { minX, minY, maxX, maxY };
  }, [selection, strokes, shapesHook.selectedShapeIds, shapes]);

  const handleUnifiedDragStart = useCallback((point: { x: number; y: number }) => {
    selection.startDrag(point);
    handleShapeDragStart(point);
  }, [selection, handleShapeDragStart]);

  const handleUnifiedDragUpdate = useCallback((point: { x: number; y: number }) => {
    // Update strokes
    const newStrokes = selection.updateDrag(point, strokes);
    setStrokes(newStrokes);
    if (canvasRef.current) {
      canvasRef.current.setStrokes(newStrokes);
    }

    // Update shapes
    handleShapeDragUpdate(point);
  }, [selection, strokes, handleShapeDragUpdate]);

  const handleUnifiedDragEnd = useCallback(() => {
    selection.endDrag();
    handleShapeDragEnd();
    // Persist changes
    emitChange({ strokes, shapes });
  }, [selection, handleShapeDragEnd, strokes, shapes, emitChange]);

  // Resize Handlers
  const handleResizeHandleStart = useCallback((handle: ResizeHandle, point: { x: number; y: number }) => {
    void point;
    if (!unifiedSelectionBounds) return;

    setResizeHandle(handle);
    resizeInitialStrokesRef.current = strokes;
    resizeInitialShapesRef.current = shapes;
    resizeStartBoundsRef.current = unifiedSelectionBounds;

    // Determine origin (fixed point) based on handle
    let originX = 0;
    let originY = 0;
    const { minX, minY, maxX, maxY } = unifiedSelectionBounds;

    // X origin
    if (handle.includes("w")) originX = maxX;
    else if (handle.includes("e")) originX = minX;
    else originX = minX + (maxX - minX) / 2; // Center for n/s

    // Y origin
    if (handle.includes("n")) originY = maxY;
    else if (handle.includes("s")) originY = minY;
    else originY = minY + (maxY - minY) / 2; // Center for e/w

    resizeOriginRef.current = { x: originX, y: originY };
  }, [unifiedSelectionBounds, strokes, shapes]);

  const handleResizeHandleMove = useCallback((handle: ResizeHandle, point: { x: number; y: number }) => {
    const origin = resizeOriginRef.current;
    const startBounds = resizeStartBoundsRef.current;
    if (!origin || !startBounds) return;

    let scaleX = 1;
    let scaleY = 1;

    // Calculate initial dimensions relative to origin
    // Note: We use the startBounds corner relative to origin

    // X Scale
    if (handle.includes("w") || handle.includes("e")) {
      const initialDistX = (handle.includes("w") ? startBounds.minX : startBounds.maxX) - origin.x;
      const currentDistX = point.x - origin.x;
      if (Math.abs(initialDistX) > 0.001) scaleX = currentDistX / initialDistX;
    }

    // Y Scale
    if (handle.includes("n") || handle.includes("s")) {
      const initialDistY = (handle.includes("n") ? startBounds.minY : startBounds.maxY) - origin.y;
      const currentDistY = point.y - origin.y;
      if (Math.abs(initialDistY) > 0.001) scaleY = currentDistY / initialDistY;
    }

    // Apply scaling
    // 1. Strokes
    const newStrokes = selection.scaleSelected(scaleX, scaleY, origin, resizeInitialStrokesRef.current);
    setStrokes(newStrokes);

    // 2. Shapes
    shapesHook.scaleSelectedShapes(scaleX, scaleY, origin, resizeInitialShapesRef.current);

  }, [selection, shapesHook]);

  const handleResizeHandleEnd = useCallback(() => {
    setResizeHandle(null);
    resizeOriginRef.current = null;
    resizeStartBoundsRef.current = null;
    resizeInitialStrokesRef.current = [];
    resizeInitialShapesRef.current = [];

    // Persist final state
    emitChange({ strokes, shapes });
  }, [strokes, shapes, emitChange]);

    const handleControlPointStart = useCallback((id: string, type: 'start' | 'end', point: { x: number; y: number }) => {
      void id;
      void type;
      void point;
    }, []);

  const handleControlPointMove = useCallback((id: string, type: 'start' | 'end', point: { x: number; y: number }) => {
     if (type === 'start') {
        shapesHook.updateShapeById(id, { x1: point.x, y1: point.y });
     } else {
        shapesHook.updateShapeById(id, { x2: point.x, y2: point.y });
     }
  }, [shapesHook]);

    const handleControlPointEnd = useCallback((id: string, type: 'start' | 'end', point: { x: number; y: number }) => {
      // Persist changes
      void id;
      void type;
      void point;
      emitChange({ shapes: shapesHook.shapes });
    }, [emitChange, shapesHook.shapes]);

  // Handle text completion
  const handleTextComplete = useCallback((text: string, x: number, y: number) => {
    if (!text.trim()) return;

    const { width: textWidth, height: textHeight } = calculateTextDimensions(text, textFontSize);

    const newShape: Shape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: "text",
        x1: x,
        y1: y,
        x2: x + textWidth,
        y2: y + textHeight,
        strokeColor: color,
        strokeWidth: 2,
        text: text,
        fontSize: textFontSize,
        fontWeight: textBold ? 'bold' : 'normal',
        fontStyle: textItalic ? 'italic' : 'normal',
        fontFamily: 'sans-serif'
    };

    const newShapes = [...shapes, newShape];
    setShapes(newShapes);
    // Also update ref and hook state if possible?
    // shapesHook uses 'shapes' from props, so updating state triggers re-render of hook
    emitChange({ shapes: newShapes });

    // Auto-select the new text
    shapesHook.setShapeSelection(new Set([newShape.id]));

    // Switch to lasso tool so user can see/move the selected text
    handleToolChange("lasso");
  }, [shapes, color, textFontSize, textBold, textItalic, emitChange, shapesHook, handleToolChange]);

  return (
    <div
      ref={editorContainerRef}
      className={className ?? ""}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {renderBackground && renderBackground(view)}
      <Canvas
        canvasRef={canvasRef}
        readOnly={readOnly}
        initialStrokes={strokes}
        view={view}
        initialView={initialData?.view}
        showGrid={showGrid && !renderBackground} // Hide grid if background is present, or make it optional? Usually PDF has its own background.
        backgroundColor={renderBackground ? "transparent" : undefined}
        tool={tool}
        color={color}
        penSize={tool === 'text' ? textSize : penSize}
        highlighterSize={highlighterSize}
        eraserSize={eraserSize}
        eraserMode={eraserMode}
        onStrokeComplete={handleStrokeComplete}
        onStrokesRemoved={handleStrokesRemoved}
        onViewChange={handleViewChange}
        onToolChange={handleToolChange}
        onLineCreate={handleLineCreate}
        selectionBox={selection.selectionBox}
        unifiedSelectionBounds={unifiedSelectionBounds}
        lassoPath={selection.lassoPath}
        selectedStrokeIds={selection.selectedStrokeIds}
        onSelectionStart={handleSelectionStart}
        onSelectionUpdate={selection.updateSelection}
        onSelectionEnd={() => {
          const box = selection.selectionBox;
          const path = selection.lassoPath;
          const mode = selection.lassoMode;

          // Minimum drag threshold to distinguish click from drag
          const MIN_DRAG_THRESHOLD = 5;

          // Check if this was a click (small movement) or a drag
          let isClick = false;
          let clickPoint: { x: number; y: number } | null = null;

          if (mode === "rectangle" && box) {
            const width = Math.abs(box.x2 - box.x1);
            const height = Math.abs(box.y2 - box.y1);
            if (width < MIN_DRAG_THRESHOLD && height < MIN_DRAG_THRESHOLD) {
              isClick = true;
              clickPoint = { x: box.x1, y: box.y1 };
            }
          } else if (mode === "freeform" && path && path.length > 0) {
            // For freeform, check bounding box of path
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const p of path) {
              minX = Math.min(minX, p.x);
              maxX = Math.max(maxX, p.x);
              minY = Math.min(minY, p.y);
              maxY = Math.max(maxY, p.y);
            }
            if (maxX - minX < MIN_DRAG_THRESHOLD && maxY - minY < MIN_DRAG_THRESHOLD) {
              isClick = true;
              clickPoint = path[0];
            }
          }

          if (isClick && clickPoint) {
            // Click behavior: select shape under cursor (not strokes)
            selection.endSelection([]); // Clear stroke selection
            const hitShape = shapesHook.hitTestShape(clickPoint);
            if (hitShape) {
              shapesHook.setShapeSelection(new Set([hitShape.id]));
            } else {
              shapesHook.clearShapeSelection();
            }
          } else {
            // Drag behavior: select strokes and shapes in the lasso area
            selection.endSelection(strokes);

            // Select shapes based on lasso
            if (mode === "rectangle" && box) {
              const ids = shapesHook.getShapesInBox(box);
              shapesHook.setShapeSelection(ids);
            } else if (mode === "freeform" && path) {
              const ids = shapesHook.getShapesInLasso(path);
              shapesHook.setShapeSelection(ids);
            }
          }
        }}
        onSelectionDragStart={handleUnifiedDragStart}
        onSelectionDragUpdate={handleUnifiedDragUpdate}
        onSelectionDragEnd={handleUnifiedDragEnd}
        shapes={shapes}
        currentShape={shapesHook.currentShape}
        selectedShapeIds={shapesHook.selectedShapeIds}
        onShapeClick={handleShapeClick}
        onShapeDoubleClick={handleShapeDoubleClick}
        onShapeStart={(point) => {
          // Pass current color and size to the shape
          const shapeStrokeWidth = toolSizes.shapes[activeSlots.shapes];
          const fillColor = shapeFilled ? color : undefined;
          shapesHook.startShape(point, color, shapeStrokeWidth, fillColor);
        }}
        onShapeUpdate={shapesHook.updateShape}
        onShapeEnd={() => {
          shapesHook.endShape();
        }}
        onShapeDragStart={handleShapeDragStart}
        onShapeDragUpdate={handleUnifiedDragUpdate}
        onShapeDragEnd={handleUnifiedDragEnd}
        onResizeHandleStart={handleResizeHandleStart}
        onResizeHandleMove={handleResizeHandleMove}
        onResizeHandleEnd={handleResizeHandleEnd}
        onControlPointStart={handleControlPointStart}
        onControlPointMove={handleControlPointMove}
        onControlPointEnd={handleControlPointEnd}
        onTextComplete={handleTextComplete}
        onEmptyCanvasClick={() => {
          shapesHook.clearShapeSelection();
          selection.clearSelection();
        }}
        editTextRequest={editTextRequest}
        onEditTextRequestHandled={() => setEditTextRequest(null)}
        textBold={textBold}
        textItalic={textItalic}
        textFontSize={textFontSize}
      />

      {/* Shape Edit Menu - appears when ONLY a single shape is selected (no strokes) */}
      {!readOnly && shapesHook.selectedShapeIds.size === 1 && selection.selectedStrokeIds.size === 0 && (() => {
        const shapeId = Array.from(shapesHook.selectedShapeIds)[0];
        const selectedShape = shapes.find(s => s.id === shapeId);
        if (!selectedShape) return null;

        return (
          <ShapeEditMenu
            shape={selectedShape}
            view={view}
            containerRef={editorContainerRef}
            theme={theme}
            onShapeUpdate={(updates: Partial<Shape>) => {
              // If text properties change, recalculate dimensions
              if (selectedShape.kind === 'text' && (updates.fontSize || updates.text)) {
                 const fontSize = updates.fontSize ?? selectedShape.fontSize ?? 16;
                 const text = updates.text ?? selectedShape.text ?? '';
                 const { width, height } = calculateTextDimensions(text, fontSize);

                 const x1 = updates.x1 ?? selectedShape.x1;
                 const y1 = updates.y1 ?? selectedShape.y1;

                 shapesHook.updateShapeById(shapeId, {
                   ...updates,
                   x2: x1 + width,
                   y2: y1 + height
                 });
              } else {
                 shapesHook.updateShapeById(shapeId, updates);
              }
            }}
            onDelete={() => shapesHook.deleteSelectedShapes()}
            onDuplicate={() => shapesHook.duplicateSelectedShapes()}
          />
        );
      })()}

      {/* Selection Actions Menu - appears for lasso selections (multiple items or any strokes) */}
      {!readOnly && unifiedSelectionBounds && (() => {
        const hasStrokes = selection.selectedStrokeIds.size > 0;
        const hasMultipleShapes = shapesHook.selectedShapeIds.size > 1;

        // Show SelectionActionsMenu when:
        // - We have any strokes selected (alone or with shapes)
        // - We have multiple shapes selected (without strokes, single shape uses ShapeEditMenu)
        const shouldShowActionsMenu = hasStrokes || hasMultipleShapes;

        if (!shouldShowActionsMenu) return null;

        return (
          <SelectionActionsMenu
            selectionBounds={unifiedSelectionBounds}
            view={view}
            containerRef={editorContainerRef}
            theme={theme}
            onDelete={deleteAllSelected}
            onDuplicate={duplicateAllSelected}
          />
        );
      })()}

      {!readOnly && (() => {
        const toolbarProps: CanvasToolbarComponentProps = {
          tool,
          color,
          toolSizes,
          activeSlots,
          eraserMode,
          zoom: view.scale,
          canUndo: strokes.length > 0,
          canRedo: redoStack.length > 0,
          onToolChange: handleToolChange,
          onColorChange: handleColorChange,
          onSlotChange: handleSlotChange,
          onSizeChange: handleSizeChange,
          onEraserModeChange: handleEraserModeChange,
          onZoomIn: handleZoomIn,
          onZoomOut: handleZoomOut,
          onZoomReset: handleZoomReset,
          onUndo: handleUndo,
          onRedo: handleRedo,
          onClear: handleClear,
          theme,
          gridPattern,
          onGridPatternChange,
          shapeType: shapesHook.shapeType,
          onShapeTypeChange: shapesHook.setShapeType,
          lassoMode: selection.lassoMode,
          onLassoModeChange: selection.setLassoMode,
          textFontSize,
          onTextFontSizeChange: setTextFontSize,
          textBold,
          onTextBoldChange: setTextBold,
          textItalic,
          onTextItalicChange: setTextItalic,
          penColors,
          activePenColorIndex,
          onPenColorSelect: (index: number) => {
            setActivePenColorIndex(index);
            // Also update the main color to the selected slot color
            handleColorChange(penColors[index]);
          },
          onPenColorChange: (index: number, newColor: string) => {
            setPenColors(prev => {
              const updated = [...prev];
              updated[index] = newColor;
              return updated;
            });
            // If this is the active slot, also update the main color
            if (index === activePenColorIndex) {
              handleColorChange(newColor);
            }
          },
          shapeFilled,
          onShapeFilledChange: setShapeFilled,
        };

        // If custom render function is provided, use it
        if (renderToolbar) {
          return renderToolbar(toolbarProps);
        }

        // Otherwise render the default toolbar - with zoom controls hidden (moved to ZoomIndicator)
        return <CanvasToolbar {...toolbarProps} showZoomControls={false} />;
      })()}

      {/* Zoom Indicator - bottom left corner */}
      {!readOnly && (
        <ZoomIndicator
          zoom={view.scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          theme={theme}
        />
      )}
    </div>
  );
}
