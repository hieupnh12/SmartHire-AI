import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");

async function loadCatalog(locale) {
  const entry = path.join(frontendDir, "src", "i18n", "locales", `${locale}.ts`);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
  });
  const code = result.outputFiles[0].text;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  return mod[locale];
}

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      out.set(key, v);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      throw new Error(`Invalid i18n value at "${key}": ${typeof v}`);
    }
  }
  return out;
}

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

async function main() {
  const [vi, en, ja] = await Promise.all([
    loadCatalog("vi"),
    loadCatalog("en"),
    loadCatalog("ja"),
  ]);
  const maps = {
    vi: flatten(vi),
    en: flatten(en),
    ja: flatten(ja),
  };

  const errors = [];
  for (const [key, viVal] of maps.vi) {
    if (!viVal.trim()) errors.push(`Empty value in vi: ${key}`);
    const viVars = placeholders(viVal);
    for (const loc of ["en", "ja"]) {
      if (!maps[loc].has(key)) {
        errors.push(`Missing key in ${loc}: ${key}`);
        continue;
      }
      const val = maps[loc].get(key);
      if (!val.trim()) errors.push(`Empty value in ${loc}: ${key}`);
      const vars = placeholders(val);
      if (JSON.stringify(vars) !== JSON.stringify(viVars)) {
        errors.push(`Placeholder mismatch at ${key}: vi={${viVars.join(",")}} vs ${loc}={${vars.join(",")}}`);
      }
    }
  }
  for (const loc of ["en", "ja"]) {
    for (const key of maps[loc].keys()) {
      if (!maps.vi.has(key)) {
        errors.push(`Extra key in ${loc} not in vi: ${key}`);
      }
    }
  }

  console.log(`Checked i18n catalogs: vi=${maps.vi.size} keys, en=${maps.en.size} keys, ja=${maps.ja.size} keys`);
  if (errors.length > 0) {
    console.error(`Found ${errors.length} i18n parity error(s):`);
    for (const err of errors.slice(0, 50)) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log("All 3 locales are 100% in sync.");

  if (process.argv.includes("--scan-vi")) {
    const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
    const hits = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (full.endsWith(path.join("src", "i18n"))) continue;
          walk(full);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          const content = fs.readFileSync(full, "utf8");
          if (viRegex.test(content)) hits.push(path.relative(frontendDir, full));
        }
      }
    }
    walk(path.join(frontendDir, "src"));
    console.log(`Files outside src/i18n containing Vietnamese characters (${hits.length}):`);
    for (const hit of hits) console.log(`  - ${hit}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

