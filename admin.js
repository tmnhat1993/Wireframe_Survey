(function () {
const { QUESTIONS, getOptionLabel, getQuestionText } = window.SurveyQuestions;
const { getStoreMode, listSurveyResponses, signInAdmin } = window.SurveyStore;
const ADMIN_FALLBACK = window.SURVEY_ADMIN_FALLBACK;

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
const refreshDataButton = document.querySelector("#refresh-data");
const exportCsvButton = document.querySelector("#export-csv");
const dateFilterForm = document.querySelector("#date-filter-form");
const filterStartDateInput = document.querySelector("#filter-start-date");
const filterEndDateInput = document.querySelector("#filter-end-date");
const clearDateFilterButton = document.querySelector("#clear-date-filter");
const filterSummary = document.querySelector("#filter-summary");
const participantsPrevPageButton = document.querySelector("#participants-prev-page");
const participantsNextPageButton = document.querySelector("#participants-next-page");
const participantsPageSummary = document.querySelector("#participants-page-summary");

let allResponses = [];
let filteredResponses = [];
let currentParticipantsPage = 1;
const PARTICIPANTS_PAGE_SIZE = 10;

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
  });

  items.forEach((response) => {
    Object.entries(response.answers || {}).forEach(([questionId, optionId]) => {
      if (!summary[questionId]) {
        summary[questionId] = {};
      }

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
    const total = question.options.reduce((sum, option) => sum + (summary[question.id]?.[option.id] || 0), 0);
    const rows = question.options
      .map((option) => {
      const count = summary[question.id]?.[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

      return `
          <div class="chart-row">
            <div class="chart-row-label">
              <span>${escapeHtml(option.label)}</span>
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
      const optionId = response.answers?.[question.id];
      return `${question.id}: ${optionId ? getOptionLabel(question.id, optionId) : "-"}`;
    }).join("; ");

    return `
      <tr>
        <td>${escapeHtml(formatDate(getResponseSubmittedAt(response)))}</td>
        <td>${escapeHtml(participant.fullName || "Ẩn danh")}</td>
        <td>${escapeHtml(participant.phone || "")}</td>
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

  const firstItem = filteredResponses.length ? startIndex + 1 : 0;
  const lastItem = Math.min(startIndex + pageResponses.length, filteredResponses.length);
  participantsPageSummary.textContent = `Trang ${currentParticipantsPage}/${pageCount} · ${firstItem}-${lastItem}/${filteredResponses.length}`;
  participantsPrevPageButton.disabled = currentParticipantsPage <= 1;
  participantsNextPageButton.disabled = currentParticipantsPage >= pageCount;
}

function renderAdmin() {
  renderMetrics();
  renderAnswerCharts();
  renderParticipantsTable();
  updateFilterSummary();
}

async function loadResponses() {
  adminLoginMessage.textContent = "Đang tải dữ liệu...";

  try {
    allResponses = await listSurveyResponses();
    applyDateFilter();
    adminLoginMessage.textContent = `Đã tải ${allResponses.length} bản ghi từ ${getStoreMode() === "firebase" ? "Firebase" : "localStorage"}.`;
  } catch (error) {
    adminLoginMessage.textContent = `Không thể tải dữ liệu: ${error.message}`;
  }
}

function canUseFallbackLogin(adminId, password) {
  return getStoreMode() === "local" && adminId === ADMIN_FALLBACK.id && password === ADMIN_FALLBACK.password;
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
    const row = {
      id: response.id,
      submittedAt: formatDate(getResponseSubmittedAt(response)),
      createdAt: formatDate(response.createdAt),
      consentGiven: response.consentGiven ? "Có" : "Không",
      anonymous: response.anonymous ? "Có" : "Không",
      fullName: response.participant?.fullName || "",
      phone: response.participant?.phone || ""
    };

    QUESTIONS.forEach((question) => {
      row[question.id] = getOptionLabel(question.id, response.answers?.[question.id] || "");
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

function exportCsv() {
  const rows = flattenResponses();
  const headers = ["id", "submittedAt", "createdAt", "consentGiven", "anonymous", "fullName", "phone", ...QUESTIONS.map((question) => question.id)];
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

  try {
    if (canUseFallbackLogin(adminId, password)) {
      adminLogin.hidden = true;
      adminContent.hidden = false;
      await loadResponses();
      return;
    }

    if (getStoreMode() === "local") {
      throw new Error("Admin ID hoặc mật khẩu không đúng.");
    }

    await signInAdmin(adminId, password);
    adminLogin.hidden = true;
    adminContent.hidden = false;
    await loadResponses();
  } catch (error) {
    adminLoginMessage.textContent = `Đăng nhập không thành công: ${getFriendlyAuthError(error)}`;
  }
});

refreshDataButton.addEventListener("click", loadResponses);
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
})();
