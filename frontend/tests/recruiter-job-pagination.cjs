const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTsModule(relPath) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleObj = { exports: {} };
  vm.runInNewContext(transpiled, {
    exports: moduleObj.exports,
    module: moduleObj,
    require: () => {
      throw new Error("Unexpected import");
    },
  });
  return moduleObj.exports;
}

const pagination = loadTsModule(
  "src/features/tenant/recruiter/dashboard/utils/jobPagination.ts",
);

// 1. URL page and size parsing
assert.equal(pagination.parsePageParam(null), 0);
assert.equal(pagination.parsePageParam(""), 0);
assert.equal(pagination.parsePageParam("0"), 0);
assert.equal(pagination.parsePageParam("-3"), 0);
assert.equal(pagination.parsePageParam("abc"), 0);
assert.equal(pagination.parsePageParam("1"), 0);
assert.equal(pagination.parsePageParam("3"), 2);

assert.equal(pagination.parsePageSizeParam(null), 5);
assert.equal(pagination.parsePageSizeParam("10"), 10);
assert.equal(pagination.parsePageSizeParam("20"), 20);
assert.equal(pagination.parsePageSizeParam("99"), 5);
assert.equal(pagination.parsePageSizeParam("abc"), 5);

// 2. Total pages and out-of-range clamping
assert.equal(pagination.computeTotalPages(0, 5), 0);
assert.equal(pagination.computeTotalPages(1, 5), 1);
assert.equal(pagination.computeTotalPages(6, 5), 2);
assert.equal(pagination.computeTotalPages(10, 0), 10);
assert.equal(pagination.clampPageIndex(5, 2), 1);
assert.equal(pagination.clampPageIndex(-1, 2), 0);
assert.equal(pagination.clampPageIndex(2, 0), 0);

const norm = (value) => Array.from(value);

// 3. Ellipsis never hides a single page (e.g. 4 pages)
assert.deepEqual(norm(pagination.getPaginationItems(1, 0)), []);
assert.deepEqual(norm(pagination.getPaginationItems(1, 1)), [1]);
assert.deepEqual(norm(pagination.getPaginationItems(1, 4)), [1, 2, 3, 4]);
assert.deepEqual(norm(pagination.getPaginationItems(1, 7)), [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(norm(pagination.getPaginationItems(1, 10)), [1, 2, 3, 4, 5, "ellipsis-end", 10]);
assert.deepEqual(norm(pagination.getPaginationItems(6, 10)), [1, "ellipsis-start", 5, 6, 7, "ellipsis-end", 10]);
assert.deepEqual(norm(pagination.getPaginationItems(9, 10)), [1, "ellipsis-start", 6, 7, 8, 9, 10]);

// 4. Expiring window & client-side page slicing
const now = Date.parse("2026-11-11T00:00:00Z");
const jobs = [
  { id: 1, deadline: "2026-11-10T23:59:59Z" }, // expired
  { id: 2, deadline: "2026-11-11T12:00:00Z" }, // in 12h
  { id: 3, deadline: "2026-11-18T00:00:00Z" }, // exactly 7d
  { id: 4, deadline: "2026-11-19T00:00:00Z" }, // > 7d
  { id: 5, deadline: null },
  { id: 6, deadline: "2026-11-12T00:00:00Z" },
  { id: 7, deadline: "2026-11-13T00:00:00Z" },
  { id: 8, deadline: "2026-11-14T00:00:00Z" },
  { id: 9, deadline: "2026-11-15T00:00:00Z" },
];
const expiring = jobs.filter((job) => pagination.isExpiringWithinWindow(job, now));
assert.deepEqual(
  expiring.map((job) => job.id),
  [2, 3, 6, 7, 8, 9],
);
assert.deepEqual(
  norm(pagination.slicePageItems(expiring, 0, 5)).map((job) => job.id),
  [2, 3, 6, 7, 8],
);
assert.deepEqual(
  norm(pagination.slicePageItems(expiring, 1, 5)).map((job) => job.id),
  [9],
);
// Out-of-range page clamps to last page
assert.deepEqual(
  norm(pagination.slicePageItems(expiring, 9, 5)).map((job) => job.id),
  [9],
);

console.log("Recruiter job pagination: all checks passed.");
