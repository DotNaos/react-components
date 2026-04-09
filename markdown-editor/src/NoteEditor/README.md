# Note Editor (Pure)

## Flows
- Renders a title input and markdown editor as a single shell.
- Emits title/content changes via callbacks.
- Optional save action and external-change banner via props.

## Requirements
- Pure UI + local interaction only (no IPC/network).
- Consumers provide load/save logic and persistence.

## UX
- Title and editor keep cursor flow (arrow and click bridging).
- Header can show back/save actions; content area is scrollable.

## Style
- Tailwind utility classes; no app-specific colors.

## Data Models
- NoteEditorShell props define title, content, dirty/loading state, and callbacks.
