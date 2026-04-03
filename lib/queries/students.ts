import { db } from "@/lib/db";
import { formatShortDate, mapStudentStatusLabel } from "@/lib/domain";
import type { StudentStatus } from "@/lib/generated/prisma/client";
import { buildStudentScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

const filterMap: Record<string, StudentStatus[] | undefined> = {
  all: undefined,
  lead: ["LEAD_NEW"],
  wechat: ["WECHAT_ADDED"],
  assessing: ["ASSESSING"],
  placed: ["PLACED", "ACTIVE", "COMPLETED"],
};

export async function getStudentsPageData(
  filter: string = "all",
  selectedStudentId?: string,
) {
  const viewer = await getViewerContext();
  const statuses = filterMap[filter] ?? undefined;
  const scope = buildStudentScopeWhere(viewer);

  const students = await db.student.findMany({
    where: {
      ...(scope ?? {}),
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: {
      assignedTutor: true,
      subjectEnrollments: {
        where: { isActive: true },
        include: { subject: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
  });

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;
  const selectedEnrollment = selectedStudent?.subjectEnrollments[0] ?? null;

  return {
    filter,
    students: students.map((student) => ({
      id: student.id,
      displayName: student.displayName,
      parentName: student.parentName ?? "家长",
      channel: student.sourceChannel,
      phoneTail: student.parentPhone.slice(-4),
      gradeLevel: student.gradeLevel,
      goal: student.learningGoal ?? "--",
      assignedAt: formatShortDate(student.createdAt),
      statusLabel: mapStudentStatusLabel(student.status),
      rawStatus: student.status,
      subjectLabel: student.subjectEnrollments[0]?.subject.name ?? "未分配学科",
      enrollmentId: student.subjectEnrollments[0]?.id ?? null,
    })),
    selectedStudent: selectedStudent
      ? {
          id: selectedStudent.id,
          displayName: selectedStudent.displayName,
          parentName: selectedStudent.parentName ?? "家长",
          parentPhone: selectedStudent.parentPhone,
          gradeLevel: selectedStudent.gradeLevel,
          textbookVersion: selectedStudent.textbookVersion ?? "--",
          goal: selectedStudent.learningGoal ?? "--",
          channel: selectedStudent.sourceChannel,
          statusLabel: mapStudentStatusLabel(selectedStudent.status),
          rawStatus: selectedStudent.status,
          enrollmentId: selectedEnrollment?.id ?? null,
          placementScore: selectedEnrollment?.placementScore ?? 0,
          suggestedPlacement: selectedEnrollment?.suggestedPlacement ?? "待生成",
          finalPlacement: selectedEnrollment?.finalPlacement ?? "待确认",
        }
      : null,
  };
}
