import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true }
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate a new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Update user's password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })

      // Log the activity
      await prisma.activity.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          details: `Password reset requested via forgot password form`,
        }
      })

      // Send email with new password
      const loginUrl = `${process.env.NEXTAUTH_URL}/login`
      
      await sendEmail({
        to: user.email,
        subject: 'Password Reset - Your New Temporary Password',
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
                  <h1 style="margin: 0; font-size: 24px;">🔑 Password Reset</h1>
                </div>
                <div class="content">
                  <p>Hi ${user.name},</p>
                  <p>We received a request to reset your password. Here's your new temporary password:</p>
                  
                  <div class="credentials">
                    <h3 style="margin-top: 0; color: #667eea;">🔐 Your New Temporary Password</h3>
                    <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 3px; font-size: 16px;">${tempPassword}</code></p>
                  </div>

                  <div class="warning">
                    <strong>⚠️ Important Security Steps:</strong>
                    <ol style="margin: 8px 0; padding-left: 20px;">
                      <li>Log in with this temporary password</li>
                      <li>Immediately change your password in Settings → Security</li>
                      <li>Choose a strong, unique password</li>
                    </ol>
                  </div>

                  <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Login to Your Account →</a>
                  </div>
                  
                  <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                    If you didn't request this password reset, please contact your administrator immediately.
                  </p>
                </div>
                <div class="footer">
                  <p>This is an automated message from your Project Management System.</p>
                  <p>© ${new Date().getFullYear()} Project Management System. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Password Reset

Hi ${user.name},

We received a request to reset your password. Here's your new temporary password:

Email: ${user.email}
Temporary Password: ${tempPassword}

IMPORTANT SECURITY STEPS:
1. Log in with this temporary password
2. Immediately change your password in Settings → Security
3. Choose a strong, unique password

Login here: ${loginUrl}

If you didn't request this password reset, please contact your administrator immediately.

---
This is an automated message from your Project Management System.
© ${new Date().getFullYear()} Project Management System. All rights reserved.
        `.trim()
      })
    }

    // Always return success (security best practice)
    return res.status(200).json({ 
      success: true, 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return res.status(500).json({ error: 'Failed to process password reset request' })
  }
}
