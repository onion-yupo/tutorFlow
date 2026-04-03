-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('FEISHU');

-- CreateEnum
CREATE TYPE "ClassAssignmentRole" AS ENUM ('LEAD', 'ASSISTANT', 'REVIEWER');

-- AlterTable
ALTER TABLE "StudentSubjectEnrollment" ADD COLUMN     "classId" TEXT;

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "unionId" TEXT,
    "externalName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campLabel" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "leadTutorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorClassAssignment" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" "ClassAssignmentRole" NOT NULL DEFAULT 'LEAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionPortal" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activeDayLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPortalBinding" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "phoneLast4" TEXT NOT NULL,
    "displayNameSnapshot" TEXT NOT NULL,
    "wecomOpenId" TEXT,
    "metadata" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPortalBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPortalSession" (
    "id" TEXT NOT NULL,
    "bindingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_provider_idx" ON "AuthIdentity"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerUserId_key" ON "AuthIdentity"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CampClass_code_key" ON "CampClass"("code");

-- CreateIndex
CREATE INDEX "CampClass_subjectId_campLabel_isActive_idx" ON "CampClass"("subjectId", "campLabel", "isActive");

-- CreateIndex
CREATE INDEX "CampClass_leadTutorId_isActive_idx" ON "CampClass"("leadTutorId", "isActive");

-- CreateIndex
CREATE INDEX "TutorClassAssignment_classId_role_idx" ON "TutorClassAssignment"("classId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TutorClassAssignment_tutorId_classId_key" ON "TutorClassAssignment"("tutorId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionPortal_token_key" ON "SubmissionPortal"("token");

-- CreateIndex
CREATE INDEX "SubmissionPortal_classId_isActive_idx" ON "SubmissionPortal"("classId", "isActive");

-- CreateIndex
CREATE INDEX "StudentPortalBinding_portalId_phoneLast4_idx" ON "StudentPortalBinding"("portalId", "phoneLast4");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPortalBinding_studentId_portalId_key" ON "StudentPortalBinding"("studentId", "portalId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPortalSession_sessionToken_key" ON "StudentPortalSession"("sessionToken");

-- CreateIndex
CREATE INDEX "StudentPortalSession_studentId_expiresAt_idx" ON "StudentPortalSession"("studentId", "expiresAt");

-- CreateIndex
CREATE INDEX "StudentPortalSession_portalId_expiresAt_idx" ON "StudentPortalSession"("portalId", "expiresAt");

-- CreateIndex
CREATE INDEX "StudentSubjectEnrollment_classId_isActive_idx" ON "StudentSubjectEnrollment"("classId", "isActive");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampClass" ADD CONSTRAINT "CampClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampClass" ADD CONSTRAINT "CampClass_leadTutorId_fkey" FOREIGN KEY ("leadTutorId") REFERENCES "TutorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorClassAssignment" ADD CONSTRAINT "TutorClassAssignment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorClassAssignment" ADD CONSTRAINT "TutorClassAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CampClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubjectEnrollment" ADD CONSTRAINT "StudentSubjectEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CampClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionPortal" ADD CONSTRAINT "SubmissionPortal_classId_fkey" FOREIGN KEY ("classId") REFERENCES "CampClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPortalBinding" ADD CONSTRAINT "StudentPortalBinding_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPortalBinding" ADD CONSTRAINT "StudentPortalBinding_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "SubmissionPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPortalSession" ADD CONSTRAINT "StudentPortalSession_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "StudentPortalBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPortalSession" ADD CONSTRAINT "StudentPortalSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPortalSession" ADD CONSTRAINT "StudentPortalSession_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "SubmissionPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

