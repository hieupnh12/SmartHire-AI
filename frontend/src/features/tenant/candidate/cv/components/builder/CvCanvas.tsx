import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Github, Globe, Linkedin, Mail, MapPin, Phone, Plus, Sparkles, X, type LucideIcon } from "lucide-react";
import type { CvBuilderData, CvBuilderDetail, CvBuilderPersonalInfo, CvBuilderSection } from "@/api/types/cv";
import { cvTemplates, type CvLayout } from "@/features/tenant/candidate/shared/constants/cvTemplates";
import { useCvBuilderStore } from "../../stores/useCvBuilderStore";
import { cvFonts, cvThemeStyle } from "../../constants/cvTheme";
import { resolveAvatarFrame } from "../../constants/cvAvatar";
import { cvFixedHeadings, cvFooter, sideSectionTypes } from "../../utils/createDefaultCv";
import { PAGE_HEIGHT_MM, paginateCv } from "../../utils/paginateCv";
import { AiSuggestDialog } from "./AiSuggestDialog";
import { AvatarSlot, LogoSlot } from "./AvatarSlot";
import { useCvReadOnly } from "./CvReadOnlyContext";
import { EditableSection } from "./EditableSection";
import { EditableText } from "./EditableText";
import { RichTextEditable } from "./RichTextEditable";

const TWO_COLUMN: CvLayout[] = ["split", "sidebar", "banner"];

const headings = {
  accent: "mb-2 border-b border-[color-mix(in_srgb,var(--color-primary)_35%,white)] pb-1 text-[13px] font-bold uppercase tracking-wider text-[var(--color-primary)]",
  dark: "mb-2 border-b border-slate-300 pb-1 text-[13px] font-bold uppercase tracking-wider text-slate-800",
  inverse: "mb-2 border-b border-white/40 pb-1 text-[12px] font-bold uppercase tracking-wider text-white",
};

const contactFields: Array<{ key: "email" | "phone" | "address" | "linkedin" | "github" | "website"; icon: LucideIcon; placeholder: string }> = [
  { key: "email", icon: Mail, placeholder: "Email" },
  { key: "phone", icon: Phone, placeholder: "Số điện thoại" },
  { key: "address", icon: MapPin, placeholder: "Địa chỉ" },
  { key: "linkedin", icon: Linkedin, placeholder: "linkedin.com/in/…" },
  { key: "github", icon: Github, placeholder: "github.com/…" },
  { key: "website", icon: Globe, placeholder: "Portfolio / Website" },
];

function Contacts({ info, vertical = false, className = "" }: { info: CvBuilderPersonalInfo; vertical?: boolean; className?: string }) {
  const updatePersonalInfo = useCvBuilderStore((s) => s.updatePersonalInfo);
  return (
    <ul className={`flex text-[12px] ${vertical ? "flex-col gap-1.5" : "flex-wrap gap-x-4 gap-y-1"} ${className}`}>
      {contactFields.map(({ key, icon: Icon, placeholder }) => (
        <li key={key} data-cv-field={key} className={`flex items-center gap-1.5 ${info[key] ? "" : "cv-print-empty"}`}>
          <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
          <EditableText value={info[key] ?? ""} onChange={(value) => updatePersonalInfo({ [key]: value })} placeholder={placeholder} label={placeholder} className="break-all" />
        </li>
      ))}
    </ul>
  );
}

function NameBlock({ info, nameClassName, titleClassName }: { info: CvBuilderPersonalInfo; nameClassName: string; titleClassName: string }) {
  const updatePersonalInfo = useCvBuilderStore((s) => s.updatePersonalInfo);
  return (
    <div>
      <h1 data-cv-field="fullName" className={nameClassName}>
        <EditableText value={info.fullName} onChange={(fullName) => updatePersonalInfo({ fullName })} placeholder="Họ và tên" label="Họ và tên" />
      </h1>
      <p className={titleClassName}>
        <EditableText value={info.title} onChange={(title) => updatePersonalInfo({ title })} placeholder="Vị trí ứng tuyển" label="Vị trí ứng tuyển" />
      </p>
    </div>
  );
}

function Summary({ info, heading, headingClassName }: { info: CvBuilderPersonalInfo; heading: string; headingClassName: string }) {
  const updatePersonalInfo = useCvBuilderStore((s) => s.updatePersonalInfo);
  const readOnly = useCvReadOnly();
  const [suggesting, setSuggesting] = useState(false);
  return (
    <section data-cv-field="summary" data-cv-block className={`group/summary relative ${info.summary ? "" : "cv-print-empty"}`}>
      {!readOnly && (
        <button
          type="button"
          onClick={() => setSuggesting(true)}
          className="cv-print-hidden absolute -top-1 right-0 z-10 hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:text-[var(--color-primary)] group-focus-within/summary:inline-flex group-hover/summary:inline-flex"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />AI gợi ý
        </button>
      )}
      {suggesting && (
        <AiSuggestDialog
          request={{
            kind: "summary",
            language: useCvBuilderStore.getState().cv?.language ?? "vi",
            headline: info.title,
            sectionType: "",
            itemTitle: "",
            itemSubtitle: "",
            text: info.summary,
          }}
          onApply={(summary) => updatePersonalInfo({ summary })}
          onClose={() => setSuggesting(false)}
        />
      )}
      <h2 className={headingClassName}>{heading}</h2>
      <RichTextEditable value={info.summary} onChange={(summary) => updatePersonalInfo({ summary })} placeholder="Tóm tắt ngắn về bản thân, mục tiêu nghề nghiệp…" label="Giới thiệu bản thân" />
    </section>
  );
}

const detailLabels = {
  vi: { fullName: "Họ và tên", phone: "Điện thoại", email: "Email", address: "Địa chỉ", linkedin: "LinkedIn", github: "GitHub", website: "Website", add: "Thêm dòng", newLabel: "Nhãn", newValue: "Nội dung" },
  en: { fullName: "Name", phone: "Phone No.", email: "Email", address: "Address", linkedin: "LinkedIn", github: "GitHub", website: "Website", add: "Add row", newLabel: "Label", newValue: "Value" },
};

const MAX_DETAILS = 12;

/** Key-value personal details table with the photo on the right (enterprise layout). */
function PersonalDetails({ info, heading, headingClassName, avatar }: { info: CvBuilderPersonalInfo; heading: string; headingClassName: string; avatar: ReactNode }) {
  const updatePersonalInfo = useCvBuilderStore((s) => s.updatePersonalInfo);
  const language = useCvBuilderStore((s) => s.cv?.language ?? "vi");
  const readOnly = useCvReadOnly();
  const labels = detailLabels[language];
  const details = info.details ?? [];
  const setDetails = (next: CvBuilderDetail[]) => updatePersonalInfo({ details: next });
  const th = "w-[1.35in] py-px pl-[0.25in] pr-2 text-left align-top font-normal";
  const fixedRow = (key: "fullName" | (typeof contactFields)[number]["key"]) => (
    <tr key={key} data-cv-field={key} className={info[key] ? "" : "cv-print-empty"}>
      <th scope="row" className={th}><span aria-hidden="true" className="-ml-3 mr-2">•</span>{labels[key]}</th>
      <td className={`py-px align-top ${key === "fullName" ? "font-bold uppercase" : ""}`}><EditableText value={info[key] ?? ""} onChange={(value) => updatePersonalInfo({ [key]: value })} placeholder={labels[key]} label={labels[key]} className="break-all" /></td>
    </tr>
  );

  return (
    <section data-cv-field="details" data-cv-block className="flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <h2 className={headingClassName}>{heading}</h2>
        <table className="w-full">
          <tbody>
            {fixedRow("fullName")}
            {details.map((detail, index) => (
              <tr key={index} className={`group/detail ${detail.value ? "" : "cv-print-empty"}`}>
                <th scope="row" className={th}>
                  <span aria-hidden="true" className="-ml-3 mr-2">•</span><EditableText value={detail.label} onChange={(label) => setDetails(details.map((row, i) => (i === index ? { ...row, label } : row)))} placeholder={labels.newLabel} label={labels.newLabel} />
                </th>
                <td className="relative py-0.5 pr-7 align-top">
                  <EditableText value={detail.value} onChange={(value) => setDetails(details.map((row, i) => (i === index ? { ...row, value } : row)))} placeholder={labels.newValue} label={labels.newValue} />
                  {!readOnly && (
                    <button type="button" title="Xóa dòng" aria-label="Xóa dòng" onClick={() => setDetails(details.filter((_, i) => i !== index))} className="cv-print-hidden absolute right-0 top-0.5 hidden size-5 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 group-focus-within/detail:grid group-hover/detail:grid">
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {contactFields.map(({ key }) => fixedRow(key))}
          </tbody>
        </table>
        {!readOnly && details.length < MAX_DETAILS && (
          <button type="button" onClick={() => setDetails([...details, { label: "", value: "" }])} className="cv-print-hidden ml-[0.25in] mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-semibold text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]">
            <Plus className="size-3.5" aria-hidden="true" />{labels.add}
          </button>
        )}
      </div>
      {avatar}
    </section>
  );
}

/** Running footer of each A4 page ("{name} – CV" · "Trang i / N"), printed as part of the page. */
function PageFooter({ cv, page, pages }: { cv: CvBuilderData; page: number; pages: number }) {
  const footer = cvFooter(cv);
  return (
    <div
      className={`absolute inset-x-[12mm] flex items-center justify-between text-[8pt] ${footer.centered ? "text-black" : "text-slate-500"}`}
      style={{ top: `calc(${page} * ${PAGE_HEIGHT_MM}mm - 11mm)`, fontFamily: footer.centered ? cvFonts.tahoma.family : cvFonts.compact.family }}
    >
      <span className={footer.centered ? "absolute left-1/2 -translate-x-1/2 truncate" : "truncate"}>{footer.text}</span>
      <span className="ml-auto shrink-0">{footer.centered ? page : `${footer.pageLabel} ${page} / ${pages}`}</span>
    </div>
  );
}

function SectionList({ sections, headingClassName, inverse = false, cards = false, table = false }: {
  sections: CvBuilderSection[];
  headingClassName: string | ((section: CvBuilderSection) => string);
  inverse?: boolean;
  cards?: boolean;
  table?: boolean;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <EditableSection
          key={section.id}
          section={section}
          prevId={sections[index - 1]?.id}
          nextId={sections[index + 1]?.id}
          headingClassName={typeof headingClassName === "function" ? headingClassName(section) : headingClassName}
          inverse={inverse}
          table={table}
          className={cards ? "rounded-lg border border-slate-200 p-3" : ""}
        />
      ))}
    </>
  );
}

/**
 * A4 pages: the layout flows in one column whose blocks are pushed past page boundaries by `paginateCv`;
 * footers sit at each page bottom and screen-only gaps separate the sheets.
 */
export function CvCanvas({ cv, ref, onPages }: { cv: CvBuilderData; ref?: Ref<HTMLDivElement>; onPages?: (pages: number) => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    let frame = 0;
    const run = () => setPages(paginateCv(area));
    run();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    });
    area.querySelectorAll("[data-cv-block]").forEach((block) => observer.observe(block));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [cv]);

  useEffect(() => {
    onPages?.(pages);
  }, [pages, onPages]);

  return (
    <div
      ref={areaRef}
      data-cv-pages={pages}
      className="cv-print-area relative mx-auto w-[210mm] bg-white shadow-[0_10px_40px_rgba(15,23,42,0.15)]"
      style={{ height: `calc(${pages} * ${PAGE_HEIGHT_MM}mm - 1px)` }}
    >
      <CanvasLayout cv={cv} ref={ref} />
      {Array.from({ length: pages }, (_, index) => <PageFooter key={index} cv={cv} page={index + 1} pages={pages} />)}
      {Array.from({ length: pages - 1 }, (_, index) => (
        <div key={index} aria-hidden="true" className="cv-page-guides absolute -inset-x-px h-4 -translate-y-1/2 bg-slate-100" style={{ top: `${(index + 1) * PAGE_HEIGHT_MM}mm` }} />
      ))}
    </div>
  );
}

function CanvasLayout({ cv, ref }: { cv: CvBuilderData; ref?: Ref<HTMLDivElement> }) {
  const layout = cvTemplates.find((item) => item.id === cv.templateId)?.layout ?? "single";
  const info = cv.personalInfo;
  const twoColumn = TWO_COLUMN.includes(layout);
  const main = twoColumn ? cv.sections.filter((section) => !sideSectionTypes.has(section.type)) : cv.sections;
  const side = twoColumn ? cv.sections.filter((section) => sideSectionTypes.has(section.type)) : [];
  const page = "relative min-h-full text-slate-700";
  const style = cvThemeStyle(cv.theme);
  const labels = cvFixedHeadings[cv.language ?? "vi"];
  const summary = (headingClassName: string) => <Summary info={info} heading={labels.summary} headingClassName={headingClassName} />;
  const avatar = (className: string, mode: "initials" | "optional" | "box") => (
    <AvatarSlot url={info.avatarUrl} avatarCrop={info.avatarCrop} name={info.fullName} frame={resolveAvatarFrame(cv.templateId, cv.theme)} className={className} mode={mode} />
  );

  if (layout === "sidebar") {
    return (
      <div ref={ref} style={style} className={`${page} grid grid-cols-[34%_1fr]`}>
        <aside className="space-y-6 bg-[var(--color-primary)] px-6 py-9 text-white">
          {avatar("mx-auto border-4 border-white/60 bg-white/20 text-3xl", "initials")}
          <div><h2 className={headings.inverse}>{labels.contact}</h2><Contacts info={info} vertical /></div>
          <SectionList sections={side} headingClassName={headings.inverse} inverse />
        </aside>
        <div className="space-y-6 px-8 py-9">
          <NameBlock info={info} nameClassName="text-[28px] font-bold leading-tight text-slate-900" titleClassName="mt-1 text-[15px] font-semibold text-[var(--color-primary)]" />
          {summary(headings.accent)}
          <SectionList sections={main} headingClassName={headings.accent} />
        </div>
      </div>
    );
  }

  if (layout === "banner") {
    return (
      <div ref={ref} style={style} className={page}>
        <header className="flex items-center gap-6 border-b-[6px] border-[var(--color-primary)] bg-slate-800 px-10 py-8 text-white">
          {avatar("border-4 border-white/30", "optional")}
          <div className="min-w-0 space-y-3">
            <NameBlock info={info} nameClassName="text-[28px] font-bold leading-tight" titleClassName="mt-1 text-[15px] text-slate-300" />
            <Contacts info={info} className="text-slate-200" />
          </div>
        </header>
        <div className="grid grid-cols-[1fr_34%] gap-8 px-10 py-8">
          <div className="space-y-6">{summary(headings.dark)}<SectionList sections={main} headingClassName={headings.dark} /></div>
          <div className="space-y-6 border-l border-slate-100 pl-6"><SectionList sections={side} headingClassName={headings.dark} /></div>
        </div>
      </div>
    );
  }

  if (layout === "cards") {
    return (
      <div ref={ref} style={style} className={`${page} space-y-4 px-9 py-9`}>
        <header className="flex items-center gap-5 rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] p-5">
          {avatar("bg-[var(--color-primary)] text-2xl text-white", "initials")}
          <div className="min-w-0 space-y-2">
            <NameBlock info={info} nameClassName="text-[26px] font-bold leading-tight text-slate-900" titleClassName="text-[14px] font-semibold text-[var(--color-primary)]" />
            <Contacts info={info} />
          </div>
        </header>
        <div className={`rounded-lg border border-slate-200 p-3 ${info.summary ? "" : "cv-print-empty"}`}>{summary(headings.accent)}</div>
        <SectionList sections={main} headingClassName={headings.accent} cards />
      </div>
    );
  }

  if (layout === "table") {
    // Mirrors the classic outsourcing Word CV: Tahoma 10pt black text, bold uppercase left headings,
    // gray centered bars for project/hobby sections, logo top-left with the name on the right.
    const plain = "mb-2 font-bold uppercase";
    const bar = "mb-3 bg-[#cccccc] py-px text-center font-bold italic uppercase";
    const headingFor = (section: CvBuilderSection) => (section.type === "projects" || section.type === "interests" ? bar : plain);
    return (
      <div ref={ref} style={{ fontFamily: cvFonts.tahoma.family, ...style }} className={`${page} space-y-5 px-[23mm] pb-10 pt-[20mm] !text-black`}>
        <header className="flex items-center justify-between gap-6">
          <LogoSlot url={info.logoUrl} />
          <div className="min-w-0 text-right">
            <NameBlock info={info} nameClassName="text-[16pt] font-bold uppercase leading-tight" titleClassName={`mt-1 ${info.title ? "" : "cv-print-empty"}`} />
          </div>
        </header>
        <PersonalDetails info={info} heading={labels.details} headingClassName={plain} avatar={avatar("text-2xl", "box")} />
        <Summary info={info} heading={cv.language === "en" ? "Professional Summary" : "Tóm tắt chuyên môn"} headingClassName={plain} />
        <SectionList sections={cv.sections} headingClassName={headingFor} table />
      </div>
    );
  }

  if (layout === "corporate") {
    return (
      <div ref={ref} style={style} className={`${page} space-y-5 px-12 py-10 font-serif`}>
        <header className="flex flex-col items-center gap-2 border-b-2 border-slate-800 pb-4 text-center">
          {avatar("border border-slate-300", "optional")}
          <NameBlock info={info} nameClassName="text-[28px] font-bold text-slate-900" titleClassName="text-[14px] text-slate-600" />
          <Contacts info={info} className="justify-center" />
        </header>
        {summary(headings.dark)}
        <SectionList sections={main} headingClassName={headings.dark} />
      </div>
    );
  }

  return (
    <div ref={ref} style={style} className={`${page} space-y-5 px-12 py-10`}>
      <header className={`flex items-center justify-between gap-6 pb-4 ${layout === "split" ? "border-b border-slate-200" : "border-b-2 border-[var(--color-primary)]"}`}>
        <div className="min-w-0 space-y-2">
          <NameBlock info={info} nameClassName="text-[28px] font-bold leading-tight text-slate-900" titleClassName="text-[15px] font-medium text-[var(--color-primary)]" />
          <Contacts info={info} className="text-slate-600" />
        </div>
        {avatar("border border-slate-200", "optional")}
      </header>
      {twoColumn ? (
        <div className="grid grid-cols-[1fr_36%] gap-8">
          <div className="space-y-5">{summary(headings.accent)}<SectionList sections={main} headingClassName={headings.accent} /></div>
          <div className="space-y-5"><SectionList sections={side} headingClassName={headings.accent} /></div>
        </div>
      ) : (
        <>
          {summary(headings.accent)}
          <SectionList sections={main} headingClassName={headings.accent} />
        </>
      )}
    </div>
  );
}
