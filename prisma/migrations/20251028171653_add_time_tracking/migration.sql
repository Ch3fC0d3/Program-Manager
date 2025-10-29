/*
  Warnings:

  - You are about to drop the column `endedAt` on the `TimeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `minutes` on the `TimeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `TimeEntry` table. All the data in the column will be lost.
  - Added the required column `clockIn` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('MANUAL', 'CLOCK', 'IMPORT');

-- DropForeignKey
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_taskId_fkey";

-- DropIndex
DROP INDEX "TimeEntry_taskId_userId_startedAt_idx";

-- AlterTable
ALTER TABLE "TimeEntry" DROP COLUMN "endedAt",
DROP COLUMN "minutes",
DROP COLUMN "startedAt",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "breakMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clockIn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "clockOut" TIMESTAMP(3),
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "location" JSONB,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "source" "TimeEntrySource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TimeEntryAudit" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntryAudit_timeEntryId_idx" ON "TimeEntryAudit"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryAudit_actorId_idx" ON "TimeEntryAudit"("actorId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_clockIn_idx" ON "TimeEntry"("userId", "clockIn");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_approvedById_idx" ON "TimeEntry"("approvedById");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAudit" ADD CONSTRAINT "TimeEntryAudit_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAudit" ADD CONSTRAINT "TimeEntryAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
