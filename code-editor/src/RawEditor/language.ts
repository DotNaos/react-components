export function normalizeExtension(ext?: string | null): string {
  const trimmed = (ext ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
}

export function extensionFromName(name: string): string {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return "";
  return normalizeExtension(trimmed.slice(lastDot + 1));
}

export function languageFromExtension(ext: string): string {
  switch (normalizeExtension(ext)) {
    case "py":
      return "python";
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "yaml":
    case "yml":
      return "yaml";
    case "md":
    case "markdown":
      return "markdown";
    case "html":
      return "html";
    case "xml":
      return "xml";
    case "css":
      return "css";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "sql":
      return "sql";
    default:
      return "plaintext";
  }
}
