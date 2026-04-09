import { ToolSettings, ViewState } from "./types";

/**
 * A point in a stroke with pressure and tilt data for stylus support.
 * Coordinates are in canvas/world space (not screen space).
 */
export interface Point {
  x: number;
  y: number;
  /** Pressure from 0 to 1 (0 = no pressure, 1 = max pressure). Default: 0.5 */
  pressure: number;
  /** Tilt angle in radians (for Apple Pencil). Optional. */
  tiltX?: number;
  tiltY?: number;
  /** Timestamp in milliseconds since stroke start. Used for replay/velocity calculations. */
  timestamp?: number;
}

/**
 * A single stroke drawn on the canvas.
 */
export interface Stroke {
  /** Unique identifier for the stroke */
  id: string;
  /** Array of points that make up the stroke */
  points: Point[];
  /** Stroke color in hex format (e.g., '#1a1a1a'). For eraser, use special flag. */
  color: string;
  /** Base stroke size in pixels */
  size: number;
  /** Whether this is a highlighter stroke (affects rendering) */
  isHighlighter: boolean;
  /** Bounding box for culling optimization */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Shape types for vector shapes.
 */
export type ShapeKind = "rectangle" | "ellipse" | "line" | "arrow" | "text" | "triangle";

/**
 * A vector shape on the canvas (selectable and movable).
 */
export interface Shape {
  /** Unique identifier for the shape */
  id: string;
  /** Type of shape */
  kind: ShapeKind;
  /** Start point (top-left for rect/ellipse, start for line/arrow) */
  x1: number;
  y1: number;
  /** End point (bottom-right for rect/ellipse, end for line/arrow) */
  x2: number;
  y2: number;
  /** Stroke color */
  strokeColor: string;
  /** Fill color (optional, for rect/ellipse) */
  fillColor?: string;
  /** Stroke width */
  strokeWidth: number;
  /** Rotation angle in radians */
  rotation?: number;
  /** Text content for text shapes */
  text?: string;
  /** Font size for text shapes */
  fontSize?: number;
  /** Font family for text shapes */
  fontFamily?: string;
  /** Font weight for text shapes (e.g., "bold") */
  fontWeight?: string;
  /** Font style for text shapes (e.g., "italic") */
  fontStyle?: string;
  /** Text alignment for text shapes */
  textAlign?: "left" | "center" | "right";
  /** Whether this is a highlighter shape (semi-transparent) */
  isHighlighter?: boolean;
}

// ============================================================================
// EMBED UTILITIES
// ============================================================================

/**
 * Supported embed types for canvas content.
 */
export type EmbedType = "pdf" | "image" | "video" | "audio" | "web" | "drawing";

/**
 * Base embed interface for content embedded on the canvas.
 * Embeds reference files in the vault's files/ directory by ID only.
 */
export interface Embed {
  /** Unique identifier - corresponds to file in files/{id}.{ext} */
  id: string;
  /** Type determines file extension and rendering behavior */
  type: EmbedType;
  /** X position in canvas/world coordinates */
  x: number;
  /** Y position in canvas/world coordinates */
  y: number;
  /** Whether the embed is locked (cannot be moved/resized) */
  locked?: boolean;
}

export interface PDFEmbedPage {
  /** page id */
  id: string;
  /** page width */
  width: number;
  /** page height */
  height: number;
  /** page rotation in degrees */
  rotation: number;
}

export interface PDFEmbed extends Embed {
  pageCount: number;
  pages: Array<PDFEmbedPage>;
  /** Scale factor (1 = original size, 0.5 = half size, etc.) */
  scale: number;
  /** Optional rotation in radians */
  rotation?: number;
}

/**
 * Supported image extensions for image embeds.
 */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export interface ImageEmbed extends Embed {
  /** image width */
  width: number;
  /** image height */
  height: number;
  /** Scale factor (1 = original size, 0.5 = half size, etc.) */
  scale: number;
  /** Optional rotation in radians */
  rotation?: number;
}

// ============================================================================
// DRAWING DATA
// ============================================================================

/**
 * Background style for the canvas.
 */
export type BackgroundType = "blank" | "grid" | "dots" | "lines";

/**
 * The complete drawing data structure stored in .ink files.
 * Version field allows for future format migrations.
 */
export interface DrawingData<StrokeType = unknown, ShapeType = unknown> {
  /** Array of strokes in draw order */
  strokes: StrokeType[];
  /** Array of vector shapes */
  shapes?: ShapeType[];
  /** Embedded content (PDFs, images, etc.) on the canvas */
  embeds?: Embed[];
  /** Current view state (pan/zoom) */
  view: ViewState;
  /** Last used tool settings */
  settings: ToolSettings;
  /** Canvas dimensions (for aspect ratio preservation) */
  canvasWidth: number;
  canvasHeight: number;
  /** Background style for the canvas */
  background: BackgroundType;
  /** Timestamp of last modification */
  updatedAt: string;
}

export interface Drawing<StrokeType = unknown, ShapeType = unknown> {
  id: string;
  name: string;
  parent: string;
  type: "file";
  fileExtension: "ink";
  data: DrawingData<StrokeType, ShapeType>;
}

export type CanvasDrawingData = DrawingData<Stroke, Shape>;
export type CanvasDrawing = Drawing<Stroke, Shape>;

/**
 * Default empty drawing data.
 */
export function createEmptyDrawingData<StrokeType = Stroke, ShapeType = Shape>(): DrawingData<StrokeType, ShapeType> {
  return {
    strokes: [],
    embeds: [],
    view: { x: 0, y: 0, scale: 1 },
    settings: {
      color: "#1a1a1a",
      tool: "pen",
      penSize: 6,
      highlighterSize: 12,
      eraserSize: 12,
      eraserMode: "stroke"
    },
    canvasWidth: 1920,
    canvasHeight: 1080,
    background: "grid",
    updatedAt: new Date().toISOString(),
  } as DrawingData<StrokeType, ShapeType>;
}
