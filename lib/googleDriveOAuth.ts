import { google } from 'googleapis'
import { prisma } from './prisma'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getUserDriveClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  })

  if (!user?.googleRefreshToken) {
    throw new Error('User has not connected Google Drive')
  }

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry?.getTime(),
  })

  // Auto-refresh if needed
  if (user.googleTokenExpiry && user.googleTokenExpiry < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: credentials.access_token || null,
        googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    })
    oauth2Client.setCredentials(credentials)
  }

  return google.drive({ version: 'v3', auth: oauth2Client })
}

export async function listFiles(userId: string, folderId?: string) {
  const drive = await getUserDriveClient(userId)
  
  const query = folderId 
    ? `'${folderId}' in parents and trashed=false`
    : "mimeType!='application/vnd.google-apps.folder' and trashed=false"

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  })

  return response.data.files || []
}

export async function uploadFile(
  userId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  folderId?: string
) {
  const drive = await getUserDriveClient(userId)

  const fileMetadata: any = {
    name: fileName,
  }

  if (folderId) {
    fileMetadata.parents = [folderId]
  }

  const media = {
    mimeType,
    body: require('stream').Readable.from(buffer),
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, mimeType, size, createdTime, webViewLink',
  })

  return response.data
}

export async function deleteFile(userId: string, fileId: string) {
  const drive = await getUserDriveClient(userId)
  await drive.files.delete({ fileId })
}
