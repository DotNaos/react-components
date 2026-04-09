import { ToolType, ViewState } from "../types/types";
import { useCallback, useEffect, useRef } from "react";
import { CANVAS_CONSTANTS, GestureEvent, PointerData } from "../types/types";

/**
 * Apply spring-like resistance to scale values above soft max.
 * Uses a balanced power curve: responsive at low pull, stiffer as you stretch.
 */
function applyZoomResistance(targetScale: number): number {
    const { SOFT_MAX_ZOOM, MAX_ZOOM, MIN_ZOOM } = CANVAS_CONSTANTS;

    if (targetScale <= MIN_ZOOM) return MIN_ZOOM;
    if (targetScale <= SOFT_MAX_ZOOM) return targetScale;

    const excess = targetScale - SOFT_MAX_ZOOM;
    const maxExcess = MAX_ZOOM - SOFT_MAX_ZOOM;
    const ratio = excess / maxExcess;

    // Soft start, stronger reach, capped overshoot via saturating exp curve
    // Tuned to let you reach ~400–450% with effort, then resist harder toward the cap
    const maxOvershootRatio = 0.28; // allow ~28% of (MAX - SOFT_MAX) overshoot (~4.96x total)
    const pullK = 2.2; // lower keeps mid softer while still accelerating toward cap

    // 0 at ratio=0, approaches maxOvershootRatio smoothly as ratio->1
    const shaped = (1 - Math.exp(-pullK * ratio)) / (1 - Math.exp(-pullK));
    const dampedRatio = Math.min(maxOvershootRatio * shaped, maxOvershootRatio);
    const dampedExcess = maxExcess * dampedRatio;

    return Math.min(SOFT_MAX_ZOOM + dampedExcess, MAX_ZOOM);
}

export interface UseGesturesOptions {
    /** Callback when Apple Pencil double-tap is detected */
    onPencilDoubleTap?: (event: GestureEvent) => void;
    /** Callback when two-finger double-tap is detected */
    onTwoFingerDoubleTap?: (event: GestureEvent) => void;
    /** Callback when pinch gesture is detected (for zoom) */
    onPinch?: (event: GestureEvent) => void;
    /** Callback when pan gesture is detected */
    onPan?: (event: GestureEvent) => void;
    /** Current tool for context in gesture handlers */
    currentTool?: ToolType;
    /** Current view state */
    view?: ViewState;
    /** Callback to update view state */
    onViewChange?: (view: ViewState) => void;
    /** Callback to animate view state (standard easing) */
    animateViewTo?: (view: ViewState) => void;
    /** Callback to animate view state with damped easing (for snap-back) */
    animateViewToDamped?: (view: ViewState) => void;
    /** Whether gestures are enabled */
    enabled?: boolean;
    /** Optional container ref for wheel events (useful when canvas may not receive events due to overlays) */
    containerRef?: React.RefObject<HTMLElement | null>;
}

interface TouchState {
    lastTapTime: number;
    lastTapCount: number;
    touchCount: number;
    initialPinchDistance: number | null;
    initialScale: number;
    lastPanPosition: { x: number; y: number } | null;
}

/**
 * Hook for handling touch gestures including Apple Pencil double-tap,
 * two-finger double-tap, pinch zoom, and pan.
 */
export function useGestures(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    options: UseGesturesOptions = {}
) {
    const {
        onPencilDoubleTap,
        onTwoFingerDoubleTap,
        onPinch,
        onPan,
        currentTool,
        view = { x: 0, y: 0, scale: 1 },
        onViewChange,
        animateViewTo,
        animateViewToDamped,
        enabled = true,
        containerRef,
    } = options;

    const touchStateRef = useRef<TouchState>({
        lastTapTime: 0,
        lastTapCount: 0,
        touchCount: 0,
        initialPinchDistance: null,
        initialScale: 1,
        lastPanPosition: null,
    });

    // Track if we're currently zooming (for snap-back on end)
    const isZoomingRef = useRef(false);
    const lastZoomCenterRef = useRef<{ x: number; y: number } | null>(null);

    // Use refs for callbacks and view to avoid effect re-execution
    const callbacksRef = useRef({
        onPencilDoubleTap,
        onTwoFingerDoubleTap,
        onPinch,
        onPan,
        onViewChange,
        animateViewTo,
        animateViewToDamped,
    });
    callbacksRef.current = {
        onPencilDoubleTap,
        onTwoFingerDoubleTap,
        onPinch,
        onPan,
        onViewChange,
        animateViewTo,
        animateViewToDamped,
    };

    const currentToolRef = useRef(currentTool);
    currentToolRef.current = currentTool;

    const viewRef = useRef(view);
    viewRef.current = view;

    // Snap back to soft max if above it (using damped animation like a pneumatic closer)
    const snapBackIfNeeded = useCallback(() => {
        const view = viewRef.current;
        const animateViewToDamped = callbacksRef.current.animateViewToDamped;
        const animateViewTo = callbacksRef.current.animateViewTo;
        const center = lastZoomCenterRef.current;

        if (view.scale > CANVAS_CONSTANTS.SOFT_MAX_ZOOM && center) {
            // Calculate the view position that keeps the zoom center fixed at soft max
            const worldX = (center.x - view.x) / view.scale;
            const worldY = (center.y - view.y) / view.scale;
            const newScale = CANVAS_CONSTANTS.SOFT_MAX_ZOOM;

            const targetView = {
                x: center.x - worldX * newScale,
                y: center.y - worldY * newScale,
                scale: newScale,
            };

            // Use damped animation if available, otherwise fall back to standard
            if (animateViewToDamped) {
                animateViewToDamped(targetView);
            } else if (animateViewTo) {
                animateViewTo(targetView);
            }
        }

        isZoomingRef.current = false;
        lastZoomCenterRef.current = null;
    }, []);

    // Debounce timer for wheel end detection
    const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastWheelEventRef = useRef<number>(0);

    // Handle wheel events for zoom and pan
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            if (!enabled) return;
            const onViewChange = callbacksRef.current.onViewChange;
            const onPinch = callbacksRef.current.onPinch;
            const onPan = callbacksRef.current.onPan;

            if (!onViewChange) return;
            e.preventDefault();

            const canvas = canvasRef.current;
            if (!canvas) return;
            const view = viewRef.current;

            // Get canvas bounds to calculate mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();

            if (e.ctrlKey || e.metaKey) {
                // Pinch zoom (trackpad) or Ctrl+scroll
                isZoomingRef.current = true;

                const sensitivity = 0.008;
                const delta = -e.deltaY;
                const zoomFactor = Math.exp(delta * sensitivity);

                // Mouse position relative to canvas
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Store zoom center for snap-back
                lastZoomCenterRef.current = { x: mouseX, y: mouseY };

                // Convert mouse position to world coordinates
                const worldX = (mouseX - view.x) / view.scale;
                const worldY = (mouseY - view.y) / view.scale;

                // Calculate target scale (without resistance)
                let targetScale = view.scale * zoomFactor;
                targetScale = Math.max(CANVAS_CONSTANTS.MIN_ZOOM, targetScale);

                // Apply rubber-band resistance above soft max
                const newScale = applyZoomResistance(targetScale);

                // Calculate new view position to keep the point under cursor fixed
                onViewChange({
                    x: mouseX - worldX * newScale,
                    y: mouseY - worldY * newScale,
                    scale: newScale,
                });

                onPinch?.({
                    type: 'pinch',
                    scale: newScale,
                });

                // Clear existing timer and set new one for wheel end detection
                // Snap only after sustained idle (no wheel events) to avoid snapping while user still holds
                const wheelSnapDelay = 900; // ms of inactivity before snap-back
                lastWheelEventRef.current = Date.now();
                if (wheelEndTimerRef.current) {
                    clearTimeout(wheelEndTimerRef.current);
                }
                const scheduleSnapCheck = () => {
                    const elapsed = Date.now() - lastWheelEventRef.current;
                    const remaining = wheelSnapDelay - elapsed;
                    if (remaining <= 0) {
                        snapBackIfNeeded();
                    } else {
                        wheelEndTimerRef.current = setTimeout(scheduleSnapCheck, remaining);
                    }
                };
                wheelEndTimerRef.current = setTimeout(scheduleSnapCheck, wheelSnapDelay);
            } else {
                // Pan
                onViewChange({
                    ...view,
                    x: view.x - e.deltaX,
                    y: view.y - e.deltaY,
                    scale: view.scale,
                });

                onPan?.({
                    type: 'pan',
                    deltaX: -e.deltaX,
                    deltaY: -e.deltaY,
                });
            }
        },
        [enabled, canvasRef, snapBackIfNeeded]
    );

    // Handle touch start for gesture detection
    const handleTouchStart = useCallback(
        (e: TouchEvent) => {
            if (!enabled) return;
            const onTwoFingerDoubleTap =
                callbacksRef.current.onTwoFingerDoubleTap;
            const view = viewRef.current;

            const state = touchStateRef.current;
            const canvas = canvasRef.current;
            state.touchCount = e.touches.length;

            if (e.touches.length === 2 && canvas) {
                const rect = canvas.getBoundingClientRect();
                // Initialize pinch
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                state.initialPinchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                state.initialScale = view.scale;

                // Initialize pan position (midpoint of two fingers) - relative to canvas
                state.lastPanPosition = {
                    x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
                    y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
                };
            }

            // Check for double-tap
            const now = Date.now();
            const timeSinceLastTap = now - state.lastTapTime;

            if (
                timeSinceLastTap < 300 &&
                state.lastTapCount === e.touches.length
            ) {
                if (e.touches.length === 2) {
                    // Two-finger double-tap
                    onTwoFingerDoubleTap?.({
                        type: 'twoFingerDoubleTap',
                        previousTool: currentToolRef.current,
                    });
                }
                state.lastTapTime = 0;
                state.lastTapCount = 0;
            } else {
                state.lastTapTime = now;
                state.lastTapCount = e.touches.length;
            }
        },
        [enabled, canvasRef]
    );

    // Handle touch move for pinch and pan
    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!enabled) return;
            const onViewChange = callbacksRef.current.onViewChange;
            const onPinch = callbacksRef.current.onPinch;

            if (!onViewChange) return;

            const state = touchStateRef.current;
            const canvas = canvasRef.current;
            const view = viewRef.current;

            if (
                e.touches.length === 2 &&
                state.initialPinchDistance !== null &&
                canvas
            ) {
                e.preventDefault();
                isZoomingRef.current = true;

                const rect = canvas.getBoundingClientRect();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Calculate new pinch distance
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                // Calculate pan (midpoint movement) - relative to canvas
                const currentMidpoint = {
                    x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
                    y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
                };

                // Store zoom center for snap-back
                lastZoomCenterRef.current = currentMidpoint;

                // Calculate target scale (without resistance)
                const scaleRatio = currentDistance / state.initialPinchDistance;
                let targetScale = state.initialScale * scaleRatio;
                targetScale = Math.max(CANVAS_CONSTANTS.MIN_ZOOM, targetScale);

                // Apply rubber-band resistance above soft max
                const newScale = applyZoomResistance(targetScale);

                if (state.lastPanPosition) {
                    const deltaX = currentMidpoint.x - state.lastPanPosition.x;
                    const deltaY = currentMidpoint.y - state.lastPanPosition.y;

                    // Zoom towards the midpoint
                    // Note: using current view instead of initial pinch view to allow continuous accumulation
                    const worldX = (currentMidpoint.x - view.x) / view.scale;
                    const worldY = (currentMidpoint.y - view.y) / view.scale;

                    onViewChange({
                        x: currentMidpoint.x - worldX * newScale + deltaX,
                        y: currentMidpoint.y - worldY * newScale + deltaY,
                        scale: newScale,
                    });
                }

                state.lastPanPosition = currentMidpoint;

                onPinch?.({
                    type: 'pinch',
                    scale: newScale,
                });
            }
        },
        [enabled, canvasRef]
    );

    // Handle touch end
    const handleTouchEnd = useCallback(
        (e: TouchEvent) => {
            const state = touchStateRef.current;

            if (e.touches.length < 2) {
                state.initialPinchDistance = null;
                state.lastPanPosition = null;

                // Snap back if we were zooming above soft max
                if (isZoomingRef.current) {
                    snapBackIfNeeded();
                }
            }

            state.touchCount = e.touches.length;
        },
        [snapBackIfNeeded]
    );

    // Handle Apple Pencil double-tap (via pointer events)
    // Note: Apple Pencil double-tap is detected via a special event on supported devices
    const handlePointerDown = useCallback(
        (e: PointerEvent) => {
            if (!enabled) return;

            // Apple Pencil double-tap is typically handled via the 'change' event
            // on the PencilKit API (iOS/iPadOS native) or via a workaround
            // For web, we can detect rapid pen taps
            if (e.pointerType === 'pen') {
                const state = touchStateRef.current;
                const now = Date.now();

                if (now - state.lastTapTime < 300 && state.lastTapCount === 1) {
                    // Double-tap with pencil detected
                    onPencilDoubleTap?.({
                        type: 'pencilDoubleTap',
                        previousTool: currentToolRef.current,
                    });
                    state.lastTapTime = 0;
                } else {
                    state.lastTapTime = now;
                    state.lastTapCount = 1;
                }
            }
        },
        [enabled, onPencilDoubleTap]
    );

    // Attach event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !enabled) return;

        // Use container for wheel events if provided (handles cases where canvas doesn't receive events)
        const wheelTarget = containerRef?.current ?? canvas;

        wheelTarget.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, {
            passive: true,
        });
        canvas.addEventListener('touchmove', handleTouchMove, {
            passive: false,
        });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
        canvas.addEventListener('pointerdown', handlePointerDown, {
            passive: true,
        });

        return () => {
            wheelTarget.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [
        canvasRef,
        containerRef,
        enabled,
        handleWheel,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handlePointerDown,
    ]);

    /**
     * Get pointer data from a pointer event with pressure and tilt.
     */
    const getPointerData = useCallback((e: PointerEvent): PointerData => {
        return {
            x: e.clientX,
            y: e.clientY,
            pressure: e.pointerType === 'pen' ? e.pressure : 0.5,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            pointerType: e.pointerType as 'pen' | 'touch' | 'mouse',
            isPrimary: e.isPrimary,
        };
    }, []);

    return {
        getPointerData,
        touchCount: touchStateRef.current.touchCount,
    };
}
