import { buildLocalFeedbackSnapshot } from "@/lib/adapters/workspace/local-feedback-adapter";
import { buildTencentGradingSnapshot } from "@/lib/adapters/workspace/tencent-grading-adapter";
import { parseDayLabel } from "@/lib/camp-day";
import { db } from "@/lib/db";
import { formatClock } from "@/lib/domain";
import { buildHomeworkScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";
import type {
  WorkspaceAnnotation,
  WorkspaceData,
  WorkspaceQuestionItem,
} from "@/lib/types/workspace";

function parseAnnotations(
  annotations: Array<{
    id: string;
    label: string | null;
    annotationType: string;
    geometry: unknown;
    isHidden: boolean;
  }>,
): WorkspaceAnnotation[] {
  return annotations
    .filter((annotation) => !annotation.isHidden)
    .map((annotation) => {
      const geometry = (annotation.geometry ?? {}) as Record<string, number | string>;
      const fallbackColor =
        annotation.annotationType === "ERROR_CIRCLE"
          ? "rose"
          : annotation.annotationType === "HIGHLIGHT"
            ? "amber"
            : "emerald";

      return {
        id: annotation.id,
        label: annotation.label ?? "批改标记",
        color: (geometry.color as WorkspaceAnnotation["color"]) ?? fallbackColor,
        x: Number(geometry.x ?? 18),
        y: Number(geometry.y ?? 18),
        width: Number(geometry.width ?? 18),
        height: Number(geometry.height ?? 12),
      };
    });
}

export async function getWorkspaceData(recordId: string): Promise<WorkspaceData> {
  const viewer = await getViewerContext();
  const homeworkScope = buildHomeworkScopeWhere(viewer);

  const currentRecord = await db.homeworkRecord.findUnique({
    where: { id: recordId },
    include: {
      subject: true,
      student: true,
      enrollment: true,
      assets: {
        include: {
          annotations: true,
        },
        orderBy: { pageIndex: "asc" },
      },
    },
  });

  if (!currentRecord) {
    throw new Error(`Homework record not found: ${recordId}`);
  }

  if (
    !viewer.isAdmin &&
    viewer.classIds.length > 0 &&
    currentRecord.enrollment?.classId &&
    !viewer.classIds.includes(currentRecord.enrollment.classId)
  ) {
    throw new Error("You do not have access to this workspace record.");
  }

  if (!viewer.isAdmin && viewer.classIds.length === 0 && viewer.tutorProfileId && currentRecord.tutorId !== viewer.tutorProfileId) {
    throw new Error("You do not have access to this workspace record.");
  }

  const [siblingRecords] = await Promise.all([
    db.homeworkRecord.findMany({
      where: {
        studentId: currentRecord.studentId,
        subjectId: currentRecord.subjectId,
        ...(currentRecord.enrollmentId ? { enrollmentId: currentRecord.enrollmentId } : {}),
        ...(homeworkScope ?? {}),
      },
      include: {
        assets: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const totalDays = 24;
  const currentDayIndex = parseDayLabel(currentRecord.dayLabel) ?? 1;
  const gradingSnapshot = await buildTencentGradingSnapshot({
    record: currentRecord,
    assets: currentRecord.assets.map((asset) => ({
      id: asset.id,
      pageIndex: asset.pageIndex,
      fileUrl: asset.fileUrl,
      ocrPayload: asset.ocrPayload,
      metadata: asset.metadata,
      annotations: asset.annotations,
    })),
  });
  const feedbackSnapshot = buildLocalFeedbackSnapshot({
    record: {
      dayLabel: currentRecord.dayLabel,
      score: currentRecord.score,
      accuracyRate: currentRecord.accuracyRate,
      feedbackDraft: currentRecord.feedbackDraft,
      reviewNotes: currentRecord.reviewNotes,
      parentMessageDraft: currentRecord.parentMessageDraft,
      student: {
        displayName: currentRecord.student.displayName,
      },
    },
    reviewSummary: gradingSnapshot.summary,
  });
  const recordMap = new Map(siblingRecords.map((record) => [record.dayLabel, record]));
  const questions: WorkspaceQuestionItem[] = gradingSnapshot.images.flatMap((image) =>
    image.questions.map((question) => ({
      id: question.questionId,
      assetId: image.id,
      questionNumber: question.questionNumber,
      title: question.title,
      studentAnswer: question.studentAnswer,
      analysis: question.note,
      verdict: question.verdict,
      checkedByTutor: question.checkedByTutor,
    })),
  );

  return {
    recordId,
    campLabel: currentRecord.campLabel ?? currentRecord.enrollment?.campLabel ?? "当前营课",
    semesterLabel: currentRecord.student.gradeLevel,
    currentDayLabel: currentRecord.dayLabel,
    currentDayIndex,
    totalDays,
    student: {
      id: currentRecord.student.id,
      name: currentRecord.student.displayName,
      parentName: currentRecord.student.parentName ?? "家长",
      phoneTail: currentRecord.student.parentPhone.slice(-4),
      gradeLabel: currentRecord.student.gradeLevel,
      subjectLabel: currentRecord.subject.name,
      textbookVersion: currentRecord.student.textbookVersion ?? "--",
      goal: currentRecord.student.learningGoal ?? "--",
    },
    record: {
      recordId: currentRecord.id,
      reviewStatus: currentRecord.reviewStatus === "CHECKED" ? "已核对" : "未核对",
      feedbackStatus: currentRecord.feedbackStatus === "SENT" ? "已反馈" : "未反馈",
      submittedAtLabel: formatClock(currentRecord.submittedAt),
      reviewedAtLabel: formatClock(currentRecord.reviewedAt),
      deliveredAtLabel: formatClock(currentRecord.deliveredAt),
    },
    timeline: Array.from({ length: totalDays }, (_, index) => {
      const dayNumber = index + 1;
      const dayLabel = `Day ${dayNumber}`;
      const relatedRecord = recordMap.get(dayLabel);

      return {
        dayNumber,
        dayLabel,
        shortLabel: `${dayNumber}`,
        isActive: dayLabel === currentRecord.dayLabel,
        isCompleted: dayNumber < currentDayIndex,
        hasRecord: Boolean(relatedRecord),
        href: relatedRecord ? `/workspace/${relatedRecord.id}` : undefined,
      };
    }),
    stats: [
      {
        id: "total",
        label: "总题数",
        value: `${gradingSnapshot.summary.totalQuestions}`,
        accent: "default",
      },
      {
        id: "correct",
        label: "正确",
        value: `${gradingSnapshot.summary.correctQuestions}`,
        accent: "success",
      },
      {
        id: "wrong",
        label: "错误",
        value: `${gradingSnapshot.summary.wrongQuestions}`,
        accent: "danger",
      },
      {
        id: "accuracy",
        label: "正确率",
        value: `${gradingSnapshot.summary.accuracyRate}%`,
        accent: "info",
      },
    ],
    imagePane: {
      activeImageId: gradingSnapshot.images[0]?.id ?? "",
      images: gradingSnapshot.images.map((image) => ({
        id: image.id,
        title: image.title,
        imageUrl: image.imageUrl,
        totalQuestions: image.totalQuestions,
        correctQuestions: image.correctQuestions,
        wrongQuestions: image.wrongQuestions,
        annotations: parseAnnotations(
          currentRecord.assets.find((asset) => asset.id === image.id)?.annotations ?? [],
        ),
      })),
    },
    reviewPane: {
      adapter: {
        providerLabel: gradingSnapshot.providerLabel,
        providerStatus: gradingSnapshot.providerStatus,
      },
      summary: gradingSnapshot.summary,
      questions,
    },
    feedbackPane: {
      adapter: {
        providerLabel: feedbackSnapshot.providerLabel,
        providerStatus: feedbackSnapshot.providerStatus,
      },
      regenerationHint: feedbackSnapshot.regenerationHint,
      sections: feedbackSnapshot.sections,
    },
  };
}
