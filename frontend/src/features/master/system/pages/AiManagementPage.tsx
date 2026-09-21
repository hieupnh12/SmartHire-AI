import { useLocation } from "react-router-dom";
import { SystemManagementWorkspace, type SystemManagementView } from "../components/SystemManagementWorkspace";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

export function AiManagementPage() {
  const location = useLocation();
  const { tenants } = useMasterDashboard();
  let view: SystemManagementView = "ai-usage";
  if (location.pathname.endsWith("ai-quotas")) {
    view = "ai-quotas";
  } else if (location.pathname.endsWith("ai-config")) {
    view = "ai-config";
  }
  return <SystemManagementWorkspace view={view} tenants={tenants} />;
}
