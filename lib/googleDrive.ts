import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

let cachedDrive: drive_v3.Drive | null = null

function getCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials are not configured')
  }
  return { clientEmail, privateKey }
}

export function getDriveClient(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive
  const { clientEmail, privateKey } = getCredentials()
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive']
  })
  cachedDrive = google.drive({ version: 'v3', auth })
  return cachedDrive
}

export async function ensureFolder(folderName: string): Promise<string> {
  const drive = getDriveClient()
  const envFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (envFolderId) {
    // Validate it exists
    try {
      const resp = await drive.files.get({ fileId: envFolderId, fields: 'id' })
      if (resp.data?.id) return envFolderId
    } catch (e) {
      // fallthrough to create below
    }
  }

  // Try to find a folder with that name owned/accessible by the service account
  const list = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and name = '" + folderName.replace(/'/g, "\\'") + "' and trashed = false",
    fields: 'files(id, name)',
    pageSize: 1
  })
  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id as string
  }

  // Create new folder
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  })
  return created.data.id as string
}

export type DriveListedFile = {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  webViewLink?: string
}

export async function listFiles(folderId: string): Promise<DriveListedFile[]> {
  const drive = getDriveClient()
  const resp = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
    pageSize: 1000
  })
  return (resp.data.files || []).map((f: drive_v3.Schema$File) => ({
    id: f.id!,
    name: f.name || 'Untitled',
    mimeType: f.mimeType || 'application/octet-stream',
    size: f.size ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
    webViewLink: f.webViewLink ?? undefined
  }))
}

export async function uploadFile(params: { folderId: string, fileName: string, mimeType: string, buffer: Buffer }) {
  const drive = getDriveClient()
  const media = {
    mimeType: params.mimeType,
    body: Readable.from(params.buffer)
  }
  const resp = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId]
    },
    media,
    fields: 'id, name, webViewLink'
  })
  return resp.data
}

export async function deleteFile(fileId: string) {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}
