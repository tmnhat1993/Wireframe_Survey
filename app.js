(function () {
const { QUESTIONS, SURVEY_VERSION } = window.SurveyQuestions;
const { getStoreMode, saveSurveyResponse } = window.SurveyStore;

const screens = document.querySelectorAll(".screen");
const startSurveyButton = document.querySelector("#start-survey");
const introLogo = document.querySelector(".intro-logo");
const introIllustration = document.querySelector(".intro-illustration");
const participantForm = document.querySelector("#participant-form");
const fullNameInput = document.querySelector("#full-name");
const ageRangeInput = document.querySelector("#age-range");
const consentInput = document.querySelector("#consent");
const fullNameError = document.querySelector("#full-name-error");
const genderError = document.querySelector("#gender-error");
const ageRangeError = document.querySelector("#age-range-error");
const ageRangeButtons = document.querySelectorAll("[data-age-range]");
const policyDialog = document.querySelector("#policy-dialog");
const openPolicyButton = document.querySelector("#open-policy");
const closePolicyButton = document.querySelector("#close-policy");
const anonymousDialog = document.querySelector("#anonymous-dialog");
const confirmAnonymousButton = document.querySelector("#confirm-anonymous");
const questionList = document.querySelector("#question-list");
const questionCounter = document.querySelector("#question-counter");
const questionError = document.querySelector("#question-error");
const previousQuestionButton = document.querySelector("#previous-question");
const nextQuestionButton = document.querySelector("#next-question");
const quizBottomIllustration = document.querySelector("#quiz-bottom-illustration");
const submitStatus = document.querySelector("#submit-status");
const retrySubmitButton = document.querySelector("#retry-submit");
const newSurveyButton = document.querySelector("#new-survey");
const successMessage = document.querySelector("#success-message");

const COMPLETION_STORAGE_KEY = "survey-app-completed-participant";
const SUCCESS_MESSAGE = "Khảo sát của bạn đã được ghi nhận thành công.";
const DEBUG_STORAGE_KEY = "survey-app-debug-mode";
const LOCAL_RESPONSES_STORAGE_KEY = "survey-app-responses";
const DATA_VERSION_STORAGE_KEY = "survey-app-data-version";

let activeQuestionIndex = 0;
let isSubmitting = false;

const surveyState = {
  participant: {
    fullName: "",
    gender: "",
    ageRange: "",
    consentGiven: false
  },
  answers: {}
};

function closeDialogOnBackdropClick(dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

function showRoute(route) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${route}`);
  });

  if (route === "intro") {
    playIntroAnimation();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function playIntroAnimation() {
  const introTargets = [introLogo, introIllustration, startSurveyButton];

  if (!window.gsap) {
    introTargets.forEach((element) => {
      element.style.opacity = "1";
      element.style.transform = "";
    });
    return;
  }

  gsap.killTweensOf(introTargets);
  gsap.set(introLogo, { opacity: 0 });
  gsap.set(introIllustration, { opacity: 0, y: 24 });
  gsap.set(startSurveyButton, { opacity: 0, y: 0 });

  gsap
    .timeline({ defaults: { ease: "power2.out" } })
    .to(introLogo, { opacity: 1, duration: 0.3 })
    .to(introIllustration, { opacity: 1, y: 0, duration: 0.75 })
    .to(startSurveyButton, { opacity: 1, duration: 0.3 }, "-=0.2");
}

function readCompletionRecord() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function resetLocalDataWhenVersionChanges() {
  if (localStorage.getItem(DATA_VERSION_STORAGE_KEY) === SURVEY_VERSION) {
    return;
  }

  localStorage.removeItem(LOCAL_RESPONSES_STORAGE_KEY);
  localStorage.removeItem(COMPLETION_STORAGE_KEY);
  localStorage.setItem(DATA_VERSION_STORAGE_KEY, SURVEY_VERSION);
}

function isDebugMode() {
  return localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

function enforceCompletionGate() {
  const completionRecord = readCompletionRecord();

  if (!completionRecord || isDebugMode()) {
    return;
  }

  successMessage.textContent = SUCCESS_MESSAGE;
  showRoute("thanks");
}

function normalizeSpaces(value) {
  return value.trim().replace(/\s+/g, " ");
}

function validateFullName(value) {
  const normalizedName = normalizeSpaces(value);

  if (!normalizedName) {
    return { valid: false, message: "Vui lòng nhập họ và tên." };
  }

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return { valid: false, message: "Họ và tên cần từ 2 đến 80 ký tự." };
  }

  if (!/^[\p{L}\s'-]+$/u.test(normalizedName)) {
    return { valid: false, message: "Họ và tên không được chứa số hoặc ký tự đặc biệt." };
  }

  return { valid: true, value: normalizedName };
}

function validateParticipant() {
  const nameResult = validateFullName(fullNameInput.value);
  const selectedGender = document.querySelector("input[name='gender']:checked");
  const gender = selectedGender?.value || "";
  const ageRange = ageRangeInput.value;

  fullNameError.textContent = nameResult.valid ? "" : nameResult.message;
  genderError.textContent = gender ? "" : "Vui lòng chọn giới tính.";
  ageRangeError.textContent = ageRange ? "" : "Vui lòng chọn độ tuổi.";

  if (!nameResult.valid || !gender || !ageRange) {
    return false;
  }

  surveyState.participant = {
    fullName: nameResult.value,
    gender,
    ageRange,
    consentGiven: consentInput.checked
  };

  return true;
}

function startQuiz() {
  showQuestion(0);
  showRoute("quiz");
}

function renderQuestions() {
  questionList.innerHTML = QUESTIONS.map((question, index) => {
    const options = question.options
      .map(
        (option) => `
          <label>
            <input type="radio" name="${question.id}" value="${option.id}" />
            <span class="answer-copy">${option.label}</span>
          </label>
        `
      )
      .join("");
    const otherInput = question.other
      ? `
          <textarea
            class="other-answer"
            name="${question.id}-other"
            data-other-question="${question.id}"
            rows="4"
            placeholder="${question.other.placeholder}"
          ></textarea>
        `
      : "";

    return `
      <article class="question-card ${index === 0 ? "is-active" : ""}" data-question="${index}">
        <h2>${index + 1}. ${question.text}</h2>
        ${options}
        ${otherInput}
      </article>
    `;
  }).join("");
}

function showQuestion(index) {
  const questionCards = document.querySelectorAll(".question-card");
  activeQuestionIndex = Math.max(0, Math.min(index, questionCards.length - 1));

  questionCards.forEach((card, cardIndex) => {
    card.classList.toggle("is-active", cardIndex === activeQuestionIndex);
  });

  questionError.hidden = true;
  questionError.textContent = "";
  questionCounter.textContent = `Câu ${activeQuestionIndex + 1}/${QUESTIONS.length}`;
  previousQuestionButton.querySelector("img").alt = activeQuestionIndex === 0 ? "Quay lại" : "Câu trước";
  nextQuestionButton.querySelector("img").alt = activeQuestionIndex === QUESTIONS.length - 1 ? "Gửi khảo sát" : "Tiếp theo";

  const illustrationIndex = activeQuestionIndex + 1;

  quizBottomIllustration.hidden = illustrationIndex === 6;
  if (illustrationIndex < 6) {
    quizBottomIllustration.src = `./assets/img/question-${illustrationIndex}-bottom-img.png`;
    quizBottomIllustration.dataset.question = String(illustrationIndex);
  }
}

function getActiveQuestion() {
  return QUESTIONS[activeQuestionIndex];
}

function persistCurrentAnswer() {
  const question = getActiveQuestion();
  const otherInput = document.querySelector(`[data-other-question="${question.id}"]`);
  const otherValue = normalizeSpaces(otherInput?.value || "");

  if (otherValue) {
    surveyState.answers[question.id] = {
      type: "other",
      text: otherValue
    };
    return true;
  }

  const selectedOption = document.querySelector(`input[name="${question.id}"]:checked`);

  if (!selectedOption) {
    delete surveyState.answers[question.id];
    return false;
  }

  surveyState.answers[question.id] = selectedOption.value;
  return true;
}

function validateAllAnswers() {
  return QUESTIONS.every((question) => Boolean(surveyState.answers[question.id]));
}

function buildPayload() {
  const { fullName, gender, ageRange, consentGiven } = surveyState.participant;
  const participant = consentGiven
    ? { fullName, gender, ageRange }
    : {};

  return {
    submittedAt: new Date().toISOString(),
    consentGiven,
    anonymous: !consentGiven,
    participant,
    answers: { ...surveyState.answers },
    metadata: {
      source: "web",
      version: SURVEY_VERSION,
      storeMode: getStoreMode(),
      consentTextVersion: "vn-consent-2026-06-01"
    }
  };
}

function markSurveyCompleted(result) {
  const { fullName, gender, ageRange, consentGiven } = surveyState.participant;
  const participant = consentGiven
    ? { fullName, gender, ageRange }
    : {};
  const completedRecord = {
    completedAt: new Date().toISOString(),
    responseId: result.id,
    provider: result.provider,
    consentGiven,
    anonymous: !consentGiven,
    participant
  };

  localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(completedRecord));
}

async function submitSurvey() {
  if (isSubmitting) {
    return;
  }

  if (!persistCurrentAnswer()) {
    questionError.hidden = false;
    questionError.textContent = "Vui lòng chọn một câu trả lời trước khi gửi khảo sát.";
    return;
  }

  if (!validateAllAnswers()) {
    questionError.hidden = false;
    questionError.textContent = "Vui lòng trả lời đầy đủ tất cả câu hỏi.";
    return;
  }

  isSubmitting = true;
  retrySubmitButton.hidden = true;
  submitStatus.textContent = "Đang ghi dữ liệu khảo sát...";
  showRoute("submit");

  try {
    const result = await saveSurveyResponse(buildPayload());
    markSurveyCompleted(result);
    successMessage.textContent = SUCCESS_MESSAGE;
    showRoute("thanks");
  } catch (error) {
    submitStatus.textContent = `Không thể ghi dữ liệu: ${error.message}`;
    retrySubmitButton.hidden = false;
  } finally {
    isSubmitting = false;
  }
}

function resetSurvey() {
  localStorage.removeItem(COMPLETION_STORAGE_KEY);
  participantForm.reset();
  ageRangeInput.value = "";
  ageRangeButtons.forEach((button) => button.classList.remove("is-selected"));
  surveyState.participant = { fullName: "", gender: "", ageRange: "", consentGiven: false };
  surveyState.answers = {};
  document.querySelectorAll(".question-card input").forEach((input) => {
    input.checked = false;
  });
  document.querySelectorAll(".other-answer").forEach((textarea) => {
    textarea.value = "";
  });
  fullNameError.textContent = "";
  genderError.textContent = "";
  ageRangeError.textContent = "";
  questionError.hidden = true;
  questionError.textContent = "";
  showQuestion(0);
  showRoute("intro");
}

resetLocalDataWhenVersionChanges();
renderQuestions();
showQuestion(0);
enforceCompletionGate();

if (document.querySelector("#screen-intro").classList.contains("is-active")) {
  playIntroAnimation();
}

startSurveyButton.addEventListener("click", () => {
  showRoute("info");
});

ageRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ageRangeInput.value = button.dataset.ageRange;
    ageRangeButtons.forEach((item) => item.classList.toggle("is-selected", item === button));
    ageRangeError.textContent = "";
  });
});

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (validateParticipant()) {
    if (!consentInput.checked) {
      anonymousDialog.showModal();
      return;
    }

    startQuiz();
  }
});

questionList.addEventListener("change", (event) => {
  if (event.target.matches("input[type='radio']")) {
    const question = QUESTIONS.find((item) => item.id === event.target.name);
    const otherInput = question?.other ? document.querySelector(`[data-other-question="${question.id}"]`) : null;

    if (otherInput) {
      otherInput.value = "";
    }

    persistCurrentAnswer();
    questionError.hidden = true;
    questionError.textContent = "";
  }
});

questionList.addEventListener("input", (event) => {
  if (!event.target.matches(".other-answer")) {
    return;
  }

  const questionId = event.target.dataset.otherQuestion;

  if (normalizeSpaces(event.target.value)) {
    document.querySelectorAll(`input[name="${questionId}"]`).forEach((input) => {
      input.checked = false;
    });
  }

  if (questionId === getActiveQuestion().id) {
    persistCurrentAnswer();
    questionError.hidden = true;
    questionError.textContent = "";
  }
});

openPolicyButton.addEventListener("click", () => {
  policyDialog.showModal();
});

closePolicyButton.addEventListener("click", () => {
  policyDialog.close();
});

closeDialogOnBackdropClick(policyDialog);
closeDialogOnBackdropClick(anonymousDialog);

confirmAnonymousButton.addEventListener("click", () => {
  anonymousDialog.close();
  startQuiz();
});

previousQuestionButton.addEventListener("click", () => {
  if (activeQuestionIndex === 0) {
    showRoute("info");
    return;
  }

  showQuestion(activeQuestionIndex - 1);
});

nextQuestionButton.addEventListener("click", () => {
  if (!persistCurrentAnswer()) {
    questionError.hidden = false;
    questionError.textContent = "Vui lòng chọn một câu trả lời trước khi tiếp tục.";
    return;
  }

  if (activeQuestionIndex === QUESTIONS.length - 1) {
    submitSurvey();
    return;
  }

  showQuestion(activeQuestionIndex + 1);
});

retrySubmitButton.addEventListener("click", submitSurvey);
newSurveyButton.addEventListener("click", () => {
  resetSurvey();
});
})();
