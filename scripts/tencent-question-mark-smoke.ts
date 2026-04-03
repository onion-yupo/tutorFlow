import { runQuestionMarkAgentForFile } from "@/lib/clients/tencent-question-mark-client";

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    throw new Error("请传入一张待测试图片路径，例如：tsx scripts/tencent-question-mark-smoke.ts \"public/uploads/homework/...png\"");
  }

  const result = await runQuestionMarkAgentForFile({
    fileUrl: imagePath,
  });

  console.log(
    JSON.stringify(
      {
        jobId: result.jobId,
        jobStatus: result.jobStatus,
        questionCount: result.questionCount,
        requestId: result.requestId,
        firstMarkTitle: result.markInfos[0]?.MarkItemTitle ?? null,
        firstAnswer: result.markInfos[0]?.AnswerInfos?.[0]?.HandwriteInfo ?? null,
        firstAnswerCorrect: result.markInfos[0]?.AnswerInfos?.[0]?.IsCorrect ?? null,
      },
      null,
      2,
    ),
  );
}

void main();
