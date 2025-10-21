export type TaskAssignedTemplateData = {
  taskTitle: string
  taskId: string
  assignedBy: string
  taskUrl: string
  description?: string | null
  priority?: string | null
  status?: string | null
  dueDate?: string | null
}

export function taskAssignedTemplate(data: TaskAssignedTemplateData) {
  return {
    subject: `New Task Assigned: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Task Assigned</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${data.assignedBy}</strong> has assigned you a new task:</p>
              <h2 style="color: #1f2937; margin: 20px 0;">${data.taskTitle}</h2>
              ${data.description ? `<p style="margin: 15px 0; color: #4b5563;">${data.description}</p>` : ''}
              <div style="margin: 20px 0;">
                ${data.priority ? `<p style="margin: 4px 0;"><strong>Priority:</strong> ${data.priority}</p>` : ''}
                ${data.status ? `<p style="margin: 4px 0;"><strong>Status:</strong> ${data.status}</p>` : ''}
                ${data.dueDate ? `<p style="margin: 4px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
              </div>
              <a href="${data.taskUrl}" class="button">View Task</a>
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Click the button above to view the task details and get started.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from your task management system.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: [
      `New Task Assigned: ${data.taskTitle}`,
      data.description ? `Description: ${data.description}` : null,
      data.priority ? `Priority: ${data.priority}` : null,
      data.status ? `Status: ${data.status}` : null,
      data.dueDate ? `Due Date: ${data.dueDate}` : null,
      `Assigned by: ${data.assignedBy}`,
      `View task: ${data.taskUrl}`
    ].filter(Boolean).join('\n'),
  }
}
