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

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_userId_fkey'
    ) THEN
        ALTER TABLE "NotificationPreference" 
        ADD CONSTRAINT "NotificationPreference_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_boardId_fkey'
    ) THEN
        ALTER TABLE "NotificationPreference" 
        ADD CONSTRAINT "NotificationPreference_boardId_fkey" 
        FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Now update the enum to remove old values and add new ones
-- First, update any existing records to use new enum values (only if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        UPDATE "Notification" 
        SET "type" = 'TASK_ASSIGNED' 
        WHERE "type"::text IN ('TASK_UPDATED', 'DUE_DATE_REMINDER', 'DEPENDENCY_BLOCKED');
    END IF;
END $$;

-- Drop and recreate the enum with new values
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
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
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'NotificationPreference' 
                   AND column_name = 'notificationType') THEN
            ALTER TABLE "NotificationPreference" 
            ALTER COLUMN "notificationType" TYPE "NotificationType" 
            USING "notificationType"::text::"NotificationType";
        END IF;
        
        -- Drop old enum
        DROP TYPE "NotificationType_old";
    END IF;
END $$;
