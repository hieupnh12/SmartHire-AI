export const getTenantIdFromSubdomain = (): string | null => {
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

  // Case B: acme.smarthire.top or acme.smarthire.ai (3+ parts)
  if (parts.length > 2) {
    const subdomain = parts[0].toLowerCase();
    if (!['www', 'api', 'app', 'localhost'].includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
};

export const getTenantIdFromWindow = (): string | null => {
  return getTenantIdFromSubdomain() || localStorage.getItem('tenantId') || null;
};

export const getBaseDomain = (): string => {
  if (typeof window === 'undefined') return 'smarthire.top';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
    return 'localhost';
  }
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
};

export const getCentralOAuthRedirectUri = (): string => {
  if (typeof window === 'undefined') return 'https://smarthire.top/oauth/callback';
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  
  // Local development
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
    return `${window.location.protocol}//localhost${port}/oauth/callback`;
  }
  
  // Production / Staging central domain
  const baseDomain = getBaseDomain();
  return `${window.location.protocol}//${baseDomain}${port}/oauth/callback`;
};

export const buildTenantUrl = (tenantId: string, path: string = ''): string => {
  if (typeof window === 'undefined') return path || '/';

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : '';
  const tenantLower = tenantId.toLowerCase();

  // Local development: localhost, *.localhost, 127.0.0.1
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
    const currentSub = getTenantIdFromSubdomain();
    if (currentSub === tenantLower && hostname.endsWith('.localhost')) {
      return `${protocol}//${window.location.host}${normalizedPath}`;
    }
    return `${protocol}//${tenantLower}.localhost${port}${normalizedPath}`;
  }

  // Production / Staging central domain
  const baseDomain = getBaseDomain();
  return `${protocol}//${tenantLower}.${baseDomain}${port}${normalizedPath}`;
};

