import type { ReactNode } from "react";
import { z, type ZodType } from "zod";

/**
 * Calendar View Types
 */

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
}

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.date(),
  end: z.date(),
  allDay: z.boolean().optional(),
  description: z.string().optional(),
});

export interface CalendarInput {
  events: CalendarEvent[];
}

export const CalendarInputSchema = z.object({
  events: z.array(CalendarEventSchema),
});

export type CalendarOutput =
  | { type: "eventClick"; payload: CalendarEvent }
  | { type: "dateSelect"; payload: { date: Date } };

export const CalendarOutputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("eventClick"), payload: CalendarEventSchema }),
  z.object({ type: z.literal("dateSelect"), payload: z.object({ date: z.date() }) }),
]);

// --------------------------------------------------
// Core View Primitives (from libs/ts-views/src/view.ts)
// --------------------------------------------------

export type ViewRenderProps<Input, Output = any> = {
  input: Input;
  emit: (output: Output) => void;
};

/**
 * View<Input, Output>
 *
 * The core primitive of the Block Architecture.
 */
export type View<Input, Output> = {
  /** Stable identifier */
  name: string;

  /** Runtime contract: controller → view */
  input: ZodType<Input>;

  /** Runtime contract: view → controller */
  output: ZodType<Output>;

  /** Pure rendering */
  render: (
    input: Input,
    emit: (output: Output) => void
  ) => ReactNode;
};
