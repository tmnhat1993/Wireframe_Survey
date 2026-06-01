const routeButtons = document.querySelectorAll("[data-route]");
const navButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".screen");
const policyDialog = document.querySelector("#policy-dialog");
const openPolicyButton = document.querySelector("#open-policy");
const closePolicyButton = document.querySelector("#close-policy");
const unlockStatsButton = document.querySelector("#unlock-stats");
const passwordInput = document.querySelector("#password-input");
const statsLock = document.querySelector("#stats-lock");
const statsContent = document.querySelector("#stats-content");
const questionCards = document.querySelectorAll(".question-card");
const questionCounter = document.querySelector("#question-counter");
const previousQuestionButton = document.querySelector("#previous-question");
const nextQuestionButton = document.querySelector("#next-question");
let activeQuestionIndex = 0;

function showRoute(route) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${route}`);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === route);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showQuestion(index) {
  activeQuestionIndex = Math.max(0, Math.min(index, questionCards.length - 1));

  questionCards.forEach((card, cardIndex) => {
    card.classList.toggle("is-active", cardIndex === activeQuestionIndex);
  });

  questionCounter.textContent = `Câu ${activeQuestionIndex + 1}/${questionCards.length}`;
  previousQuestionButton.textContent = activeQuestionIndex === 0 ? "Quay lại" : "Câu trước";
  nextQuestionButton.textContent = activeQuestionIndex === questionCards.length - 1 ? "Gửi khảo sát" : "Tiếp theo";
}

routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showRoute(button.dataset.route);
  });
});

openPolicyButton.addEventListener("click", () => {
  policyDialog.showModal();
});

closePolicyButton.addEventListener("click", () => {
  policyDialog.close();
});

unlockStatsButton.addEventListener("click", () => {
  if (passwordInput.value === "admin123") {
    statsLock.hidden = true;
    statsContent.hidden = false;
    return;
  }

  passwordInput.focus();
  passwordInput.select();
});

previousQuestionButton.addEventListener("click", () => {
  if (activeQuestionIndex === 0) {
    showRoute("info");
    return;
  }

  showQuestion(activeQuestionIndex - 1);
});

nextQuestionButton.addEventListener("click", () => {
  if (activeQuestionIndex === questionCards.length - 1) {
    showRoute("thanks");
    return;
  }

  showQuestion(activeQuestionIndex + 1);
});

showQuestion(0);
