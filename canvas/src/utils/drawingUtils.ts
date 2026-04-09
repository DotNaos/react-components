import type { Stroke } from "../types/drawingTypes";
import { CANVAS_CONSTANTS, ViewState } from "../types/types";

type Point = { x: number; y: number };

/** Convert world coordinates to screen coordinates */
export function toScreen(point: Point, view: ViewState): Point {
    return {
        x: point.x * view.scale + view.x,
        y: point.y * view.scale + view.y,
    };
}

/** Convert screen coordinates to world coordinates */
export function toWorld(point: Point, view: ViewState): Point {
    return {
        x: (point.x - view.x) / view.scale,
        y: (point.y - view.y) / view.scale,
    };
}

/** Calculate pressure-based size */
export function getPressureSize(
    baseSize: number,
    pressure: number,
    strokeColor: string
): number {
    if (strokeColor === CANVAS_CONSTANTS.ERASE_FLAG) return baseSize;
    return baseSize * (0.3 + 0.7 * Math.pow(pressure, 1.5));
}

/** Check if stroke is visible in current view */
export function isStrokeVisible(
    stroke: Stroke,
    view: ViewState,
    width: number,
    height: number
): boolean {
    if (!stroke.bounds) return true;
    const viewLeft = -view.x / view.scale;
    const viewTop = -view.y / view.scale;
    const viewRight = (width - view.x) / view.scale;
    const viewBottom = (height - view.y) / view.scale;

    return !(
        stroke.bounds.maxX < viewLeft ||
        stroke.bounds.minX > viewRight ||
        stroke.bounds.maxY < viewTop ||
        stroke.bounds.minY > viewBottom
    );
}

/** Draw the grid pattern */
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    view: ViewState,
    width: number,
    height: number,
    gridSize: number
): void {
    const scaledGridSize = gridSize * view.scale;
    const offsetX = view.x % scaledGridSize;
    const offsetY = view.y % scaledGridSize;

    ctx.beginPath();
    ctx.strokeStyle = CANVAS_CONSTANTS.DEFAULT_GRID_COLOR;
    ctx.lineWidth = 1;

    for (let x = offsetX; x < width; x += scaledGridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += scaledGridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
}

/** Draw fluent stroke (pen) with tangent hull rendering */
export function drawFluentStroke(
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    view: ViewState
): void {
    if (stroke.points.length < 1) return;

    ctx.fillStyle = stroke.color;
    // Multiply by scale to convert from world to screen coordinates
    const baseSize = stroke.size * view.scale;

    const startPt = stroke.points[0];
    const startScreen = toScreen(startPt, view);
    const startR =
        getPressureSize(baseSize, startPt.pressure, stroke.color) / 2;

    ctx.beginPath();
    ctx.arc(startScreen.x, startScreen.y, startR, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];

        const c1 = toScreen(p1, view);
        const c2 = toScreen(p2, view);

        const r1 = getPressureSize(baseSize, p1.pressure, stroke.color) / 2;
        const r2 = getPressureSize(baseSize, p2.pressure, stroke.color) / 2;

        const d = Math.hypot(c2.x - c1.x, c2.y - c1.y);

        if (d < Math.abs(r1 - r2) + 0.5) {
            ctx.beginPath();
            ctx.arc(c2.x, c2.y, r2, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }

        const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x);
        const radiusDiff = r1 - r2;
        const ratio = Math.max(-1, Math.min(1, radiusDiff / d));
        const offsetAngle = Math.acos(ratio);

        const angle1 = angle + offsetAngle;
        const angle2 = angle - offsetAngle;

        const p1a = {
            x: c1.x + r1 * Math.cos(angle1),
            y: c1.y + r1 * Math.sin(angle1),
        };
        const p1b = {
            x: c1.x + r1 * Math.cos(angle2),
            y: c1.y + r1 * Math.sin(angle2),
        };
        const p2a = {
            x: c2.x + r2 * Math.cos(angle1),
            y: c2.y + r2 * Math.sin(angle1),
        };

        ctx.beginPath();
        ctx.moveTo(p1a.x, p1a.y);
        ctx.lineTo(p2a.x, p2a.y);
        ctx.arc(c2.x, c2.y, r2, angle1, angle2, true);
        ctx.lineTo(p1b.x, p1b.y);
        ctx.arc(c1.x, c1.y, r1, angle2, angle1, true);
        ctx.fill();
    }
}

/** Draw simple stroke (highlighter, eraser) */
export function drawSimpleStroke(
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    view: ViewState
): void {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle =
        stroke.color === CANVAS_CONSTANTS.ERASE_FLAG ? '#000000' : stroke.color;
    // Multiply by scale to convert from world to screen coordinates
    ctx.lineWidth = stroke.size * view.scale;

    if (stroke.isHighlighter) {
        ctx.globalAlpha = CANVAS_CONSTANTS.HIGHLIGHTER_OPACITY;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.globalCompositeOperation = 'multiply';
    } else if (stroke.color === CANVAS_CONSTANTS.ERASE_FLAG) {
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
    }

    const s0 = toScreen(stroke.points[0], view);
    ctx.moveTo(s0.x, s0.y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const s1 = toScreen(p1, view);
        const s2 = toScreen(p2, view);
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        ctx.quadraticCurveTo(s1.x, s1.y, midX, midY);
    }

    const last = stroke.points[stroke.points.length - 1];
    const sLast = toScreen(last, view);
    ctx.lineTo(sLast.x, sLast.y);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
}

/** Check if a point is near a stroke (for object eraser) */
export function pointNearStroke(
    point: Point,
    stroke: Stroke,
    radius: number
): boolean {
    if (stroke.color === CANVAS_CONSTANTS.ERASE_FLAG) return false;

    const expandedBounds = {
        minX: stroke.bounds.minX - radius,
        maxX: stroke.bounds.maxX + radius,
        minY: stroke.bounds.minY - radius,
        maxY: stroke.bounds.maxY + radius,
    };

    if (
        point.x < expandedBounds.minX ||
        point.x > expandedBounds.maxX ||
        point.y < expandedBounds.minY ||
        point.y > expandedBounds.maxY
    ) {
        return false;
    }

    const { points, size } = stroke;
    const checkRadius = radius + size / 2;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;

        let dist: number;
        if (len2 === 0) {
            dist = Math.hypot(point.x - p1.x, point.y - p1.y);
        } else {
            const t = Math.max(
                0,
                Math.min(
                    1,
                    ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / len2
                )
            );
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            dist = Math.hypot(point.x - projX, point.y - projY);
        }

        if (dist <= checkRadius) return true;
    }

    if (points.length === 1) {
        return (
            Math.hypot(point.x - points[0].x, point.y - points[0].y) <=
            checkRadius
        );
    }

    return false;
}

/** Generate unique stroke ID */
export function generateStrokeId(): string {
    return `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate text dimensions based on font size and content
 * Used to ensure consistent sizing between ShapeRenderer and shape bounds
 */
export function calculateTextDimensions(text: string, fontSize: number): { width: number, height: number } {
    const lines = text.split('\n');
    // Use a slightly larger line height factor to ensure descent is covered
    const lineHeight = fontSize * 1.25;
    const textHeight = Math.max(lineHeight, lines.length * lineHeight);

    // Calculate width from text content
    // 0.6 of fontSize is safer average char width for variable width fonts
    // Add a small buffer for safety
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const avgCharWidth = fontSize * 0.6;
    const padding = fontSize * 0.5;
    const textWidth = Math.max(fontSize, maxLineLength * avgCharWidth + padding);

    return { width: textWidth, height: textHeight };
}
