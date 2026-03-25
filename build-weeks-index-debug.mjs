import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { globSync } from "glob";
import e from "cors";

/**
 * Usage examples:
 *   node build-weeks-index.mjs --root "/path/to/ObsidianVault" --pattern "**\/*.md"
 *   node build-weeks-index.mjs --root "." --pattern "artifacts/**\/*.md"
 */

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const rootArg = arg("root", ".");                 // where your vault (or artifacts folder) lives
const pattern = arg("pattern", "**/*.md");        // what files to scan
const outFile = arg("out", "weeks-index.json");   // output index file
const requireWeek = arg("requireWeek", "false") === "true"; // optionally filter to only notes that have week
const birthdateStr = arg("birthdate", null);


//const rootAbs = path.resolve(process.cwd(), rootArg);
const rootAbs = path.resolve(
  rootArg.startsWith("~")
    ? path.join(process.env.HOME, rootArg.slice(1))
    : rootArg
);

let birthDate = null;
if (birthdateStr) {
  const [y, m, d] = birthdateStr.split("-").map(Number);
  birthDate = new Date(Date.UTC(y, m - 1, d, 12)); // noon UTC
  if (isNaN(birthDate)) {
    console.error("Invalid --birthdate, expected YYYY-MM-DD");
    process.exit(1);
  }
  console.log("Using birthdate:", birthDate.toISOString().slice(0, 10));
}

console.log("=== weeks index debug ===");
console.log("Node:", process.version);
console.log("cwd:", process.cwd());
console.log("rootArg:", rootArg);
console.log("rootAbs:", rootAbs);
console.log("pattern:", pattern);
console.log("outFile:", outFile);
console.log("requireWeek:", requireWeek);
console.log("========================\n");

// Sanity: does root exist?
if (!fs.existsSync(rootAbs)) {
  console.error("ERROR: root path does not exist:", rootAbs);
  process.exit(1);
}

// Glob from rootAbs
const matches = globSync(pattern, {
  cwd: rootAbs,
  nodir: true,
  dot: false,
  absolute: true,
});

console.log(`Glob matched ${matches.length} files.`);
if (matches.length === 0) {
  console.log("HINTS:");
  console.log("- Try a narrower pattern like: --pattern \"artifacts/**/*.md\"");
  console.log("- Or try: --pattern \"**/*.md\"");
  console.log("- Confirm you're pointing at the vault root with --root");
  process.exit(0);
}

console.log("\nFirst 10 matched files:");
matches.slice(0, 10).forEach((p, idx) => console.log(`${idx + 1}. ${p}`));
console.log("");

// Parse a few files verbosely
function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.warn("READ FAIL:", filePath, e.message);
    return null;
  }
}

function normalizeFrontmatter(data) {
  // Gray-matter will parse YAML; this just makes keys predictable.
  const fm = data ?? {};
  // Common aliases people use:
  if (fm.weeks && !fm.week) fm.week = fm.weeks;
  if (fm.weekIndex && !fm.week) fm.week = fm.weekIndex;
  if (fm.tags && typeof fm.tags === "string") fm.tags = [fm.tags];
  if (fm.date_start && !fm.date) 
    fm.date = fm.date_start
  else if (fm.date_end && !fm.date)
    fm.date = fm.date_end;
  console.log("Normalized frontmatter:", fm);
  return fm;
}

function weekIndexFromBirth(birthDate,artifactDateStr) {
  console.log(`Calculating week index from birth ${birthDate.toISOString().slice(0,10)} and dateStr ${artifactDateStr}`);
  if (!birthDate) return null;
  let date;
  if (artifactDateStr instanceof Date) {
    date = artifactDateStr;
  } else if (typeof artifactDateStr === "string") {
    const [y, m, d] = String(artifactDateStr).split("-").map(Number);
    date = new Date(Date.UTC(y, m - 1, d, 12));
  } else {
    date = new Date();
  }; 
  const diffDays = (date - birthDate) / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

const items = [];

for (const filePath of matches) {
  const txt = safeRead(filePath);
  if (txt == null) continue;

  let parsed;
  try {
    parsed = matter(txt);
  } catch (e) {
    console.warn("FRONTMATTER PARSE FAIL:", filePath, e.message);
    continue;
  }

  const fm = normalizeFrontmatter(parsed.data);

  // DEBUG: detect “no frontmatter at all”
  const hasFrontmatter = Object.keys(parsed.data || {}).length > 0;
  if (!hasFrontmatter) {
    // Uncomment if you want to see ALL files without frontmatter
    // console.log("NO FRONTMATTER:", path.relative(rootAbs, filePath));
  }

  if (requireWeek && (fm.week === undefined || fm.week === null || fm.week === "")) {
    continue;
  }

  const weekIndex = (
  fm.week ??
  weekIndexFromBirth(birthDate,fm.date)
  );
  console.log(`Week index: ${weekIndex}`);
  const rel = path.relative(rootAbs, filePath);

  // pick a title: frontmatter title > first H1 > filename
  let title = fm.title;
  if (!title) {
    const m = parsed.content.match(/^#\s+(.+)$/m);
    title = m ? m[1].trim() : path.basename(filePath, path.extname(filePath));
  }




  items.push({
    path: rel.replaceAll("\\", "/"),
    title,
    id: fm.id ?? null,
    week: weekIndex,
    date: fm.date ?? null,
    tags: fm.tags ?? [],
    type: fm.type ?? "note",
  });
}

console.log(`Parsed ${items.length} items after filtering.`);
if (items.length === 0) {
  console.log("\nNothing made it through parsing/filtering.");
  console.log("Check:");
  console.log("- Are you using YAML frontmatter with leading --- ?");
  console.log("- Did you set --requireWeek true accidentally?");
  console.log("- Are your keys named differently (e.g., week_start, when, etc.)?");
}

// If you want: show a couple parsed examples
console.log("\nSample parsed items (first 5):");
items.slice(0, 5).forEach((it, i) => console.log(i + 1, it));

// Write output
const outAbs = path.resolve(process.cwd(), outFile);
fs.writeFileSync(outAbs, JSON.stringify({ generatedAt: new Date().toISOString(), root: rootAbs, items }, null, 2));
console.log("\nWrote:", outAbs);
