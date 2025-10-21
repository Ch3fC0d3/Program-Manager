export type TaskStatusChangedTemplateData = {
  taskTitle: string
  taskId: string
  oldStatus: string
  newStatus: string
  changedBy: string
  taskUrl: string
}

export function taskStatusChangedTemplate(data: TaskStatusChangedTemplateData) {
  return {
    subject: `Task Status Updated: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .status-change { background: white; padding: 15px; margin: 20px 0; border-radius: 6px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 Task Status Updated</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${data.changedBy}</strong> updated the status of:</p>
              <h2 style="color: #1f2937; margin: 20px 0;">${data.taskTitle}</h2>
              <div class="status-change">
                <p style="margin: 0;">
                  <strong>Status changed:</strong> ${data.oldStatus} → ${data.newStatus}
                </p>
              </div>
              <a href="${data.taskUrl}" class="button">View Task</a>
            </div>
            <div class="footer">
              <p>This is an automated notification from your task management system.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: [
      `Task Status Updated: ${data.taskTitle}`,
      `Changed by: ${data.changedBy}`,
      `From ${data.oldStatus} to ${data.newStatus}`,
      `View task: ${data.taskUrl}`
    ].join('\n'),
  }
}
