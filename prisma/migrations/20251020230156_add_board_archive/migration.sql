-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Board_archivedAt_idx" ON "Board"("archivedAt");
