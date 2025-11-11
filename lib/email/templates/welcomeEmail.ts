export type WelcomeEmailTemplateData = {
  userName: string
  userEmail: string
  temporaryPassword?: string
  loginUrl: string
  appUrl: string
  createdBy: string
}

export function welcomeEmailTemplate(data: WelcomeEmailTemplateData) {
  return {
    subject: 'Welcome to Sweetwater Helium - Your Login Credentials',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .credentials { background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to the Team!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p><strong>${data.createdBy}</strong> has created an account for you in the Sweetwater Helium Project Management System.</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0; color: #667eea;">📧 Your Login Credentials</h3>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${data.userEmail}</p>
                ${data.temporaryPassword ? `<p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${data.temporaryPassword}</code></p>` : ''}
              </div>

              ${data.temporaryPassword ? `
              <div class="warning">
                <strong>⚠️ Important:</strong> Please change your password after your first login for security.
              </div>
              ` : ''}

              <p>You now have access to:</p>
              <ul>
                <li>Create and manage tasks</li>
                <li>Collaborate with team members</li>
                <li>Track project progress with boards</li>
                <li>Use AI-powered features</li>
                <li>Manage contacts and vendors</li>
                <li>Track time and expenses</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Login to Your Account →</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                If you have any questions, feel free to reach out to ${data.createdBy} or your team administrator.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from Sweetwater Helium Project Management System.</p>
              <p>© ${new Date().getFullYear()} Sweetwater Helium. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Sweetwater Helium!

Hi ${data.userName},

${data.createdBy} has created an account for you in the Sweetwater Helium Project Management System.

Your Login Credentials:
Email: ${data.userEmail}
${data.temporaryPassword ? `Temporary Password: ${data.temporaryPassword}` : ''}

${data.temporaryPassword ? 'IMPORTANT: Please change your password after your first login for security.\n' : ''}
You now have access to:
- Create and manage tasks
- Collaborate with team members
- Track project progress with boards
- Use AI-powered features
- Manage contacts and vendors
- Track time and expenses

Login here: ${data.loginUrl}

If you have any questions, feel free to reach out to ${data.createdBy} or your team administrator.

---
This is an automated message from Sweetwater Helium Project Management System.
© ${new Date().getFullYear()} Sweetwater Helium. All rights reserved.
    `.trim(),
  }
}
