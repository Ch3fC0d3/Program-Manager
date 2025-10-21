export type WelcomeEmailTemplateData = {
  userName: string
  loginUrl: string
}

export function welcomeEmailTemplate(data: WelcomeEmailTemplateData) {
  return {
    subject: 'Welcome to Task Management System',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Welcome!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>Welcome to your new task management system! We're excited to have you on board.</p>
              <p>Here's what you can do:</p>
              <ul>
                <li>Create and manage tasks</li>
                <li>Collaborate with your team</li>
                <li>Track progress with boards</li>
                <li>Use AI-powered features</li>
              </ul>
              <a href="${data.loginUrl}" class="button">Get Started</a>
            </div>
            <div class="footer">
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: [
      'Welcome to Task Management System!',
      `Hi ${data.userName},`,
      'Welcome aboard!',
      `Get started at: ${data.loginUrl}`
    ].join('\n'),
  }
}
