"use server";

import { randomUUID } from "node:crypto";

import { regenerateWorkspaceFeedback, retryWorkspaceGrading } from "@/app/actions/workspace";
import { buildHomeworkSubmissionToken, getChinaDayStartDate, parseDayLabel } from "@/lib/camp-day";
import { db } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";

function deriveCampStartDate(dayLabel: string) {
  const dayNumber = parseDayLabel(dayLabel) ?? 1;
  return new Date(getChinaDayStartDate().getTime() - (dayNumber - 1) * 24 * 60 * 60 * 1000);
}

export async function remindHomeworkSubmission(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
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
    },
  });

  if (!homework) {
    return;
  }

  const existingTask = await db.deliveryTask.findFirst({
    where: {
      homeworkRecordId,
      type: "HOMEWORK_REMINDER",
      status: {
        in: ["PENDING", "IN_PROGRESS"],
      },
    },
  });

  if (existingTask) {
    await db.deliveryTask.update({
      where: { id: existingTask.id },
      data: {
        note: "已再次催交，请家长尽快提交。",
        updatedAt: new Date(),
      },
    });
  } else {
    await db.deliveryTask.create({
      data: {
        type: "HOMEWORK_REMINDER",
        status: "PENDING",
        title: `提醒${homework.student.displayName}提交${homework.dayLabel}作业`,
        note: "系统已创建待提醒任务。",
        studentId: homework.studentId,
        tutorId: homework.tutorId ?? undefined,
        homeworkRecordId,
      },
    });
  }

  safeRevalidatePath("/homework");
  safeRevalidatePath("/dashboard");
  safeRevalidatePath(`/workspace/${homeworkRecordId}`);
}

export async function generateSubmissionLink(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const homework = await db.homeworkRecord.findUnique({
    where: { id: homeworkRecordId },
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
    },
  });

  if (!homework) {
    return;
  }

  const classInfo = homework.enrollment?.campClass;
  if (!classInfo) {
    return;
  }

  let portalToken = classInfo?.portals[0]?.token;

  if (!portalToken) {
    portalToken = `${classInfo.code}-${randomUUID().slice(0, 6)}`.toLowerCase();
    await db.submissionPortal.create({
      data: {
        classId: classInfo.id,
        token: portalToken,
        title: `${classInfo.name}通用提交入口`,
        description: "班级群统一作业提交入口，首次绑定后 21 天免登录。",
        campStartDate: deriveCampStartDate(homework.dayLabel),
        campDays: 21,
        activeDayLabel: homework.dayLabel,
      },
    });
  }

  const submissionLink = `/portal/${portalToken}`;

  await db.homeworkRecord.update({
    where: { id: homeworkRecordId },
    data: {
      submissionLink,
      submissionLinkToken: buildHomeworkSubmissionToken(portalToken, homework.studentId, homework.dayLabel),
    },
  });

  await db.deliveryTask.create({
    data: {
      type: "SUBMISSION_LINK_GENERATED",
      status: "COMPLETED",
      title: `${classInfo.name}班级提交入口已就绪`,
      note: "该入口为班级通用链接，可直接发到群里，家长首次验证后 21 天自动登录。",
      actionUrl: submissionLink,
      studentId: homework.studentId,
      tutorId: homework.tutorId ?? undefined,
      homeworkRecordId,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath("/homework");
  safeRevalidatePath("/dashboard");
}

export async function retryHomeworkFeedbackGeneration(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const nextFormData = new FormData();
  nextFormData.set("homeworkRecordId", homeworkRecordId);

  await regenerateWorkspaceFeedback(nextFormData);
}

export async function retryHomeworkGrading(formData: FormData) {
  const homeworkRecordId = String(formData.get("homeworkRecordId") ?? "");

  if (!homeworkRecordId) {
    return;
  }

  const nextFormData = new FormData();
  nextFormData.set("homeworkRecordId", homeworkRecordId);

  await retryWorkspaceGrading(nextFormData);
}
