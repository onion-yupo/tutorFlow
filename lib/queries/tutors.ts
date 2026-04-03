import { db } from "@/lib/db";
import { minutesBetween } from "@/lib/domain";
import { getViewerContext } from "@/lib/viewer";

export async function getTutorsPageData() {
  const viewer = await getViewerContext();

  const tutors = await db.tutorProfile.findMany({
    where: viewer.isAdmin
      ? undefined
      : viewer.tutorProfileId
        ? { id: viewer.tutorProfileId }
        : undefined,
    include: {
      subjects: {
        include: {
          subject: true,
        },
      },
      reviewedHomework: true,
    },
    orderBy: { displayName: "asc" },
  });

  return tutors.map((tutor) => {
    const reviewDurations = tutor.reviewedHomework
      .map((record) => minutesBetween(record.submittedAt, record.reviewedAt))
      .filter((value): value is number => value !== null);
    const avgReviewMinutes =
      reviewDurations.length > 0
        ? Math.round(reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length)
        : 0;
    const deliveredCount = tutor.reviewedHomework.filter((record) => record.status === "DELIVERED").length;
    const submittedCount = tutor.reviewedHomework.filter((record) => record.submittedAt).length;
    const recoveryRate =
      submittedCount > 0 ? Math.round((deliveredCount / submittedCount) * 100) : 0;

    return {
      id: tutor.id,
      name: tutor.displayName,
      scope:
        tutor.subjects.length > 0
          ? tutor.subjects
              .map((assignment) => `${assignment.subject.name}${assignment.gradeBand ? ` / ${assignment.gradeBand}` : ""}`)
              .join("、")
          : "未分配学科",
      performance: `平均批改 ${avgReviewMinutes} 分钟 · 回收率 ${recoveryRate}%`,
      status:
        avgReviewMinutes <= 6 ? "优秀" : avgReviewMinutes <= 9 ? "良好" : "待提升",
    };
  });
}
