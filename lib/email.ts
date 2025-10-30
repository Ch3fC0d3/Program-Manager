import nodemailer from 'nodemailer'
import {
  taskAssignedTemplate,
  taskDueSoonTemplate,
  commentAddedTemplate,
  taskStatusChangedTemplate,
  welcomeEmailTemplate,
  boardMemberAddedTemplate,
  TaskAssignedTemplateData,
  TaskDueSoonTemplateData,
  CommentAddedTemplateData,
  TaskStatusChangedTemplateData,
  WelcomeEmailTemplateData,
  BoardMemberAddedTemplateData
} from './email/templates'

// Maileroo SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAILEROO_SMTP_HOST || 'smtp.maileroo.com',
  port: parseInt(process.env.MAILEROO_SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.MAILEROO_SMTP_USER,
    pass: process.env.MAILEROO_SMTP_PASSWORD,
  },
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export async function sendEmail(options: EmailOptions) {
  try {
    const from = options.from || process.env.EMAIL_FROM
    
    if (!from) {
      console.error('EMAIL_FROM environment variable not set')
      return { success: false, error: new Error('Email sender not configured') }
    }
    
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// Email Templates
export const emailTemplates = {
  taskAssigned: (data: TaskAssignedTemplateData) => taskAssignedTemplate(data),

  taskDueSoon: (data: TaskDueSoonTemplateData) => taskDueSoonTemplate(data),

  commentAdded: (data: CommentAddedTemplateData) => commentAddedTemplate(data),

  taskStatusChanged: (data: TaskStatusChangedTemplateData) => taskStatusChangedTemplate(data),

  welcomeEmail: (data: WelcomeEmailTemplateData) => welcomeEmailTemplate(data),

  boardMemberAdded: (data: BoardMemberAddedTemplateData) => boardMemberAddedTemplate(data),
}
