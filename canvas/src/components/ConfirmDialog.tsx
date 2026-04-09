interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: "dark" | "light";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  theme,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className={`confirm-dialog ${theme === "light" ? "light" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-title">{title}</div>
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
