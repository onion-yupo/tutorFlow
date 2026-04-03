import { db } from "@/lib/db";
import { formatClock, mapDeliveryTaskStatusLabel, toPercent } from "@/lib/domain";
import { getViewerPortalProgress } from "@/lib/portal-progress";
import { buildDeliveryTaskScopeWhere, buildHomeworkScopeWhere, buildStudentScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

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

export async function getDashboardData() {
  const viewer = await getViewerContext();
  const studentScope = buildStudentScopeWhere(viewer);
  const homeworkScope = buildHomeworkScopeWhere(viewer);
  const taskScope = buildDeliveryTaskScopeWhere(viewer);
  const portalProgress = await getViewerPortalProgress(viewer);

  const [students, todayHomework, pendingTasks, recentTasks] = await Promise.all([
    db.student.findMany({
      where: studentScope,
      include: {
        assignedTutor: true,
        subjectEnrollments: {
          where: { isActive: true },
          include: { subject: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.homeworkRecord.findMany({
      where: {
        dayLabel: portalProgress.currentDayLabel,
        ...(homeworkScope ?? {}),
      },
      include: {
        student: true,
        subject: true,
        deliveryTasks: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.deliveryTask.findMany({
      where: {
        ...(taskScope ?? {}),
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
      include: {
        student: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.deliveryTask.findMany({
      where: taskScope,
      include: {
        student: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const activeStudents = students.filter((student) =>
    ["PLACED", "ACTIVE", "COMPLETED"].includes(student.status),
  );
  const submittedHomework = todayHomework.filter((record) => record.submittedAt);
  const pendingReviewHomework = todayHomework.filter(
    (record) =>
      Boolean(record.submittedAt) &&
      record.reviewStatus === "UNCHECKED" &&
      !getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      }),
  );
  const pendingFeedbackHomework = todayHomework.filter(
    (record) =>
      Boolean(record.submittedAt) &&
      record.reviewStatus === "CHECKED" &&
      record.feedbackStatus === "PENDING" &&
      !getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      }),
  );
  const deliveredHomework = todayHomework.filter((record) => record.feedbackStatus === "SENT");
  const failedHomework = todayHomework.filter((record) => {
    return Boolean(record.submittedAt) &&
      Boolean(
        getLatestQueueFailureTask({
          reviewStatus: record.reviewStatus,
          feedbackStatus: record.feedbackStatus,
          deliveryTasks: record.deliveryTasks,
        }),
      );
  });
  const averageScore =
    submittedHomework.length > 0
      ? submittedHomework.reduce((sum, record) => sum + (record.score ?? 0), 0) / submittedHomework.length
      : 0;
  const defaultWorkspaceRecordId = todayHomework[0]?.id ?? null;
  const alerts = [
    ...failedHomework.map((record) => {
      const latestFailedTask = getLatestQueueFailureTask({
        reviewStatus: record.reviewStatus,
        feedbackStatus: record.feedbackStatus,
        deliveryTasks: record.deliveryTasks,
      });

      return {
        id: `failed-${record.id}`,
        title: "失败待重试",
        desc: `${record.student.displayName}${latestFailedTask?.note ? ` · ${latestFailedTask.note}` : ""}`,
        action: "立即重试",
        href: `/homework?recordId=${record.id}`,
      };
    }),
    ...pendingTasks.map((task) => ({
      id: task.id,
      title:
        task.type === "HOMEWORK_REMINDER"
          ? "掉队提醒"
          : task.type === "PLACEMENT_CONFIRMED"
            ? "分班提醒"
            : "待处理任务",
      desc: task.student
        ? `${task.student.parentName ?? "家长"} · ${task.student.displayName}${task.note ? ` ${task.note}` : ""}`
        : task.note ?? task.title,
      action: task.status === "IN_PROGRESS" ? "处理中" : "立即处理",
      href: task.type === "HOMEWORK_REMINDER" ? "/homework" : "/students",
    })),
  ].slice(0, 5);

  return {
    defaultWorkspaceHref: defaultWorkspaceRecordId ? `/workspace/${defaultWorkspaceRecordId}` : "/dashboard",
    overviewCards: [
      {
        label: "今日已提交",
        value: submittedHomework.length,
        hint: `回收率 ${toPercent(
          activeStudents.length > 0 ? (submittedHomework.length / activeStudents.length) * 100 : 0,
        )}`,
      },
      {
        label: "待批改",
        value: pendingReviewHomework.length,
        hint: "老师需核对判题结果",
      },
      {
        label: "待反馈",
        value: pendingFeedbackHomework.length,
        hint: "已核对，待生成并发送反馈",
      },
      {
        label: "失败待重试",
        value: failedHomework.length,
        hint: "模型生成或链路执行失败",
      },
    ],
    progress: {
      campLabel: `${portalProgress.campLabel} · 第 ${portalProgress.currentDayNumber} 天`,
      subjectLabel: todayHomework[0]?.subject.name ?? "数学",
      semesterLabel: todayHomework[0]?.student.gradeLevel ?? "四年级上学期",
      items: [
        { label: "整体进度", value: `${portalProgress.currentDayNumber} / ${portalProgress.campDays} 天` },
        { label: "班级人数", value: `${activeStudents.length} 人` },
        {
          label: "今日打卡率",
          value: toPercent(
            activeStudents.length > 0 ? (submittedHomework.length / activeStudents.length) * 100 : 0,
          ),
        },
        { label: "本周作业均分", value: averageScore.toFixed(1) },
        {
          label: "错题解决率",
          value: toPercent(
            submittedHomework.length > 0 ? (deliveredHomework.length / submittedHomework.length) * 100 : 0,
          ),
        },
      ],
    },
    alerts,
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      studentName: task.student?.displayName ?? "系统任务",
      task: task.title,
      status: mapDeliveryTaskStatusLabel(task.status),
      time: formatClock(task.updatedAt),
      href: task.homeworkRecordId ? `/homework?recordId=${task.homeworkRecordId}` : "/homework",
      isFailed: task.status === "FAILED",
    })),
  };
}

export async function getSidebarSummary() {
  const viewer = await getViewerContext();
  const studentScope = buildStudentScopeWhere(viewer);
  const homeworkScope = buildHomeworkScopeWhere(viewer);
  const portalProgress = await getViewerPortalProgress(viewer);

  const [pendingHomeworkCount, pendingContactCount, reviewDurations, firstRecord] = await Promise.all([
    db.homeworkRecord.count({
      where: {
        ...(homeworkScope ?? {}),
        submittedAt: { not: null },
        feedbackStatus: "PENDING",
      },
    }),
    db.student.count({
      where: {
        ...(studentScope ?? {}),
        status: {
          in: ["LEAD_NEW", "WECHAT_ADDED", "ASSESSING"],
        },
      },
    }),
    db.homeworkRecord.findMany({
      where: {
        ...(homeworkScope ?? {}),
        reviewedAt: { not: null },
        submittedAt: { not: null },
      },
      select: {
        submittedAt: true,
        reviewedAt: true,
      },
    }),
    db.homeworkRecord.findFirst({
      where: {
        dayLabel: portalProgress.currentDayLabel,
        ...(homeworkScope ?? {}),
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
      },
    }),
  ]);

  const avgReviewMinutes =
    reviewDurations.length > 0
      ? Math.round(
          reviewDurations.reduce((sum, record) => {
            if (!record.submittedAt || !record.reviewedAt) {
              return sum;
            }

            return sum + Math.max(1, Math.round((record.reviewedAt.getTime() - record.submittedAt.getTime()) / 60000));
          }, 0) / reviewDurations.length,
        )
      : 0;

  return {
    pendingHomeworkCount,
    pendingContactCount,
    avgReviewMinutes,
    defaultWorkspaceHref: firstRecord ? `/workspace/${firstRecord.id}` : "/dashboard",
  };
}
