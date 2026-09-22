(() => {
  "use strict";
  const input = document.querySelector("#site-search");
  const results = document.querySelector("#search-results");
  if (!input || !results) return;

  let lessons = [];
  let filter = "all";
  const buttons = [...document.querySelectorAll("[data-search-filter]")];

  const searchable = (lesson) => [lesson.title, lesson.shortTitle, lesson.subject, lesson.category, lesson.description, ...(lesson.keywords || [])].join(" ").toLowerCase();
  const availableFor = (lesson, type) => window.ByteHunterVisibility.evaluate(lesson.resources[type]).status === "published";

  function render() {
    const query = input.value.trim().toLowerCase();
    let matches = lessons.filter((lesson) => !query || searchable(lesson).includes(query));
    if (filter !== "all") matches = matches.filter((lesson) => availableFor(lesson, filter));
    results.innerHTML = matches.length
      ? matches.map((lesson) => `<article class="card lesson-card"><span class="lesson-card-icon" aria-hidden="true">${window.ByteHunter.icon("book")}</span><div class="meta"><span>${lesson.subject}</span><span>${lesson.category}</span></div><h3><a href="${window.ByteHunter.url(`lessons/${lesson.slug}/index.html`)}">${lesson.title}</a></h3><p>${lesson.description}</p></article>`).join("")
      : '<p class="empty">No matching learning resources. Try a broader search.</p>';
    results.setAttribute("aria-label", `${matches.length} search result${matches.length === 1 ? "" : "s"}`);
  }

  input.addEventListener("input", render);
  buttons.forEach((button) => button.addEventListener("click", () => {
    filter = button.dataset.searchFilter;
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  }));

  window.ByteHunter.getLessons().then((data) => { lessons = data.filter((lesson) => window.ByteHunterVisibility.evaluate(lesson.resources.lesson).status === "published"); render(); }).catch(() => {
    results.innerHTML = '<p class="empty">Content temporarily unavailable. Please try again shortly.</p>';
  });
})();
