import { ToolType } from "../types/types";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CANVAS_CONSTANTS, SizeSlot } from "../types/types";
import { TaperedSlider } from "./TaperedSlider";

interface SizeSlotButtonProps {
  tool: ToolType;
  slot: SizeSlot;
  size: number;
  isActive: boolean;
  isCurrentTool: boolean;
  onSlotClick: () => void;
  onSizeChange: (size: number) => void;
  theme: "dark" | "light";
  /** If true, popover opens downward (for header toolbar) */
  openDown?: boolean;
}

export function SizeSlotButton({
  tool,
  slot,
  size,
  isActive,
  isCurrentTool,
  onSlotClick,
  onSizeChange,
  theme,
  openDown = false,
}: SizeSlotButtonProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [wasActive, setWasActive] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Track previous active state to detect re-clicks on active slot
  useEffect(() => {
    setWasActive(isActive && isCurrentTool);
  }, [isActive, isCurrentTool]);

  // Update popover position when shown
  useEffect(() => {
    if (showPopover && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (openDown) {
        setPopoverPosition({
          top: rect.bottom + 8, // 8px margin below
          left: rect.left + rect.width / 2,
        });
      } else {
        setPopoverPosition({
          top: rect.top - 8, // 8px margin above
          left: rect.left + rect.width / 2,
        });
      }
    }
  }, [showPopover, openDown]);

  const handleClick = () => {
    if (isActive && isCurrentTool && wasActive) {
      setShowPopover((prev) => !prev);
    } else {
      onSlotClick();
      setShowPopover(false);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [showPopover]);

  // Close popover when tool changes
  useEffect(() => {
    if (!isCurrentTool) {
      setShowPopover(false);
    }
  }, [isCurrentTool]);

  // Calculate visual size using log scale
  const minSize = CANVAS_CONSTANTS.MIN_SIZE;
  const maxSize = CANVAS_CONSTANTS.MAX_SIZE;
  const logMin = Math.log(minSize);
  const logMax = Math.log(maxSize);
  const logSize = Math.log(size);
  const sizeRatio = (logSize - logMin) / (logMax - logMin);

  const lineHeight = 2 + sizeRatio * 8;
  const circleDiameter = 6 + sizeRatio * 12;

  const steps = CANVAS_CONSTANTS.SIZE_STEPS;
  const currentStepIndex = steps.findIndex((s) => s >= size) ?? steps.length - 1;

  const isEraser = tool === "eraser";
  const fillColor =
    isActive && isCurrentTool
      ? theme === "dark"
        ? "#fff"
        : "#1a1a1a"
      : theme === "dark"
        ? "#6b7280"
        : "#9ca3af";

  const popoverContent = showPopover && (
    <div
      ref={popoverRef}
      className={`size-popover fixed ${theme === "light" ? "light" : ""}`}
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
        transform: openDown ? "translateX(-50%)" : "translate(-50%, -100%)",
        minWidth: "200px",
      }}
    >
      <div className="size-popover-header">
        {slot.charAt(0).toUpperCase() + slot.slice(1)} Size
      </div>
      <TaperedSlider
        value={currentStepIndex}
        min={0}
        max={steps.length - 1}
        onChange={(stepIndex) => onSizeChange(steps[stepIndex])}
        useStepIndex={true}
        theme={theme}
        showLabel={true}
        labelSuffix="px"
        labelValue={size}
      />
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`size-slot-btn ${isActive && isCurrentTool ? "active" : ""}`}
        onClick={handleClick}
        title={`${slot.charAt(0).toUpperCase() + slot.slice(1)} size (${size}px)`}
      >
        {isEraser ? (
          <div
            className="size-slot-circle"
            style={{
              width: circleDiameter,
              height: circleDiameter,
              borderRadius: "50%",
              border: `2px solid ${fillColor}`,
              backgroundColor: "transparent",
            }}
          />
        ) : (
          <div
            className="size-slot-line"
            style={{
              width: 18,
              height: lineHeight,
              backgroundColor: fillColor,
              borderRadius: lineHeight / 2,
            }}
          />
        )}
      </button>
      {popoverContent && createPortal(popoverContent, document.body)}
    </>
  );
}
