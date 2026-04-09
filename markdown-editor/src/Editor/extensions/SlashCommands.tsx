import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
    type SuggestionOptions,
    type SuggestionProps,
} from "@tiptap/suggestion";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
    type ReactElement,
} from "react";

export interface CommandItem {
  title: string;
  description: string;
  icon: ReactElement;
  command: (props: { editor: any; range: any }) => void;
}

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length,
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="slash-menu-empty">
          <span className="text-muted-foreground text-sm">No results</span>
        </div>
      );
    }

    return (
      <div className="slash-menu">
        {props.items.map((item, index) => (
          <button
            type="button"
            className={`slash-menu-item ${index === selectedIndex ? "is-selected" : ""}`}
            key={item.title}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="slash-menu-item-icon">{item.icon}</span>
            <div className="slash-menu-item-content">
              <span className="slash-menu-item-title">{item.title}</span>
              <span className="slash-menu-item-description">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  },
);

CommandList.displayName = "CommandList";

// Icons as simple SVG components
const Heading1Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="m17 12 3-2v8" />
  </svg>
);

const Heading2Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
  </svg>
);

const Heading3Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
    <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
  </svg>
);

const BulletListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);

const OrderedListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="10" x2="21" y1="6" y2="6" />
    <line x1="10" x2="21" y1="12" y2="12" />
    <line x1="10" x2="21" y1="18" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </svg>
);

const QuoteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
  </svg>
);

const CodeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const DividerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" x2="21" y1="12" y2="12" />
  </svg>
);

const MathIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20h16" />
    <path d="M4 4h10" />
    <path d="m8 4-4 16" />
    <path d="M14 12h6" />
    <path d="M17 9v6" />
  </svg>
);

const TableIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

const TaskListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="6" height="6" rx="1" />
    <path d="m3 17 2 2 4-4" />
    <path d="M13 6h8" />
    <path d="M13 12h8" />
    <path d="M13 18h8" />
  </svg>
);

const CalloutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

// Header height constant - adjust if your header height changes
const HEADER_HEIGHT = 52;

// Default command items
const defaultCommands: CommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1Icon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2Icon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3Icon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <BulletListIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <OrderedListIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote",
    icon: <QuoteIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Add a code snippet",
    icon: <CodeIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Add a horizontal divider",
    icon: <DividerIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Math Block",
    description: "Add a LaTeX math equation",
    icon: <MathIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent("$$\n\\LaTeX\n$$")
        .run();
    },
  },
  {
    title: "Table",
    description: "Insert a table with rows and columns",
    icon: <TableIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Task List",
    description: "Create a to-do checklist",
    icon: <TaskListIcon />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Callout",
    description: "Add an info callout box",
    icon: <CalloutIcon />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .insertContent("ℹ️ ")
        .run();
    },
  },
];

// Suggestion configuration
const suggestion: Omit<SuggestionOptions<CommandItem>, "editor"> = {
  char: "/",
  items: ({ query }: { query: string }) => {
    return defaultCommands.filter((item) =>
      item.title.toLowerCase().startsWith(query.toLowerCase()),
    );
  },
  command: ({ editor, range, props }) => {
    props.command({ editor, range });
  },
  render: () => {
    let component: ReactRenderer<CommandListRef> | null = null;
    let popup: HTMLDivElement | null = null;
    let scrollParent: HTMLElement | null = null;

    const updatePosition = (clientRect: (() => DOMRect | null) | null) => {
      if (!clientRect || !popup) return;

      const rect = clientRect();
      if (rect) {
        // Use absolute positioning relative to the document
        popup.style.position = "absolute";
        popup.style.left = `${rect.left + window.scrollX}px`;

        // Calculate top position
        let top = rect.bottom + window.scrollY + 8;

        // Ensure popup doesn't appear above the header
        const minTop = HEADER_HEIGHT + window.scrollY;
        if (top < minTop) {
          top = minTop;
        }

        popup.style.top = `${top}px`;
        popup.style.zIndex = "50";
      }
    };

    const handleScroll = () => {
      // Re-query position from component props if available
      if (component && popup) {
        const props = (component as any).props;
        if (props?.clientRect) {
          updatePosition(props.clientRect);
        }
      }
    };

    return {
      onStart: (props: SuggestionProps<CommandItem>) => {
        component = new ReactRenderer(CommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = document.createElement("div");
        popup.className = "slash-menu-popup";
        document.body.appendChild(popup);
        popup.appendChild(component.element);

        updatePosition(props.clientRect ?? null);

        // Find scroll parent and listen for scroll events
        scrollParent = props.editor.view.dom.closest(
          ".overflow-auto",
        ) as HTMLElement;
        if (scrollParent) {
          scrollParent.addEventListener("scroll", handleScroll);
        }
        window.addEventListener("scroll", handleScroll);
      },

      onUpdate: (props: SuggestionProps<CommandItem>) => {
        component?.updateProps(props);
        updatePosition(props.clientRect ?? null);
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          component?.destroy();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        if (scrollParent) {
          scrollParent.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("scroll", handleScroll);
        popup?.remove();
        component?.destroy();
        popup = null;
        component = null;
        scrollParent = null;
      },
    };
  },
};

// The SlashCommands extension
export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
