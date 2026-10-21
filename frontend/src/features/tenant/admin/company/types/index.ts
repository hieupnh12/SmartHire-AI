/** COMPANY-01 — Company branding profile stored in the Master DB `tenants` table. */
export type CompanyProfile = {
  tenantId: string;
  companyName: string;
  subdomain: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  industry: string | null;
  companySize: string | null;
  verified: boolean;
};

export type UpdateCompanyProfileRequest = {
  companyName: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  address?: string;
  industry?: string;
  companySize?: string;
};

export type CompanyDirectory = {
  departments: string[];
  locations: string[];
};

export type CompanyEmailSetting = {
  configured: boolean;
  provider: string;
  mailUsername?: string;
  fromName?: string;
  isActive?: boolean;
  updatedAt?: string;
};

export type SaveCompanyEmailSettingRequest = {
  mailUsername: string;
  mailPassword?: string;
  fromName?: string;
  isActive?: boolean;
};

export type TestEmailConnectionRequest = {
  mailUsername: string;
  mailPassword?: string;
  fromName?: string;
  testRecipientEmail: string;
};
