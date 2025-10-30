export interface BoardMemberAddedTemplateData {
  memberName: string
  boardName: string
  boardId: string
  inviterName: string
  role: string
  appUrl: string
}

export function boardMemberAddedTemplate(data: BoardMemberAddedTemplateData): { subject: string; html: string; text: string } {
  const { memberName, boardName, boardId, inviterName, role, appUrl } = data

  const subject = `You've been added to ${boardName}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .board-info {
            background: #f9fafb;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .role-badge {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            background: #f9fafb;
            padding: 20px;
            border-radius: 0 0 8px 8px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to the Team!</h1>
        </div>
        
        <div class="content">
          <p>Hi ${memberName},</p>
          
          <p><strong>${inviterName}</strong> has added you to a board in the Project Management System.</p>
          
          <div class="board-info">
            <h3 style="margin-top: 0; color: #667eea;">📋 ${boardName}</h3>
            <p style="margin: 10px 0;">
              <strong>Your Role:</strong> <span class="role-badge">${role}</span>
            </p>
          </div>
          
          <p>You now have access to:</p>
          <ul>
            <li>View and manage tasks</li>
            <li>Collaborate with team members</li>
            <li>Track project progress</li>
            <li>Share files and documents</li>
            ${role === 'ADMIN' || role === 'OWNER' ? '<li>Manage board settings and members</li>' : ''}
          </ul>
          
          <div style="text-align: center;">
            <a href="${appUrl}/boards/${boardId}" class="button">
              View Board →
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            If you have any questions, feel free to reach out to ${inviterName} or your team administrator.
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from your Project Management System.</p>
          <p>© ${new Date().getFullYear()} Project Management System. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome to the Team!

Hi ${memberName},

${inviterName} has added you to a board in the Project Management System.

Board: ${boardName}
Your Role: ${role}

You now have access to view and manage tasks, collaborate with team members, track project progress, and share files and documents.

View the board here: ${appUrl}/boards/${boardId}

If you have any questions, feel free to reach out to ${inviterName} or your team administrator.

---
This is an automated message from your Project Management System.
© ${new Date().getFullYear()} Project Management System. All rights reserved.
  `.trim()

  return { subject, html, text }
}
