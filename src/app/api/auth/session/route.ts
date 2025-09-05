
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get('google-tokens');

  if (!tokenCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokenCookie.value);
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
    });
    
    const { data } = await oauth2.userinfo.get();
    
    const session = {
        user: {
            name: data.name,
            email: data.email,
            image: data.picture,
        },
        accessToken: tokens.access_token,
        expires: new Date(tokens.expiry_date!).toISOString(),
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Failed to get session:', error);
    // Potentially invalid tokens, clear the cookie
    const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    response.cookies.delete('google-tokens');
    return response;
  }
}

    