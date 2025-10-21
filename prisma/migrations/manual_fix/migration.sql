-- Manual migration to create NotificationPreference table
-- This fixes the enum modification issue

-- Create the NotificationPreference table if it doesn't exist
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "NotificationFrequency" NOT NULL DEFAULT 'IMMEDIATE',
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "boardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_notificationType_boardId_key" 
ON "NotificationPreference"("userId", "notificationType", "boardId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_boardId_idx" ON "NotificationPreference"("boardId");

-- Add foreign key constraints
ALTER TABLE "NotificationPreference" 
ADD CONSTRAINT "NotificationPreference_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference" 
ADD CONSTRAINT "NotificationPreference_boardId_fkey" 
FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Now update the enum to remove old values and add new ones
-- First, update any existing records to use new enum values
UPDATE "Notification" 
SET "type" = 'TASK_ASSIGNED' 
WHERE "type" IN ('TASK_UPDATED', 'DUE_DATE_REMINDER', 'DEPENDENCY_BLOCKED');

-- Drop and recreate the enum with new values
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";

CREATE TYPE "NotificationType" AS ENUM (
    'TASK_ASSIGNED',
    'TASK_COMPLETED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'COMMENT_ADDED',
    'COMMENT_MENTION',
    'SUBTASK_COMPLETED',
    'STATUS_CHANGED',
    'PRIORITY_CHANGED',
    'BOARD_INVITE',
    'WEEKLY_DIGEST'
);

-- Update existing columns to use new enum
ALTER TABLE "Notification" 
ALTER COLUMN "type" TYPE "NotificationType" 
USING "type"::text::"NotificationType";

ALTER TABLE "NotificationPreference" 
ALTER COLUMN "notificationType" TYPE "NotificationType" 
USING "notificationType"::text::"NotificationType";

-- Drop old enum
DROP TYPE "NotificationType_old";
