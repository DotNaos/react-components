import { AlignCenter, AlignLeft, AlignRight, Bold, CopyPlus, Italic, Minus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Shape } from "../types/drawingTypes";
import { ColorSlot } from "./ColorSlot";
import { TaperedSlider } from "./TaperedSlider";

interface ShapeEditMenuProps {
  /** The selected shape to edit */
  shape: Shape;
  /** View state for positioning */
  view: { x: number; y: number; scale: number };
  /** Container element ref for proper positioning */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Theme */
  theme?: "dark" | "light";
  /** Callback to update shape properties */
  onShapeUpdate: (updates: Partial<Shape>) => void;
  /** Callback to delete the shape */
  onDelete: () => void;
  /** Callback to duplicate the shape */
  onDuplicate: () => void;
}

/**
 * Bubble menu that appears when a shape is selected, allowing editing of properties.
 * Styled similar to GoodNotes with a pill-shaped floating toolbar.
 */
export function ShapeEditMenu({
  shape,
  view,
  containerRef,
  theme = "dark",
  onShapeUpdate,
  onDelete,
  onDuplicate,
}: ShapeEditMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, above: false });

  // Calculate menu position based on shape bounds and container position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    const minX = Math.min(shape.x1, shape.x2);
    const maxX = Math.max(shape.x1, shape.x2);
    const minY = Math.min(shape.y1, shape.y2);
    const maxY = Math.max(shape.y1, shape.y2);

    // Convert to screen coordinates (relative to container, then add container offset)
    const screenCenterX = ((minX + maxX) / 2) * view.scale + view.x + containerRect.left;
    const screenBottom = maxY * view.scale + view.y + containerRect.top;
    const screenTop = minY * view.scale + view.y + containerRect.top;

    // Check if there's enough space below (80px for menu height + padding)
    const menuHeight = 50;
    const padding = 16;
    const windowHeight = window.innerHeight;

    const showAbove = screenBottom + menuHeight + padding > windowHeight - 100;

    setPosition({
      x: screenCenterX,
      y: showAbove ? screenTop - padding : screenBottom + padding,
      above: showAbove,
    });
  }, [shape, view, containerRef]);

  const [showStrokeMenu, setShowStrokeMenu] = useState(false);

  const isFilled = !!shape.fillColor && shape.fillColor !== "transparent";
  const strokeColor = shape.strokeColor;

  const handleColorChange = (newColor: string) => {
    const updates: Partial<Shape> = { strokeColor: newColor };
    if (isFilled) {
      updates.fillColor = newColor;
    }
    onShapeUpdate(updates);
  };

  const handleFilledToggle = () => {
    if (isFilled) {
      onShapeUpdate({ fillColor: undefined });
    } else {
      onShapeUpdate({ fillColor: strokeColor });
    }
  };

  const bgColor = theme === "light" ? "#ffffff" : "#1e1e1e";
  const borderColor = theme === "light" ? "#e5e5e5" : "#333";
  const textColor = theme === "light" ? "#333" : "#fff";

  const buttonStyle = {
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
      className="shape-edit-menu"
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
      {/* Color Picker */}
      <ColorSlot
        color={strokeColor}
        onChange={handleColorChange}
        showChevron={true}
        isActive={true}
        size={18}
        theme={theme}
      />

      <div
        className="divider-v"
        style={{
          width: "1px",
          height: "20px",
          background: borderColor,
        }}
      />

      {/* Text Properties */}
      {shape.kind === "text" && (
        <>
           {/* Font Size */}
           <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
               <select
                   value={shape.fontSize || 16}
                   onChange={(e) => onShapeUpdate({ fontSize: Number(e.target.value) })}
                   style={{
                       background: theme === 'light' ? '#f5f5f5' : '#333',
                       color: theme === 'light' ? '#333' : '#fff',
                       border: 'none',
                       borderRadius: '8px',
                       padding: '6px 8px',
                       fontSize: '13px',
                       cursor: 'pointer',
                       outline: 'none',
                       appearance: 'none', // Remove default arrow if desired, or keep it
                       textAlign: 'center',
                       minWidth: '60px'
                   }}
                   title="Font Size"
               >
                   {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72, 96].map((size) => (
                       <option key={size} value={size}>{size}px</option>
                   ))}
               </select>
           </div>

           <div className="divider-v" style={{ width: "1px", height: "20px", background: borderColor }} />

           {/* Bold */}
           <button
             onClick={() => onShapeUpdate({ fontWeight: shape.fontWeight === "bold" ? "normal" : "bold" })}
             style={{ ...buttonStyle, backgroundColor: shape.fontWeight === "bold" ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent" }}
             title="Bold"
           >
             <Bold className="w-4 h-4" />
           </button>

           {/* Italic */}
           <button
             onClick={() => onShapeUpdate({ fontStyle: shape.fontStyle === "italic" ? "normal" : "italic" })}
             style={{ ...buttonStyle, backgroundColor: shape.fontStyle === "italic" ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent" }}
             title="Italic"
           >
             <Italic className="w-4 h-4" />
           </button>

           <div className="divider-v" style={{ width: "1px", height: "20px", background: borderColor }} />

           {/* Alignment */}
           <button
             onClick={() => onShapeUpdate({ textAlign: "left" })}
             style={{ ...buttonStyle, backgroundColor: (!shape.textAlign || shape.textAlign === "left") ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent" }}
             title="Align Left"
           >
             <AlignLeft className="w-4 h-4" />
           </button>
           <button
             onClick={() => onShapeUpdate({ textAlign: "center" })}
             style={{ ...buttonStyle, backgroundColor: shape.textAlign === "center" ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent" }}
             title="Align Center"
           >
             <AlignCenter className="w-4 h-4" />
           </button>
           <button
             onClick={() => onShapeUpdate({ textAlign: "right" })}
             style={{ ...buttonStyle, backgroundColor: shape.textAlign === "right" ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent" }}
             title="Align Right"
           >
             <AlignRight className="w-4 h-4" />
           </button>

           <div className="divider-v" style={{ width: "1px", height: "20px", background: borderColor }} />
        </>
      )}

      {/* Filled Toggle - only for shapes that can be filled */}
      {shape.kind !== "line" && shape.kind !== "arrow" && shape.kind !== "text" && (
        <>
          <button
            className={`tool-btn small ${isFilled ? "active" : ""}`}
            onClick={handleFilledToggle}
            title={isFilled ? "Remove fill" : "Add fill"}
            style={{
              width: "28px",
              height: "28px",
              padding: "4px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: isFilled ? (theme === "light" ? "#007aff" : "#0a84ff") : "transparent",
              color: isFilled ? "#fff" : textColor,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "2px",
                backgroundColor: isFilled ? "#fff" : strokeColor,
                border: isFilled ? "none" : `2px solid ${strokeColor}`,
              }}
            />
          </button>
          <div
            className="divider-v"
            style={{
              width: "1px",
              height: "20px",
              background: borderColor,
            }}
          />
        </>
      )}

      {/* Stroke Width Button with Dropdown */}
      {shape.kind !== "text" && (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowStrokeMenu(!showStrokeMenu)}
          title="Stroke width"
          style={{
            width: "28px",
            height: "28px",
            padding: "4px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: showStrokeMenu ? (theme === "light" ? "#e5e5e5" : "#333") : "transparent",
            color: textColor,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Stroke Settings Dropdown */}
        {showStrokeMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: bgColor,
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              border: `1px solid ${borderColor}`,
              padding: "16px",
              minWidth: "220px",
              zIndex: 1101,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div style={{
              fontSize: "14px",
              fontWeight: 600,
              color: textColor,
              marginBottom: "16px",
              textAlign: "center"
            }}>
              Stroke Settings
            </div>

            {/* Width Slider */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{
                fontSize: "11px",
                color: theme === "light" ? "#666" : "#aaa",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "12px"
              }}>
                Width
              </div>
              <TaperedSlider
                value={shape.strokeWidth}
                min={1}
                max={20}
                onChange={(val) => onShapeUpdate({ strokeWidth: val })}
                theme={theme}
                showLabel={true}
                labelSuffix="px"
              />
            </div>
          </div>
        )}
      </div>
      )}

      {shape.kind !== "text" && (
      <div
        className="divider-v"
        style={{
          width: "1px",
          height: "20px",
          background: borderColor,
        }}
      />
      )}

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        title="Duplicate"
        style={{
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
        }}
      >
        <CopyPlus className="w-4 h-4" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete"
        style={{
          width: "28px",
          height: "28px",
          padding: "4px",
          borderRadius: "50%",
          border: "none",
          backgroundColor: "transparent",
          color: "#ef4444",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}
