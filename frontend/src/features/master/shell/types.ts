import { LucideIcon } from "lucide-react";

export type DashboardTab = 
  | "home"
  | "analytics" 
  | "leads" 
  | "tenants" 
  | "subscriptions" 
  | "invoices" 
  | "contracts" 
  | "logs" 
  | "ai-usage"
  | "ai-quotas"
  | "ai-config"
  | "account-profile" 
  | "account-security" 
  | "account-accessibility" 
  | "account-notifications";

export type SidebarGroupId = "overview" | "analytics" | "tenants" | "commerce" | "system" | "account";

export type SidebarItem = {
  tab?: DashboardTab;
  path?: string;
  activePaths?: string[];
  action?: () => void;
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};
