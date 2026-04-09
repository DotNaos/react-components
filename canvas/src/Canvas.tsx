import { createLogger } from '../../logging';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import './canvas.css';
import { EraserMode } from './components/CanvasToolbar';
import { ResizeHandle, ResizeHandles } from './components/ResizeHandles';
import { ShapeControlHandles } from './components/ShapeControlHandles';
import { ShapeRenderer } from './components/ShapeRenderer';
import { useAnimatedView } from './hooks/useAnimatedView';
import { useCanvasCursor } from './hooks/useCanvasCursor';
import { useCanvasHandle } from './hooks/useCanvasHandle';
import { useCanvasResize } from './hooks/useCanvasResize';
import { useGestures } from './hooks/useGestures';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePointerHandlers } from './hooks/usePointerHandlers';
import { useStraightLineDetection } from './hooks/useStraightLineDetection';
import type { Shape, Stroke } from './types/drawingTypes';
import {
    CANVAS_CONSTANTS,
    CanvasProps,
    ToolType,
    ViewState,
} from './types/types';
import {
    drawFluentStroke,
    drawGrid,
    drawSimpleStroke,
    generateStrokeId,
    isStrokeVisible,
    pointNearStroke,
    toWorld as toWorldUtil,
} from './utils/drawingUtils';
import { Stabilizer } from './utils/Stabilizer';

const logger = createLogger('com.aryazos.components.canvas');

export interface CanvasHandle {
    /** Get current strokes */
    getStrokes: () => Stroke[];
    /** Set strokes (replaces all) */
    setStrokes: (strokes: Stroke[]) => void;
    /** Add a stroke */
    addStroke: (stroke: Stroke) => void;
    /** Clear all strokes */
    clear: () => void;
    /** Undo last stroke */
    undo: () => void;
    /** Redo last undone stroke */
    redo: () => void;
    /** Get current view */
    getView: () => ViewState;
    /** Set view */
    setView: (view: ViewState) => void;
    /** Reset view to default */
    resetView: () => void;
    /** Export canvas as data URL */
    toDataURL: (type?: string, quality?: number) => string;
}

export interface CanvasComponentProps extends CanvasProps {
    /** Tool type */
    tool?: ToolType;
    /** Stroke color */
    color?: string;
    /** Pen stroke size */
    penSize?: number;
    /** Highlighter stroke size */
    highlighterSize?: number;
    /** Eraser stroke size */
    eraserSize?: number;
    /** Eraser mode: stroke (pixel) or object (whole stroke) */
    eraserMode?: EraserMode;
    /** Ref to access canvas methods */
    canvasRef?: React.RefObject<CanvasHandle | null>;
    /** Callback when tool should change (e.g., from gesture) */
    onToolChange?: (tool: ToolType) => void;
    /** Callback when strokes are removed (for object eraser) */
    onStrokesRemoved?: (strokeIds: string[]) => void;
    /** Selection box to render (for lasso tool) */
    selectionBox?: { x1: number; y1: number; x2: number; y2: number } | null;
    /** Unified selection bounds (overrides separate stroke/shape boxes) */
    unifiedSelectionBounds?: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    } | null;
    /** Freeform lasso path to render */
    lassoPath?: { x: number; y: number }[] | null;
    /** IDs of selected strokes to highlight */
    selectedStrokeIds?: Set<string>;
    /** Callback when lasso selection starts */
    onSelectionStart?: (point: { x: number; y: number }) => void;
    /** Callback when lasso selection updates */
    onSelectionUpdate?: (point: { x: number; y: number }) => void;
    /** Callback when lasso selection ends */
    onSelectionEnd?: () => void;
    /** Callback when selection drag starts */
    onSelectionDragStart?: (point: { x: number; y: number }) => void;
    /** Callback when selection drag updates */
    onSelectionDragUpdate?: (point: { x: number; y: number }) => void;
    /** Callback when selection drag ends */
    onSelectionDragEnd?: () => void;
    /** Shapes to render */
    shapes?: Shape[];
    /** Current shape being drawn */
    currentShape?: Shape | null;
    /** IDs of selected shapes */
    selectedShapeIds?: Set<string>;
    /** Callback when a shape is clicked */
    onShapeClick?: (shapeId: string, e: React.MouseEvent) => void;
    /** Callback when a shape is double-clicked (for text editing) */
    onShapeDoubleClick?: (shapeId: string, e: React.MouseEvent) => void;
    /** Callback when shape drawing starts */
    onShapeStart?: (point: { x: number; y: number }) => void;
    /** Callback when shape drawing updates */
    onShapeUpdate?: (point: { x: number; y: number }) => void;
    /** Callback when shape drawing ends */
    onShapeEnd?: () => void;
    /** Callback when shape drag starts */
    onShapeDragStart?: (point: { x: number; y: number }) => void;
    /** Callback when shape drag updates */
    onShapeDragUpdate?: (point: { x: number; y: number }) => void;
    /** Callback when shape drag ends */
    onShapeDragEnd?: () => void;
    onResizeHandleStart?: (
        handle: ResizeHandle,
        point: { x: number; y: number },
    ) => void;
    onResizeHandleMove?: (
        handle: ResizeHandle,
        point: { x: number; y: number },
    ) => void;
    onResizeHandleEnd?: (
        handle: ResizeHandle,
        point: { x: number; y: number },
    ) => void;
    onControlPointStart?: (
        shapeId: string,
        type: 'start' | 'end',
        point: { x: number; y: number },
    ) => void;
    onControlPointMove?: (
        shapeId: string,
        type: 'start' | 'end',
        point: { x: number; y: number },
    ) => void;
    onControlPointEnd?: (
        shapeId: string,
        type: 'start' | 'end',
        point: { x: number; y: number },
    ) => void;
    /** Callback when text entry is completed */
    onTextComplete?: (text: string, x: number, y: number) => void;
    /** Callback when clicking on empty canvas area (to deselect) */
    onEmptyCanvasClick?: () => void;
    /** Request to open text editing at a specific position with initial value */
    editTextRequest?: {
        x: number;
        y: number;
        initialValue: string;
        fontSize?: number;
        fontWeight?: string;
        fontStyle?: string;
        color?: string;
        fontFamily?: string;
    } | null;
    /** Callback when edit text request has been processed */
    onEditTextRequestHandled?: () => void;
    /** Current text bold state for real-time styling */
    textBold?: boolean;
    /** Current text italic state for real-time styling */
    textItalic?: boolean;
    /** Current text font size for real-time styling */
    textFontSize?: number;
    /** Callback when a straight line is created (converts stroke to shape) */
    onLineCreate?: (
        start: { x: number; y: number },
        end: { x: number; y: number },
        color: string,
        strokeWidth: number,
        isHighlighter: boolean,
    ) => void;
}

/**
 * Web canvas component for drawing with pressure sensitivity and gestures.
 */
export function Canvas({
    className,
    readOnly = false,
    onStrokeComplete,
    onViewChange,
    initialStrokes = [],
    initialView = { x: 0, y: 0, scale: 1 },
    view: inputView,
    showGrid = true,
    gridSize = CANVAS_CONSTANTS.DEFAULT_GRID_SIZE,
    backgroundColor = CANVAS_CONSTANTS.DEFAULT_BACKGROUND_COLOR,
    tool = 'pen',
    color = CANVAS_CONSTANTS.DEFAULT_COLORS[0],
    penSize = CANVAS_CONSTANTS.DEFAULT_SIZE,
    highlighterSize = CANVAS_CONSTANTS.DEFAULT_SIZE * 4,
    eraserSize = CANVAS_CONSTANTS.DEFAULT_SIZE * 5,
    eraserMode = 'stroke',
    canvasRef,
    onToolChange,
    onStrokesRemoved,
    selectionBox,
    unifiedSelectionBounds,
    lassoPath,
    selectedStrokeIds,
    onSelectionStart,
    onSelectionUpdate,
    onSelectionEnd,
    onSelectionDragStart,
    onSelectionDragUpdate,
    onSelectionDragEnd,
    shapes = [],
    currentShape,
    selectedShapeIds,
    onShapeClick,
    onShapeDoubleClick,
    onShapeStart,
    onShapeUpdate,
    onShapeEnd,
    onShapeDragStart,
    onShapeDragUpdate,
    onShapeDragEnd,
    onResizeHandleStart,
    onResizeHandleMove,
    onResizeHandleEnd,
    onControlPointStart,
    onControlPointMove,
    onControlPointEnd,
    onTextComplete,
    onEmptyCanvasClick,
    editTextRequest,
    onEditTextRequestHandled,
    textBold,
    textItalic,
    textFontSize,
    onLineCreate,
}: CanvasComponentProps) {
    const [textInputData, setTextInputData] = useState<{
        x: number;
        y: number;
        visible: boolean;
        initialValue?: string;
        fontSize?: number;
        fontWeight?: string;
        fontStyle?: string;
        color?: string;
        fontFamily?: string;
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElementRef = useRef<HTMLCanvasElement>(null);
    const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const stabilizerRef = useRef(new Stabilizer());
    const cursorRef = useRef<HTMLDivElement>(null);
    const cursorVisualRef = useRef<HTMLDivElement>(null);
    const cursorInnerRef = useRef<HTMLDivElement>(null);

    const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
    const [, setRedoStack] = useState<Stroke[]>([]);
    const [localView, setLocalView] = useState<ViewState>(initialView);

    // Sync state with prop updates (e.g. from resize operations)
    useEffect(() => {
        setStrokes(initialStrokes);
    }, [initialStrokes]);

    // Use controlled view if provided, otherwise local view
    const view = inputView ?? localView;

    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    const currentStrokeRef = useRef<Stroke | null>(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const lastPointTimeRef = useRef(0);
    const dprRef = useRef(1);
    // Track if object eraser has already erased during current gesture
    const objectEraserActiveRef = useRef(false);
    // Ref to store latest draw function for resize callback
    const drawRef = useRef<(() => void) | null>(null);
    // Ref to prevent immediate text creation after committing text
    const ignoreNextTextClickRef = useRef(false);

    // Handle programmatic text edit request
    useEffect(() => {
        if (editTextRequest) {
            setTextInputData({
                x: editTextRequest.x,
                y: editTextRequest.y,
                visible: true,
                initialValue: editTextRequest.initialValue,
                fontSize: editTextRequest.fontSize,
                fontWeight: editTextRequest.fontWeight,
                fontStyle: editTextRequest.fontStyle,
                color: editTextRequest.color,
                fontFamily: editTextRequest.fontFamily,
            });
            onEditTextRequestHandled?.();
        }
    }, [editTextRequest, onEditTextRequestHandled]);

    // Animated view transition helper (uses setView which we need to adapt)
    // For controlled mode, animateViewTo should call onViewChange
    const setView = useCallback(
        (newView: ViewState | ((prev: ViewState) => ViewState)) => {
            if (inputView) {
                if (typeof newView === 'function') {
                    onViewChange?.(newView(view));
                } else {
                    onViewChange?.(newView);
                }
            } else {
                setLocalView(newView);
                // If we have an onViewChange callback even in uncontrolled mode, call it
                if (typeof newView === 'function') {
                    onViewChange?.(newView(localView));
                } else {
                    onViewChange?.(newView);
                }
            }
        },
        [inputView, view, localView, onViewChange],
    );

    const { animateViewTo, animateViewToDamped } = useAnimatedView(
        view,
        setView,
        onViewChange,
    );

    // Setup gesture handling
    useGestures(canvasElementRef, {
        enabled: !readOnly,
        currentTool: tool,
        view,
        containerRef, // Attach wheel events to container so they work even with overlays
        onViewChange: (newView) => {
            setView(newView);
        },
        animateViewTo,
        animateViewToDamped,
        onPencilDoubleTap: () => {
            // Toggle between pen and eraser on Apple Pencil double-tap
            if (tool === 'eraser') {
                onToolChange?.('pen');
            } else {
                onToolChange?.('eraser');
            }
        },
        onTwoFingerDoubleTap: () => {
            // Reset view on two-finger double-tap with animation
            const defaultView = { x: 0, y: 0, scale: 1 };
            animateViewTo(defaultView);
        },
    });

    // Expose canvas methods via ref
    useCanvasHandle({
        canvasRef,
        canvasElementRef,
        strokes,
        setStrokes,
        setRedoStack,
        view,
        setView,
        onViewChange,
        animateViewTo,
    });

    // Initialize and resize canvas via hook
    useCanvasResize({
        containerRef,
        canvasElementRef,
        inkCanvasRef,
        dprRef,
        onResize: () => drawRef.current?.(),
    });

    // Debug logging for cursor tool
    useEffect(() => {
        logger.trace('Tool changed', {
            tool,
            containerZIndex: tool === 'cursor' ? 1 : 3,
            canvasPointerEvents: tool === 'cursor' ? 'none' : 'auto',
        });
    }, [tool]);

    // Update cursor appearance via hook
    useCanvasCursor(cursorVisualRef, cursorInnerRef, {
        tool,
        color,
        penSize,
        highlighterSize,
        eraserSize,
        scale: view.scale,
    });

    // Coordinate transformation helper
    const toWorld = useCallback(
        (x: number, y: number) => toWorldUtil({ x, y }, view),
        [view],
    );

    // Main draw function
    const draw = useCallback(() => {
        const canvas = canvasElementRef.current;
        const inkCanvas = inkCanvasRef.current;
        if (!canvas || !inkCanvas) return;

        const ctx = canvas.getContext('2d');
        const inkCtx = inkCanvas.getContext('2d');
        if (!ctx || !inkCtx) return;

        const dpr = dprRef.current;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        // Skip drawing if canvas hasn't been sized yet
        if (width <= 0 || height <= 0) {
            return;
        }

        // Draw background - use CSS pixel dimensions for scaled context
        ctx.globalCompositeOperation = 'source-over';
        if (backgroundColor === 'transparent') {
            // Clear to transparent
            ctx.clearRect(0, 0, width, height);
        } else {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }

        if (showGrid) {
            drawGrid(ctx, view, width, height, gridSize);
        }

        // Clear ink canvas - use CSS pixel dimensions for scaled context
        inkCtx.clearRect(0, 0, width, height);

        // Draw all strokes
        const strokesToDraw = [...strokes];
        if (currentStrokeRef.current) {
            strokesToDraw.push(currentStrokeRef.current);
        }

        strokesToDraw.forEach((stroke) => {
            if (!isStrokeVisible(stroke, view, width, height)) return;

            if (
                stroke.isHighlighter ||
                stroke.color === CANVAS_CONSTANTS.ERASE_FLAG
            ) {
                drawSimpleStroke(inkCtx, stroke, view);
            } else {
                drawFluentStroke(inkCtx, stroke, view);
            }
        });

        // Composite ink layer onto main canvas
        // Source: full ink canvas buffer, Destination: CSS pixel dimensions in scaled context
        ctx.drawImage(
            inkCanvas,
            0,
            0,
            inkCanvas.width,
            inkCanvas.height, // source rectangle (buffer pixels)
            0,
            0,
            width,
            height, // destination rectangle (CSS pixels in scaled context)
        );
    }, [strokes, backgroundColor, showGrid, gridSize, view]);

    // Keep drawRef updated with latest draw function
    drawRef.current = draw;

    // Redraw on state changes - useLayoutEffect to ensure sync with DOM updates (like PDF background)
    useLayoutEffect(() => {
        draw();
    }, [draw, view, strokes]);

    // Straight line detection - after holding still, convert stroke to a line shape
    const {
        trackMovement: trackStraightLine,
        onStrokeStart: onStraightLineStrokeStart,
        reset: resetStraightLine,
        isInStraightLineMode,
    } = useStraightLineDetection(currentStrokeRef, draw, {
        holdDuration: 500, // 0.5 seconds of stillness required
        stillnessThreshold: 3 / view.scale, // Must be nearly stationary (3 world units)
        minStrokeLength: 30 / view.scale, // Must draw at least 30 world units before detection activates
        enabled: (tool === 'pen' || tool === 'highlighter') && !!onLineCreate, // Only when line creation is supported
        onLineCreate,
    });

    // Set cursor based on tool
    const getCursor = useCallback(() => {
        if (isPanning) return 'grabbing';
        if (isSpacePressed) return 'grab';
        if (tool === 'cursor') return 'default';
        if (tool === 'eraser' || tool === 'pen' || tool === 'highlighter')
            return 'none';
        if (tool === 'text') return 'text';
        if (tool === 'lasso') return 'crosshair';
        return 'crosshair'; // shapes and other tools
    }, [isPanning, isSpacePressed, tool]);

    // Erase strokes at a given world position (object eraser mode)
    const eraseStrokesAtPoint = useCallback(
        (worldPos: { x: number; y: number }) => {
            // Divide by scale to get world-space eraser radius
            const baseSize = eraserSize / view.scale;
            const eraserRadius = baseSize / 2;

            const strokesToRemove: string[] = [];

            for (const stroke of strokes) {
                if (pointNearStroke(worldPos, stroke, eraserRadius)) {
                    strokesToRemove.push(stroke.id);
                }
            }

            if (strokesToRemove.length > 0) {
                setStrokes((prev) =>
                    prev.filter((s) => !strokesToRemove.includes(s.id)),
                );
                setRedoStack([]);
                onStrokesRemoved?.(strokesToRemove);
            }
        },
        [strokes, eraserSize, view.scale, pointNearStroke, onStrokesRemoved],
    );

    const startStroke = useCallback(
        (
            worldPos: { x: number; y: number },
            pressure: number,
            pointerType: string,
        ) => {
            if (readOnly) return;
            // Don't draw when cursor tool is active
            if (tool === 'cursor') return;

            const isEraser = tool === 'eraser';
            const isHighlighter = tool === 'highlighter';

            // For object eraser mode, erase strokes at point once per click
            if (isEraser && eraserMode === 'object') {
                setIsDrawing(true);
                objectEraserActiveRef.current = true;
                eraseStrokesAtPoint(worldPos);
                return;
            }

            setIsDrawing(true);
            lastPointTimeRef.current = Date.now();
            stabilizerRef.current.reset();
            onStraightLineStrokeStart();

            let initialPressure =
                pointerType === 'pen' ? (pressure > 0 ? pressure : 0.3) : 0.3;

            const stabilizedPos = stabilizerRef.current.update(
                worldPos.x,
                worldPos.y,
            );

            // Store size in world units
            // For eraser: convert viewport size to world size (since eraser has constant viewport size)
            // For pen/highlighter: use size directly (they have constant world size)
            const baseSize = isEraser
                ? eraserSize / view.scale // Convert viewport size to world size
                : isHighlighter
                  ? highlighterSize
                  : penSize;

            currentStrokeRef.current = {
                id: generateStrokeId(),
                color: isEraser ? CANVAS_CONSTANTS.ERASE_FLAG : color,
                size: baseSize,
                points: [
                    {
                        x: stabilizedPos.x,
                        y: stabilizedPos.y,
                        pressure: initialPressure,
                        timestamp: 0,
                    },
                ],
                isHighlighter,
                bounds: {
                    minX: stabilizedPos.x,
                    maxX: stabilizedPos.x,
                    minY: stabilizedPos.y,
                    maxY: stabilizedPos.y,
                },
            };
        },
        [
            readOnly,
            tool,
            color,
            penSize,
            highlighterSize,
            eraserSize,
            eraserMode,
            eraseStrokesAtPoint,
            onStraightLineStrokeStart,
        ],
    );

    // Add point to stroke
    const addPointToStroke = useCallback(
        (
            worldPos: { x: number; y: number },
            inputPressure: number,
            pointerType: string,
        ) => {
            // For object eraser mode, erase strokes at each point while dragging
            if (tool === 'eraser' && eraserMode === 'object') {
                eraseStrokesAtPoint(worldPos);
                return;
            }

            if (!currentStrokeRef.current) return;

            const stabilizedPos = stabilizerRef.current.update(
                worldPos.x,
                worldPos.y,
            );

            // Calculate pressure for this point
            const now = Date.now();
            const dt = now - lastPointTimeRef.current;
            const lastPt =
                currentStrokeRef.current.points[
                    currentStrokeRef.current.points.length - 1
                ];

            let pressure = inputPressure;
            if (pointerType === 'pen') {
                pressure = lastPt.pressure * 0.4 + inputPressure * 0.6;
            } else {
                const dist = Math.hypot(
                    stabilizedPos.x - lastPt.x,
                    stabilizedPos.y - lastPt.y,
                );
                const velocity = dist / (dt || 1);
                const targetPressure = Math.max(
                    0.3,
                    Math.min(1.0, 0.9 - velocity * 0.1),
                );
                pressure = lastPt.pressure * 0.6 + targetPressure * 0.4;
            }

            // Track for straight line detection - if we're in straight line mode, it handles the drawing
            const handledByStraightLine = trackStraightLine(
                stabilizedPos,
                pressure,
            );
            if (handledByStraightLine) {
                // In straight line mode - the hook updates the stroke directly, no need to add points
                return;
            }

            const dist = Math.hypot(
                stabilizedPos.x - lastPt.x,
                stabilizedPos.y - lastPt.y,
            );
            if (dist < 0.5 / view.scale) return;

            const stroke = currentStrokeRef.current;
            stroke.bounds.minX = Math.min(stroke.bounds.minX, stabilizedPos.x);
            stroke.bounds.maxX = Math.max(stroke.bounds.maxX, stabilizedPos.x);
            stroke.bounds.minY = Math.min(stroke.bounds.minY, stabilizedPos.y);
            stroke.bounds.maxY = Math.max(stroke.bounds.maxY, stabilizedPos.y);

            stroke.points.push({
                x: stabilizedPos.x,
                y: stabilizedPos.y,
                pressure,
                timestamp: now - lastPointTimeRef.current,
            });

            lastPointTimeRef.current = now;

            requestAnimationFrame(draw);
        },
        [
            draw,
            tool,
            eraserMode,
            eraseStrokesAtPoint,
            trackStraightLine,
            view.scale,
        ],
    );

    // End stroke
    const endStroke = useCallback(() => {
        // Check if we're in straight line mode - if so, create a shape instead of a stroke
        const wasInStraightLineMode = isInStraightLineMode();

        // Reset straight line detection - pass true to create the shape if in straight line mode
        resetStraightLine(wasInStraightLineMode);

        // Reset object eraser flag
        objectEraserActiveRef.current = false;

        // For object eraser, there's no stroke to end
        if (!currentStrokeRef.current) {
            setIsDrawing(false);
            return;
        }

        // If we were in straight line mode, discard the stroke (shape was already created)
        if (wasInStraightLineMode) {
            currentStrokeRef.current = null;
            setIsDrawing(false);
            return;
        }

        setIsDrawing(false);

        const stroke = currentStrokeRef.current;

        // For single-point strokes (clicks without movement), duplicate the point
        // so the stroke can be rendered properly
        if (stroke.points.length === 1) {
            const pt = stroke.points[0];
            stroke.points.push({
                x: pt.x,
                y: pt.y,
                pressure: pt.pressure,
                timestamp: 0,
            });
        }

        const padding = stroke.size * 2;
        stroke.bounds.minX -= padding;
        stroke.bounds.maxX += padding;
        stroke.bounds.minY -= padding;
        stroke.bounds.maxY += padding;

        if (stroke.points.length >= 1) {
            setStrokes((prev) => [...prev, stroke]);
            setRedoStack([]);
            onStrokeComplete?.(stroke);
        }

        currentStrokeRef.current = null;
        // Don't call draw here - the strokes state update will trigger a redraw via useLayoutEffect
    }, [onStrokeComplete, resetStraightLine, isInStraightLineMode]);

    // Pointer event handlers via hook
    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerLeave,
        handlePointerEnter,
    } = usePointerHandlers(
        {
            canvasElementRef,
            containerRef,
            cursorRef,
            cursorInnerRef,
            pointerRef,
        },
        { toWorld, startStroke, addPointToStroke, endStroke },
        { isPanning, isDrawing, isSpacePressed, tool },
        setIsPanning,
        setView,
    );

    // Track if we're in selection mode or drawing shape
    const isSelectingRef = useRef(false);
    const isDrawingShapeRef = useRef(false);

    // Wrapped pointer handlers that intercept lasso and shapes tool events
    const wrappedPointerDown = useCallback(
        (e: React.PointerEvent) => {
            // If the click is on a shape element (inside ShapeRenderer), let the shape handle it
            // This allows double-click to edit text shapes even when lasso/text tool is active
            const target = e.target as HTMLElement;
            // Check for our interactive marker OR if the target is inside a foreignObject (text shapes)
            if (
                target.closest('[data-shape-interactive]') ||
                target.closest('foreignObject')
            ) {
                return; // Let the shape's handlers process this event
            }

            // Check for pan (middle mouse or space) - delegate to main handler which supports panning
            if (e.button === 1 || isSpacePressed) {
                handlePointerDown(e);
                return;
            }

            // Handle lasso tool
            if (tool === 'lasso' && onSelectionStart) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                canvas.setPointerCapture(e.pointerId);
                const worldPos = toWorld(
                    e.clientX - canvas.getBoundingClientRect().left,
                    e.clientY - canvas.getBoundingClientRect().top,
                );
                onSelectionStart(worldPos);
                isSelectingRef.current = true;
                return;
            }
            // Handle shapes tool
            if (tool === 'shapes' && onShapeStart) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                canvas.setPointerCapture(e.pointerId);
                const worldPos = toWorld(
                    e.clientX - canvas.getBoundingClientRect().left,
                    e.clientY - canvas.getBoundingClientRect().top,
                );
                // Clear selection before drawing new shape
                onEmptyCanvasClick?.();
                onShapeStart(worldPos);
                isDrawingShapeRef.current = true;
                return;
            }
            // Handle text tool
            if (tool === 'text') {
                // If text input is already visible, clicking outside should just commit the text (via onBlur)
                // and not create a new text box immediately.
                if (textInputData && textInputData.visible) {
                    // Force blur to ensure onBlur fires and commits the text
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    return;
                }

                // If there's a selection, deselect first instead of creating a new text box
                const hasSelection =
                    (selectedShapeIds && selectedShapeIds.size > 0) ||
                    (selectedStrokeIds && selectedStrokeIds.size > 0);
                if (hasSelection) {
                    onEmptyCanvasClick?.();
                    return;
                }

                e.preventDefault();

                if (ignoreNextTextClickRef.current) {
                    return;
                }

                const canvas = canvasElementRef.current;
                if (!canvas) return;
                const worldPos = toWorld(
                    e.clientX - canvas.getBoundingClientRect().left,
                    e.clientY - canvas.getBoundingClientRect().top,
                );
                setTextInputData({
                    x: worldPos.x,
                    y: worldPos.y,
                    visible: true,
                });
                return;
            }

            // For pen/highlighter/eraser: clear any selection before drawing
            if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
                const hasSelection =
                    (selectedShapeIds && selectedShapeIds.size > 0) ||
                    (selectedStrokeIds && selectedStrokeIds.size > 0);
                if (hasSelection) {
                    onEmptyCanvasClick?.();
                }
            }

            handlePointerDown(e);
        },
        [
            tool,
            onSelectionStart,
            onShapeStart,
            handlePointerDown,
            toWorld,
            onEmptyCanvasClick,
            isSpacePressed,
            textInputData,
            selectedShapeIds,
            selectedStrokeIds,
        ],
    );

    const wrappedPointerMove = useCallback(
        (e: React.PointerEvent) => {
            // Handle lasso tool
            if (
                tool === 'lasso' &&
                isSelectingRef.current &&
                onSelectionUpdate
            ) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                const worldPos = toWorld(
                    e.clientX - canvas.getBoundingClientRect().left,
                    e.clientY - canvas.getBoundingClientRect().top,
                );
                onSelectionUpdate(worldPos);
                return;
            }
            // Handle shapes tool
            if (
                tool === 'shapes' &&
                isDrawingShapeRef.current &&
                onShapeUpdate
            ) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                const worldPos = toWorld(
                    e.clientX - canvas.getBoundingClientRect().left,
                    e.clientY - canvas.getBoundingClientRect().top,
                );
                onShapeUpdate(worldPos);
                return;
            }
            handlePointerMove(e);
        },
        [tool, onSelectionUpdate, onShapeUpdate, handlePointerMove, toWorld],
    );

    const wrappedPointerUp = useCallback(
        (e: React.PointerEvent) => {
            // Handle lasso tool
            if (tool === 'lasso' && isSelectingRef.current && onSelectionEnd) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                canvas.releasePointerCapture(e.pointerId);
                onSelectionEnd();
                isSelectingRef.current = false;
                return;
            }
            // Handle shapes tool
            if (tool === 'shapes' && isDrawingShapeRef.current && onShapeEnd) {
                const canvas = canvasElementRef.current;
                if (!canvas) return;
                canvas.releasePointerCapture(e.pointerId);
                onShapeEnd();
                isDrawingShapeRef.current = false;
                return;
            }
            handlePointerUp(e);
        },
        [tool, onSelectionEnd, onShapeEnd, handlePointerUp],
    );

    // Keyboard handlers via hook
    useKeyboardShortcuts({
        isSpacePressed,
        isDrawing,
        setIsSpacePressed,
        setIsPanning,
        setStrokes,
        setRedoStack,
    });

    const isTransparent = backgroundColor === 'transparent';

    return (
        <div
            ref={containerRef}
            className={`canvas-container ${isTransparent ? 'transparent' : ''} ${className ?? ''}`}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                backgroundColor: isTransparent ? 'transparent' : undefined,
                // Lower z-index when cursor tool is active so text layer receives events
                zIndex: tool === 'cursor' ? 1 : 3,
                // Set cursor for tools where canvas has pointerEvents: none
                cursor: getCursor(),
            }}
            // Attach handlers to container for cursor/text/lasso tools (since canvas has pointer-events: none for these)
            onPointerDown={
                tool === 'cursor' || tool === 'text' || tool === 'lasso'
                    ? wrappedPointerDown
                    : undefined
            }
            onPointerMove={
                tool === 'cursor' || tool === 'text' || tool === 'lasso'
                    ? wrappedPointerMove
                    : undefined
            }
            onPointerUp={
                tool === 'cursor' || tool === 'text' || tool === 'lasso'
                    ? wrappedPointerUp
                    : undefined
            }
            onPointerLeave={tool === 'cursor' ? handlePointerLeave : undefined}
            onPointerEnter={tool === 'cursor' ? handlePointerEnter : undefined}
        >
            <div
                ref={cursorRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    display: 'none',
                    zIndex: 50,
                }}
            >
                <div
                    ref={cursorVisualRef}
                    style={{
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        position: 'relative',
                    }}
                >
                    <div
                        ref={cursorInnerRef}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            transition:
                                'transform 0.1s ease-in-out, background-color 0.1s ease-in-out',
                        }}
                    />
                </div>
            </div>
            <canvas
                ref={canvasElementRef}
                className={`drawing-canvas ${isTransparent ? 'transparent' : ''}`}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'block',
                    touchAction: 'none',
                    cursor: getCursor(),
                    backgroundColor: isTransparent ? 'transparent' : undefined,
                    // Disable pointer events for cursor/text/lasso tools so shape layer receives clicks
                    // These tools handle events via containerRef instead
                    pointerEvents:
                        tool === 'cursor' || tool === 'text' || tool === 'lasso'
                            ? 'none'
                            : 'auto',
                }}
                onPointerDown={wrappedPointerDown}
                onPointerMove={wrappedPointerMove}
                onPointerUp={wrappedPointerUp}
                onPointerLeave={handlePointerLeave}
                onPointerEnter={handlePointerEnter}
            />

            {/* Shapes layer */}
            <ShapeRenderer
                shapes={shapes}
                currentShape={currentShape}
                view={view}
                selectedShapeIds={selectedShapeIds}
                onShapeClick={onShapeClick}
                onShapeDoubleClick={onShapeDoubleClick}
                showSelectionBox={!unifiedSelectionBounds}
            />

            {/* Selection box overlay */}
            {(selectionBox || (lassoPath && lassoPath.length > 0)) && (
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        overflow: 'visible',
                    }}
                >
                    {selectionBox && (
                        <rect
                            x={
                                Math.min(selectionBox.x1, selectionBox.x2) *
                                    view.scale +
                                view.x
                            }
                            y={
                                Math.min(selectionBox.y1, selectionBox.y2) *
                                    view.scale +
                                view.y
                            }
                            width={
                                Math.abs(selectionBox.x2 - selectionBox.x1) *
                                view.scale
                            }
                            height={
                                Math.abs(selectionBox.y2 - selectionBox.y1) *
                                view.scale
                            }
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                        />
                    )}
                    {lassoPath && lassoPath.length > 0 && (
                        <polygon
                            points={lassoPath
                                .map(
                                    (p) =>
                                        `${p.x * view.scale + view.x},${p.y * view.scale + view.y}`,
                                )
                                .join(' ')}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                        />
                    )}
                </svg>
            )}

            {/* Unified selection box - replaces separate boxes if present */}
            {unifiedSelectionBounds &&
                (() => {
                    const padding = 8;
                    const screenX =
                        unifiedSelectionBounds.minX * view.scale +
                        view.x -
                        padding;
                    const screenY =
                        unifiedSelectionBounds.minY * view.scale +
                        view.y -
                        padding;
                    const screenWidth =
                        (unifiedSelectionBounds.maxX -
                            unifiedSelectionBounds.minX) *
                            view.scale +
                        padding * 2;
                    const screenHeight =
                        (unifiedSelectionBounds.maxY -
                            unifiedSelectionBounds.minY) *
                            view.scale +
                        padding * 2;

                    const singleShape = (() => {
                        if (selectedStrokeIds && selectedStrokeIds.size > 0)
                            return null;
                        if (!selectedShapeIds || selectedShapeIds.size !== 1)
                            return null;
                        const id = Array.from(selectedShapeIds)[0];
                        return shapes.find((sh) => sh.id === id) || null;
                    })();

                    const isSingleLinearShape =
                        singleShape?.kind === 'line' ||
                        singleShape?.kind === 'arrow';
                    const isSingleTextShape = singleShape?.kind === 'text';

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: screenX,
                                top: screenY,
                                width: screenWidth,
                                height: screenHeight,
                                border: isSingleLinearShape
                                    ? 'none'
                                    : '2px solid #3b82f6',
                                borderRadius: 6,
                                backgroundColor: isSingleLinearShape
                                    ? 'transparent'
                                    : 'rgba(59, 130, 246, 0.05)',
                                cursor: 'grab',
                                pointerEvents: 'auto',
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                if (onSelectionDragStart) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onSelectionDragStart(worldPos);
                                }
                            }}
                            onPointerMove={(e) => {
                                if (onSelectionDragUpdate && e.buttons > 0) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onSelectionDragUpdate(worldPos);
                                }
                            }}
                            onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(
                                    e.pointerId,
                                );
                                if (onSelectionDragEnd) {
                                    onSelectionDragEnd();
                                }
                            }}
                            onDoubleClick={(e) => {
                                // Forward double-click to shape for text editing
                                if (singleShape && onShapeDoubleClick) {
                                    e.stopPropagation();
                                    onShapeDoubleClick(singleShape.id, e);
                                }
                            }}
                        >
                            {onResizeHandleStart && !isSingleLinearShape && (
                                <ResizeHandles
                                    allowedHandles={
                                        isSingleTextShape
                                            ? ['w', 'e']
                                            : undefined
                                    }
                                    onResizeStart={(handle, e) => {
                                        const worldPos = toWorld(
                                            e.clientX -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .left ?? 0),
                                            e.clientY -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .top ?? 0),
                                        );
                                        if (onResizeHandleStart)
                                            onResizeHandleStart(
                                                handle,
                                                worldPos,
                                            );
                                    }}
                                    onResizeMove={(handle, e) => {
                                        const worldPos = toWorld(
                                            e.clientX -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .left ?? 0),
                                            e.clientY -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .top ?? 0),
                                        );
                                        if (onResizeHandleMove)
                                            onResizeHandleMove(
                                                handle,
                                                worldPos,
                                            );
                                    }}
                                    onResizeEnd={(handle, e) => {
                                        const worldPos = toWorld(
                                            e.clientX -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .left ?? 0),
                                            e.clientY -
                                                (containerRef.current?.getBoundingClientRect()
                                                    .top ?? 0),
                                        );
                                        if (onResizeHandleEnd)
                                            onResizeHandleEnd(handle, worldPos);
                                    }}
                                />
                            )}
                        </div>
                    );
                })()}

            {/* Shape Control Handles - Rendered outside selection box for higher Z-index */}
            {selectedShapeIds &&
                selectedShapeIds.size === 1 &&
                (!selectedStrokeIds || selectedStrokeIds.size === 0) &&
                (() => {
                    const shapeId = Array.from(selectedShapeIds)[0];
                    const shape = shapes.find((s) => s.id === shapeId);
                    if (!shape) return null;

                    return (
                        <ShapeControlHandles
                            shape={shape}
                            view={view}
                            onControlPointStart={(id, type, e) => {
                                const worldPos = toWorld(
                                    e.clientX -
                                        (containerRef.current?.getBoundingClientRect()
                                            .left ?? 0),
                                    e.clientY -
                                        (containerRef.current?.getBoundingClientRect()
                                            .top ?? 0),
                                );
                                if (onControlPointStart)
                                    onControlPointStart(id, type, worldPos);
                            }}
                            onControlPointMove={(id, type, e) => {
                                const worldPos = toWorld(
                                    e.clientX -
                                        (containerRef.current?.getBoundingClientRect()
                                            .left ?? 0),
                                    e.clientY -
                                        (containerRef.current?.getBoundingClientRect()
                                            .top ?? 0),
                                );
                                if (onControlPointMove)
                                    onControlPointMove(id, type, worldPos);
                            }}
                            onControlPointEnd={(id, type, e) => {
                                const worldPos = toWorld(
                                    e.clientX -
                                        (containerRef.current?.getBoundingClientRect()
                                            .left ?? 0),
                                    e.clientY -
                                        (containerRef.current?.getBoundingClientRect()
                                            .top ?? 0),
                                );
                                if (onControlPointEnd)
                                    onControlPointEnd(id, type, worldPos);
                            }}
                        />
                    );
                })()}

            {/* Selected strokes combined bounding box - interactive for dragging */}
            {!unifiedSelectionBounds &&
                selectedStrokeIds &&
                selectedStrokeIds.size > 0 &&
                (() => {
                    // Calculate combined bounding box of all selected strokes
                    const selectedStrokes = strokes.filter((s) =>
                        selectedStrokeIds.has(s.id),
                    );
                    if (selectedStrokes.length === 0) return null;

                    let minX = Infinity,
                        minY = Infinity,
                        maxX = -Infinity,
                        maxY = -Infinity;
                    for (const stroke of selectedStrokes) {
                        minX = Math.min(minX, stroke.bounds.minX);
                        minY = Math.min(minY, stroke.bounds.minY);
                        maxX = Math.max(maxX, stroke.bounds.maxX);
                        maxY = Math.max(maxY, stroke.bounds.maxY);
                    }

                    const padding = 8;
                    const screenX = minX * view.scale + view.x - padding;
                    const screenY = minY * view.scale + view.y - padding;
                    const screenWidth =
                        (maxX - minX) * view.scale + padding * 2;
                    const screenHeight =
                        (maxY - minY) * view.scale + padding * 2;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: screenX,
                                top: screenY,
                                width: screenWidth,
                                height: screenHeight,
                                border: '2px solid #3b82f6',
                                borderRadius: 6,
                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                cursor: 'grab',
                                pointerEvents: 'auto',
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                if (onSelectionDragStart) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onSelectionDragStart(worldPos);
                                }
                            }}
                            onPointerMove={(e) => {
                                if (onSelectionDragUpdate && e.buttons > 0) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onSelectionDragUpdate(worldPos);
                                }
                            }}
                            onPointerUp={() => {
                                if (onSelectionDragEnd) {
                                    onSelectionDragEnd();
                                }
                            }}
                        />
                    );
                })()}

            {/* Selected shapes combined bounding box - interactive for dragging */}
            {!unifiedSelectionBounds &&
                selectedShapeIds &&
                selectedShapeIds.size > 0 &&
                (() => {
                    // Calculate combined bounding box of all selected shapes
                    const selectedShapesList = shapes.filter((s) =>
                        selectedShapeIds.has(s.id),
                    );
                    if (selectedShapesList.length === 0) return null;

                    let minX = Infinity,
                        minY = Infinity,
                        maxX = -Infinity,
                        maxY = -Infinity;
                    for (const shape of selectedShapesList) {
                        const sMinX = Math.min(shape.x1, shape.x2);
                        const sMaxX = Math.max(shape.x1, shape.x2);
                        const sMinY = Math.min(shape.y1, shape.y2);
                        const sMaxY = Math.max(shape.y1, shape.y2);

                        minX = Math.min(minX, sMinX);
                        minY = Math.min(minY, sMinY);
                        maxX = Math.max(maxX, sMaxX);
                        maxY = Math.max(maxY, sMaxY);
                    }

                    const padding = 8;
                    const screenX = minX * view.scale + view.x - padding;
                    const screenY = minY * view.scale + view.y - padding;
                    const screenWidth =
                        (maxX - minX) * view.scale + padding * 2;
                    const screenHeight =
                        (maxY - minY) * view.scale + padding * 2;

                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: screenX,
                                top: screenY,
                                width: screenWidth,
                                height: screenHeight,
                                border: '2px solid #3b82f6',
                                borderRadius: 6,
                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                cursor: 'grab',
                                pointerEvents: 'auto',
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                if (onShapeDragStart) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onShapeDragStart(worldPos);
                                }
                            }}
                            onPointerMove={(e) => {
                                if (onShapeDragUpdate && e.buttons > 0) {
                                    const worldPos = toWorld(
                                        e.clientX -
                                            (containerRef.current?.getBoundingClientRect()
                                                .left ?? 0),
                                        e.clientY -
                                            (containerRef.current?.getBoundingClientRect()
                                                .top ?? 0),
                                    );
                                    onShapeDragUpdate(worldPos);
                                }
                            }}
                            onPointerUp={() => {
                                if (onShapeDragEnd) {
                                    onShapeDragEnd();
                                }
                            }}
                        />
                    );
                })()}

            {/* Text Input Overlay */}
            {textInputData && textInputData.visible && (
                <div
                    style={{
                        position: 'absolute',
                        left: textInputData.x * view.scale + view.x,
                        top: textInputData.y * view.scale + view.y,
                        zIndex: 100,
                    }}
                >
                    <textarea
                        autoFocus
                        rows={1}
                        placeholder="Type..."
                        defaultValue={textInputData.initialValue || ''}
                        style={{
                            background: 'transparent',
                            border: '2px solid #3b82f6',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            fontSize: `${(textFontSize ?? textInputData.fontSize ?? penSize ?? 16) * view.scale}px`,
                            fontWeight:
                                textBold !== undefined
                                    ? textBold
                                        ? 'bold'
                                        : 'normal'
                                    : textInputData.fontWeight || 'normal',
                            fontStyle:
                                textItalic !== undefined
                                    ? textItalic
                                        ? 'italic'
                                        : 'normal'
                                    : textInputData.fontStyle || 'normal',
                            // Prioritize current tool color over initial shape color to allow real-time modifications
                            color: color || textInputData.color,
                            minWidth: '10px',
                            width: 'auto',
                            outline: 'none',
                            resize: 'none',
                            fontFamily:
                                textInputData.fontFamily || 'sans-serif',
                            overflow: 'hidden',
                            lineHeight: '1.2',
                            boxSizing: 'content-box',
                            display: 'block',
                        }}
                        onInput={(e) => {
                            // Auto-resize textarea to fit content
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                            target.style.width = 'auto';
                            target.style.width =
                                Math.max(20, target.scrollWidth) + 'px';
                        }}
                        onBlur={(e) => {
                            // Check if focus is moving to a toolbar element (like a select dropdown)
                            const relatedTarget =
                                e.relatedTarget as HTMLElement | null;
                            if (relatedTarget) {
                                // If focus is going to a toolbar element, don't close - refocus textarea
                                const isToolbarElement =
                                    relatedTarget.closest(
                                        '.floating-toolbar',
                                    ) ||
                                    relatedTarget.closest('.canvas-toolbar') ||
                                    relatedTarget.closest('.top-controls') ||
                                    relatedTarget.tagName === 'SELECT' ||
                                    relatedTarget.tagName === 'BUTTON';
                                if (isToolbarElement) {
                                    // For SELECT elements, don't refocus - let user interact with dropdown
                                    // For buttons, refocus immediately so typing can continue
                                    if (relatedTarget.tagName !== 'SELECT') {
                                        setTimeout(() => {
                                            e.target.focus();
                                        }, 0);
                                    }
                                    return;
                                }
                            }
                            if (e.target.value.trim() && onTextComplete) {
                                onTextComplete(
                                    e.target.value,
                                    textInputData.x,
                                    textInputData.y,
                                );
                            }
                            setTextInputData(null);
                            // Prevent immediate new text box creation
                            ignoreNextTextClickRef.current = true;
                            setTimeout(() => {
                                ignoreNextTextClickRef.current = false;
                            }, 200);
                        }}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                            }
                            if (e.key === 'Escape') {
                                // Revert? Or submit? Usually Escape cancels usage or submits.
                                // For now let's submit to avoid losing data
                                e.currentTarget.blur();
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
