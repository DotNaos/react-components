import Editor, { loader, type OnChange, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";

// Configure Monaco to use local package instead of CDN
loader.config({ monaco });

export interface CodeEditorProps {
  /** The code content */
  value: string;
  /** Called when the content changes */
  onChange?: (value: string) => void;
  /** Language for syntax highlighting (e.g., "json", "typescript", "javascript") */
  language?: string;
  /** Editor height (default: "400px") */
  height?: string | number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Theme: "vs-dark" | "light" */
  theme?: "vs-dark" | "light";
  /** Additional className for the container */
  className?: string;
  /** Monaco editor options override */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export function CodeEditor({
  value,
  onChange,
  language = "plaintext",
  height = "400px",
  readOnly = false,
  theme = "vs-dark",
  className,
  options,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loader.init().then(() => setIsLoading(false));
  }, []);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (newValue !== undefined && onChange) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  if (isLoading) {
    return (
      <div className={className} style={{ height, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e1e", borderRadius: "8px" }}>
        <span style={{ color: "#888" }}>Loading editor...</span>
      </div>
    );
  }

  return (
    <div className={className} style={{ borderRadius: "8px", overflow: "hidden" }}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          folding: true,
          formatOnPaste: true,
          formatOnType: true,
          ...options,
          readOnly,
        }}
      />
    </div>
  );
}
