-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('INBOX', 'SUGGESTED', 'PLACED', 'REJECTED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiSuggestedLinks" JSONB,
ADD COLUMN     "aiSuggestedParentId" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "intakeStatus" "IntakeStatus" NOT NULL DEFAULT 'INBOX';

-- CreateIndex
CREATE INDEX "Task_intakeStatus_idx" ON "Task"("intakeStatus");

-- CreateIndex
CREATE INDEX "Task_aiSuggestedParentId_idx" ON "Task"("aiSuggestedParentId");
