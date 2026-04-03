import { db } from "@/lib/db";
import { mapMaterialStatusLabel } from "@/lib/domain";
import { buildMaterialScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

export async function getMaterialsPageData(selectedMaterialId?: string) {
  const viewer = await getViewerContext();
  const scope = buildMaterialScopeWhere(viewer);

  const materials = await db.material.findMany({
    where: scope,
    include: {
      distribution: true,
      subject: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const courseHomework = materials.filter((material) => material.type === "COURSE_HOMEWORK");
  const courseAnswers = materials.filter((material) => material.type === "COURSE_ANSWER");
  const h5Assets = materials.filter((material) => material.type === "H5_INTERACTIVE");
  const selectedMaterial =
    materials.find((material) => material.id === selectedMaterialId) ?? h5Assets[0] ?? courseHomework[0] ?? null;

  return {
    summary: {
      courseCount: courseHomework.length,
      h5Count: h5Assets.length,
      pendingPublishCount: materials.filter((material) => material.status !== "PUBLISHED").length,
    },
    courseLibrary: courseHomework.map((material) => {
      const answer = courseAnswers.find(
        (item) => item.dayLabel === material.dayLabel && item.semesterLabel === material.semesterLabel,
      );

      return {
        id: material.id,
        dayLabel: material.dayLabel ?? "--",
        title: material.title,
        homeworkStatus: mapMaterialStatusLabel(material.status),
        answerStatus: answer ? mapMaterialStatusLabel(answer.status) : "待上传",
      };
    }),
    h5Assets: h5Assets.map((material) => ({
      id: material.id,
      title: material.title,
      statusLabel: mapMaterialStatusLabel(material.status),
      usageText: material.usageCount > 0 ? `${material.usageCount} 人使用` : "未使用",
    })),
    selectedMaterial: selectedMaterial
      ? {
          id: selectedMaterial.id,
          title: selectedMaterial.title,
          status: selectedMaterial.status,
          statusLabel: mapMaterialStatusLabel(selectedMaterial.status),
          externalUrl: selectedMaterial.externalUrl ?? "",
          guidanceText:
            selectedMaterial.distribution?.guidanceText ?? "请补充给家长的引导语。",
          trackDuration: selectedMaterial.distribution?.trackDuration ?? false,
          trackScore: selectedMaterial.distribution?.trackScore ?? false,
          trackMistakes: selectedMaterial.distribution?.trackMistakes ?? false,
          previewQuestion: selectedMaterial.previewQuestion ?? "当前暂无预览题目",
          previewAnswer: selectedMaterial.previewAnswer ?? "",
          previewOptions: Array.isArray(selectedMaterial.previewOptions)
            ? (selectedMaterial.previewOptions as string[])
            : [],
        }
      : null,
  };
}
