(() => {
  "use strict";

  const app = window.ByteHunter;
  const visibility = window.ByteHunterVisibility;
  const host = document.querySelector("#lesson-reader");
  const lessonId = document.body.dataset.lessonId;
  if (!host || !lessonId || !app || !visibility) return;

  const storageKey = `bytehunter_lesson_${lessonId}`;
  let lesson;
  let catalogLesson;
  let catalog = [];
  let currentIndex = -1;
  let drawerOpen = false;
  let touchStart = null;

  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        lastPageId: typeof saved.lastPageId === "string" ? saved.lastPageId : "",
        viewed: Array.isArray(saved.viewed) ? saved.viewed : [],
        completed: Boolean(saved.completed)
      };
    } catch (_) {
      return { lastPageId: "", viewed: [], completed: false };
    }
  }

  function saveProgress(progress) {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch (_) { /* Local progress is optional. */ }
  }

  function requestedPage() {
    return new URL(location.href).searchParams.get("page");
  }

  function setPageUrl(pageId, mode = "push") {
    const next = new URL(location.href);
    next.searchParams.set("page", pageId);
    history[`${mode}State`]({ pageId }, "", next);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function pageImage(page) {
    if (!page.image) return "";
    return `<figure class="lesson-figure"><img src="${escapeHTML(page.image)}" alt="${escapeHTML(page.imageAlt || "")}" loading="lazy"><figcaption>${escapeHTML(page.imageCaption || "")}</figcaption></figure>`;
  }

  function pageMarkup(page, printable = false) {
    const label = page.type ? page.type.replace(/-/g, " ") : "content";
    return `<${printable ? "section" : "article"} class="lesson-page type-${escapeHTML(page.type || "content")}${printable ? " print-lesson-page" : " page-enter"}" data-page-id="${escapeHTML(page.id)}">
      ${printable ? `<p class="print-page-label">${escapeHTML(page.title)}</p>` : `<p class="page-type">${escapeHTML(label)}</p><h2 tabindex="-1" id="current-page-title">${escapeHTML(page.title)}</h2>`}
      ${pageImage(page)}
      <div class="lesson-page-body">${page.content || ""}</div>
      ${!printable && page.showAdAfter ? '<div class="ad-slot"><span>Advertisement</span><!-- ADSENSE SLOT: Lesson Page --></div>' : ""}
    </${printable ? "section" : "article"}>`;
  }

  function visibleResource(resource) {
    const state = visibility.evaluate(resource);
    return state.visible ? state : null;
  }

  async function resourceData() {
    const currentCatalogIndex = catalog.findIndex((item) => item.id === lessonId);
    const next = catalog.slice(currentCatalogIndex + 1).find((item) => visibility.evaluate(item.resources.lesson).status === "published");
    return { next };
  }

  function actionLink(label, href, className = "button secondary") {
    return `<a class="${className}" href="${escapeHTML(href)}">${escapeHTML(label)}</a>`;
  }

  async function summaryExtras() {
    const resources = catalogLesson?.resources || {};
    const { next } = await resourceData();
    const actions = [];
    const path = [{ label: "Lesson", status: "completed", href: "index.html?page=overview" }];

    const pdfState = visibleResource(resources.pdf);
    if (pdfState) {
      const href = resources.pdf.file || lesson.pdf || "lesson.pdf";
      path.push({ label: "Download PDF", status: pdfState.status, href });
      if (pdfState.status === "published") actions.push(actionLink("Download PDF", href, "button"));
    }
    for (const [key, label, href] of [["reviewer", "Start Reviewer", lesson.reviewer || "reviewer.html"], ["quiz", "Take Quiz", lesson.quiz || "quiz.html"], ["activity", "Open Activity", lesson.activity || "activity.html"]]) {
      const state = visibleResource(resources[key]);
      if (!state) continue;
      path.push({ label: label.replace("Start ", "").replace("Take ", "Interactive ").replace("Open ", ""), status: state.status, href });
      if (state.status === "published") actions.push(actionLink(label, href));
    }
    if (next) path.push({ label: `Next: ${next.shortTitle}`, status: "published", href: `../${next.slug}/index.html` });

    const progress = readProgress();
    const resourceCard = `<section class="completion-card"><p class="eyebrow">Lesson cleared</p><h3>${escapeHTML(lesson.title)}</h3><p><strong>${progress.viewed.length} / ${lesson.pages.length}</strong> pages viewed on this device</p><p class="completion-line">+ Lesson Completed</p><div class="button-row">${actions.join("")}</div></section>`;
    const pdfCard = pdfState?.status === "published" ? `<section class="download-card"><span class="download-icon" aria-hidden="true">PDF</span><div><h3>Download this lesson</h3><p>${escapeHTML(lesson.title)} · PDF · Offline copy</p></div><a class="button" href="${escapeHTML(resources.pdf.file || lesson.pdf || "lesson.pdf")}" download>Download PDF</a></section>` : "";
    const pathCard = `<section class="learning-path reader-learning-path"><h3>Your learning path</h3><ol>${path.map((item) => `<li class="${escapeHTML(item.status)}">${item.status === "locked" ? `<span>${escapeHTML(item.label)} — locked</span>` : `<a href="${escapeHTML(item.href)}">${escapeHTML(item.label)}</a>`}</li>`).join("")}</ol></section>`;

    let products = "";
    if (catalogLesson?.productIds?.length) {
      try {
        const allProducts = await app.fetchJSON("data/products.json");
        const selected = allProducts.filter((product) => catalogLesson.productIds.includes(product.id));
        products = `<section class="summary-products"><p class="eyebrow">Affiliate materials</p><h3>Recommended materials</h3><p class="disclosure">Some links may be affiliate links. We may earn a small commission at no additional cost to you.</p><div class="grid grid-3">${selected.map((product) => `<article class="card"><div class="product-icon" role="img" aria-label="${escapeHTML(product.name)} placeholder">${escapeHTML(product.icon)}</div><span class="badge">Affiliate link</span><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.description)}</p><a class="button small" href="${escapeHTML(product.affiliateUrl)}" target="_blank" rel="nofollow sponsored noopener noreferrer">View Product</a></article>`).join("")}</div></section>`;
      } catch (_) { /* Products are optional; the lesson remains usable. */ }
    }

    let related = "";
    const lessonSubjects = catalogLesson?.subjectIds || [catalogLesson?.subjectId];
    const relatedItems = catalog.filter((item) => item.id !== lessonId && visibility.evaluate(item.resources.lesson).status === "published" && (item.category === catalogLesson?.category || (item.subjectIds || [item.subjectId]).some((id) => lessonSubjects.includes(id)))).slice(0, 3);
    if (relatedItems.length) related = `<section class="related-section"><h3>Continue learning</h3><div class="grid grid-2">${relatedItems.map((item) => `<article class="card lesson-card"><p class="meta">${escapeHTML(item.subject)} · ${escapeHTML(item.category)}</p><h3><a href="../${escapeHTML(item.slug)}/index.html">${escapeHTML(item.title)}</a></h3><p>${escapeHTML(item.description)}</p></article>`).join("")}</div></section>`;

    return resourceCard + pdfCard + pathCard + products + related;
  }

  function contentsMarkup(progress) {
    return lesson.pages.map((page, index) => {
      const isCurrent = index === currentIndex;
      const viewed = progress.viewed.includes(page.id);
      const symbol = isCurrent ? "●" : viewed ? "✓" : "○";
      const label = isCurrent ? "current page" : viewed ? "viewed" : "not viewed";
      return `<button type="button" class="contents-item${isCurrent ? " current" : ""}${viewed ? " viewed" : ""}" data-go-page="${escapeHTML(page.id)}"${isCurrent ? ' aria-current="step"' : ""}><span aria-hidden="true">${symbol}</span><span>${index + 1}. ${escapeHTML(page.title)}</span><span class="sr-only">, ${label}</span></button>`;
    }).join("");
  }

  function overviewMarkup(progress) {
    const completed = progress.viewed.length;
    const lastPage = lesson.pages.find((page) => page.id === progress.lastPageId);
    const resume = lastPage ? `<div class="resume-card"><p class="eyebrow">Continue learning</p><h2>You stopped at Page ${lesson.pages.indexOf(lastPage) + 1} — ${escapeHTML(lastPage.title)}</h2><p>${completed} of ${lesson.pages.length} pages viewed.</p><div class="button-row"><button class="button" type="button" data-go-page="${escapeHTML(lastPage.id)}">Continue Lesson</button><button class="button secondary" type="button" id="restart-lesson">Start From Beginning</button></div></div>` : "";
    return `<section class="lesson-overview page-enter"><p class="eyebrow">Lesson overview</p><h1>${escapeHTML(lesson.title)}</h1><p class="overview-description">${escapeHTML(lesson.description)}</p><div class="overview-stats"><span><strong>${lesson.pages.length}</strong> lesson pages</span><span><strong>${lesson.estimatedMinutes}</strong> estimated minutes</span><span><strong>${escapeHTML(lesson.subject)}</strong> ${escapeHTML(lesson.category)}</span></div><div class="objectives"><h2>You will learn</h2><ul>${(lesson.learningObjectives || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></div>${resume}<div class="button-row"><button class="button" type="button" data-go-page="${escapeHTML(lesson.pages[0].id)}">${lastPage ? "Restart at Page 1" : "Start Lesson"}</button>${visibleResource(catalogLesson?.resources?.pdf)?.status === "published" ? actionLink("Download PDF", catalogLesson.resources.pdf.file || lesson.pdf || "lesson.pdf") : ""}</div></section>`;
  }

  function installCopyButtons(scope) {
    scope.querySelectorAll("pre code").forEach((code) => {
      const pre = code.parentElement;
      if (pre.parentElement?.classList.contains("code-block")) return;
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      pre.replaceWith(wrap);
      wrap.append(pre);
      const button = document.createElement("button");
      button.className = "copy-code";
      button.type = "button";
      button.textContent = "Copy code";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          button.textContent = "Copied";
          setTimeout(() => { button.textContent = "Copy code"; }, 1600);
        } catch (_) {
          button.textContent = "Copy unavailable";
        }
      });
      wrap.prepend(button);
    });
  }

  function progressMarkup(index) {
    const current = index + 1;
    const percent = Math.round((current / lesson.pages.length) * 100);
    return `<div class="reader-progress"><div class="progress-meta"><span>Page ${current} of ${lesson.pages.length}</span><strong>${percent}%</strong></div><div class="progress-track" role="progressbar" aria-label="Lesson progress: ${percent}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-bar" style="width:${percent}%"></div></div></div>`;
  }

  async function render(pageId, options = {}) {
    const progress = readProgress();
    currentIndex = pageId === "overview" ? -1 : lesson.pages.findIndex((page) => page.id === pageId);
    if (currentIndex < -1 || (currentIndex === -1 && pageId !== "overview")) currentIndex = -1;

    if (currentIndex >= 0) {
      const currentPage = lesson.pages[currentIndex];
      progress.lastPageId = currentPage.id;
      if (!progress.viewed.includes(currentPage.id)) progress.viewed.push(currentPage.id);
      if (currentIndex === lesson.pages.length - 1) progress.completed = true;
      saveProgress(progress);
    }

    const activeId = currentIndex >= 0 ? lesson.pages[currentIndex].id : "overview";
    if (!options.fromHistory) setPageUrl(activeId, options.replace ? "replace" : "push");
    document.title = currentIndex >= 0 ? `${lesson.pages[currentIndex].title} | ${lesson.title} | ByteHunter Learning` : `${lesson.title} | ByteHunter Learning`;

    const finalPdf = visibleResource(catalogLesson?.resources?.pdf)?.status === "published";
    const mainContent = currentIndex < 0
      ? overviewMarkup(progress)
      : `${progressMarkup(currentIndex)}${pageMarkup(lesson.pages[currentIndex])}<nav class="reader-controls" aria-label="Lesson page navigation"><button class="button secondary" id="reader-previous" type="button"${currentIndex === 0 ? " disabled" : ""} aria-label="Previous lesson page">← Previous</button>${currentIndex === lesson.pages.length - 1 ? `<button class="button" id="reader-next" type="button">${finalPdf ? "Continue to PDF →" : "Finish Lesson"}</button>` : `<button class="button" id="reader-next" type="button" aria-label="Next lesson page">Next →</button>`}</nav><div id="summary-extras"></div>`;

    host.innerHTML = `<button class="contents-toggle button secondary" id="contents-toggle" type="button" aria-expanded="false" aria-controls="lesson-contents">☰ Contents</button><div class="reader-grid"><aside class="contents-panel" id="lesson-contents" aria-label="Lesson contents"><div class="contents-head"><div><p class="eyebrow">Lesson contents</p><strong>${escapeHTML(lesson.title)}</strong></div><button class="contents-close" id="contents-close" type="button" aria-label="Close lesson contents">×</button></div><button class="contents-overview${currentIndex < 0 ? " current" : ""}" type="button" data-go-page="overview"${currentIndex < 0 ? ' aria-current="step"' : ""}>Overview</button>${contentsMarkup(progress)}</aside><button class="drawer-backdrop" id="drawer-backdrop" type="button" aria-label="Close lesson contents" tabindex="-1"></button><div class="reader-stage" id="reader-stage">${mainContent}</div></div><div class="print-all-pages"><h1>${escapeHTML(lesson.title)}</h1><p>${escapeHTML(lesson.subject)} · ${escapeHTML(lesson.category)}</p>${lesson.pages.map((page) => pageMarkup(page, true)).join("")}</div>`;

    syncDrawerMode();
    bindControls();
    installCopyButtons(host);
    if (currentIndex === lesson.pages.length - 1) {
      const extras = await summaryExtras();
      if (currentIndex === lesson.pages.length - 1) {
        const summaryHost = document.querySelector("#summary-extras");
        if (summaryHost) summaryHost.innerHTML = extras;
      }
    }
    if (currentIndex >= 0) {
      requestAnimationFrame(() => document.querySelector("#current-page-title")?.focus({ preventScroll: true }));
      trackLessonPageView(lesson.pages[currentIndex].id);
    }
  }

  function goTo(pageId, options) {
    closeDrawer();
    render(pageId, options);
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function openDrawer() {
    drawerOpen = true;
    const panel = document.querySelector("#lesson-contents");
    panel?.classList.add("open");
    if (panel) {
      panel.inert = false;
      panel.removeAttribute("aria-hidden");
    }
    document.querySelector("#drawer-backdrop")?.classList.add("open");
    const toggle = document.querySelector("#contents-toggle");
    toggle?.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-active");
    document.querySelector("#contents-close")?.focus();
  }

  function closeDrawer(returnFocus = false) {
    if (!drawerOpen) return;
    drawerOpen = false;
    const panel = document.querySelector("#lesson-contents");
    panel?.classList.remove("open");
    if (panel && matchMedia("(max-width: 900px)").matches) {
      panel.inert = true;
      panel.setAttribute("aria-hidden", "true");
    }
    document.querySelector("#drawer-backdrop")?.classList.remove("open");
    document.querySelector("#contents-toggle")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-active");
    if (returnFocus) document.querySelector("#contents-toggle")?.focus();
  }

  function syncDrawerMode() {
    const panel = document.querySelector("#lesson-contents");
    if (!panel) return;
    if (matchMedia("(max-width: 900px)").matches) {
      panel.inert = !drawerOpen;
      panel.toggleAttribute("aria-hidden", !drawerOpen);
      return;
    }
    drawerOpen = false;
    panel.inert = false;
    panel.removeAttribute("aria-hidden");
    panel.classList.remove("open");
    document.querySelector("#drawer-backdrop")?.classList.remove("open");
    document.querySelector("#contents-toggle")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-active");
  }

  function bindControls() {
    host.querySelectorAll("[data-go-page]").forEach((button) => button.addEventListener("click", () => goTo(button.dataset.goPage)));
    host.querySelector("#contents-toggle")?.addEventListener("click", openDrawer);
    host.querySelector("#contents-close")?.addEventListener("click", () => closeDrawer(true));
    host.querySelector("#drawer-backdrop")?.addEventListener("click", () => closeDrawer(true));
    host.querySelector("#reader-previous")?.addEventListener("click", () => { if (currentIndex > 0) goTo(lesson.pages[currentIndex - 1].id); });
    host.querySelector("#reader-next")?.addEventListener("click", () => {
      if (currentIndex < lesson.pages.length - 1) goTo(lesson.pages[currentIndex + 1].id);
      else {
        const pdf = visibleResource(catalogLesson?.resources?.pdf);
        if (pdf?.status === "published") location.href = catalogLesson.resources.pdf.file || lesson.pdf || "lesson.pdf";
        else goTo("overview");
      }
    });
    host.querySelector("#restart-lesson")?.addEventListener("click", () => {
      try { localStorage.removeItem(storageKey); } catch (_) { /* Optional local state. */ }
      goTo(lesson.pages[0].id);
    });
    const stage = host.querySelector("#reader-stage");
    stage?.addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    stage?.addEventListener("touchend", (event) => {
      if (!touchStart || currentIndex < 0) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      if (dx < 0 && currentIndex < lesson.pages.length - 1) goTo(lesson.pages[currentIndex + 1].id);
      if (dx > 0 && currentIndex > 0) goTo(lesson.pages[currentIndex - 1].id);
    }, { passive: true });
  }

  function handleKeydown(event) {
    const target = event.target;
    const typing = target.matches("input, textarea, select, [contenteditable='true']");
    if (typing) return;
    if (event.key === "Escape" && drawerOpen) { event.preventDefault(); closeDrawer(true); return; }
    if (drawerOpen && event.key === "Tab") {
      const drawer = document.querySelector("#lesson-contents");
      const focusable = [...drawer.querySelectorAll("button:not([disabled]), a[href]")];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (currentIndex < 0 || drawerOpen) return;
    if (event.key === "ArrowLeft" && currentIndex > 0) { event.preventDefault(); goTo(lesson.pages[currentIndex - 1].id); }
    if (event.key === "ArrowRight" && currentIndex < lesson.pages.length - 1) { event.preventDefault(); goTo(lesson.pages[currentIndex + 1].id); }
  }

  // Analytics placeholder: connect a provider here later. Never add fake tracking IDs.
  function trackLessonPageView(pageId) {
    window.dispatchEvent(new CustomEvent("bytehunter:lesson-page-view", { detail: { lessonId, pageId } }));
  }
  window.trackLessonPageView = trackLessonPageView;

  async function start() {
    try {
      [lesson, catalog] = await Promise.all([app.fetchJSON(`lessons/${lessonId}/lesson.json`), app.getLessons()]);
      catalogLesson = catalog.find((item) => item.id === lessonId);
      if (!lesson?.pages?.length || !catalogLesson) throw new Error("Incomplete lesson data");
      const request = requestedPage();
      const initial = request === "overview" || lesson.pages.some((page) => page.id === request) ? request : "overview";
      await render(initial, { replace: true });
      addEventListener("popstate", () => {
        const pageId = requestedPage() || "overview";
        render(pageId, { fromHistory: true });
      });
      addEventListener("keydown", handleKeydown);
      addEventListener("resize", syncDrawerMode);
    } catch (_) {
      host.innerHTML = `<section class="reader-error"><h1>Lesson temporarily unavailable.</h1><p>Please return to the subject page.</p><a class="button" href="${escapeHTML(document.body.dataset.subjectHref || "../../index.html#subjects")}">Back to Subject</a></section>`;
    }
  }

  start();
})();
