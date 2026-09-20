import { useLocation } from "react-router-dom";
import { SystemManagementWorkspace, type SystemManagementView } from "../components/SystemManagementWorkspace";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

export function AiManagementPage() {
  const location = useLocation();
  const { tenants } = useMasterDashboard();
  const view: SystemManagementView = location.pathname.endsWith("ai-quotas") ? "ai-quotas" : "ai-usage";
  return <SystemManagementWorkspace view={view} tenants={tenants} />;
}
