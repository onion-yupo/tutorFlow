import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { switchViewer } from "@/app/actions/viewer";
import { getSidebarSummary } from "@/lib/queries/dashboard";
import { getViewerContext } from "@/lib/viewer";

const navigation = [
  { href: "/dashboard", label: "作战指挥中心", icon: LayoutDashboard },
  { href: "/students", label: "学员管理", icon: GraduationCap },
  { href: "/tutors", label: "辅导老师", icon: Sparkles },
  { href: "/homework", label: "作业汇总", icon: BookOpenCheck },
  { href: "/materials", label: "素材中心", icon: FolderKanban },
  { href: "/reports", label: "学情报告", icon: LineChart },
  { href: "/management", label: "管理仪表盘", icon: ShieldCheck },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarSummary, viewer] = await Promise.all([getSidebarSummary(), getViewerContext()]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 xl:px-6">
        <aside className="workspace-card hidden w-72 shrink-0 flex-col justify-between p-5 lg:flex">
          <div className="space-y-6">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                TutorFlow
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">AI 辅导工作台</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  当前身份：{viewer.name} · {viewer.isAdmin ? "管理员视角" : "辅导老师视角"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-white/80 p-4">
              <p className="text-xs font-medium text-muted-foreground">开发态视角切换</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {viewer.availableViewers.map((item) => (
                  <form key={item.userId} action={switchViewer}>
                    <input type="hidden" name="viewerId" value={item.userId} />
                    <input type="hidden" name="returnTo" value="/dashboard" />
                    <button
                      className={`rounded-full px-3 py-1 text-xs ${
                        viewer.userId === item.userId
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/70 bg-secondary/60 text-foreground"
                      }`}
                    >
                      {item.name}
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <nav className="space-y-2">
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="rounded-3xl border border-border/70 bg-secondary/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4 text-primary" />
              今日进度概览
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">待批改作业</dt>
                <dd className="font-semibold">{sidebarSummary.pendingHomeworkCount} 份</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">待联系家长</dt>
                <dd className="font-semibold">{sidebarSummary.pendingContactCount} 位</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">平均批改时效</dt>
                <dd className="font-semibold">{sidebarSummary.avgReviewMinutes} 分钟</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col gap-4">
          <header className="workspace-card flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-muted-foreground">
                TutorFlow / {viewer.isAdmin ? "管理员后台" : "老师后台"}
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                {viewer.isAdmin ? "全局教学交付总览" : "我的班级教学总览"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/reports"
                className="rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm font-medium transition hover:bg-secondary/80"
              >
                查看学情报告
              </Link>
              <Link
                href={sidebarSummary.defaultWorkspaceHref}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                进入 AI Workspace
              </Link>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
