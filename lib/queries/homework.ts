import { db } from "@/lib/db";
import { formatClock, mapHomeworkStatusLabel } from "@/lib/domain";
import { getViewerPortalProgress } from "@/lib/portal-progress";
import { buildHomeworkScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

function getHomeworkQueueState(params: {
  submittedAt: Date | null;
  reviewStatus: "UNCHECKED" | "CHECKED";
  feedbackStatus: "PENDING" | "SENT";
  latestFailedTask?: {
    note: string | null;
  } | null;
}) {
  if (!params.submittedAt) {
    return {
      label: "待提交",
      tone: "muted" as const,
      actionLabel: "提醒",
    };
  }

  if (params.latestFailedTask) {
    return {
      label: "失败待重试",
      tone: "danger" as const,
      actionLabel: "重试",
    };
  }

  if (params.reviewStatus === "UNCHECKED") {
    return {
      label: "待批改",
      tone: "warning" as const,
      actionLabel: "去批改",
    };
  }

  if (params.feedbackStatus === "PENDING") {
    return {
      label: "待反馈",
      tone: "primary" as const,
      actionLabel: "去反馈",
    };
  }

  return {
    label: "已完成",
    tone: "success" as const,
    actionLabel: "查看",
  };
}

function getLatestGradingTask(
  deliveryTasks: Array<{
    type: string;
    status: string;
    note: string | null;
  }>,
) {
  const task = deliveryTasks.find((item) => item.type === "HOMEWORK_GRADING_RUN");
  return task?.status === "FAILED" ? task : null;
}

function getLatestFeedbackGenerationTask(
  deliveryTasks: Array<{
    type: string;
    status: string;
    note: string | null;
  }>,
) {
  const task = deliveryTasks.find((item) => item.type === "FEEDBACK_DRAFT_SAVED");
  return task?.status === "FAILED" ? task : null;
}

function getLatestQueueFailureTask(params: {
  reviewStatus: "UNCHECKED" | "CHECKED";
  feedbackStatus: "PENDING" | "SENT";
  deliveryTasks: Array<{
    type: string;
    status: string;
    note: string | null;
  }>;
}) {
  if (params.reviewStatus === "UNCHECKED") {
    return getLatestGradingTask(params.deliveryTasks);
  }

  if (params.feedbackStatus === "PENDING") {
    return getLatestFeedbackGenerationTask(params.deliveryTasks);
  }

  return null;
}

export async function getHomeworkPageData(selectedRecordId?: string) {
  const viewer = await getViewerContext();
  const scope = buildHomeworkScopeWhere(viewer);
  const portalProgress = await getViewerPortalProgress(viewer);

  const records = await db.homeworkRecord.findMany({
    where: {
      dayLabel: portalProgress.currentDayLabel,
      ...(scope ?? {}),
    },
    include: {
      student: true,
      enrollment: {
        include: {
          campClass: {
            include: {
              portals: true,
            },
          },
        },
      },
      assets: {
        orderBy: { pageIndex: "asc" },
      },
      deliveryTasks: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  const selectedRecord = records.find((record) => record.id === selectedRecordId) ?? records[0] ?? null;
  const submittedCount = records.filter((record) => record.submittedAt).length;
  const pendingReviewCount = records.filter(
    (record) =>
      Boolean(record.submittedAt) &&
      record.reviewStatus === "UNCHECKED" &&
      !getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      }),
  ).length;
  const failedRetryCount = records.filter((record) =>
    Boolean(record.submittedAt) &&
    Boolean(
      getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      }),
    ),
  ).length;

  return {
    stats: [
      { label: "班级总人数", value: `${records.length}` },
      { label: "今日已提交", value: `${submittedCount}` },
      { label: "待批改", value: `${pendingReviewCount}` },
      { label: "失败待重试", value: `${failedRetryCount}` },
    ],
    records: records.map((record) => {
      const latestFailedTask = getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      });
      const queue = getHomeworkQueueState({
        submittedAt: record.submittedAt,
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        latestFailedTask,
      });

      return {
        latestFailedTask,
        queue,
        id: record.id,
        studentName: record.student.displayName,
        parentPhone: record.student.parentPhone,
        title: record.title,
        submitStatus: record.submittedAt ? "已提交" : "待提交",
        submittedAt: formatClock(record.submittedAt),
        imageCount: record.assets.length,
        reviewStatus: mapHomeworkStatusLabel(record.status),
        workspaceHref: `/workspace/${record.id}`,
        actionLabel: queue.actionLabel,
        latestError: latestFailedTask?.note ?? null,
      };
    }),
    selectedRecord: selectedRecord
      ? {
          latestFailedTask: getLatestQueueFailureTask({
            reviewStatus: selectedRecord.reviewStatus,
            feedbackStatus: selectedRecord.feedbackStatus,
            deliveryTasks: selectedRecord.deliveryTasks,
          }),
          queue: getHomeworkQueueState({
            submittedAt: selectedRecord.submittedAt,
            reviewStatus: selectedRecord.reviewStatus,
            feedbackStatus: selectedRecord.feedbackStatus,
            latestFailedTask: getLatestQueueFailureTask({
              reviewStatus: selectedRecord.reviewStatus,
              feedbackStatus: selectedRecord.feedbackStatus,
              deliveryTasks: selectedRecord.deliveryTasks,
            }),
          }),
          id: selectedRecord.id,
          studentName: selectedRecord.student.displayName,
          parentPhone: selectedRecord.student.parentPhone,
          className: selectedRecord.enrollment?.campClass?.name ?? "当前班级",
          submissionLink: selectedRecord.enrollment?.campClass?.portals[0]
            ? `/portal/${selectedRecord.enrollment.campClass.portals[0].token}`
            : null,
          portalReady: Boolean(selectedRecord.enrollment?.campClass?.portals[0]),
          statusLabel: mapHomeworkStatusLabel(selectedRecord.status),
          title: selectedRecord.title,
          submittedAt: selectedRecord.submittedAt,
          canRetryGrading: Boolean(selectedRecord.submittedAt) && selectedRecord.reviewStatus === "UNCHECKED",
          canRetryFeedback: Boolean(selectedRecord.submittedAt),
        }
      : null,
  };
}
