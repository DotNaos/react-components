import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Code, Italic } from "lucide-react";
import { useCallback, useRef } from "react";

interface FloatingToolbarProps {
  editor: Editor | null;
}

/**
 * A toolbar button that captures the selection on mousedown and applies
 * the formatting on click. This prevents issues where the selection is lost
 * between mousedown and click events.
 */
function ToolbarButton({
  editor,
  isActive,
  onToggle,
  title,
  children,
}: {
  editor: Editor;
  isActive: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Capture the current selection before any focus changes
      const { from, to } = editor.state.selection;
      selectionRef.current = { from, to };
    },
    [editor],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const selection = selectionRef.current;
      if (selection && selection.from !== selection.to) {
        // Restore selection and apply formatting
        editor
          .chain()
          .focus()
          .setTextSelection(selection)
          .run();
        onToggle();
      } else {
        // Fallback: just try to toggle with current selection
        editor.chain().focus().run();
        onToggle();
      }
      selectionRef.current = null;
    },
    [editor, onToggle],
  );

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`rounded p-1.5 hover:bg-muted ${
        isActive ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-md"
    >
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive("bold")}
        onToggle={() => editor.chain().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive("italic")}
        onToggle={() => editor.chain().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        isActive={editor.isActive("code")}
        onToggle={() => editor.chain().toggleCode().run()}
        title="Code (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
    </BubbleMenu>
  );
}
