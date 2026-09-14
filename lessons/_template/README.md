# New lesson template

1. Copy this entire folder and rename it to the new lesson slug, for example `network-basics`.
2. Replace every `LESSON_ID`, `LESSON_TITLE`, `SUBJECT_NAME`, `CATEGORY_NAME`, description, date, and canonical URL placeholder in these HTML files.
3. Write the lesson in `index.html` and the activity in `activity.html`.
4. Replace the example content in `lesson-data.json`. Keep the JSON valid.
5. Add a real, valid `lesson.pdf` file to the folder.
6. Add one matching entry to `/data/lessons.json` and set each resource status.
7. Run `node scripts/validate.mjs`, then serve the site locally and test the complete path.

Reviewer and quiz content is fetched only after the central lesson entry says the resource is published. A hidden resource is not linked or loaded into its page. Because files on a static host can still be reached by a known direct URL, never put sensitive answers or private information in this repository.
