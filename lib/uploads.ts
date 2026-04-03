import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const HOMEWORK_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "homework");
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getExtension(file: File) {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  const mimeExtension = byMime[file.type];
  if (mimeExtension) {
    return mimeExtension;
  }

  const rawExtension = path.extname(file.name || "").toLowerCase();
  return rawExtension || ".jpg";
}

export function validateHomeworkImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、WEBP、GIF 图片上传。");
  }

  if (file.size <= 0) {
    throw new Error("检测到空文件，请重新选择图片。");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("单张图片不能超过 10MB。");
  }
}

export async function saveHomeworkImages(params: {
  portalToken: string;
  studentId: string;
  dayLabel: string;
  files: File[];
}) {
  const { portalToken, studentId, dayLabel, files } = params;
  const targetDir = path.join(HOMEWORK_UPLOAD_DIR, portalToken, studentId, dayLabel.toLowerCase());
  await mkdir(targetDir, { recursive: true });

  const savedUrls: string[] = [];
  for (const file of files) {
    validateHomeworkImage(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${getExtension(file)}`;
    const absolutePath = path.join(targetDir, filename);
    await writeFile(absolutePath, bytes);
    const relativePath = path
      .relative(PUBLIC_DIR, absolutePath)
      .split(path.sep)
      .join("/");
    savedUrls.push(`/${relativePath}`);
  }

  return savedUrls;
}

export async function deleteLocalUploadByUrl(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/")) {
    return;
  }

  const absolutePath = path.join(PUBLIC_DIR, fileUrl.replace(/^\//, ""));
  await rm(absolutePath, { force: true });
}
