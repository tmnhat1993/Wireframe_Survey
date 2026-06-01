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
const statsTableBody = document.querySelector("#stats-table-body");
const participantsTableBody = document.querySelector("#participants-table-body");
const refreshDataButton = document.querySelector("#refresh-data");
const exportCsvButton = document.querySelector("#export-csv");
const exportExcelButton = document.querySelector("#export-excel");

let responses = [];

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
  metricTotal.textContent = responses.length;
  metricConsent.textContent = responses.filter((response) => response.consentGiven).length;
  metricAnonymous.textContent = responses.filter((response) => response.anonymous || !response.consentGiven).length;
}

function renderStatsTable() {
  const summary = summarizeAnswers(responses);

  statsTableBody.innerHTML = QUESTIONS.flatMap((question) =>
    question.options.map((option) => {
      const count = summary[question.id]?.[option.id] || 0;

      return `
        <tr>
          <td>${escapeHtml(question.text)}</td>
          <td>${escapeHtml(option.label)}</td>
          <td>${count}</td>
        </tr>
      `;
    })
  ).join("");
}

function renderParticipantsTable() {
  participantsTableBody.innerHTML = responses.map((response) => {
    const participant = response.participant || {};
    const answerLabels = QUESTIONS.map((question) => {
      const optionId = response.answers?.[question.id];
      return `${question.id}: ${optionId ? getOptionLabel(question.id, optionId) : "-"}`;
    }).join("; ");

    return `
      <tr>
        <td>${escapeHtml(formatDate(response.createdAt))}</td>
        <td>${escapeHtml(participant.fullName || "Ẩn danh")}</td>
        <td>${escapeHtml(participant.phone || "")}</td>
        <td>${response.consentGiven ? "Có" : "Không"}</td>
        <td>${escapeHtml(answerLabels)}</td>
      </tr>
    `;
  }).join("");
}

function renderAdmin() {
  renderMetrics();
  renderStatsTable();
  renderParticipantsTable();
}

async function loadResponses() {
  adminLoginMessage.textContent = "Đang tải dữ liệu...";

  try {
    responses = await listSurveyResponses();
    renderAdmin();
    adminLoginMessage.textContent = `Đã tải ${responses.length} bản ghi từ ${getStoreMode() === "firebase" ? "Firebase" : "localStorage"}.`;
  } catch (error) {
    adminLoginMessage.textContent = `Không thể tải dữ liệu: ${error.message}`;
  }
}

function canUseFallbackLogin(adminId, password) {
  return getStoreMode() === "local" && adminId === ADMIN_FALLBACK.id && password === ADMIN_FALLBACK.password;
}

function flattenResponses() {
  return responses.map((response) => {
    const row = {
      id: response.id,
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
  const headers = ["id", "createdAt", "consentGiven", "anonymous", "fullName", "phone", ...QUESTIONS.map((question) => question.id)];
  const csv = [
    headers.map(toCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(","))
  ].join("\n");

  downloadFile("survey-responses.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function exportExcel() {
  const rows = flattenResponses();
  const headers = ["id", "createdAt", "consentGiven", "anonymous", "fullName", "phone", ...QUESTIONS.map((question) => getQuestionText(question.id))];
  const body = rows
    .map((row) => {
      const values = ["id", "createdAt", "consentGiven", "anonymous", "fullName", "phone", ...QUESTIONS.map((question) => question.id)];
      return `<tr>${values.map((key) => `<td>${escapeHtml(row[key])}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadFile("survey-responses.xls", html, "application/vnd.ms-excel;charset=utf-8");
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
    adminLoginMessage.textContent = `Đăng nhập không thành công: ${error.message}`;
  }
});

refreshDataButton.addEventListener("click", loadResponses);
exportCsvButton.addEventListener("click", exportCsv);
exportExcelButton.addEventListener("click", exportExcel);
})();
