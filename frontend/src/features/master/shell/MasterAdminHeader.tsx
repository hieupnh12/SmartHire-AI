
import { useNavigate } from "react-router-dom";
import { BrainCircuit } from "lucide-react";

interface MasterHeaderProps {
  isSidebarCollapsed: boolean;
}

export function MasterAdminHeader({ isSidebarCollapsed }: MasterHeaderProps) {
  const navigate = useNavigate();
  
  return (
    <header className="hidden">
      <div
        className={`mx-auto grid min-h-[84px] w-full max-w-[1536px] grid-cols-[5rem_minmax(0,1fr)] items-center transition-[grid-template-columns] duration-200 ${
          isSidebarCollapsed ? "" : "md:grid-cols-[16rem_minmax(0,1fr)]"
        }`}
      >
        {/* Logo & Platform Info */}
        <div
          className={`flex h-full min-w-0 cursor-pointer select-none items-center gap-3.5 border-r border-slate-200 px-3 ${
            isSidebarCollapsed ? "justify-center" : "justify-center md:justify-start"
          }`}
          onClick={() => navigate("/")}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white shadow-md shadow-blue-600/20 ring-1 ring-white/20">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="hidden min-w-0 md:block">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight text-slate-900 font-display sm:text-2xl">
                  SmartHire<span className="text-blue-600">.AI</span>
                </span>
              </div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[11px] text-slate-500 md:flex">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Master DB: PostgreSQL 16 · Online</span>
              </div>
            </div>
          )}
        </div>

        <div aria-hidden="true" />
      </div>
    </header>
  );
}
