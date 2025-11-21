import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const results: Record<string, { ok: boolean; error?: string; code?: string }> = {}

  const checks: { name: string; fn: () => Promise<unknown> }[] = [
    { name: 'User', fn: () => prisma.user.findFirst() },
    { name: 'Task', fn: () => prisma.task.findFirst() },
    { name: 'Board', fn: () => prisma.board.findFirst() },
    { name: 'BoardMember', fn: () => prisma.boardMember.findFirst() },
    { name: 'Label', fn: () => prisma.label.findFirst() },
    { name: 'TaskLabel', fn: () => prisma.taskLabel.findFirst() },
    { name: 'Attachment', fn: () => prisma.attachment.findFirst() },
    { name: 'Comment', fn: () => prisma.comment.findFirst() },
    { name: 'Checklist', fn: () => prisma.checklist.findFirst() },
    { name: 'ChecklistItem', fn: () => prisma.checklistItem.findFirst() },
    { name: 'TaskDependency', fn: () => prisma.taskDependency.findFirst() },
    { name: 'Reminder', fn: () => prisma.reminder.findFirst() },
    { name: 'Notification', fn: () => prisma.notification.findFirst() },
    { name: 'Activity', fn: () => prisma.activity.findFirst() },
    { name: 'Template', fn: () => prisma.template.findFirst() },
    { name: 'Automation', fn: () => prisma.automation.findFirst() },
    { name: 'Contact', fn: () => prisma.contact.findFirst() },
    { name: 'Vendor', fn: () => prisma.vendor.findFirst() },
    { name: 'ContactInteraction', fn: () => prisma.contactInteraction.findFirst() },
    { name: 'TaskWatcher', fn: () => prisma.taskWatcher.findFirst() },
    { name: 'TimeEntry', fn: () => prisma.timeEntry.findFirst() },
    { name: 'TimeEntryAudit', fn: () => prisma.timeEntryAudit.findFirst() },
    { name: 'PayrollPeriod', fn: () => prisma.payrollPeriod.findFirst() },
    { name: 'EmployeePayroll', fn: () => prisma.employeePayroll.findFirst() },
    { name: 'Recurrence', fn: () => prisma.recurrence.findFirst() },
    { name: 'CustomField', fn: () => prisma.customField.findFirst() },
    { name: 'TaskCustomField', fn: () => prisma.taskCustomField.findFirst() },
    { name: 'NotificationPreference', fn: () => prisma.notificationPreference.findFirst() },
    { name: 'Webhook', fn: () => prisma.webhook.findFirst() },
    { name: 'CommentMention', fn: () => prisma.commentMention.findFirst() },
    { name: 'Expense', fn: () => prisma.expense.findFirst() },
    { name: 'Budget', fn: () => prisma.budget.findFirst() },
    { name: 'BudgetLineItem', fn: () => prisma.budgetLineItem.findFirst() },
    { name: 'ExpenseLineItem', fn: () => prisma.expenseLineItem.findFirst() },
    { name: 'ExpenseAllocation', fn: () => prisma.expenseAllocation.findFirst() },
    { name: 'BudgetSnapshot', fn: () => prisma.budgetSnapshot.findFirst() },
    { name: 'Meeting', fn: () => prisma.meeting.findFirst() },
    { name: 'MeetingTemplate', fn: () => prisma.meetingTemplate.findFirst() },
    { name: 'DashboardFile', fn: () => prisma.dashboardFile.findFirst() },
    { name: 'Organization', fn: () => prisma.organization.findFirst() },
    { name: 'OrganizationMember', fn: () => prisma.organizationMember.findFirst() },
    { name: 'Message', fn: () => prisma.message.findFirst() },
  ]

  for (const check of checks) {
    try {
      await check.fn()
      results[check.name] = { ok: true }
    } catch (error: any) {
      results[check.name] = {
        ok: false,
        error: error.message,
        code: error.code,
      }
    }
  }

  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  })
}
