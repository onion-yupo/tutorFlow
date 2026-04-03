import { getCampDayProgress } from "@/lib/camp-day";
import { db } from "@/lib/db";
import type { ViewerContext } from "@/lib/viewer";

export async function getViewerPortalProgress(viewer: ViewerContext) {
  const portal = await db.submissionPortal.findFirst({
    where: viewer.isAdmin
      ? { isActive: true }
      : viewer.classIds.length > 0
        ? {
            isActive: true,
            classId: {
              in: viewer.classIds,
            },
          }
        : { isActive: true },
    include: {
      campClass: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!portal) {
    return {
      portal: null,
      currentDayLabel: "Day 1",
      currentDayNumber: 1,
      campDays: 21,
      campLabel: "当前训练营",
    };
  }

  const progress = getCampDayProgress({
    campStartDate: portal.campStartDate,
    campDays: portal.campDays,
  });

  return {
    portal,
    currentDayLabel: progress.currentDayLabel,
    currentDayNumber: progress.currentDayNumber,
    campDays: portal.campDays,
    campLabel: portal.campClass.campLabel,
  };
}
