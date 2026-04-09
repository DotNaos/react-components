import { File, FileImage, FileText, Minus, Pencil, Plus } from "lucide-react";
import type { ReactElement } from "react";

interface FileItemProps {
  filepath: string;
  status: "added" | "deleted" | "modified";
  name?: string;
  type?: string;
}

function resolveIcon(filepath: string, type?: string): ReactElement {
  if (type === "drawing" || filepath.endsWith(".ink")) {
    return <Pencil className="text-base" />;
  }
  if (type === "pdf" || filepath.endsWith(".pdf")) {
    return <FileText className="text-base" />;
  }
  if (filepath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    return <FileImage className="text-base" />;
  }
  if (filepath.match(/\.(md|markdown|txt)$/i)) {
    return <FileText className="text-base" />;
  }
  return <File className="text-base" />;
}

export function FileItem({ filepath, status, name, type }: FileItemProps) {
  const StatusIcon = status === "added" ? Plus : status === "deleted" ? Minus : Pencil;
  const statusColor =
    status === "added" ? "text-green-500" : status === "deleted" ? "text-red-500" : "text-yellow-500";

  const filename = filepath.split("/").pop() || filepath;
  const displayName = name || filename;

  return (
    <li className="flex items-center gap-3 py-3 px-4 hover:bg-accent transition-colors text-sm border-b border-border last:border-0 group">
      <div className="w-5 h-5 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
        {resolveIcon(filepath, type)}
      </div>
      <span className="truncate font-medium flex-1 min-w-0 text-foreground/90">{displayName}</span>
      <StatusIcon
        className={`w-4 h-4 ${statusColor} shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}
      />
    </li>
  );
}
