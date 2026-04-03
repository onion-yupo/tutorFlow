"use server";

import { db } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function updateMaterialStatus(formData: FormData) {
  const materialId = String(formData.get("materialId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!materialId || !status) {
    return;
  }

  await db.material.update({
    where: { id: materialId },
    data: { status: status as never },
  });

  safeRevalidatePath("/materials");
}

export async function saveMaterialDistribution(formData: FormData) {
  const materialId = String(formData.get("materialId") ?? "");
  const title = String(formData.get("title") ?? "");
  const guidanceText = String(formData.get("guidanceText") ?? "");
  const externalUrl = String(formData.get("externalUrl") ?? "");
  const trackDuration = formData.get("trackDuration") === "on";
  const trackScore = formData.get("trackScore") === "on";
  const trackMistakes = formData.get("trackMistakes") === "on";

  if (!materialId || !title) {
    return;
  }

  await db.material.update({
    where: { id: materialId },
    data: {
      externalUrl,
    },
  });

  await db.materialDistribution.upsert({
    where: { materialId },
    update: {
      title,
      guidanceText,
      trackDuration,
      trackScore,
      trackMistakes,
    },
    create: {
      materialId,
      title,
      guidanceText,
      trackDuration,
      trackScore,
      trackMistakes,
    },
  });

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      title: true,
    },
  });

  await db.deliveryTask.create({
    data: {
      type: "MATERIAL_DISTRIBUTED",
      status: "COMPLETED",
      title: `${material?.title ?? "素材"}分发配置已保存`,
      note: "任务分发配置已更新。",
      materialId,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath("/materials");
  safeRevalidatePath("/dashboard");
}
