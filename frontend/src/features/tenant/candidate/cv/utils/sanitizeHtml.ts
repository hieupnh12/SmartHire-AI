const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "BR", "P", "DIV"]);
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE"]);

function clean(node: Element) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const element = child as Element;
    if (DROPPED_TAGS.has(element.tagName)) {
      element.remove();
      continue;
    }
    clean(element);
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
  }
}

/** Keeps only the formatting tags the CV builder supports; every attribute is removed. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body.firstElementChild;
  if (!root) return "";
  clean(root);
  return root.innerHTML;
}
