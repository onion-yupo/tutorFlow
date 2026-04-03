import type { MarkInfo } from "tencentcloud-sdk-nodejs/tencentcloud/services/ocr/v20181119/ocr_models";

import { runQuestionMarkAgentForFile, isTencentQuestionMarkEnabled } from "@/lib/clients/tencent-question-mark-client";
import {
  extractQuestionNumber,
  mergeQuestionReviewState,
  summarizeQuestionReviews,
} from "@/lib/workspace-review";

interface TencentGradingInput {
  record: {
    correctCount: number | null;
    incorrectCount: number | null;
    accuracyRate: unknown;
    score: number | null;
    aiSummary: unknown;
  };
  assets: Array<{
    id: string;
    pageIndex: number;
    fileUrl: string;
    ocrPayload: unknown;
    metadata: unknown;
    annotations: Array<{
      questionNumber: string | null;
      annotationType: string;
      isHidden: boolean;
    }>;
  }>;
}

export function buildQuestionPayloadFromMarkInfos(markInfos: MarkInfo[] | undefined) {
  const questions: Array<{
    id: string;
    title: string;
    questionNumber: string;
    answer: string;
    note: string;
  }> = [];
  let questionIndex = 0;

  const visit = (items: MarkInfo[] | undefined) => {
    for (const item of items ?? []) {
      if (item.MarkInfos?.length) {
        visit(item.MarkInfos);
      }

      if (!item.AnswerInfos?.length) {
        continue;
      }

      const currentIndex = questionIndex;
      questionIndex += 1;
      const title = item.MarkItemTitle?.trim() || `第 ${questionIndex} 题`;
      const questionNumber = extractQuestionNumber(title, currentIndex);
      const handwriteAnswers = item.AnswerInfos.map((answer) => answer.HandwriteInfo?.trim()).filter(Boolean);
      const analyses = item.AnswerInfos.map((answer) => answer.AnswerAnalysis?.trim()).filter(Boolean);
      const rightAnswers = Array.from(
        new Set(item.AnswerInfos.map((answer) => answer.RightAnswer?.trim()).filter(Boolean)),
      );
      const knowledgePoints = Array.from(
        new Set(item.AnswerInfos.flatMap((answer) => answer.KnowledgePoints?.filter(Boolean) ?? [])),
      );

      const noteParts = [
        analyses.join("；"),
        rightAnswers.length > 0 ? `正确答案：${rightAnswers.join("；")}` : "",
        knowledgePoints.length > 0 ? `知识点：${knowledgePoints.join("、")}` : "",
      ].filter(Boolean);

      questions.push({
        id: `question-${questionIndex}`,
        title,
        questionNumber,
        answer: handwriteAnswers.join("；") || "未识别",
        note: noteParts.join("；") || "腾讯模型未返回详细分析。",
      });
    }
  };

  visit(markInfos);

  return {
    questions,
  };
}

function buildFallbackTencentGradingSnapshot(input: TencentGradingInput) {
  const { record, assets } = input;

  const imagePanels = assets.map((asset, index) => {
    const roseQuestionNumbers = asset.annotations
      .filter((annotation) => !annotation.isHidden && annotation.annotationType === "ERROR_CIRCLE" && annotation.questionNumber)
      .map((annotation) => annotation.questionNumber as string);
    const questions = mergeQuestionReviewState({
      ocrPayload: asset.ocrPayload,
      metadata: asset.metadata,
      roseQuestionNumbers,
    });
    const summary = summarizeQuestionReviews(questions);

    return {
      id: asset.id,
      title: `作业原图 ${index + 1}`,
      imageUrl: asset.fileUrl,
      totalQuestions: summary.total,
      correctQuestions: summary.correct,
      wrongQuestions: summary.wrong,
      questions,
    };
  });

  const allQuestions = imagePanels.flatMap((item) => item.questions);
  const fallbackCorrect = record.correctCount ?? 0;
  const fallbackWrong = record.incorrectCount ?? 0;
  const fallbackTotal = fallbackCorrect + fallbackWrong;
  const questionSummary = summarizeQuestionReviews(allQuestions);
  const confidence = Number(((record.aiSummary ?? {}) as Record<string, number>).confidence ?? 0);

  return {
    providerLabel: "腾讯作业批改专用模型",
    providerStatus: "已接入适配层",
    summary: {
      totalQuestions: questionSummary.total > 0 ? questionSummary.total : fallbackTotal,
      correctQuestions: questionSummary.total > 0 ? questionSummary.correct : fallbackCorrect,
      wrongQuestions: questionSummary.total > 0 ? questionSummary.wrong : fallbackWrong,
      accuracyRate:
        questionSummary.total > 0
          ? questionSummary.accuracyRate
          : Math.round(Number(record.accuracyRate ?? 0)),
      score: record.score ?? 0,
      confidence,
    },
    images: imagePanels,
  };
}

export async function regenerateTencentGradingSnapshot(input: TencentGradingInput) {
  const fallback = buildFallbackTencentGradingSnapshot(input);

  if (!isTencentQuestionMarkEnabled()) {
    return {
      providerLabel: "腾讯作业批改专用模型",
      providerStatus: "未配置真实接口，已回退演示数据",
      summary: fallback.summary,
      images: fallback.images.map((image, index) => ({
        ...image,
        ocrPayload: input.assets[index]?.ocrPayload ?? null,
        usedLive: false,
      })),
      usedFallback: true,
      errorMessage: "当前未启用腾讯作业批改正式接口。",
    };
  }

  const errors: string[] = [];
  let liveSuccessCount = 0;
  const images = await Promise.all(
    input.assets.map(async (asset, index) => {
      try {
        const liveResult = await runQuestionMarkAgentForFile({
          fileUrl: asset.fileUrl,
        });
        const livePayload = buildQuestionPayloadFromMarkInfos(liveResult.markInfos);
        const questions = mergeQuestionReviewState({
          ocrPayload: livePayload,
          metadata: asset.metadata,
          roseQuestionNumbers: [],
        });
        const summary = summarizeQuestionReviews(questions);

        if (summary.total === 0) {
          errors.push(`第 ${index + 1} 页未识别到可用题目。`);
          return {
            ...fallback.images[index],
            ocrPayload: asset.ocrPayload,
            usedLive: false,
          };
        }

        liveSuccessCount += 1;

        return {
          id: asset.id,
          title: `作业原图 ${index + 1}`,
          imageUrl: asset.fileUrl,
          totalQuestions: summary.total,
          correctQuestions: summary.correct,
          wrongQuestions: summary.wrong,
          questions,
          ocrPayload: livePayload,
          usedLive: true,
        };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `第 ${index + 1} 页批改失败。`);

        return {
          ...fallback.images[index],
          ocrPayload: asset.ocrPayload,
          usedLive: false,
        };
      }
    }),
  );

  const allQuestions = images.flatMap((item) => item.questions);
  const mergedSummary = summarizeQuestionReviews(allQuestions);
  const providerStatus =
    liveSuccessCount === input.assets.length
      ? "已连接腾讯云实时接口"
      : liveSuccessCount > 0
        ? "部分使用腾讯云，部分回退本地数据"
        : "腾讯云不可用，已回退演示数据";

  return {
    providerLabel: "腾讯作业批改专用模型",
    providerStatus,
    summary: {
      totalQuestions: mergedSummary.total || fallback.summary.totalQuestions,
      correctQuestions: mergedSummary.total ? mergedSummary.correct : fallback.summary.correctQuestions,
      wrongQuestions: mergedSummary.total ? mergedSummary.wrong : fallback.summary.wrongQuestions,
      accuracyRate: mergedSummary.total ? mergedSummary.accuracyRate : fallback.summary.accuracyRate,
      score: mergedSummary.total
        ? Math.round((mergedSummary.correct / mergedSummary.total) * 100)
        : fallback.summary.score,
      confidence: liveSuccessCount > 0 ? 96 : fallback.summary.confidence,
    },
    images,
    usedFallback: liveSuccessCount !== input.assets.length,
    errorMessage: errors[0] ?? null,
  };
}

export async function buildTencentGradingSnapshot(input: TencentGradingInput) {
  const result = await regenerateTencentGradingSnapshot(input);

  return {
    providerLabel: result.providerLabel,
    providerStatus: result.providerStatus,
    summary: result.summary,
    images: result.images.map((image) => ({
      id: image.id,
      title: image.title,
      imageUrl: image.imageUrl,
      totalQuestions: image.totalQuestions,
      correctQuestions: image.correctQuestions,
      wrongQuestions: image.wrongQuestions,
      questions: image.questions,
    })),
  };
}
