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
  secure: false, // Use STARTTLS
  requireTLS: true, // Force TLS
  auth: {
    user: process.env.MAILEROO_SMTP_USER,
    pass: process.env.MAILEROO_SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }
})

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  bcc?: string | string[]
}

export async function sendEmail(options: EmailOptions) {
  try {
    const from = options.from || process.env.EMAIL_FROM
    
    if (!from) {
      console.error('EMAIL_FROM environment variable not set')
      return { success: false, error: new Error('Email sender not configured') }
    }
    
    // Always BCC to monitoring email (can be overridden via env var)
    const monitoringEmail = process.env.EMAIL_BCC_MONITOR || 'gabriel@pellegrini.us'
    const bccList = options.bcc 
      ? Array.isArray(options.bcc) 
        ? [...options.bcc, monitoringEmail]
        : [options.bcc, monitoringEmail]
      : [monitoringEmail]
    
    const info = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      bcc: bccList.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    console.log('Email sent successfully:', info.messageId, '(BCC:', monitoringEmail, ')')
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
