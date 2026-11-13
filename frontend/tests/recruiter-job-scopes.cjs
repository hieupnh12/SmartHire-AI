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

const navMod = loadTsModule("src/features/tenant/recruiter/nav.ts", () => {
  throw new Error("Unexpected import in nav.ts");
});
const permissionsMod = loadTsModule("src/features/tenant/recruiter/permissions.ts", (name) => {
  if (name === "@/features/tenant/recruiter/nav") return navMod;
  throw new Error(`Unexpected import: ${name}`);
});

assert.equal(permissionsMod.canViewAllJobs(null), false);
assert.equal(permissionsMod.canViewAllJobs(undefined), false);
assert.equal(permissionsMod.canViewAllJobs({ role: "TENANT_ADMIN", permissions: [] }), true);
assert.equal(permissionsMod.canViewAllJobs({ role: "ADMIN", permissions: [] }), true);
assert.equal(permissionsMod.canViewAllJobs({ role: "RECRUITER", permissions: undefined }), false);
assert.equal(permissionsMod.canViewAllJobs({ role: "RECRUITER", permissions: ["JOBS", "DASHBOARD"] }), false);
assert.equal(permissionsMod.canViewAllJobs({ role: "RECRUITER", permissions: ["JOBS", "JOBS_ALL"] }), true);
assert.equal(permissionsMod.canViewAllJobs({ role: "HR", permissions: ["JOBS_ALL_VIEW"] }), true);
assert.equal(permissionsMod.isCompanyAdminUser({ role: "TENANT_ADMIN" }), true);
assert.equal(permissionsMod.isCompanyAdminUser({ role: "RECRUITER" }), false);

console.log("Recruiter job scopes: 10 permission helper checks passed.");

