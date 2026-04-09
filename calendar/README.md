# View Calendar

- Flows:
  - Render a centered placeholder with the current event count.
- Requirements:
  - Pure view; no IO or persistence.
  - Input uses `CalendarInput` from `@aryazos/types/views/calendar`.
- UX:
  - Simple, centered summary text.
- Style:
  - `@aryazos/ui` primitives with Tailwind utilities.
- Data models:
  - `CalendarInput` (events, selectedDate, viewMode).
