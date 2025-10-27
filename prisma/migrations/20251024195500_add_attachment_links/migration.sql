-- Allow attachments to link to expenses and contacts
ALTER TABLE "Attachment"
ADD COLUMN "expenseId" TEXT,
ADD COLUMN "contactId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE;

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE;

CREATE INDEX "Attachment_expenseId_idx" ON "Attachment"("expenseId");
CREATE INDEX "Attachment_contactId_idx" ON "Attachment"("contactId");
