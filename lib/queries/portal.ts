import { cookies } from "next/headers";

import { buildAvailableDayOptions, getCampDayProgress, isPortalDaySelectable } from "@/lib/camp-day";
import { db } from "@/lib/db";
import { formatShortDate, mapHomeworkStatusLabel } from "@/lib/domain";

export async function getPortalPageData(token: string, requestedDayLabel?: string) {
  const portal = await db.submissionPortal.findUnique({
    where: { token },
    include: {
      campClass: {
        include: {
          subject: true,
          enrollments: {
            where: { isActive: true },
            include: {
              student: true,
            },
            orderBy: {
              student: {
                displayName: "asc",
              },
            },
          },
        },
      },
    },
  });

  if (!portal) {
    throw new Error(`Portal not found: ${token}`);
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("tf_student_session")?.value;

  const session = sessionToken
    ? await db.studentPortalSession.findUnique({
        where: { sessionToken },
        include: {
          student: true,
          binding: true,
        },
      })
    : null;

  const activeSession =
    session &&
    session.portalId === portal.id &&
    session.expiresAt.getTime() > Date.now()
      ? session
      : null;

  const progress = getCampDayProgress({
    campStartDate: portal.campStartDate,
    campDays: portal.campDays,
  });
  const availableDays = buildAvailableDayOptions({
    campStartDate: portal.campStartDate,
    campDays: portal.campDays,
  });
  const selectedDayLabel =
    requestedDayLabel &&
    isPortalDaySelectable({
      dayLabel: requestedDayLabel,
      campStartDate: portal.campStartDate,
      campDays: portal.campDays,
    })
      ? requestedDayLabel
      : progress.currentDayLabel;

  const homeworkRecords = activeSession
    ? await db.homeworkRecord.findMany({
        where: {
          studentId: activeSession.studentId,
          dayLabel: {
            in: availableDays.map((item) => item.dayLabel),
          },
          enrollment: {
            is: {
              classId: portal.classId,
            },
          },
        },
        include: {
          assets: {
            orderBy: { pageIndex: "asc" },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      })
    : [];
  const homeworkByDay = new Map<string, (typeof homeworkRecords)[number]>();

  for (const record of homeworkRecords) {
    if (!homeworkByDay.has(record.dayLabel)) {
      homeworkByDay.set(record.dayLabel, record);
    }
  }

  const selectedHomework = activeSession ? homeworkByDay.get(selectedDayLabel) ?? null : null;

  return {
    portal: {
      id: portal.id,
      token: portal.token,
      title: portal.title,
      description: portal.description ?? "",
      currentDayLabel: progress.currentDayLabel,
      currentDayNumber: progress.currentDayNumber,
      campDays: portal.campDays,
      className: portal.campClass.name,
      campLabel: portal.campClass.campLabel,
      subjectName: portal.campClass.subject.name,
      gradeLevel: portal.campClass.gradeLevel,
      dayOptions: availableDays.map((item) => {
        const record = homeworkByDay.get(item.dayLabel);
        return {
          dayLabel: item.dayLabel,
          dayNumber: item.dayNumber,
          isToday: item.isToday,
          isSelected: item.dayLabel === selectedDayLabel,
          submitLabel: record ? "已提交" : "待补交",
          statusLabel: record ? mapHomeworkStatusLabel(record.status) : "待提交",
          imageCount: record?.assets.length ?? 0,
          submittedAtLabel: formatShortDate(record?.submittedAt),
        };
      }),
      selectedDayLabel,
      students: portal.campClass.enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        displayName: enrollment.student.displayName,
        parentPhoneLast4: enrollment.student.parentPhone.slice(-4),
      })),
    },
    activeStudent: activeSession
      ? {
          studentId: activeSession.student.id,
          displayName: activeSession.student.displayName,
          phoneLast4: activeSession.student.parentPhone.slice(-4),
          expiresAt: activeSession.expiresAt,
          submittedDays: homeworkRecords.length,
        }
      : null,
    selectedHomework: selectedHomework
      ? {
          id: selectedHomework.id,
          dayLabel: selectedHomework.dayLabel,
          status: selectedHomework.status,
          statusLabel: mapHomeworkStatusLabel(selectedHomework.status),
          title: selectedHomework.title,
          imageUrls: selectedHomework.assets.map((asset) => asset.fileUrl),
          submittedAt: selectedHomework.submittedAt,
        }
      : null,
  };
}
