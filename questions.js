(function () {
const SURVEY_VERSION = "2.0.0";

const QUESTIONS = [
  {
    id: "q1",
    text: "Bạn có đang sử dụng chế độ giặt nhanh tại nhà không?",
    options: [
      { id: "A", label: "Đang sử dụng chế độ giặt nhanh" },
      { id: "B", label: "Đã từng sử dụng nhưng không phù hợp" },
      { id: "C", label: "Chưa từng sử dụng" }
    ]
  },
  {
    id: "q2",
    text: "Bạn đánh giá thế nào về độ sạch của quần áo sau khi sử dụng chế độ giặt nhanh 15 phút cùng sản phẩm OMO Siêu Tốc?",
    options: [
      { id: "A", label: "Không sạch" },
      { id: "B", label: "Bình thường" },
      { id: "C", label: "Rất sạch" }
    ]
  },
  {
    id: "q3",
    text: "Bạn đánh giá thế nào về mùi hương của sản phẩm OMO Siêu Tốc lưu lại trên quần áo không?",
    options: [
      { id: "A", label: "Không thơm" },
      { id: "B", label: "Bình thường" },
      { id: "C", label: "Rất thơm" }
    ]
  },
  {
    id: "q4",
    text: "Bạn ấn tượng gì nhất về Omo Siêu tốc?",
    options: [
      { id: "A", label: "Tiết kiệm điện, nước và thời gian khi giặt nhanh" }
    ],
    other: {
      id: "other",
      label: "Khác",
      placeholder: "Khác:..."
    }
  },
  {
    id: "q5",
    text: "Bạn sẽ mua OMO Siêu Tốc cho lần giặt tới của bạn không?",
    options: [
      { id: "A", label: "Chắc chắn sẽ mua" },
      { id: "B", label: "Sẽ cân nhắc" },
      { id: "C", label: "Chưa có nhu cầu" }
    ]
  },
  {
    id: "q6",
    text: "Bạn ấn tượng điều gì nhất trong trải nghiệm Đô Thị x OMO Siêu tốc? (Về sản phẩm, về trải nghiệm)",
    options: [
      { id: "A", label: "Hiệu năng giặt nhanh trong 15 phút" },
      { id: "B", label: "Xem demo giặt nhanh thực tế" },
      { id: "C", label: "Trải nghiệm Trạm giặt siêu tốc rất mới mẻ" }
    ],
    other: {
      id: "other",
      label: "Khác",
      placeholder: "Khác:..."
    }
  }
];

function getQuestionText(questionId) {
  return QUESTIONS.find((question) => question.id === questionId)?.text ?? questionId;
}

function getOptionLabel(questionId, optionId) {
  const question = QUESTIONS.find((item) => item.id === questionId);

  if (typeof optionId === "object" && optionId?.type === "other") {
    return `${question?.other?.label ?? "Khác"}: ${optionId.text}`;
  }

  return question?.options.find((option) => option.id === optionId)?.label ?? optionId;
}

window.SurveyQuestions = {
  SURVEY_VERSION,
  QUESTIONS,
  getQuestionText,
  getOptionLabel
};
})();
