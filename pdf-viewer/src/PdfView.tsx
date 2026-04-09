import { PdfReader } from "./PdfReader";
import type { View, ViewRenderProps } from "./types";
import { PDFInputSchema, PDFOutputSchema, type PDFInput, type PDFOutput } from "./types";

export function PDFView({ input }: Readonly<ViewRenderProps<PDFInput, PDFOutput>>) {
  // Check if data is URL or base64 (heuristic)
  const isUrl = input.data.startsWith("http") || input.data.startsWith("/");

  return (
    <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <PdfReader
        src={isUrl ? input.data : undefined}
        pdfData={!isUrl ? input.data : undefined}
        title={input.title}
        className="w-full h-full"
      />
    </div>
  );
}

export const pdfView: View<PDFInput, PDFOutput> = {
  name: "pdf-viewer",
  input: PDFInputSchema,
  output: PDFOutputSchema,
  render: (input, emit) => <PDFView input={input} emit={emit} />,
};
