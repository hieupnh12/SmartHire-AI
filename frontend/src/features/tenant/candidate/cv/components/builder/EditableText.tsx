import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useCvReadOnly } from "./CvReadOnlyContext";

const placeholderClass = "empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]";
export const editableClass = `rounded-sm outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] focus:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--color-primary)_40%,transparent)] ${placeholderClass}`;

/** Single-line inline text; the DOM is only rewritten while unfocused so the caret never jumps. */
export function EditableText({ value, onChange, placeholder, label, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const readOnly = useCvReadOnly();

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && document.activeElement !== element && element.textContent !== value) element.textContent = value;
  }, [value]);

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLSpanElement>) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/\s+/g, " "));
  };

  return (
    <span
      ref={ref}
      role={readOnly ? undefined : "textbox"}
      aria-label={readOnly ? undefined : label}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
      onBlur={(event) => onChange((event.currentTarget.textContent ?? "").trim())}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={`inline-block min-w-[2ch] cursor-text px-0.5 ${editableClass} ${className}`}
    />
  );
}
