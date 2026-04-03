import { cookies } from "next/headers";

import { db } from "@/lib/db";

const DEFAULT_VIEWER_ID = process.env.DEV_DEFAULT_VIEWER_ID ?? "user-li";

export interface ViewerContext {
  userId: string;
  name: string;
  role: "ADMIN" | "TUTOR" | "LEAD";
  isAdmin: boolean;
  tutorProfileId?: string;
  classIds: string[];
  subjectIds: string[];
  availableViewers: Array<{
    userId: string;
    name: string;
    role: string;
  }>;
}

export async function getViewerContext(): Promise<ViewerContext> {
  const cookieStore = await cookies();
  const preferredUserId = cookieStore.get("tf_viewer_id")?.value ?? DEFAULT_VIEWER_ID;

  const [viewer, allUsers] = await Promise.all([
    db.user.findUnique({
      where: { id: preferredUserId },
      include: {
        tutorProfile: {
          include: {
            subjects: true,
            classAssignments: true,
          },
        },
      },
    }),
    db.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const fallbackViewer =
    viewer ??
    (await db.user.findFirst({
      include: {
        tutorProfile: {
          include: {
            subjects: true,
            classAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }));

  if (!fallbackViewer) {
    throw new Error("No viewer user found in database.");
  }

  return {
    userId: fallbackViewer.id,
    name: fallbackViewer.name,
    role: fallbackViewer.role,
    isAdmin: fallbackViewer.role === "ADMIN",
    tutorProfileId: fallbackViewer.tutorProfile?.id,
    classIds: fallbackViewer.tutorProfile?.classAssignments.map((item) => item.classId) ?? [],
    subjectIds: fallbackViewer.tutorProfile?.subjects.map((item) => item.subjectId) ?? [],
    availableViewers: allUsers.map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.role,
    })),
  };
}
