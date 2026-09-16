(() => {
  "use strict";

  const app = window.ByteHunter;
  const visibility = window.ByteHunterVisibility;
  const friendlyDate = (value) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  const resourceLabel = { lesson: "Lesson", pdf: "PDF", reviewer: "Reviewer", quiz: "Quiz", activity: "Activity" };

  function resourceBadges(resources) {
    return Object.entries(resources || {}).map(([type, value]) => {
      const state = visibility.evaluate(value);
      if (!state.visible) return "";
      const symbol = state.status === "locked" ? "Locked" : "Ready";
      return `<span class="badge ${state.status === "locked" ? "locked" : "available"}">${resourceLabel[type] || type}: ${symbol}</span>`;
    }).join("");
  }

  function lessonCard(lesson) {
    const lessonUrl = app.url(`lessons/${lesson.slug}/index.html`);
    return `<article class="card lesson-card" data-search-type="lesson">
      <div class="meta"><span>${lesson.subject}</span><span>${lesson.category}</span></div>
      <h3><a href="${lessonUrl}">${lesson.title}</a></h3>
      <p>${lesson.description}</p>
      <div class="resource-badges" aria-label="Available resources">${resourceBadges(lesson.resources)}</div>
      <div class="meta" style="margin-top:1rem"><span>Updated ${friendlyDate(lesson.updatedDate)}</span><span>${lesson.readingTime}</span></div>
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
      if (popularHost) popularHost.innerHTML = lessons.filter((lesson) => lesson.popular).map(lessonCard).join("") || '<p class="empty">No popular lessons yet.</p>';

      const reviewerHost = document.querySelector("#latest-reviewers");
      if (reviewerHost) {
        const published = newest.filter((lesson) => visibility.evaluate(lesson.resources.reviewer).status === "published");
        reviewerHost.innerHTML = published.map((lesson) => `<article class="card"><span class="eyebrow">Quick review + flashcards</span><h3>${lesson.title}</h3><p>${lesson.description}</p><a class="button small" href="${app.url(`lessons/${lesson.slug}/reviewer.html`)}">Open Reviewer</a></article>`).join("") || '<p class="empty">No reviewers are published yet.</p>';
      }

      const quizHost = document.querySelector("#quiz-list");
      if (quizHost) {
        const published = newest.filter((lesson) => visibility.evaluate(lesson.resources.quiz).status === "published");
        quizHost.innerHTML = published.map((lesson) => `<article class="card"><span class="eyebrow">Interactive challenge</span><h3>${lesson.title}</h3><p>Test what you know with randomized questions and answer explanations.</p><a class="button small" href="${app.url(`lessons/${lesson.slug}/quiz.html`)}">Take Quiz</a></article>`).join("") || '<p class="empty">No quizzes are published yet.</p>';
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
      const all = await app.fetchJSON("data/products.json");
      const ids = (host.dataset.productIds || "").split(",").filter(Boolean);
      const products = ids.length ? all.filter((product) => ids.includes(product.id)) : all.slice(0, 3);
      host.innerHTML = products.map((product) => `<article class="card"><div class="product-icon" role="img" aria-label="${product.name} placeholder">${product.icon}</div><span class="badge">Affiliate link</span><h3>${product.name}</h3><p>${product.description}</p><a class="button small" href="${product.affiliateUrl}" target="_blank" rel="nofollow sponsored noopener noreferrer">View Product</a></article>`).join("");
    } catch (_) { unavailable(host); }
  }

  renderHome();
  renderSubject();
  renderLessonPath();
  renderProducts();
})();
