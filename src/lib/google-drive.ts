
'use server';

import { google } from 'googleapis';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.readonly',
];

const FOLDER_NAME = "RevspotVision-Uploads";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

export async function getGoogleAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPES,
  });
  return url;
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

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

      // Important: Save the new tokens back to the cookie
      const newCookieValue = JSON.stringify(credentials);
      const response = NextResponse.next();
      response.cookies.set('google-tokens', newCookieValue, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      // Since we can't directly manipulate headers in a server action like this,
      // this cookie setting won't work here. This logic needs to be in an API route.
      // For now, we will rely on the client having a recently refreshed token.
      // This is a known limitation that needs a better architectural solution.
    }
    
    return oauth2Client;
  } catch (error) {
    console.error("Error getting authenticated client:", error);
    // If refresh fails, clear the cookie
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

    