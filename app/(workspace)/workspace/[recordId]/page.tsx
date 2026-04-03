import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getWorkspaceData } from "@/lib/queries/workspace";

interface WorkspacePageProps {
  params: Promise<{
    recordId: string;
  }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { recordId } = await params;
  const workspace = await getWorkspaceData(recordId);
  const workspaceVersion = JSON.stringify({
    reviewStatus: workspace.record.reviewStatus,
    feedbackStatus: workspace.record.feedbackStatus,
    stats: workspace.stats.map((item) => item.value),
    feedback: workspace.feedbackPane.sections.map((section) => section.content),
    questions: workspace.reviewPane.questions.map((question) => ({
      assetId: question.assetId,
      id: question.id,
      verdict: question.verdict,
      checkedByTutor: question.checkedByTutor,
    })),
  });

  return (
    <div className="min-h-screen px-4 py-5 xl:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/85 px-4 py-2 text-sm font-medium transition hover:bg-secondary/80"
            >
              <ArrowLeft className="size-4" />
              返回列表
            </Link>
            <Badge variant="outline" className="rounded-full px-3 py-1.5">
              训练营工作台
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            记录 ID：<span className="font-medium text-foreground">{recordId}</span>
          </p>
        </header>

        <WorkspaceShell key={workspaceVersion} workspace={workspace} />
      </div>
    </div>
  );
}
