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
const allowedPageTypes = new Set(["content", "definition", "comparison", "diagram", "example", "code", "summary"]);
for (const lesson of lessons) {
  const dir = join(root, "lessons", lesson.slug);
  for (const required of ["index.html", "lesson.json", "lesson-data.json"]) {
    if (!await exists(join(dir, required))) errors.push(`${lesson.id}: missing ${required}`);
  }

  const lessonPath = join(dir, "lesson.json");
  if (await exists(lessonPath)) {
    try {
      const readerLesson = JSON.parse(await readFile(lessonPath, "utf8"));
      if (readerLesson.id !== lesson.id) errors.push(`${lesson.id}: lesson.json id must match the catalog id`);
      if (!Number.isFinite(readerLesson.estimatedMinutes) || readerLesson.estimatedMinutes < 1) errors.push(`${lesson.id}: estimatedMinutes must be a positive number`);
      if (!Array.isArray(readerLesson.pages) || !readerLesson.pages.length) {
        errors.push(`${lesson.id}: lesson.json must contain at least one page`);
      } else {
        const pageIds = new Set();
        for (const [index, page] of readerLesson.pages.entries()) {
          const prefix = `${lesson.id}: page ${index + 1}`;
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.id || "")) errors.push(`${prefix} has an invalid id`);
          if (pageIds.has(page.id)) errors.push(`${lesson.id}: duplicate page id ${page.id}`);
          pageIds.add(page.id);
          if (!page.title || !page.content) errors.push(`${prefix} requires title and content`);
          if (!allowedPageTypes.has(page.type)) errors.push(`${prefix} has unsupported type ${page.type}`);
          if (page.showAdAfter !== undefined && typeof page.showAdAfter !== "boolean") errors.push(`${prefix} showAdAfter must be true or false`);
          if (page.image && !page.imageAlt) errors.push(`${prefix} has an image but no imageAlt`);
          if (page.image && !/^(?:https?:|data:)/i.test(page.image) && !await exists(normalize(join(dir, page.image)))) errors.push(`${prefix} has a missing image ${page.image}`);
        }
        if (readerLesson.pages.at(-1)?.type !== "summary") errors.push(`${lesson.id}: the final lesson page must use type summary`);
      }
    } catch (error) {
      errors.push(`${lesson.id}: could not validate lesson.json (${error.message})`);
    }
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
  if (!file.includes(join("lessons", "_template")) && /https:\/\/example\.com|mailto:[^"']+@example\.com/i.test(html)) {
    errors.push(`${file.slice(root.length + 1)}: replace placeholder public URLs before publishing`);
  }
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

for (const name of ["robots.txt", "sitemap.xml"]) {
  if ((await readFile(join(root, name), "utf8")).includes("https://example.com")) {
    errors.push(`${name}: replace the placeholder site URL before publishing`);
  }
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Validated ${files.length} files, ${lessons.length} page-by-page lessons, JSON schemas, published resources, images, and local HTML references.`);
