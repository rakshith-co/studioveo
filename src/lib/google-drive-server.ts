
'use server';

import { google } from 'googleapis';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getOAuth2Client } from './google-drive';

const FOLDER_NAME = "RevspotVision-Uploads";

export async function getAuthenticatedClient(req: NextRequest): Promise<any> {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('google-tokens');

  if (!tokenCookie) {
    return null;
  }

  try {
    const tokens = JSON.parse(tokenCookie.value);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    if (oauth2Client.isTokenExpiring()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      cookieStore.set('google-tokens', JSON.stringify(credentials), {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(Date.now() + oneMonth),
      });
    }
    
    return oauth2Client;
  } catch (error) {
    console.error("Error getting authenticated client:", error);
    cookieStore.delete('google-tokens');
    return null;
  }
}

export async function createFolderIfNotExist(drive: any) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
    fields: 'files(id)',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  } else {
    const fileMetadata = {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    return folder.data.id;
  }
}
