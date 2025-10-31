-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sidebarCollapsed" BOOLEAN DEFAULT false,
ADD COLUMN     "theme" TEXT DEFAULT 'light';
