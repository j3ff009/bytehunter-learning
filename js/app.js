(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || new URL("js/app.js", location.href).href;
  const root = new URL("../", scriptUrl);
  const page = document.body.dataset.page || "";

  const url = (path = "") => new URL(path, root).href;
  const icon = (name, className = "icon") => `<svg class="${className}" aria-hidden="true" focusable="false"><use href="${url(`assets/icons/ui.svg#${name}`)}"></use></svg>`;
  const fetchJSON = async (path) => {
    const response = await fetch(url(path), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  };

  window.ByteHunter = { root, url, icon, fetchJSON };

  function applyTheme(value) {
    const choice = value || localStorage.getItem("bytehunter-theme") || "dark";
    const resolved = choice === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : choice;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeChoice = choice;
  }

  applyTheme();

  const navItems = [
    ["Lessons", "index.html#latest", "home", "book"],
    ["Reviewers", "index.html#reviewers", "reviewers", "cards"],
    ["Quizzes", "index.html#quizzes", "quizzes", "quiz"],
    ["Subjects", "index.html#subjects", "subjects", "grid"],
    ["Search", "index.html#search", "search", "search"],
    ["About", "about.html", "about", "info"]
  ];

  function renderHeader() {
    const host = document.querySelector("[data-site-header]");
    if (!host) return;
    host.className = "site-header";
    host.innerHTML = `
      <a class="skip-link" href="#main-content">Skip to content</a>
      <div class="nav-wrap">
        <a class="brand" href="${url("index.html")}" aria-label="ByteSmith home">
          <span class="brand-mark" aria-hidden="true">${icon("code")}</span>
          <span>ByteSmith</span>
        </a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="primary-nav">${icon("menu")}<span>Menu</span></button>
        <nav class="nav-links" id="primary-nav" aria-label="Primary navigation">
          ${navItems.map(([label, href, key, symbol]) => `<a href="${url(href)}"${page === key ? ' aria-current="page"' : ""}>${icon(symbol)}<span>${label}</span></a>`).join("")}
          <label class="sr-only" for="theme-select">Color theme</label>
          <select class="theme-select" id="theme-select" aria-label="Color theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </nav>
      </div>`;

    const menu = host.querySelector(".menu-button");
    const nav = host.querySelector(".nav-links");
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    });
    nav.addEventListener("click", (event) => {
      if (event.target.matches("a")) {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
      }
    });

    const select = host.querySelector("#theme-select");
    select.value = document.documentElement.dataset.themeChoice || "dark";
    select.addEventListener("change", () => {
      localStorage.setItem("bytehunter-theme", select.value);
      applyTheme(select.value);
    });
  }

  function renderFooter() {
    const host = document.querySelector("[data-site-footer]");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML = `
      <div class="container footer-grid">
        <div><a class="brand" href="${url("index.html")}"><span class="brand-mark" aria-hidden="true">${icon("code")}</span><span>ByteSmith</span></a><p class="copyright">Learn concepts, build practical skills, and level up one lesson at a time.</p></div>
        <nav class="footer-links" aria-label="Footer navigation">
          <a href="${url("about.html")}">About</a><a href="${url("privacy.html")}">Privacy Policy</a><a href="${url("terms.html")}">Terms</a><a href="${url("affiliate-disclosure.html")}">Affiliate Disclosure</a><a href="${url("contact.html")}">Contact</a>
        </nav>
      </div>
      <div class="container copyright">© ${new Date().getFullYear()} ByteSmith. Educational content for independent study.</div>`;
  }

  async function loadSettings() {
    try {
      const settings = await fetchJSON("data/settings.json");
      if (!settings.showAds) document.querySelectorAll(".ad-slot").forEach((slot) => slot.remove());
      if (!settings.showPopularLessons) document.querySelector("#popular")?.remove();
      if (!settings.showAffiliateProducts) document.querySelectorAll("#tools, #recommended-products").forEach((node) => (node.closest("section") || node).remove());
      if (!localStorage.getItem("bytehunter-theme") && settings.defaultTheme) applyTheme(settings.defaultTheme);
      window.dispatchEvent(new CustomEvent("bytehunter:settings", { detail: settings }));
    } catch (_) {
      // The site remains useful with safe defaults when settings cannot be loaded.
    }
  }

  renderHeader();
  renderFooter();
  loadSettings();

  if (document.body.dataset.lessonId) {
    const recent = JSON.parse(localStorage.getItem("bytehunter-recent") || "[]");
    const next = [document.body.dataset.lessonId, ...recent.filter((id) => id !== document.body.dataset.lessonId)].slice(0, 5);
    localStorage.setItem("bytehunter-recent", JSON.stringify(next));
  }

  if (location.hash === "#search") {
    setTimeout(() => document.querySelector("#site-search")?.focus(), 0);
  }
})();
