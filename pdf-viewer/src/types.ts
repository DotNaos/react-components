import type { ReactNode } from "react";
import { z, type ZodType } from "zod";

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}


export const PDFInputSchema = z.object({
  /** URL or base64 data */
  data: z.string(),
  /** Optional title */
  title: z.string().optional(),
});

export type PDFInput = z.infer<typeof PDFInputSchema>;

export const PDFOutputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noop") }), // Read-only, no events yet
]);

export type PDFOutput = z.infer<typeof PDFOutputSchema>;

// View definitions (copied to avoid circular dependency on @aryazos/views)
export type ViewRenderProps<Input, Output = any> = {
  input: Input;
  emit: (output: Output) => void;
};

export type View<Input, Output> = {
  name: string;
  input: ZodType<Input>;
  output: ZodType<Output>;
  render: (
    input: Input,
    emit: (output: Output) => void
  ) => ReactNode;
};
