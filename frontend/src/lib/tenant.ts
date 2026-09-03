export const getTenantIdFromWindow = (): string | null => {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Case A: acme.localhost (2 parts, parts[1] === 'localhost')
  if (parts.length === 2 && parts[1].toLowerCase() === 'localhost') {
    const subdomain = parts[0].toLowerCase();
    if (!['www', 'api', 'app', 'localhost'].includes(subdomain)) {
      return subdomain;
    }
  }

  // Case B: acme.smarthire.ai (3+ parts)
  if (parts.length > 2) {
    const subdomain = parts[0].toLowerCase();
    if (!['www', 'api', 'app', 'localhost'].includes(subdomain)) {
      return subdomain;
    }
  }

  // Check LocalStorage override
  const storedTenant = localStorage.getItem('smarthire_tenant_id');
  if (storedTenant) return storedTenant.toLowerCase();

  return null;
};

export const setTenantId = (tenantId: string | null): void => {
  if (tenantId) {
    localStorage.setItem('smarthire_tenant_id', tenantId);
  } else {
    localStorage.removeItem('smarthire_tenant_id');
  }
};
