(() => {
  "use strict";
  const host = document.querySelector("#quiz-app");
  const lessonId = document.body.dataset.lessonId;
  if (!host || !lessonId) return;

  let lesson;
  let questions = [];
  let index = 0;
  let answers = [];
  let submitted = false;
  const feedbackMode = document.body.dataset.feedbackMode || "immediate";

  const shuffle = (items) => [...items].sort(() => Math.random() - .5);
  const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  function prepare(items) {
    return shuffle(items).map((item) => item.type === "multiple-choice" ? { ...item, choices: shuffle(item.choices) } : item);
  }

  function isCorrect(question, value) {
    if (question.type === "identification") return question.acceptedAnswers.some((answer) => normalize(answer) === normalize(value));
    if (question.type === "true-false") return question.answer === (value === "true");
    return question.answer === value;
  }

  function answerField(question) {
    if (question.type === "identification") return `<label class="sr-only" for="quiz-answer">Your answer</label><input class="field" id="quiz-answer" autocomplete="off" placeholder="Type your answer">`;
    const choices = question.type === "true-false" ? ["true", "false"] : question.choices;
    return `<div class="choices">${choices.map((choice, i) => `<label class="choice"><input type="radio" name="quiz-choice" value="${choice}"><span>${question.type === "multiple-choice" ? `${String.fromCharCode(65 + i)}. ` : ""}${choice === "true" ? "True" : choice === "false" ? "False" : choice}</span></label>`).join("")}</div>`;
  }

  function renderQuestion() {
    submitted = false;
    const q = questions[index];
    host.innerHTML = `<div class="progress-wrap"><div class="progress-meta"><span>Question ${index + 1} of ${questions.length}</span><span>${Math.round((index / questions.length) * 100)}% complete</span></div><div class="progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${index}"><div class="progress-bar" style="width:${(index / questions.length) * 100}%"></div></div></div><section class="quiz-card"><span class="question-type">${q.type.replace("-", " ")}</span><h2>${q.question}</h2>${answerField(q)}<div id="quiz-feedback" aria-live="polite"></div><div class="button-row"><button class="button" id="submit-answer" type="button">Submit Answer</button><button class="button" id="next-question" type="button" hidden>${index === questions.length - 1 ? "Finish Quiz" : "Next Question"}</button></div></section>`;
    host.querySelector("#submit-answer").addEventListener("click", submitAnswer);
  }

  function getValue() {
    const text = host.querySelector("#quiz-answer");
    if (text) return text.value;
    return host.querySelector('input[name="quiz-choice"]:checked')?.value;
  }

  function submitAnswer() {
    if (submitted) return;
    const value = getValue();
    if (value === undefined || normalize(value) === "") {
      host.querySelector("#quiz-feedback").innerHTML = '<p class="feedback incorrect">Choose or enter an answer first.</p>';
      return;
    }
    submitted = true;
    const q = questions[index];
    const correct = isCorrect(q, value);
    answers.push({ question: q, value, correct });
    host.querySelectorAll("input").forEach((input) => { input.disabled = true; });
    if (feedbackMode === "immediate") host.querySelector("#quiz-feedback").innerHTML = `<div class="feedback ${correct ? "correct" : "incorrect"}"><strong>${correct ? "Correct!" : "Not quite."}</strong><br>${q.explanation || "Review the lesson and try again."}</div>`;
    host.querySelector("#submit-answer").hidden = true;
    const next = host.querySelector("#next-question"); next.hidden = false; next.addEventListener("click", () => { index += 1; if (index < questions.length) renderQuestion(); else renderResults(); }, { once: true });
  }

  function renderResults() {
    const score = answers.filter((answer) => answer.correct).length;
    const percent = Math.round((score / questions.length) * 100);
    const label = percent >= 90 ? "Excellent" : percent >= 75 ? "Cleared" : percent >= 60 ? "Developing" : "Train and retry";
    host.innerHTML = `<section class="quiz-card"><span class="eyebrow">Quiz Complete</span><div class="result-score">${percent}%</div><h2>${score} / ${questions.length} — ${label}</h2><p>${percent >= 75 ? "You cleared this challenge." : "Review the explanations, then try the challenge again."}</p><div class="button-row"><button class="button secondary" id="review-answers" type="button">Review Answers</button><button class="button" id="retake-quiz" type="button">Retake Quiz</button><a class="button secondary" href="index.html">Return to Lesson</a></div><div class="review-list" id="answer-review" hidden>${answers.map((item, i) => `<article class="review-item"><strong>${i + 1}. ${item.question.question}</strong><p>Your answer: ${item.value === "true" ? "True" : item.value === "false" ? "False" : item.value}</p><p class="${item.correct ? "good" : "bad"}">${item.correct ? "Correct" : `Correct answer: ${item.question.answer ?? item.question.acceptedAnswers?.[0]}`}</p><p>${item.question.explanation || ""}</p></article>`).join("")}</div></section>`;
    host.querySelector("#review-answers").addEventListener("click", (event) => { const review = host.querySelector("#answer-review"); review.hidden = !review.hidden; event.target.textContent = review.hidden ? "Review Answers" : "Hide Review"; });
    host.querySelector("#retake-quiz").addEventListener("click", () => { index = 0; answers = []; questions = prepare(questions); renderQuestion(); });
  }

  async function start() {
    try {
      lesson = await window.ByteHunter.getLesson(lessonId);
      const state = window.ByteHunterVisibility.evaluate(lesson?.resources?.quiz);
      if (!lesson || !state.visible) {
        host.innerHTML = '<div class="locked-panel"><h2>Quiz unavailable</h2><p>This challenge is not published yet.</p></div>';
        return;
      }
      if (state.status === "locked") {
        host.innerHTML = '<div class="locked-panel"><h2>Quiz Locked</h2><form id="quiz-unlock"><label for="quiz-code">Enter Access Code</label><input class="field" id="quiz-code" type="password" autocomplete="off"><button class="button" type="submit">Unlock</button></form><p id="unlock-feedback" aria-live="polite"></p><p class="disclosure">Classroom convenience only. Client-side access codes are not secure.</p></div>';
        host.querySelector("#quiz-unlock").addEventListener("submit", async (event) => {
          event.preventDefault();
          const supplied = host.querySelector("#quiz-code").value;
          if (!window.ByteHunterVisibility.verifyAccessCode(lesson.resources.quiz, supplied)) {
            host.querySelector("#unlock-feedback").textContent = "That code did not match.";
            return;
          }
          const content = await window.ByteHunter.fetchJSON(`lessons/${lesson.slug}/lesson-data.json`);
          questions = prepare(content.quiz);
          renderQuestion();
        });
        return;
      }
      const content = await window.ByteHunter.fetchJSON(`lessons/${lesson.slug}/lesson-data.json`);
      questions = prepare(content.quiz);
      renderQuestion();
    } catch (_) { host.innerHTML = '<p class="empty">Quiz temporarily unavailable. Please try again shortly.</p>'; }
  }
  start();
})();
