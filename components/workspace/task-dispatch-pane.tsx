"use client";

interface TaskDispatchPaneProps {
  title?: string;
  isMutating?: boolean;
}

export function TaskDispatchPane({
  title = "任务分发区",
  isMutating = false,
}: TaskDispatchPaneProps) {
  return (
    <section className="workspace-card flex flex-col justify-between p-4">
      <div>
        <div>
          <p className="workspace-panel-title">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            当前新版工作台将反馈与状态控制整合到右侧主区域，这里保留兼容占位。
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-[28px] border border-dashed border-border/70 bg-secondary/30 p-5 text-sm text-muted-foreground">
        {isMutating ? "处理中..." : "如需恢复练习推荐池、发送任务卡片等能力，可在此组件继续扩展。"}
      </div>
    </section>
  );
}
