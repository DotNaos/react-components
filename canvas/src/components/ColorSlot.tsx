import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Default color presets for the picker */
const COLOR_PRESETS = [
    "#1a1a1a", "#ef4444", "#f97316", "#eab308",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
    "#d946ef", "#ec4899", "#f43f5e", "#ffffff",
];

interface ColorSlotProps {
    /** Current color value */
    color: string;
    /** Callback when color changes */
    onChange: (color: string) => void;
    /** Whether to show the chevron dropdown indicator */
    showChevron?: boolean;
    /** Size of the slot in pixels */
    size?: number;
    /** Theme for styling */
    theme?: "dark" | "light";
    /** Whether this slot is currently active/selected */
    isActive?: boolean;
    /** Optional click handler for selection (instead of opening picker) */
    onSelect?: () => void;
}

/**
 * A color slot button that displays the current color and optionally opens a picker popover.
 */
export function ColorSlot({
    color,
    onChange,
    showChevron = false,
    size = 16,
    theme = "dark",
    isActive = false,
    onSelect,
}: ColorSlotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    // Update popover position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
            });
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleClick = useCallback(() => {
        if (onSelect) {
            onSelect();
        }

        // Open picker if chevron is shown OR if passing onSelect and it's already active
        if (showChevron) {
            setIsOpen((prev) => !prev);
        } else if (onSelect && isActive) {
            setIsOpen((prev) => !prev);
        } else if (!onSelect) {
            // No onSelect logic = just toggle picker
            setIsOpen((prev) => !prev);
        }
    }, [onSelect, showChevron, isActive]);

    const handleColorSelect = useCallback((newColor: string) => {
        onChange(newColor);
        setIsOpen(false);
    }, [onChange]);

    const isDark = theme === "dark";

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleClick}
                style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "none",
                    outline: isActive
                        ? `4px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`
                        : "none",
                    outlineOffset: "0",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)", // Subtle inner shadow
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    position: "relative",
                    transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
                title={`Color: ${color}`}
            >
                {(showChevron || isActive) && (
                    <ChevronDown
                        className="w-[10px] h-[10px]"
                        style={{
                            color: "#ffffff",
                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                        }}
                    />
                )}
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            position: "fixed",
                            top: popoverPos.top,
                            left: popoverPos.left,
                            transform: "translateX(-50%)",
                            zIndex: 1001,
                            backgroundColor: isDark ? "#1e1e1e" : "#fff",
                            borderRadius: 12,
                            padding: 12,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                            border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gap: 8,
                            }}
                        >
                            {COLOR_PRESETS.map((presetColor) => (
                                <button
                                    key={presetColor}
                                    type="button"
                                    onClick={() => handleColorSelect(presetColor)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        backgroundColor: presetColor,
                                        border:
                                            color === presetColor
                                                ? `2px solid ${isDark ? "#fff" : "#333"}`
                                                : `1px solid ${isDark ? "#444" : "#ddd"}`,
                                        cursor: "pointer",
                                        padding: 0,
                                    }}
                                    title={presetColor}
                                />
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
