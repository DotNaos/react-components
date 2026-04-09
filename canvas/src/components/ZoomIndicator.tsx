import { ChevronDown, Focus, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ZoomIndicatorProps {
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset zoom to 100% */
  onZoomReset: () => void;
  /** Theme */
  theme?: "dark" | "light";
}

/**
 * Zoom indicator dropdown that shows current zoom level
 * and provides zoom controls in a dropdown menu.
 * Positioned in bottom-left corner of the canvas.
 */
export function ZoomIndicator({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme = "dark",
}: ZoomIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const bgColor = theme === "light" ? "#ffffff" : "#1e1e1e";
  const borderColor = theme === "light" ? "#e5e5e5" : "#333";
  const textColor = theme === "light" ? "#333" : "#fff";
  const hoverBg = theme === "light" ? "#f5f5f5" : "#333";

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        zIndex: 100,
      }}
    >
      {/* Backdrop for closing */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 10px",
          borderRadius: "20px",
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <span>{Math.round(zoom * 100)}%</span>
        <ChevronDown
          className="w-3 h-3"
          style={{
            opacity: 0.6,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            overflow: "hidden",
            minWidth: "140px",
            zIndex: 101,
          }}
        >
          <button
            onClick={() => handleAction(onZoomReset)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 14px",
              border: "none",
              backgroundColor: "transparent",
              color: textColor,
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Focus className="w-4 h-4" style={{ opacity: 0.7 }} />
            Zoom to 100%
          </button>
          <button
            onClick={() => handleAction(onZoomIn)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 14px",
              border: "none",
              backgroundColor: "transparent",
              color: textColor,
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ZoomIn className="w-4 h-4" style={{ opacity: 0.7 }} />
            Zoom in
          </button>
          <button
            onClick={() => handleAction(onZoomOut)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 14px",
              border: "none",
              backgroundColor: "transparent",
              color: textColor,
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ZoomOut className="w-4 h-4" style={{ opacity: 0.7 }} />
            Zoom out
          </button>
        </div>
      )}
    </div>
  );
}
