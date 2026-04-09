import type { SizeSlot } from "../types/types";

interface EraserSizeSlotsProps {
  activeSlot: SizeSlot;
  onSlotChange: (slot: SizeSlot) => void;
  theme: "dark" | "light";
}

// Hardcoded eraser sizes (no customization)
const ERASER_SIZES: Record<SizeSlot, number> = {
  small: 12,
  medium: 24,
  large: 48,
};

// Visual circle sizes for display (not the actual eraser size)
const CIRCLE_SIZES: Record<SizeSlot, number> = {
  small: 12,
  medium: 20,
  large: 36, // This will be clipped
};

/**
 * Goodnotes-style eraser size selector with three circles.
 * The large circle overflows and is clipped for visual effect.
 */
export function EraserSizeSlots({
  activeSlot,
  onSlotChange,
  theme,
}: EraserSizeSlotsProps) {
  const slots: SizeSlot[] = ["small", "medium", "large"];

  const containerHeight = 28; // Fixed container height

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "8px",
        height: containerHeight,
        paddingLeft: "4px",
        paddingRight: "4px",
        overflowX: "visible", // Allow horizontal overflow
        overflowY: "hidden",  // Clip vertical overflow (top/bottom)
      }}
    >
      {slots.map((slot) => {
        const circleSize = CIRCLE_SIZES[slot];
        const isActive = activeSlot === slot;

        const borderColor = isActive
          ? "#007AFF" // Blue accent for active
          : theme === "dark"
            ? "rgba(255, 255, 255, 0.6)"
            : "rgba(0, 0, 0, 0.4)";

        const backgroundColor = isActive
          ? "rgba(255, 255, 255, 0.95)"
          : theme === "dark"
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(255, 255, 255, 0.95)";

        return (
          <button
            key={slot}
            type="button"
            onClick={() => onSlotChange(slot)}
            title={`${slot.charAt(0).toUpperCase() + slot.slice(1)} eraser (${ERASER_SIZES[slot]}px)`}
            style={{
              width: circleSize,
              height: circleSize,
              minWidth: circleSize,
              minHeight: circleSize,
              borderRadius: "50%",
              border: `2px solid ${borderColor}`,
              backgroundColor,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
              boxShadow: isActive
                ? "0 0 0 2px rgba(0, 122, 255, 0.3)"
                : "none",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Get the hardcoded eraser size for a given slot
 */
export function getEraserSize(slot: SizeSlot): number {
  return ERASER_SIZES[slot];
}
