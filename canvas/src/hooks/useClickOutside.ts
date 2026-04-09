import { RefObject, useEffect } from 'react';

/**
 * Hook to detect clicks outside of specified elements.
 * Calls the handler when a click is detected outside all provided refs.
 */
export function useClickOutside(
    refs: RefObject<HTMLElement | null>[],
    handler: () => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        const handleClickOutside = (e: MouseEvent) => {
            const clickedOutside = refs.every(
                (ref) => ref.current && !ref.current.contains(e.target as Node)
            );
            if (clickedOutside) {
                handler();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [refs, handler, enabled]);
}
