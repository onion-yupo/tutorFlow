-- CreateEnum
CREATE TYPE "HomeworkReviewStatus" AS ENUM ('UNCHECKED', 'CHECKED');

-- CreateEnum
CREATE TYPE "HomeworkFeedbackStatus" AS ENUM ('PENDING', 'SENT');

-- AlterTable
ALTER TABLE "HomeworkRecord"
ADD COLUMN "feedbackStatus" "HomeworkFeedbackStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewStatus" "HomeworkReviewStatus" NOT NULL DEFAULT 'UNCHECKED';
