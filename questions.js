(function () {
const SURVEY_VERSION = "1.0.0";

const QUESTIONS = [
  {
    id: "q1",
    text: "Bạn biết đến chương trình qua kênh nào?",
    options: [
      { id: "social", label: "Mạng xã hội" },
      { id: "friend", label: "Bạn bè giới thiệu" },
      { id: "website", label: "Website" },
      { id: "store", label: "Tại cửa hàng" }
    ]
  },
  {
    id: "q2",
    text: "Bạn đánh giá trải nghiệm tổng thể như thế nào?",
    options: [
      { id: "very_satisfied", label: "Rất hài lòng" },
      { id: "satisfied", label: "Hài lòng" },
      { id: "neutral", label: "Bình thường" },
      { id: "unsatisfied", label: "Chưa hài lòng" }
    ]
  },
  {
    id: "q3",
    text: "Nội dung chương trình có dễ hiểu không?",
    options: [
      { id: "very_easy", label: "Rất dễ hiểu" },
      { id: "easy", label: "Dễ hiểu" },
      { id: "needs_clearer", label: "Cần rõ hơn" },
      { id: "difficult", label: "Khó hiểu" }
    ]
  },
  {
    id: "q4",
    text: "Bạn quan tâm nhất đến yếu tố nào?",
    options: [
      { id: "gift", label: "Quà tặng" },
      { id: "promotion", label: "Ưu đãi" },
      { id: "consulting", label: "Nội dung tư vấn" },
      { id: "time", label: "Thời gian tham gia" }
    ]
  },
  {
    id: "q5",
    text: "Bạn có muốn nhận thông tin chương trình mới không?",
    options: [
      { id: "sms", label: "Có, qua SMS" },
      { id: "email", label: "Có, qua email" },
      { id: "call", label: "Có, qua cuộc gọi" },
      { id: "no", label: "Không" }
    ]
  },
  {
    id: "q6",
    text: "Khả năng bạn giới thiệu chương trình cho người khác?",
    options: [
      { id: "definitely", label: "Chắc chắn giới thiệu" },
      { id: "maybe", label: "Có thể giới thiệu" },
      { id: "not_sure", label: "Chưa chắc" },
      { id: "never", label: "Không giới thiệu" }
    ]
  }
];

function getQuestionText(questionId) {
  return QUESTIONS.find((question) => question.id === questionId)?.text ?? questionId;
}

function getOptionLabel(questionId, optionId) {
  const question = QUESTIONS.find((item) => item.id === questionId);
  return question?.options.find((option) => option.id === optionId)?.label ?? optionId;
}

window.SurveyQuestions = {
  SURVEY_VERSION,
  QUESTIONS,
  getQuestionText,
  getOptionLabel
};
})();
