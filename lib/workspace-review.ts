type ReviewVerdict = "CORRECT" | "WRONG";

export interface StoredQuestionReview {
  questionId: string;
  questionNumber: string;
  verdict: ReviewVerdict;
  checkedByTutor: boolean;
  updatedAt: string;
}

type AssetMetadataShape = {
  questionReviews?: StoredQuestionReview[];
};

export interface ParsedQuestionReview {
  questionId: string;
  questionNumber: string;
  title: string;
  studentAnswer: string;
  note: string;
  verdict: ReviewVerdict;
  checkedByTutor: boolean;
}

export function getAssetMetadata(metadata: unknown): AssetMetadataShape {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata as AssetMetadataShape;
}

export function extractQuestionNumber(title: string, index: number) {
  const matched = title.match(/第\s*(\d+)\s*题/);
  return matched?.[1] ?? `${index + 1}`;
}

export function getStoredQuestionReviews(metadata: unknown) {
  return getAssetMetadata(metadata).questionReviews ?? [];
}

export function mergeQuestionReviewState(params: {
  ocrPayload: unknown;
  metadata: unknown;
  roseQuestionNumbers?: string[];
}) {
  const { ocrPayload, metadata, roseQuestionNumbers = [] } = params;
  if (!ocrPayload || typeof ocrPayload !== "object" || !("questions" in ocrPayload)) {
    return [] as ParsedQuestionReview[];
  }

  const questions = (ocrPayload as { questions?: unknown[] }).questions;
  if (!Array.isArray(questions)) {
    return [] as ParsedQuestionReview[];
  }

  const storedMap = new Map(getStoredQuestionReviews(metadata).map((item) => [item.questionId, item]));

  return questions.map((question, index) => {
    const current = (question ?? {}) as Record<string, string>;
    const title = current.title ?? `第 ${index + 1} 题`;
    const questionId = current.id ?? `question-${index + 1}`;
    const questionNumber = current.questionNumber ?? extractQuestionNumber(title, index);
    const stored = storedMap.get(questionId);
    const inferredWrong = roseQuestionNumbers.includes(questionNumber);

    return {
      questionId,
      questionNumber,
      title,
      studentAnswer: current.answer ?? "未识别",
      note: current.note ?? "待老师补充说明。",
      verdict: stored?.verdict ?? (inferredWrong ? "WRONG" : "CORRECT"),
      checkedByTutor: stored?.checkedByTutor ?? false,
    };
  });
}

export function upsertQuestionReviewInMetadata(params: {
  metadata: unknown;
  review: StoredQuestionReview;
}) {
  const { metadata, review } = params;
  const current = getAssetMetadata(metadata);
  const nextReviews = getStoredQuestionReviews(metadata).filter((item) => item.questionId !== review.questionId);
  nextReviews.push(review);

  return {
    ...current,
    questionReviews: nextReviews,
  };
}

export function summarizeQuestionReviews(questions: ParsedQuestionReview[]) {
  const total = questions.length;
  const correct = questions.filter((item) => item.verdict === "CORRECT").length;
  const wrong = questions.filter((item) => item.verdict === "WRONG").length;

  return {
    total,
    correct,
    wrong,
    accuracyRate: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

export function toHomeworkStatus(params: {
  submittedAt?: Date | null;
  reviewStatus: "UNCHECKED" | "CHECKED";
  feedbackStatus: "PENDING" | "SENT";
}) {
  const { submittedAt, reviewStatus, feedbackStatus } = params;

  if (!submittedAt) {
    return "NOT_SUBMITTED" as const;
  }

  if (feedbackStatus === "SENT") {
    return "DELIVERED" as const;
  }

  if (reviewStatus === "CHECKED") {
    return "READY_TO_DELIVER" as const;
  }

  return "PENDING_REVIEW" as const;
}
