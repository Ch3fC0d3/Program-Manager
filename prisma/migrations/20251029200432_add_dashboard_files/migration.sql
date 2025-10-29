-- CreateTable
CREATE TABLE "DashboardFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DashboardFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardFile_uploadedBy_idx" ON "DashboardFile"("uploadedBy");

-- CreateIndex
CREATE INDEX "DashboardFile_category_idx" ON "DashboardFile"("category");

-- CreateIndex
CREATE INDEX "DashboardFile_isPinned_idx" ON "DashboardFile"("isPinned");

-- AddForeignKey
ALTER TABLE "DashboardFile" ADD CONSTRAINT "DashboardFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
