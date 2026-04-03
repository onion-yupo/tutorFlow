import type { Prisma } from "@/lib/generated/prisma/client";
import type { ViewerContext } from "@/lib/viewer";

export function buildStudentScopeWhere(viewer: ViewerContext): Prisma.StudentWhereInput | undefined {
  if (viewer.isAdmin) {
    return undefined;
  }

  if (viewer.classIds.length > 0) {
    return {
      subjectEnrollments: {
        some: {
          classId: {
            in: viewer.classIds,
          },
          isActive: true,
        },
      },
    };
  }

  return viewer.tutorProfileId ? { assignedTutorId: viewer.tutorProfileId } : undefined;
}

export function buildHomeworkScopeWhere(
  viewer: ViewerContext,
): Prisma.HomeworkRecordWhereInput | undefined {
  if (viewer.isAdmin) {
    return undefined;
  }

  if (viewer.classIds.length > 0) {
    return {
      enrollment: {
        is: {
          classId: {
            in: viewer.classIds,
          },
        },
      },
    };
  }

  return viewer.tutorProfileId ? { tutorId: viewer.tutorProfileId } : undefined;
}

export function buildDeliveryTaskScopeWhere(
  viewer: ViewerContext,
): Prisma.DeliveryTaskWhereInput | undefined {
  if (viewer.isAdmin) {
    return undefined;
  }

  if (viewer.classIds.length > 0) {
    return {
      OR: [
        {
          student: {
            is: buildStudentScopeWhere(viewer),
          },
        },
        viewer.tutorProfileId ? { tutorId: viewer.tutorProfileId } : {},
      ],
    };
  }

  return viewer.tutorProfileId ? { tutorId: viewer.tutorProfileId } : undefined;
}

export function buildMaterialScopeWhere(viewer: ViewerContext): Prisma.MaterialWhereInput | undefined {
  if (viewer.isAdmin) {
    return undefined;
  }

  if (viewer.subjectIds.length > 0) {
    return {
      subjectId: {
        in: viewer.subjectIds,
      },
    };
  }

  return undefined;
}
