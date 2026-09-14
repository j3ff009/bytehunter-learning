# ByteHunter Learning

**Learn. Practice. Level Up.**

ByteHunter Learning is a mobile-first, static educational website for computing and technology students. It uses only HTML, CSS, vanilla JavaScript, JSON, static assets, and PDF files. There is no database, server-side account system, or build framework.

The main learning flow is:

> Lesson -> Download PDF -> Reviewer -> Interactive Quiz -> Activity -> Next Lesson

## Project map

```text
.
|-- index.html                      Homepage, search, latest and popular content
|-- subjects/                       JSON-powered subject pages
|-- lessons/
|   |-- windows-booting-process/    12-page sample lesson
|   |-- esp32-introduction/         11-page sample lesson
|   `-- _template/                  Copy-ready lesson template
|-- data/                           Central lesson, subject, product and site settings
|-- css/                            Shared, lesson and quiz styles
|-- js/                             Rendering, visibility, search, reviewer and quiz logic
|-- assets/                         Static icons and future images
|-- scripts/validate.mjs            Zero-dependency repository checks
|-- sitemap.xml
|-- robots.txt
`-- _headers                        Cloudflare Pages security/cache headers
```

## Run locally

Do not open `index.html` using a `file://` URL. Browser security rules may block the JSON `fetch()` requests.

From the repository root, start a simple web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Before committing, run:

```bash
node scripts/validate.mjs
```

The same validation runs automatically on GitHub pushes and pull requests.

## Weekly lesson workflow

1. Copy `lessons/_template/`.
2. Rename the copied folder to a lowercase, hyphenated slug such as `windows-safe-mode`.
3. Replace the metadata placeholders in the folder's HTML files.
4. Write the ordered page content in `lesson.json`.
5. Add a valid `lesson.pdf`.
6. Edit `lesson-data.json` with reviewer and quiz questions.
7. Write the activity in `activity.html`.
8. Add one lesson entry to `data/lessons.json`.
9. Set resource visibility and confirm the dates.
10. Run `node scripts/validate.mjs` and test locally.
11. Commit and push. A connected Cloudflare Pages project redeploys automatically.

Example:

```bash
git add .
git commit -m "Add Windows Safe Mode lesson"
git push
```

The homepage, search, latest lessons, popular lessons, reviewer list, quiz list, related lessons, next lesson, and subject pages all read from `data/lessons.json`. Adding a lesson normally requires only its folder plus one catalog entry.

## Page-by-page lesson system

Every lesson uses the same lightweight reader in `js/lesson-reader.js`. Its `index.html` is only the SEO metadata and reader shell; the lesson's title, objectives, timing, resource filenames, and ordered pages live in `lesson.json`.

One page is visible at a time. The reader automatically creates the overview, page count, progress bar, desktop contents panel, mobile contents drawer, Previous/Next controls, keyboard-arrow navigation, swipe navigation, summary resources, and print layout. A page URL such as `?page=uefi` is shareable and works with refresh and browser Back/Forward.

To add a page, insert an object in the lesson's `pages` array:

```json
{
  "id": "secure-boot",
  "title": "Secure Boot",
  "type": "content",
  "showAdAfter": false,
  "content": "<p>Secure Boot verifies trusted boot components before they run.</p>"
}
```

Array order controls page numbers and navigation, so reordering pages requires no HTML or JavaScript edits. Page IDs must be unique, lowercase, and hyphenated. Supported types are `content`, `definition`, `comparison`, `diagram`, `example`, `code`, and `summary`; keep `summary` last. Code inside `<pre><code>` receives a Copy button.

Optional responsive images use fields beside `content`:

```json
"image": "../../assets/images/secure-boot.webp",
"imageAlt": "Secure Boot verification flow",
"imageCaption": "Firmware verifies the next trusted component before execution."
```

Set `showAdAfter` to `true` only on selected substantial pages. It creates a labeled placeholder after the lesson content, away from navigation and assessment controls.

Progress is stored only in the visitor's browser under `bytehunter_lesson_<lesson-id>`. The overview offers Resume and Start From Beginning when saved progress exists. Starting over clears that lesson's local record. The summary marks completion and shows only PDF, reviewer, quiz, activity, affiliate products, related lessons, and next lessons allowed by `data/lessons.json` visibility settings.

## Lesson catalog

Keep lesson IDs and slugs unique. Dates use `YYYY-MM-DD`. The order in `data/lessons.json` defines the next-lesson sequence.

```json
{
  "id": "windows-safe-mode",
  "title": "Windows Safe Mode",
  "subject": "CPE 22",
  "subjectId": "cpe",
  "category": "System Administration",
  "slug": "windows-safe-mode",
  "publishedDate": "2026-09-21",
  "updatedDate": "2026-09-21",
  "popular": false,
  "resources": {
    "lesson": { "status": "published" },
    "pdf": { "status": "published", "file": "lesson.pdf" },
    "reviewer": { "status": "hidden" },
    "quiz": { "status": "hidden" },
    "activity": { "status": "published" }
  }
}
```

## Hide, publish, schedule, or lock a resource

To publish a reviewer, change:

```json
"reviewer": { "status": "hidden" }
```

to:

```json
"reviewer": { "status": "published" }
```

To schedule it, include an ISO 8601 time with an explicit offset:

```json
"reviewer": {
  "status": "scheduled",
  "publishAt": "2026-09-20T18:00:00+08:00"
}
```

The browser compares the current time with `publishAt`. Before that time, the resource is not shown or loaded by the reviewer/quiz app.

A simple classroom lock can use:

```json
"reviewer": {
  "status": "locked",
  "accessCode": "CLASS-CODE"
}
```

JavaScript access codes are not secure. A static host cannot enforce true authorization, and anyone who knows a direct file URL may be able to retrieve it. Never store sensitive answers, private information, secrets, or paid-only content in this public static structure. For a stronger release boundary, keep unpublished files out of the deployed repository entirely.

## Reviewer and quiz content

Each lesson's `lesson-data.json` contains:

- Quick-review terms
- Flashcards
- Identification practice with accepted answers
- True/false practice
- Multiple-choice, identification, and true/false quiz questions

The quiz order and multiple-choice options are randomized in the browser. Use `data-feedback-mode="immediate"` on the quiz page to explain each answer immediately, or `data-feedback-mode="end"` to reveal feedback during answer review. Scores are not sent to a server.

## PDFs

Place the lesson PDF inside its lesson folder as `lesson.pdf`, or set another filename in the lesson catalog. Keep filenames lowercase and avoid spaces. Open the PDF after upload and confirm that it renders, prints, and downloads correctly.

## Affiliate products

Add products to `data/products.json`, then list their IDs in a lesson's `productIds`. On a lesson page, set the same IDs on the `data-product-ids` attribute of the product grid. Keep products relevant to the lesson.

Replace each `affiliateUrl` placeholder before launch. Affiliate links open in a new tab with `rel="nofollow sponsored noopener noreferrer"`, and every affiliate section includes a nearby disclosure. Update `affiliate-disclosure.html` if your program terms require more detail.

## AdSense

No publisher or slot IDs are included. Search the HTML for `ADSENSE SLOT`. Paste the official AdSense unit inside the matching `.ad-slot` container, beneath the visible **Advertisement** label.

Recommended positions already exist after the lesson introduction, midway through long lessons, and near the end. Do not move ads beside download controls, answer choices, quiz submission, or next-question controls. Set `showAds` to `false` in `data/settings.json` to remove all placeholders from the page.

## Analytics

Search `index.html` for `ANALYTICS`. Add the official Cloudflare Web Analytics or Google Analytics snippet in the document head, then update the privacy policy with the provider, purpose, and data practices. Do not commit private keys or server credentials.

## SEO and launch settings

Before public launch, replace every `https://example.com` occurrence with the final HTTPS domain. At minimum, update:

- Canonical and Open Graph URLs in HTML files
- `robots.txt`
- Every URL in `sitemap.xml`
- The placeholder contact email in `contact.html`

When adding a public reviewer, quiz, or activity, add its URL to `sitemap.xml`. Do not add hidden or scheduled resources before they are public. Lesson pages include LearningResource and Article structured data; keep their dates and descriptions synchronized with the catalog.

## Deploy with GitHub and Cloudflare Pages

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Select **Create application**, then **Pages**, then **Connect to Git**.
3. Authorize GitHub and select the `bytehunter-learning` repository.
4. Choose the `main` production branch.
5. Framework preset: **None**.
6. Build command: leave blank.
7. Build output directory: `.` (the repository root).
8. Save and deploy.

After the first deployment, the weekly workflow is simply edit -> validate -> commit -> push. Cloudflare watches `main` and creates a new deployment automatically. Pull requests can receive preview deployments if that option is enabled in the Cloudflare project.

### Direct upload alternative

For a one-time direct upload, create a ZIP whose top level contains `index.html`, `css/`, `js/`, `data/`, and `lessons/`. In Cloudflare Pages choose the direct-upload path and upload that archive. Direct upload does not provide the same automatic GitHub redeploy workflow.

### Custom domain

Open the deployed Pages project, choose **Custom domains**, add the domain, and follow Cloudflare's DNS prompts. After it is active, replace all `example.com` placeholders as described above and push the update.

## Settings

`data/settings.json` controls the site name, tagline, homepage sections, advertisement placeholders, and default theme where practical. Visitors can choose Dark, Light, or System mode; the preference is stored only in their browser.

## Maintenance and security notes

- Keep the site static. Do not commit API keys, access tokens, analytics secrets, or personal student data.
- Browser-side locks are a convenience, not security.
- Hidden content should not be linked or fetched. For true confidentiality, do not deploy the file.
- Verify hardware procedures against the exact board or device documentation.
- Keep ads visually separate from learning actions.
- Validate, serve locally, and test the full lesson path before every push.
