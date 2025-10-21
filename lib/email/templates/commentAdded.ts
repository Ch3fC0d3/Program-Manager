export type CommentAddedTemplateData = {
  taskTitle: string
  taskId: string
  commenterName: string
  commentText: string
  taskUrl: string
}

export function commentAddedTemplate(data: CommentAddedTemplateData) {
  return {
    subject: `New Comment on: ${data.taskTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .comment { background: white; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💬 New Comment</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${data.commenterName}</strong> commented on:</p>
              <h2 style="color: #1f2937; margin: 20px 0;">${data.taskTitle}</h2>
              <div class="comment">
                <p style="margin: 0;">${data.commentText}</p>
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
    text: `New Comment on: ${data.taskTitle}\n\n${data.commenterName} commented:\n"${data.commentText}"\n\nView task: ${data.taskUrl}`,
  }
}
