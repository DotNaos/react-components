import type { ReactNode } from "react";
import type { ZodType } from "zod";

export type ViewRenderProps<Input, Output = any> = {
  input: Input;
  emit: (output: Output) => void;
};

/**
 * View<Input, Output>
 *
 * The core primitive of the Block Architecture.
 * Views are black boxes: Input → UI → Output. No external side effects.
 *
 * - Input: Data fed INTO the view (controller → view), validated by Zod
 * - Output: Events emitted OUT of the view (view → controller), validated by Zod
 * - render: Pure function that produces React elements
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
