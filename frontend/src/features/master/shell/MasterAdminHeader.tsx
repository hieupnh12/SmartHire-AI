import { useNavigate } from "react-router-dom";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";

interface MasterHeaderProps {
  isSidebarCollapsed: boolean;
}

export function MasterAdminHeader({ isSidebarCollapsed }: MasterHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="hidden">
      <div
        className={`grid min-h-[84px] w-full grid-cols-[5rem_minmax(0,1fr)] items-center transition-[grid-template-columns] duration-200 ${
          isSidebarCollapsed ? "" : "md:grid-cols-[16rem_minmax(0,1fr)]"
        }`}
      >
        {/* Logo & Platform Info */}
        <div
          className={`group flex h-full min-w-0 cursor-pointer select-none items-center gap-3.5 border-r border-slate-200 px-3 ${
            isSidebarCollapsed ? "justify-center" : "justify-center md:justify-start"
          }`}
          onClick={() => navigate("/")}
        >
          <SmartHireLogo
            variant={isSidebarCollapsed ? "icon" : "full"}
            className="h-9"
          />
          {!isSidebarCollapsed && (
            <div className="mt-0.5 hidden items-center gap-1.5 text-[11px] text-slate-500 md:flex">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Master DB: PostgreSQL 16 · Online</span>
            </div>
          )}
        </div>

        <div aria-hidden="true" />
      </div>
    </header>
  );
}
