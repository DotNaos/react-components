# View Markdown

- Flows:
  - Render the editor with provided markdown content.
  - Emit `onChange` and `onSave` events.
- Requirements:
  - Pure view; no IO or persistence.
  - Input/output use `MarkdownInput` and ports from `@aryazos/types/views/markdown`.
- UX:
  - Full-height editor with centered content column.
- Style:
  - Uses editor styles from the shared editor component.
- Data models:
  - `MarkdownInput` (content).
