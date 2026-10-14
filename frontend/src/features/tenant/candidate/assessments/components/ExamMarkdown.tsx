import { Fragment, type ReactNode } from "react";

// Render a safe Markdown subset as React nodes; authored HTML is always plain text.
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[var(--color-surface-container)] px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function ExamMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3);
      const code: string[] = [];
      while (++index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index]);
      blocks.push(<figure key={index} className="min-w-0 overflow-hidden rounded-lg bg-[var(--color-surface-container-low)]">{language && <figcaption className="px-3 pt-2 text-xs text-[var(--color-on-surface-variant)]">{language}</figcaption>}<pre className="overflow-x-auto p-3 text-xs"><code>{code.join("\n")}</code></pre></figure>);
    } else if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const headers = cells(line);
      const rows: string[][] = [];
      index++;
      while (index + 1 < lines.length && lines[index + 1].includes("|") && lines[index + 1].trim()) rows.push(cells(lines[++index]));
      blocks.push(<div key={index} className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr>{headers.map((cell, i) => <th key={i} scope="col" className="border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-2">{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{headers.map((_, j) => <td key={j} className="border border-[var(--color-border-default)] p-2">{inline(row[j] ?? "")}</td>)}</tr>)}</tbody></table></div>);
    } else if (/^#{1,6}\s/.test(line)) {
      blocks.push(<h3 key={index} className="font-semibold leading-6">{inline(line.replace(/^#{1,6}\s+/, ""))}</h3>);
    } else if (/^\s*([-*+]\s|\d+\.\s)/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [line];
      while (index + 1 < lines.length && (ordered ? /^\s*\d+\.\s/ : /^\s*[-*+]\s/).test(lines[index + 1])) items.push(lines[++index]);
      const content = items.map((item, i) => <li key={i}>{inline(item.replace(/^\s*([-*+]\s|\d+\.\s)/, ""))}</li>);
      blocks.push(ordered ? <ol key={index} className="list-decimal space-y-1 pl-5">{content}</ol> : <ul key={index} className="list-disc space-y-1 pl-5">{content}</ul>);
    } else {
      const paragraph = [line];
      while (index + 1 < lines.length && lines[index + 1].trim() && !/^\s*(```|#{1,6}\s|[-*+]\s|\d+\.\s)/.test(lines[index + 1]) && !lines[index + 1].includes("|")) paragraph.push(lines[++index]);
      blocks.push(<p key={index} className="whitespace-pre-wrap break-words leading-7">{paragraph.map((part, i) => <Fragment key={i}>{i > 0 ? "\n" : ""}{inline(part)}</Fragment>)}</p>);
    }
  }
  return <div className="min-w-0 space-y-4 break-words text-sm">{blocks}</div>;
}
