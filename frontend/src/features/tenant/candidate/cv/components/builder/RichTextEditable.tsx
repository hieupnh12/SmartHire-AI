import { useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { editableClass } from "./EditableText";
import { useCvReadOnly } from "./CvReadOnlyContext";

const commands = [
  { command: "bold", icon: Bold, label: "In đậm" },
  { command: "italic", icon: Italic, label: "In nghiêng" },
  { command: "insertUnorderedList", icon: List, label: "Danh sách gạch đầu dòng" },
  { command: "insertOrderedList", icon: ListOrdered, label: "Danh sách đánh số" },
] as const;

export function RichTextEditable({ value, onChange, placeholder, label, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const readOnly = useCvReadOnly();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || document.activeElement === element) return;
    const safe = sanitizeHtml(value);
    if (element.innerHTML !== safe) element.innerHTML = safe;
  }, [value]);

  const emit = () => {
    const element = ref.current;
    if (!element) return;
    onChange(element.textContent?.trim() ? sanitizeHtml(element.innerHTML) : "");
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  };

  return (
    <div className="relative">
      {focused && (
        <div role="toolbar" aria-label="Định dạng văn bản" className="cv-print-hidden absolute -top-9 left-0 z-20 flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-md">
          {commands.map(({ command, icon: Icon, label: commandLabel }) => (
            <button
              key={command}
              type="button"
              title={commandLabel}
              aria-label={commandLabel}
              onMouseDown={(event) => {
                event.preventDefault();
                document.execCommand(command);
                emit();
              }}
              className="grid size-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary)]"
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        role={readOnly ? undefined : "textbox"}
        aria-multiline={readOnly ? undefined : true}
        aria-label={readOnly ? undefined : label}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          emit();
        }}
        onInput={emit}
        onPaste={onPaste}
        className={`cv-rich-text cursor-text px-0.5 ${editableClass} ${className}`}
      />
    </div>
  );
}
