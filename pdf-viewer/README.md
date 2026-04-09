# View PDF

- Flows:
  - Render a centered placeholder for PDF payloads.
- Requirements:
  - Pure view; no IO or persistence.
  - Input uses `PDFInput` from `@aryazos/types/views/pdf`.
- UX:
  - Simple, centered summary text.
- Style:
  - `@aryazos/ui` primitives with Tailwind utilities.
- Data models:
  - `PDFInput` (data, name).
