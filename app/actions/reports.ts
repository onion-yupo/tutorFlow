"use server";

import { db } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function updateReportArtifactSettings(formData: FormData) {
  const artifactId = String(formData.get("artifactId") ?? "");
  const subtitleText = String(formData.get("subtitleText") ?? "");
  const musicName = String(formData.get("musicName") ?? "");

  if (!artifactId) {
    return;
  }

  await db.reportArtifact.update({
    where: { id: artifactId },
    data: {
      subtitleText,
      musicName,
    },
  });

  safeRevalidatePath("/reports");
}

export async function queueReportJob(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const studentIds = String(formData.get("studentIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const tutorId = String(formData.get("tutorId") ?? "");
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "");
  const artifactId = String(formData.get("artifactId") ?? "");

  const targets = studentIds.length > 0 ? studentIds : studentId ? [studentId] : [];

  if (targets.length === 0 || !type || !title) {
    return;
  }

  for (const targetStudentId of targets) {
    const reportJob = await db.reportJob.create({
      data: {
        studentId: targetStudentId,
        tutorId: tutorId || undefined,
        artifactId: targets.length === 1 ? artifactId || undefined : undefined,
        type: type as never,
        status: "PENDING",
        title,
        message: "老师已发起站内生成任务，等待后续适配真实导出服务。",
      },
    });

    await db.deliveryTask.create({
      data: {
        type: "REPORT_EXPORT",
        status: "PENDING",
        title,
        note: "站内任务已创建，后续可接第三方导出服务。",
        studentId: targetStudentId,
        tutorId: tutorId || undefined,
        reportJobId: reportJob.id,
      },
    });
  }

  safeRevalidatePath("/reports");
  safeRevalidatePath("/dashboard");
}
