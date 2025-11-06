-- AlterTable
ALTER TABLE "User" ADD COLUMN     "microsoftAccessToken" TEXT,
ADD COLUMN     "microsoftRefreshToken" TEXT,
ADD COLUMN     "microsoftTokenExpiry" TIMESTAMP(3);
