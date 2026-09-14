# Create a page-by-page lesson

This folder is the reusable ByteHunter lesson template. The reader uses one `index.html` and renders every lesson page from `lesson.json`.

## Create the lesson

1. Copy this entire folder.
2. Rename the copy to a lowercase, hyphenated slug such as `network-basics`.
3. In `index.html`, replace `LESSON_ID`, `LESSON_TITLE`, `LESSON_DESCRIPTION`, `SUBJECT_NAME`, and `CATEGORY_NAME` once. Do the same metadata cleanup in the reviewer, quiz, and activity pages.
4. In `lesson.json`, replace the lesson metadata and write the ordered `pages` array.
5. In `lesson-data.json`, write the reviewer and quiz questions.
6. Replace `lesson.pdf` with the printable lesson.
7. Add one matching entry to `/data/lessons.json` and configure resource visibility.

After the initial lesson setup, adding, removing, or rearranging lesson pages requires changes only to `lesson.json`.

## Add a page

Add another object anywhere inside the `pages` array:

```json
{
  "id": "secure-boot",
  "title": "Secure Boot",
  "type": "content",
  "content": "<p>Secure Boot verifies trusted boot components before they run.</p>",
  "showAdAfter": false
}
```

Use a unique, lowercase page `id`. The array position automatically controls page numbering, the Contents menu, Previous/Next behavior, and progress calculation. No HTML change is needed.

## Supported page types

Use `content`, `definition`, `comparison`, `diagram`, `example`, `code`, or `summary`. The type applies a useful label and styling; all page types use the same reader.

The `content` field accepts trusted lesson HTML. Useful reusable classes include:

- `notice` for an important note
- `table-scroll` around a table
- `diagram` for a horizontal process
- `diagram vertical` for a vertical process
- `grid grid-2` and `card` for compact examples
- `summary-checks` for summary points

Wrap code in `<pre><code>...</code></pre>`. The reader adds a Copy button automatically.

## Add an image

Place the image in `/assets/images/`, then add these optional fields to a page object:

```json
"image": "../../assets/images/example.webp",
"imageAlt": "Diagram explaining the example process",
"imageCaption": "A short optional caption"
```

Images are responsive and lazy-loaded. Always provide meaningful alternative text unless an image is purely decorative.

## Selected advertisements

Set `"showAdAfter": true` only on a substantial page where an ad will not interrupt a control or learning task. No publisher ID is included. The reader creates a clearly labeled placeholder after that page's content.

Do not place ads beside Previous, Next, Download PDF, reviewer, or quiz controls.

## Summary page

Keep the final page type as `summary`. Summarize key concepts and provide a useful next action. When the summary appears, the reader locally marks the lesson complete and adds the PDF, reviewer, quiz, activity, learning path, related lessons, and lesson-specific products allowed by `/data/lessons.json`.

Hidden resources are not linked. Scheduled resources appear only after their configured time. Locked resources appear as locked rather than exposing their content.

## Test

From the repository root:

```bash
python -m http.server 8000
node scripts/validate.mjs
```

Open `http://localhost:8000/lessons/YOUR-SLUG/`. Test the overview, every page, Contents menu, browser Back/Forward, keyboard arrows, mobile layout, code copying, summary actions, and PDF download.
