import { ViewState } from '../types/types';
import { Dispatch, SetStateAction, useCallback, useRef } from 'react';

/** Easing function type */
type EasingFunction = (t: number) => number;

/** Ease out cubic - standard smooth deceleration */
const easeOutCubic: EasingFunction = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Pneumatic damper easing - simulates compressed air resistance
 * Fast initial movement that gradually slows with increasing resistance,
 * like a door closer or car suspension
 */
const pneumaticDamper: EasingFunction = (t) => {
    // Use a combination of exponential decay and cubic ease
    // This creates a fast start that smoothly decelerates with "cushioning"
    const decay = 1 - Math.exp(-4 * t); // Exponential approach
    const cushion = 1 - Math.pow(1 - t, 2); // Quadratic ease for smooth end
    // Blend: mostly decay behavior with cushioned landing
    return decay * 0.7 + cushion * 0.3;
};

interface UseAnimatedViewReturn {
    animateViewTo: (
        targetView: ViewState,
        duration?: number,
        easing?: EasingFunction,
    ) => void;
    /** Animate with pneumatic damper easing (for snap-back) */
    animateViewToDamped: (targetView: ViewState, duration?: number) => void;
}

/**
 * Hook for animated view transitions with easing
 */
export function useAnimatedView(
    view: ViewState,
    setView: Dispatch<SetStateAction<ViewState>>,
    onViewChange?: (view: ViewState) => void,
): UseAnimatedViewReturn {
    const animationRef = useRef<number | null>(null);
    const viewRef = useRef(view);
    viewRef.current = view;

    const animateViewTo = useCallback(
        (
            targetView: ViewState,
            duration = 300,
            easing: EasingFunction = easeOutCubic,
        ) => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            const startView = { ...viewRef.current };
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easing(progress);

                const newView = {
                    x: startView.x + (targetView.x - startView.x) * eased,
                    y: startView.y + (targetView.y - startView.y) * eased,
                    scale:
                        startView.scale +
                        (targetView.scale - startView.scale) * eased,
                };

                setView(newView);
                onViewChange?.(newView);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    animationRef.current = null;
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        },
        [onViewChange, setView],
    );

    const animateViewToDamped = useCallback(
        (targetView: ViewState, duration = 400) => {
            animateViewTo(targetView, duration, pneumaticDamper);
        },
        [animateViewTo],
    );

    return { animateViewTo, animateViewToDamped };
}
