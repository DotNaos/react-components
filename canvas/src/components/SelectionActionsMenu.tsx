import { CopyPlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SelectionActionsMenuProps {
  /** Bounding box of selection in world coordinates */
  selectionBounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** View state for positioning */
  view: { x: number; y: number; scale: number };
  /** Container element ref for proper positioning */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Theme */
  theme?: "dark" | "light";
  /** Callback to delete selected items */
  onDelete: () => void;
  /** Callback to duplicate selected items */
  onDuplicate: () => void;
}

/**
 * Simplified bubble menu for lasso selections (multiple shapes or any strokes).
 * Shows only duplicate and delete actions.
 */
export function SelectionActionsMenu({
  selectionBounds,
  view,
  containerRef,
  theme = "dark",
  onDelete,
  onDuplicate,
}: SelectionActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, above: false });

  // Calculate menu position based on selection bounds and container position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Convert to screen coordinates
    const screenCenterX = ((selectionBounds.minX + selectionBounds.maxX) / 2) * view.scale + view.x + containerRect.left;
    const screenBottom = selectionBounds.maxY * view.scale + view.y + containerRect.top;
    const screenTop = selectionBounds.minY * view.scale + view.y + containerRect.top;

    // Check if there's enough space below
    const menuHeight = 50;
    const padding = 16;
    const windowHeight = window.innerHeight;

    const showAbove = screenBottom + menuHeight + padding > windowHeight - 100;

    setPosition({
      x: screenCenterX,
      y: showAbove ? screenTop - padding : screenBottom + padding,
      above: showAbove,
    });
  }, [selectionBounds, view, containerRef]);

  const bgColor = theme === "light" ? "#ffffff" : "#1e1e1e";
  const borderColor = theme === "light" ? "#e5e5e5" : "#333";
  const textColor = theme === "light" ? "#333" : "#fff";

  const buttonStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    padding: "4px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "transparent",
    color: textColor,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return createPortal(
    <div
      ref={menuRef}
      className="selection-actions-menu"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        transform: `translate(-50%, ${position.above ? "-100%" : "0"})`,
        zIndex: 1100,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "50px",
        backgroundColor: bgColor,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        border: `1px solid ${borderColor}`,
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        title="Duplicate"
        style={buttonStyle}
      >
        <CopyPlus className="w-4 h-4" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          ...buttonStyle,
          color: "#ef4444",
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}
