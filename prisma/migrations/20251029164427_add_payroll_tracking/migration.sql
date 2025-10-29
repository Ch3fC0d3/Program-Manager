-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "payrollPeriodId" TEXT;

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayroll" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2),
    "grossPay" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollPeriod_status_idx" ON "PayrollPeriod"("status");

-- CreateIndex
CREATE INDEX "PayrollPeriod_weekStart_idx" ON "PayrollPeriod"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_weekStart_weekEnd_key" ON "PayrollPeriod"("weekStart", "weekEnd");

-- CreateIndex
CREATE INDEX "EmployeePayroll_payrollPeriodId_idx" ON "EmployeePayroll"("payrollPeriodId");

-- CreateIndex
CREATE INDEX "EmployeePayroll_userId_idx" ON "EmployeePayroll"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayroll_payrollPeriodId_userId_key" ON "EmployeePayroll"("payrollPeriodId", "userId");

-- CreateIndex
CREATE INDEX "TimeEntry_payrollPeriodId_idx" ON "TimeEntry"("payrollPeriodId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_finalizedBy_fkey" FOREIGN KEY ("finalizedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayroll" ADD CONSTRAINT "EmployeePayroll_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayroll" ADD CONSTRAINT "EmployeePayroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
