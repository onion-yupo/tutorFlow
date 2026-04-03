export type AnnotationColor = "emerald" | "rose" | "amber";
export type WorkspaceReviewStatus = "未核对" | "已核对";
export type WorkspaceFeedbackStatus = "未反馈" | "已反馈";
export type WorkspaceQuestionVerdict = "CORRECT" | "WRONG";
export type WorkspaceFeedbackSectionId = "overallEvaluation" | "errorAnalysis" | "parentMessage";
export type WorkspacePaneMode = "review" | "feedback";

export interface WorkspaceAnnotation {
  id: string;
  label: string;
  color: AnnotationColor;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceTimelineDay {
  dayNumber: number;
  dayLabel: string;
  shortLabel: string;
  isActive: boolean;
  isCompleted: boolean;
  hasRecord: boolean;
  href?: string;
}

export interface WorkspaceStatCard {
  id: string;
  label: string;
  value: string;
  accent: "default" | "success" | "danger" | "info";
}

export interface WorkspaceImage {
  id: string;
  title: string;
  imageUrl: string;
  totalQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  annotations: WorkspaceAnnotation[];
}

export interface WorkspaceQuestionItem {
  id: string;
  assetId: string;
  questionNumber: string;
  title: string;
  studentAnswer: string;
  analysis: string;
  verdict: WorkspaceQuestionVerdict;
  checkedByTutor: boolean;
}

export interface WorkspaceFeedbackSection {
  id: WorkspaceFeedbackSectionId;
  title: string;
  description: string;
  content: string;
}

export interface WorkspaceRecordMeta {
  recordId: string;
  reviewStatus: WorkspaceReviewStatus;
  feedbackStatus: WorkspaceFeedbackStatus;
  submittedAtLabel: string;
  reviewedAtLabel: string;
  deliveredAtLabel: string;
}

export interface WorkspaceStudentIdentity {
  id: string;
  name: string;
  parentName: string;
  phoneTail: string;
  gradeLabel: string;
  subjectLabel: string;
  textbookVersion: string;
  goal: string;
}

export interface WorkspaceModelAdapterInfo {
  providerLabel: string;
  providerStatus: string;
}

export interface WorkspaceData {
  recordId: string;
  campLabel: string;
  semesterLabel: string;
  currentDayLabel: string;
  currentDayIndex: number;
  totalDays: number;
  student: WorkspaceStudentIdentity;
  record: WorkspaceRecordMeta;
  timeline: WorkspaceTimelineDay[];
  stats: WorkspaceStatCard[];
  imagePane: {
    activeImageId: string;
    images: WorkspaceImage[];
  };
  reviewPane: {
    adapter: WorkspaceModelAdapterInfo;
    summary: {
      totalQuestions: number;
      correctQuestions: number;
      wrongQuestions: number;
      accuracyRate: number;
      score: number;
      confidence: number;
    };
    questions: WorkspaceQuestionItem[];
  };
  feedbackPane: {
    adapter: WorkspaceModelAdapterInfo;
    regenerationHint: string;
    sections: WorkspaceFeedbackSection[];
  };
}
