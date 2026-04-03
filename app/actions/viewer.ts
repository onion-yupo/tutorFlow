"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function switchViewer(formData: FormData) {
  const viewerId = String(formData.get("viewerId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");

  if (!viewerId) {
    redirect(returnTo);
  }

  const cookieStore = await cookies();
  cookieStore.set("tf_viewer_id", viewerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 21,
  });

  redirect(returnTo);
}
