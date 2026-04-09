import type { Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "katex/dist/katex.min.css";
import { useEffect, useRef } from "react";
import "./editor.css";
import { MathDecoration } from "./extensions/MathDecoration";
import { SlashCommands } from "./extensions/SlashCommands";
import { FloatingToolbar } from "./FloatingToolbar";

// Zero-width space to mark empty paragraphs in markdown (for saving)
const EMPTY_PARA_MARKER = "\u200B";

// Custom paragraph that preserves empty lines by using a zero-width space marker
const CustomParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers) => {
    const content = helpers.renderChildren(node.content || []);
    // If paragraph is empty, output a zero-width space to preserve the empty line
    if (!content || content.trim() === "") {
      return `${EMPTY_PARA_MARKER}\n\n`;
    }
    return `${content}\n\n`;
  },
});

export interface EditorProps {
  className?: string;
  placeholder?: string;
  /** The markdown content to display/edit */
  value: string;
  /** Called when content changes */
  onChange?: (value: string) => void;
  /** Event output port */
  onEvent?: (event: EditorEvent) => void;
  /** Whether the editor is in a loading state */
  isLoading?: boolean;
  /** Optional custom extension list (overrides defaults) */
  extensions?: Extension[];
}

export type EditorEvent =
  | { type: "save" }
  | { type: "boundary"; direction: "up" | "left"; offset: number };

export function Editor({
  className,
  placeholder = "Start writing...",
  value,
  onChange,
  onEvent,
  isLoading = false,
  extensions,
}: EditorProps) {
  // Track the last content we loaded to avoid unnecessary updates
  const lastLoadedContentRef = useRef<string>("");

  const defaultExtensions = [
    StarterKit.configure({
      paragraph: false, // Disable default paragraph to use our custom one
    }),
    CustomParagraph as Extension,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          const level = node.attrs.level as number;
          return `Heading ${level}`;
        }
        return placeholder;
      },
      showOnlyCurrent: true,
    }),
    Markdown,
    MathDecoration.configure({
      katexOptions: {
        throwOnError: false,
      },
    }),
    SlashCommands,
    Table.configure({
      resizable: true,
    }) as Extension,
    TableRow as Extension,
    TableHeader as Extension,
    TableCell as Extension,
    TaskList as Extension,
    TaskItem.configure({
      nested: true,
    }) as Extension,
  ] satisfies Extension[];

  const resolvedExtensions = useRef<Extension[]>(extensions ?? defaultExtensions);

  const editor = useEditor({
    extensions: resolvedExtensions.current,
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Get markdown content and call the callback
      const markdown = editor.getMarkdown();
      onChange?.(markdown);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
          event.preventDefault();
          onEvent?.({ type: "save" });
          return true;
        }
        // Handle arrow up at the start of the document
        if (event.key === "ArrowUp") {
          const { from } = view.state.selection;
          // Check if cursor is at the very start or in the first line
          const firstLineEnd = view.state.doc.firstChild?.nodeSize ?? 1;
          if (from <= firstLineEnd) {
            // Calculate cursor offset from start of first text node (subtract 1 for doc start)
            const cursorOffset = Math.max(0, from - 1);
            onEvent?.({ type: "boundary", direction: "up", offset: cursorOffset });
            return true;
          }
        }
        // Handle arrow left at the very start of the document
        if (event.key === "ArrowLeft") {
          const { from } = view.state.selection;
          // Position 1 is the start of text content (0 is before the doc node)
          if (from <= 1) {
            onEvent?.({ type: "boundary", direction: "left", offset: 0 });
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync editor content when store content changes (e.g., on load)
  // After loading, clean up ZWSP markers from paragraphs so they appear truly empty
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = editor.getMarkdown();

    if (value !== currentMarkdown && value !== lastLoadedContentRef.current) {
      lastLoadedContentRef.current = value;
      // Load the content (with ZWSP markers preserved so markdown parser creates separate paragraphs)
      editor.commands.setContent(value, {
        contentType: "markdown",
        emitUpdate: false,
      });

      // Now clean up: find paragraphs that only contain ZWSP and delete the marker
      // This makes them truly empty (placeholder shows, single backspace works)
      // Collect positions first, then delete in reverse order to keep positions valid
      const positionsToClean: number[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (
          node.type.name === "paragraph" &&
          node.textContent === EMPTY_PARA_MARKER
        ) {
          positionsToClean.push(pos);
        }
      });

      if (positionsToClean.length > 0) {
        // Delete in reverse order so positions remain valid
        const { tr } = editor.state;
        for (let i = positionsToClean.length - 1; i >= 0; i--) {
          const pos = positionsToClean[i];
          // pos is the paragraph start, pos+1 is start of content, delete the single ZWSP char
          tr.delete(pos + 1, pos + 2);
        }
        editor.view.dispatch(tr);
      }
    }
  }, [editor, value]);

  return (
    <div className={`relative ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[100px]">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <>
          <FloatingToolbar editor={editor} />
          <EditorContent editor={editor} className="max-w-none" />
        </>
      )}
    </div>
  );
}
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
