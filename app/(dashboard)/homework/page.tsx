import Link from "next/link";

import {
  generateSubmissionLink,
  remindHomeworkSubmission,
  retryHomeworkGrading,
  retryHomeworkFeedbackGeneration,
} from "@/app/actions/homework";
import { getHomeworkPageData } from "@/lib/queries/homework";

interface HomeworkPageProps {
  searchParams?: Promise<{
    recordId?: string;
  }>;
}

export default async function HomeworkPage({ searchParams }: HomeworkPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getHomeworkPageData(params.recordId);

  return (
    <section className="space-y-6">
      <article className="workspace-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">作业汇总中心</p>
          <h1 className="mt-1 text-2xl font-semibold">提交追踪、队列状态与重试入口</h1>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.stats.map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-secondary/80 p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="workspace-card p-6">
          <div className="overflow-hidden rounded-3xl border border-border/70">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/80 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">学员</th>
                  <th className="px-4 py-3 font-medium">作业</th>
                  <th className="px-4 py-3 font-medium">提交状态</th>
                  <th className="px-4 py-3 font-medium">队列状态</th>
                  <th className="px-4 py-3 font-medium">异常说明</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record) => (
                  <tr key={record.id} className="border-t border-border/70 bg-white/70">
                    <td className="px-4 py-4 font-medium">
                      {record.studentName}
                      <div className="mt-1 text-xs text-muted-foreground">{record.parentPhone}</div>
                    </td>
                    <td className="px-4 py-4">{record.title}</td>
                    <td className="px-4 py-4">
                      {record.submitStatus}
                      <div className="mt-1 text-xs text-muted-foreground">{record.submittedAt}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          record.queue.tone === "danger"
                            ? "bg-rose-50 text-rose-700"
                            : record.queue.tone === "warning"
                              ? "bg-amber-50 text-amber-700"
                              : record.queue.tone === "success"
                                ? "bg-emerald-50 text-emerald-700"
                                : record.queue.tone === "primary"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {record.queue.label}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">{record.reviewStatus}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {record.latestError ?? "--"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {record.submitStatus === "已提交" ? (
                          <Link
                            href={record.workspaceHref}
                            className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary"
                          >
                            去批改
                          </Link>
                        ) : (
                          <form action={remindHomeworkSubmission}>
                            <input type="hidden" name="homeworkRecordId" value={record.id} />
                            <button className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary">
                              提醒
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/homework?recordId=${record.id}`}
                          className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium"
                        >
                          查看
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="workspace-card p-6">
          {data.selectedRecord ? (
            <>
              <p className="text-sm text-muted-foreground">当前记录详情</p>
              <h2 className="mt-1 text-xl font-semibold">
                {data.selectedRecord.className} · {data.selectedRecord.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                当前聚焦单条作业记录，可直接处理提交入口、批改流转，以及批改/反馈重试。
              </p>

              <div className="mt-5 rounded-3xl border border-border/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">当前队列状态</p>
                    <p className="mt-2 text-lg font-semibold">{data.selectedRecord.queue.label}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      data.selectedRecord.queue.tone === "danger"
                        ? "bg-rose-50 text-rose-700"
                        : data.selectedRecord.queue.tone === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : data.selectedRecord.queue.tone === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : data.selectedRecord.queue.tone === "primary"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {data.selectedRecord.statusLabel}
                  </span>
                </div>
                {data.selectedRecord.latestFailedTask?.note ? (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    最近失败原因：{data.selectedRecord.latestFailedTask.note}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 rounded-3xl border border-border/70 bg-secondary/40 p-4">
                <p className="text-sm font-medium">班级提交链接</p>
                {data.selectedRecord.submissionLink ? (
                  <p className="mt-3 break-all text-sm text-muted-foreground">
                    {data.selectedRecord.submissionLink}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    当前班级还未初始化通用提交入口。
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!data.selectedRecord.portalReady ? (
                  <form action={generateSubmissionLink}>
                    <input type="hidden" name="homeworkRecordId" value={data.selectedRecord.id} />
                    <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      初始化班级入口
                    </button>
                  </form>
                ) : data.selectedRecord.submissionLink ? (
                  <Link
                    href={data.selectedRecord.submissionLink}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    打开提交页
                  </Link>
                ) : null}
                <form action={remindHomeworkSubmission}>
                  <input type="hidden" name="homeworkRecordId" value={data.selectedRecord.id} />
                  <button className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium">
                    提醒家长提交
                  </button>
                </form>
                {data.selectedRecord.canRetryGrading ? (
                  <form action={retryHomeworkGrading}>
                    <input type="hidden" name="homeworkRecordId" value={data.selectedRecord.id} />
                    <button className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium">
                      重新跑批改
                    </button>
                  </form>
                ) : null}
                {data.selectedRecord.canRetryFeedback ? (
                  <form action={retryHomeworkFeedbackGeneration}>
                    <input type="hidden" name="homeworkRecordId" value={data.selectedRecord.id} />
                    <button className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium">
                      重新生成反馈
                    </button>
                  </form>
                ) : null}
                <Link
                  href={data.selectedRecord.id ? `/workspace/${data.selectedRecord.id}` : "/workspace/hw-day5-wxm"}
                  className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-medium"
                >
                  进入批改
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              当前暂无作业数据。
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
