import { db } from "@/lib/db";
import { mapReportJobStatusLabel } from "@/lib/domain";
import { buildStudentScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

type ArtifactMetadata = {
  studyDays?: number;
  checkInRate?: number;
  scoreIncrease?: number;
  highlights?: string[];
  wrongQuestionStats?: number[];
};

export async function getReportsPageData(selectedStudentId?: string) {
  const viewer = await getViewerContext();
  const scope = buildStudentScopeWhere(viewer);

  const students = await db.student.findMany({
    where: scope,
    include: {
      reportJobs: {
        orderBy: { createdAt: "desc" },
      },
      reportArtifacts: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;
  const videoArtifact =
    selectedStudent?.reportArtifacts.find((artifact) => artifact.artifactType === "GROWTH_VIDEO") ?? null;
  const pdfArtifact =
    selectedStudent?.reportArtifacts.find((artifact) => artifact.artifactType === "PDF_REPORT") ?? null;
  const metadata = (pdfArtifact?.metadata ?? videoArtifact?.metadata ?? {}) as ArtifactMetadata;

  return {
    students: students.map((student) => ({
      id: student.id,
      name: student.displayName,
      phone: `${student.parentPhone.slice(0, 3)}****${student.parentPhone.slice(-4)}`,
      statusLabel: mapReportJobStatusLabel(student.reportJobs[0]?.status ?? "PENDING"),
    })),
    selectedStudent: selectedStudent
      ? {
          id: selectedStudent.id,
          name: selectedStudent.displayName,
        }
      : null,
    videoArtifact: videoArtifact
      ? {
          id: videoArtifact.id,
          title: videoArtifact.title,
          subtitleText: videoArtifact.subtitleText ?? "",
          musicName: videoArtifact.musicName ?? "未设置",
          previewUrl: videoArtifact.previewUrl ?? "#",
          highlights: metadata.highlights ?? [],
        }
      : null,
    pdfArtifact: pdfArtifact
      ? {
          id: pdfArtifact.id,
          title: pdfArtifact.title,
          summary: pdfArtifact.summary ?? "",
          metrics: [
            { label: "学习天数", value: `${metadata.studyDays ?? 0}` },
            { label: "作业打卡率", value: `${metadata.checkInRate ?? 0}%` },
            { label: "分数提升", value: `+${metadata.scoreIncrease ?? 0}` },
          ],
          wrongQuestionStats: metadata.wrongQuestionStats ?? [0, 0, 0, 0, 0],
        }
      : null,
  };
}
