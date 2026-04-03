-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('COURSE_HOMEWORK', 'COURSE_ANSWER', 'H5_INTERACTIVE', 'PRACTICE_SET');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('DRAFT', 'UPLOADED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PracticeLevel" AS ENUM ('BASIC', 'CONSOLIDATION', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "DeliveryTaskType" AS ENUM ('HOMEWORK_REMINDER', 'SUBMISSION_LINK_GENERATED', 'FEEDBACK_DRAFT_SAVED', 'FEEDBACK_SENT', 'MATERIAL_DISTRIBUTED', 'PLACEMENT_CONFIRMED', 'PLACEMENT_ADJUSTED', 'REPORT_EXPORT');

-- CreateEnum
CREATE TYPE "DeliveryTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportArtifactType" AS ENUM ('PDF_REPORT', 'GROWTH_VIDEO');

-- CreateEnum
CREATE TYPE "ReportJobType" AS ENUM ('GENERATE_PDF', 'GENERATE_VIDEO', 'EXPORT_ALL');

-- CreateEnum
CREATE TYPE "ReportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "HomeworkRecord" ADD COLUMN     "campLabel" TEXT,
ADD COLUMN     "submissionLink" TEXT,
ADD COLUMN     "submissionLinkToken" TEXT;

-- AlterTable
ALTER TABLE "StudentSubjectEnrollment" ADD COLUMN     "campLabel" TEXT;

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'DRAFT',
    "practiceLevel" "PracticeLevel",
    "campLabel" TEXT,
    "semesterLabel" TEXT,
    "dayLabel" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "previewQuestion" TEXT,
    "previewAnswer" TEXT,
    "previewOptions" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialDistribution" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "guidanceText" TEXT NOT NULL,
    "trackDuration" BOOLEAN NOT NULL DEFAULT false,
    "trackScore" BOOLEAN NOT NULL DEFAULT false,
    "trackMistakes" BOOLEAN NOT NULL DEFAULT false,
    "distributionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTask" (
    "id" TEXT NOT NULL,
    "type" "DeliveryTaskType" NOT NULL,
    "status" "DeliveryTaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "actionUrl" TEXT,
    "studentId" TEXT,
    "tutorId" TEXT,
    "homeworkRecordId" TEXT,
    "materialId" TEXT,
    "reportJobId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportArtifact" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "homeworkRecordId" TEXT,
    "artifactType" "ReportArtifactType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "fileUrl" TEXT,
    "previewUrl" TEXT,
    "subtitleText" TEXT,
    "musicName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportJob" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT,
    "artifactId" TEXT,
    "type" "ReportJobType" NOT NULL,
    "status" "ReportJobStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_subjectId_type_status_idx" ON "Material"("subjectId", "type", "status");

-- CreateIndex
CREATE INDEX "Material_campLabel_semesterLabel_dayLabel_idx" ON "Material"("campLabel", "semesterLabel", "dayLabel");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialDistribution_materialId_key" ON "MaterialDistribution"("materialId");

-- CreateIndex
CREATE INDEX "DeliveryTask_status_createdAt_idx" ON "DeliveryTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryTask_studentId_status_idx" ON "DeliveryTask"("studentId", "status");

-- CreateIndex
CREATE INDEX "DeliveryTask_homeworkRecordId_type_idx" ON "DeliveryTask"("homeworkRecordId", "type");

-- CreateIndex
CREATE INDEX "ReportArtifact_studentId_artifactType_idx" ON "ReportArtifact"("studentId", "artifactType");

-- CreateIndex
CREATE INDEX "ReportJob_studentId_type_status_idx" ON "ReportJob"("studentId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkRecord_submissionLinkToken_key" ON "HomeworkRecord"("submissionLinkToken");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialDistribution" ADD CONSTRAINT "MaterialDistribution_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_homeworkRecordId_fkey" FOREIGN KEY ("homeworkRecordId") REFERENCES "HomeworkRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_reportJobId_fkey" FOREIGN KEY ("reportJobId") REFERENCES "ReportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportArtifact" ADD CONSTRAINT "ReportArtifact_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportArtifact" ADD CONSTRAINT "ReportArtifact_homeworkRecordId_fkey" FOREIGN KEY ("homeworkRecordId") REFERENCES "HomeworkRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "ReportArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

