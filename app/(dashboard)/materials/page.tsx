import Link from "next/link";
import { FolderKanban, Gamepad2, Link2, UploadCloud } from "lucide-react";

import { saveMaterialDistribution, updateMaterialStatus } from "@/app/actions/materials";
import { Badge } from "@/components/ui/badge";
import { getMaterialsPageData } from "@/lib/queries/materials";

interface MaterialsPageProps {
  searchParams?: Promise<{
    materialId?: string;
  }>;
}

export default async function MaterialsPage({ searchParams }: MaterialsPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getMaterialsPageData(params.materialId);

  return (
    <section className="space-y-6">
      <article className="workspace-card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">素材与任务中心</p>
            <h1 className="mt-1 text-2xl font-semibold">教学资产管理与 H5 分发配置</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              统一维护 21 天标准化课库、H5 互动素材和家长侧任务分发文案。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <FolderKanban className="mr-1 size-4" />
              课库 {data.summary.courseCount} 天
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Gamepad2 className="mr-1 size-4" />
              H5 素材 {data.summary.h5Count} 个
            </Badge>
            <Badge className="rounded-full px-3 py-1">
              <UploadCloud className="mr-1 size-4" />
              今日待发布 {data.summary.pendingPublishCount} 项
            </Badge>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <article className="workspace-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">21 天标准化课库</p>
              <h2 className="mt-1 text-xl font-semibold">按天管理纸质作业与标准答案</h2>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              3 月计算营
            </Badge>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-border/70">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-secondary/80 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">天次</th>
                  <th className="px-4 py-3 font-medium">主题</th>
                  <th className="px-4 py-3 font-medium">作业</th>
                  <th className="px-4 py-3 font-medium">答案</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.courseLibrary.map((material) => (
                  <tr key={material.id} className="border-t border-border/70 bg-white/70">
                    <td className="px-4 py-4 font-medium">{material.dayLabel}</td>
                    <td className="px-4 py-4">{material.title}</td>
                    <td className="px-4 py-4">{material.homeworkStatus}</td>
                    <td className="px-4 py-4">{material.answerStatus}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/materials?materialId=${material.id}`}
                          className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary"
                        >
                          预览
                        </Link>
                        <form action={updateMaterialStatus}>
                          <input type="hidden" name="materialId" value={material.id} />
                          <button
                            type="submit"
                            name="status"
                            value={material.homeworkStatus === "已发布" ? "UPLOADED" : "PUBLISHED"}
                            className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium"
                          >
                            {material.homeworkStatus === "已发布" ? "编辑" : "上传"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="workspace-card p-6">
          <p className="text-sm text-muted-foreground">H5 交互素材库</p>
          <h2 className="mt-1 text-xl font-semibold">预览、导入与外链管理</h2>

          <div className="mt-6 grid gap-3">
            {data.h5Assets.map((material) => (
              <Link
                key={material.id}
                href={`/materials?materialId=${material.id}`}
                className="rounded-3xl border border-border/70 bg-secondary/50 p-4 transition hover:bg-secondary/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{material.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {material.statusLabel} · {material.usageText}
                    </p>
                  </div>
                  <Gamepad2 className="size-4 text-primary" />
                </div>
              </Link>
            ))}
          </div>

          <form action={saveMaterialDistribution} className="mt-6 rounded-3xl border border-dashed border-border/70 bg-white/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="size-4 text-primary" />
              H5 外部链接
            </div>
            <input type="hidden" name="materialId" value={data.selectedMaterial?.id ?? ""} />
            <input
              type="hidden"
              name="title"
              value={data.selectedMaterial?.title ?? ""}
            />
            <input
              type="hidden"
              name="guidanceText"
              value={data.selectedMaterial?.guidanceText ?? ""}
            />
            {data.selectedMaterial?.trackDuration ? (
              <input type="hidden" name="trackDuration" value="on" />
            ) : null}
            {data.selectedMaterial?.trackScore ? (
              <input type="hidden" name="trackScore" value="on" />
            ) : null}
            {data.selectedMaterial?.trackMistakes ? (
              <input type="hidden" name="trackMistakes" value="on" />
            ) : null}
            <input
              type="text"
              name="externalUrl"
              defaultValue={data.selectedMaterial?.externalUrl ?? ""}
              placeholder="粘贴 H5 外部链接"
              className="mt-3 h-10 w-full rounded-2xl border border-border/70 bg-white px-3 text-sm"
            />
            <button className="mt-3 rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary">
              保存链接
            </button>
          </form>
        </article>
      </div>

      <article className="workspace-card p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          {data.selectedMaterial ? (
            <>
          <form action={saveMaterialDistribution}>
            <input type="hidden" name="materialId" value={data.selectedMaterial.id} />
            <input type="hidden" name="title" value={data.selectedMaterial.title} />
            <input
              type="hidden"
              name="externalUrl"
              value={data.selectedMaterial.externalUrl}
            />
            <p className="text-sm text-muted-foreground">任务分发配置</p>
            <h2 className="mt-1 text-xl font-semibold">{data.selectedMaterial.title}</h2>

            <div className="mt-5 rounded-3xl border border-border/70 bg-secondary/40 p-5">
              <p className="text-sm font-medium">家长侧引导语</p>
              <textarea
                name="guidanceText"
                defaultValue={data.selectedMaterial.guidanceText}
                className="mt-3 min-h-32 w-full rounded-2xl border border-border/70 bg-white px-3 py-3 text-sm leading-7 text-muted-foreground"
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  name="trackDuration"
                  defaultChecked={data.selectedMaterial.trackDuration}
                  className="mr-2"
                />
                记录完成时长
              </label>
              <label className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  name="trackScore"
                  defaultChecked={data.selectedMaterial.trackScore}
                  className="mr-2"
                />
                记录得分
              </label>
              <label className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  name="trackMistakes"
                  defaultChecked={data.selectedMaterial.trackMistakes}
                  className="mr-2"
                />
                记录错题明细
              </label>
            </div>
            <button className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              保存并分发
            </button>
          </form>

          <div className="rounded-[32px] border border-border/70 bg-white/80 p-5">
            <p className="text-sm text-muted-foreground">H5 预览</p>
            <h3 className="mt-1 text-lg font-semibold">{data.selectedMaterial.title}</h3>
            <div className="mt-5 rounded-[28px] bg-secondary/70 p-5">
              <p className="text-sm font-medium">{data.selectedMaterial.previewQuestion}</p>
              <div className="mt-4 grid gap-2">
                {data.selectedMaterial.previewOptions.map((choice) => (
                  <div
                    key={choice}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      choice === data.selectedMaterial!.previewAnswer
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700"
                        : "border-border/70 bg-white/80"
                    }`}
                  >
                    {choice}
                  </div>
                ))}
              </div>
            </div>
          </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground xl:col-span-2">
              当前暂无素材数据。
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
