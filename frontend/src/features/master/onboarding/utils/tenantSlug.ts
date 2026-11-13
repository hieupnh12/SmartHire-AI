const LEGAL_PHRASES: readonly string[][] = [
  ["cong", "ty", "trach", "nhiem", "huu", "han"],
  ["trach", "nhiem", "huu", "han"],
  ["doanh", "nghiep", "tu", "nhan"],
  ["van", "phong", "dai", "dien"],
  ["xuat", "nhap", "khau"],
  ["mot", "thanh", "vien"],
  ["cong", "ty", "co", "phan"],
  ["cong", "ty", "tnhh"],
  ["cong", "ty"],
  ["co", "phan"],
  ["tap", "doan"],
  ["chi", "nhanh"],
  ["thuong", "mai"],
  ["dich", "vu"],
  ["dau", "tu"],
  ["phat", "trien"],
  ["san", "xuat"],
  ["xay", "dung"],
];

const LEGAL_SINGLE_TOKENS = new Set([
  "cty",
  "cp",
  "tnhh",
  "mtv",
  "dntn",
  "tmdv",
  "tm",
  "dv",
  "sx",
  "xd",
  "xnk",
  "dt",
  "pt",
  "vpdd",
  "ltd",
  "limited",
  "llc",
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "jsc",
  "co",
  "company",
  "pte",
  "gmbh",
  "plc",
]);

const GENERIC_SECTOR_PHRASES: readonly string[][] = [
  ["cong", "nghe", "thong", "tin"],
  ["cong", "nghe"],
  ["giai", "phap"],
  ["phan", "mem"],
  ["tai", "chinh"],
  ["vien", "thong"],
  ["he", "thong"],
  ["tu", "van"],
  ["truyen", "thong"],
  ["quoc", "te"],
];

function stripTokenPhrases(tokens: string[], phrases: readonly string[][], singleTokens?: Set<string>): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matchedLen = 0;
    for (const phrase of phrases) {
      if (i + phrase.length <= tokens.length && phrase.every((word, idx) => tokens[i + idx] === word)) {
        matchedLen = phrase.length;
        break;
      }
    }
    if (matchedLen > 0) {
      i += matchedLen;
      continue;
    }
    if (singleTokens && singleTokens.has(tokens[i])) {
      i += 1;
      continue;
    }
    result.push(tokens[i]);
    i += 1;
  }
  return result;
}

function formatSlugTokens(tokens: string[], maxLength: number): string {
  if (tokens.length === 0) return "";
  let working = [...tokens];
  while (working.length > 1 && /^[0-9]+$/.test(working[0])) {
    working = working.slice(1);
  }
  let joined = working.join("-");
  if (!joined) return "";
  if (!/^[a-z]/.test(joined)) {
    joined = `dn-${joined}`;
  }
  if (joined.length > maxLength) {
    const cut = joined.slice(0, maxLength + 1);
    const lastHyphen = cut.lastIndexOf("-");
    if (lastHyphen >= 3) {
      joined = cut.slice(0, lastHyphen);
    } else {
      joined = joined.slice(0, maxLength).replace(/-+$/g, "");
    }
  }
  joined = joined.replace(/^-+|-+$/g, "");
  return joined;
}

/**
 * Generate a concise, DNS-safe tenant code/subdomain slug from a company name.
 * Strips Vietnamese/English legal boilerplate ("Công ty Cổ phần", "TNHH", "Corp", ...)
 * and trims on word boundaries to keep generated slugs short and readable.
 */
export function generateTenantSlug(companyName: string, maxLength = 20): string {
  const normalized = companyName
    .trim()
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const rawTokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (rawTokens.length === 0) return "";

  const withoutLegal = stripTokenPhrases(rawTokens, LEGAL_PHRASES, LEGAL_SINGLE_TOKENS);
  const coreBase = withoutLegal.length > 0 ? withoutLegal : rawTokens;

  // Trim leading generic sector descriptors ("Công nghệ", "Tài chính", ...) only if a valid brand slug remains.
  let withoutSector = [...coreBase];
  let stripped = true;
  while (stripped && withoutSector.length > 0) {
    stripped = false;
    for (const phrase of GENERIC_SECTOR_PHRASES) {
      if (
        withoutSector.length > phrase.length &&
        phrase.every((word, idx) => withoutSector[idx] === word)
      ) {
        const candidateTokens = withoutSector.slice(phrase.length);
        const candidateSlug = formatSlugTokens(candidateTokens, maxLength);
        if (candidateSlug.length >= 3) {
          withoutSector = candidateTokens;
          stripped = true;
          break;
        }
      }
    }
  }

  let slug = formatSlugTokens(withoutSector, maxLength);
  if (slug.length < 3) {
    const fallbackSlug = formatSlugTokens(coreBase, maxLength);
    if (fallbackSlug.length >= 3) {
      slug = fallbackSlug;
    } else if (slug.length > 0) {
      slug = `${slug}-vn`;
    }
  }

  return slug;
}
