export type TaskDueSoonTemplateData = {
  taskTitle: string
  taskId: string
  dueDate: string
  taskUrl: string
}

export function taskDueSoonTemplate(data: TaskDueSoonTemplateData) {
  return {
    subject: `Task Due Soon: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⏰ Task Due Soon</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <div class="warning">
                <strong>Reminder:</strong> The following task is due soon.
              </div>
              <h2 style="color: #1f2937; margin: 20px 0;">${data.taskTitle}</h2>
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
              <a href="${data.taskUrl}" class="button">View Task</a>
            </div>
            <div class="footer">
              <p>This is an automated reminder from your task management system.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Task Due Soon: ${data.taskTitle}\n\nDue Date: ${data.dueDate}\n\nView task: ${data.taskUrl}`,
  }
}
