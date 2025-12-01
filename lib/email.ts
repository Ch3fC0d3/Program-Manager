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

// SMTP Configuration
const emailPort = parseInt(process.env.EMAIL_PORT || '465')
const isSecure = process.env.EMAIL_SECURE === 'true' || emailPort === 465

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'myfreshshare.com',
  port: emailPort,
  secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // More permissive for self-signed certs
    minVersion: 'TLSv1.2'
  },
  // Additional options for better compatibility
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 10000,
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

    const mailerooKey = process.env.MAILEROO_API_KEY

    if (mailerooKey) {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to]

      const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mailerooKey}`,
        },
        body: JSON.stringify({
          from: { address: from },
          to: toAddresses.map(address => ({ address })),
          bcc: bccList.map(address => ({ address })),
          subject: options.subject,
          html: options.html,
          plain: options.text,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        console.error('Maileroo API error:', response.status, data)
        return { success: false, error: new Error(data?.message || 'Failed to send email via Maileroo API') }
      }

      console.log('Email sent successfully via Maileroo API:', data.data?.reference_id, '(BCC:', monitoringEmail, ')')
      return { success: true, messageId: data.data?.reference_id }
    }
    
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
