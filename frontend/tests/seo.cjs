const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTsModule(relPath, customRequire) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObj = { exports: {} };
  vm.runInNewContext(transpiled, {
    exports: moduleObj.exports,
    module: moduleObj,
    require: customRequire,
  });
  return moduleObj.exports;
}

const seoMod = loadTsModule("src/lib/seo.ts", () => {
  throw new Error("Unexpected import in seo.ts");
});

const routeSeoMod = loadTsModule("src/lib/routeSeo.ts", (name) => {
  if (name === "@/lib/seo") return seoMod;
  throw new Error(`Unexpected import: ${name}`);
});

// 1. Utility assertions
assert.equal(seoMod.toAbsoluteUrl("/og-smarthire.png", "https://smarthire.top"), "https://smarthire.top/og-smarthire.png");
assert.equal(seoMod.toAbsoluteUrl("https://cdn.example.com/a.png", "https://smarthire.top"), "https://cdn.example.com/a.png");
assert.equal(seoMod.toAbsoluteUrl("", "https://smarthire.top"), "https://smarthire.top/og-smarthire.png");
assert.equal(seoMod.stripTextExcerpt("<p>Hello   <b>SmartHire</b></p>", 50), "Hello SmartHire");

// 2. Master domain routes
const homeSeo = routeSeoMod.resolveRouteSeo("/", null, "https://smarthire.top");
assert.equal(homeSeo.canonicalUrl, "https://smarthire.top/");
assert.ok(Array.isArray(homeSeo.jsonLd));
assert.ok(homeSeo.jsonLd.some((s) => s["@type"] === "Organization"));
assert.ok(homeSeo.jsonLd.some((s) => s["@type"] === "FAQPage"));

const packagesSeo = routeSeoMod.resolveRouteSeo("/packages", null, "https://smarthire.top");
assert.equal(packagesSeo.canonicalUrl, "https://smarthire.top/pricing");

const checkoutSeo = routeSeoMod.resolveRouteSeo("/checkout/PRO", null, "https://smarthire.top");
assert.equal(checkoutSeo.robots, "noindex, nofollow");

const adminSeo = routeSeoMod.resolveRouteSeo("/admin/dashboard", null, "https://smarthire.top");
assert.equal(adminSeo.robots, "noindex, nofollow");

// 3. Tenant domain routes
assert.equal(routeSeoMod.resolveRouteSeo("/", "acme", "https://acme.smarthire.top"), null);
assert.equal(routeSeoMod.resolveRouteSeo("/jobs/15", "acme", "https://acme.smarthire.top"), null);

const cvShareSeo = routeSeoMod.resolveRouteSeo("/cv/share/token-123", "acme", "https://acme.smarthire.top");
assert.equal(cvShareSeo.robots, "noindex, nofollow");

const cvGuideSeo = routeSeoMod.resolveRouteSeo("/cv-guide", "acme", "https://acme.smarthire.top");
assert.equal(cvGuideSeo.canonicalUrl, "https://acme.smarthire.top/cv-guide");

// 4. Tenant career & JobPosting JSON-LD
const careerHomeSeo = routeSeoMod.buildTenantCareerSeo({
  origin: "https://acme.smarthire.top",
  tenantName: "ACME",
  isJobsPage: false,
  isJobDetailPage: false,
  customLanding: {
    seo: {
      metaTitle: "ACME Careers — Tuyển dụng kỹ sư",
      metaDescription: "Gia nhập đội ngũ công nghệ ACME.",
      ogImageUrl: "/api/v1/public/landing/images/acme/banner.png",
    },
  },
});
assert.equal(careerHomeSeo.title, "ACME Careers — Tuyển dụng kỹ sư");
assert.equal(careerHomeSeo.description, "Gia nhập đội ngũ công nghệ ACME.");
assert.equal(careerHomeSeo.ogImage, "/api/v1/public/landing/images/acme/banner.png");

const jobSeo = routeSeoMod.buildTenantCareerSeo({
  origin: "https://acme.smarthire.top",
  tenantName: "ACME",
  isJobsPage: false,
  isJobDetailPage: true,
  detailLocation: "Hà Nội",
  job: {
    id: 99,
    title: "Senior Java Engineer",
    description: "Xây dựng hệ thống backend.",
    employmentType: "FULL_TIME",
    workMode: "REMOTE",
    skills: ["Java", "Spring Boot"],
    acceptingApplications: true,
    publishedAt: "2026-11-01T00:00:00Z",
    deadline: "2026-12-01T00:00:00Z",
    salary: "30000000 - 50000000 VND",
    salaryMin: 30000000,
    salaryMax: 50000000,
    salaryCurrency: "VND",
  },
});
assert.equal(jobSeo.canonicalUrl, "https://acme.smarthire.top/jobs/99");
const jobPosting = jobSeo.jsonLd.find((s) => s["@type"] === "JobPosting");
assert.ok(jobPosting);
assert.equal(jobPosting.title, "Senior Java Engineer");
assert.equal(jobPosting.jobLocationType, "TELECOMMUTE");
assert.equal(jobPosting.baseSalary.value.minValue, 30000000);
assert.equal(jobPosting.baseSalary.currency, "VND");

const job404Seo = routeSeoMod.buildTenantCareerSeo({
  origin: "https://acme.smarthire.top",
  tenantName: "ACME",
  isJobsPage: false,
  isJobDetailPage: true,
  jobNotFound: true,
});
assert.equal(job404Seo.robots, "noindex, nofollow");

console.log("All frontend SEO unit assertions passed.");

