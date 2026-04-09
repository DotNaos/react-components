# Raw Editor (Pure)

## Flows
- Renders a header with optional back/copy/save actions.
- Shows a Monaco-based code editor with language helpers.

## Requirements
- Pure UI + local interaction only (no IPC/network/clipboard side effects).

## UX
- Shows file name/extension, copy/save actions, and read-only states.

## Style
- Tailwind utility classes; editor styles come from CodeEditor.

## Data Models
- RawEditorShell props define file identity, content, read-only state, and callbacks.
