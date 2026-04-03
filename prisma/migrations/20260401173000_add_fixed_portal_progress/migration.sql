DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SubmissionPortal'
  ) THEN
    ALTER TABLE "SubmissionPortal"
    ADD COLUMN IF NOT EXISTS "campDays" INTEGER NOT NULL DEFAULT 21,
    ADD COLUMN IF NOT EXISTS "campStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkRecord_studentId_enrollmentId_dayLabel_key"
ON "HomeworkRecord"("studentId", "enrollmentId", "dayLabel");
