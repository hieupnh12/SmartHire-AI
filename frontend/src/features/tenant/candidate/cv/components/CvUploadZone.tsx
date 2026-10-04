import { useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { CV_ACCEPT } from "../constants/cvStatus";

export function CvUploadZone({ pending, error, onFile }: { pending: boolean; error: string | null; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <label
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !pending) onFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-primary)] ${dragging ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]" : "border-slate-300 bg-white hover:border-[var(--color-primary)]"} ${pending ? "pointer-events-none opacity-70" : ""}`}
      >
        <span className="grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-5" aria-hidden="true" />}
        </span>
        <span className="text-sm font-semibold text-slate-800">{pending ? "Đang tải CV lên…" : "Kéo thả hoặc chọn file CV"}</span>
        <span className="text-xs text-slate-500">Hỗ trợ PDF, DOC, DOCX</span>
        <input
          type="file"
          className="sr-only"
          accept={CV_ACCEPT}
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
