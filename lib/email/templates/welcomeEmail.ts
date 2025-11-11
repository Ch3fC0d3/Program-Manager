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
    subject: 'Welcome to Sweetwater Helium - Let\'s Get Started! 🚀',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .credentials { background: #f9fafb; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
            .section { margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 6px; }
            .section h3 { margin-top: 0; color: #667eea; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: 600; }
            .tip { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 15px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to Sweetwater Helium!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>Welcome to the team! We're excited to have you on board. <strong>${data.createdBy}</strong> has created an account for you in the Sweetwater Helium Project Management System.</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0; color: #667eea;">🔐 Your Login Details</h3>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${data.userEmail}</p>
                ${data.temporaryPassword ? `<p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 3px; font-size: 14px;">${data.temporaryPassword}</code></p>` : ''}
                <p style="margin: 8px 0;"><strong>Login URL:</strong> <a href="${data.loginUrl}">${data.loginUrl}</a></p>
              </div>

              ${data.temporaryPassword ? `
              <div class="warning">
                <strong>⚠️ Important:</strong> Please change your password after your first login by visiting Settings → Security.
              </div>
              ` : ''}

              <div class="section">
                <h3>🎯 Quick Start Guide</h3>
                
                <h4>1. Take the Guided Tours</h4>
                <p>When you first log in, you'll see interactive tours on each page:</p>
                <ul>
                  <li><strong>Dashboard</strong> - Your command center with AI features and quick stats</li>
                  <li><strong>Boards</strong> - Project organization and task management</li>
                  <li><strong>Tasks</strong> - Track and manage all your work items</li>
                  <li><strong>Contacts</strong> - Manage vendors, partners, and team members</li>
                  <li><strong>Time Tracking</strong> - Clock in/out and log your hours</li>
                </ul>
                <div class="tip">
                  💡 <strong>Tip:</strong> You can restart any tour anytime from Settings → Appearance → Guided Tours
                </div>

                <h4>2. Explore AI Features</h4>
                <ul>
                  <li><strong>🤖 AI Drop Zone</strong> (Dashboard) - Drop any file and let AI extract tasks, contacts, or data</li>
                  <li><strong>💬 AI Task Assistant</strong> (Blue chat button, bottom right) - Ask questions like "What should I work on today?" or "Find contacts at Acme Corp"</li>
                  <li><strong>🔍 Smart Search</strong> - AI-powered search across your entire workspace</li>
                </ul>

                <h4>3. Start Your First Day</h4>
                <ol>
                  <li><strong>Clock In</strong> - Go to Time Tracking and click "Clock In"</li>
                  <li><strong>Check Your Tasks</strong> - Visit the Tasks page to see what's assigned to you</li>
                  <li><strong>Join Your Boards</strong> - Your manager has added you to relevant project boards</li>
                  <li><strong>Update Your Profile</strong> - Add a profile picture and update your details in Settings</li>
                </ol>
              </div>

              <div class="section">
                <h3>📚 Key Features at a Glance</h3>
                <table>
                  <tr>
                    <th>Feature</th>
                    <th>What It Does</th>
                  </tr>
                  <tr>
                    <td><strong>Boards</strong></td>
                    <td>Organize projects with kanban-style task management</td>
                  </tr>
                  <tr>
                    <td><strong>Tasks</strong></td>
                    <td>Create, assign, and track work with priorities and due dates</td>
                  </tr>
                  <tr>
                    <td><strong>Contacts</strong></td>
                    <td>Manage vendor and partner relationships with notes and files</td>
                  </tr>
                  <tr>
                    <td><strong>Time Tracking</strong></td>
                    <td>Log hours, clock in/out, and submit for manager approval</td>
                  </tr>
                  <tr>
                    <td><strong>File Storage</strong></td>
                    <td>Upload and share important documents with the team</td>
                  </tr>
                </table>
              </div>

              <div class="section">
                <h3>🆘 Need Help?</h3>
                <ul>
                  <li><strong>🐛 Report a Bug</strong> - Click the red bug button (bottom right) to report issues</li>
                  <li><strong>💬 AI Assistant</strong> - Ask the AI Task Assistant for instant help</li>
                  <li><strong>👤 Contact Your Manager</strong> - Reach out to ${data.createdBy}</li>
                </ul>
              </div>

              <div class="section">
                <h3>🎓 Pro Tips</h3>
                <ul>
                  <li>✅ Use keyboard shortcuts to navigate faster</li>
                  <li>✅ Set up email notifications in Settings</li>
                  <li>✅ Try the AI Drop Zone with meeting notes or vendor documents</li>
                  <li>✅ Use tags and filters to organize your contacts</li>
                  <li>✅ Check the Dashboard daily for your task overview</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" class="button">Login to Your Account →</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Welcome aboard! If you have any questions, don't hesitate to reach out to ${data.createdBy} or your team administrator.
              </p>

              <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                <em>P.S. If you didn't request this account or believe this email was sent in error, please contact your administrator immediately.</em>
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
Welcome to Sweetwater Helium - Let's Get Started! 🚀

Hi ${data.userName},

Welcome to the team! We're excited to have you on board. ${data.createdBy} has created an account for you in the Sweetwater Helium Project Management System.

🔐 YOUR LOGIN DETAILS
Email: ${data.userEmail}
${data.temporaryPassword ? `Temporary Password: ${data.temporaryPassword}` : ''}
Login URL: ${data.loginUrl}

${data.temporaryPassword ? '⚠️ IMPORTANT: Please change your password after your first login by visiting Settings → Security.\n' : ''}

🎯 QUICK START GUIDE

1. Take the Guided Tours
When you first log in, you'll see interactive tours on each page:
- Dashboard - Your command center with AI features and quick stats
- Boards - Project organization and task management
- Tasks - Track and manage all your work items
- Contacts - Manage vendors, partners, and team members
- Time Tracking - Clock in/out and log your hours

💡 Tip: You can restart any tour anytime from Settings → Appearance → Guided Tours

2. Explore AI Features
- 🤖 AI Drop Zone (Dashboard) - Drop any file and let AI extract tasks, contacts, or data
- 💬 AI Task Assistant (Blue chat button, bottom right) - Ask questions like "What should I work on today?"
- 🔍 Smart Search - AI-powered search across your entire workspace

3. Start Your First Day
1. Clock In - Go to Time Tracking and click "Clock In"
2. Check Your Tasks - Visit the Tasks page to see what's assigned to you
3. Join Your Boards - Your manager has added you to relevant project boards
4. Update Your Profile - Add a profile picture and update your details in Settings

📚 KEY FEATURES AT A GLANCE
- Boards: Organize projects with kanban-style task management
- Tasks: Create, assign, and track work with priorities and due dates
- Contacts: Manage vendor and partner relationships with notes and files
- Time Tracking: Log hours, clock in/out, and submit for manager approval
- File Storage: Upload and share important documents with the team

🆘 NEED HELP?
- 🐛 Report a Bug - Click the red bug button (bottom right)
- 💬 AI Assistant - Ask the AI Task Assistant for instant help
- 👤 Contact Your Manager - Reach out to ${data.createdBy}

🎓 PRO TIPS
✅ Use keyboard shortcuts to navigate faster
✅ Set up email notifications in Settings
✅ Try the AI Drop Zone with meeting notes or vendor documents
✅ Use tags and filters to organize your contacts
✅ Check the Dashboard daily for your task overview

Welcome aboard! If you have any questions, don't hesitate to reach out to ${data.createdBy} or your team administrator.

P.S. If you didn't request this account or believe this email was sent in error, please contact your administrator immediately.

---
This is an automated message from Sweetwater Helium Project Management System.
© ${new Date().getFullYear()} Sweetwater Helium. All rights reserved.
    `.trim(),
  }
}
