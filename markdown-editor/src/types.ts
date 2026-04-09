import type { ReactNode } from "react";
import { z, type ZodType } from "zod";

export const MarkdownInputSchema = z.object({
  content: z.string(),
});

export type MarkdownInput = z.infer<typeof MarkdownInputSchema>;

export const MarkdownOutputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("change"), payload: z.string() }),
  z.object({ type: z.literal("save"), payload: z.string() }),
]);

export type MarkdownOutput = z.infer<typeof MarkdownOutputSchema>;

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
