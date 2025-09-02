
"use server";

import { google } from "googleapis";
import { cookies } from "next/headers";
import { headers } from 'next/headers'
import { Readable } from 'stream';


const getRedirectUri = () => {
    const host = headers().get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${host}/api/auth/google/callback`;
}

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        getRedirectUri()
      );
}

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const FOLDER_NAME = "RevspotVision-Uploads";

export async function getGoogleAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: DRIVE_SCOPES,
    prompt: "consent",
  });
  return url;
}

export async function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  try {
    const storedTokens = cookies().get("google-tokens")?.value;
    if (!storedTokens) {
      return null;
    }
    const tokens = JSON.parse(storedTokens);
    oauth2Client.setCredentials(tokens);

    // It's good practice to see if the token is expired and refresh if necessary
    // getAccessToken will handle this automatically if a refresh token is present
    const refreshedTokenInfo = await oauth2Client.getAccessToken();
    if (refreshedTokenInfo.token && refreshedTokenInfo.token !== tokens.access_token) {
       const newTokens = { ...tokens, access_token: refreshedTokenInfo.token };
       cookies().set("google-tokens", JSON.stringify(newTokens), {
         httpOnly: true,
         maxAge: 60 * 60 * 24 * 365,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
       });
    }

    return oauth2Client;
  } catch (error) {
    console.error("Failed to get authenticated client", error);
    // If tokens are invalid, clear them
    cookies().delete("google-tokens");
    return null;
  }
}

export async function isGoogleDriveConnected() {
    const client = await getAuthenticatedClient();
    return !!client;
}

export async function createFolderIfNotExist(drive: any, folderName: string): Promise<string> {
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id)',
    });

    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
        return res.data.files[0].id;
    }

    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });
    return folder.data.id!;
}


export async function uploadFileToDrive(file: File, newName: string): Promise<{id: string, name: string}> {
  const client = await getAuthenticatedClient();
  if (!client) {
    throw new Error("Google Drive not connected.");
  }
  const drive = google.drive({ version: 'v3', auth: client });
  const folderId = await createFolderIfNotExist(drive, FOLDER_NAME);

  const fileMetadata = {
    name: newName,
    parents: [folderId],
  };

  const buffer = await file.arrayBuffer();
  const readable = new Readable();
  readable.push(Buffer.from(buffer));
  readable.push(null);

  const media = {
    mimeType: file.type,
    body: readable,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name',
  });

  if (!response.data.id || !response.data.name) {
    throw new Error('Failed to get file ID or name from Google Drive API response.');
  }

  return {id: response.data.id, name: response.data.name};
}


export async function getGoogleFile(fileId: string): Promise<Blob> {
    const client = await getAuthenticatedClient();
    if (!client) {
        throw new Error("Google Drive not connected.");
    }

    const drive = google.drive({ version: 'v3', auth: client });
    const res = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'blob' }
    );
    
    return res.data as unknown as Blob;
}

export async function renameGoogleFile(fileId: string, newName: string): Promise<void> {
    const client = await getAuthenticatedClient();
    if (!client) {
        throw new Error("Google Drive not connected.");
    }
    const drive = google.drive({ version: 'v3', auth: client });
    await drive.files.update({
        fileId: fileId,
        requestBody: {
            name: newName,
        }
    });
}
