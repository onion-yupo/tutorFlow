import Link from "next/link";
import { Download, FileText, Film, Music4, Sparkles, Wand2 } from "lucide-react";

import { queueReportJob, updateReportArtifactSettings } from "@/app/actions/reports";
import { Badge } from "@/components/ui/badge";
import { getReportsPageData } from "@/lib/queries/reports";

interface ReportsPageProps {
  searchParams?: Promise<{
    studentId?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getReportsPageData(params.studentId);

  return (
    <section className="space-y-6">
      <article className="workspace-card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">学情分析与报告</p>
            <h1 className="mt-1 text-2xl font-semibold">阶段性成果外化与批量导出</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              聚合作业打卡、错题分布和成长节点，快速生成 PDF 周报与 AI 成长视频。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              已选 {data.students.length} 名学员
            </Badge>
            <Badge className="rounded-full px-3 py-1">
              当前以站内任务流管理导出
            </Badge>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <article className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">学员列表</p>
          <h2 className="mt-1 text-xl font-semibold">批量生成对象</h2>
          <div className="mt-6 space-y-3">
            {data.students.map((student) => (
              <Link
                key={student.id}
                href={`/reports?studentId=${student.id}`}
                className="block rounded-3xl border border-border/70 bg-white/70 p-4 transition hover:bg-secondary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{student.phone}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs">{student.statusLabel}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          {data.selectedStudent && data.videoArtifact && data.pdfArtifact ? (
            <>
          <article className="workspace-card p-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="size-4 text-primary" />
                  AI 成长视频预览
                </div>
                <h2 className="mt-1 text-xl font-semibold">{data.videoArtifact.title}</h2>
                <div className="mt-5 aspect-video rounded-[32px] border border-border/70 bg-gradient-to-br from-primary/10 via-white to-secondary/80 p-6">
                  <div className="flex h-full items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">视频亮点</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.videoArtifact.highlights.map((tag) => (
                          <Badge key={tag} variant="outline" className="rounded-full bg-white/80">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <a
                      href={data.videoArtifact.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      预览播放
                    </a>
                  </div>
                </div>
              </div>

              <form action={updateReportArtifactSettings} className="rounded-[32px] border border-border/70 bg-secondary/40 p-5">
                <input type="hidden" name="artifactId" value={data.videoArtifact.id} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-primary" />
                  字幕编辑
                </div>
                <textarea
                  name="subtitleText"
                  defaultValue={data.videoArtifact.subtitleText}
                  className="mt-4 min-h-32 w-full rounded-2xl border border-border/70 bg-white px-3 py-3 text-sm leading-7 text-muted-foreground"
                />
                <input
                  type="text"
                  name="musicName"
                  defaultValue={data.videoArtifact.musicName}
                  className="mt-4 h-10 w-full rounded-2xl border border-border/70 bg-white px-3 text-sm"
                />
                <div className="mt-5 grid gap-3">
                  <button className="rounded-2xl bg-white/80 px-4 py-3 text-left text-sm">
                    <Music4 className="mr-2 inline size-4 text-primary" />
                    更换背景音乐
                  </button>
                  <button className="rounded-2xl bg-white/80 px-4 py-3 text-left text-sm">
                    <Wand2 className="mr-2 inline size-4 text-primary" />
                    修改花字与节奏
                  </button>
                </div>
              </form>
            </div>
          </article>

          <article className="workspace-card p-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4 text-primary" />
                  报告预览
                </div>
                <h2 className="mt-1 text-xl font-semibold">{data.pdfArtifact.title}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {data.pdfArtifact.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-3xl border border-border/70 bg-white/70 p-4">
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[32px] border border-border/70 bg-secondary/40 p-6">
                  <p className="text-sm text-muted-foreground">错题分布</p>
                  <div className="mt-4 flex items-end gap-3">
                    {data.pdfArtifact.wrongQuestionStats.map((height, index) => (
                      <div key={height} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-2xl bg-primary/75"
                          style={{ height: `${height * 2}px` }}
                        />
                        <span className="text-xs text-muted-foreground">题型 {index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-border/70 bg-white/80 p-5">
                <p className="text-sm text-muted-foreground">批量导出中心</p>
                <h3 className="mt-1 text-lg font-semibold">一键生成交付物</h3>
                <div className="mt-5 grid gap-3">
                  {[
                    {
                      label: "批量生成 PDF 报告",
                      type: "GENERATE_PDF",
                      artifactId: data.pdfArtifact.id,
                    },
                    {
                      label: "批量生成成长视频",
                      type: "GENERATE_VIDEO",
                      artifactId: data.videoArtifact.id,
                    },
                    {
                      label: "导出全部下载链接",
                      type: "EXPORT_ALL",
                      artifactId: data.pdfArtifact.id,
                    },
                  ].map((action) => (
                    <form key={action.label} action={queueReportJob}>
                      <input
                        type="hidden"
                        name="studentIds"
                        value={data.students.map((student) => student.id).join(",")}
                      />
                      <input type="hidden" name="tutorId" value="tutor-li" />
                      <input type="hidden" name="type" value={action.type} />
                      <input type="hidden" name="artifactId" value={action.artifactId} />
                      <input type="hidden" name="title" value={action.label} />
                      <button className="w-full rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 text-left text-sm font-medium">
                      <Download className="mr-2 inline size-4 text-primary" />
                      {action.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          </article>
            </>
          ) : (
            <article className="workspace-card p-6 text-sm text-muted-foreground">
              当前暂无学情报告数据。
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
