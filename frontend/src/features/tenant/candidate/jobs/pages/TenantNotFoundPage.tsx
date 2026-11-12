import { FileQuestion } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { useT } from "@/i18n";

interface TenantNotFoundPageProps {
  subdomain: string;
}

export function TenantNotFoundPage({ subdomain }: TenantNotFoundPageProps) {
  const t = useT();

  useSeo({
    title: t("candidate.core.tenantNotFound.seoTitle"),
    robots: "noindex, nofollow",
  });

  const [before, after] = t("candidate.core.tenantNotFound.description", { subdomain: "\0" }).split("\0");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-4">
      <FileQuestion className="w-16 h-16 text-slate-400 mb-6 stroke-[1.5]" />
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">
        {t("candidate.core.tenantNotFound.heading")}
      </h1>
      <p className="text-slate-500 text-sm max-w-sm">
        {before}
        <strong className="font-medium text-slate-700">"{subdomain}"</strong>
        {after}
      </p>
    </div>
  );
}
