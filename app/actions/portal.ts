"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  buildHomeworkSubmissionToken,
  buildHomeworkTitle,
  isPortalDaySelectable,
} from "@/lib/camp-day";
import { db } from "@/lib/db";
import { saveHomeworkImages } from "@/lib/uploads";

const STUDENT_SESSION_COOKIE = "tf_student_session";

export async function bindPortalStudent(formData: FormData) {
  const portalToken = String(formData.get("portalToken") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const phoneLast4 = String(formData.get("phoneLast4") ?? "").trim();

  if (!portalToken || !studentId || !phoneLast4) {
    redirect(`/portal/${portalToken}`);
  }

  const portal = await db.submissionPortal.findUnique({
    where: { token: portalToken },
    include: {
      campClass: {
        include: {
          enrollments: {
            where: {
              studentId,
              isActive: true,
            },
            include: {
              student: true,
            },
          },
        },
      },
    },
  });

  const enrollment = portal?.campClass.enrollments[0];
  const student = enrollment?.student;

  if (!portal || !student || student.parentPhone.slice(-4) !== phoneLast4) {
    redirect(`/portal/${portalToken}?error=bind_failed`);
  }

  const binding = await db.studentPortalBinding.upsert({
    where: {
      studentId_portalId: {
        studentId,
        portalId: portal.id,
      },
    },
    update: {
      phoneLast4,
      displayNameSnapshot: student.displayName,
      lastLoginAt: new Date(),
    },
    create: {
      studentId,
      portalId: portal.id,
      phoneLast4,
      displayNameSnapshot: student.displayName,
      lastLoginAt: new Date(),
    },
  });

  const sessionToken = randomUUID();
  await db.studentPortalSession.create({
    data: {
      bindingId: binding.id,
      studentId,
      portalId: portal.id,
      sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      lastActiveAt: new Date(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(STUDENT_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 21,
  });

  redirect(`/portal/${portalToken}`);
}

export async function submitPortalHomework(formData: FormData) {
  const portalToken = String(formData.get("portalToken") ?? "");
  const dayLabel = String(formData.get("dayLabel") ?? "").trim();
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const dayQuery = dayLabel ? `?day=${encodeURIComponent(dayLabel)}` : "";

  if (!portalToken || imageFiles.length === 0) {
    redirect(`/portal/${portalToken}${dayQuery ? `${dayQuery}&error=empty_submission` : "?error=empty_submission"}`);
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect(`/portal/${portalToken}`);
  }

  const session = await db.studentPortalSession.findUnique({
    where: { sessionToken },
    include: {
      student: true,
      portal: {
        include: {
          campClass: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.portal.token !== portalToken || session.expiresAt.getTime() <= Date.now()) {
    redirect(`/portal/${portalToken}`);
  }

  if (
    !isPortalDaySelectable({
      dayLabel,
      campStartDate: session.portal.campStartDate,
      campDays: session.portal.campDays,
    })
  ) {
    redirect(`/portal/${portalToken}?error=invalid_day`);
  }

  const enrollment = await db.studentSubjectEnrollment.findFirst({
    where: {
      studentId: session.studentId,
      classId: session.portal.classId,
      isActive: true,
    },
  });

  if (!enrollment) {
    redirect(`/portal/${portalToken}?error=enrollment_missing`);
  }

  const title = buildHomeworkTitle(dayLabel, session.portal.campClass.subject.name);
  const existingRecord = await db.homeworkRecord.findFirst({
    where: {
      studentId: session.studentId,
      enrollmentId: enrollment.id,
      dayLabel,
    },
    include: {
      assets: {
        orderBy: { pageIndex: "asc" },
      },
    },
  });

  const homeworkRecord = existingRecord
    ? await db.homeworkRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: "SUBMITTED",
          submissionChannel: "WECHAT",
          submissionLink: `/portal/${portalToken}`,
          submissionLinkToken: buildHomeworkSubmissionToken(portalToken, session.studentId, dayLabel),
          submittedAt: new Date(),
          tutorId: session.portal.campClass.leadTutorId ?? undefined,
          reviewedAt: null,
          deliveredAt: null,
          score: null,
          accuracyRate: null,
          correctCount: null,
          incorrectCount: null,
        },
      })
    : await db.homeworkRecord.create({
        data: {
          studentId: session.studentId,
          tutorId: session.portal.campClass.leadTutorId ?? undefined,
          subjectId: session.portal.campClass.subjectId,
          enrollmentId: enrollment.id,
          campLabel: session.portal.campClass.campLabel,
          dayLabel,
          title,
          status: "SUBMITTED",
          submissionChannel: "WECHAT",
          submissionLink: `/portal/${portalToken}`,
          submissionLinkToken: buildHomeworkSubmissionToken(portalToken, session.studentId, dayLabel),
          submittedAt: new Date(),
        },
      });

  const savedUrls = await saveHomeworkImages({
    portalToken,
    studentId: session.studentId,
    dayLabel,
    files: imageFiles,
  });

  if (savedUrls.length > 0) {
    await db.homeworkAsset.createMany({
      data: savedUrls.map((fileUrl, index) => ({
        homeworkRecordId: homeworkRecord.id,
        assetType: "ORIGINAL_IMAGE",
        pageIndex: (existingRecord?.assets.length ?? 0) + index,
        fileUrl,
      })),
    });
  }

  await db.deliveryTask.create({
    data: {
      type: "SUBMISSION_LINK_GENERATED",
      status: "COMPLETED",
      title: `${session.student.displayName}${dayLabel}已提交作业`,
      note: existingRecord ? "家长通过固定入口补充上传了新图片。" : "家长通过固定入口完成了作业提交。",
      studentId: session.studentId,
      tutorId: session.portal.campClass.leadTutorId ?? undefined,
      homeworkRecordId: homeworkRecord.id,
      completedAt: new Date(),
    },
  });

  await db.studentPortalSession.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date(),
    },
  });

  redirect(`/portal/${portalToken}?day=${encodeURIComponent(dayLabel)}&success=${existingRecord ? "appended" : "submitted"}`);
}

export async function clearPortalSession(formData: FormData) {
  const portalToken = String(formData.get("portalToken") ?? "");
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await db.studentPortalSession.deleteMany({
      where: { sessionToken },
    });
  }

  cookieStore.delete(STUDENT_SESSION_COOKIE);
  redirect(`/portal/${portalToken}`);
}
