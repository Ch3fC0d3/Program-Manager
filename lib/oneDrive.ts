import { Client } from '@microsoft/microsoft-graph-client'
import { prisma } from './prisma'

const SCOPES = ['Files.ReadWrite', 'User.Read', 'offline_access']

export function getAuthUrl() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`

  if (!clientId) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: SCOPES.join(' '),
    prompt: 'consent', // Force to get refresh token
  })

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

export async function getUserOneDriveClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      microsoftAccessToken: true,
      microsoftRefreshToken: true,
      microsoftTokenExpiry: true,
    },
  })

  if (!user?.microsoftRefreshToken) {
    throw new Error('User has not connected OneDrive')
  }

  let accessToken = user.microsoftAccessToken

  // Refresh if expired
  if (!accessToken || (user.microsoftTokenExpiry && user.microsoftTokenExpiry < new Date())) {
    const tokens = await refreshAccessToken(user.microsoftRefreshToken)
    accessToken = tokens.access_token

    await prisma.user.update({
      where: { id: userId },
      data: {
        microsoftAccessToken: tokens.access_token,
        microsoftTokenExpiry: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000) 
          : null,
      },
    })
  }

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken!)
    },
  })
}

export async function listFiles(userId: string, folderId?: string) {
  const client = await getUserOneDriveClient(userId)
  
  const path = folderId 
    ? `/me/drive/items/${folderId}/children`
    : '/me/drive/root/children'

  const response = await client.api(path)
    .select('id,name,size,createdDateTime,webUrl,file')
    .top(100)
    .get()

  return (response.value || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    mimeType: item.file?.mimeType || 'application/octet-stream',
    size: item.size?.toString(),
    modifiedTime: item.createdDateTime,
    webViewLink: item.webUrl,
  }))
}

export async function uploadFile(
  userId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  folderId?: string
) {
  const client = await getUserOneDriveClient(userId)

  const path = folderId
    ? `/me/drive/items/${folderId}:/${fileName}:/content`
    : `/me/drive/root:/${fileName}:/content`

  const response = await client.api(path)
    .putStream(require('stream').Readable.from(buffer))

  return {
    id: response.id,
    name: response.name,
    mimeType: response.file?.mimeType || mimeType,
    size: response.size?.toString(),
    modifiedTime: response.createdDateTime,
    webViewLink: response.webUrl,
  }
}

export async function deleteFile(userId: string, fileId: string) {
  const client = await getUserOneDriveClient(userId)
  await client.api(`/me/drive/items/${fileId}`).delete()
}
