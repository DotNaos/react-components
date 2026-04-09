import type { ReactNode } from "react";
import { z, type ZodType } from "zod";

const GitClientChangeStatusSchema = z.enum(["added", "deleted", "modified"]);

export const GitClientSnapshotSchema = z.object({
  oid: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type GitClientSnapshot = z.infer<typeof GitClientSnapshotSchema>;

export const GitClientCommitDiffEntrySchema = z.object({
  filepath: z.string(),
  status: GitClientChangeStatusSchema,
});

export type GitClientCommitDiffEntry = z.infer<typeof GitClientCommitDiffEntrySchema>;

export const GitClientChangeSchema = z.object({
  filepath: z.string(),
  status: GitClientChangeStatusSchema,
  name: z.string().optional(),
  type: z.string().optional(),
});

export type GitClientChange = z.infer<typeof GitClientChangeSchema>;

export const GitClientCheckoutSchema = z.object({
  oid: z.string().nullable(),
  isDetached: z.boolean(),
});

export type GitClientCheckoutState = z.infer<typeof GitClientCheckoutSchema>;

export const GitClientInputSchema = z.object({
  snapshots: z.array(GitClientSnapshotSchema),
  backups: z.array(GitClientSnapshotSchema),
  changes: z.array(GitClientChangeSchema),
  commitDiff: z.array(GitClientCommitDiffEntrySchema),
  currentCheckout: GitClientCheckoutSchema,
  loading: z.boolean(),
  refreshing: z.boolean(),
  hasPendingBackup: z.boolean(),
  headerTitle: z.string().optional(),
  className: z.string().optional(),
});

export type GitClientInput = z.infer<typeof GitClientInputSchema>;

export const GitClientOutputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("refresh"),
    payload: z.object({ showToast: z.boolean() }),
  }),
  z.object({ type: z.literal("create-snapshot") }),
  z.object({ type: z.literal("create-backup") }),
  z.object({ type: z.literal("push-backup") }),
  z.object({
    type: z.literal("checkout"),
    payload: z.object({ oid: z.string() }),
  }),
  z.object({ type: z.literal("restore-latest") }),
  z.object({
    type: z.literal("restore"),
    payload: z.object({ oid: z.string() }),
  }),
]);

export type GitClientOutput = z.infer<typeof GitClientOutputSchema>;

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
