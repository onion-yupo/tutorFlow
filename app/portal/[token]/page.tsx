import Link from "next/link";

import { bindPortalStudent, submitPortalHomework } from "@/app/actions/portal";
import { getPortalPageData } from "@/lib/queries/portal";

interface PortalPageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    day?: string;
    error?: string;
    success?: string;
  }>;
}

export default async function PortalPage({ params, searchParams }: PortalPageProps) {
  const { token } = await params;
  const query = (await searchParams) ?? {};
  const data = await getPortalPageData(token, query.day);
  const errorMessage =
    query.error === "bind_failed"
      ? "绑定失败，请确认学生姓名与家长手机号后四位是否正确。"
      : query.error === "empty_submission"
        ? "请先选择至少一张作业图片再提交。"
        : query.error === "invalid_day"
          ? "当前只能提交今天或过去已开放的作业，不能提前提交未来天数。"
          : query.error === "enrollment_missing"
            ? "未找到当前学生的班级归属，请联系老师处理。"
            : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">
            {data.portal.campLabel} / {data.portal.className}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{data.portal.title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.portal.description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-sm text-muted-foreground">训练营进度</p>
              <p className="mt-2 font-semibold">
                第 {data.portal.currentDayNumber} / {data.portal.campDays} 天
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-sm text-muted-foreground">学科</p>
              <p className="mt-2 font-semibold">{data.portal.subjectName}</p>
            </div>
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-sm text-muted-foreground">年级</p>
              <p className="mt-2 font-semibold">{data.portal.gradeLevel}</p>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {query.success === "submitted" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            作业已提交成功，后续 21 天再次打开将自动识别你的身份。
          </div>
        ) : null}

        {query.success === "appended" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            新图片已补充上传成功，原来的作业图片会保留，不会被覆盖。
          </div>
        ) : null}

        {data.activeStudent ? (
          <>
            <section className="workspace-card p-6">
              <div>
                <p className="text-sm text-muted-foreground">已自动登录</p>
                <h2 className="mt-1 text-2xl font-semibold">{data.activeStudent.displayName}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  手机尾号 {data.activeStudent.phoneLast4}，本次免登录有效至{" "}
                  {new Intl.DateTimeFormat("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(data.activeStudent.expiresAt)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  已累计提交 {data.activeStudent.submittedDays} 天，可补交今天及之前未完成的作业。
                </p>
              </div>
            </section>

            <section className="workspace-card p-6">
              <p className="text-sm text-muted-foreground">固定提交入口</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {data.selectedHomework?.title ?? `${data.portal.selectedDayLabel} 作业提交`}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                默认进入今天的作业，也可以补交过去天数；同一天再次上传时，系统会追加图片，不覆盖原内容。
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.portal.dayOptions.map((item) => (
                  <Link
                    key={item.dayLabel}
                    href={`/portal/${token}?day=${encodeURIComponent(item.dayLabel)}`}
                    className={`rounded-3xl border px-4 py-4 text-left transition ${
                      item.isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-white hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {item.dayLabel}
                        {item.isToday ? " · 今天" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.submitLabel}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.statusLabel}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.imageCount > 0 ? `已传 ${item.imageCount} 张 · ${item.submittedAtLabel}` : "尚未提交"}
                    </p>
                  </Link>
                ))}
              </div>

              <form action={submitPortalHomework} className="mt-5 space-y-4">
                <input type="hidden" name="portalToken" value={token} />
                <input type="hidden" name="dayLabel" value={data.portal.selectedDayLabel} />
                <div className="rounded-3xl border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                  当前将提交到 <span className="font-medium text-foreground">{data.portal.selectedDayLabel}</span>
                  {data.portal.selectedDayLabel === data.portal.currentDayLabel ? "（今日作业）" : "（补交作业）"}
                  。
                  {data.selectedHomework ? " 再次上传会追加到现有记录。" : " 本次会为该天创建一条新的作业记录。"}
                </div>
                <div className="rounded-3xl border border-dashed border-border/70 bg-secondary/20 p-5">
                  <label className="block text-sm font-medium">上传作业图片</label>
                  <input
                    type="file"
                    name="images"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="mt-3 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-primary-foreground"
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    支持 JPG、PNG、WEBP、GIF，单张不超过 10MB。
                  </p>
                </div>
                <button className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                  {data.portal.selectedDayLabel === data.portal.currentDayLabel
                    ? "提交今天的作业"
                    : `补交 ${data.portal.selectedDayLabel}`}
                </button>
              </form>

              {data.selectedHomework ? (
                <>
                  <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
                    当前状态：{data.selectedHomework.statusLabel}，已上传 {data.selectedHomework.imageUrls.length} 张图片
                  </div>
                  {data.selectedHomework.imageUrls.length > 0 ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {data.selectedHomework.imageUrls.map((imageUrl, index) => (
                        <div
                          key={imageUrl}
                          className="overflow-hidden rounded-3xl border border-border/70 bg-white"
                        >
                          <div className="relative aspect-[4/5]">
                            {/* Portal 预览可能混合本地上传和历史外链，直接渲染可避免域名白名单导致整页报错。 */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={`已上传作业图片 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            作业图片 {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>
          </>
        ) : (
          <section className="workspace-card p-6">
            <p className="text-sm text-muted-foreground">首次进入请绑定身份</p>
            <h2 className="mt-1 text-2xl font-semibold">选择学生并校验手机号后四位</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              完成一次绑定后，之后 21 天在同一设备内再次打开将自动登录，无需重复操作。
            </p>

            <form action={bindPortalStudent} className="mt-6 space-y-4">
              <input type="hidden" name="portalToken" value={token} />
              <div>
                <label className="mb-2 block text-sm font-medium">学生姓名</label>
                <select
                  name="studentId"
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-3 text-sm"
                  defaultValue={data.portal.students[0]?.studentId}
                >
                  {data.portal.students.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">家长手机号后四位</label>
                <input
                  name="phoneLast4"
                  maxLength={4}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-3 text-sm"
                  placeholder="例如 1234"
                />
              </div>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                绑定并进入作业提交
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
