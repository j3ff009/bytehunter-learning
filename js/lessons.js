(() => {
  "use strict";

  const app = window.ByteHunter;
  const visibility = window.ByteHunterVisibility;
  const friendlyDate = (value) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  const resourceLabel = { lesson: "Lesson", pdf: "PDF", reviewer: "Reviewer", quiz: "Quiz", activity: "Activity" };
  const resourceIcon = { lesson: "book", pdf: "file", reviewer: "cards", quiz: "quiz", activity: "check" };

  function resourceBadges(resources, format) {
    return Object.entries(resources || {}).map(([type, value]) => {
      const state = visibility.evaluate(value);
      if (!state.visible) return "";
      const symbol = state.status === "locked" ? "Locked" : "Ready";
      const label = type === "lesson" && format === "presentation" ? "Presentation" : resourceLabel[type] || type;
      return `<span class="badge ${state.status === "locked" ? "locked" : "available"}">${app.icon(type === "lesson" && format === "presentation" ? "cards" : resourceIcon[type] || "check")}${label}: ${symbol}</span>`;
    }).join("");
  }

  function lessonCard(lesson) {
    const lessonUrl = app.url(`lessons/${lesson.slug}/index.html`);
    const isPresentation = lesson.format === "presentation";
    const pdfAction = visibility.evaluate(lesson.resources.pdf).status === "published" ? `<a class="button secondary small" href="${app.url(`lessons/${lesson.slug}/${lesson.resources.pdf.file || "lesson.pdf"}`)}" download="${lesson.slug}.pdf">${app.icon("download")}Download PDF</a>` : "";
    const presentationActions = isPresentation ? `<div class="button-row lesson-card-actions"><a class="button small" href="${lessonUrl}">${app.icon("cards")}Open Presentation</a>${pdfAction}</div>` : "";
    return `<article class="card lesson-card" data-search-type="lesson">
      <span class="lesson-card-icon" aria-hidden="true">${app.icon(isPresentation ? "cards" : "book")}</span>
      <div class="meta"><span>${lesson.subject}</span><span>${lesson.category}</span></div>
      <h3><a href="${lessonUrl}">${lesson.title}</a></h3>
      <p>${lesson.description}</p>
      <div class="resource-badges" aria-label="Available resources">${resourceBadges(lesson.resources, lesson.format)}</div>
      ${presentationActions}
      <div class="meta lesson-card-footer"><span>${app.icon("calendar")}Updated ${friendlyDate(lesson.updatedDate)}</span><span>${app.icon("clock")}${lesson.readingTime}</span></div>
    </article>`;
  }

  function unavailable(host) {
    host.innerHTML = '<p class="empty" role="status">Content temporarily unavailable. Please try again shortly.</p>';
  }

  async function getLessons() {
    if (!window.ByteHunterLessonsPromise) window.ByteHunterLessonsPromise = app.fetchJSON("data/lessons.json");
    return window.ByteHunterLessonsPromise;
  }
  app.getLessons = getLessons;
  app.getLesson = async (id) => (await getLessons()).find((lesson) => lesson.id === id);

  async function renderHome() {
    const latestHost = document.querySelector("#latest-lessons");
    if (!latestHost) return;
    try {
      const lessons = (await getLessons()).filter((lesson) => visibility.evaluate(lesson.resources.lesson).status === "published");
      const newest = [...lessons].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
      latestHost.innerHTML = newest.slice(0, 6).map(lessonCard).join("") || '<p class="empty">No lessons are published yet.</p>';

      const popularHost = document.querySelector("#popular-lessons");
      if (popularHost) {
        const popular = lessons.filter((lesson) => lesson.popular);
        if (lessons.length < 2 || !popular.length) popularHost.closest("section")?.remove();
        else popularHost.innerHTML = popular.map(lessonCard).join("");
      }

      const reviewerHost = document.querySelector("#latest-reviewers");
      if (reviewerHost) {
        const published = newest.filter((lesson) => visibility.evaluate(lesson.resources.reviewer).status === "published");
        reviewerHost.innerHTML = published.map((lesson) => `<article class="card feature-card"><span class="lesson-card-icon" aria-hidden="true">${app.icon("cards")}</span><span class="eyebrow">Quick review + flashcards</span><h3>${lesson.title}</h3><p>${lesson.description}</p><a class="button small" href="${app.url(`lessons/${lesson.slug}/reviewer.html`)}">${app.icon("cards")}Open Reviewer</a></article>`).join("") || '<p class="empty">No reviewers are published yet.</p>';
      }

      const quizHost = document.querySelector("#quiz-list");
      if (quizHost) {
        const published = newest.filter((lesson) => visibility.evaluate(lesson.resources.quiz).status === "published");
        quizHost.innerHTML = published.map((lesson) => `<article class="card feature-card"><span class="lesson-card-icon" aria-hidden="true">${app.icon("quiz")}</span><span class="eyebrow">Interactive challenge</span><h3>${lesson.title}</h3><p>Test what you know with randomized questions and answer explanations.</p><a class="button small" href="${app.url(`lessons/${lesson.slug}/quiz.html`)}">${app.icon("quiz")}Take Quiz</a></article>`).join("") || '<p class="empty">No quizzes are published yet.</p>';
      }
    } catch (_) { unavailable(latestHost); }
  }

  async function renderSubject() {
    const host = document.querySelector("#subject-lessons");
    const subjectId = document.body.dataset.subjectId;
    if (!host || !subjectId) return;
    try {
      const lessons = (await getLessons()).filter((lesson) => visibility.evaluate(lesson.resources.lesson).status === "published" && (lesson.subjectIds || [lesson.subjectId]).includes(subjectId));
      host.innerHTML = lessons.map(lessonCard).join("") || '<p class="empty">No lessons are published in this path yet. Check back after the next content update.</p>';
    } catch (_) { unavailable(host); }
  }

  async function renderLessonPath() {
    const currentId = document.body.dataset.lessonId;
    const host = document.querySelector("#learning-path");
    if (!currentId || !host) return;
    try {
      const lessons = (await getLessons()).filter((item) => visibility.evaluate(item.resources.lesson).status === "published");
      const index = lessons.findIndex((lesson) => lesson.id === currentId);
      const lesson = lessons[index];
      const next = lessons[index + 1];
      if (!lesson) return;

      const items = [
        ["Lesson", "index.html", lesson.resources.lesson],
        ["Download PDF", lesson.resources.pdf?.file || "lesson.pdf", lesson.resources.pdf],
        ["Reviewer", "reviewer.html", lesson.resources.reviewer],
        ["Interactive Quiz", "quiz.html", lesson.resources.quiz],
        ["Activity", "activity.html", lesson.resources.activity]
      ].filter(([, , resource]) => visibility.evaluate(resource).visible);
      if (next) items.push([`Next: ${next.shortTitle}`, `../${next.slug}/index.html`, { status: "published" }]);

      host.innerHTML = `<h2>Skill path</h2><ol>${items.map(([label, href, resource]) => {
        const state = visibility.evaluate(resource);
        const current = document.body.dataset.resource === label.toLowerCase().replace("interactive ", "").replace("download ", "").replace(" ", "-");
        return `<li class="${current ? "current" : ""} ${state.status}">${state.status === "locked" ? `${label} — locked` : `<a href="${href}">${label}</a>`}</li>`;
      }).join("")}</ol>`;

      const relatedHost = document.querySelector("#related-lessons");
      if (relatedHost) {
        const lessonSubjects = lesson.subjectIds || [lesson.subjectId];
        const related = lessons.filter((item) => item.id !== lesson.id && (item.category === lesson.category || (item.subjectIds || [item.subjectId]).some((id) => lessonSubjects.includes(id)))).slice(0, 3);
        relatedHost.innerHTML = related.map(lessonCard).join("") || '<p class="empty">You have reached the end of this path for now.</p>';
      }
      const nextHost = document.querySelector("#next-lesson");
      if (nextHost && next) nextHost.innerHTML = `<span class="eyebrow">Continue to</span><h2>${next.title}</h2><p>${next.description}</p><a class="button" href="../${next.slug}/index.html">Next Lesson →</a>`;
    } catch (_) { unavailable(host); }
  }

  async function renderProducts() {
    const host = document.querySelector("#recommended-products");
    if (!host) return;
    try {
      const lessons = (await getLessons()).filter((lesson) => visibility.evaluate(lesson.resources.lesson).status === "published");
      const relevantIds = new Set(lessons.flatMap((lesson) => lesson.productIds || []));
      if (!relevantIds.size) { host.closest("section")?.remove(); return; }
      const all = await app.fetchJSON("data/products.json");
      const ids = (host.dataset.productIds || "").split(",").filter(Boolean);
      const products = all.filter((product) => relevantIds.has(product.id) && (!ids.length || ids.includes(product.id)));
      if (!products.length) { host.closest("section")?.remove(); return; }
      host.innerHTML = products.map((product) => `<article class="card"><div class="product-icon" role="img" aria-label="${product.name} placeholder">${product.icon}</div><span class="badge">Affiliate link</span><h3>${product.name}</h3><p>${product.description}</p><a class="button small" href="${product.affiliateUrl}" target="_blank" rel="nofollow sponsored noopener noreferrer">View Product</a></article>`).join("");
    } catch (_) { unavailable(host); }
  }

  renderHome();
  renderSubject();
  renderLessonPath();
  renderProducts();
})();
