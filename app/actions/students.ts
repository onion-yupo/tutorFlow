"use server";

import { db } from "@/lib/db";
import { safeRevalidatePath } from "@/lib/revalidate";

export async function updateStudentStatus(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!studentId || !status) {
    return;
  }

  await db.student.update({
    where: { id: studentId },
    data: { status: status as never },
  });

  safeRevalidatePath("/students");
  safeRevalidatePath("/dashboard");
}

export async function updateStudentPlacement(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const placement = String(formData.get("placement") ?? "");
  const taskType = String(formData.get("taskType") ?? "PLACEMENT_CONFIRMED");

  if (!studentId || !enrollmentId || !placement) {
    return;
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      assignedTutorId: true,
      displayName: true,
    },
  });

  await db.student.update({
    where: { id: studentId },
    data: {
      status: "PLACED",
    },
  });

  await db.studentSubjectEnrollment.update({
    where: { id: enrollmentId },
    data: {
      finalPlacement: placement,
    },
  });

  await db.deliveryTask.create({
    data: {
      type: taskType as never,
      status: "COMPLETED",
      title: `${student?.displayName ?? "学员"}分班结果已更新`,
      note: `当前班型：${placement}`,
      studentId,
      tutorId: student?.assignedTutorId ?? undefined,
      completedAt: new Date(),
    },
  });

  safeRevalidatePath("/students");
  safeRevalidatePath("/dashboard");
}
