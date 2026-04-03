"use client";

import Link from "next/link";
import { EyeOff, Highlighter, ImageIcon, Maximize2, PenTool, SquareCheckBig } from "lucide-react";

import type { AnnotationColor, WorkspaceImage, WorkspaceStudentIdentity } from "@/lib/types/workspace";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export type WorkspaceAnnotationAction =
  | "CORRECT_MARK"
  | "ERROR_CIRCLE"
  | "HIGHLIGHT"
  | "HIDE_ALL";

interface GradingCanvasPaneProps {
  student: WorkspaceStudentIdentity;
  images: WorkspaceImage[];
  activeImageId: string;
  onChangeImage: (imageId: string) => void;
  onToolbarAction: (action: WorkspaceAnnotationAction) => void;
  isMutating?: boolean;
}

function getAnnotationClass(color: AnnotationColor) {
  switch (color) {
    case "emerald":
      return "border-emerald-500/80 bg-emerald-500/12 text-emerald-700";
    case "rose":
      return "border-rose-500/80 bg-rose-500/12 text-rose-700";
    case "amber":
      return "border-amber-500/80 bg-amber-500/14 text-amber-700";
    default:
      return "border-border bg-secondary text-foreground";
  }
}

function renderImageList(image: WorkspaceImage, isActive: boolean, onClick: () => void) {
  return (
    <button
      key={image.id}
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition ${
        isActive ? "border-primary bg-primary/5" : "border-border/70 bg-white/80 hover:bg-secondary/70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{image.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {image.wrongQuestions > 0 ? "含错题，需要复核" : "本页全部正确"}
          </p>
        </div>
        <Badge variant={image.wrongQuestions > 0 ? "outline" : "default"} className="rounded-full">
          {image.wrongQuestions > 0 ? "有错" : "正确"}
        </Badge>
      </div>
    </button>
  );
}

export function GradingCanvasPane({
  student,
  images,
  activeImageId,
  onChangeImage,
  onToolbarAction,
  isMutating = false,
}: GradingCanvasPaneProps) {
  const selectedImage = images.find((image) => image.id === activeImageId) ?? images[0];

  return (
    <section className="workspace-card flex min-h-0 flex-col overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <p className="workspace-panel-title">作业原图</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.name} · {student.gradeLabel} · 13****{student.phoneTail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            {student.subjectLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            {student.goal}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { icon: PenTool, label: "人工标注", action: "ERROR_CIRCLE" as WorkspaceAnnotationAction },
          { icon: SquareCheckBig, label: "勾正确", action: "CORRECT_MARK" as WorkspaceAnnotationAction },
          { icon: Highlighter, label: "高亮重点", action: "HIGHLIGHT" as WorkspaceAnnotationAction },
          { icon: EyeOff, label: "全部隐藏", action: "HIDE_ALL" as WorkspaceAnnotationAction },
        ].map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => onToolbarAction(action)}
            disabled={isMutating || !selectedImage}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
        {selectedImage ? (
          <Link
            href={selectedImage.imageUrl}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Maximize2 className="size-4" />
            查看大图
          </Link>
        ) : null}
      </div>

      {selectedImage ? (
        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[32px] border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedImage.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">左侧保留原图视图，右侧完成逐题复核与反馈编辑。</p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {selectedImage.totalQuestions} 题
              </Badge>
            </div>

            <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImage.imageUrl} alt={selectedImage.title} className="h-full w-full object-contain" />
              {selectedImage.annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`absolute rounded-2xl border-2 px-3 py-2 text-xs font-medium ${getAnnotationClass(annotation.color)}`}
                  style={{
                    left: `${annotation.x}%`,
                    top: `${annotation.y}%`,
                    width: `${annotation.width}%`,
                    minHeight: `${annotation.height}%`,
                  }}
                >
                  {annotation.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[28px] border border-border/70 bg-secondary/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="size-4 text-primary" />
                多图切换
              </div>
              <div className="mt-4 space-y-2">
                {images.map((image) =>
                  renderImageList(image, image.id === selectedImage.id, () => onChangeImage(image.id)),
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-border/70 bg-secondary/20 p-4">
              <div className="text-sm font-medium">当前图片统计</div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">题目总数</dt>
                  <dd className="font-semibold">{selectedImage.totalQuestions}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">正确</dt>
                  <dd className="font-semibold text-emerald-600">{selectedImage.correctQuestions}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">错误</dt>
                  <dd className="font-semibold text-rose-600">{selectedImage.wrongQuestions}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-secondary/30 text-sm text-muted-foreground">
          当前学员暂无作业图片，请先提醒家长提交。
        </div>
      )}
    </section>
  );
}
