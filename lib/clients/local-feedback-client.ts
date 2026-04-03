export type LocalFeedbackSectionId = "overallEvaluation" | "errorAnalysis" | "parentMessage";

export interface LocalFeedbackQuestionInput {
  questionNumber: string;
  title: string;
  studentAnswer: string;
  analysis: string;
  verdict: "CORRECT" | "WRONG";
}

export interface LocalFeedbackGenerateInput {
  recordId?: string;
  studentName: string;
  dayLabel: string;
  score: number;
  accuracyRate: number;
  reviewSummary: {
    totalQuestions: number;
    correctQuestions: number;
    wrongQuestions: number;
  };
  questions?: LocalFeedbackQuestionInput[];
  currentDrafts?: Partial<Record<LocalFeedbackSectionId, string>>;
  instruction?: string;
}

export interface LocalFeedbackGenerateOutput {
  sections: Record<LocalFeedbackSectionId, string>;
  requestId?: string;
  model?: string;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.LOCAL_FEEDBACK_API_TIMEOUT_MS ?? 20000);
const DEFAULT_API_MODE = process.env.LOCAL_FEEDBACK_API_MODE?.trim().toLowerCase() ?? "custom";
const DEFAULT_MODEL = process.env.LOCAL_FEEDBACK_MODEL?.trim() ?? "gpt-4o";

export function isLocalFeedbackModelEnabled() {
  return Boolean(process.env.LOCAL_FEEDBACK_API_URL);
}

function getAuthHeaders() {
  const headers: Record<string, string> = {};
  const bearerToken = process.env.LOCAL_FEEDBACK_API_TOKEN?.trim();
  const apiKey = process.env.LOCAL_FEEDBACK_API_KEY?.trim();

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  return headers;
}

function buildEndpointUrl(pathname: string) {
  const base = process.env.LOCAL_FEEDBACK_API_URL?.trim();
  if (!base) {
    throw new Error("未配置 LOCAL_FEEDBACK_API_URL。");
  }

  return new URL(pathname, base.endsWith("/") ? base : `${base}/`).toString();
}

function buildPrompt(input: LocalFeedbackGenerateInput) {
  return [
    `你是一名资深小学数学辅导老师的反馈助手，请根据以下结构生成给老师使用的三栏反馈内容。`,
    `输出必须是 JSON，对象字段固定为 overallEvaluation、errorAnalysis、parentMessage。`,
    `不要输出 markdown 代码块，不要输出额外说明。`,
    `学生：${input.studentName}`,
    `营期天数：${input.dayLabel}`,
    `得分：${input.score}`,
    `正确率：${input.accuracyRate}%`,
    `总题数：${input.reviewSummary.totalQuestions}，正确：${input.reviewSummary.correctQuestions}，错误：${input.reviewSummary.wrongQuestions}`,
    input.instruction ? `老师额外要求：${input.instruction}` : "",
    input.questions?.length
      ? `题目详情：${input.questions
          .map(
            (question) =>
              `题号${question.questionNumber}｜${question.title}｜学生答案：${question.studentAnswer}｜判定：${question.verdict}｜分析：${question.analysis}`,
          )
          .join("\n")}`
      : "",
    input.currentDrafts?.overallEvaluation ? `当前整体评价草稿：${input.currentDrafts.overallEvaluation}` : "",
    input.currentDrafts?.errorAnalysis ? `当前作业分析草稿：${input.currentDrafts.errorAnalysis}` : "",
    input.currentDrafts?.parentMessage ? `当前家长话术草稿：${input.currentDrafts.parentMessage}` : "",
    `写作要求：`,
    `1. overallEvaluation：1 段，面向老师视角，总结表现与亮点。`,
    `2. errorAnalysis：1-2 段，指出主要问题、错因和下一步建议。`,
    `3. parentMessage：直接可发给家长，语气自然、鼓励但不空泛。`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("模型未返回内容。");
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? trimmed.match(/```([\s\S]*?)```/i)?.[1];
    if (fenced) {
      return JSON.parse(fenced.trim()) as Record<string, unknown>;
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }

    throw new Error("模型返回内容不是可解析 JSON。");
  }
}

function readSectionValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function pickPayloadContainer(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {} as Record<string, unknown>;
  }

  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }

  if (record.result && typeof record.result === "object") {
    return record.result as Record<string, unknown>;
  }

  if (record.output && typeof record.output === "object") {
    return record.output as Record<string, unknown>;
  }

  return record;
}

function parseLocalFeedbackResponse(payload: unknown): LocalFeedbackGenerateOutput {
  const container = pickPayloadContainer(payload);
  const sectionsArray =
    Array.isArray(container.sections) ? (container.sections as Array<Record<string, unknown>>) : null;

  const byArray = sectionsArray
    ? Object.fromEntries(
        sectionsArray
          .map((section) => {
            const id = String(section.id ?? "").trim() as LocalFeedbackSectionId;
            const content = String(section.content ?? "").trim();
            return id && content ? [id, content] : null;
          })
          .filter(Boolean) as Array<[LocalFeedbackSectionId, string]>,
      )
    : {};

  const sections: Record<LocalFeedbackSectionId, string> = {
    overallEvaluation:
      byArray.overallEvaluation ||
      readSectionValue(container, ["overallEvaluation", "overall", "summary", "overall_evaluation"]),
    errorAnalysis:
      byArray.errorAnalysis ||
      readSectionValue(container, ["errorAnalysis", "analysis", "homeworkAnalysis", "error_analysis"]),
    parentMessage:
      byArray.parentMessage ||
      readSectionValue(container, ["parentMessage", "parentTalk", "message", "parent_message"]),
  };

  return {
    sections,
    requestId:
      typeof container.requestId === "string"
        ? container.requestId
        : typeof container.traceId === "string"
          ? container.traceId
          : undefined,
    model: typeof container.model === "string" ? container.model : undefined,
  };
}

async function generateViaOpenAICompat(input: LocalFeedbackGenerateInput): Promise<LocalFeedbackGenerateOutput> {
  const response = await fetch(buildEndpointUrl("/v1/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.4,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "你是中文 K12 辅导反馈助手，必须严格输出 JSON，字段只允许 overallEvaluation、errorAnalysis、parentMessage。",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`本地反馈模型 OpenAI 兼容接口响应失败：HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const firstChoice = Array.isArray(payload.choices) ? (payload.choices[0] as Record<string, unknown>) : null;
  const message =
    firstChoice && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : null;
  const content = typeof message?.content === "string" ? message.content : "";
  const parsedJson = extractJsonObject(content);

  return parseLocalFeedbackResponse({
    ...parsedJson,
    requestId:
      typeof payload.id === "string"
        ? payload.id
        : typeof payload.request_id === "string"
          ? payload.request_id
          : undefined,
    model: typeof payload.model === "string" ? payload.model : DEFAULT_MODEL,
  });
}

export async function generateLocalFeedback(input: LocalFeedbackGenerateInput): Promise<LocalFeedbackGenerateOutput> {
  if (!process.env.LOCAL_FEEDBACK_API_URL?.trim()) {
    throw new Error("未配置 LOCAL_FEEDBACK_API_URL。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    if (DEFAULT_API_MODE === "openai") {
      return await generateViaOpenAICompat(input);
    }

    const endpoint = process.env.LOCAL_FEEDBACK_API_URL?.trim() as string;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        recordId: input.recordId,
        studentName: input.studentName,
        dayLabel: input.dayLabel,
        score: input.score,
        accuracyRate: input.accuracyRate,
        reviewSummary: input.reviewSummary,
        questions: input.questions ?? [],
        currentDrafts: input.currentDrafts ?? {},
        instruction: input.instruction ?? "",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`本地反馈模型接口响应失败：HTTP ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const parsed = parseLocalFeedbackResponse(payload);

    if (!parsed.sections.overallEvaluation || !parsed.sections.errorAnalysis || !parsed.sections.parentMessage) {
      throw new Error("本地反馈模型返回结构不完整，缺少三栏反馈内容。");
    }

    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
