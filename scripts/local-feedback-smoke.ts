import { generateLocalFeedback, isLocalFeedbackModelEnabled } from "@/lib/clients/local-feedback-client";

async function main() {
  if (!isLocalFeedbackModelEnabled()) {
    console.log("LOCAL_FEEDBACK_API_URL 未配置，跳过真实 smoke test。");
    return;
  }

  const result = await generateLocalFeedback({
    recordId: "smoke-record",
    studentName: "王小明",
    dayLabel: "Day 5",
    score: 88,
    accuracyRate: 85,
    reviewSummary: {
      totalQuestions: 17,
      correctQuestions: 15,
      wrongQuestions: 2,
    },
    questions: [
      {
        questionNumber: "3",
        title: "第 3 题 分数加法",
        studentAnswer: "1/2 + 1/4 = 2/6",
        analysis: "没有先统一分母。",
        verdict: "WRONG",
      },
      {
        questionNumber: "8",
        title: "第 8 题 应用题",
        studentAnswer: "12 分钟 = 12/60 小时",
        analysis: "单位换算后没有继续化简。",
        verdict: "WRONG",
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        requestId: result.requestId ?? null,
        model: result.model ?? null,
        overallEvaluation: result.sections.overallEvaluation.slice(0, 40),
        errorAnalysis: result.sections.errorAnalysis.slice(0, 40),
        parentMessage: result.sections.parentMessage.slice(0, 40),
      },
      null,
      2,
    ),
  );
}

void main();
