import { BarChart3, BookOpenText, Clock3, MessageSquareMore, Trophy, Users } from "lucide-react";
import { getManagementPageData } from "@/lib/queries/management";

const metricIcons = [Users, BarChart3, Clock3, MessageSquareMore];

export default async function ManagementPage() {
  const data = await getManagementPageData();

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map(({ label, value, hint }, index) => {
          const Icon = metricIcons[index] ?? Users;

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

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="workspace-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="size-4 text-primary" />
            老师效能榜
          </div>
          <h2 className="mt-1 text-xl font-semibold">本周教学交付表现</h2>
          <div className="mt-6 space-y-3">
            {data.topTutors.map((tutor, index) => (
              <div key={tutor.id} className="flex items-center justify-between rounded-3xl border border-border/70 bg-white/70 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{tutor.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tutor.desc}</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {tutor.tag}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenText className="size-4 text-primary" />
            班级错题排行
          </div>
          <h2 className="mt-1 text-xl font-semibold">3 月计算营高频易错点</h2>
          <div className="mt-6 space-y-3">
            {data.wrongQuestions.map((item, index) => (
              <div key={item.title} className="rounded-3xl border border-border/70 bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="workspace-card p-6">
        <p className="text-sm text-muted-foreground">教研反馈</p>
        <h2 className="mt-1 text-xl font-semibold">基于错题数据的调整建议</h2>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {data.insights.map((insight) => (
            <div key={insight.title} className="rounded-[32px] border border-border/70 bg-secondary/40 p-5">
              <p className="text-base font-semibold">{insight.title}</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{insight.desc}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
