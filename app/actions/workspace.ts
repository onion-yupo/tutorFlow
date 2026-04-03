"use server";

import {
  regenerateLocalFeedbackSnapshot,
} from "@/lib/adapters/workspace/local-feedback-adapter";
import { regenerateTencentGradingSnapshot } from "@/lib/adapters/workspace/tencent-grading-adapter";
import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";
import {
  mergeQuestionReviewState,
  summarizeQuestionReviews,
  toHomeworkStatus,
  upsertQuestionReviewInMetadata,
} from "@/lib/workspace-review";

function getDefaultAnnotationPayload(annotationType: string) {
  switch (annotationType) {
    case "ERROR_CIRCLE":
      return {
        label: "老师补充圈错",
        geometry: { x: 28, y: 30, width: 22, height: 14, color: "rose" },
      };
    case "HIGHLIGHT":
      return {
        label: "老师高亮重点",
        geometry: { x: 46, y: 52, width: 20, height: 12, color: "amber" },
      };
    default:
      return {
        label: "老师确认正确",
        geometry: { x: 18, y: 18, width: 16, height: 12, color: "emerald" },
      };
  }
}

function syncHomeworkLifecycle(params: {
  submittedAt?: Date | null;
  reviewStatus: "UNCHECKED" | "CHECKED";
  feedbackStatus: "PENDING" | "SENT";
}) {
  return {
    status: toHomeworkStatus(params),
    reviewedAt: params.reviewStatus === "CHECKED" ? new Date() : null,
    deliveredAt: params.feedbackStatus === "SENT" ? new Date() : null,
  };
}

const FEEDBACK_SECTION_FIELD_MAP = {
  overallEvaluation: "feedbackDraft",
  errorAnalysis: "reviewNotes",
  parentMessage: "parentMessageDraft",
} as const;

function getFeedbackGenerationTaskStatus(providerStatus: string) {
  return providerStatus.includes("调用失败") ? "FAILED" : "COMPLETED";
}

function getGradingTaskStatus(usedFallback: boolean) {
  return usedFallback ? "FAILED" : "COMPLETED";
}

async function createFeedbackGenerationTask(params: {
  homeworkRecordId: string;
  studentId?: string | null;
  tutorId?: string | null;
  studentName?: string | null;
  dayLabel?: string | null;
  note: string;
  providerStatus: string;
}) {
  const status = getFeedbackGenerationTaskStatus(params.providerStatus);

  await db.deliveryTask.create({
    data: {
      type: "FEEDBACK_DRAFT_SAVED",
      status,
      title: `${params.studentName ?? "学员"}${params.dayLabel ?? ""}${status === "FAILED" ? "反馈生成失败" : "反馈内容已更新"}`,
      note: params.note,
      studentId: params.studentId ?? undefined,
      tutorId: params.tutorId ?? undefined,
      homeworkRecordId: params.homeworkRecordId,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });
}

async function createGradingRunTask(params: {
  homeworkRecordId: string;
  studentId?: string | null;
  tutorId?: string | null;
  studentName?: string | null;
  dayLabel?: string | null;
  note: string;
  usedFallback: boolean;
}) {
  const status = getGradingTaskStatus(params.usedFallback);

  await db.deliveryTask.create({
    data: {
      type: "HOMEWORK_GRADING_RUN",
      status,
      title: `${params.studentName ?? "学员"}${params.dayLabel ?? ""}${status === "FAILED" ? "批改失败待重试" : "批改结果已刷新"}`,
      note: params.note,
      studentId: params.studentId ?? undefined,
      tutorId: params.tutorId ?? undefined,
      homeworkRecordId: params.homeworkRecordId,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });
}

async function getFeedbackGenerationContext(homeworkRecordId: string) {
  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    include: {
      student: true,
      assets: {
        include: {
          annotations: true,
        },
        orderBy: { pageIndex: "asc" },
      },
    },
  });

  if (!homework) {
    return null;
  }

  const questions = homework.assets.flatMap((asset) =>
    mergeQuestionReviewState({
      ocrPayload: asset.ocrPayload,
      metadata: asset.metadata,
      roseQuestionNumbers: asset.annotations
        .filter(
          (annotation) =>
            !annotation.isHidden && annotation.annotationType === "ERROR_CIRCLE" && annotation.questionNumber,
        )
        .map((annotation) => annotation.questionNumber as string),
    }).map((question) => ({
      questionNumber: question.questionNumber,
      title: question.title,
      studentAnswer: question.studentAnswer,
      analysis: question.note,
      verdict: question.verdict,
    })),
  );

  const summary =
    homework.correctCount !== null && homework.incorrectCount !== null
      ? {
          totalQuestions: (homework.correctCount ?? 0) + (homework.incorrectCount ?? 0),
          correctQuestions: homework.correctCount ?? 0,
          wrongQuestions: homework.incorrectCount ?? 0,
        }
      : (() => {
          const merged = summarizeQuestionReviews(
            questions.map((question, index) => ({
              questionId: `q-${index + 1}`,
              questionNumber: question.questionNumber,
              title: question.title,
              studentAnswer: question.studentAnswer,
              note: question.analysis,
              verdict: question.verdict,
              checkedByTutor: true,
            })),
          );

          return {
            totalQuestions: merged.total,
            correctQuestions: merged.correct,
            wrongQuestions: merged.wrong,
          };
        })();

  return {
    homework,
    input: {
      record: {
        id: homework.id,
        dayLabel: homework.dayLabel,
        score: homework.score,
        accuracyRate: homework.accuracyRate,
        feedbackDraft: homework.feedbackDraft,
        reviewNotes: homework.reviewNotes,
        parentMessageDraft: homework.parentMessageDraft,
        student: {
          displayName: homework.student.displayName,
        },
      },
      reviewSummary: summary,
      questions,
    },
  };
}

export async function addWorkspaceAnnotation(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");
  const annotationType = String(formData.get("annotationType") ?? "CORRECT_MARK");

  if (!homeworkRecordId || !assetId) {
    return;
  }

  const asset = await db.homeworkAsset.findUnique({
    where: { id: assetId },
    select: { pageIndex: true },
  });

  const payload = getDefaultAnnotationPayload(annotationType);

  await db.homeworkAnnotation.create({
    data: {
      homeworkRecordId,
      assetId,
      annotationType: annotationType as never,
      pageIndex: asset?.pageIndex ?? 0,
      label: payload.label,
      geometry: payload.geometry,
      confidence: "0.99",
      correctedByTutor: true,
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
}

export async function hideWorkspaceAnnotations(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");

  if (!homeworkRecordId || !assetId) {
    return;
  }

  await db.homeworkAnnotation.updateMany({
    where: {
      homeworkRecordId,
      assetId,
      isHidden: false,
    },
    data: {
      isHidden: true,
      correctedByTutor: true,
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
}

export async function regenerateWorkspaceFeedback(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const instruction = String(formData.get("instruction") ?? "").trim();

  if (!homeworkRecordId) {
    return;
  }

  const context = await getFeedbackGenerationContext(homeworkRecordId);

  if (!context) {
    return;
  }
  const generated = await regenerateLocalFeedbackSnapshot({
    input: context.input,
    instruction,
  });

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      feedbackDraft: generated.sections.find((section) => section.id === "overallEvaluation")?.content ?? null,
      reviewNotes: generated.sections.find((section) => section.id === "errorAnalysis")?.content ?? null,
      parentMessageDraft: generated.sections.find((section) => section.id === "parentMessage")?.content ?? null,
      feedbackStatus: "PENDING",
      ...syncHomeworkLifecycle({
        submittedAt: context.homework.submittedAt,
        reviewStatus: context.homework.reviewStatus,
        feedbackStatus: "PENDING",
      }),
    },
  });

  await createFeedbackGenerationTask({
    homeworkRecordId,
    studentId: context.homework.studentId,
    tutorId: context.homework.tutorId,
    studentName: context.homework.student.displayName,
    dayLabel: context.homework.dayLabel,
    note: generated.regenerationHint,
    providerStatus: generated.providerStatus,
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");
  return generated.usedFallback ? generated.regenerationHint : "已通过本地反馈模型重新生成三栏内容";
}

export async function saveWorkspaceDraft(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const feedbackDraft = String(formData.get("feedbackDraft") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const parentMessageDraft = String(formData.get("parentMessageDraft") ?? "");
  const selectedPracticeIds = String(formData.get("selectedPracticeIds") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    select: {
      studentId: true,
      tutorId: true,
      dayLabel: true,
      submittedAt: true,
      reviewStatus: true,
      student: {
        select: {
          displayName: true,
        },
      },
    },
  });

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      feedbackDraft,
      reviewNotes,
      parentMessageDraft,
      feedbackStatus: "PENDING",
      ...syncHomeworkLifecycle({
        submittedAt: homework?.submittedAt,
        reviewStatus: homework?.reviewStatus ?? "UNCHECKED",
        feedbackStatus: "PENDING",
      }),
    },
  });

  await db.deliveryTask.create({
    data: {
      type: "FEEDBACK_DRAFT_SAVED",
      status: "COMPLETED",
      title: `${homework?.student.displayName ?? "学员"}${homework?.dayLabel ?? ""}草稿已保存`,
      note: selectedPracticeIds ? `已勾选加练任务：${selectedPracticeIds}` : "已保存当前反馈草稿。",
      studentId: homework?.studentId,
      tutorId: homework?.tutorId ?? undefined,
      homeworkRecordId,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");
}

export async function sendWorkspaceFeedback(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const feedbackDraft = String(formData.get("feedbackDraft") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "");
  const parentMessageDraft = String(formData.get("parentMessageDraft") ?? "");
  const selectedPracticeIds = String(formData.get("selectedPracticeIds") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    select: {
      studentId: true,
      tutorId: true,
      dayLabel: true,
      submittedAt: true,
      reviewStatus: true,
      student: {
        select: {
          displayName: true,
        },
      },
    },
  });

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      feedbackDraft,
      reviewNotes,
      parentMessageDraft,
      feedbackStatus: "SENT",
      ...syncHomeworkLifecycle({
        submittedAt: homework?.submittedAt,
        reviewStatus: homework?.reviewStatus ?? "UNCHECKED",
        feedbackStatus: "SENT",
      }),
    },
  });

  await db.deliveryTask.create({
    data: {
      type: "FEEDBACK_SENT",
      status: "COMPLETED",
      title: `${homework?.student.displayName ?? "学员"}${homework?.dayLabel ?? ""}反馈已发送`,
      note: selectedPracticeIds ? `已发送反馈，并附加练任务：${selectedPracticeIds}` : "已完成站内发送流转。",
      studentId: homework?.studentId,
      tutorId: homework?.tutorId ?? undefined,
      homeworkRecordId,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");
  return "反馈已发送并完成站内流转";
}

export async function toggleWorkspaceReviewStatus(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    select: {
      submittedAt: true,
      reviewStatus: true,
      feedbackStatus: true,
    },
  });

  if (!homework) {
    return;
  }

  const nextReviewStatus = homework.reviewStatus === "CHECKED" ? "UNCHECKED" : "CHECKED";

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      reviewStatus: nextReviewStatus,
      ...syncHomeworkLifecycle({
        submittedAt: homework.submittedAt,
        reviewStatus: nextReviewStatus,
        feedbackStatus: homework.feedbackStatus,
      }),
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
}

export async function toggleWorkspaceFeedbackStatus(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    select: {
      studentId: true,
      tutorId: true,
      dayLabel: true,
      submittedAt: true,
      reviewStatus: true,
      feedbackStatus: true,
      student: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!homework) {
    return;
  }

  const nextFeedbackStatus = homework.feedbackStatus === "SENT" ? "PENDING" : "SENT";

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      feedbackStatus: nextFeedbackStatus,
      ...syncHomeworkLifecycle({
        submittedAt: homework.submittedAt,
        reviewStatus: homework.reviewStatus,
        feedbackStatus: nextFeedbackStatus,
      }),
    },
  });

  await db.deliveryTask.create({
    data: {
      type: "FEEDBACK_SENT",
      status: "COMPLETED",
      title: `${homework.student.displayName}${homework.dayLabel}${nextFeedbackStatus === "SENT" ? "已标记反馈完成" : "已撤回反馈完成状态"}`,
      note: nextFeedbackStatus === "SENT" ? "老师在工作台将反馈状态切换为已反馈。" : "老师在工作台将反馈状态切换回未反馈。",
      studentId: homework.studentId,
      tutorId: homework.tutorId ?? undefined,
      homeworkRecordId,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");
}

export async function updateWorkspaceQuestionVerdict(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const questionNumber = String(formData.get("questionNumber") ?? "");
  const verdict = String(formData.get("verdict") ?? "CORRECT") as "CORRECT" | "WRONG";

  if (!homeworkRecordId || !assetId || !questionId || !questionNumber) {
    return;
  }

  const [asset, homeworkAssets] = await Promise.all([
    db.homeworkAsset.findUnique({
      where: { id: assetId },
      include: {
        annotations: true,
      },
    }),
    db.homeworkAsset.findMany({
      where: { homeworkRecordId },
      include: {
        annotations: true,
      },
      orderBy: { pageIndex: "asc" },
    }),
  ]);

  if (!asset) {
    return;
  }

  const nextMetadata = upsertQuestionReviewInMetadata({
    metadata: asset.metadata,
    review: {
      questionId,
      questionNumber,
      verdict,
      checkedByTutor: true,
      updatedAt: new Date().toISOString(),
    },
  });

  await db.homeworkAsset.update({
    where: { id: assetId },
    data: {
      metadata: nextMetadata as unknown as Prisma.InputJsonValue,
    },
  });

  const refreshedAssets = homeworkAssets.map((item) =>
    item.id === assetId
      ? {
          ...item,
          metadata: nextMetadata,
        }
      : item,
  );

  const allQuestions = refreshedAssets.flatMap((currentAsset) =>
    mergeQuestionReviewState({
      ocrPayload: currentAsset.ocrPayload,
      metadata: currentAsset.metadata,
      roseQuestionNumbers: currentAsset.annotations
        .filter(
          (annotation) =>
            !annotation.isHidden && annotation.annotationType === "ERROR_CIRCLE" && annotation.questionNumber,
        )
        .map((annotation) => annotation.questionNumber as string),
    }),
  );
  const summary = summarizeQuestionReviews(allQuestions);
  const score = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      correctCount: summary.correct,
      incorrectCount: summary.wrong,
      accuracyRate: summary.accuracyRate.toString(),
      score,
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
}

export async function retryWorkspaceGrading(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    include: {
      student: true,
      assets: {
        include: {
          annotations: true,
        },
        orderBy: { pageIndex: "asc" },
      },
    },
  });

  if (!homework || !homework.submittedAt) {
    return;
  }

  const grading = await regenerateTencentGradingSnapshot({
    record: homework,
    assets: homework.assets.map((asset) => ({
      id: asset.id,
      pageIndex: asset.pageIndex,
      fileUrl: asset.fileUrl,
      ocrPayload: asset.ocrPayload,
      metadata: asset.metadata,
      annotations: asset.annotations,
    })),
  });

  await db.$transaction([
    ...grading.images.map((image) =>
      db.homeworkAsset.update({
        where: { id: image.id },
        data: {
          ocrPayload: image.ocrPayload as unknown as Prisma.InputJsonValue,
        },
      }),
    ),
    db.homeworkRecord.update({
      where: { id: homeworkRecordId },
      data: {
        aiSummary: {
          providerLabel: grading.providerLabel,
          providerStatus: grading.providerStatus,
          confidence: grading.summary.confidence,
        } as Prisma.InputJsonValue,
        correctCount: grading.summary.correctQuestions,
        incorrectCount: grading.summary.wrongQuestions,
        accuracyRate: grading.summary.accuracyRate.toString(),
        score: grading.summary.score,
        ...syncHomeworkLifecycle({
          submittedAt: homework.submittedAt,
          reviewStatus: homework.reviewStatus,
          feedbackStatus: homework.feedbackStatus,
        }),
      },
    }),
  ]);

  await createGradingRunTask({
    homeworkRecordId,
    studentId: homework.studentId,
    tutorId: homework.tutorId,
    studentName: homework.student.displayName,
    dayLabel: homework.dayLabel,
    note: grading.errorMessage ?? grading.providerStatus,
    usedFallback: grading.usedFallback,
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");

  return grading.usedFallback ? grading.errorMessage ?? grading.providerStatus : "已重新调用腾讯批改模型并刷新题目结果";
}

export async function saveWorkspaceFeedbackSection(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const content = String(formData.get("content") ?? "");

  if (!homeworkRecordId || !sectionId) {
    return;
  }

  const field = FEEDBACK_SECTION_FIELD_MAP[sectionId as keyof typeof FEEDBACK_SECTION_FIELD_MAP];
  if (!field) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
    select: {
      submittedAt: true,
      reviewStatus: true,
    },
  });

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      [field]: content,
      feedbackStatus: "PENDING",
      ...syncHomeworkLifecycle({
        submittedAt: homework?.submittedAt,
        reviewStatus: homework?.reviewStatus ?? "UNCHECKED",
        feedbackStatus: "PENDING",
      }),
    },
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  return "反馈栏位已保存";
}

export async function regenerateWorkspaceFeedbackSection(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const instruction = String(formData.get("instruction") ?? "").trim();

  if (!homeworkRecordId || !sectionId) {
    return;
  }

  const context = await getFeedbackGenerationContext(homeworkRecordId);

  if (!context) {
    return;
  }

  const generated = await regenerateLocalFeedbackSnapshot({
    input: context.input,
    instruction,
  });

  const section = generated.sections.find((item) => item.id === sectionId);
  if (!section) {
    return;
  }

  const field = FEEDBACK_SECTION_FIELD_MAP[sectionId as keyof typeof FEEDBACK_SECTION_FIELD_MAP];
  if (!field) {
    return;
  }

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      [field]: section.content,
      feedbackStatus: "PENDING",
      ...syncHomeworkLifecycle({
        submittedAt: context.homework.submittedAt,
        reviewStatus: context.homework.reviewStatus,
        feedbackStatus: "PENDING",
      }),
    },
  });

  await createFeedbackGenerationTask({
    homeworkRecordId,
    studentId: context.homework.studentId,
    tutorId: context.homework.tutorId,
    studentName: context.homework.student.displayName,
    dayLabel: context.homework.dayLabel,
    note: `${section.title}：${generated.regenerationHint}`,
    providerStatus: generated.providerStatus,
  });

  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
  safeRevalidatePath("/dashboard");
  safeRevalidatePath("/homework");
  return generated.usedFallback ? generated.regenerationHint : `${section.title}已通过本地反馈模型重新生成`;
}
