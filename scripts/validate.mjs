import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".sites-runtime") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
for (const file of files.filter((path) => extname(path) === ".json")) {
  try { JSON.parse(await readFile(file, "utf8")); }
  catch (error) { errors.push(`Invalid JSON: ${file.slice(root.length + 1)} (${error.message})`); }
}

const lessons = JSON.parse(await readFile(join(root, "data", "lessons.json"), "utf8"));
for (const lesson of lessons) {
  const dir = join(root, "lessons", lesson.slug);
  for (const required of ["index.html", "lesson-data.json"]) {
    if (!await exists(join(dir, required))) errors.push(`${lesson.id}: missing ${required}`);
  }
  const fileFor = { pdf: lesson.resources.pdf?.file || "lesson.pdf", reviewer: "reviewer.html", quiz: "quiz.html", activity: "activity.html" };
  for (const [type, resource] of Object.entries(lesson.resources)) {
    if (type === "lesson" || resource.status !== "published") continue;
    if (!await exists(join(dir, fileFor[type]))) errors.push(`${lesson.id}: published ${type} file is missing`);
  }
}

const attrPattern = /(?:href|src)=["']([^"']+)["']/gi;
for (const file of files.filter((path) => extname(path) === ".html")) {
  const html = await readFile(file, "utf8");
  let match;
  while ((match = attrPattern.exec(html))) {
    const value = match[1];
    if (!value || value.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value) || value.includes("LESSON_")) continue;
    const pathname = value.split(/[?#]/)[0];
    let target = normalize(join(dirname(file), pathname));
    if (pathname.endsWith("/")) target = join(target, "index.html");
    if (!await exists(target)) errors.push(`${file.slice(root.length + 1)}: broken local reference ${value}`);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Validated ${files.length} files, ${lessons.length} lessons, JSON syntax, published resources, and local HTML references.`);
