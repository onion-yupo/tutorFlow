"use client";

import { Badge } from "@/components/ui/badge";

export type WorkspaceFilter = "全部" | "已交" | "未交" | "全对" | "有错";

interface StudentListPaneProps {
  students: Array<{
    id: string;
    name: string;
  }>;
  activeStudentId: string;
  onSelect: (studentId: string) => void;
  filter: WorkspaceFilter;
  onFilterChange: (filter: WorkspaceFilter) => void;
}

export function StudentListPane({
  students,
  filter,
  onFilterChange,
}: StudentListPaneProps) {
  return (
    <section className="workspace-card flex min-h-0 flex-col p-4">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <p className="workspace-panel-title">学员快速切换</p>
          <p className="mt-1 text-sm text-muted-foreground">新版工作台默认以单条作业记录为核心，这里保留兼容占位。</p>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {students.length} 人
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["全部", "已交", "未交", "全对", "有错"] as WorkspaceFilter[]).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onFilterChange(label)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === label
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-secondary/70 text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-3xl border border-dashed border-border/70 bg-secondary/30 p-5 text-sm text-muted-foreground">
        当前记录制工作台不再展示整班学员列表；如后续需要批量模式，可在此处恢复班级切换能力。
      </div>
    </section>
  );
}
