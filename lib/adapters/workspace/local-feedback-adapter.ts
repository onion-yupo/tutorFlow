import {
  generateLocalFeedback,
  isLocalFeedbackModelEnabled,
  type LocalFeedbackGenerateInput,
  type LocalFeedbackQuestionInput,
} from "@/lib/clients/local-feedback-client";

export interface LocalFeedbackInput {
  record: {
    id?: string;
    dayLabel: string;
    score: number | null;
    accuracyRate: unknown;
    feedbackDraft: string | null;
    reviewNotes: string | null;
    parentMessageDraft: string | null;
    student: {
      displayName: string;
    };
  };
  reviewSummary: {
    wrongQuestions: number;
    correctQuestions: number;
    totalQuestions: number;
  };
  questions?: LocalFeedbackQuestionInput[];
}

export function buildFallbackSummary(input: LocalFeedbackInput) {
  const { record, reviewSummary } = input;
  return `${record.student.displayName}${record.dayLabel}作业共识别 ${reviewSummary.totalQuestions || reviewSummary.correctQuestions + reviewSummary.wrongQuestions} 题，当前正确 ${reviewSummary.correctQuestions} 题、错误 ${reviewSummary.wrongQuestions} 题，整体表现稳定。`;
}

export function buildFallbackAnalysis(input: LocalFeedbackInput) {
  const { record, reviewSummary } = input;
  return `${record.student.displayName}本次主要需要复核 ${reviewSummary.wrongQuestions} 道题，建议优先检查错题对应知识点，再结合老师批注进行针对性巩固。`;
}

export function buildFallbackParentMessage(input: LocalFeedbackInput) {
  const { record } = input;
  return `家长您好，${record.student.displayName}${record.dayLabel}作业的反馈已经整理完成。建议今晚先看老师标出的关键错误，再完成对应巩固练习，明天老师会继续跟进。`;
}

export function buildFallbackLocalFeedbackSections(input: LocalFeedbackInput) {
  return [
    {
      id: "overallEvaluation" as const,
      title: "一、整体评价",
      description: "用于总结作业完成质量与整体表现。",
      content: input.record.feedbackDraft ?? buildFallbackSummary(input),
    },
    {
      id: "errorAnalysis" as const,
      title: "二、作业分析",
      description: "用于说明主要问题、错因和下一步建议。",
      content: input.record.reviewNotes ?? buildFallbackAnalysis(input),
    },
    {
      id: "parentMessage" as const,
      title: "三、家长反馈话术",
      description: "用于企微或私聊发送给家长的反馈内容。",
      content: input.record.parentMessageDraft ?? buildFallbackParentMessage(input),
    },
  ];
}

export function buildLocalFeedbackSnapshot(input: LocalFeedbackInput) {
  const { record } = input;

  return {
    providerLabel: "本地反馈模型 API",
    providerStatus: isLocalFeedbackModelEnabled() ? "已配置正式接口" : "未配置真实接口，当前使用模板文案",
    sections: buildFallbackLocalFeedbackSections(input),
    regenerationHint: `当前得分 ${record.score ?? 0} 分，正确率 ${Math.round(Number(record.accuracyRate ?? 0))}% 。${
      isLocalFeedbackModelEnabled() ? "重新生成时会优先调用本地反馈模型。" : "如需真实生成，请配置 LOCAL_FEEDBACK_API_URL。"
    }`,
  };
}

export async function regenerateLocalFeedbackSnapshot(params: {
  input: LocalFeedbackInput;
  instruction?: string;
}) {
  const { input, instruction } = params;
  const fallbackSections = buildFallbackLocalFeedbackSections(input);

  if (!isLocalFeedbackModelEnabled()) {
    return {
      providerLabel: "本地反馈模型 API",
      providerStatus: "未配置真实接口，已回退模板文案",
      sections: fallbackSections,
      regenerationHint: "当前未配置本地反馈模型接口，本次使用了模板文案。",
      usedFallback: true,
    };
  }

  try {
    const result = await generateLocalFeedback({
      recordId: input.record.id,
      studentName: input.record.student.displayName,
      dayLabel: input.record.dayLabel,
      score: input.record.score ?? 0,
      accuracyRate: Math.round(Number(input.record.accuracyRate ?? 0)),
      reviewSummary: input.reviewSummary,
      questions: input.questions,
      currentDrafts: {
        overallEvaluation: input.record.feedbackDraft ?? undefined,
        errorAnalysis: input.record.reviewNotes ?? undefined,
        parentMessage: input.record.parentMessageDraft ?? undefined,
      },
      instruction,
    } satisfies LocalFeedbackGenerateInput);

    return {
      providerLabel: "本地反馈模型 API",
      providerStatus: result.model ? `已调用真实接口 · ${result.model}` : "已调用真实接口",
      sections: [
        {
          id: "overallEvaluation" as const,
          title: "一、整体评价",
          description: "用于总结作业完成质量与整体表现。",
          content: result.sections.overallEvaluation,
        },
        {
          id: "errorAnalysis" as const,
          title: "二、作业分析",
          description: "用于说明主要问题、错因和下一步建议。",
          content: result.sections.errorAnalysis,
        },
        {
          id: "parentMessage" as const,
          title: "三、家长反馈话术",
          description: "用于企微或私聊发送给家长的反馈内容。",
          content: result.sections.parentMessage,
        },
      ],
      regenerationHint: result.requestId ? `真实接口已返回内容，请求 ID：${result.requestId}` : "真实接口已返回最新反馈内容。",
      usedFallback: false,
    };
  } catch (error) {
    return {
      providerLabel: "本地反馈模型 API",
      providerStatus: "真实接口调用失败，已回退模板文案",
      sections: fallbackSections,
      regenerationHint: error instanceof Error ? error.message : "本地反馈模型调用失败，已回退模板文案。",
      usedFallback: true,
    };
  }
}
