import { ArrowUpRight, BriefcaseBusiness, FileText, Mic } from "lucide-react";
import { Link } from "react-router-dom";

const links = [
  { to: "/candidate/cv", title: "Hồ sơ & CV", description: "Chuẩn bị hồ sơ cho cơ hội tiếp theo.", icon: FileText },
  { to: "/candidate/jobs", title: "Khám phá việc làm", description: "Tìm vị trí phù hợp với định hướng của bạn.", icon: BriefcaseBusiness },
  { to: "/candidate/practice", title: "Luyện phỏng vấn", description: "Chuẩn bị câu trả lời và luyện tập cùng AI.", icon: Mic },
];

export function CandidateQuickLinks() {
  return (
    <section className="border-t border-[var(--color-border-default)] pt-8" aria-labelledby="candidate-quick-links">
      <h2 id="candidate-quick-links" className="text-lg font-semibold">Chuẩn bị cho bước tiếp theo</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {links.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-w-0 items-start gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm hover:border-brand-primary/40 hover:bg-[var(--color-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
            <Icon className="mt-1 size-5 shrink-0 text-brand-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[var(--color-on-surface-variant)]">{description}</p></div>
            <ArrowUpRight className="mt-1 size-4 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
