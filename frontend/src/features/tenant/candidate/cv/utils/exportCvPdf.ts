import { cvApi } from "@/api/tenant/cvApi";

/** Same-origin stylesheets are inlined; cross-origin ones (Google Fonts) can't be read, so they are @imported. */
function collectCss(): string {
  const imports: string[] = [];
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      rules.push(Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n"));
    } catch {
      if (sheet.href) imports.push(`@import url("${sheet.href}");`);
    }
  }
  return [...imports, ...rules].join("\n");
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** The PDF renderer can't reach this origin, so same-origin images (e.g. /cv-assets logos) are embedded. */
async function embedImages(root: HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll("img"), async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    const url = new URL(src, window.location.href);
    if (url.origin !== window.location.origin) {
      img.setAttribute("src", url.href);
      return;
    }
    const response = await fetch(url);
    if (response.ok) img.setAttribute("src", await toDataUrl(await response.blob()));
  }));
}

/** Sends the paginated read-only CV sheet to the backend PDF renderer and downloads the result. */
export async function downloadCvPdf(area: HTMLElement, fileName: string) {
  const clone = area.cloneNode(true) as HTMLElement;
  await embedImages(clone);
  const blob = await cvApi.exportPdf({ html: `<div class="cv-readonly">${clone.outerHTML}</div>`, css: collectCss() });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName.replace(/[\\/:*?"<>|]+/g, " ").trim() || "CV"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
