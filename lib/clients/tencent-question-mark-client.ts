import { readFile } from "node:fs/promises";
import path from "node:path";

import { Client as OcrClient } from "tencentcloud-sdk-nodejs/tencentcloud/services/ocr/v20181119/ocr_client";
import type {
  DescribeQuestionMarkAgentJobResponse,
  MarkInfo,
  SubmitQuestionMarkAgentJobRequest,
  SubmitQuestionMarkAgentJobResponse,
} from "tencentcloud-sdk-nodejs/tencentcloud/services/ocr/v20181119/ocr_models";

const MAX_IMAGE_BUFFER_BYTES = 7.5 * 1024 * 1024;
const DEFAULT_REGION = process.env.TENCENT_OCR_REGION ?? "ap-guangzhou";
const DEFAULT_QUESTION_CONFIG = JSON.stringify({
  KnowledgePoints: true,
  TrueAnswer: true,
  ReturnAnswerPosition: true,
});

let client: OcrClient | null = null;

function getCredential() {
  const secretId = process.env.TENCENT_OCR_SECRET_ID;
  const secretKey = process.env.TENCENT_OCR_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("缺少腾讯 OCR 凭证，请检查 TENCENT_OCR_SECRET_ID / TENCENT_OCR_SECRET_KEY。");
  }

  return {
    secretId,
    secretKey,
  };
}

function getClient() {
  if (!client) {
    const credential = getCredential();
    client = new OcrClient({
      credential,
      region: DEFAULT_REGION,
      profile: {
        httpProfile: {
          endpoint: "ocr.tencentcloudapi.com",
          reqMethod: "POST",
          reqTimeout: 30,
        },
      },
    });
  }

  return client;
}

export function isTencentQuestionMarkEnabled() {
  return (
    process.env.TENCENT_OCR_ENABLE_LIVE === "true" &&
    Boolean(process.env.TENCENT_OCR_SECRET_ID) &&
    Boolean(process.env.TENCENT_OCR_SECRET_KEY)
  );
}

async function resolveImagePayload(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    return { ImageUrl: fileUrl };
  }

  const absolutePath = fileUrl.startsWith("/")
    ? path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""))
    : fileUrl.startsWith("public/")
      ? path.join(process.cwd(), "public", fileUrl.replace(/^public\//, ""))
      : path.isAbsolute(fileUrl)
        ? fileUrl
        : null;

  if (!absolutePath) {
    throw new Error(`暂不支持解析该图片路径：${fileUrl}`);
  }

  const buffer = await readFile(absolutePath);
  if (buffer.byteLength > MAX_IMAGE_BUFFER_BYTES) {
    throw new Error("图片体积过大，转换为 Base64 后可能超过腾讯 OCR 的 10MB 限制。");
  }

  return {
    ImageBase64: buffer.toString("base64"),
  };
}

export async function submitQuestionMarkAgentJob(params: {
  fileUrl: string;
  questionConfigMap?: string;
}) {
  const imagePayload = await resolveImagePayload(params.fileUrl);
  const request: SubmitQuestionMarkAgentJobRequest = {
    ...imagePayload,
    QuestionConfigMap: params.questionConfigMap ?? DEFAULT_QUESTION_CONFIG,
    PdfPageNumber: 1,
  };

  const response: SubmitQuestionMarkAgentJobResponse = await getClient().SubmitQuestionMarkAgentJob(request);
  if (!response.JobId) {
    throw new Error(`腾讯试题批改提交成功但未返回 JobId，请求 ID：${response.RequestId ?? "unknown"}`);
  }

  return response;
}

export async function describeQuestionMarkAgentJob(jobId: string) {
  const response: DescribeQuestionMarkAgentJobResponse = await getClient().DescribeQuestionMarkAgentJob({
    JobId: jobId,
  });

  return response;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForQuestionMarkAgentJob(params: {
  jobId: string;
  maxAttempts?: number;
  intervalMs?: number;
}) {
  const { jobId, maxAttempts = 12, intervalMs = 2500 } = params;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await describeQuestionMarkAgentJob(jobId);

    if (response.JobStatus === "DONE") {
      return response;
    }

    if (response.JobStatus === "FAIL") {
      throw new Error(
        `腾讯试题批改任务失败：${response.ErrorCode ?? "Unknown"} ${response.ErrorMessage ?? ""}`.trim(),
      );
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  throw new Error(`腾讯试题批改任务轮询超时，JobId=${jobId}`);
}

export async function runQuestionMarkAgentForFile(params: {
  fileUrl: string;
  questionConfigMap?: string;
}) {
  const submitResponse = await submitQuestionMarkAgentJob(params);
  const describeResponse = await waitForQuestionMarkAgentJob({
    jobId: submitResponse.JobId as string,
  });

  return {
    jobId: submitResponse.JobId as string,
    questionCount: Number(submitResponse.QuestionCount ?? 0),
    requestId: describeResponse.RequestId ?? submitResponse.RequestId ?? "",
    angle: describeResponse.Angle ?? 0,
    jobStatus: describeResponse.JobStatus ?? "UNKNOWN",
    markInfos: (describeResponse.MarkInfos ?? []) as MarkInfo[],
    rawSubmitResponse: submitResponse,
    rawDescribeResponse: describeResponse,
  };
}
