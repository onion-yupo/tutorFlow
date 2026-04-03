import { db } from "@/lib/db";
import { minutesBetween } from "@/lib/domain";
import { buildDeliveryTaskScopeWhere, buildHomeworkScopeWhere } from "@/lib/viewer-scope";
import { getViewerContext } from "@/lib/viewer";

export async function getManagementPageData() {
  const viewer = await getViewerContext();
  const homeworkScope = buildHomeworkScopeWhere(viewer);
  const taskScope = buildDeliveryTaskScopeWhere(viewer);

  const [tutors, homeworkRecords, deliveryTasks, annotations] = await Promise.all([
    db.tutorProfile.findMany({
      where: viewer.isAdmin
        ? undefined
        : viewer.tutorProfileId
          ? { id: viewer.tutorProfileId }
          : undefined,
      include: {
        reviewedHomework: true,
      },
    }),
    db.homeworkRecord.findMany({
      where: homeworkScope,
      include: {
        tutor: true,
      },
    }),
    db.deliveryTask.findMany({
      where: taskScope,
    }),
    db.homeworkAnnotation.findMany({
      where: viewer.isAdmin
        ? undefined
        : {
            homeworkRecord: {
              is: homeworkScope,
            },
          },
    }),
  ]);

  const submittedRecords = homeworkRecords.filter((record) => record.submittedAt);
  const reviewedRecords = homeworkRecords.filter((record) => record.reviewedAt);
  const avgReviewMinutes =
    reviewedRecords.length > 0
      ? Math.round(
          reviewedRecords.reduce((sum, record) => {
            return sum + (minutesBetween(record.submittedAt, record.reviewedAt) ?? 0);
          }, 0) / reviewedRecords.length,
        )
      : 0;
  const deliveredTasks = deliveryTasks.filter((task) => task.type === "FEEDBACK_SENT");
  const replyRate =
    submittedRecords.length > 0 ? Math.round((deliveredTasks.length / submittedRecords.length) * 100) : 0;

  const topTutors = tutors
    .map((tutor) => {
      const reviewDurations = tutor.reviewedHomework
        .map((record) => minutesBetween(record.submittedAt, record.reviewedAt))
        .filter((value): value is number => value !== null);
      const avgMinutes =
        reviewDurations.length > 0
          ? Math.round(reviewDurations.reduce((sum, value) => sum + value, 0) / reviewDurations.length)
          : 0;
      const deliveredCount = tutor.reviewedHomework.filter((record) => record.status === "DELIVERED").length;
      const recoveryRate =
        tutor.reviewedHomework.length > 0
          ? Math.round((deliveredCount / tutor.reviewedHomework.length) * 100)
          : 0;

      return {
        id: tutor.id,
        name: tutor.displayName,
        desc: `批改时效 ${avgMinutes} 分钟 · 回收率 ${recoveryRate}%`,
        tag: avgMinutes <= 6 ? "优秀" : avgMinutes <= 9 ? "良好" : "待提升",
        score: avgMinutes,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const wrongQuestionMap = new Map<string, number>();
  for (const annotation of annotations) {
    const key = annotation.label ?? `题号 ${annotation.questionNumber ?? "未标注"}`;
    wrongQuestionMap.set(key, (wrongQuestionMap.get(key) ?? 0) + 1);
  }
  const wrongQuestions = [...wrongQuestionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({
      title,
      desc: `${count} 次命中 · 基于批改痕迹自动汇总`,
    }));

  const topInsight = wrongQuestions[0]?.title ?? "暂无高频错题";

  return {
    metrics: [
      { label: "在职老师数", value: `${tutors.length}`, hint: "本月新增 2 人" },
      {
        label: "平均作业回收率",
        value: `${submittedRecords.length > 0 ? Math.round((submittedRecords.length / homeworkRecords.length) * 100) : 0}%`,
        hint: "基于当前作业记录统计",
      },
      { label: "平均批改时效", value: `${avgReviewMinutes} 分钟`, hint: "按已复核作业计算" },
      { label: "家长回复率", value: `${replyRate}%`, hint: "以反馈发送任务近似" },
    ],
    topTutors,
    wrongQuestions,
    insights: [
      {
        title: "课程内容调整",
        desc: `建议围绕“${topInsight}”增加专题练习，并在下一期营课中前置概念讲解。`,
      },
      {
        title: "重点关注",
        desc: "当前待提交和待复核作业仍较集中，建议优先处理掉队学员和 Day5 作业反馈。",
      },
      {
        title: "优秀实践",
        desc: topTutors[0]
          ? `${topTutors[0].name} 当前批改时效最佳，可沉淀为标准化教学交付模板。`
          : "待老师数据积累后生成优秀实践。",
      },
    ],
  };
}
