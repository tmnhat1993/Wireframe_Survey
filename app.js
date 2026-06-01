(function () {
const { QUESTIONS, SURVEY_VERSION } = window.SurveyQuestions;
const { getStoreMode, saveSurveyResponse } = window.SurveyStore;

const screens = document.querySelectorAll(".screen");
const participantForm = document.querySelector("#participant-form");
const fullNameInput = document.querySelector("#full-name");
const phoneInput = document.querySelector("#phone");
const consentInput = document.querySelector("#consent");
const fullNameError = document.querySelector("#full-name-error");
const phoneError = document.querySelector("#phone-error");
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
const submitStatus = document.querySelector("#submit-status");
const retrySubmitButton = document.querySelector("#retry-submit");
const newSurveyButton = document.querySelector("#new-survey");
const successMessage = document.querySelector("#success-message");

let activeQuestionIndex = 0;
let isSubmitting = false;

const surveyState = {
  participant: {
    fullName: "",
    phone: "",
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

function normalizeVietnamPhone(value) {
  const compactPhone = value.replace(/[\s.-]/g, "");

  if (!compactPhone) {
    return { valid: true, value: "" };
  }

  if (/^0\d{9}$/.test(compactPhone)) {
    return { valid: true, value: compactPhone };
  }

  if (/^\+84\d{9}$/.test(compactPhone)) {
    return { valid: true, value: `0${compactPhone.slice(3)}` };
  }

  if (/^84\d{9}$/.test(compactPhone)) {
    return { valid: true, value: `0${compactPhone.slice(2)}` };
  }

  return { valid: false, message: "Số điện thoại Việt Nam không hợp lệ." };
}

function validateParticipant() {
  const nameResult = validateFullName(fullNameInput.value);
  const phoneResult = normalizeVietnamPhone(phoneInput.value);

  fullNameError.textContent = nameResult.valid ? "" : nameResult.message;
  phoneError.textContent = phoneResult.valid ? "" : phoneResult.message;

  if (!nameResult.valid || !phoneResult.valid) {
    return false;
  }

  surveyState.participant = {
    fullName: nameResult.value,
    phone: phoneResult.value,
    consentGiven: consentInput.checked
  };

  if (phoneResult.value) {
    phoneInput.value = phoneResult.value;
  }

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

    return `
      <article class="question-card ${index === 0 ? "is-active" : ""}" data-question="${index}">
        <h2>${index + 1}. ${question.text}</h2>
        ${options}
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
  previousQuestionButton.textContent = activeQuestionIndex === 0 ? "Quay lại" : "Câu trước";
  nextQuestionButton.textContent = activeQuestionIndex === QUESTIONS.length - 1 ? "Gửi khảo sát" : "Tiếp theo";
}

function getActiveQuestion() {
  return QUESTIONS[activeQuestionIndex];
}

function persistCurrentAnswer() {
  const question = getActiveQuestion();
  const selectedOption = document.querySelector(`input[name="${question.id}"]:checked`);

  if (!selectedOption) {
    return false;
  }

  surveyState.answers[question.id] = selectedOption.value;
  return true;
}

function validateAllAnswers() {
  return QUESTIONS.every((question) => Boolean(surveyState.answers[question.id]));
}

function buildPayload() {
  const { fullName, phone, consentGiven } = surveyState.participant;

  return {
    consentGiven,
    anonymous: !consentGiven,
    participant: consentGiven ? { fullName, phone } : null,
    answers: { ...surveyState.answers },
    metadata: {
      source: "web",
      version: SURVEY_VERSION,
      storeMode: getStoreMode(),
      consentTextVersion: "vn-consent-2026-06-01"
    }
  };
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
    const actionText = result.mode === "overwrite" ? "cập nhật" : "ghi nhận";
    successMessage.textContent =
      result.provider === "firebase"
        ? `Khảo sát của bạn đã được ${actionText} thành công trên hệ thống.`
        : `Khảo sát của bạn đã được ${actionText} thành công ở chế độ local demo.`;
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
  surveyState.participant = { fullName: "", phone: "", consentGiven: false };
  surveyState.answers = {};
  document.querySelectorAll(".question-card input").forEach((input) => {
    input.checked = false;
  });
  fullNameError.textContent = "";
  phoneError.textContent = "";
  questionError.textContent = "";
  showQuestion(0);
  showRoute("info");
}

renderQuestions();
showQuestion(0);

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
newSurveyButton.addEventListener("click", resetSurvey);
})();
