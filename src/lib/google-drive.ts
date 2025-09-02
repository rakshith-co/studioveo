"use server";

import { google } from "googleapis";
import { cookies } from "next/headers";
import { redirect } from 'next/navigation'


const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
}

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const FOLDER_NAME = "VeoVision-Uploads";

export async function getGoogleAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: DRIVE_SCOPES,
    prompt: "consent",
  });
  return url;
}

export async function getGoogleTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  cookies().set("google-tokens", JSON.stringify(tokens), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  oauth2Client.setCredentials(tokens);
  redirect('/drive');
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


export async function getUnprocessedVideos(): Promise<{id: string, name: string}[]> {
  const client = await getAuthenticatedClient();
  if (!client) {
    throw new Error("Google Drive not connected.");
  }

  const drive = google.drive({ version: 'v3', auth: client });
  const folderId = await createFolderIfNotExist(drive, FOLDER_NAME);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 100, // Consider pagination for more files
  });

  const files = res.data.files || [];
  // Filter for files that don't match the desired naming convention
  const unprocessed = files.filter(f => f.name && !/^\d{8}_/.test(f.name));
  
  return unprocessed.map(f => ({ id: f.id!, name: f.name! }));
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
