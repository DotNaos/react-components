import { z } from "zod";
import type { CanvasDrawingData } from "../types/drawingTypes";

export const CanvasDrawingRefSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
});

const CanvasDrawingDataSchema = z.custom<CanvasDrawingData>(
  (value) => typeof value === "object" && value !== null,
);

/** Input contract for the canvas view. */
export const CanvasInputSchema = z.object({
  drawing: CanvasDrawingRefSchema.nullable().optional(),
  data: CanvasDrawingDataSchema.nullable().optional(),
  readOnly: z.boolean().optional(),
});

export type CanvasInput = z.infer<typeof CanvasInputSchema>;

/** Output contract for canvas interactions. */
export const CanvasOutputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("change"), payload: CanvasDrawingDataSchema }),
]);

export type CanvasOutput = z.infer<typeof CanvasOutputSchema>;
