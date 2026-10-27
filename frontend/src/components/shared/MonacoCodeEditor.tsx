import { useRef, useId } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/sql/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

// Khởi tạo offline worker nội bộ (không phụ thuộc CDN)
if (typeof window !== "undefined" && !self.MonacoEnvironment) {
  self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
  loader.config({ monaco });
}

export function normalizeMonacoLanguage(lang?: string): string {
  if (!lang) return "java";
  const l = lang.trim().toLowerCase();
  if (l === "c++" || l === "c" || l === "cpp") return "cpp";
  if (l === "py" || l === "python") return "python";
  if (l === "js" || l === "javascript" || l === "ts" || l === "typescript") return "javascript";
  if (l === "sql" || l === "postgres" || l === "mysql") return "sql";
  return "java";
}

export interface MonacoCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  onMount?: OnMount;
  theme?: "vs-dark" | "vs-light" | "hc-black";
  fontSize?: number;
  lineNumbers?: "on" | "off" | "relative" | "interval";
  minimap?: boolean;
}

export function MonacoCodeEditor({
  value,
  onChange,
  language = "java",
  height = "200px",
  readOnly = false,
  className = "",
  placeholder,
  onMount,
  theme = "vs-dark",
  fontSize = 13,
  lineNumbers = "on",
  minimap = false,
}: MonacoCodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoLang = normalizeMonacoLanguage(language);
  const containerId = useId();

  const handleEditorMount: OnMount = (editor, m) => {
    editorRef.current = editor;
    if (onMount) {
      onMount(editor, m);
    }
  };

  return (
    <div
      id={`monaco-wrapper-${containerId}`}
      className={`relative overflow-hidden rounded-xl border border-slate-700 bg-[#1e1e1e] shadow-sm ${className}`}
      style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
    >
      <Editor
        height={height}
        language={monacoLang}
        theme={theme}
        value={value ?? ""}
        onChange={(val) => {
          if (!readOnly && onChange) {
            onChange(val ?? "");
          }
        }}
        onMount={handleEditorMount}
        loading={
          <div className="flex h-full min-h-[160px] items-center justify-center bg-[#1e1e1e] text-xs text-slate-400">
            <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Đang tải Monaco Editor...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: minimap },
          fontSize,
          lineHeight: 20,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          lineNumbers,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 8,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",
          renderWhitespace: "none",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          contextmenu: true,
          padding: { top: 8, bottom: 8 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
      {!value && placeholder && (
        <div
          onClick={() => editorRef.current?.focus()}
          className="pointer-events-none absolute left-14 top-2 select-none font-mono text-xs text-slate-500"
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
export default MonacoCodeEditor;
