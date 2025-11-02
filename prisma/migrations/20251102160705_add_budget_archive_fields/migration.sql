-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Budget_isArchived_idx" ON "Budget"("isArchived");
