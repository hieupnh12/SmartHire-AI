import { LucideIcon } from "lucide-react";

export type DashboardTab = 
  | "analytics" 
  | "leads" 
  | "tenants" 
  | "subscriptions" 
  | "invoices" 
  | "contracts" 
  | "logs" 
  | "account-profile" 
  | "account-security" 
  | "account-accessibility" 
  | "account-notifications";

export type SidebarGroupId = "overview" | "tenants" | "commerce" | "system" | "account";

export type SidebarItem = {
  tab?: DashboardTab;
  action?: () => void;
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};
