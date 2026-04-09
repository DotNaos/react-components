# Drawing Editor (Pure)

## Flows
- Renders a drawing canvas with optional PDF background.
- Captures the canvas toolbar and renders it in the header.
- Emits drawing changes via callbacks.

## Requirements
- Pure UI + local interaction only (no IPC/network).
- Consumers provide data loading and persistence.

## UX
- Header includes back button, editable title (optional), and toolbar.
- If PDF data is present, drawing overlays the PDF viewer.

## Style
- Tailwind utility classes; theme selectable via props.

## Data Models
- DrawingEditorShell props define drawing data, optional PDF data, and callbacks.
