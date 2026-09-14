(() => {
  "use strict";
  const host = document.querySelector("#reviewer-app");
  const lessonId = document.body.dataset.lessonId;
  if (!host || !lessonId) return;

  let data;
  let cards = [];
  let cardIndex = 0;
  let revealed = false;
  const reviewed = new Set();

  function updateProgress() {
    const total = data.flashcards.length + data.identification.length + data.trueFalse.length;
    const count = reviewed.size;
    const bar = host.querySelector("#review-progress");
    host.querySelector("#review-progress-text").textContent = `${count} / ${total} concepts reviewed`;
    bar.style.width = `${Math.round((count / total) * 100)}%`;
    bar.parentElement.setAttribute("aria-valuenow", String(count));
    bar.parentElement.setAttribute("aria-valuemax", String(total));
  }

  function showCard() {
    const card = cards[cardIndex];
    host.querySelector("#flashcard-position").textContent = `${cardIndex + 1} / ${cards.length}`;
    host.querySelector("#flashcard-label").textContent = revealed ? "Answer" : "Question";
    host.querySelector("#flashcard-text").textContent = revealed ? card.back : card.front;
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - .5);
  }

  function render(content) {
    data = content.reviewer;
    cards = [...data.flashcards];
    host.innerHTML = `
      <div class="progress-wrap"><div class="progress-meta"><span id="review-progress-text">0 / 0 concepts reviewed</span><span>Session only</span></div><div class="progress-track" role="progressbar" aria-label="Reviewer progress" aria-valuemin="0"><div class="progress-bar" id="review-progress"></div></div></div>
      <div class="review-tabs" role="tablist" aria-label="Reviewer sections">
        <button class="tab-button" role="tab" aria-selected="true" data-tab="quick">Quick Review</button>
        <button class="tab-button" role="tab" aria-selected="false" data-tab="cards">Flashcards</button>
        <button class="tab-button" role="tab" aria-selected="false" data-tab="identification">Identification</button>
        <button class="tab-button" role="tab" aria-selected="false" data-tab="truefalse">True or False</button>
      </div>
      <section class="reviewer-card review-panel" data-panel="quick"><h2>Quick Review</h2><div class="grid grid-2">${data.quickReview.map((item) => `<article><h3>${item.term}</h3><p>${item.summary}</p></article>`).join("")}</div></section>
      <section class="reviewer-card review-panel" data-panel="cards" hidden><p class="progress-meta"><span id="flashcard-position"></span><span>Tap or click to reveal</span></p><button class="flashcard" id="flashcard" type="button"><span class="side-label" id="flashcard-label"></span><span class="flashcard-text" id="flashcard-text"></span></button><div class="button-row"><button class="button secondary" id="card-prev" type="button">Previous</button><button class="button secondary" id="card-next" type="button">Next</button><button class="button secondary" id="card-shuffle" type="button">Shuffle</button><button class="button secondary" id="card-reset" type="button">Reset</button></div></section>
      <section class="reviewer-card review-panel" data-panel="identification" hidden><h2>Identification Practice</h2>${data.identification.map((item, index) => `<div class="practice-question"><label for="id-answer-${index}">${item.question}</label><input class="field" id="id-answer-${index}" autocomplete="off"><button class="button small" type="button" data-id-check="${index}">Check</button><p class="feedback-inline" id="id-feedback-${index}" aria-live="polite"></p></div>`).join("")}</section>
      <section class="reviewer-card review-panel" data-panel="truefalse" hidden><h2>True or False Practice</h2>${data.trueFalse.map((item, index) => `<div class="practice-question"><p>${item.question}</p><div class="button-row"><button class="button secondary" type="button" data-tf="${index}:true">True</button><button class="button secondary" type="button" data-tf="${index}:false">False</button></div><p class="feedback-inline" id="tf-feedback-${index}" aria-live="polite"></p></div>`).join("")}</section>`;

    host.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
      host.querySelectorAll("[data-tab]").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
      host.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== button.dataset.tab; });
    }));
    host.querySelector("#flashcard").addEventListener("click", () => { revealed = !revealed; reviewed.add(`card-${cards[cardIndex].front}`); showCard(); updateProgress(); });
    host.querySelector("#card-prev").addEventListener("click", () => { cardIndex = (cardIndex - 1 + cards.length) % cards.length; revealed = false; showCard(); });
    host.querySelector("#card-next").addEventListener("click", () => { cardIndex = (cardIndex + 1) % cards.length; revealed = false; showCard(); });
    host.querySelector("#card-shuffle").addEventListener("click", () => { cards = shuffle(cards); cardIndex = 0; revealed = false; showCard(); });
    host.querySelector("#card-reset").addEventListener("click", () => { cards = [...data.flashcards]; cardIndex = 0; revealed = false; reviewed.clear(); showCard(); updateProgress(); });
    host.querySelectorAll("[data-id-check]").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.idCheck); const item = data.identification[index]; const input = host.querySelector(`#id-answer-${index}`); const answer = input.value.trim().toLowerCase(); const good = item.acceptedAnswers.some((value) => value.toLowerCase() === answer); const feedback = host.querySelector(`#id-feedback-${index}`); feedback.textContent = good ? "Correct." : `Not yet. Answer: ${item.acceptedAnswers[0]}`; feedback.className = `feedback-inline ${good ? "good" : "bad"}`; reviewed.add(`id-${index}`); updateProgress();
    }));
    host.querySelectorAll("[data-tf]").forEach((button) => button.addEventListener("click", () => {
      const [rawIndex, rawValue] = button.dataset.tf.split(":"); const index = Number(rawIndex); const good = (rawValue === "true") === data.trueFalse[index].answer; const feedback = host.querySelector(`#tf-feedback-${index}`); feedback.textContent = good ? "Correct." : `Not quite. ${data.trueFalse[index].explanation}`; feedback.className = `feedback-inline ${good ? "good" : "bad"}`; reviewed.add(`tf-${index}`); updateProgress();
    }));
    showCard(); updateProgress();
  }

  async function start() {
    try {
      const lesson = await window.ByteHunter.getLesson(lessonId);
      const state = window.ByteHunterVisibility.evaluate(lesson?.resources?.reviewer);
      if (!lesson || !state.visible) {
        host.innerHTML = '<div class="locked-panel"><h2>Reviewer unavailable</h2><p>This reviewer is not published yet.</p></div>';
        return;
      }
      if (state.status === "locked") {
        host.innerHTML = '<div class="locked-panel"><h2>Reviewer Locked</h2><form id="reviewer-unlock"><label for="reviewer-code">Enter Access Code</label><input class="field" id="reviewer-code" type="password" autocomplete="off"><button class="button" type="submit">Unlock</button></form><p id="unlock-feedback" aria-live="polite"></p><p class="disclosure">Classroom convenience only. Client-side access codes are not secure.</p></div>';
        host.querySelector("#reviewer-unlock").addEventListener("submit", async (event) => {
          event.preventDefault();
          const supplied = host.querySelector("#reviewer-code").value;
          if (!window.ByteHunterVisibility.verifyAccessCode(lesson.resources.reviewer, supplied)) {
            host.querySelector("#unlock-feedback").textContent = "That code did not match.";
            return;
          }
          const content = await window.ByteHunter.fetchJSON(`lessons/${lesson.slug}/lesson-data.json`);
          render(content);
        });
        return;
      }
      const content = await window.ByteHunter.fetchJSON(`lessons/${lesson.slug}/lesson-data.json`);
      render(content);
    } catch (_) { host.innerHTML = '<p class="empty">Reviewer temporarily unavailable. Please try again shortly.</p>'; }
  }
  start();
})();
