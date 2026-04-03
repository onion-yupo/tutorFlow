"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCheck, ChevronRight, MessageSquareText } from "lucide-react";

import {
  addWorkspaceAnnotation,
  hideWorkspaceAnnotations, regenerateWorkspaceFeedbackSection, retryWorkspaceGrading, saveWorkspaceFeedbackSection, toggleWorkspaceFeedbackStatus,
  toggleWorkspaceReviewStatus, updateWorkspaceQuestionVerdict, sendWorkspaceFeedback,
} from "@/app/actions/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackEditorPane } from "@/components/workspace/feedback-editor-pane";
import {
  GradingCanvasPane,
  type WorkspaceAnnotationAction,
} from "@/components/workspace/grading-canvas-pane";
import { WorkspaceReviewPane } from "@/components/workspace/workspace-review-pane";
import type {
  WorkspaceData,
  WorkspaceFeedbackSection,
  WorkspaceFeedbackSectionId,
  WorkspacePaneMode,
} from "@/lib/types/workspace";

interface WorkspaceShellProps {
  workspace: WorkspaceData;
}

export function WorkspaceShell({ workspace }: WorkspaceShellProps) {
  const router = useRouter();
  const [activeImageId, setActiveImageId] = useState(workspace.imagePane.activeImageId);
  const [activeMode, setActiveMode] = useState<WorkspacePaneMode>("review");
  const [feedbackSections, setFeedbackSections] = useState<WorkspaceFeedbackSection[]>(workspace.feedbackPane.sections);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const runAction = (action: () => Promise<string | void>, successMessage: string) => {
    startTransition(async () => {
      const result = await action();
      setNotice(typeof result === "string" && result ? result : successMessage);
      router.refresh();
    });
  };

  const activeQuestions = useMemo(
    () => workspace.reviewPane.questions.filter((question) => question.assetId === activeImageId),
    [activeImageId, workspace.reviewPane.questions],
  );

  const handleToolbarAction = (action: WorkspaceAnnotationAction) => {
    if (!activeImageId) {
      return;
    }

    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      formData.set("assetId", activeImageId);

      if (action === "HIDE_ALL") {
        await hideWorkspaceAnnotations(formData);
        return;
      }

      formData.set("annotationType", action);
      await addWorkspaceAnnotation(formData);
    }, "批改痕迹已更新");
  };

  const handleToggleReviewStatus = () => {
    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      await toggleWorkspaceReviewStatus(formData);
    }, "批改复核状态已更新");
  };

  const handleToggleFeedbackStatus = () => {
    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      await toggleWorkspaceFeedbackStatus(formData);
    }, "反馈状态已更新");
  };

  const handleQuestionVerdictChange = (payload: {
    id: string;
    assetId: string;
    questionNumber: string;
    verdict: "CORRECT" | "WRONG";
  }) => {
    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      formData.set("assetId", payload.assetId);
      formData.set("questionId", payload.id);
      formData.set("questionNumber", payload.questionNumber);
      formData.set("verdict", payload.verdict);
      await updateWorkspaceQuestionVerdict(formData);
    }, "题目复核结果已更新");
  };

  const handleRetryGrading = () => {
    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      return await retryWorkspaceGrading(formData);
    }, "已重新调用腾讯批改模型");
  };

  const handleSectionChange = (sectionId: WorkspaceFeedbackSectionId, value: string) => {
    setFeedbackSections((previous) =>
      previous.map((section) => (section.id === sectionId ? { ...section, content: value } : section)),
    );
  };

  const handleSectionSave = (sectionId: WorkspaceFeedbackSectionId) => {
    const section = feedbackSections.find((item) => item.id === sectionId);
    if (!section) {
      return;
    }

    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      formData.set("sectionId", section.id);
      formData.set("content", section.content);
      await saveWorkspaceFeedbackSection(formData);
    }, `${section.title}已保存`);
  };

  const handleSectionRegenerate = (sectionId: WorkspaceFeedbackSectionId) => {
    runAction(async () => {
      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      formData.set("sectionId", sectionId);
      await regenerateWorkspaceFeedbackSection(formData);
    }, "该栏内容已重新生成");
  };

  const handleSendFeedback = () => {
    runAction(async () => {
      const getSection = (id: WorkspaceFeedbackSectionId) =>
        feedbackSections.find((section) => section.id === id)?.content ?? "";

      const formData = new FormData();
      formData.set("homeworkRecordId", workspace.recordId);
      formData.set("feedbackDraft", getSection("overallEvaluation"));
      formData.set("reviewNotes", getSection("errorAnalysis"));
      formData.set("parentMessageDraft", getSection("parentMessage"));
      formData.set("selectedPracticeIds", "");
      return await sendWorkspaceFeedback(formData);
    }, "反馈已发送");
  };

  const handleSectionCopy = async (sectionId: WorkspaceFeedbackSectionId) => {
    const section = feedbackSections.find((item) => item.id === sectionId);
    if (!section) {
      return;
    }

    await navigator.clipboard.writeText(section.content);
    setNotice(`${section.title}已复制`);
  };

  return (
    <div className="space-y-5">
      <section className="workspace-card px-6 py-5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">计算营 AI Copilot</p>
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                  可配置训练营
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {workspace.student.name} · {workspace.currentDayLabel}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {workspace.campLabel} · {workspace.semesterLabel} · {workspace.student.subjectLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1.5">
                <CheckCheck className="mr-1 size-4" />
                {workspace.record.reviewStatus}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1.5">
                <MessageSquareText className="mr-1 size-4" />
                {workspace.record.feedbackStatus}
              </Badge>
              <Badge className="rounded-full px-3 py-1.5">
                <Bot className="mr-1 size-4" />
                适配层已就绪
              </Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-secondary/20 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm font-medium text-muted-foreground">{workspace.student.name}</span>
              {workspace.timeline.map((day) =>
                day.href ? (
                  <Link
                    key={day.dayLabel}
                    href={day.href}
                    className={`inline-flex min-w-9 items-center justify-center rounded-xl px-3 py-2 text-sm transition ${
                      day.isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : day.hasRecord
                          ? "bg-white text-foreground hover:bg-white/80"
                          : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    {day.shortLabel}
                  </Link>
                ) : (
                  <span
                    key={day.dayLabel}
                    className={`inline-flex min-w-9 items-center justify-center rounded-xl px-3 py-2 text-sm ${
                      day.isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {day.shortLabel}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
      </section>

      <div className="workspace-review-layout gap-4">
        <GradingCanvasPane
          student={workspace.student}
          images={workspace.imagePane.images}
          activeImageId={activeImageId}
          onChangeImage={setActiveImageId}
          onToolbarAction={handleToolbarAction}
          isMutating={isPending}
        />

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workspace.stats.map((stat) => (
              <article key={stat.id} className="workspace-card p-4">
                <p
                  className={`text-3xl font-semibold ${
                    stat.accent === "success"
                      ? "text-emerald-600"
                      : stat.accent === "danger"
                        ? "text-rose-600"
                        : stat.accent === "info"
                          ? "text-slate-700"
                          : "text-foreground"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </article>
            ))}
          </div>

          <section className="workspace-card p-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_auto]">
              <Button
                type="button"
                variant={activeMode === "review" ? "default" : "outline"}
                className="justify-between rounded-2xl"
                onClick={() => setActiveMode("review")}
              >
                <span>批改复核</span>
                <span className="text-xs opacity-80">{workspace.record.reviewStatus}</span>
              </Button>
              <Button
                type="button"
                variant={activeMode === "feedback" ? "default" : "outline"}
                className="justify-between rounded-2xl"
                onClick={() => setActiveMode("feedback")}
              >
                <span>反馈建议</span>
                <span className="text-xs opacity-80">{workspace.record.feedbackStatus}</span>
              </Button>
              <div className="hidden items-center justify-end xl:flex">
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="mt-4">
              {activeMode === "review" ? (
                <WorkspaceReviewPane
                  adapterLabel={workspace.reviewPane.adapter.providerLabel}
                  adapterStatus={workspace.reviewPane.adapter.providerStatus}
                  reviewStatus={workspace.record.reviewStatus}
                  questions={activeQuestions}
                  onToggleReviewStatus={handleToggleReviewStatus}
                  onRetryGrading={handleRetryGrading}
                  onQuestionVerdictChange={handleQuestionVerdictChange}
                  isMutating={isPending}
                />
              ) : (
                <FeedbackEditorPane
                  adapterLabel={workspace.feedbackPane.adapter.providerLabel}
                  adapterStatus={workspace.feedbackPane.adapter.providerStatus}
                  feedbackStatus={workspace.record.feedbackStatus}
                  regenerationHint={workspace.feedbackPane.regenerationHint}
                  sections={feedbackSections}
                  onSendFeedback={handleSendFeedback}
                  onToggleFeedbackStatus={handleToggleFeedbackStatus}
                  onSectionChange={handleSectionChange}
                  onSectionSave={handleSectionSave}
                  onSectionRegenerate={handleSectionRegenerate}
                  onSectionCopy={(sectionId) => {
                    void handleSectionCopy(sectionId);
                  }}
                  isMutating={isPending}
                />
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
