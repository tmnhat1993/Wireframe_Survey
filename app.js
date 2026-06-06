(function () {
const { QUESTIONS, SURVEY_VERSION } = window.SurveyQuestions;
const { getStoreMode, saveSurveyResponse } = window.SurveyStore;

const screens = document.querySelectorAll(".screen");
const startSurveyButton = document.querySelector("#start-survey");
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
const debugModeInput = document.querySelector("#debug-mode");

const COMPLETION_STORAGE_KEY = "survey-app-completed-participant";
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

function showRoute(route) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${route}`);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
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
  return debugModeInput.checked;
}

function syncDebugMode() {
  debugModeInput.checked = localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  newSurveyButton.hidden = !isDebugMode();
}

function enforceCompletionGate() {
  const completionRecord = readCompletionRecord();

  if (!completionRecord || isDebugMode()) {
    return;
  }

  successMessage.textContent = "Bạn đã hoàn thành khảo sát. Hệ thống đã ghi nhận lượt tham gia của bạn.";
  newSurveyButton.hidden = true;
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
            <span>${option.label}</span>
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

  questionError.textContent = "";
  questionCounter.textContent = `Câu ${activeQuestionIndex + 1}/${QUESTIONS.length}`;
  previousQuestionButton.querySelector("img").alt = activeQuestionIndex === 0 ? "Quay lại" : "Câu trước";
  nextQuestionButton.querySelector("img").alt = activeQuestionIndex === QUESTIONS.length - 1 ? "Gửi khảo sát" : "Tiếp theo";

  const illustrationIndex = Math.min(activeQuestionIndex + 1, 5);
  quizBottomIllustration.src = `./assets/img/question-${illustrationIndex}-bottom-img.png`;
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
    : { gender, ageRange };

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
    : { gender, ageRange };
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
    questionError.textContent = "Vui lòng chọn một câu trả lời trước khi gửi khảo sát.";
    return;
  }

  if (!validateAllAnswers()) {
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
    const actionText = result.mode === "overwrite" ? "cập nhật" : "ghi nhận";
    successMessage.textContent =
      result.provider === "firebase"
        ? `Khảo sát của bạn đã được ${actionText} thành công trên hệ thống.`
        : `Khảo sát của bạn đã được ${actionText} thành công ở chế độ local demo.`;
    newSurveyButton.hidden = !isDebugMode();
    showRoute("thanks");
  } catch (error) {
    submitStatus.textContent = `Không thể ghi dữ liệu: ${error.message}`;
    retrySubmitButton.hidden = false;
  } finally {
    isSubmitting = false;
  }
}

function resetSurvey() {
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
  questionError.textContent = "";
  showQuestion(0);
  showRoute("intro");
}

resetLocalDataWhenVersionChanges();
renderQuestions();
showQuestion(0);
syncDebugMode();
enforceCompletionGate();

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
    questionError.textContent = "";
  }
});

openPolicyButton.addEventListener("click", () => {
  policyDialog.showModal();
});

closePolicyButton.addEventListener("click", () => {
  policyDialog.close();
});

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
  if (isDebugMode()) {
    resetSurvey();
  }
});

debugModeInput.addEventListener("change", () => {
  localStorage.setItem(DEBUG_STORAGE_KEY, String(debugModeInput.checked));
  newSurveyButton.hidden = !isDebugMode();
  enforceCompletionGate();
});
})();
