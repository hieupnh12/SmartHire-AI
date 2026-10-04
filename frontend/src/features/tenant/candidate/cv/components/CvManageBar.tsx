import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, CopyPlus, Link2, Link2Off, Loader2, PencilLine, X } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import type { CvDetail } from "@/api/types/cv";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";

const buttonClass = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60";

export function CvManageBar({ cv, onDuplicated }: { cv: CvDetail; onDuplicated: (id: number) => void }) {
  const client = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const fromBuilder = cv.builderData !== null;
  const shareUrl = cv.shareToken ? `${window.location.origin}/cv/share/${cv.shareToken}` : null;

  const refresh = (detail?: CvDetail) => {
    if (detail) client.setQueryData(queryKeys.cvs.detail(detail.id), { success: true, message: "OK", data: detail });
    void client.invalidateQueries({ queryKey: queryKeys.cvs.detail(cv.id) });
    void client.invalidateQueries({ queryKey: queryKeys.cvs.mine });
  };

  const rename = useMutation({
    mutationFn: (value: string) => cvApi.rename(cv.id, value),
    onSuccess: (response) => {
      setRenaming(false);
      refresh(response.data);
    },
  });
  const duplicate = useMutation({
    mutationFn: () => cvApi.duplicate(cv.id),
    onSuccess: (response) => {
      refresh();
      onDuplicated(response.data.id);
    },
  });
  const share = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) await cvApi.share(cv.id);
      else await cvApi.unshare(cv.id);
    },
    onSuccess: () => refresh(),
  });

  const error = [rename, duplicate, share].find((mutation) => mutation.isError)?.error;

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) rename.mutate(name.trim());
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {renaming ? (
        <form onSubmit={submitRename} className="flex flex-wrap items-center gap-2">
          <label htmlFor="cv-rename" className="sr-only">Tên CV mới</label>
          <input id="cv-rename" autoFocus value={name} maxLength={200} onChange={(event) => setName(event.target.value)} className="min-h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,white)]" />
          <button type="submit" disabled={rename.isPending || !name.trim()} className={buttonClass}>{rename.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}Lưu tên</button>
          <button type="button" onClick={() => setRenaming(false)} className={buttonClass}><X className="size-4" aria-hidden="true" />Hủy</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setName(cv.originalFilename.replace(/\.[^.]+$/, "")); setRenaming(true); }} className={buttonClass}>
            <PencilLine className="size-4" aria-hidden="true" />Đổi tên
          </button>
          {fromBuilder && (
            <>
              <button type="button" onClick={() => duplicate.mutate()} disabled={duplicate.isPending} className={buttonClass}>
                {duplicate.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CopyPlus className="size-4" aria-hidden="true" />}Nhân bản
              </button>
              <button type="button" onClick={() => share.mutate(!shareUrl)} disabled={share.isPending} className={buttonClass}>
                {share.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : shareUrl ? <Link2Off className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
                {shareUrl ? "Tắt chia sẻ" : "Chia sẻ link"}
              </button>
            </>
          )}
        </div>
      )}
      {shareUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_8%,white)] p-2">
          <input readOnly value={shareUrl} aria-label="Link chia sẻ CV" onFocus={(event) => event.currentTarget.select()} className="min-h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" />
          <button type="button" onClick={() => void copyLink()} className={buttonClass}>
            {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Đã sao chép" : "Sao chép"}
          </button>
          <p className="w-full px-1 text-xs text-slate-500">Ai có link đều xem được CV này (không cần đăng nhập). Tắt chia sẻ để vô hiệu hóa link cũ.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{getApiErrorMessage(error)}</p>}
    </div>
  );
}
