/*
  Warnings:

  - The values [TASK_UPDATED,DUE_DATE_REMINDER,DEPENDENCY_BLOCKED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `channel` on the `NotificationPreference` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `NotificationPreference` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,notificationType,boardId]` on the table `NotificationPreference` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `notificationType` to the `NotificationPreference` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'COMMENT_ADDED', 'COMMENT_MENTION', 'SUBTASK_COMPLETED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'BOARD_INVITE', 'WEEKLY_DIGEST');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TABLE "NotificationPreference" ALTER COLUMN "notificationType" TYPE "NotificationType_new" USING ("notificationType"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropIndex
DROP INDEX "NotificationPreference_channel_idx";

-- DropIndex
DROP INDEX "NotificationPreference_userId_channel_key";

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN "channel",
DROP COLUMN "enabled",
ADD COLUMN     "boardId" TEXT,
ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationType" "NotificationType" NOT NULL,
ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER;

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_boardId_idx" ON "NotificationPreference"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_notificationType_boardId_key" ON "NotificationPreference"("userId", "notificationType", "boardId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
