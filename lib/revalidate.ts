import { revalidatePath } from "next/cache";

export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Skip revalidate for ${path}:`, error);
    }
  }
}
