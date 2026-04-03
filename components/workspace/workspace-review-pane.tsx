"use client";

import { Bot, CheckCheck, CircleAlert, CircleCheckBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceQuestionItem, WorkspaceReviewStatus } from "@/lib/types/workspace";

interface WorkspaceReviewPaneProps {
  adapterLabel: string;
  adapterStatus: string;
  reviewStatus: WorkspaceReviewStatus;
  questions: WorkspaceQuestionItem[];
  onToggleReviewStatus: () => void;
  onRetryGrading: () => void;
  onQuestionVerdictChange: (
    payload: Pick<WorkspaceQuestionItem, "id" | "assetId" | "questionNumber"> & {
      verdict: WorkspaceQuestionItem["verdict"];
    },
  ) => void;
  isMutating?: boolean;
}

export function WorkspaceReviewPane({
  adapterLabel,
  adapterStatus,
  reviewStatus,
  questions,
  onToggleReviewStatus,
  onRetryGrading,
  onQuestionVerdictChange,
  isMutating = false,
}: WorkspaceReviewPaneProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[28px] border border-border/70 bg-secondary/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">批改复核</p>
            <p className="mt-1 text-sm text-muted-foreground">
              当前由 {adapterLabel} 输出初版结果，老师可逐题复核并修正最终判定。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Bot className="mr-1 size-3.5" />
              {adapterStatus}
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={onRetryGrading} disabled={isMutating}>
              重新批改
            </Button>
            <Button
              type="button"
              variant={reviewStatus === "已核对" ? "default" : "outline"}
              size="sm"
              onClick={onToggleReviewStatus}
              disabled={isMutating}
            >
              <CheckCheck className="size-4" />
              {reviewStatus}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <article key={`${question.assetId}-${question.id}`} className="rounded-[28px] border border-border/70 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {index + 1}. {question.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">学生答案：{question.studentAnswer}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={question.verdict === "CORRECT" ? "default" : "outline"}
                  onClick={() =>
                    onQuestionVerdictChange({
                      id: question.id,
                      assetId: question.assetId,
                      questionNumber: question.questionNumber,
                      verdict: "CORRECT",
                    })
                  }
                  disabled={isMutating}
                >
                  <CircleCheckBig className="size-4" />
                  正确
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={question.verdict === "WRONG" ? "default" : "outline"}
                  onClick={() =>
                    onQuestionVerdictChange({
                      id: question.id,
                      assetId: question.assetId,
                      questionNumber: question.questionNumber,
                      verdict: "WRONG",
                    })
                  }
                  disabled={isMutating}
                >
                  <CircleAlert className="size-4" />
                  错误
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-secondary/30 px-4 py-3 text-sm leading-7 text-foreground/85">
              {question.analysis}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>题号：{question.questionNumber}</span>
              <span>{question.checkedByTutor ? "老师已复核" : "沿用模型判定"}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
