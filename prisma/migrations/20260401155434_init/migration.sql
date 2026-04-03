-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TUTOR', 'LEAD');

-- CreateEnum
CREATE TYPE "TutorRole" AS ENUM ('HOMEROOM_TUTOR', 'SUBJECT_TUTOR', 'QA_REVIEWER', 'TEAM_LEAD');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('LEAD_NEW', 'WECHAT_ADDED', 'ASSESSING', 'PLACED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HomeworkStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'AI_REVIEWED', 'PENDING_REVIEW', 'READY_TO_DELIVER', 'DELIVERED');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('FORM_LINK', 'WECHAT', 'H5', 'MANUAL_IMPORT');

-- CreateEnum
CREATE TYPE "HomeworkAssetType" AS ENUM ('ORIGINAL_IMAGE', 'CORRECTED_IMAGE', 'FEEDBACK_CARD', 'PRACTICE_IMAGE', 'H5_LINK');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('CORRECT_MARK', 'ERROR_CIRCLE', 'HIGHLIGHT', 'COMMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "role" "TutorRole" NOT NULL DEFAULT 'HOMEROOM_TUTOR',
    "workloadCapacity" INTEGER NOT NULL DEFAULT 150,
    "intro" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSubjectAssignment" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeBand" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorSubjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "parentName" TEXT,
    "parentPhone" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'LEAD_NEW',
    "gradeLevel" TEXT NOT NULL,
    "textbookVersion" TEXT,
    "learningGoal" TEXT,
    "assignedTutorId" TEXT,
    "profileSnapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubjectEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "classCode" TEXT,
    "classDisplayName" TEXT,
    "placementScore" INTEGER,
    "suggestedPlacement" TEXT,
    "finalPlacement" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubjectEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT,
    "subjectId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "dayLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "HomeworkStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submissionChannel" "SubmissionChannel" NOT NULL DEFAULT 'FORM_LINK',
    "score" INTEGER,
    "accuracyRate" DECIMAL(5,2),
    "correctCount" INTEGER,
    "incorrectCount" INTEGER,
    "aiSummary" JSONB,
    "feedbackDraft" TEXT,
    "parentMessageDraft" TEXT,
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAsset" (
    "id" TEXT NOT NULL,
    "homeworkRecordId" TEXT NOT NULL,
    "assetType" "HomeworkAssetType" NOT NULL DEFAULT 'ORIGINAL_IMAGE',
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "ocrPayload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAnnotation" (
    "id" TEXT NOT NULL,
    "homeworkRecordId" TEXT NOT NULL,
    "assetId" TEXT,
    "annotationType" "AnnotationType" NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "questionNumber" TEXT,
    "label" TEXT,
    "confidence" DECIMAL(5,2),
    "geometry" JSONB NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "correctedByTutor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_staffCode_key" ON "TutorProfile"("staffCode");

-- CreateIndex
CREATE INDEX "TutorProfile_role_workloadCapacity_idx" ON "TutorProfile"("role", "workloadCapacity");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- CreateIndex
CREATE INDEX "Subject_stage_sortOrder_idx" ON "Subject"("stage", "sortOrder");

-- CreateIndex
CREATE INDEX "TutorSubjectAssignment_subjectId_gradeBand_idx" ON "TutorSubjectAssignment"("subjectId", "gradeBand");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSubjectAssignment_tutorId_subjectId_gradeBand_key" ON "TutorSubjectAssignment"("tutorId", "subjectId", "gradeBand");

-- CreateIndex
CREATE UNIQUE INDEX "Student_uid_key" ON "Student"("uid");

-- CreateIndex
CREATE INDEX "Student_assignedTutorId_status_idx" ON "Student"("assignedTutorId", "status");

-- CreateIndex
CREATE INDEX "Student_sourceChannel_createdAt_idx" ON "Student"("sourceChannel", "createdAt");

-- CreateIndex
CREATE INDEX "StudentSubjectEnrollment_subjectId_semesterLabel_isActive_idx" ON "StudentSubjectEnrollment"("subjectId", "semesterLabel", "isActive");

-- CreateIndex
CREATE INDEX "StudentSubjectEnrollment_studentId_isActive_idx" ON "StudentSubjectEnrollment"("studentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubjectEnrollment_studentId_subjectId_semesterLabel_key" ON "StudentSubjectEnrollment"("studentId", "subjectId", "semesterLabel");

-- CreateIndex
CREATE INDEX "HomeworkRecord_studentId_createdAt_idx" ON "HomeworkRecord"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkRecord_tutorId_createdAt_idx" ON "HomeworkRecord"("tutorId", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkRecord_subjectId_createdAt_idx" ON "HomeworkRecord"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkRecord_status_submittedAt_idx" ON "HomeworkRecord"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "HomeworkRecord_enrollmentId_createdAt_idx" ON "HomeworkRecord"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkAsset_homeworkRecordId_pageIndex_idx" ON "HomeworkAsset"("homeworkRecordId", "pageIndex");

-- CreateIndex
CREATE INDEX "HomeworkAsset_assetType_createdAt_idx" ON "HomeworkAsset"("assetType", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkAnnotation_homeworkRecordId_pageIndex_idx" ON "HomeworkAnnotation"("homeworkRecordId", "pageIndex");

-- CreateIndex
CREATE INDEX "HomeworkAnnotation_assetId_idx" ON "HomeworkAnnotation"("assetId");

-- CreateIndex
CREATE INDEX "HomeworkAnnotation_annotationType_isHidden_idx" ON "HomeworkAnnotation"("annotationType", "isHidden");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubjectAssignment" ADD CONSTRAINT "TutorSubjectAssignment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubjectAssignment" ADD CONSTRAINT "TutorSubjectAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_assignedTutorId_fkey" FOREIGN KEY ("assignedTutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectEnrollment" ADD CONSTRAINT "StudentSubjectEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectEnrollment" ADD CONSTRAINT "StudentSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkRecord" ADD CONSTRAINT "HomeworkRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkRecord" ADD CONSTRAINT "HomeworkRecord_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkRecord" ADD CONSTRAINT "HomeworkRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkRecord" ADD CONSTRAINT "HomeworkRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentSubjectEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAsset" ADD CONSTRAINT "HomeworkAsset_homeworkRecordId_fkey" FOREIGN KEY ("homeworkRecordId") REFERENCES "HomeworkRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAnnotation" ADD CONSTRAINT "HomeworkAnnotation_homeworkRecordId_fkey" FOREIGN KEY ("homeworkRecordId") REFERENCES "HomeworkRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAnnotation" ADD CONSTRAINT "HomeworkAnnotation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "HomeworkAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
