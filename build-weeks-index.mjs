#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import matter from "gray-matter";

/**
 * Usage:
 *   node build-weeks-index.mjs --vault "/path/to/vault" --birthdate "1979-02-10" --out "./weeks-index.json"
 *
 * Frontmatter fields supported:
 *   - title (string)
 *   - id (string)                // stable unique id
 *   - date (YYYY-MM-DD)          // single date
 *   - start (YYYY-MM-DD)         // start date
 *   - end (YYYY-MM-DD)           // end date
 *   - tags (array|string)
 *   - type (string)
 *   - week (number)              // optional override (0-based or 1-based; see below)
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[k] = v;
    }
  }
  return args;
}

function toUtcNoon(dateStr) {
  // expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || "").trim());
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 12, 0, 0));
}

function daysBetweenUtcNoon(a, b) {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") {
    // allow "a, b, c"
    return tags.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function weekIndexFromDate(birthUtcNoon, dateUtcNoon) {
  const days = daysBetweenUtcNoon(birthUtcNoon, dateUtcNoon);
  return Math.floor(days / 7);
}

function clampInt(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(lo, Math.min(hi, Math.trunc(x)));
}

const args = parseArgs(process.argv);
const vaultArg = args.vault ? String(args.vault) : null;
const vault = vaultArg
  ? path.resolve(vaultArg.startsWith("~") ? path.join(process.env.HOME, vaultArg.slice(1)) : vaultArg)
  : null;
const outPath = args.out ? path.resolve(String(args.out)) : path.resolve("./weeks-index.json");
const birthdateStr = args.birthdate ? String(args.birthdate) : null;

if (!vault) {
  console.error("Missing --vault");
  process.exit(1);
}
if (!birthdateStr) {
  console.error("Missing --birthdate YYYY-MM-DD");
  process.exit(1);
}

const birth = toUtcNoon(birthdateStr);
if (!birth) {
  console.error("Invalid --birthdate. Use YYYY-MM-DD");
  process.exit(1);
}

const mdFiles = globSync("**/*.md", {
  cwd: vault,
  absolute: true,
  nodir: true,
  ignore: ["**/.obsidian/**", "**/node_modules/**"]
});

const artifacts = [];
const byWeek = {}; // weekIndex -> [artifactId]
const byTag = {};  // tag -> [artifactId]

for (const file of mdFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  const fm = parsed.data || {};

  const relPath = path.relative(vault, file).replaceAll(path.sep, "/");
  const fileName = path.basename(file, ".md");

  const title = (fm.title && String(fm.title)) || fileName;
  const id = (fm.id && String(fm.id)) || relPath; // fallback: stable path

  // Dates
  const date = fm.date ? toUtcNoon(fm.date) : null;
  const start = fm.start ? toUtcNoon(fm.start) : (date ? date : null);
  const end = fm.end ? toUtcNoon(fm.end) : null;

  // Optional explicit week override (useful for undated items)
  // If you store "week: 1234" and you mean "1234th week" (1-based), set week_base=1.
  const weekBase = args.week_base ? Number(args.week_base) : 0; // 0-based default
  let weekOverride = null;
  if (fm.week !== undefined && fm.week !== null && fm.week !== "") {
    const w = clampInt(fm.week, -100000, 100000);
    if (w !== null) weekOverride = w - weekBase;
  }

  let weekStart = null;
  let weekEnd = null;

  if (weekOverride !== null) {
    weekStart = weekOverride;
    weekEnd = weekOverride;
  } else if (start) {
    weekStart = weekIndexFromDate(birth, start);
    weekEnd = end ? weekIndexFromDate(birth, end) : weekStart;
  } else {
    // No date info: skip week assignment, but keep artifact in index
    weekStart = null;
    weekEnd = null;
  }

  const tags = normalizeTags(fm.tags);
  const type = fm.type ? String(fm.type) : null;

  const artifact = {
    id,
    title,
    path: relPath,
    type,
    tags,
    // store original strings too if you want:
    date: fm.date || null,
    start: fm.start || fm.date || null,
    end: fm.end || null,
    weekStart,
    weekEnd
  };

  artifacts.push(artifact);

  // Assign to weeks (inclusive range)
  if (weekStart !== null) {
    const w0 = Math.min(weekStart, weekEnd ?? weekStart);
    const w1 = Math.max(weekStart, weekEnd ?? weekStart);
    for (let w = w0; w <= w1; w++) {
      if (!byWeek[w]) byWeek[w] = [];
      byWeek[w].push(id);
    }
  }

  // Assign to tags
  for (const t of tags) {
    if (!byTag[t]) byTag[t] = [];
    byTag[t].push(id);
  }
}

// Optional: deterministic ordering
artifacts.sort((a, b) => {
  const aw = a.weekStart ?? 1e15;
  const bw = b.weekStart ?? 1e15;
  if (aw !== bw) return aw - bw;
  return a.title.localeCompare(b.title);
});

for (const k of Object.keys(byWeek)) byWeek[k].sort();
for (const k of Object.keys(byTag)) byTag[k].sort();

const index = {
  schema: "memoir-weeks-index/v1",
  generatedAt: new Date().toISOString(),
  vaultRoot: vault.replaceAll(path.sep, "/"),
  birthdate: birthdateStr,
  artifactCount: artifacts.length,
  artifacts,
  byWeek,
  byTag
};

fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Artifacts: ${artifacts.length}`);
console.log(`Weeks populated: ${Object.keys(byWeek).length}`);
console.log(`Tags populated: ${Object.keys(byTag).length}`);
