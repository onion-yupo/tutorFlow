import Link from "next/link";

import { updateStudentPlacement, updateStudentStatus } from "@/app/actions/students";
import { getStudentsPageData } from "@/lib/queries/students";

interface StudentsPageProps {
  searchParams?: Promise<{
    filter?: string;
    studentId?: string;
  }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getStudentsPageData(params.filter, params.studentId);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <article className="workspace-card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">学员管理与定级</p>
            <h1 className="mt-1 text-2xl font-semibold">线索流转与精准分班</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "全部状态"],
              ["lead", "未联系"],
              ["wechat", "已加企微"],
              ["assessing", "测评中"],
              ["placed", "已定级"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`/students?filter=${value}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  data.filter === value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/70 bg-white/80 text-muted-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border/70">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-secondary/80 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">学员</th>
                <th className="px-4 py-3 font-medium">渠道</th>
                <th className="px-4 py-3 font-medium">年级</th>
                <th className="px-4 py-3 font-medium">学习诉求</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.id} className="border-t border-border/70 bg-white/70">
                  <td className="px-4 py-4">
                    <div className="font-medium">{student.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {student.parentName} · {student.phoneTail}
                    </div>
                  </td>
                  <td className="px-4 py-4">{student.channel}</td>
                  <td className="px-4 py-4">{student.gradeLevel}</td>
                  <td className="px-4 py-4">{student.goal}</td>
                  <td className="px-4 py-4">{student.statusLabel}</td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/students?filter=${data.filter}&studentId=${student.id}`}
                      className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="workspace-card p-6">
        {data.selectedStudent ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">学员详情</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {data.selectedStudent.displayName}（{data.selectedStudent.parentName}）
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                手机：{data.selectedStudent.parentPhone} · 当前状态：{data.selectedStudent.statusLabel}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ["年级", data.selectedStudent.gradeLevel],
                ["教材版本", data.selectedStudent.textbookVersion],
                ["学习诉求", data.selectedStudent.goal],
                ["下单渠道", data.selectedStudent.channel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 font-medium">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-border/70 bg-white/70 p-5">
              <p className="text-sm text-muted-foreground">定级测试报告</p>
              <h3 className="mt-1 text-lg font-semibold">
                测试总分 {data.selectedStudent.placementScore} / 100
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                系统建议：{data.selectedStudent.suggestedPlacement}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                当前分班：{data.selectedStudent.finalPlacement}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <form action={updateStudentPlacement} className="rounded-3xl border border-border/70 bg-secondary/40 p-5">
                <input type="hidden" name="studentId" value={data.selectedStudent.id} />
                <input
                  type="hidden"
                  name="enrollmentId"
                  value={data.selectedStudent.enrollmentId ?? ""}
                />
                <input type="hidden" name="taskType" value="PLACEMENT_CONFIRMED" />
                <p className="text-sm font-medium">确认分班</p>
                <div className="mt-3 flex gap-3">
                  <select
                    name="placement"
                    defaultValue={data.selectedStudent.finalPlacement}
                    className="h-10 flex-1 rounded-2xl border border-border/70 bg-white px-3 text-sm"
                  >
                    {[
                      "三下补差班",
                      "四上补差班",
                      "四上巩固班",
                      "四上进阶班",
                    ].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    确认分班
                  </button>
                </div>
              </form>

              <form action={updateStudentStatus} className="rounded-3xl border border-border/70 bg-white/70 p-5">
                <input type="hidden" name="studentId" value={data.selectedStudent.id} />
                <p className="text-sm font-medium">手动调整状态</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["LEAD_NEW", "未联系"],
                    ["WECHAT_ADDED", "已加企微"],
                    ["ASSESSING", "测评中"],
                    ["PLACED", "已定级"],
                  ].map(([status, label]) => (
                    <button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1.5 text-sm"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
            当前暂无学员数据。
          </div>
        )}
      </article>
    </section>
  );
}
