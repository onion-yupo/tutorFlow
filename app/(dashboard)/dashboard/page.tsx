import Link from "next/link";
import { Clock3, FileCheck2, MessageSquareText, PhoneCall, RotateCcw, Users2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/queries/dashboard";

const overviewIcons = [FileCheck2, Clock3, MessageSquareText, RotateCcw];

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.overviewCards.map(({ label, value, hint }, index) => {
          const Icon = overviewIcons[index] ?? Zap;

          return (
          <article key={label} className="workspace-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
              </div>
              <div className="rounded-2xl bg-secondary p-3">
                <Icon className="size-5 text-primary" />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
          </article>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="workspace-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">服务进度看板</p>
              <h3 className="mt-1 text-xl font-semibold">{data.progress.campLabel}</h3>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {data.progress.subjectLabel} · {data.progress.semesterLabel}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.progress.items.map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-secondary/70 p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">实时预警区</p>
          <h3 className="mt-1 text-xl font-semibold">{data.alerts.length} 条紧急提醒</h3>
          <div className="mt-5 space-y-4">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.desc}</p>
                  </div>
                  <Link href={alert.href} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {alert.action}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">快捷入口</p>
          <h3 className="mt-1 text-xl font-semibold">高频操作一键直达</h3>
          <div className="mt-5 grid gap-3">
            {[
              {
                href: data.defaultWorkspaceHref,
                label: "进入批改工作台",
                desc: "打开四分屏 AI Workspace",
                icon: Zap,
              },
              {
                href: "/students",
                label: "线索分配池",
                desc: "查看待联系、待定级学员",
                icon: Users2,
              },
              {
                href: "/homework",
                label: "提醒未交作业",
                desc: "进入作业汇总中心批量催交",
                icon: PhoneCall,
              },
            ].map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="rounded-3xl border border-border/70 bg-secondary/40 p-4 transition hover:bg-secondary/70"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="workspace-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">最近任务</p>
              <h3 className="mt-1 text-xl font-semibold">今日教学交付流转</h3>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              实时同步
            </Badge>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-border/70">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/80 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">学员</th>
                  <th className="px-4 py-3 font-medium">任务</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTasks.map((task) => (
                  <tr key={task.id} className="border-t border-border/70 bg-white/70">
                    <td className="px-4 py-4 font-medium">{task.studentName}</td>
                    <td className="px-4 py-4">{task.task}</td>
                    <td className={`px-4 py-4 ${task.isFailed ? "text-rose-600" : ""}`}>{task.status}</td>
                    <td className="px-4 py-4 text-muted-foreground">{task.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
