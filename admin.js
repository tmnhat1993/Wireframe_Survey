(function () {
const { QUESTIONS, getOptionLabel, getQuestionText } = window.SurveyQuestions;
const { getStoreMode, listSurveyResponses, signInAdmin, signOutAdmin, getCurrentAdminUser, deleteAllSurveyResponses } = window.SurveyStore;

const ADMIN_SESSION_KEY = "survey-admin-session-expires-at";
const ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const adminLoginScreen = document.querySelector("#admin-login-screen");
const adminLogin = document.querySelector("#admin-login");
const adminIdInput = document.querySelector("#admin-id");
const adminPasswordInput = document.querySelector("#admin-password");
const adminLoginMessage = document.querySelector("#admin-login-message");
const adminContent = document.querySelector("#admin-content");
const metricTotal = document.querySelector("#metric-total");
const metricConsent = document.querySelector("#metric-consent");
const metricAnonymous = document.querySelector("#metric-anonymous");
const answerCharts = document.querySelector("#answer-charts");
const participantsTableBody = document.querySelector("#participants-table-body");
const exportCsvButton = document.querySelector("#export-csv");
const exportCsvBar = document.querySelector("#export-csv-bar");
const deleteAllDataButton = document.querySelector("#delete-all-data");
const deleteDataDialog = document.querySelector("#delete-data-dialog");
const cancelDeleteDataButton = document.querySelector("#cancel-delete-data");
const confirmDeleteDataButton = document.querySelector("#confirm-delete-data");
const dateFilterForm = document.querySelector("#date-filter-form");
const filterStartDateInput = document.querySelector("#filter-start-date");
const filterEndDateInput = document.querySelector("#filter-end-date");
const clearDateFilterButton = document.querySelector("#clear-date-filter");
const filterSummary = document.querySelector("#filter-summary");
const participantsPrevPageButton = document.querySelector("#participants-prev-page");
const participantsNextPageButton = document.querySelector("#participants-next-page");
const participantsPageSummary = document.querySelector("#participants-page-summary");
const participantsListSummary = document.querySelector("#participants-list-summary");

let allResponses = [];
let filteredResponses = [];
let currentParticipantsPage = 1;
const PARTICIPANTS_PAGE_SIZE = 10;

function saveAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, String(Date.now() + ADMIN_SESSION_DURATION_MS));
}

function isAdminSessionValid() {
  const expiresAt = Number(localStorage.getItem(ADMIN_SESSION_KEY) || "0");
  return Date.now() < expiresAt;
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function showAdminDashboard() {
  adminLoginScreen.hidden = true;
  adminContent.hidden = false;
  updateExportCsvFixed();
}

function showAdminLogin(message = "") {
  adminLoginScreen.hidden = false;
  adminContent.hidden = true;
  adminLoginMessage.textContent = message;
  exportCsvBar.classList.remove("is-fixed");
  adminContent.classList.remove("is-export-fixed");
}

async function requireFirebaseAdmin() {
  if (getStoreMode() !== "firebase") {
    throw new Error("Admin chỉ hỗ trợ đăng nhập Firebase.");
  }

  const user = await getCurrentAdminUser();

  if (!user || !isAdminSessionValid()) {
    if (user) {
      await signOutAdmin();
    }
    clearAdminSession();
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  return user;
}

async function restoreAdminSession() {
  if (getStoreMode() !== "firebase") {
    showAdminLogin("Admin chỉ hỗ trợ đăng nhập Firebase.");
    return;
  }

  const user = await getCurrentAdminUser();

  if (!user) {
    clearAdminSession();
    return;
  }

  if (!isAdminSessionValid()) {
    await signOutAdmin();
    clearAdminSession();
    showAdminLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    return;
  }

  showAdminDashboard();
  await loadResponses();
}

function closeDialogOnBackdropClick(dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
}

function formatGender(value) {
  if (value === "male") {
    return "Nam";
  }

  if (value === "female") {
    return "Nữ";
  }

  return "";
}

function formatAgeRange(value) {
  if (value === "18-24") {
    return "18-24 tuổi";
  }

  if (value === "24-45") {
    return "24 - 45 tuổi";
  }

  if (value === "45+") {
    return "Trên 45 tuổi";
  }

  return "";
}

function isAnonymousResponse(response) {
  return Boolean(response.anonymous || !response.consentGiven);
}

function formatParticipantProfile(response) {
  if (isAnonymousResponse(response)) {
    return "-";
  }

  const participant = response.participant || {};
  const gender = formatGender(participant.gender);
  const ageRange = formatAgeRange(participant.ageRange);
  const parts = [gender, ageRange].filter(Boolean);

  return parts.length ? parts.join(" · ") : "-";
}

function getOptionDisplayLabel(option) {
  if (option.id === "other") {
    return "Khác";
  }

  return option.id;
}

function formatAnswerShort(answer) {
  if (!answer) {
    return "-";
  }

  if (typeof answer === "object" && answer?.type === "other") {
    return "Khác";
  }

  return String(answer);
}

function formatAnswerExport(questionId, answer) {
  if (!answer) {
    return "";
  }

  return getOptionLabel(questionId, answer);
}

function getResponseSubmittedAt(response) {
  return response.submittedAt || response.createdAt || "";
}

function parseFilterStart(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

function parseFilterEnd(value) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T23:59:59.999`);
}

function isWithinDateRange(response, startDate, endDate) {
  const submittedAt = getResponseSubmittedAt(response);
  const submittedDate = new Date(submittedAt);

  if (!submittedAt || Number.isNaN(submittedDate.getTime())) {
    return false;
  }

  if (startDate && submittedDate < startDate) {
    return false;
  }

  if (endDate && submittedDate > endDate) {
    return false;
  }

  return true;
}

function formatFilterDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("vi-VN");
}

function updateFilterSummary() {
  const startDateText = formatFilterDate(filterStartDateInput.value);
  const endDateText = formatFilterDate(filterEndDateInput.value);

  if (!filterStartDateInput.value && !filterEndDateInput.value) {
    filterSummary.textContent = `Đang hiển thị tất cả ${filteredResponses.length} bản ghi.`;
    return;
  }

  const rangeText = [
    startDateText ? `từ 00:00:00 ${startDateText}` : "",
    endDateText ? `đến 23:59:59 ${endDateText}` : ""
  ].filter(Boolean).join(" ");

  filterSummary.textContent = `Đang hiển thị ${filteredResponses.length}/${allResponses.length} bản ghi ${rangeText}.`;
}

function applyDateFilter() {
  const startDate = parseFilterStart(filterStartDateInput.value);
  const endDate = parseFilterEnd(filterEndDateInput.value);

  filteredResponses = allResponses.filter((response) => isWithinDateRange(response, startDate, endDate));
  currentParticipantsPage = 1;
  renderAdmin();
}

function summarizeAnswers(items) {
  const summary = {};

  QUESTIONS.forEach((question) => {
    summary[question.id] = {};
    question.options.forEach((option) => {
      summary[question.id][option.id] = 0;
    });

    if (question.other) {
      summary[question.id][question.other.id] = 0;
    }
  });

  items.forEach((response) => {
    Object.entries(response.answers || {}).forEach(([questionId, answer]) => {
      if (!summary[questionId]) {
        summary[questionId] = {};
      }

      const optionId = answer?.type === "other" ? "other" : answer;
      summary[questionId][optionId] = (summary[questionId][optionId] || 0) + 1;
    });
  });

  return summary;
}

function renderMetrics() {
  metricTotal.textContent = filteredResponses.length;
  metricConsent.textContent = filteredResponses.filter((response) => response.consentGiven).length;
  metricAnonymous.textContent = filteredResponses.filter((response) => response.anonymous || !response.consentGiven).length;
}

function renderAnswerCharts() {
  const summary = summarizeAnswers(filteredResponses);

  answerCharts.innerHTML = QUESTIONS.map((question, questionIndex) => {
    const answerOptions = question.other ? [...question.options, question.other] : question.options;
    const total = answerOptions.reduce((sum, option) => sum + (summary[question.id]?.[option.id] || 0), 0);
    const rows = answerOptions
      .map((option) => {
      const count = summary[question.id]?.[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

      return `
          <div class="chart-row">
            <div class="chart-row-label">
              <span>${escapeHtml(getOptionDisplayLabel(option))}</span>
              <strong>${count} (${percent}%)</strong>
            </div>
            <div class="chart-track" aria-hidden="true">
              <span class="chart-bar chart-color-${questionIndex % 6}" style="width: ${percent}%"></span>
            </div>
          </div>
      `;
      })
      .join("");

    return `
      <article class="chart-card">
        <div class="chart-card-header">
          <h3>${escapeHtml(question.text)}</h3>
          <span>${total} lượt trả lời</span>
        </div>
        <div class="chart-rows">${rows}</div>
      </article>
    `;
  }).join("");
}

function renderParticipantsTable() {
  const pageCount = Math.max(1, Math.ceil(filteredResponses.length / PARTICIPANTS_PAGE_SIZE));
  currentParticipantsPage = Math.min(Math.max(currentParticipantsPage, 1), pageCount);

  const startIndex = (currentParticipantsPage - 1) * PARTICIPANTS_PAGE_SIZE;
  const pageResponses = filteredResponses.slice(startIndex, startIndex + PARTICIPANTS_PAGE_SIZE);

  participantsTableBody.innerHTML = pageResponses.map((response) => {
    const participant = response.participant || {};
    const answerLabels = QUESTIONS.map((question) => {
      const answer = response.answers?.[question.id];
      return `${question.id}: ${formatAnswerShort(answer)}`;
    }).join("; ");

    return `
      <tr>
        <td>${escapeHtml(formatDate(getResponseSubmittedAt(response)))}</td>
        <td>${escapeHtml(participant.fullName || "Ẩn danh")}</td>
        <td>${escapeHtml(formatParticipantProfile(response))}</td>
        <td>${response.consentGiven ? "Có" : "Không"}</td>
        <td>${escapeHtml(answerLabels)}</td>
      </tr>
    `;
  }).join("");

  if (!pageResponses.length) {
    participantsTableBody.innerHTML = `
      <tr>
        <td colspan="5">Không có dữ liệu trong phạm vi lọc.</td>
      </tr>
    `;
  }

  participantsPageSummary.textContent = `${currentParticipantsPage} / ${pageCount}`;
  participantsListSummary.textContent = `Tổng cộng ${filteredResponses.length} kết quả · ${PARTICIPANTS_PAGE_SIZE} kết quả / trang`;
  participantsPrevPageButton.disabled = currentParticipantsPage <= 1;
  participantsNextPageButton.disabled = currentParticipantsPage >= pageCount;
}

function renderAdmin() {
  renderMetrics();
  renderAnswerCharts();
  renderParticipantsTable();
  updateFilterSummary();
}

async function loadResponses(options = {}) {
  try {
    await requireFirebaseAdmin();
    allResponses = await listSurveyResponses(options);
    applyDateFilter();
  } catch (error) {
    showAdminLogin(error.message);
  }
}

function getFriendlyAuthError(error) {
  const message = error.message || "";

  if (message.includes("auth/configuration-not-found")) {
    return "Firebase Authentication chưa được bật hoặc chưa bật Email/Password cho project này.";
  }

  if (message.includes("auth/invalid-credential") || message.includes("auth/user-not-found") || message.includes("auth/wrong-password")) {
    return "Admin ID hoặc mật khẩu không đúng.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Admin ID cần là email hợp lệ khi dùng Firebase Auth.";
  }

  return error.message;
}

function flattenResponses() {
  return filteredResponses.map((response) => {
    const participant = response.participant || {};
    const anonymous = isAnonymousResponse(response);
    const row = {
      id: response.id,
      submittedAt: formatDate(getResponseSubmittedAt(response)),
      createdAt: formatDate(response.createdAt),
      consentGiven: response.consentGiven ? "Có" : "Không",
      anonymous: anonymous ? "Có" : "Không",
      fullName: anonymous ? "" : participant.fullName || "",
      gender: anonymous ? "" : formatGender(participant.gender),
      ageRange: anonymous ? "" : formatAgeRange(participant.ageRange)
    };

    QUESTIONS.forEach((question) => {
      row[question.id] = formatAnswerExport(question.id, response.answers?.[question.id]);
    });

    return row;
  });
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function updateExportCsvFixed() {
  if (adminContent.hidden) {
    exportCsvBar.classList.remove("is-fixed");
    return;
  }

  const scrollThreshold = window.innerHeight * 0.3;
  const isFixed = window.scrollY > scrollThreshold;
  exportCsvBar.classList.toggle("is-fixed", isFixed);
  adminContent.classList.toggle("is-export-fixed", isFixed);
}

function exportCsv() {
  const rows = flattenResponses();
  const headers = ["id", "submittedAt", "createdAt", "consentGiven", "anonymous", "fullName", "gender", "ageRange", ...QUESTIONS.map((question) => question.id)];
  const csv = [
    headers.map(toCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(","))
  ].join("\n");

  downloadFile("survey-responses.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

adminLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const adminId = adminIdInput.value.trim();
  const password = adminPasswordInput.value;

  if (!adminId || !password) {
    adminLoginMessage.textContent = "Vui lòng nhập Admin ID và mật khẩu.";
    return;
  }

  if (getStoreMode() !== "firebase") {
    adminLoginMessage.textContent = "Admin chỉ hỗ trợ đăng nhập Firebase.";
    return;
  }

  adminLoginMessage.textContent = "Đang đăng nhập...";

  try {
    await signInAdmin(adminId, password);
    saveAdminSession();
    showAdminDashboard();
    await loadResponses();
    adminLoginMessage.textContent = "";
  } catch (error) {
    clearAdminSession();
    adminLoginMessage.textContent = `Đăng nhập không thành công: ${getFriendlyAuthError(error)}`;
  }
});

deleteAllDataButton.addEventListener("click", () => {
  deleteDataDialog.showModal();
});

cancelDeleteDataButton.addEventListener("click", () => {
  deleteDataDialog.close();
});

confirmDeleteDataButton.addEventListener("click", async () => {
  confirmDeleteDataButton.disabled = true;

  try {
    await requireFirebaseAdmin();
    const result = await deleteAllSurveyResponses();
    deleteDataDialog.close();
    await loadResponses({ fromServer: true });
    currentParticipantsPage = 1;

    if (result.count === 0) {
      filterSummary.textContent = "Không có dữ liệu để xóa trên server.";
      return;
    }

    filterSummary.textContent = `Đã xóa ${result.count} kết quả khảo sát.`;
  } catch (error) {
    filterSummary.textContent = `Không thể xóa dữ liệu: ${error.message}`;
  } finally {
    confirmDeleteDataButton.disabled = false;
  }
});

closeDialogOnBackdropClick(deleteDataDialog);

window.addEventListener("scroll", updateExportCsvFixed, { passive: true });
window.addEventListener("resize", updateExportCsvFixed);

exportCsvButton.addEventListener("click", exportCsv);

participantsPrevPageButton.addEventListener("click", () => {
  currentParticipantsPage -= 1;
  renderParticipantsTable();
});

participantsNextPageButton.addEventListener("click", () => {
  currentParticipantsPage += 1;
  renderParticipantsTable();
});

dateFilterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyDateFilter();
});

filterStartDateInput.addEventListener("change", applyDateFilter);
filterEndDateInput.addEventListener("change", applyDateFilter);

clearDateFilterButton.addEventListener("click", () => {
  filterStartDateInput.value = "";
  filterEndDateInput.value = "";
  applyDateFilter();
});

restoreAdminSession();
})();
