"use client";

import { Bot, Copy, RefreshCw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkspaceFeedbackSection,
  WorkspaceFeedbackSectionId,
  WorkspaceFeedbackStatus,
} from "@/lib/types/workspace";

interface FeedbackEditorPaneProps {
  adapterLabel: string;
  adapterStatus: string;
  feedbackStatus: WorkspaceFeedbackStatus;
  regenerationHint: string;
  sections: WorkspaceFeedbackSection[];
  onSendFeedback: () => void;
  onToggleFeedbackStatus: () => void;
  onSectionChange: (sectionId: WorkspaceFeedbackSectionId, value: string) => void;
  onSectionSave: (sectionId: WorkspaceFeedbackSectionId) => void;
  onSectionRegenerate: (sectionId: WorkspaceFeedbackSectionId) => void;
  onSectionCopy: (sectionId: WorkspaceFeedbackSectionId) => void;
  isMutating?: boolean;
}

export function FeedbackEditorPane({
  adapterLabel,
  adapterStatus,
  feedbackStatus,
  regenerationHint,
  sections,
  onSendFeedback,
  onToggleFeedbackStatus,
  onSectionChange,
  onSectionSave,
  onSectionRegenerate,
  onSectionCopy,
  isMutating = false,
}: FeedbackEditorPaneProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-border/70 bg-secondary/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">反馈建议</p>
            <p className="mt-1 text-sm text-muted-foreground">{regenerationHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Bot className="mr-1 size-3.5" />
              {adapterLabel} · {adapterStatus}
            </Badge>
            <Button
              type="button"
              variant={feedbackStatus === "已反馈" ? "default" : "outline"}
              size="sm"
              onClick={onToggleFeedbackStatus}
              disabled={isMutating}
            >
              {feedbackStatus}
            </Button>
            <Button type="button" size="sm" onClick={onSendFeedback} disabled={isMutating}>
              发送反馈
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <article key={section.id} className="rounded-[28px] border border-border/70 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onSectionCopy(section.id)}>
                  <Copy className="size-4" />
                  复制
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onSectionRegenerate(section.id)}
                  disabled={isMutating}
                >
                  <RefreshCw className="size-4" />
                  重新生成
                </Button>
                <Button type="button" size="sm" onClick={() => onSectionSave(section.id)} disabled={isMutating}>
                  <Save className="size-4" />
                  保存
                </Button>
              </div>
            </div>

          <Textarea
            className="mt-4 min-h-[140px] rounded-[24px] bg-secondary/20"
            value={section.content}
            onChange={(event) => onSectionChange(section.id, event.target.value)}
          />
          </article>
        ))}
      </div>
    </div>
  );
}
