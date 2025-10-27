-- Add estimatedAmount column to track AI estimates separately from actuals
ALTER TABLE "Expense"
ADD COLUMN "estimatedAmount" DOUBLE PRECISION;
