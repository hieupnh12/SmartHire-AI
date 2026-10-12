import { useEffect, useRef, useState } from "react";
import { cvApi } from "@/api/tenant/cvApi";
import type { CvAvatarCrop } from "@/api/types/cv";
import { getApiErrorMessage } from "@/lib/axios";
import { useCvBuilderStore } from "../stores/useCvBuilderStore";
import { resolveAvatarFrame } from "../constants/cvAvatar";
import { PHOTO_SIZE, fitImage } from "../utils/cropAvatar";

type Draft = { src: string; blob: Blob | null };

/**
 * Picks and stores an image in personalInfo. Logos are scaled down and saved directly; photos open a crop dialog
 * (`crop`, render it with AvatarCropDialog) and are uploaded uncropped together with the chosen focus.
 */
export function useAvatarUpload(field: "avatarUrl" | "logoUrl" = "avatarUrl") {
  const updatePersonalInfo = useCvBuilderStore((s) => s.updatePersonalInfo);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => () => {
    if (draft?.blob) URL.revokeObjectURL(draft.src);
  }, [draft]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      if (field === "avatarUrl") {
        const blob = await fitImage(file, PHOTO_SIZE);
        setDraft({ src: URL.createObjectURL(blob), blob });
        return;
      }
      setPending(true);
      const response = await cvApi.uploadAvatar(await fitImage(file));
      updatePersonalInfo({ logoUrl: response.data.url });
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmCrop = async (avatarCrop: CvAvatarCrop) => {
    if (!draft) return;
    if (!draft.blob) {
      updatePersonalInfo({ avatarCrop });
      setDraft(null);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await cvApi.uploadAvatar(draft.blob);
      updatePersonalInfo({ avatarUrl: response.data.url, avatarCrop });
      setDraft(null);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  const templateId = useCvBuilderStore((s) => s.cv?.templateId);
  const theme = useCvBuilderStore((s) => s.cv?.theme);
  const savedCrop = useCvBuilderStore((s) => s.cv?.personalInfo.avatarCrop);
  const frame = templateId ? resolveAvatarFrame(templateId, theme) : null;

  return {
    inputRef,
    pending,
    error,
    pick: () => inputRef.current?.click(),
    /** Re-opens the crop dialog for the current photo. */
    adjust: () => {
      const url = useCvBuilderStore.getState().cv?.personalInfo.avatarUrl;
      if (url) setDraft({ src: url, blob: null });
    },
    remove: () => updatePersonalInfo(field === "avatarUrl" ? { avatarUrl: "", avatarCrop: null } : { logoUrl: "" }),
    crop: draft && frame ? {
      src: draft.src,
      ratio: frame.widthMm / frame.heightMm,
      round: frame.shape === "circle",
      initial: draft.blob ? null : savedCrop,
      saving: pending,
      error,
      onCancel: () => setDraft(null),
      onConfirm: (crop: CvAvatarCrop) => void confirmCrop(crop),
    } : null,
    inputProps: {
      ref: inputRef,
      type: "file" as const,
      accept: "image/jpeg,image/png,image/webp",
      className: "hidden",
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => void onFile(event.target.files?.[0]),
    },
  };
}
