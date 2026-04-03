export function mapStudentStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    LEAD_NEW: "未联系",
    WECHAT_ADDED: "已加企微",
    ASSESSING: "测评中",
    PLACED: "已定级",
    ACTIVE: "在读中",
    COMPLETED: "已结营",
  };

  return mapping[status] ?? status;
}

export function mapHomeworkStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    NOT_SUBMITTED: "待提交",
    SUBMITTED: "已提交",
    AI_REVIEWED: "AI 已批改",
    PENDING_REVIEW: "待复核",
    READY_TO_DELIVER: "待发送",
    DELIVERED: "反馈已发",
  };

  return mapping[status] ?? status;
}

export function mapMaterialStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    DRAFT: "草稿",
    UPLOADED: "已上传",
    PUBLISHED: "已发布",
    ARCHIVED: "已归档",
  };

  return mapping[status] ?? status;
}

export function mapReportJobStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    PENDING: "未开始",
    RUNNING: "生成中",
    COMPLETED: "可生成",
    FAILED: "失败",
  };

  return mapping[status] ?? status;
}

export function mapDeliveryTaskStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    PENDING: "待处理",
    IN_PROGRESS: "处理中",
    COMPLETED: "已完成",
    FAILED: "失败待重试",
    CANCELLED: "已取消",
  };

  return mapping[status] ?? status;
}

export function mapPracticeLevelLabel(level: string | null | undefined) {
  const mapping: Record<string, string> = {
    BASIC: "基础题",
    CONSOLIDATION: "巩固题",
    CHALLENGE: "挑战题",
  };

  return level ? mapping[level] ?? level : "未分级";
}

export function formatClock(date: Date | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatShortDate(date: Date | null | undefined) {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export function minutesBetween(start?: Date | null, end?: Date | null) {
  if (!start || !end) {
    return null;
  }

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function toPercent(value: number) {
  return `${Math.round(value)}%`;
}
