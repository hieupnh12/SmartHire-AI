import { createPortal } from "react-dom";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { useT } from "@/i18n";

const heading = "mt-5 text-sm font-semibold text-slate-900 first:mt-0";
const list = "mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700";

function renderXyzFormula(template: string) {
  return template.split(/(\{x\}|\{y\}|\{z\})/).map((part, index) => {
    if (part === "{x}") return <strong key={index}>[X]</strong>;
    if (part === "{y}") return <strong key={index}>[Y]</strong>;
    if (part === "{z}") return <strong key={index}>[Z]</strong>;
    return part;
  });
}

export function CvTipsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [skillsBefore, skillsAfter] = t("candidate.cv.tips.skillsBullet1").split("{example}");

  return createPortal(
    <div className="cv-print-hidden">
      <DetailDialog open title={t("candidate.cv.tips.title")} onClose={onClose}>
        <h3 className={heading}>{t("candidate.cv.tips.structureTitle")}</h3>
        <ul className={list}>
          <li><strong>{t("candidate.cv.tips.lengthLabel")}</strong> {t("candidate.cv.tips.lengthBody")}</li>
          <li><strong>{t("candidate.cv.tips.newestLabel")}</strong> {t("candidate.cv.tips.newestBody")}</li>
          <li><strong>{t("candidate.cv.tips.orderLabel")}</strong> {t("candidate.cv.tips.orderBody")}</li>
          <li><strong>{t("candidate.cv.tips.emailLabel")}</strong> {t("candidate.cv.tips.emailBody")}</li>
        </ul>
        <h3 className={heading}>{t("candidate.cv.tips.xyzTitle")}</h3>
        <p className="mt-2 text-sm text-slate-700">{renderXyzFormula(t("candidate.cv.tips.xyzFormula"))}</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-800"><strong>{t("candidate.cv.tips.badLabel")}</strong> {t("candidate.cv.tips.badExample")}</p>
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800"><strong>{t("candidate.cv.tips.goodLabel")}</strong> {t("candidate.cv.tips.goodExample")}</p>
        </div>
        <ul className={list}>
          <li>{t("candidate.cv.tips.xyzBullet1")}</li>
          <li>{t("candidate.cv.tips.xyzBullet2")}</li>
          <li>{t("candidate.cv.tips.xyzBullet3")}</li>
        </ul>
        <h3 className={heading}>{t("candidate.cv.tips.skillsTitle")}</h3>
        <ul className={list}>
          <li>{skillsBefore}<em>{t("candidate.cv.tips.skillsExample")}</em>{skillsAfter}</li>
          <li>{t("candidate.cv.tips.skillsBullet2")}</li>
        </ul>
      </DetailDialog>
    </div>,
    document.body,
  );
}
