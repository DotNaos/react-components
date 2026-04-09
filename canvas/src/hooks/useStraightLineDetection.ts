import { createLogger } from '../../../logging';
import { MutableRefObject, useCallback, useRef } from 'react';
import type { Point, Stroke } from '../types/drawingTypes';

const logger = createLogger('com.aryazos.components.canvas.straightline');

/** Configuration for straight line detection */
export interface StraightLineOptions {
    /** Time in ms of stillness before entering straight line mode (default: 500) */
    holdDuration?: number;
    /** Maximum movement in world units to still be considered "still" (default: 2) */
    stillnessThreshold?: number;
    /** Minimum stroke length before straight line detection activates (default: 20) */
    minStrokeLength?: number;
    /** Whether feature is enabled */
    enabled?: boolean;
    /** Callback when a line should be created (instead of continuing the stroke) */
    onLineCreate?: (
        start: { x: number; y: number },
        end: { x: number; y: number },
        color: string,
        strokeWidth: number,
        isHighlighter: boolean,
    ) => void;
}

interface StraightLineState {
    /** Whether we're currently tracking for straight line */
    isTracking: boolean;
    /** Whether we've had enough movement to enable straight line detection */
    hasMinimumMovement: boolean;
    /** Position when stillness started */
    stillPosition: { x: number; y: number } | null;
    /** Time when stillness started (for debugging) */
    stillStartTime: number;
    /** Timer for the hold duration */
    timerId: ReturnType<typeof setTimeout> | null;
    /** Whether we're in straight line mode (converting to shape) */
    isInStraightLineMode: boolean;
    /** The fixed start point when in straight line mode */
    startPoint: Point | null;
    /** Current color of the stroke */
    strokeColor: string;
    /** Current stroke width */
    strokeWidth: number;
    /** Whether this is a highlighter stroke */
    isHighlighter: boolean;
}

export interface UseStraightLineDetectionReturn {
    /** Call during stroke movement with current position - returns true if handled (in straight line mode) */
    trackMovement: (pos: { x: number; y: number }, pressure: number) => boolean;
    /** Call when a stroke starts */
    onStrokeStart: () => void;
    /** Check if currently in straight line mode */
    isInStraightLineMode: () => boolean;
    /** Reset tracking state and optionally create the line shape */
    reset: (createShape?: boolean) => void;
    /** Get the current line endpoints if in straight line mode */
    getLineEndpoints: () => {
        start: { x: number; y: number };
        end: { x: number; y: number };
        color: string;
        strokeWidth: number;
    } | null;
}

/**
 * Hook to detect when user holds still during drawing and convert to a Line shape.
 * When the pointer stays still for `holdDuration` ms during a stroke (after some initial movement),
 * the stroke is converted to a line shape that can be edited with control points.
 */
export function useStraightLineDetection(
    currentStrokeRef: MutableRefObject<Stroke | null>,
    draw: () => void,
    options: StraightLineOptions = {},
): UseStraightLineDetectionReturn {
    const {
        holdDuration = 500, // 0.5 seconds
        stillnessThreshold = 2, // Very small - must be nearly stationary
        minStrokeLength = 20, // Must draw at least this much before detection activates
        enabled = true,
        onLineCreate,
    } = options;

    const stateRef = useRef<StraightLineState>({
        isTracking: false,
        hasMinimumMovement: false,
        stillPosition: null,
        stillStartTime: 0,
        timerId: null,
        isInStraightLineMode: false,
        startPoint: null,
        strokeColor: '#1a1a1a',
        strokeWidth: 2,
        isHighlighter: false,
    });

    // Store the current end position when in straight line mode
    const currentEndRef = useRef<{ x: number; y: number } | null>(null);

    const clearTimer = useCallback(() => {
        if (stateRef.current.timerId) {
            clearTimeout(stateRef.current.timerId);
            stateRef.current.timerId = null;
        }
    }, []);

    const reset = useCallback(
        (createShape: boolean = false) => {
            clearTimer();

            // If we should create the shape and we have valid endpoints
            if (
                createShape &&
                stateRef.current.isInStraightLineMode &&
                stateRef.current.startPoint &&
                currentEndRef.current &&
                onLineCreate
            ) {
                onLineCreate(
                    stateRef.current.startPoint,
                    currentEndRef.current,
                    stateRef.current.strokeColor,
                    stateRef.current.strokeWidth,
                    stateRef.current.isHighlighter,
                );
            }

            stateRef.current = {
                isTracking: false,
                hasMinimumMovement: false,
                stillPosition: null,
                stillStartTime: 0,
                timerId: null,
                isInStraightLineMode: false,
                startPoint: null,
                strokeColor: '#1a1a1a',
                strokeWidth: 2,
                isHighlighter: false,
            };
            currentEndRef.current = null;
        },
        [clearTimer, onLineCreate],
    );

    // Ref to hold the latest updateStraightLine function to avoid stale closures in timer
    const updateStraightLineRef = useRef<
        ((endPos: { x: number; y: number }, pressure?: number) => void) | null
    >(null);

    // Update the straight line from start to the given end position
    const updateStraightLine = useCallback(
        (endPos: { x: number; y: number }, pressure: number = 0.5) => {
            const stroke = currentStrokeRef.current;
            const startPoint = stateRef.current.startPoint;
            if (!stroke || !startPoint) return;

            // Store current end position
            currentEndRef.current = endPos;

            // Create interpolated points for smooth line rendering
            const numPoints = 10;
            const newPoints: Point[] = [];

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                newPoints.push({
                    x: startPoint.x + (endPos.x - startPoint.x) * t,
                    y: startPoint.y + (endPos.y - startPoint.y) * t,
                    pressure: i === 0 ? startPoint.pressure : pressure,
                    timestamp: i * 10,
                });
            }

            // Replace stroke points with straight line
            stroke.points = newPoints;

            // Update bounds
            const padding = stroke.size * 2;
            stroke.bounds = {
                minX: Math.min(startPoint.x, endPos.x) - padding,
                maxX: Math.max(startPoint.x, endPos.x) + padding,
                minY: Math.min(startPoint.y, endPos.y) - padding,
                maxY: Math.max(startPoint.y, endPos.y) + padding,
            };

            // Trigger redraw
            draw();
        },
        [currentStrokeRef, draw],
    );

    // Keep ref updated with latest function
    updateStraightLineRef.current = updateStraightLine;

    // Enter straight line mode - stroke becomes a line from start to current position
    const enterStraightLineMode = useCallback(() => {
        const stroke = currentStrokeRef.current;
        if (!stroke || stroke.points.length < 2) return;

        // Already in straight line mode
        if (stateRef.current.isInStraightLineMode) return;

        // Store the start point (first point of the stroke)
        const firstPoint = stroke.points[0];
        stateRef.current.startPoint = { ...firstPoint };
        stateRef.current.isInStraightLineMode = true;
        stateRef.current.strokeColor = stroke.color;
        stateRef.current.strokeWidth = stroke.size;
        stateRef.current.isHighlighter = stroke.isHighlighter;

        logger.debug(
            'Entered straight line mode - release to create line shape',
        );

        // Immediately update to show straight line to current end position
        // Use ref to get the latest function and avoid stale closure
        const lastPoint = stroke.points[stroke.points.length - 1];
        currentEndRef.current = lastPoint;
        updateStraightLineRef.current?.(lastPoint, lastPoint.pressure);
    }, [currentStrokeRef]);

    const startStillnessTimer = useCallback(() => {
        clearTimer();
        stateRef.current.stillStartTime = Date.now();
        stateRef.current.timerId = setTimeout(() => {
            enterStraightLineMode();
        }, holdDuration);
    }, [clearTimer, holdDuration, enterStraightLineMode]);

    const onStrokeStart = useCallback(() => {
        reset();
        if (enabled) {
            stateRef.current.isTracking = true;
        }
    }, [enabled, reset]);

    const trackMovement = useCallback(
        (pos: { x: number; y: number }, pressure: number): boolean => {
            if (!enabled || !stateRef.current.isTracking) return false;

            // If in straight line mode, update the end point and return true to indicate we handled it
            if (stateRef.current.isInStraightLineMode) {
                updateStraightLine(pos, pressure);
                return true; // Signal that we handled this movement
            }

            // Check if we've had minimum movement from stroke start
            const stroke = currentStrokeRef.current;
            if (
                !stateRef.current.hasMinimumMovement &&
                stroke &&
                stroke.points.length > 0
            ) {
                const firstPoint = stroke.points[0];
                const totalDist = Math.sqrt(
                    Math.pow(pos.x - firstPoint.x, 2) +
                        Math.pow(pos.y - firstPoint.y, 2),
                );

                if (totalDist >= minStrokeLength) {
                    stateRef.current.hasMinimumMovement = true;
                    logger.trace(
                        'Minimum movement reached, now tracking for stillness',
                    );
                }
            }

            // Don't track stillness until we've moved enough
            if (!stateRef.current.hasMinimumMovement) {
                return false;
            }

            const { stillPosition } = stateRef.current;

            if (!stillPosition) {
                // First position tracked after minimum movement - start potential stillness
                stateRef.current.stillPosition = { ...pos };
                startStillnessTimer();
                return false;
            }

            // Check if we moved significantly from the still position
            const dx = pos.x - stillPosition.x;
            const dy = pos.y - stillPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > stillnessThreshold) {
                // User moved - reset stillness tracking to current position
                stateRef.current.stillPosition = { ...pos };
                startStillnessTimer();
            }
            // If within threshold, keep waiting for the timer

            return false; // We didn't handle this movement, normal stroke behavior should continue
        },
        [
            enabled,
            stillnessThreshold,
            minStrokeLength,
            startStillnessTimer,
            updateStraightLine,
            currentStrokeRef,
        ],
    );

    const isInStraightLineMode = useCallback((): boolean => {
        return stateRef.current.isInStraightLineMode;
    }, []);

    const getLineEndpoints = useCallback(() => {
        if (
            !stateRef.current.isInStraightLineMode ||
            !stateRef.current.startPoint ||
            !currentEndRef.current
        ) {
            return null;
        }
        return {
            start: stateRef.current.startPoint,
            end: currentEndRef.current,
            color: stateRef.current.strokeColor,
            strokeWidth: stateRef.current.strokeWidth,
        };
    }, []);

    return {
        trackMovement,
        onStrokeStart,
        isInStraightLineMode,
        reset,
        getLineEndpoints,
    };
}
