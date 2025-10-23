-- CreateEnum
CREATE TYPE "BudgetLineType" AS ENUM ('CATEGORY', 'VENDOR', 'PROJECT', 'CUSTOM');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiExtractedData" JSONB,
ADD COLUMN     "aiSourceId" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- CreateTable
CREATE TABLE "BudgetLineItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BudgetLineType" NOT NULL DEFAULT 'CATEGORY',
    "category" TEXT,
    "vendorId" TEXT,
    "boardId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "plannedAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "aiSourceId" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiExtractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLineItem" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "aiExtractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "budgetLineItemId" TEXT,
    "expenseId" TEXT NOT NULL,
    "expenseLineItemId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetSnapshot" (
    "id" TEXT NOT NULL,
    "budgetLineItemId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "plannedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetLineItem_budgetId_idx" ON "BudgetLineItem"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetLineItem_boardId_category_idx" ON "BudgetLineItem"("boardId", "category");

-- CreateIndex
CREATE INDEX "BudgetLineItem_vendorId_idx" ON "BudgetLineItem"("vendorId");

-- CreateIndex
CREATE INDEX "ExpenseLineItem_expenseId_idx" ON "ExpenseLineItem"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseLineItem_category_idx" ON "ExpenseLineItem"("category");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_budgetId_idx" ON "ExpenseAllocation"("budgetId");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_budgetLineItemId_idx" ON "ExpenseAllocation"("budgetLineItemId");

-- CreateIndex
CREATE INDEX "ExpenseAllocation_expenseId_idx" ON "ExpenseAllocation"("expenseId");

-- CreateIndex
CREATE INDEX "BudgetSnapshot_budgetLineItemId_periodStart_idx" ON "BudgetSnapshot"("budgetLineItemId", "periodStart");

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLineItem" ADD CONSTRAINT "ExpenseLineItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_budgetLineItemId_fkey" FOREIGN KEY ("budgetLineItemId") REFERENCES "BudgetLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseLineItemId_fkey" FOREIGN KEY ("expenseLineItemId") REFERENCES "ExpenseLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSnapshot" ADD CONSTRAINT "BudgetSnapshot_budgetLineItemId_fkey" FOREIGN KEY ("budgetLineItemId") REFERENCES "BudgetLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
