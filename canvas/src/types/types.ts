// Local definitions replacing @aryazos/types
export type ToolType =
    | 'pen'
    | 'eraser'
    | 'highlighter'
    | 'cursor'
    | 'text'
    | 'lasso'
    | 'shapes';

export type LassoMode = 'rectangle' | 'freeform';

export interface ViewState {
    x: number;
    y: number;
    scale: number;
}

export interface ToolSettings {
    tool: ToolType;
    color: string;
    penSize: number;
    highlighterSize: number;
    eraserSize: number;
    eraserMode: EraserMode;
}

import type { CanvasDrawing, CanvasDrawingData, Stroke } from './drawingTypes';

/** Eraser mode: stroke (pixel) or object (whole stroke) */
export type EraserMode = 'stroke' | 'object';

/** Size slot type: small, medium, large */
export type SizeSlot = 'small' | 'medium' | 'large';

/** Tool sizes configuration for all tools and slots */
export interface ToolSizes {
    cursor: { small: number; medium: number; large: number };
    pen: { small: number; medium: number; large: number };
    highlighter: { small: number; medium: number; large: number };
    eraser: { small: number; medium: number; large: number };
    lasso: { small: number; medium: number; large: number };
    shapes: { small: number; medium: number; large: number };
    text: { small: number; medium: number; large: number };
}

/** Active slot per tool */
export interface ActiveSlots {
    cursor: SizeSlot;
    pen: SizeSlot;
    highlighter: SizeSlot;
    eraser: SizeSlot;
    lasso: SizeSlot;
    shapes: SizeSlot;
    text: SizeSlot;
}

/**
 * Canvas store API interface for platform-agnostic state management.
 * Desktop will use Electron IPC, mobile will use local storage or file system.
 */
export interface CanvasStoreApi {
    drawingId: string | null;
    drawingMeta: CanvasDrawing | null;
    data: CanvasDrawingData | null;
    isLoading: boolean;
    isDirty: boolean;
    error: string | null;

    // Data operations
    loadDrawing: (id: string) => Promise<void>;
    saveDrawing: () => Promise<void>;

    // Stroke operations
    addStroke: (stroke: Stroke) => void;
    removeStroke: (strokeId: string) => void;
    clearStrokes: () => void;

    // Undo/Redo
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;

    // View operations
    setView: (view: ViewState) => void;
    resetView: () => void;

    // Tool settings
    setTool: (tool: ToolType) => void;
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    settings: ToolSettings;

    // Meta operations
    renameDrawing: (newName: string) => void;
}

/**
 * Extended store interface with subscription for React reactivity.
 */
export interface CanvasStoreWithSubscription extends CanvasStoreApi {
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => CanvasStoreApi;
}

/**
 * Props for the Canvas component.
 */
export interface CanvasProps {
    /** CSS class name for styling */
    className?: string;
    /** Whether the canvas is read-only (no drawing allowed) */
    readOnly?: boolean;
    /** Gesture mode (mobile): full gestures or stylus-only drawing */
    gestureMode?: 'full' | 'stylus-only';
    /** Callback when a stroke is completed */
    onStrokeComplete?: (stroke: Stroke) => void;
    /** Callback when view changes (pan/zoom) */
    onViewChange?: (view: ViewState) => void;
    /** Initial strokes to render (for annotation overlay) */
    initialStrokes?: Stroke[];
    /** Initial view state */
    initialView?: ViewState;
    /** Controlled view state */
    view?: ViewState;
    /** Whether to show the grid */
    showGrid?: boolean;
    /** Grid size in pixels */
    gridSize?: number;
    /** Background color */
    backgroundColor?: string;
}

/**
 * Props for the CanvasToolbar component.
 */
export interface CanvasToolbarProps {
    /** CSS class name for styling */
    className?: string;
    /** Whether to show zoom controls */
    showZoomControls?: boolean;
    /** Whether to show undo/redo buttons */
    showUndoRedo?: boolean;
    /** Whether to show color picker */
    showColorPicker?: boolean;
    /** Whether to show size slider */
    showSizeSlider?: boolean;
    /** Available colors in the color picker */
    colors?: string[];
}

/**
 * Gesture event data for Apple Pencil and touch interactions.
 */
export interface GestureEvent {
    type: 'pencilDoubleTap' | 'twoFingerDoubleTap' | 'pinch' | 'pan';
    /** For pinch: scale factor */
    scale?: number;
    /** For pan: delta x/y */
    deltaX?: number;
    deltaY?: number;
    /** For pencil: current tool that was active */
    previousTool?: ToolType;
}

/**
 * Pointer event data with pressure and tilt.
 */
export interface PointerData {
    x: number;
    y: number;
    pressure: number;
    tiltX?: number;
    tiltY?: number;
    pointerType: 'pen' | 'touch' | 'mouse';
    isPrimary: boolean;
}

/**
 * Constants for canvas rendering.
 */
export const CANVAS_CONSTANTS = {
    ERASE_FLAG: 'ERASER',
    DEFAULT_GRID_SIZE: 40,
    DEFAULT_GRID_COLOR: '#e5e7eb',
    DEFAULT_BACKGROUND_COLOR: '#fcfcfc',
    HIGHLIGHTER_OPACITY: 0.5,
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 10,
    /** Soft max zoom where resistance starts (300%) */
    SOFT_MAX_ZOOM: 3,
    DEFAULT_COLORS: ['#1a1a1a', '#ef4444', '#3b82f6', '#10b981'],
    DEFAULT_SIZE: 4,
    MIN_SIZE: 1,
    MAX_SIZE: 100,
    /** Snap increments for size slider (exponential feel) */
    SIZE_STEPS: [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 50, 64, 80, 100],
} as const;
