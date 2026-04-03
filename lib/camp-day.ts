const DAY_LABEL_PREFIX = "Day ";
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

function toChinaDayTimestamp(date: Date) {
  const shifted = new Date(date.getTime() + CHINA_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

export function getChinaDayStartDate(date: Date = new Date()) {
  return new Date(toChinaDayTimestamp(date) - CHINA_OFFSET_MS);
}

export function formatDayLabel(dayNumber: number) {
  return `${DAY_LABEL_PREFIX}${dayNumber}`;
}

export function parseDayLabel(dayLabel: string) {
  const value = Number(dayLabel.replace(DAY_LABEL_PREFIX, "").trim());
  return Number.isFinite(value) ? value : null;
}

export function getCampDayProgress(params: {
  campStartDate: Date;
  campDays: number;
  now?: Date;
}) {
  const { campStartDate, campDays, now = new Date() } = params;
  const start = toChinaDayTimestamp(campStartDate);
  const today = toChinaDayTimestamp(now);
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const currentDayNumber = Math.min(Math.max(diffDays + 1, 1), campDays);

  return {
    currentDayNumber,
    currentDayLabel: formatDayLabel(currentDayNumber),
    isBeforeStart: diffDays < 0,
    isEnded: diffDays + 1 > campDays,
  };
}

export function buildAvailableDayOptions(params: {
  campStartDate: Date;
  campDays: number;
  now?: Date;
}) {
  const progress = getCampDayProgress(params);
  return Array.from({ length: progress.currentDayNumber }, (_, index) => {
    const dayNumber = index + 1;
    return {
      dayNumber,
      dayLabel: formatDayLabel(dayNumber),
      isToday: dayNumber === progress.currentDayNumber,
    };
  }).reverse();
}

export function isPortalDaySelectable(params: {
  dayLabel: string;
  campStartDate: Date;
  campDays: number;
  now?: Date;
}) {
  const { dayLabel, campStartDate, campDays, now } = params;
  const dayNumber = parseDayLabel(dayLabel);

  if (!dayNumber || dayNumber < 1 || dayNumber > campDays) {
    return false;
  }

  const progress = getCampDayProgress({ campStartDate, campDays, now });
  return dayNumber <= progress.currentDayNumber;
}

export function buildHomeworkSubmissionToken(portalToken: string, studentId: string, dayLabel: string) {
  return `${portalToken}-${studentId}-${dayLabel}`.toLowerCase().replace(/\s+/g, "-");
}

export function buildHomeworkTitle(dayLabel: string, subjectName: string) {
  return `${dayLabel} ${subjectName}作业`;
}
